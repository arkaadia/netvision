import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { Client as SshClient } from 'ssh2';

interface DeviceData {
  id: string;
  name: string;
  ip?: string;
  type?: string;
  role?: string;
  model?: string;
  platform?: string;
  connection_mode?: string;
  ssh_port?: number;
  ssh_username?: string;
  ssh_password?: string;
  enable_password?: string;
  ssh_host?: string;
  connection?: {
    protocol?: string;
    host?: string;
    port?: number;
    username?: string;
    password?: string;
  };
}

function loadDeviceById(projectRoot: string, deviceId: string): DeviceData | null {
  try {
    // 1. Try database_store.json first (active persistent store)
    const dbFile = path.join(projectRoot, 'backend', 'database_store.json');
    if (fs.existsSync(dbFile)) {
      const content = fs.readFileSync(dbFile, 'utf-8');
      const data = JSON.parse(content);
      const dev = (data.devices || []).find((d: any) => d.id === deviceId || d.name === deviceId);
      if (dev) return dev;
    }
    // 2. Try network_data.json
    const dataFile = path.join(projectRoot, 'backend', 'network_data.json');
    if (fs.existsSync(dataFile)) {
      const content = fs.readFileSync(dataFile, 'utf-8');
      const data = JSON.parse(content);
      const dev = (data.devices || []).find((d: any) => d.id === deviceId || d.name === deviceId);
      if (dev) return dev;
    }
  } catch (err: any) {
    console.warn('[Terminal WS] Warning reading data files:', err.message);
  }
  return null;
}

