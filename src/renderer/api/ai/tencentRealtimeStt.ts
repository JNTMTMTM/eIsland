/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * Original author: JNTMTMTM[](https://github.com/JNTMTMTM)
 */

/**
 * @file tencentRealtimeStt.ts
 * @description 通过 eIsland server 中转的腾讯云实时语音识别客户端。
 */

import { buildReplayHeaders, resolveClientVersion, USER_ACCOUNT_API_BASE } from '../user/userAccountApi.client';

const APP_NAME_HEADER = 'X-App-Name';
const APP_NAME_VALUE = 'eisland';

export type RealtimeSttEventType = 'partial' | 'final' | 'error';

export interface RealtimeSttEvent {
  type: RealtimeSttEventType;
  text: string;
}

export interface RealtimeSttSession {
  pushAudioFrame: (pcm16: Int16Array) => void;
  stop: () => void;
}

export interface StartRealtimeSttRequest {
  token: string;
  language?: 'zh-CN' | 'en-US';
  onEvent: (event: RealtimeSttEvent) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

function toWebSocketBase(httpBase: string): string {
  return httpBase.replace(/^https:/i, 'wss:').replace(/^http:/i, 'ws:');
}

function buildWsUrl(base: string): string {
  const wsBase = toWebSocketBase(base).replace(/\/+$/, '');
  return `${wsBase}/v1/user/ai/stt/realtime`;
}

function appendQuery(url: string, params: Record<string, string>): string {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (!value) return;
    usp.set(key, value);
  });
  const query = usp.toString();
  return query ? `${url}?${query}` : url;
}

export async function startTencentRealtimeStt(request: StartRealtimeSttRequest): Promise<RealtimeSttSession> {
  const token = request.token?.trim();
  if (!token) {
    throw new Error('未登录，无法启动语音识别');
  }

  const clientVersion = await resolveClientVersion();
  const replayHeaders = buildReplayHeaders();
  const baseUrl = buildWsUrl(USER_ACCOUNT_API_BASE);
  const wsUrl = appendQuery(baseUrl, {
    token,
    appName: APP_NAME_VALUE,
    lang: request.language || 'zh-CN',
    clientVersion: clientVersion || '',
    timestamp: replayHeaders['X-Timestamp'] || '',
    nonce: replayHeaders['X-Nonce'] || '',
  });

  let closed = false;
  const socket = new WebSocket(wsUrl);
  socket.binaryType = 'arraybuffer';

  socket.onopen = () => {
    request.onOpen?.();
    const startPayload = {
      event: 'stt_start',
      sampleRate: 16000,
      channels: 1,
      format: 'pcm_s16le',
      [APP_NAME_HEADER]: APP_NAME_VALUE,
    };
    socket.send(JSON.stringify(startPayload));
  };

  socket.onmessage = (event) => {
    if (typeof event.data !== 'string') return;
    try {
      const payload = JSON.parse(event.data) as { event?: string; text?: string; message?: string };
      const eventType = payload.event || '';
      if (eventType === 'stt_partial') {
        request.onEvent({ type: 'partial', text: payload.text || '' });
      } else if (eventType === 'stt_final') {
        request.onEvent({ type: 'final', text: payload.text || '' });
      } else if (eventType === 'stt_error') {
        request.onEvent({ type: 'error', text: payload.message || '实时语音识别错误' });
      }
    } catch {
      // ignore malformed ws payload
    }
  };

  socket.onerror = () => {
    request.onEvent({ type: 'error', text: '实时语音识别连接失败' });
  };

  socket.onclose = () => {
    if (closed) return;
    closed = true;
    request.onClose?.();
  };

  return {
    pushAudioFrame: (pcm16: Int16Array): void => {
      if (closed || socket.readyState !== WebSocket.OPEN || pcm16.length === 0) return;
      socket.send(pcm16.buffer.slice(pcm16.byteOffset, pcm16.byteOffset + pcm16.byteLength));
    },
    stop: (): void => {
      if (closed) return;
      closed = true;
      try {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ event: 'stt_stop' }));
        }
      } catch {
        // ignore
      }
      socket.close();
      request.onClose?.();
    },
  };
}
