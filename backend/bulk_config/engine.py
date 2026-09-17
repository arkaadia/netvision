"""
Bulk Device Configuration Execution Engine
Handles asynchronous queuing, per-device concurrency locking,
real SSH execution, pre-change backups, idempotency pre-checks,
error classification, and audit report generation.
"""
import os
import time
import uuid
import threading
import csv
import io
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime

from .models import (
    CommandStep,
    DeviceExecutionResult,
    ErrorType,
    IdempotencyResult
)
from .registry import os_mapper_registry

# Relative / absolute import fallback for connection manager & database
try:
    from backend.connections.ssh_manager import connection_manager
    from backend.connections.network_terminal import terminal_session_manager
except ImportError:
    try:
        from connections.ssh_manager import connection_manager
        from connections.network_terminal import terminal_session_manager
    except ImportError:
        connection_manager = None
        terminal_session_manager = None

BACKUP_DIR = os.path.join(os.path.dirname(__file__), "..", "backups")
os.makedirs(BACKUP_DIR, exist_ok=True)

class BulkExecutionJob:
    def __init__(
        self,
        job_id: str,
        template_id: str,
        template_title: str,
        template_title_en: str,
        parameters: Dict[str, Any],
        device_ids: List[str],
        timeout_sec: int = 25,
        delay_ms: int = 1500,
        auto_backup: bool = True,
        save_after_apply: bool = True,
        danger_confirmation: str = "",
    ):
        self.job_id = job_id
        self.template_id = template_id
        self.template_title = template_title
        self.template_title_en = template_title_en
        self.parameters = parameters
        self.device_ids = device_ids
        self.timeout_sec = max(5, min(timeout_sec, 300))
        self.delay_ms = max(0, min(delay_ms, 10000))
        self.auto_backup = auto_backup
        self.save_after_apply = save_after_apply
        self.danger_confirmation = danger_confirmation

        self.status = "queued"  # queued, running, completed, cancelled, failed
        self.created_at = time.time()
        self.started_at: Optional[float] = None
        self.finished_at: Optional[float] = None
        self.cancelled = False

        self.current_device_index = 0
        self.current_device_name = ""
        self.current_step_name = ""

        self.success_count = 0
        self.failed_count = 0
        self.partial_count = 0
        self.skipped_count = 0

        self.results: Dict[str, DeviceExecutionResult] = {}
        self.logs: List[Dict[str, Any]] = []
        self._lock = threading.Lock()

    def add_log(self, level: str, msg_fa: str, msg_en: str, device_id: Optional[str] = None):
        with self._lock:
            self.logs.append({
                "timestamp": time.time(),
                "timeStr": datetime.now().strftime("%H:%M:%S"),
                "level": level,  # info, warning, error, success
                "messageFa": msg_fa,
                "messageEn": msg_en,
                "deviceId": device_id
            })

    def to_dict(self) -> Dict[str, Any]:
        with self._lock:
            total = len(self.device_ids)
            completed = self.success_count + self.failed_count + self.partial_count + self.skipped_count
            pct = int((completed / total) * 100) if total > 0 else 0

            return {
                "jobId": self.job_id,
                "templateId": self.template_id,
                "templateTitle": self.template_title,
                "templateTitleEn": self.template_title_en,
                "parameters": self.parameters,
                "status": self.status,
                "createdAt": self.created_at,
                "startedAt": self.started_at,
                "finishedAt": self.finished_at,
                "totalDevices": total,
                "completedDevices": completed,
                "percentage": pct,
                "currentDeviceIndex": self.current_device_index,
                "currentDeviceName": self.current_device_name,
                "currentStepName": self.current_step_name,
                "successCount": self.success_count,
                "failedCount": self.failed_count,
                "partialCount": self.partial_count,
                "skippedCount": self.skipped_count,
                "options": {
                    "timeoutSec": self.timeout_sec,
                    "delayMs": self.delay_ms,
                    "autoBackup": self.auto_backup,
                    "saveAfterApply": self.save_after_apply
                },
                "results": {dev_id: res.to_dict() for dev_id, res in self.results.items()},
                "logs": self.logs[-150:],  # Tail last 150 log entries for UI responsiveness
            }

