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
 * @file standaloneWindow.test.ts
 * @description 验证独立窗口环境资源、复用、展示、外链策略和关闭生命周期。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import mockWindow from './windowMock';
import type { BrowserWindowConstructorOptions } from 'electron';
const mocks = vi.hoisted(() => ({ create: vi.fn<(options: BrowserWindowConstructorOptions) => ReturnType<typeof mockWindow>>(), external: vi.fn(), dev: true }));
vi.mock('electron', () => ({ BrowserWindow: mocks.create, shell: { openExternal: mocks.external } }));
vi.mock('@electron-toolkit/utils', () => ({ is: { get dev() { return mocks.dev; } } }));
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); mocks.dev = true; vi.stubEnv('ELECTRON_RENDERER_URL', undefined); vi.stubGlobal('process', Object.assign(Object.create(process) as NodeJS.Process, { resourcesPath: 'C:/mock-resources' })); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
async function setup() { const win = mockWindow(); function constructWindow() { return win; } mocks.create.mockImplementation(constructWindow); return { win, service: await import('../standaloneWindow') }; }
describe('standaloneWindow', () => {
  it.each([{ dev: true, url: 'http://localhost:5173', expected: 'url' }, { dev: true, url: undefined, expected: 'file' }, { dev: false, url: 'http://localhost:5173', expected: 'file' }])('loads $expected for dev=$dev', async ({ dev, url, expected }) => { mocks.dev = dev; vi.stubEnv('ELECTRON_RENDERER_URL', url); const { win, service } = await setup(); service.openStandaloneWindow(); expect(service.getStandaloneWindow()).toBe(win); expect(mocks.create.mock.calls[0][0]).toMatchObject({ width: 1155, height: 640, minWidth: 1155, minHeight: 640, show: false, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: false, spellcheck: false } }); if (expected === 'url') { expect(win.loadURL).toHaveBeenCalledWith(`${url}/html/DynamicIslandStandalone.html`); expect(win.loadFile).not.toHaveBeenCalled(); } else { expect(win.loadFile.mock.calls[0][0]).toMatch(/DynamicIslandStandalone\.html$/); expect(win.loadURL).not.toHaveBeenCalled(); } expect(mocks.create.mock.calls[0][0].icon).toContain('eisland_256x256.ico'); if (!dev) expect(mocks.create.mock.calls[0][0].icon).toContain('mock-resources'); });
  it('shows only after ready and focuses the existing window', async () => { const { win, service } = await setup(); expect(service.getStandaloneWindow()).toBeNull(); service.openStandaloneWindow(); expect(win.show).not.toHaveBeenCalled(); win.emit('ready-to-show'); expect(win.show).toHaveBeenCalledOnce(); service.openStandaloneWindow(); expect(mocks.create).toHaveBeenCalledOnce(); expect(win.focus).toHaveBeenCalledOnce(); });
  it('opens external URLs through shell while denying child windows', async () => { const { win, service } = await setup(); service.openStandaloneWindow(); const [[handler]] = win.webContents.setWindowOpenHandler.mock.calls; expect(handler({ url: 'https://example.com' })).toEqual({ action: 'deny' }); expect(mocks.external).toHaveBeenCalledWith('https://example.com'); });
  it('closes and clears the instance; absent and destroyed windows are ignored', async () => { const { win, service } = await setup(); service.closeStandaloneWindow(); service.openStandaloneWindow(); win.state.destroyed = true; service.closeStandaloneWindow(); expect(win.close).not.toHaveBeenCalled(); win.state.destroyed = false; service.closeStandaloneWindow(); expect(win.close).toHaveBeenCalledOnce(); expect(service.getStandaloneWindow()).toBeNull(); service.closeStandaloneWindow(); expect(win.close).toHaveBeenCalledOnce(); });
  it('replaces a destroyed instance and ignores a stale ready event after closing', async () => { const { win, service } = await setup(); service.openStandaloneWindow(); win.state.destroyed = true; const replacement = mockWindow(); function constructReplacement() { return replacement; } mocks.create.mockImplementation(constructReplacement); service.openStandaloneWindow(); expect(service.getStandaloneWindow()).toBe(replacement); replacement.close(); replacement.emit('ready-to-show'); expect(replacement.show).not.toHaveBeenCalled(); });
});
