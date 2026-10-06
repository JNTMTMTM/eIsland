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
 * @file standaloneIpcHarness.ts
 * @description 独立窗口 Hook 私有 IPC 叶边界，保留真实配置、状态操作和原生事件分发。
 * @author 鸡哥
 */

import { vi } from 'vitest';
import { resetLifecycle } from '../../components/test/contentLifecycleHarness';

type SettingsListener = Parameters<Window['api']['onSettingsChanged']>[0];
export const values = new Map<string, unknown>();
const listeners = new Set<SettingsListener>();
export const ipc = {
  storeRead: vi.fn<Window['api']['storeRead']>(),
  storeWrite: vi.fn<Window['api']['storeWrite']>(),
  loadWallpaperFile: vi.fn<Window['api']['loadWallpaperFile']>(),
  onSettingsChanged: vi.fn<Window['api']['onSettingsChanged']>(),
};
export let surface: EventTarget;

/**
 * 隔离窗口事件与存储请求，实际配置工具及 Zustand 操作仍由源码执行。
 */
export function resetStandalone(): void {
  resetLifecycle(); vi.clearAllMocks(); values.clear(); listeners.clear();
  ipc.storeRead.mockReset().mockImplementation((key) => Promise.resolve(values.get(key)));
  ipc.storeWrite.mockReset().mockResolvedValue(true);
  ipc.loadWallpaperFile.mockReset().mockResolvedValue('data:image/png;base64,local');
  ipc.onSettingsChanged.mockReset().mockImplementation((listener) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  });
  surface = new EventTarget();
  vi.stubGlobal('window', Object.assign(surface, { api: ipc, location: { hostname: 'localhost' } }));
}

/**
 * 按原生 EventEmitter 的监听器快照语义发送设置广播。
 * @param channel - 实际存储广播通道。
 * @param value - 原生返回的设置数据。
 */
export function broadcast(channel: string, value: unknown): void {
  [...listeners].forEach((listener) => { listener(channel, value); });
}

/**
 * 等待 IPC Promise 和预览解析的有限微任务链。
 * @returns 已发出的异步链完成。
 */
export async function settleBackground(): Promise<void> {
  for (let index = 0; index < 12; index++) {
    // eslint-disable-next-line no-await-in-loop -- 逐轮推进实际 Promise 链，避免定时器模拟业务。
    await Promise.resolve();
  }
}

/**
 * 保留原生异步请求直到测试主动完成，以验证卸载竞争。
 * @returns 请求 Promise 与完成函数。
 */
export function deferredBackground<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((accept) => { resolve = accept; });
  return { promise, resolve };
}
