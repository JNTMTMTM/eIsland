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
 * @file splashWindow.test.ts
 * @description 验证启动画面渲染就绪、视频结束、超时兜底、淡出与关闭清理生命周期。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import mockWindow from './windowMock';
import type { BrowserWindowConstructorOptions } from 'electron';
const mocks = vi.hoisted(() => ({ create: vi.fn<(options: BrowserWindowConstructorOptions) => ReturnType<typeof mockWindow>>(), events: new Map<string, () => void>(), remove: vi.fn(), dev: true }));
vi.mock('electron', () => ({ BrowserWindow: mocks.create, ipcMain: { once: (event: string, callback: () => void) => mocks.events.set(event, callback), removeListener: mocks.remove } }));
vi.mock('@electron-toolkit/utils', () => ({ is: { get dev() { return mocks.dev; } } }));
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); vi.useFakeTimers(); mocks.events.clear(); mocks.dev = true; vi.stubEnv('ELECTRON_RENDERER_URL', undefined); vi.stubGlobal('process', Object.assign(Object.create(process) as NodeJS.Process, { resourcesPath: 'C:/mock-resources' })); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
async function setup() { const win = mockWindow(); function constructWindow() { return win; } mocks.create.mockImplementation(constructWindow); return { win, service: await import('../splashWindow') }; }
describe('splashWindow', () => {
  it.each([{ dev: true, url: 'http://localhost:5173' }, { dev: true, url: undefined }, { dev: false, url: 'http://localhost:5173' }])('loads matching resources for dev=$dev url=$url', async ({ dev, url }) => { mocks.dev = dev; vi.stubEnv('ELECTRON_RENDERER_URL', url); const { win, service } = await setup(); service.showSplashWindow(); expect(service.getSplashWindow()).toBe(win); expect(mocks.create.mock.calls[0][0]).toMatchObject({ width: 600, height: 400, focusable: false, skipTaskbar: true, show: false, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } }); expect(win.center).toHaveBeenCalledOnce(); expect(win.setAlwaysOnTop).toHaveBeenCalledWith(true, 'screen-saver'); if (dev && url) { expect(win.loadURL).toHaveBeenCalledWith(`${url}/html/DynamicIslandSplash.html`); } else { expect(win.loadFile.mock.calls[0][0]).toMatch(/DynamicIslandSplash\.html$/); } if (!dev) expect(mocks.create.mock.calls[0][0].icon).toContain('mock-resources'); });
  it('waits for renderer subscription, plays once, pauses 1000ms then fades for 300ms', async () => { const { win, service } = await setup(); service.showSplashWindow(); const promise = service.closeSplashWindow(); await Promise.resolve(); expect(win.webContents.send).not.toHaveBeenCalled(); mocks.events.get('splash:renderer-ready')!(); await Promise.resolve(); expect(win.showInactive).toHaveBeenCalled(); expect(win.webContents.send).toHaveBeenCalledWith('splash:play-video'); mocks.events.get('splash:video-ended')!(); await vi.advanceTimersByTimeAsync(999); expect(win.webContents.send).not.toHaveBeenCalledWith('splash:fade-out'); await vi.advanceTimersByTimeAsync(1); expect(win.webContents.send).toHaveBeenCalledWith('splash:fade-out'); await vi.advanceTimersByTimeAsync(299); expect(win.close).not.toHaveBeenCalled(); await vi.advanceTimersByTimeAsync(1); await promise; expect(win.close).toHaveBeenCalledOnce(); expect(service.getSplashWindow()).toBeNull(); expect(mocks.remove).toHaveBeenCalledTimes(2); expect(vi.getTimerCount()).toBe(0); });
  it('reveals at the 1500ms ready deadline and falls back after 5000ms playback', async () => { const { win, service } = await setup(); service.showSplashWindow(); const promise = service.closeSplashWindow(); await vi.advanceTimersByTimeAsync(1499); expect(win.showInactive).not.toHaveBeenCalled(); await vi.advanceTimersByTimeAsync(1); expect(win.showInactive).toHaveBeenCalled(); expect(win.webContents.send).toHaveBeenCalledWith('splash:play-video'); await vi.advanceTimersByTimeAsync(4999); expect(win.webContents.send).not.toHaveBeenCalledWith('splash:fade-out'); await vi.advanceTimersByTimeAsync(1001); expect(win.webContents.send).toHaveBeenCalledWith('splash:fade-out'); await vi.advanceTimersByTimeAsync(300); await promise; expect(win.close).toHaveBeenCalledOnce(); });
  it('unblocks readiness when page loading fails and still closes via playback fallback', async () => { const { win, service } = await setup(); service.showSplashWindow(); const promise = service.closeSplashWindow(); win.webContents.emit('did-fail-load'); await Promise.resolve(); expect(win.webContents.send).toHaveBeenCalledWith('splash:play-video'); await vi.advanceTimersByTimeAsync(6300); await promise; expect(win.close).toHaveBeenCalledOnce(); });
  it('reuses an existing window and uses show when showInactive leaves it hidden', async () => { const { win, service } = await setup(); service.showSplashWindow(); win.showInactive.mockImplementation(() => { win.state.visible = false; }); service.showSplashWindow(); expect(mocks.create).toHaveBeenCalledOnce(); expect(win.show).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0); });
  it('handles absent windows and external closing before ready without playing', async () => { const { win, service } = await setup(); await service.closeSplashWindow(); service.showSplashWindow(); const promise = service.closeSplashWindow(); win.close(); await promise; expect(service.getSplashWindow()).toBeNull(); expect(vi.getTimerCount()).toBe(0); expect(win.webContents.send).not.toHaveBeenCalled(); });
  it('skips destroyed windows and ignores delayed fade after external closing', async () => { const { win, service } = await setup(); service.showSplashWindow(); mocks.events.get('splash:renderer-ready')!(); const promise = service.closeSplashWindow(); await Promise.resolve(); mocks.events.get('splash:video-ended')!(); win.close(); await promise; await vi.advanceTimersByTimeAsync(1300); expect(win.webContents.send).not.toHaveBeenCalledWith('splash:fade-out'); expect(win.close).toHaveBeenCalledOnce(); await service.closeSplashWindow(); });
});

