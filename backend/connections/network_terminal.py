"""
Network Terminal Session Manager
Provides real, interactive SSH and Telnet shell sessions for network devices
streamed over WebSocket with strict session lifecycle management.
"""
import os
import sys
import time
import socket
import select
import threading
import asyncio
import json
import uuid
import re
from typing import Dict, Any, Optional, Callable

class NetworkTerminalSession:
    """
    Manages an active, interactive bidirectional session to a real network device
    via either SSH (paramiko interactive shell pty) or Telnet.
    Lifecycle: OPEN -> CONNECTING -> CONNECTED -> ACTIVE -> CLOSING -> CLOSED
    """
    def __init__(
        self,
        device_id: str,
        host: str,
        port: int,
        protocol: str = "ssh",
        username: str = "admin",
        password: str = "",
        enable_password: str = "",
        platform: str = "cisco_ios_xe",
        cols: int = 120,
        rows: int = 36,
        on_data_callback: Optional[Callable[[str], Any]] = None,
        on_close_callback: Optional[Callable[[], Any]] = None
    ):
        self.session_id = f"term-{uuid.uuid4().hex[:8]}"
        self.device_id = device_id
        self.host = host
        self.port = port
        self.protocol = protocol.lower()  # 'ssh' or 'telnet'
        self.username = username
        self.password = password
        self.enable_password = enable_password
        self.platform = platform
        self.cols = cols
        self.rows = rows
        self.on_data_callback = on_data_callback
        self.on_close_callback = on_close_callback

        self.status = "OPEN"  # OPEN, CONNECTING, CONNECTED, ACTIVE, CLOSING, CLOSED
        self.created_at = time.time()
        self.connected_at: Optional[float] = None
        self.last_activity = time.time()
        self.latency_ms = 0.0
        self.banner = ""
        self.error_message = ""

        # SSH resources
        self._paramiko_client = None
        self._ssh_channel = None

        # Telnet resources
        self._telnet_client = None
        self._raw_socket = None

        self._stop_event = threading.Event()
        self._reader_thread: Optional[threading.Thread] = None

    def connect(self) -> bool:
        """Establishes real connection to the device. Returns True if connected, False on failure."""
        self.status = "CONNECTING"
        start_t = time.time()

        if self.protocol == "telnet":
            return self._connect_telnet(start_t)
        else:
            return self._connect_ssh(start_t)

    def _connect_ssh(self, start_t: float) -> bool:
        import paramiko
        try:
            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

            # Attempt real SSH connection
            client.connect(
                hostname=self.host,
                port=self.port,
                username=self.username,
                password=self.password,
                timeout=8.0,
                banner_timeout=8.0,
                auth_timeout=8.0,
                look_for_keys=False,
                allow_agent=False
            )

            # Invoke real interactive pseudo-terminal (PTY)
            channel = client.invoke_shell(term="xterm-256color", width=self.cols, height=self.rows)
            channel.settimeout(0.0)  # non-blocking reads

            transport = client.get_transport()
            banner = ""
            if transport:
                raw_banner = transport.get_banner()
                if raw_banner:
                    banner = raw_banner.decode("utf-8", errors="ignore") if isinstance(raw_banner, bytes) else str(raw_banner)

            self.latency_ms = round((time.time() - start_t) * 1000, 1)
            self._paramiko_client = client
            self._ssh_channel = channel
            self.banner = banner or f"SSH-2.0 Real Connection ({self.platform})"
            self.connected_at = time.time()
            self.last_activity = time.time()
            self.status = "CONNECTED"

            # Start reader thread to stream device output to WebSocket
            self._reader_thread = threading.Thread(target=self._ssh_reader_loop, daemon=True)
            self._reader_thread.start()

            print(f"[NetworkTerminal] SSH session {self.session_id} connected to {self.host}:{self.port} (user: {self.username})")
            return True

        except paramiko.AuthenticationException as e:
            self.error_message = f"Authentication failed for user '{self.username}': Invalid credentials"
            self.status = "FAILED"
            self._cleanup_resources()
            return False
        except (paramiko.SSHException, socket.error, TimeoutError) as e:
            err_str = str(e)
            if "refused" in err_str.lower():
                self.error_message = f"Connection refused by {self.host}:{self.port}"
            elif "timed out" in err_str.lower() or "timeout" in err_str.lower():
                self.error_message = f"Connection timed out connecting to {self.host}:{self.port}"
            elif "unreachable" in err_str.lower():
                self.error_message = f"Host unreachable: {self.host}:{self.port}"
            else:
                self.error_message = f"SSH handshake/connection error: {err_str}"
            self.status = "FAILED"
            self._cleanup_resources()
            return False
        except Exception as e:
            self.error_message = f"Failed to connect via SSH to {self.host}:{self.port}: {str(e)}"
            self.status = "FAILED"
            self._cleanup_resources()
            return False

    def _ssh_reader_loop(self):
        """Reads incoming bytes from the real SSH channel and triggers on_data_callback."""
        chan = self._ssh_channel
        while not self._stop_event.is_set() and chan and not chan.closed:
            try:
                r, _, _ = select.select([chan], [], [], 0.05)
                if r:
                    if chan.recv_ready():
                        data = chan.recv(4096)
                        if not data:
                            # EOF received from device
                            break
                        self.last_activity = time.time()
                        text = data.decode("utf-8", errors="replace")
                        if self.on_data_callback:
                            self.on_data_callback(text)
            except Exception as e:
                break

        # Connection ended
        self.close()

    def _connect_telnet(self, start_t: float) -> bool:
        """Connects via real interactive Telnet session."""
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(8.0)
            s.connect((self.host, self.port))
            s.settimeout(None)

            self.latency_ms = round((time.time() - start_t) * 1000, 1)
            self._raw_socket = s
            self.connected_at = time.time()
            self.last_activity = time.time()
            self.status = "CONNECTED"

            self._reader_thread = threading.Thread(target=self._telnet_reader_loop, daemon=True)
            self._reader_thread.start()

            print(f"[NetworkTerminal] Telnet session {self.session_id} connected to {self.host}:{self.port}")
            return True

        except (socket.error, TimeoutError) as e:
            err_str = str(e)
            if "refused" in err_str.lower():
                self.error_message = f"Connection refused by {self.host}:{self.port} on Telnet"
            elif "timed out" in err_str.lower() or "timeout" in err_str.lower():
                self.error_message = f"Connection timed out connecting to {self.host}:{self.port} on Telnet"
            elif "unreachable" in err_str.lower():
                self.error_message = f"Host unreachable: {self.host}:{self.port}"
            else:
                self.error_message = f"Telnet connection error: {err_str}"
            self.status = "FAILED"
            self._cleanup_resources()
            return False
        except Exception as e:
            self.error_message = f"Failed to connect via Telnet to {self.host}:{self.port}: {str(e)}"
            self.status = "FAILED"
            self._cleanup_resources()
            return False

    def _telnet_reader_loop(self):
        """Reads incoming bytes from Telnet socket with IAC option handling."""
        sock = self._raw_socket
        buffer = bytearray()
        login_prompt_sent = False
        pass_prompt_sent = False

        while not self._stop_event.is_set() and sock:
            try:
                r, _, _ = select.select([sock], [], [], 0.05)
                if r:
                    data = sock.recv(4096)
                    if not data:
                        break
                    self.last_activity = time.time()

                    # Filter Telnet IAC commands (0xFF)
                    clean_bytes = bytearray()
                    i = 0
                    while i < len(data):
                        b = data[i]
                        if b == 255:  # IAC
                            if i + 1 < len(data):
                                cmd = data[i + 1]
                                if cmd in (251, 252, 253, 254):  # WILL, WONT, DO, DONT
                                    if i + 2 < len(data):
                                        opt = data[i + 2]
                                        # Simple Telnet negotiation reply: reject options or accept echo
                                        try:
                                            if cmd == 253:  # DO -> respond WONT
                                                sock.sendall(bytes([255, 252, opt]))
                                            elif cmd == 251:  # WILL -> respond DO
                                                sock.sendall(bytes([255, 253, opt]))
                                        except Exception:
                                            pass
                                        i += 3
                                        continue
                                elif cmd == 250:  # SB subnegotiation
                                    # Skip until SE (240)
                                    se_idx = data.find(b'\xff\xf0', i + 2)
                                    if se_idx != -1:
                                        i = se_idx + 2
                                        continue
                                    else:
                                        i += 2
                                        continue
                                else:
                                    i += 2
                                    continue
                            else:
                                i += 1
                                continue
                        else:
                            clean_bytes.append(b)
                            i += 1

                    if clean_bytes:
                        text = clean_bytes.decode("utf-8", errors="replace")
                        if self.on_data_callback:
                            self.on_data_callback(text)

                        # Auto-send credentials if device asks for Login/Username and Password
                        if self.username and not login_prompt_sent and re.search(r'(?:username|login):\s*$', text, re.I):
                            time.sleep(0.1)
                            self.write_input(self.username + "\r\n")
                            login_prompt_sent = True
                        elif self.password and not pass_prompt_sent and re.search(r'password:\s*$', text, re.I):
                            time.sleep(0.1)
                            self.write_input(self.password + "\r\n")
                            pass_prompt_sent = True

            except Exception as e:
                break

        self.close()

    def write_input(self, data: str) -> bool:
        """Sends raw user input / keystrokes / commands to the device."""
        if self.status not in ("CONNECTED", "ACTIVE"):
            return False

        self.last_activity = time.time()
        self.status = "ACTIVE"

        try:
            if self.protocol == "ssh" and self._ssh_channel and not self._ssh_channel.closed:
                self._ssh_channel.send(data.encode("utf-8"))
                return True
            elif self.protocol == "telnet" and self._raw_socket:
                self._raw_socket.sendall(data.encode("utf-8"))
                return True
        except Exception as e:
            print(f"[NetworkTerminal] Write error in session {self.session_id}: {e}")
            self.close()
            return False
        return False

    def resize_pty(self, cols: int, rows: int):
        """Resizes the terminal window PTY (for SSH)."""
        self.cols = max(20, min(500, cols))
        self.rows = max(5, min(200, rows))
        if self.protocol == "ssh" and self._ssh_channel and not self._ssh_channel.closed:
            try:
                self._ssh_channel.resize_pty(width=self.cols, height=self.rows)
            except Exception:
                pass

    def close(self):
        """Cleanly terminates the interactive session and releases all network sockets/threads."""
        if self.status in ("CLOSING", "CLOSED"):
            return

        self.status = "CLOSING"
        self._stop_event.set()
        self._cleanup_resources()
        self.status = "CLOSED"

        print(f"[NetworkTerminal] Session {self.session_id} cleanly closed for device {self.device_id}")
        if self.on_close_callback:
            try:
                self.on_close_callback()
            except Exception:
                pass

    def _cleanup_resources(self):
        # Close SSH channel
        if self._ssh_channel:
            try:
                self._ssh_channel.close()
            except Exception:
                pass
            self._ssh_channel = None

        # Close Paramiko client
        if self._paramiko_client:
            try:
                self._paramiko_client.close()
            except Exception:
                pass
            self._paramiko_client = None

        # Close Telnet socket
        if self._raw_socket:
            try:
                self._raw_socket.shutdown(socket.SHUT_RDWR)
            except Exception:
                pass
            try:
                self._raw_socket.close()
            except Exception:
                pass
            self._raw_socket = None