class BulkExecutionEngine:
    def __init__(self):
        self._jobs: Dict[str, BulkExecutionJob] = {}
        self._active_device_locks: Dict[str, str] = {}  # device_id -> job_id
        self._lock = threading.Lock()
        self._backups_index: Dict[str, Dict[str, Any]] = {}

    def get_job(self, job_id: str) -> Optional[BulkExecutionJob]:
        with self._lock:
            return self._jobs.get(job_id)

    def list_jobs(self, limit: int = 20) -> List[Dict[str, Any]]:
        with self._lock:
            sorted_jobs = sorted(self._jobs.values(), key=lambda j: j.created_at, reverse=True)
            return [j.to_dict() for j in sorted_jobs[:limit]]

    def create_job(
        self,
        template_id: str,
        params: Dict[str, Any],
        device_ids: List[str],
        timeout_sec: int = 25,
        delay_ms: int = 1500,
        auto_backup: bool = True,
        save_after_apply: bool = True,
        danger_confirmation: str = "",
    ) -> BulkExecutionJob:
        template = os_mapper_registry.get_template(template_id)
        if not template:
            raise ValueError(f"Template '{template_id}' is not registered.")

        # Validate danger confirmation if template is dangerous
        if template.is_dangerous:
            req_word = template.confirmation_keyword.strip().upper()
            provided_word = (danger_confirmation or "").strip().upper()
            if provided_word != req_word:
                raise ValueError(
                    f"Template '{template.title_en}' is dangerous. "
                    f"You must provide confirmation word '{req_word}'."
                )

        job_id = f"bulk_{uuid.uuid4().hex[:10]}"
        job = BulkExecutionJob(
            job_id=job_id,
            template_id=template_id,
            template_title=template.title,
            template_title_en=template.title_en,
            parameters=params,
            device_ids=device_ids,
            timeout_sec=timeout_sec or template.default_timeout_sec,
            delay_ms=delay_ms,
            auto_backup=auto_backup and template.supports_backup,
            save_after_apply=save_after_apply and template.requires_save_step,
            danger_confirmation=danger_confirmation,
        )

        with self._lock:
            self._jobs[job_id] = job

        return job

    def start_job(self, job_id: str, devices_catalog: List[Dict[str, Any]]) -> bool:
        job = self.get_job(job_id)
        if not job or job.status != "queued":
            return False

        job.status = "running"
        job.started_at = time.time()
        job.add_log(
            "info",
            f"آغاز صف اجرای پیکربندی گروهی «{job.template_title}» برای {len(job.device_ids)} تجهیز",
            f"Starting bulk execution job for template '{job.template_title_en}' on {len(job.device_ids)} devices."
        )

        worker = threading.Thread(
            target=self._run_job_worker,
            args=(job, devices_catalog),
            daemon=True
        )
        worker.start()
        return True

    def cancel_job(self, job_id: str) -> bool:
        job = self.get_job(job_id)
        if not job or job.status not in ("queued", "running"):
            return False

        job.cancelled = True
        job.status = "cancelled"
        job.finished_at = time.time()
        job.add_log(
            "warning",
            "دستور لغو عملیات توسط کاربر صادر شد؛ اجرای تجهیزات باقی‌مانده در صف متوقف گردید.",
            "Job cancellation requested by operator; pending devices safely skipped."
        )
        # Release any locks held by this job
        with self._lock:
            for dev_id, held_job in list(self._active_device_locks.items()):
                if held_job == job_id:
                    del self._active_device_locks[dev_id]
        return True

    def _acquire_device_lock(self, device_id: str, job_id: str) -> bool:
        with self._lock:
            # Check 1: Terminal session active?
            if terminal_session_manager and hasattr(terminal_session_manager, "device_to_session"):
                with terminal_session_manager.lock:
                    if device_id in terminal_session_manager.device_to_session:
                        return False

            # Check 2: Another bulk job active?
            if device_id in self._active_device_locks:
                if self._active_device_locks[device_id] != job_id:
                    return False

            self._active_device_locks[device_id] = job_id
            return True

    def _release_device_lock(self, device_id: str, job_id: str):
        with self._lock:
            if self._active_device_locks.get(device_id) == job_id:
                del self._active_device_locks[device_id]

    def _run_job_worker(self, job: BulkExecutionJob, devices_catalog: List[Dict[str, Any]]):
        template = os_mapper_registry.get_template(job.template_id)
        device_map = {d.get("id"): d for d in devices_catalog if d.get("id")}

        for idx, dev_id in enumerate(job.device_ids):
            if job.cancelled:
                job.add_log(
                    "warning",
                    f"تجهیز {dev_id} به دلیل لغو صف اجرا رد شد.",
                    f"Device {dev_id} skipped due to job cancellation.",
                    device_id=dev_id
                )
                res = DeviceExecutionResult(
                    device_id=dev_id,
                    device_name=dev_id,
                    device_ip="",
                    platform="unknown",
                    status="skipped",
                    error_message_fa="عملیات توسط کاربر متوقف شد.",
                    error_message_en="Operation cancelled by user."
                )
                job.results[dev_id] = res
                job.skipped_count += 1
                continue

            device = device_map.get(dev_id)
            dev_name = device.get("name") or device.get("hostname") or f"Device-{dev_id}" if device else dev_id
            dev_ip = device.get("ip") or (device.get("connection", {}) or {}).get("host") or "" if device else ""
            platform = device.get("platform", "cisco_ios_xe") if device else "unknown"

            job.current_device_index = idx + 1
            job.current_device_name = dev_name
            job.current_step_name = f"Processing device {idx+1}/{len(job.device_ids)}"

            if not device:
                job.add_log("error", f"تجهیز با شناسه {dev_id} در انبار تجهیزات یافت نشد.", f"Device {dev_id} not found in inventory.", device_id=dev_id)
                res = DeviceExecutionResult(
                    device_id=dev_id,
                    device_name=dev_name,
                    device_ip=dev_ip,
                    platform=platform,
                    status="failed",
                    error_type=ErrorType.UNKNOWN_ERROR,
                    error_message_fa="شناسه دستگاه در لیست موجودی یافت نشد.",
                    error_message_en="Device ID not found in system inventory."
                )
                job.results[dev_id] = res
                job.failed_count += 1
                continue

            # Step 1: Concurrency Lock Check
            locked = self._acquire_device_lock(dev_id, job.job_id)
            if not locked:
                job.add_log(
                    "error",
                    f"دستگاه «{dev_name}» در حال حاضر در یک نشست فعال ترمینال یا فرآیند همزمان دیگر قفل است.",
                    f"Device '{dev_name}' is locked by an active interactive terminal session or concurrent operation.",
                    device_id=dev_id
                )
                res = DeviceExecutionResult(
                    device_id=dev_id,
                    device_name=dev_name,
                    device_ip=dev_ip,
                    platform=platform,
                    status="failed",
                    error_type=ErrorType.DEVICE_BUSY_LOCKED,
                    error_message_fa="دستگاه مشغول است (نشست ترمینال فعال توسط کاربر یا عملیات همزمان).",
                    error_message_en="Device is busy (active interactive CLI session or concurrent job lock)."
                )
                job.results[dev_id] = res
                job.failed_count += 1
                continue

            try:
                # Execute device pipeline
                exec_result = self._execute_single_device(job, device, template)
                job.results[dev_id] = exec_result

                if exec_result.status == "success":
                    job.success_count += 1
                elif exec_result.status == "partial":
                    job.partial_count += 1
                elif exec_result.status == "skipped":
                    job.skipped_count += 1
                else:
                    job.failed_count += 1

            except Exception as ex:
                job.add_log(
                    "error",
                    f"خطای غیرمنتظره حین اعمال تغییرات بر روی «{dev_name}»: {str(ex)}",
                    f"Unexpected exception while executing on '{dev_name}': {str(ex)}",
                    device_id=dev_id
                )
                res = DeviceExecutionResult(
                    device_id=dev_id,
                    device_name=dev_name,
                    device_ip=dev_ip,
                    platform=platform,
                    status="failed",
                    error_type=ErrorType.UNKNOWN_ERROR,
                    error_message_fa=f"خطای غیرمنتظره: {str(ex)}",
                    error_message_en=f"Unexpected exception: {str(ex)}"
                )
                job.results[dev_id] = res
                job.failed_count += 1

            finally:
                self._release_device_lock(dev_id, job.job_id)

            # Delay between devices
            if job.delay_ms > 0 and idx < len(job.device_ids) - 1 and not job.cancelled:
                time.sleep(job.delay_ms / 1000.0)

        # Mark job finished
        if not job.cancelled:
            job.status = "completed"
        job.finished_at = time.time()
        job.current_step_name = "Execution finished"
        job.add_log(
            "success" if job.failed_count == 0 else "warning",
            f"پایان اجرای عملیات پیکربندی گروهی: {job.success_count} موفق، {job.partial_count} ناقص، {job.failed_count} ناموفق، {job.skipped_count} رد شده.",
            f"Bulk execution completed: {job.success_count} succeeded, {job.partial_count} partial, {job.failed_count} failed, {job.skipped_count} skipped."
        )

    def _execute_single_device(
        self,
        job: BulkExecutionJob,
        device: Dict[str, Any],
        template: Any
    ) -> DeviceExecutionResult:
        dev_id = device.get("id")
        dev_name = device.get("name") or device.get("hostname") or dev_id
        dev_ip = device.get("ip") or (device.get("connection", {}) or {}).get("host") or ""
        platform = device.get("platform", "cisco_ios_xe")

        start_time = time.time()
        mapper = os_mapper_registry.get_mapper_for_device(device)
        steps = mapper.map_command(job.template_id, job.parameters, device)

        result = DeviceExecutionResult(
            device_id=dev_id,
            device_name=dev_name,
            device_ip=dev_ip,
            platform=platform,
            status="running",
            steps_total=len(steps),
            steps_completed=0,
            steps_detail=[],
        )

        job.add_log(
            "info",
            f"شروع پردازش تجهیز «{dev_name}» ({dev_ip}) با درایور {mapper.platform_name}",
            f"Starting processing on '{dev_name}' ({dev_ip}) using {mapper.platform_name} mapper.",
            device_id=dev_id
        )

        # -------------------------------------------------------------
        # 1. Establish Real SSH Session (with 1 retry for transient blips)
        # -------------------------------------------------------------
        session = None
        conn_err = None
        for attempt in range(2):
            if connection_manager:
                try:
                    # require_real=True strictly enforces real hardware communication
                    session = connection_manager.get_or_create_session(
                        device,
                        force_reconnect=(attempt > 0),
                        require_real=True
                    )
                    if session.status == "connected" and session.is_real and session.paramiko_client:
                        break
                    conn_err = session.error_message or "SSH connection failed"
                except Exception as ex:
                    conn_err = str(ex)
            else:
                conn_err = "SSHConnectionManager is not loaded in environment."

            if attempt == 0:
                result.retry_count += 1
                time.sleep(1.0)

        if not session or session.status != "connected" or not session.is_real or not session.paramiko_client:
            err_type, msg_fa, msg_en = self._classify_connection_error(conn_err or "Unknown connection failure")
            result.status = "failed"
            result.error_type = err_type
            result.error_message_fa = msg_fa
            result.error_message_en = msg_en
            result.duration_ms = (time.time() - start_time) * 1000.0
            job.add_log("error", f"خطای اتصال به «{dev_name}»: {msg_fa}", f"Connection failure on '{dev_name}': {msg_en}", device_id=dev_id)
            return result

        # -------------------------------------------------------------
        # 2. Pre-Change Automatic Backup
        # -------------------------------------------------------------
        if job.auto_backup:
            job.current_step_name = f"Taking pre-change backup on {dev_name}"
            backup_cmd = mapper.get_backup_command()
            job.add_log(
                "info",
                f"تهیه نسخه پشتیبان قبل از تغییرات بر روی «{dev_name}» با دستور «{backup_cmd}»",
                f"Taking pre-change running config backup on '{dev_name}' via '{backup_cmd}'",
                device_id=dev_id
            )
            try:
                b_res = connection_manager.execute_command(device, backup_cmd, require_real=True)
                if b_res.get("success") and b_res.get("output"):
                    backup_content = b_res["output"]
                    backup_id = f"bkp_{dev_id}_{int(time.time())}"
                    backup_file_path = os.path.join(BACKUP_DIR, f"{backup_id}.txt")
                    with open(backup_file_path, "w", encoding="utf-8") as f:
                        f.write(backup_content)

                    # Store backup index in memory
                    self._backups_index[backup_id] = {
                        "backupId": backup_id,
                        "deviceId": dev_id,
                        "deviceName": dev_name,
                        "deviceIp": dev_ip,
                        "platform": platform,
                        "filePath": backup_file_path,
                        "charCount": len(backup_content),
                        "timestamp": time.time(),
                        "jobId": job.job_id
                    }
                    result.backup_id = backup_id
                    result.backup_success = True
                    result.backup_preview = backup_content[:350] + ("..." if len(backup_content) > 350 else "")
                    job.add_log(
                        "success",
                        f"نسخه پشتیبان کانفیگ «{dev_name}» با موفقیت ذخیره شد (شناسه: {backup_id})",
                        f"Pre-change backup for '{dev_name}' saved successfully (ID: {backup_id})",
                        device_id=dev_id
                    )
                else:
                    job.add_log(
                        "warning",
                        f"هشدار: عدم توانایی در دریافت بک‌آپ قبل از تغییرات از «{dev_name}» ({b_res.get('error')})",
                        f"Warning: Pre-change backup could not be retrieved from '{dev_name}' ({b_res.get('error')})",
                        device_id=dev_id
                    )
            except Exception as b_ex:
                job.add_log(
                    "warning",
                    f"خطا در فراخوانی بک‌آپ: {str(b_ex)}",
                    f"Backup invocation failed: {str(b_ex)}",
                    device_id=dev_id
                )

        # -------------------------------------------------------------
        # 3. Idempotency Pre-Check
        # -------------------------------------------------------------
        pre_check_cmd = mapper.get_idempotency_check_command(job.template_id, job.parameters)
        if pre_check_cmd:
            job.current_step_name = f"Performing idempotency check on {dev_name}"
            try:
                p_res = connection_manager.execute_command(device, pre_check_cmd, require_real=True)
                if p_res.get("success"):
                    idemp_eval = mapper.evaluate_idempotency(job.template_id, job.parameters, p_res.get("output", ""))
                    if idemp_eval.should_skip:
                        result.status = "skipped"
                        result.error_message_fa = idemp_eval.reason_fa
                        result.error_message_en = idemp_eval.reason_en
                        result.duration_ms = (time.time() - start_time) * 1000.0
                        job.add_log(
                            "info",
                            f"بررسی عدم تکرار (Idempotency): {idemp_eval.reason_fa}",
                            f"Idempotency check: {idemp_eval.reason_en}",
                            device_id=dev_id
                        )
                        return result
                    elif idemp_eval.already_configured:
                        job.add_log(
                            "info",
                            f"وضعیت اولیه کانفیگ: {idemp_eval.reason_fa}",
                            f"Initial config status: {idemp_eval.reason_en}",
                            device_id=dev_id
                        )
            except Exception as p_ex:
                job.add_log(
                    "warning",
                    f"عدم موفقیت در پیش‌بررسی idempotency: {str(p_ex)}",
                    f"Idempotency pre-check failed: {str(p_ex)}",
                    device_id=dev_id
                )

        # -------------------------------------------------------------
        # 4. Multi-Step Real CLI Execution Sequence
        # -------------------------------------------------------------
        full_raw_outputs: List[str] = []
        step_failure_occurred = False

        for s_idx, step in enumerate(steps):
            job.current_step_name = f"Executing step {s_idx+1}/{len(steps)} on {dev_name}"
            step_record = {
                "stepIndex": s_idx + 1,
                "stepName": step.name,
                "command": step.command,
                "descriptionFa": step.description_fa,
                "descriptionEn": step.description_en,
                "status": "running",
                "output": "",
                "durationMs": 0.0,
            }

            s_start = time.time()
            job.add_log(
                "info",
                f"اجرای مرحله {s_idx+1}/{len(steps)} روی «{dev_name}»: {step.command}",
                f"Executing step {s_idx+1}/{len(steps)} on '{dev_name}': {step.command}",
                device_id=dev_id
            )

            try:
                step_res = connection_manager.execute_command(device, step.command, require_real=True)
                step_record["durationMs"] = (time.time() - s_start) * 1000.0
                step_out = step_res.get("output", "")
                step_record["output"] = step_out
                full_raw_outputs.append(f"--- [Step {s_idx+1}: {step.command}] ---\n{step_out}")

                if not step_res.get("success", False):
                    step_failure_occurred = True
                    step_record["status"] = "failed"
                    err_type, msg_fa, msg_en = mapper.classify_error(step_out or step_res.get("error", ""))
                    step_record["errorType"] = err_type
                    step_record["errorMessageFa"] = msg_fa
                    step_record["errorMessageEn"] = msg_en
                    result.steps_detail.append(step_record)

                    job.add_log(
                        "error",
                        f"خطا در مرحله {s_idx+1} روی «{dev_name}»: {msg_fa}",
                        f"Step {s_idx+1} failed on '{dev_name}': {msg_en}",
                        device_id=dev_id
                    )

                    # Stop subsequent steps on THIS device only (Per-device isolation)
                    if step.is_critical:
                        break
                else:
                    step_record["status"] = "success"
                    result.steps_completed += 1
                    result.steps_detail.append(step_record)

            except Exception as cmd_ex:
                step_failure_occurred = True
                step_record["status"] = "failed"
                step_record["durationMs"] = (time.time() - s_start) * 1000.0
                step_record["output"] = str(cmd_ex)
                step_record["errorType"] = ErrorType.UNKNOWN_ERROR
                step_record["errorMessageFa"] = f"استثنای سیستمی در ارسال دستور: {str(cmd_ex)}"
                step_record["errorMessageEn"] = f"Command transmission exception: {str(cmd_ex)}"
                result.steps_detail.append(step_record)
                full_raw_outputs.append(f"--- [Step {s_idx+1}: {step.command}] ---\nEXCEPTION: {str(cmd_ex)}")
                break

        # -------------------------------------------------------------
        # 5. Optional Save Running Config Step
        # -------------------------------------------------------------
        if job.save_after_apply and not step_failure_occurred:
            save_cmd = mapper.get_save_command()
            if save_cmd:
                job.current_step_name = f"Saving configuration on {dev_name}"
                job.add_log(
                    "info",
                    f"ذخیره‌سازی دائمی پیکربندی روی «{dev_name}» ({save_cmd})",
                    f"Committing configuration to startup memory on '{dev_name}' ({save_cmd})",
                    device_id=dev_id
                )
                try:
                    save_res = connection_manager.execute_command(device, save_cmd, require_real=True)
                    full_raw_outputs.append(f"--- [Save Config: {save_cmd}] ---\n{save_res.get('output', '')}")
                except Exception as sv_ex:
                    job.add_log("warning", f"خطا در ذخیره دائم: {str(sv_ex)}", f"Save config error: {str(sv_ex)}", device_id=dev_id)

        # -------------------------------------------------------------
        # 6. Final Status & Error Synthesis for Device
        # -------------------------------------------------------------
        result.raw_output = "\n\n".join(full_raw_outputs)
        result.duration_ms = (time.time() - start_time) * 1000.0

        if not step_failure_occurred and result.steps_completed == result.steps_total:
            result.status = "success"
            job.add_log(
                "success",
                f"تمامی {result.steps_completed} مرحله با موفقیت کامل روی «{dev_name}» اعمال شد.",
                f"All {result.steps_completed} steps completed successfully on '{dev_name}'.",
                device_id=dev_id
            )
        elif result.steps_completed > 0:
            result.status = "partial"
            failed_steps = [s for s in result.steps_detail if s.get("status") == "failed"]
            last_err = failed_steps[-1] if failed_steps else {}
            result.error_type = last_err.get("errorType", ErrorType.UNKNOWN_ERROR)
            result.error_message_fa = f"اجرای جزئی ({result.steps_completed} از {result.steps_total} مرحله موفق). خطای مرحله {last_err.get('stepIndex')}: {last_err.get('errorMessageFa', '')}"
            result.error_message_en = f"Partial execution ({result.steps_completed} of {result.steps_total} steps ok). Step {last_err.get('stepIndex')} failed: {last_err.get('errorMessageEn', '')}"
            job.add_log("warning", result.error_message_fa, result.error_message_en, device_id=dev_id)
        else:
            result.status = "failed"
            failed_steps = [s for s in result.steps_detail if s.get("status") == "failed"]
            last_err = failed_steps[-1] if failed_steps else {}
            result.error_type = last_err.get("errorType", ErrorType.UNKNOWN_ERROR)
            result.error_message_fa = last_err.get("errorMessageFa") or "عملیات به طور کامل با شکست مواجه شد."
            result.error_message_en = last_err.get("errorMessageEn") or "Operation completely failed."
            job.add_log("error", result.error_message_fa, result.error_message_en, device_id=dev_id)

        return result

    def _classify_connection_error(self, err_msg: str) -> Tuple[str, str, str]:
        txt = (err_msg or "").lower()
        if "authentication failed" in txt or "invalid password" in txt or "bad password" in txt:
            return (
                ErrorType.AUTH_FAILED,
                "اطلاعات کاربری (نام کاربری یا رمز عبور SSH) نادرست است.",
                "SSH authentication failed: Invalid username or credentials."
            )
        if "timeout" in txt or "timed out" in txt:
            return (
                ErrorType.CONNECTION_TIMEOUT,
                "پاسخی از دستگاه دریافت نشد (تایم‌اوت ارتباطی یا در دسترس نبودن هاست).",
                "Connection timed out: Device unresponsive or host unreachable."
            )
        if "connection refused" in txt or "port 22" in txt:
            return (
                ErrorType.SOCKET_ERROR,
                "سرویس SSH روی پورت مورد نظر فعال نیست یا پورت بسته است (Connection Refused).",
                "Connection refused on SSH port (port closed or filtered)."
            )
        if "permission denied" in txt:
            return (
                ErrorType.PERMISSION_DENIED,
                "دسترسی ریموت به دستگاه به دلیل محدودیت مجوز رد شد.",
                "Permission denied by host security policy."
            )
        return (
            ErrorType.UNKNOWN_ERROR,
            f"عدم امکان برقراری ارتباط با دستگاه: {err_msg[:160]}",
            f"Could not establish SSH communication: {err_msg[:160]}"
        )

    def get_backup_content(self, backup_id: str) -> Optional[str]:
        info = self._backups_index.get(backup_id)
        if not info:
            # Check filesystem directly
            file_path = os.path.join(BACKUP_DIR, f"{backup_id}.txt")
            if os.path.exists(file_path):
                with open(file_path, "r", encoding="utf-8") as f:
                    return f.read()
            return None
        file_path = info.get("filePath")
        if file_path and os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        return None

    def export_job_report_csv(self, job_id: str) -> str:
        job = self.get_job(job_id)
        if not job:
            return ""

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Device ID",
            "Device Name",
            "Device IP",
            "Platform",
            "Status",
            "Error Type",
            "Error Message",
            "Steps Completed",
            "Steps Total",
            "Duration (ms)",
            "Backup ID",
            "Executed At"
        ])

        for dev_id, res in job.results.items():
            writer.writerow([
                res.device_id,
                res.device_name,
                res.device_ip,
                res.platform,
                res.status,
                res.error_type or "",
                res.error_message_en or res.error_message_fa or "",
                res.steps_completed,
                res.steps_total,
                f"{res.duration_ms:.1f}",
                res.backup_id or "",
                datetime.fromtimestamp(res.executed_at).strftime("%Y-%m-%d %H:%M:%S")
            ])

        return output.getvalue()

# Global Singleton Execution Engine
bulk_execution_engine = BulkExecutionEngine()
