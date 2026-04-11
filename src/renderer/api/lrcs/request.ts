import { loadNetworkConfig } from '../../store/utils/storage';
import { logger } from '../../utils/logger';

export async function requestJsonWithLog<T>(url: string, options?: {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}): Promise<T | null> {
  const { timeoutMs } = loadNetworkConfig();
  const method = options?.method || 'GET';
  const headers = options?.headers || {};
  const body = options?.body ?? '';

  logger.info('[LrcApi] request', { method, url, headers, body, timeoutMs });
  const resp = await window.api.netFetch(url, { method, headers, body, timeoutMs });
  logger.info('[LrcApi] response', { method, url, status: resp.status, ok: resp.ok, body: resp.body });
  if (!resp.ok) return null;

  try {
    return JSON.parse(resp.body) as T;
  } catch (error) {
    logger.error('[LrcApi] JSON 解析失败:', {
      method,
      url,
      error: String(error),
      body: resp.body,
    });
    return null;
  }
}

export async function requestTextWithLog(url: string, options?: {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}): Promise<string | null> {
  const { timeoutMs } = loadNetworkConfig();
  const method = options?.method || 'GET';
  const headers = options?.headers || {};
  const body = options?.body ?? '';

  logger.info('[LrcApi] request', { method, url, headers, body, timeoutMs });
  const resp = await window.api.netFetch(url, { method, headers, body, timeoutMs });
  logger.info('[LrcApi] response', { method, url, status: resp.status, ok: resp.ok, bodyLen: resp.body?.length });
  if (!resp.ok) return null;

  return resp.body ?? null;
}
