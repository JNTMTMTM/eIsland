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
 * @file splashHookHarness.ts
 * @description 启动画面 Hook 私有原生IPC事件叶边界，记录播放握手并执行真实订阅清理。
 * @author 鸡哥
 */

import { vi } from 'vitest';
import { resetLifecycle } from '../../components/test/contentLifecycleHarness';
export let events: EventTarget;
export const removals = new Map<string, ReturnType<typeof vi.fn>>();
export const ipc = {
  on: vi.fn((channel: string, callback: () => void) => {
    const listener = (): void => { callback(); };
    events.addEventListener(channel, listener);
    const remove = vi.fn(() => { events.removeEventListener(channel, listener); });
    removals.set(channel, remove); return remove;
  }),
  send: vi.fn<(channel: string) => void>(),
};

/**
 * 隔离启动窗口及原生IPC接收叶边界。
 */
export function resetSplashBoundary(): void {
  resetLifecycle(); vi.clearAllMocks(); removals.clear(); events = new EventTarget();
  vi.stubGlobal('window', { electron: { ipcRenderer: ipc } });
}

/**
 * 在实际事件目标上发送原生播放或淡出指令。
 * @param channel - 主进程发送的实际IPC通道。
 */
export function splashEvent(channel: string): void {
  events.dispatchEvent(new Event(channel));
}