# -------------------------------------------------------------
# Global Active Interactive Terminal Sessions Registry
# -------------------------------------------------------------
class TerminalSessionManager:
    """Singleton registry for active real terminal sessions."""
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(TerminalSessionManager, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self):
        if getattr(self, "_initialized", False):
            return
        self.active_sessions: Dict[str, NetworkTerminalSession] = {}
        self.device_to_session: Dict[str, str] = {}
        self.lock = threading.Lock()
        self._initialized = True
        print("[TerminalSessionManager] Initialized for interactive SSH/Telnet sessions.")

    def register_session(self, session: NetworkTerminalSession):
        with self.lock:
            # Terminate any existing session for the same device first
            old_sess_id = self.device_to_session.get(session.device_id)
            if old_sess_id and old_sess_id in self.active_sessions:
                old_sess = self.active_sessions.pop(old_sess_id, None)
                if old_sess:
                    old_sess.close()

            self.active_sessions[session.session_id] = session
            self.device_to_session[session.device_id] = session.session_id

    def get_session(self, session_id: str) -> Optional[NetworkTerminalSession]:
        with self.lock:
            return self.active_sessions.get(session_id)

    def close_session(self, session_id: str):
        with self.lock:
            session = self.active_sessions.pop(session_id, None)
            if session:
                self.device_to_session.pop(session.device_id, None)
                session.close()

    def close_device_session(self, device_id: str):
        with self.lock:
            sess_id = self.device_to_session.pop(device_id, None)
            if sess_id:
                session = self.active_sessions.pop(sess_id, None)
                if session:
                    session.close()

    def cleanup_inactive(self, max_idle_seconds: int = 1800):
        """Periodic cleanup of inactive or disconnected sessions."""
        now = time.time()
        to_close = []
        with self.lock:
            for sid, sess in list(self.active_sessions.items()):
                if sess.status == "CLOSED" or (now - sess.last_activity > max_idle_seconds):
                    to_close.append(sid)

        for sid in to_close:
            self.close_session(sid)

terminal_session_manager = TerminalSessionManager()