describe('splashWindow asynchronous shutdown races', () => {
  it('resolves repeated readiness and ignores stale renderer events after external close', async () => { const { win, service } = await setup(); service.showSplashWindow(); const ready = mocks.events.get('splash:renderer-ready')!; const ended = mocks.events.get('splash:video-ended')!; ready(); service.showSplashWindow(); expect(mocks.create).toHaveBeenCalledOnce(); win.close(); const shows = win.showInactive.mock.calls.length; ready(); ended(); expect(win.showInactive).toHaveBeenCalledTimes(shows); expect(service.getSplashWindow()).toBeNull(); });
  it('resolves closing when the window is destroyed while waiting for renderer readiness', async () => { const { win, service } = await setup(); service.showSplashWindow(); const pending = service.closeSplashWindow(); win.state.destroyed = true; mocks.events.get('splash:renderer-ready')!(); await pending; expect(win.webContents.send).not.toHaveBeenCalled(); });
  it('closes through fade fallback when sending the play command throws', async () => { const { win, service } = await setup(); service.showSplashWindow(); mocks.events.get('splash:renderer-ready')!(); win.webContents.send.mockImplementationOnce(() => { throw new Error('renderer unavailable'); }); const pending = service.closeSplashWindow(); await vi.advanceTimersByTimeAsync(1300); await pending; expect(win.webContents.send).toHaveBeenCalledWith('splash:fade-out'); expect(win.close).toHaveBeenCalledOnce(); });
  it('deduplicates an already queued playback timeout when the video-end event wins', async () => { const timer = vi.spyOn(globalThis, 'setTimeout'); const { win, service } = await setup(); service.showSplashWindow(); mocks.events.get('splash:renderer-ready')!(); const pending = service.closeSplashWindow(); await Promise.resolve(); const [queuedTimeout] = timer.mock.calls.find(([, delay]) => delay === 5000)!; mocks.events.get('splash:video-ended')!(); queuedTimeout(); await vi.advanceTimersByTimeAsync(1300); await pending; expect(win.close).toHaveBeenCalledOnce(); expect(win.webContents.send.mock.calls.filter(([channel]) => channel === 'splash:fade-out')).toHaveLength(1); });
});
