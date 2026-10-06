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
 * @file socketFixture.ts
 * @description 歌词客户端 WebSocket 的事件边界夹具，关闭后停止派发消息并保留真实计时器与业务解析。
 * @author 鸡哥
 */

import { vi } from 'vitest';

/**
 * 建立可派发服务端消息及连接事件的叶子 WebSocket 夹具。
 * @returns 已创建连接记录
 */
export default function createSocketFixture() {
  const sockets: FixtureSocket[] = [];
  class FixtureSocket {
    onopen: (() => void) | null = null;

    onmessage: ((event: { data: unknown }) => void) | null = null;

    onerror: (() => void) | null = null;

    onclose: (() => void) | null = null;

    readyState = 1;

    closingError = false;

    url: string;

    /**
     * 记录真实 Provider 传入的连接地址。
     * @param url - 本地歌词服务的 WebSocket 地址
     */
    constructor(url: string) {
      this.url = url;
      sockets.push(this);
    }

    /** 关闭连接并在微任务中派发唯一关闭事件。 */
    close(): void {
      if (this.readyState !== 1) return;
      this.readyState = 2;
      queueMicrotask(() => {
        this.readyState = 3;
        if (this.closingError) this.onerror?.();
        this.onclose?.();
      });
    }

    /**
     * 按连接状态派发客户端边界事件，连接关闭后不再派发消息。
     * @param type - 连接生命周期或消息事件
     * @param data - 服务端文本或二进制载荷
     */
    emit(type: 'open' | 'message' | 'error' | 'close', data?: unknown): void {
      if (this.readyState !== 1) return;
      if (type === 'open') this.onopen?.();
      if (type === 'message') this.onmessage?.({ data });
      if (type === 'error') { this.onerror?.(); this.close(); }
      if (type === 'close') { this.readyState = 3; this.onclose?.(); }
    }
  }
  vi.stubGlobal('WebSocket', FixtureSocket);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  return sockets;
}
