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
 * @file preloadInjectionSupplement.test.ts
 * @description contextBridge 隔离世界注入 Electron 与业务 API 失败边界测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const expose = vi.hoisted(() => vi.fn<(key: string, value: unknown) => void>());
vi.mock('electron', () => ({ contextBridge: { exposeInMainWorld: expose }, ipcRenderer: {}, webUtils: {} }));
vi.mock('@electron-toolkit/preload', () => ({ electronAPI: { fixtureTransport: true } }));
const originalIsolation = Object.getOwnPropertyDescriptor(process, 'contextIsolated');
beforeEach(() => { vi.resetModules(); vi.resetAllMocks(); Object.defineProperty(process, 'contextIsolated', { configurable: true, value: true }); });
afterEach(() => { vi.restoreAllMocks(); if (originalIsolation) Object.defineProperty(process, 'contextIsolated', originalIsolation); else Reflect.deleteProperty(process, 'contextIsolated'); });
describe('隔离预加载世界注入失败', () => {
  it.each(['electron', 'api'])('注入 %s 时发生 Electron 异常被捕获并保留错误证据', async (failedKey) => {
    const failure = new Error('context closed'); const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expose.mockImplementation((key) => { if (key === failedKey) throw failure; });
    await expect(import('../index')).resolves.toBeDefined();
    expect(log).toHaveBeenCalledWith('[Preload] contextBridge 注入失败:', failure);
    expect(expose.mock.calls.map(([key]) => key)).toEqual(failedKey === 'electron' ? ['electron'] : ['electron', 'api']);
  });
});