export function setupTerminalWebSocket(server: http.Server, pythonPort: number, projectRoot: string) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const url = req.url || '';
    if (url.startsWith('/ws/terminal') || url.startsWith('/api/terminal/ws')) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    }
  });

  wss.on('connection', async (ws: WebSocket, req: http.IncomingMessage) => {
    const hostHeader = req.headers.host || '127.0.0.1:3000';
    const parsedUrl = new URL(req.url || '', `http://${hostHeader}`);
    const deviceId = parsedUrl.searchParams.get('deviceId') || parsedUrl.searchParams.get('device_id') || '';
    const reqProtocol = (parsedUrl.searchParams.get('protocol') || 'ssh').toLowerCase();
    const userRole = parsedUrl.searchParams.get('role') || 'Super Admin';
    const cols = parseInt(parsedUrl.searchParams.get('cols') || '120', 10);
    const rows = parseInt(parsedUrl.searchParams.get('rows') || '36', 10);
    const paramHost = parsedUrl.searchParams.get('host');
    const paramPort = parsedUrl.searchParams.get('port');
    const paramUsername = parsedUrl.searchParams.get('username');

    let device = loadDeviceById(projectRoot, deviceId);

    // If not found in file, try query python backend
    if (!device && deviceId) {
      try {
        const resp = await fetch(`http://127.0.0.1:${pythonPort}/api/devices`);
        if (resp.ok) {
          const resData: any = await resp.json();
          const list = Array.isArray(resData) ? resData : (resData.devices || []);
          device = list.find((d: any) => d.id === deviceId || d.name === deviceId) || null;
        }
      } catch {
        // ignore
      }
    }

    if (!device) {
      if (deviceId || paramHost) {
        device = {
          id: deviceId || 'device-1',
          name: deviceId || 'Device',
          ip: paramHost || '',
          ssh_host: paramHost || '',
          ssh_port: paramPort ? Number(paramPort) : 22,
          ssh_username: paramUsername || 'admin',
          platform: 'cisco_ios_xe',
        };
      } else {
        const errorMsg = `Device with ID '${deviceId}' was not found in inventory.`;
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'error',
            error: errorMsg,
            code: 'DEVICE_NOT_FOUND'
          }));
          ws.send(JSON.stringify({
            type: 'status',
            status: 'failed',
            message: errorMsg
          }));
          try { ws.close(); } catch {}
        }
        return;
      }
    }

    const deviceName = device.name || deviceId;
    const platform = (device.platform || 'cisco_ios_xe').toLowerCase();
    const isMikroTik = platform.includes('mikrotik') || platform.includes('routeros');

    const targetHost = (paramHost || device.connection?.host || device.ssh_host || device.ip || '').trim();
    const targetPort = Number(paramPort || device.connection?.port || device.ssh_port || (reqProtocol === 'telnet' ? 23 : 22));
    const targetUsername = (paramUsername || device.connection?.username || device.ssh_username || 'admin').trim();
    const targetPassword = device.connection?.password || device.ssh_password || '';
    const isSimulator = device.connection_mode === 'simulator';

    let isRealSshConnected = false;
    let sshStream: any = null;
    let sshClient: SshClient | null = null;
    let inputBuffer = '';
    let cliMode: 'USER_EXEC' | 'PRIVILEGED_EXEC' | 'GLOBAL_CONFIG' | 'INTERFACE_CONFIG' = 'USER_EXEC';
    let currentInterface = '';

    const sendData = (text: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'data', data: text }));
      }
    };

    const getPrompt = () => {
      if (isMikroTik) {
        return `[admin@${deviceName}] > `;
      }
      switch (cliMode) {
        case 'USER_EXEC':
          return `${deviceName}> `;
        case 'PRIVILEGED_EXEC':
          return `${deviceName}# `;
        case 'GLOBAL_CONFIG':
          return `${deviceName}(config)# `;
        case 'INTERFACE_CONFIG':
          return `${deviceName}(config-if)# `;
        default:
          return `${deviceName}> `;
      }
    };

    const enterSimulatedSession = (notice?: string) => {
      if (ws.readyState !== WebSocket.OPEN) return;

      ws.send(JSON.stringify({
        type: 'status',
        status: 'connected',
        protocol: reqProtocol,
        host: targetHost,
        port: targetPort,
        username: targetUsername,
        deviceId,
        deviceName,
        is_simulated: true,
        is_real: false,
        latency_ms: 1.2,
        banner: isMikroTik ? 'MikroTik RouterOS Terminal' : 'Cisco Catalyst CLI',
        message: notice || (targetHost ? `Connected to ${deviceName} (${targetHost}) [Local Terminal Engine]` : `Connected to ${deviceName} (No IP Configured) [Local Terminal Engine]`)
      }));

      const hostLabel = targetHost || 'Local Simulation';
      const banner = isMikroTik
        ? `\r\n  MMM      MMM       KKK                          TTTTTTTTTTT      KKK\r\n  MMMM    MMMM       KKK                            TTT            KKK\r\n  MMM MMMM MMM  III  KKK  KKK  RRRRR   OOOOO        TTT   III  KKK KKK\r\n  MMM  MM  MMM  III  KKKKK     RR  RR OOO OOO       TTT   III  KKKKK  \r\n  MMM      MMM  III  KKK KKK   RRRR   OOO OOO       TTT   III  KKK KKK\r\n  MMM      MMM  III  KKK  KKK  RR  RR  OOOOO        TTT   III  KKK  KKK\r\n\r\nMikroTik RouterOS 7.15.2 (c) 1999-2026\r\nConnected to ${deviceName} (${hostLabel})\r\n\r\n${getPrompt()}`
        : `\r\nCisco IOS Software, IOS-XE Software, Catalyst L3 Switch Software (CAT9K_IOSXE), Version 17.09.03a\r\nTechnical Support: http://www.cisco.com/techsupport\r\nCopyright (c) 1986-2026 by Cisco Systems, Inc.\r\n\r\nConnected to ${deviceName} (${hostLabel})\r\n\r\n${getPrompt()}`;

      sendData(banner);
    };

    const executeCommandSimulated = async (cmd: string) => {
      const trimmed = cmd.trim();
      if (!trimmed) {
        sendData(`\r\n${getPrompt()}`);
        return;
      }

      const cmdLower = trimmed.toLowerCase();

      // Cisco mode transitions
      if (!isMikroTik) {
        if (cmdLower === 'enable' || cmdLower === 'en') {
          cliMode = 'PRIVILEGED_EXEC';
          sendData(`\r\n${getPrompt()}`);
          return;
        }
        if (cmdLower === 'disable' || cmdLower === 'dis') {
          cliMode = 'USER_EXEC';
          sendData(`\r\n${getPrompt()}`);
          return;
        }
        if (cmdLower === 'configure terminal' || cmdLower === 'conf t') {
          if (cliMode === 'USER_EXEC') {
            sendData(`\r\n% Unknown command or not in privileged EXEC mode. Type 'enable' first.\r\n${getPrompt()}`);
            return;
          }
          cliMode = 'GLOBAL_CONFIG';
          sendData(`\r\nEnter configuration commands, one per line. End with CNTL/Z.\r\n${getPrompt()}`);
          return;
        }
        if (cmdLower.startsWith('interface ') || cmdLower.startsWith('int ')) {
          if (cliMode === 'GLOBAL_CONFIG' || cliMode === 'INTERFACE_CONFIG') {
            cliMode = 'INTERFACE_CONFIG';
            currentInterface = trimmed.split(/\s+/)[1] || '';
            sendData(`\r\n${getPrompt()}`);
            return;
          }
        }
        if (cmdLower === 'exit' || cmdLower === 'end') {
          if (cliMode === 'INTERFACE_CONFIG') {
            cliMode = 'GLOBAL_CONFIG';
            sendData(`\r\n${getPrompt()}`);
            return;
          }
          if (cliMode === 'GLOBAL_CONFIG') {
            cliMode = 'PRIVILEGED_EXEC';
            sendData(`\r\n${getPrompt()}`);
            return;
          }
          if (cliMode === 'PRIVILEGED_EXEC') {
            cliMode = 'USER_EXEC';
            sendData(`\r\n${getPrompt()}`);
            return;
          }
          sendData(`\r\n[Connection to ${deviceName} closed]\r\n`);
          try { ws.close(); } catch {}
          return;
        }
        if (cmdLower === 'quit') {
          sendData(`\r\n[Connection to ${deviceName} closed]\r\n`);
          try { ws.close(); } catch {}
          return;
        }
        if (cmdLower === 'terminal length 0' || cmdLower === 'term len 0' || cmdLower === 'terminal width 512') {
          sendData(`\r\n${getPrompt()}`);
          return;
        }
      } else {
        if (cmdLower === 'quit' || cmdLower === 'exit') {
          sendData(`\r\n[Connection to ${deviceName} closed]\r\n`);
          try { ws.close(); } catch {}
          return;
        }
      }

      try {
        const resp = await fetch(`http://127.0.0.1:${pythonPort}/api/devices/${deviceId}/terminal/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Role': userRole,
          },
          body: JSON.stringify({
            command: trimmed,
            user_role: userRole,
          }),
        });

        if (resp.ok) {
          const result: any = await resp.json();
          const out = (result.output !== undefined ? result.output : result.message) || '';
          const formattedOut = out ? out.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n').trimEnd() : '';
          if (formattedOut) {
            sendData(`\r\n${formattedOut}\r\n${getPrompt()}`);
          } else {
            sendData(`\r\n${getPrompt()}`);
          }
        } else {
          const errData: any = await resp.json().catch(() => ({}));
          sendData(`\r\n% Error executing command: ${errData.message || errData.error || 'Unknown error'}\r\n${getPrompt()}`);
        }
      } catch (err: any) {
        sendData(`\r\n% Terminal engine error: ${err.message}\r\n${getPrompt()}`);
      }
    };

    // If target host is available and protocol is SSH, attempt real SSH connection
    if (targetHost && reqProtocol === 'ssh') {
      try {
        const client = new SshClient();
        sshClient = client;

        const connectionTimeout = setTimeout(() => {
          if (!isRealSshConnected) {
            try { client.end(); } catch {}
            enterSimulatedSession(`Hardware IP (${targetHost}) unreachable from container. Falling back to Terminal CLI Engine.`);
          }
        }, 4000);

        client.on('ready', () => {
          clearTimeout(connectionTimeout);
          isRealSshConnected = true;

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'status',
              status: 'connected',
              is_real: true,
              protocol: 'ssh',
              host: targetHost,
              port: targetPort,
              username: targetUsername,
              deviceId,
              deviceName,
              latency_ms: 2.5,
              message: `Live SSH established to ${targetHost}:${targetPort}`
            }));
          }

          client.shell({ term: 'xterm-256color', cols, rows }, (err, stream) => {
            if (err) {
              sendData(`\r\n% Failed to allocate PTY shell: ${err.message}\r\n`);
              enterSimulatedSession();
              return;
            }

            sshStream = stream;

            stream.on('data', (data: Buffer) => {
              sendData(data.toString('utf-8'));
            });

            stream.on('close', () => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  type: 'status',
                  status: 'disconnected',
                  message: `SSH connection closed by ${targetHost}`
                }));
                try { ws.close(); } catch {}
              }
              try { client.end(); } catch {}
            });
          });
        });

        client.on('error', (err) => {
          clearTimeout(connectionTimeout);
          if (!isRealSshConnected) {
            enterSimulatedSession(`SSH connection to ${targetHost}:${targetPort} failed (${err.message}). Interactive CLI Terminal active.`);
          }
        });

        client.connect({
          host: targetHost,
          port: targetPort,
          username: targetUsername,
          password: targetPassword,
          readyTimeout: 3500,
          keepaliveInterval: 10000,
        });
      } catch (err: any) {
        enterSimulatedSession(`Terminal initialized in interactive CLI mode (${err.message}).`);
      }
    } else {
      // Direct interactive terminal simulation
      enterSimulatedSession();
    }

    ws.on('message', async (raw) => {
      try {
        let msg: any;
        try {
          msg = JSON.parse(raw.toString());
        } catch {
          msg = { type: 'input', data: raw.toString() };
        }

        const type = msg.type || 'input';

        if (type === 'ping') {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          }
          return;
        }

        if (type === 'input' || type === 'stdin') {
          const chunk = msg.data || '';
          if (sshStream && isRealSshConnected) {
            sshStream.write(chunk);
          } else {
            // Buffer input and execute cleanly line by line on enter.
            // NEVER echo characters back individually to prevent staircase formatting.
            inputBuffer += chunk;
            if (inputBuffer.includes('\r') || inputBuffer.includes('\n')) {
              const normalized = inputBuffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
              const lines = normalized.split('\n');
              inputBuffer = lines.pop() || '';
              for (const line of lines) {
                await executeCommandSimulated(line);
              }
            }
          }
        } else if (type === 'resize') {
          const newCols = parseInt(msg.cols || cols, 10);
          const newRows = parseInt(msg.rows || rows, 10);
          if (sshStream && typeof sshStream.setWindow === 'function') {
            try {
              sshStream.setWindow(newRows, newCols, 0, 0);
            } catch {}
          }
        } else if (type === 'close') {
          if (sshStream) {
            try { sshStream.end(); } catch {}
          }
          if (sshClient) {
            try { sshClient.end(); } catch {}
          }
          try { ws.close(); } catch {}
        }
      } catch (e: any) {
        console.error('[Terminal WS Message Error]', e.message);
      }
    });

    ws.on('close', () => {
      if (sshStream) {
        try { sshStream.end(); } catch {}
      }
      if (sshClient) {
        try { sshClient.end(); } catch {}
      }
    });

    ws.on('error', (err) => {
      console.warn('[Terminal WS Socket Error]', err.message);
      if (sshStream) {
        try { sshStream.end(); } catch {}
      }
      if (sshClient) {
        try { sshClient.end(); } catch {}
      }
    });
  });
}
