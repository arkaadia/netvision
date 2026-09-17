import {
  BulkConfigTemplate,
  BulkDevicePreviewItem,
  BulkJobStatus,
} from '../types';

export async function fetchBulkTemplates(): Promise<BulkConfigTemplate[]> {
  const resp = await fetch('/api/bulk-config/templates');
  if (!resp.ok) {
    throw new Error('Failed to load bulk configuration templates');
  }
  const data = await resp.json();
  return data.templates || [];
}

export async function generateBulkPreview(
  templateId: string,
  params: Record<string, any>,
  deviceIds: string[]
): Promise<BulkDevicePreviewItem[]> {
  const resp = await fetch('/api/bulk-config/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_id: templateId,
      params,
      device_ids: deviceIds,
    }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate bulk preview');
  }
  const data = await resp.json();
  return data.preview || [];
}

export interface StartBulkJobPayload {
  templateId: string;
  parameters: Record<string, any>;
  deviceIds: string[];
  timeoutSec: number;
  delayMs: number;
  autoBackup: boolean;
  saveAfterApply: boolean;
  dangerConfirmation?: string;
}

export async function startBulkJob(payload: StartBulkJobPayload): Promise<{ jobId: string }> {
  const resp = await fetch('/api/bulk-config/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_id: payload.templateId,
      params: payload.parameters,
      device_ids: payload.deviceIds,
      timeout_sec: payload.timeoutSec,
      delay_ms: payload.delayMs,
      auto_backup: payload.autoBackup,
      save_after_apply: payload.saveAfterApply,
      danger_confirmation: payload.dangerConfirmation,
    }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to start bulk configuration job');
  }
  const data = await resp.json();
  return { jobId: data.jobId };
}

export async function fetchBulkJobStatus(jobId: string): Promise<BulkJobStatus> {
  const resp = await fetch(`/api/bulk-config/jobs/${jobId}`);
  if (!resp.ok) {
    throw new Error(`Failed to fetch status for job ${jobId}`);
  }
  return resp.json();
}

export async function cancelBulkJob(jobId: string): Promise<boolean> {
  const resp = await fetch(`/api/bulk-config/jobs/${jobId}/cancel`, {
    method: 'POST',
  });
  return resp.ok;
}

export async function fetchBackupContent(backupId: string): Promise<string> {
  const resp = await fetch(`/api/bulk-config/backups/${backupId}`);
  if (!resp.ok) {
    throw new Error('Failed to load backup content');
  }
  const data = await resp.json();
  return data.content || '';
}
