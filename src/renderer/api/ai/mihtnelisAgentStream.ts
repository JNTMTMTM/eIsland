/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * Original author: JNTMTMTM[](https://github.com/JNTMTMTM)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * @file mihtnelisAgentStream.ts
 * @description mihtnelis agent 独立流式请求客户端（不走 netFetch）。
 * @author 鸡哥
 */

import { buildReplayHeaders, resolveClientVersion, USER_ACCOUNT_API_BASE } from '../user/userAccountApi.client';

const APP_NAME_HEADER = 'X-App-Name';
const APP_NAME_VALUE = 'eisland';

export type MihtnelisAgentStreamEventType =
  | 'meta'
  | 'tool'
  | 'think'
  | 'chunk'
  | 'billing'
  | 'web_access_request'
  | 'web_access_resolved'
  | 'final'
  | 'error';

export interface MihtnelisAgentStreamEvent {
  type: MihtnelisAgentStreamEventType;
  payload: unknown;
}

export interface ResolveMihtnelisWebAccessRequest {
  token: string;
  requestId: string;
  allow: boolean;
}

export interface MihtnelisAgentStreamRequest {
  token: string;
  message: string;
  sessionId?: string;
  provider?: string;
  signal?: AbortSignal;
  onEvent?: (event: MihtnelisAgentStreamEvent) => void;
}

/**
 * 发起 mihtnelis agent 流式请求。
 * @param request - 请求参数。
 */
export async function streamMihtnelisAgent(request: MihtnelisAgentStreamRequest): Promise<void> {
  const token = request.token?.trim();
  if (!token) {
    throw new Error('未登录，无法调用 mihtnelis agent');
  }
  const message = request.message?.trim();
  if (!message) {
    throw new Error('message 不能为空');
  }

  const headers: Record<string, string> = {
    Accept: 'text/event-stream',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    [APP_NAME_HEADER]: APP_NAME_VALUE,
    ...buildReplayHeaders(),
  };
  const version = await resolveClientVersion();
  if (version) {
    headers['X-Client-Version'] = version;
  }

  const response = await fetch(`${USER_ACCOUNT_API_BASE}/v1/user/ai/agent/stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      sessionId: request.sessionId,
      message,
      provider: request.provider,
    }),
    signal: request.signal,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`mihtnelis agent 请求失败 (${response.status}): ${body || response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('无法读取 mihtnelis agent 响应流');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent = '';

  const parseLines = (rawLines: string[]): void => {
    for (const rawLine of rawLines) {
      const line = rawLine.trimEnd();
      if (!line) {
        currentEvent = '';
        continue;
      }
      if (line.startsWith('event:')) {
        currentEvent = line.slice(6).trim().toLowerCase();
        continue;
      }
      if (!line.startsWith('data:')) {
        continue;
      }
      const dataText = line.slice(5).trim();
      const type = toEventType(currentEvent);
      if (!type) {
        continue;
      }
      let payload: unknown = dataText;
      if (dataText.startsWith('{') || dataText.startsWith('[')) {
        try {
          payload = JSON.parse(dataText);
        } catch {
          payload = dataText;
        }
      }
      request.onEvent?.({ type, payload });
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      if (buffer.trim().length > 0) {
        parseLines((buffer + '\n').split('\n'));
      }
      return;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    parseLines(lines);
  }
}

export async function resolveMihtnelisWebAccess(request: ResolveMihtnelisWebAccessRequest): Promise<void> {
  const token = request.token?.trim();
  if (!token) {
    throw new Error('未登录，无法提交网页访问授权');
  }
  const requestId = request.requestId?.trim();
  if (!requestId) {
    throw new Error('requestId 不能为空');
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    [APP_NAME_HEADER]: APP_NAME_VALUE,
    ...buildReplayHeaders(),
  };
  const version = await resolveClientVersion();
  if (version) {
    headers['X-Client-Version'] = version;
  }

  const response = await fetch(`${USER_ACCOUNT_API_BASE}/v1/user/ai/agent/web-access/resolve`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      requestId,
      allow: Boolean(request.allow),
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`网页授权提交失败 (${response.status}): ${body || response.statusText}`);
  }
}

function toEventType(input: string): MihtnelisAgentStreamEventType | null {
  if (input === 'meta') return 'meta';
  if (input === 'tool') return 'tool';
  if (input === 'think') return 'think';
  if (input === 'chunk') return 'chunk';
  if (input === 'billing') return 'billing';
  if (input === 'web_access_request') return 'web_access_request';
  if (input === 'web_access_resolved') return 'web_access_resolved';
  if (input === 'final') return 'final';
  if (input === 'error') return 'error';
  return null;
}
