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
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 */

/**
 * @file tencentRealtimeStt.test.ts
 * @description tencentRealtimeStt 单元测试。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  WebSocketMock,
  buildReplayHeadersMock,
  resolveClientVersionMock,
} = vi.hoisted(() => {
  const instances: MockWebSocket[] = [];
  const CONNECTING = 0;
  const OPEN = 1;
  const CLOSING = 2;
  const CLOSED = 3;

  class MockWebSocket {
    static CONNECTING = CONNECTING;
    static OPEN = OPEN;
    static CLOSING = CLOSING;
    static CLOSED = CLOSED;

    url: string;
    binaryType = 'blob';
    readyState = OPEN;
    onopen: ((ev?: unknown) => void) | null = null;
    onmessage: ((ev: unknown) => void) | null = null;
    onerror: ((ev?: unknown) => void) | null = null;
    onclose: ((ev?: unknown) => void) | null = null;
    send = vi.fn();
    close = vi.fn();

    constructor(url: string) {
      this.url = url;
      instances.push(this);
    }
  }

  const buildReplayHeadersMock = vi.fn(() => ({
    'X-Timestamp': '1234567890',
    'X-Nonce': 'abcdef1234567890abcdef1234567890',
  }));

  const resolveClientVersionMock = vi.fn().mockResolvedValue('1.0.0');

  return {
    WebSocketMock: Object.assign(MockWebSocket, {
      instances,
      CONNECTING,
      OPEN,
      CLOSING,
      CLOSED,
    }),
    buildReplayHeadersMock,
    resolveClientVersionMock,
  };
});

Object.defineProperty(globalThis, 'WebSocket', {
  value: WebSocketMock,
  configurable: true,
  writable: true,
});

vi.mock('../../user/userAccountApi.client', () => ({
  buildReplayHeaders: buildReplayHeadersMock,
  resolveClientVersion: resolveClientVersionMock,
  USER_ACCOUNT_API_BASE: 'https://api.example.com/api',
}));

describe('tencentRealtimeStt', () => {
  beforeEach(() => {
    vi.resetModules();
    WebSocketMock.instances.length = 0;
    buildReplayHeadersMock.mockClear();
    resolveClientVersionMock.mockResolvedValue('1.0.0');
  });

  describe('startTencentRealtimeStt', () => {
    it('throws when token is empty', async () => {
      const { startTencentRealtimeStt } = await import('../tencentRealtimeStt');
      await expect(
        startTencentRealtimeStt({
          token: '',
          onEvent: vi.fn(),
        }),
      ).rejects.toThrow('未登录，无法启动语音识别');
    });

    it('throws when token is whitespace only', async () => {
      const { startTencentRealtimeStt } = await import('../tencentRealtimeStt');
      await expect(
        startTencentRealtimeStt({
          token: '   ',
          onEvent: vi.fn(),
        }),
      ).rejects.toThrow('未登录，无法启动语音识别');
    });

    it('creates WebSocket with correct URL (wss://, token, appName, lang)', async () => {
      const { startTencentRealtimeStt } = await import('../tencentRealtimeStt');
      await startTencentRealtimeStt({
        token: 'my-token',
        language: 'en-US',
        onEvent: vi.fn(),
      });

      const socket = WebSocketMock.instances[0];
      expect(socket).toBeDefined();
      expect(socket.url).toMatch(/^wss:\/\//);
      expect(socket.url).toContain('api.example.com/api/v1/user/ai/stt/realtime');
      expect(socket.url).toContain('token=my-token');
      expect(socket.url).toContain('appName=eisland');
      expect(socket.url).toContain('lang=en-US');
      expect(socket.url).toContain('clientVersion=1.0.0');
      expect(socket.url).toContain('timestamp=1234567890');
      expect(socket.url).toContain('nonce=abcdef1234567890abcdef1234567890');
    });

    it('defaults language to zh-CN when not specified', async () => {
      const { startTencentRealtimeStt } = await import('../tencentRealtimeStt');
      await startTencentRealtimeStt({
        token: 'my-token',
        onEvent: vi.fn(),
      });

      const socket = WebSocketMock.instances[0];
      expect(socket.url).toContain('lang=zh-CN');
    });

    it('sets binaryType to arraybuffer', async () => {
      const { startTencentRealtimeStt } = await import('../tencentRealtimeStt');
      await startTencentRealtimeStt({
        token: 'my-token',
        onEvent: vi.fn(),
      });

      const socket = WebSocketMock.instances[0];
      expect(socket.binaryType).toBe('arraybuffer');
    });

    it('sends stt_start on open', async () => {
      const { startTencentRealtimeStt } = await import('../tencentRealtimeStt');
      await startTencentRealtimeStt({
        token: 'my-token',
        onEvent: vi.fn(),
      });

      const socket = WebSocketMock.instances[0];
      socket.onopen?.();

      expect(socket.send).toHaveBeenCalledOnce();
      const payload = JSON.parse(socket.send.mock.calls[0][0]);
      expect(payload.event).toBe('stt_start');
      expect(payload.sampleRate).toBe(16000);
      expect(payload.channels).toBe(1);
      expect(payload.format).toBe('pcm_s16le');
      expect(payload['X-App-Name']).toBe('eisland');
    });

    it('maps stt_partial event to onEvent', async () => {
      const onEvent = vi.fn();
      const { startTencentRealtimeStt } = await import('../tencentRealtimeStt');
      await startTencentRealtimeStt({
        token: 'my-token',
        onEvent,
      });

      const socket = WebSocketMock.instances[0];
      socket.onmessage?.({ data: JSON.stringify({ event: 'stt_partial', text: 'hello' }) });

      expect(onEvent).toHaveBeenCalledWith({ type: 'partial', text: 'hello' });
    });

    it('maps stt_final event to onEvent', async () => {
      const onEvent = vi.fn();
      const { startTencentRealtimeStt } = await import('../tencentRealtimeStt');
      await startTencentRealtimeStt({
        token: 'my-token',
        onEvent,
      });

      const socket = WebSocketMock.instances[0];
      socket.onmessage?.({ data: JSON.stringify({ event: 'stt_final', text: 'hello world' }) });

      expect(onEvent).toHaveBeenCalledWith({ type: 'final', text: 'hello world' });
    });

    it('maps stt_error event to onEvent', async () => {
      const onEvent = vi.fn();
      const { startTencentRealtimeStt } = await import('../tencentRealtimeStt');
      await startTencentRealtimeStt({
        token: 'my-token',
        onEvent,
      });

      const socket = WebSocketMock.instances[0];
      socket.onmessage?.({ data: JSON.stringify({ event: 'stt_error', message: 'timeout' }) });

      expect(onEvent).toHaveBeenCalledWith({ type: 'error', text: 'timeout' });
    });

    it('maps stt_error event with default message when message is missing', async () => {
      const onEvent = vi.fn();
      const { startTencentRealtimeStt } = await import('../tencentRealtimeStt');
      await startTencentRealtimeStt({
        token: 'my-token',
        onEvent,
      });

      const socket = WebSocketMock.instances[0];
      socket.onmessage?.({ data: JSON.stringify({ event: 'stt_error' }) });

      expect(onEvent).toHaveBeenCalledWith({ type: 'error', text: '实时语音识别错误' });
    });

    it('maps stt_ready event to onEvent', async () => {
      const onEvent = vi.fn();
      const { startTencentRealtimeStt } = await import('../tencentRealtimeStt');
      await startTencentRealtimeStt({
        token: 'my-token',
        onEvent,
      });

      const socket = WebSocketMock.instances[0];
      socket.onmessage?.({ data: JSON.stringify({ event: 'stt_ready' }) });

      expect(onEvent).toHaveBeenCalledWith({ type: 'ready', text: '' });
    });

    it('calls onOpen callback', async () => {
      const onOpen = vi.fn();
      const { startTencentRealtimeStt } = await import('../tencentRealtimeStt');
      await startTencentRealtimeStt({
        token: 'my-token',
        onEvent: vi.fn(),
        onOpen,
      });

      const socket = WebSocketMock.instances[0];
      socket.onopen?.();

      expect(onOpen).toHaveBeenCalledOnce();
    });

    it('calls onClose callback', async () => {
      const onClose = vi.fn();
      const { startTencentRealtimeStt } = await import('../tencentRealtimeStt');
      await startTencentRealtimeStt({
        token: 'my-token',
        onEvent: vi.fn(),
        onClose,
      });

      const socket = WebSocketMock.instances[0];
      socket.onclose?.();

      expect(onClose).toHaveBeenCalledOnce();
    });

    it('ignores non-string message data', async () => {
      const onEvent = vi.fn();
      const { startTencentRealtimeStt } = await import('../tencentRealtimeStt');
      await startTencentRealtimeStt({
        token: 'my-token',
        onEvent,
      });

      const socket = WebSocketMock.instances[0];
      socket.onmessage?.({ data: new ArrayBuffer(10) });

      expect(onEvent).not.toHaveBeenCalled();
    });

    it('ignores malformed JSON in message', async () => {
      const onEvent = vi.fn();
      const { startTencentRealtimeStt } = await import('../tencentRealtimeStt');
      await startTencentRealtimeStt({
        token: 'my-token',
        onEvent,
      });

      const socket = WebSocketMock.instances[0];
      socket.onmessage?.({ data: 'not-json{{' });

      expect(onEvent).not.toHaveBeenCalled();
    });

    it('fires error event on websocket error', async () => {
      const onEvent = vi.fn();
      const { startTencentRealtimeStt } = await import('../tencentRealtimeStt');
      await startTencentRealtimeStt({
        token: 'my-token',
        onEvent,
      });

      const socket = WebSocketMock.instances[0];
      socket.onerror?.();

      expect(onEvent).toHaveBeenCalledWith({ type: 'error', text: '实时语音识别连接失败' });
    });
  });

  describe('pushAudioFrame', () => {
    it('sends binary data when socket is OPEN', async () => {
      const { startTencentRealtimeStt } = await import('../tencentRealtimeStt');
      const session = await startTencentRealtimeStt({
        token: 'my-token',
        onEvent: vi.fn(),
      });

      const socket = WebSocketMock.instances[0];
      const pcm = new Int16Array([1, 2, 3]);
      session.pushAudioFrame(pcm);

      expect(socket.send).toHaveBeenCalledTimes(1);
      const sentBuffer = socket.send.mock.calls[0][0];
      expect(sentBuffer).toBeInstanceOf(ArrayBuffer);
    });

    it('does nothing when socket is not OPEN', async () => {
      const { startTencentRealtimeStt } = await import('../tencentRealtimeStt');
      const session = await startTencentRealtimeStt({
        token: 'my-token',
        onEvent: vi.fn(),
      });

      const socket = WebSocketMock.instances[0];
      socket.readyState = WebSocketMock.CLOSED;

      const pcm = new Int16Array([1, 2, 3]);
      session.pushAudioFrame(pcm);

      expect(socket.send).not.toHaveBeenCalled();
    });

    it('does nothing when pcm16 is empty', async () => {
      const { startTencentRealtimeStt } = await import('../tencentRealtimeStt');
      const session = await startTencentRealtimeStt({
        token: 'my-token',
        onEvent: vi.fn(),
      });

      const socket = WebSocketMock.instances[0];
      session.pushAudioFrame(new Int16Array(0));

      expect(socket.send).not.toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('sends stt_stop and closes socket', async () => {
      const { startTencentRealtimeStt } = await import('../tencentRealtimeStt');
      const session = await startTencentRealtimeStt({
        token: 'my-token',
        onEvent: vi.fn(),
      });

      const socket = WebSocketMock.instances[0];
      session.stop();

      expect(socket.send).toHaveBeenCalledTimes(1);
      const payload = JSON.parse(socket.send.mock.calls[0][0]);
      expect(payload.event).toBe('stt_stop');
      expect(socket.close).toHaveBeenCalledOnce();
    });

    it('calls onClose callback on stop', async () => {
      const onClose = vi.fn();
      const { startTencentRealtimeStt } = await import('../tencentRealtimeStt');
      const session = await startTencentRealtimeStt({
        token: 'my-token',
        onEvent: vi.fn(),
        onClose,
      });

      session.stop();

      expect(onClose).toHaveBeenCalledOnce();
    });

    it('does nothing when already closed', async () => {
      const onClose = vi.fn();
      const { startTencentRealtimeStt } = await import('../tencentRealtimeStt');
      const session = await startTencentRealtimeStt({
        token: 'my-token',
        onEvent: vi.fn(),
        onClose,
      });

      const socket = WebSocketMock.instances[0];
      // First stop triggers close
      session.stop();
      // Second stop should be a no-op
      session.stop();

      // send and close should only be called once total from the first stop
      expect(socket.send).toHaveBeenCalledTimes(1);
      expect(socket.close).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('skips sending stt_stop when socket is not OPEN', async () => {
      const { startTencentRealtimeStt } = await import('../tencentRealtimeStt');
      const session = await startTencentRealtimeStt({
        token: 'my-token',
        onEvent: vi.fn(),
      });

      const socket = WebSocketMock.instances[0];
      socket.readyState = WebSocketMock.CLOSED;
      session.stop();

      // send should not be called for stt_stop, but close() and onClose still fire
      expect(socket.send).not.toHaveBeenCalled();
      expect(socket.close).toHaveBeenCalledOnce();
    });
  });
});
