import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';

/**
 * Terminal WebSocket Gateway
 * Bridges frontend terminal WebSocket connections directly to Python's
 * Paramiko-based SSH/Telnet WebSocket engine running on 127.0.0.1:pythonWsPort.
 *
 * Real credentials, Fernet decryption, PTY streaming, and legacy Cisco algorithms
 * are handled by the Python engine. No fake or mocked simulation is ever returned.
 */
export function setupTerminalWebSocket(
  server: http.Server,
  pythonPort: number,
  projectRoot: string,
  pythonWsPort: number = 5002
) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const url = req.url || '';
    if (
      url.startsWith('/ws/terminal') ||
      url.startsWith('/api/terminal/ws') ||
      url.startsWith('/ws/ssh') ||
      url.startsWith('/ssh')
    ) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    }
  });

  wss.on('connection', (clientWs: WebSocket, req: http.IncomingMessage) => {
    const hostHeader = req.headers.host || '127.0.0.1:3000';
    const parsedUrl = new URL(req.url || '', `http://${hostHeader}`);

    // Extract device_id from path /ws/ssh/:deviceId or query params
    let deviceId = '';
    const cleanPath = parsedUrl.pathname.replace(/^\/+/, '');
    const parts = cleanPath.split('/');
    if (parts.length >= 3 && parts[0] === 'ws' && parts[1] === 'ssh') {
      deviceId = parts[2];
    } else if (parts.length >= 2 && parts[0] === 'ssh') {
      deviceId = parts[1];
    }

    if (!deviceId) {
      deviceId = parsedUrl.searchParams.get('deviceId') || parsedUrl.searchParams.get('device_id') || '';
    }

    // Build the target Python WebSocket URL
    const targetWsUrl = `ws://127.0.0.1:${pythonWsPort}/ws/ssh/${encodeURIComponent(deviceId)}${parsedUrl.search}`;

    let pyWs: WebSocket | null = null;
    let isPyOpen = false;
    const clientQueue: Array<{ data: WebSocket.Data; isBinary: boolean }> = [];

    const sendClient = (payload: any) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        if (typeof payload === 'string') {
          clientWs.send(payload);
        } else {
          clientWs.send(JSON.stringify(payload));
        }
      }
    };

    try {
      pyWs = new WebSocket(targetWsUrl);

      pyWs.on('open', () => {
        isPyOpen = true;
        while (clientQueue.length > 0) {
          const item = clientQueue.shift();
          if (item && pyWs && pyWs.readyState === WebSocket.OPEN) {
            try {
              pyWs.send(item.data, { binary: item.isBinary });
            } catch (err) {
              console.error('[TerminalWs Proxy] Error flushing queue to Python:', err);
            }
          }
        }
      });

      pyWs.on('message', (data: WebSocket.Data, isBinary: boolean) => {
        const textPreview = typeof data === 'string' ? data : (data instanceof Buffer ? data.toString('utf-8') : '');
        console.log(`[PROXY-STREAM-OUT] len=${textPreview.length} preview=${JSON.stringify(textPreview.slice(0, 80))}`);
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(data, { binary: isBinary });
        }
      });

      pyWs.on('close', (code: number, reason: Buffer) => {
        if (clientWs.readyState === WebSocket.OPEN) {
          try {
            clientWs.close(code, reason.toString());
          } catch {}
        }
      });

      pyWs.on('error', (err: Error) => {
        console.error(`[TerminalWs Proxy] Cannot reach Python SSH Engine at ${targetWsUrl}:`, err.message);
        sendClient({
          type: 'error',
          error: `Python SSH Engine unreachable on port ${pythonWsPort}: ${err.message}`,
          code: 'BACKEND_UNREACHABLE',
        });
        sendClient({
          type: 'status',
          status: 'failed',
          message: `Connection failed: Python SSH Engine unreachable (${err.message})`,
        });
        sendClient({
          type: 'data',
          data: `\r\n\x1b[1;31m[SSH Engine Error]\x1b[0m Failed to reach Python SSH backend on ws://127.0.0.1:${pythonWsPort}.\r\n\x1b[90mEnsure the backend server is running and paramiko is installed.\x1b[0m\r\n`,
        });
      });

      clientWs.on('message', (data: WebSocket.Data, isBinary: boolean) => {
        const textPreview = typeof data === 'string' ? data : (data instanceof Buffer ? data.toString('utf-8') : '');
        console.log(`[PROXY-CLIENT-IN] len=${textPreview.length} preview=${JSON.stringify(textPreview.slice(0, 80))}`);
        if (isPyOpen && pyWs && pyWs.readyState === WebSocket.OPEN) {
          try {
            pyWs.send(data, { binary: isBinary });
          } catch (err: any) {
            console.warn('[TerminalWs Proxy] Error forwarding to Python:', err.message);
          }
        } else {
          clientQueue.push({ data, isBinary });
        }
      });

      clientWs.on('close', () => {
        if (pyWs && (pyWs.readyState === WebSocket.OPEN || pyWs.readyState === WebSocket.CONNECTING)) {
          try {
            pyWs.close();
          } catch {}
        }
      });

      clientWs.on('error', (err: Error) => {
        console.warn('[TerminalWs Proxy] Client WebSocket error:', err.message);
        if (pyWs) {
          try {
            pyWs.close();
          } catch {}
        }
      });
    } catch (err: any) {
      console.error('[TerminalWs Proxy] Fatal error creating WebSocket to Python:', err);
      sendClient({
        type: 'error',
        error: `Terminal initialization failed: ${err.message}`,
        code: 'PROXY_FATAL_ERROR',
      });
    }
  });
}
