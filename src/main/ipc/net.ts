import { ipcMain, net } from 'electron';

type MainLogWriter = (level: 'info' | 'warn' | 'error', message: string) => void;

interface RegisterNetIpcHandlersOptions {
  writeMainLog: MainLogWriter;
}

export function registerNetIpcHandlers(options: RegisterNetIpcHandlersOptions): void {
  ipcMain.handle('net:fetch', async (_event, url: string, requestOptions?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
  }) => {
    const method = requestOptions?.method || 'GET';
    const headers = requestOptions?.headers || {};
    const body = requestOptions?.body;
    const allowsBody = method.toUpperCase() !== 'GET' && method.toUpperCase() !== 'HEAD';
    const timeoutMs = typeof requestOptions?.timeoutMs === 'number' ? requestOptions.timeoutMs : 10000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    options.writeMainLog('info', `[Net] request ${JSON.stringify({ method, url, headers, body: body ?? '', timeoutMs })}`);

    try {
      const fetchOptions: {
        method: string;
        headers: Record<string, string>;
        signal: AbortSignal;
        body?: string;
      } = {
        method,
        headers,
        signal: controller.signal,
      };
      if (allowsBody && typeof body === 'string') {
        fetchOptions.body = body;
      }
      const resp = await net.fetch(url, fetchOptions);
      const text = await resp.text();
      options.writeMainLog('info', `[Net] response ${JSON.stringify({ method, url, status: resp.status, ok: resp.ok, body: text })}`);
      return { ok: resp.ok, status: resp.status, body: text };
    } catch (err) {
      if (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') {
        options.writeMainLog('warn', `[Net] timeout ${JSON.stringify({ method, url, headers, body: body ?? '', timeoutMs })}`);
        return { ok: false, status: 408, body: 'timeout' };
      }
      console.error('[Net] fetch proxy error:', err);
      options.writeMainLog('error', `[Net] error ${JSON.stringify({ method, url, headers, body: body ?? '', timeoutMs, error: String(err) })}`);
      return { ok: false, status: 0, body: '' };
    } finally {
      clearTimeout(timeout);
    }
  });
}
