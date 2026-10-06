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
 * @file guideWindow.test.ts
 * @description 验证首次引导窗口资源、一次性完成事件、复用和意外关闭解除等待。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import mockWindow from './windowMock';
import type { BrowserWindowConstructorOptions } from 'electron';
const mocks = vi.hoisted(() => ({ create: vi.fn<(options: BrowserWindowConstructorOptions) => ReturnType<typeof mockWindow>>(), events: new Map<string, () => void>(), remove: vi.fn(), dev: true }));
vi.mock('electron', () => ({ BrowserWindow: mocks.create, ipcMain: { once: (event: string, callback: () => void) => mocks.events.set(event, callback), removeListener: mocks.remove } }));
vi.mock('@electron-toolkit/utils', () => ({ is: { get dev() { return mocks.dev; } } }));
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); mocks.events.clear(); mocks.dev = true; vi.stubEnv('ELECTRON_RENDERER_URL', undefined); vi.stubGlobal('process', Object.assign(Object.create(process) as NodeJS.Process, { resourcesPath: 'C:/mock-resources' })); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
async function setup() { const win = mockWindow(); function constructWindow() { return win; } mocks.create.mockImplementation(constructWindow); return { win, service: await import('../guideWindow') }; }
describe('guideWindow', () => {
  it.each([{ dev: true, url: 'http://localhost:5173' }, { dev: true, url: undefined }, { dev: false, url: 'http://localhost:5173' }])('selects resources for dev=$dev url=$url', async ({ dev, url }) => { mocks.dev = dev; vi.stubEnv('ELECTRON_RENDERER_URL', url); const { win, service } = await setup(); const promise = service.showGuideWindow(); expect(service.getGuideWindow()).toBe(win); expect(mocks.create.mock.calls[0][0]).toMatchObject({ width: 860, height: 500, show: false, transparent: true, center: true, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } }); expect(win.removeMenu).toHaveBeenCalledOnce(); if (dev && url) { expect(win.loadURL).toHaveBeenCalledWith(`${url}/html/DynamicIslandGuide.html`); } else { expect(win.loadFile.mock.calls[0][0]).toMatch(/DynamicIslandGuide\.html$/); } if (!dev) expect(mocks.create.mock.calls[0][0].icon).toContain('mock-resources'); win.close(); await promise; });
  it('waits for completion, reveals when ready and cleans IPC on closing', async () => { const { win, service } = await setup(); const completed = vi.fn(); const promise = (async () => { await service.showGuideWindow(); completed(); })(); await Promise.resolve(); expect(completed).not.toHaveBeenCalled(); expect(win.show).not.toHaveBeenCalled(); win.emit('ready-to-show'); expect(win.show).toHaveBeenCalledOnce(); const handler = mocks.events.get('guide:complete')!; handler(); await promise; expect(completed).toHaveBeenCalledOnce(); expect(win.close).toHaveBeenCalledOnce(); expect(service.getGuideWindow()).toBeNull(); expect(mocks.remove).toHaveBeenCalledWith('guide:complete', handler); handler(); expect(win.close).toHaveBeenCalledOnce(); });
  it('resolves a repeated open immediately while preserving the first waiter', async () => { const { win, service } = await setup(); const firstComplete = vi.fn(); const first = (async () => { await service.showGuideWindow(); firstComplete(); })(); await service.showGuideWindow(); expect(mocks.create).toHaveBeenCalledOnce(); expect(win.focus).toHaveBeenCalledOnce(); expect(firstComplete).not.toHaveBeenCalled(); win.close(); await first; expect(firstComplete).toHaveBeenCalledOnce(); });
  it('resolves accidental closing and ignores ready events after destruction', async () => { const { win, service } = await setup(); const promise = service.showGuideWindow(); win.close(); win.emit('ready-to-show'); await promise; expect(win.show).not.toHaveBeenCalled(); expect(service.getGuideWindow()).toBeNull(); });
  it('recreates a previously destroyed window', async () => { const { win, service } = await setup(); const first = service.showGuideWindow(); win.close(); await first; const replacement = mockWindow(); function constructReplacement() { return replacement; } mocks.create.mockImplementation(constructReplacement); const second = service.showGuideWindow(); expect(service.getGuideWindow()).toBe(replacement); expect(mocks.create).toHaveBeenCalledTimes(2); replacement.close(); await second; });
});
