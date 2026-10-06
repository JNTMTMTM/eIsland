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
 * @file mainWindowEventsSupplement.test.ts
 * @description 主窗口位置、形态通知、显示钩子和外部链接事件测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMainWindowService } from '../mainWindow';
import type { BrowserWindow } from 'electron';
const io = vi.hoisted(() => ({ create: vi.fn(), open: vi.fn(), dev: true, mode: 'notch' }));
vi.mock('electron', () => ({ BrowserWindow: io.create, shell: { openExternal: io.open }, screen: {
  getPrimaryDisplay: () => ({ id: 1, workArea: { x: 0, y: 0, width: 1000, height: 800 } }),
  getAllDisplays: () => [{ id: 2, workArea: { x: 1000, y: 40, width: 1200, height: 800 } }]
} }));
vi.mock('@electron-toolkit/utils', () => ({ is: { get dev() { return io.dev; } } }));
vi.mock('../../config/storeConfig', () => ({ readIslandShapeModeConfig: () => io.mode, PILL_ISLAND_HEIGHT: 52 }));
const events = new Map<string, () => void | Promise<void>>();
const win = { isDestroyed: vi.fn<() => boolean>(), getBounds: () => ({ x: 0, y: 0, width: 800, height: 42 }),
  setBounds: vi.fn(), setShape: vi.fn(), setIgnoreMouseEvents: vi.fn(), setAlwaysOnTop: vi.fn(), setBackgroundColor: vi.fn(),
  show: vi.fn(), loadURL: vi.fn(), loadFile: vi.fn(),
  on: (event: string, callback: () => void | Promise<void>) => events.set(event, callback),
  webContents: { send: vi.fn(), executeJavaScript: vi.fn(), setWindowOpenHandler: vi.fn() }
};
let current: BrowserWindow | null; let selection: string; let offset: { x: number; y: number };
/**
 * 创建真实窗口服务，仅替换 Electron 叶边界。
 * @param callbacks - 显示前同步和异步钩子
 * @param callbacks.onBeforeShow - 显示前同步通知
 * @param callbacks.onReadyToShow - 等待 splash 关闭的异步通知
 * @returns 主窗口服务
 */
function service(callbacks: { onBeforeShow?: () => void; onReadyToShow?: () => Promise<void> } = {}): ReturnType<typeof createMainWindowService> {
  return createMainWindowService({ getMainWindow: () => current, setMainWindow: (value) => { current = value; },
    getIslandPositionOffset: () => offset, setIslandPositionOffset: (value) => { offset = value; },
    sanitizeIslandPositionOffset: (value) => ({ x: value.x ?? 0, y: value.y ?? 0 }), getIslandDisplaySelection: () => selection,
    sizes: { islandWidth: 260, islandHeight: 42, backingWidth: 800 }, ...callbacks });
}
beforeEach(() => { vi.resetAllMocks(); events.clear(); current = null; selection = 'primary'; offset = { x: 0, y: 0 }; io.dev = true; io.mode = 'notch';
  win.isDestroyed.mockReturnValue(false);
  // eslint-disable-next-line prefer-arrow-callback -- Electron BrowserWindow 通过 new 调用，叶边界必须保留可构造函数。
  io.create.mockImplementation(function windowConstructor() { return win; });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe('主窗口显示、定位与浏览器边界', () => {
  it.each(['invalid', '999', '2'])('屏幕选择 %s 正确回退或使用副屏', (display) => {
    selection = display; const target = service(); target.createWindow(); target.applyIslandPositionOffset({ x: 20, y: 30 });
    expect(target.getInitialCenterX()).toBe(display === '2' ? 1620 : 520);
    expect(win.setBounds).toHaveBeenLastCalledWith({ x: display === '2' ? 1220 : 120, y: display === '2' ? 40 : 0, width: 800, height: 42 });
    expect(win.webContents.send).toHaveBeenCalledWith('window:island-position:changed', { x: 20, y: 30 });
  });
  it.each(['missing', 'destroyed'])('窗口 %s 时保存偏移但不触发原生操作或形态通知', (state) => {
    const target = service();
    if (state === 'destroyed') { current = win as unknown as BrowserWindow; win.isDestroyed.mockReturnValue(true); }
    target.applyIslandPositionOffset({ x: 10, y: 20 }); target.notifyShapeModeChanged();
    expect(offset).toEqual({ x: 10, y: 20 }); expect(target.getInitialCenterX()).toBe(510);
    expect(win.setBounds).not.toHaveBeenCalled(); expect(win.webContents.send).not.toHaveBeenCalled();
  });
  it('pill 形态通知携带屏幕位置及偏移，使用当前配置', () => {
    const target = service(); target.createWindow(); io.mode = 'pill'; target.applyIslandPositionOffset({ x: 30, y: 20 }); target.notifyShapeModeChanged();
    expect(win.webContents.send).toHaveBeenLastCalledWith('island:shape-mode:changed', 'pill', 400, 66);
  });
  it('显示前按顺序等待回调，等待过程中销毁后不显示窗口', async () => {
    const before = vi.fn(); const ready = vi.fn(() => { win.isDestroyed.mockReturnValue(true); return Promise.resolve(); });
    const target = service({ onBeforeShow: before, onReadyToShow: ready }); target.createWindow(); await events.get('ready-to-show')?.();
    expect(before).toHaveBeenCalledOnce(); expect(ready).toHaveBeenCalledOnce();
    expect(before.mock.invocationCallOrder[0]).toBeLessThan(ready.mock.invocationCallOrder[0]);
    expect(win.show).not.toHaveBeenCalled(); expect(win.webContents.send).not.toHaveBeenCalled();
  });
  it('blur 恢复透明背景，外部链接通过系统浏览器并拒绝新窗口', async () => {
    service().createWindow(); await events.get('blur')?.();
    expect(win.setBackgroundColor).toHaveBeenCalledWith('#00000000');
    expect(win.webContents.executeJavaScript).toHaveBeenCalledWith(expect.stringContaining('document.body.style.background'));
    const handler = win.webContents.setWindowOpenHandler.mock.calls[0]?.[0] as (details: { url: string }) => { action: string };
    expect(handler({ url: 'https://fixture.invalid/' })).toEqual({ action: 'deny' }); expect(io.open).toHaveBeenCalledWith('https://fixture.invalid/');
  });
  it('开发加载 Renderer URL，生产图标和 HTML 使用本地资源', () => {
    vi.stubEnv('ELECTRON_RENDERER_URL', 'http://localhost:5173'); service().createWindow();
    expect(win.loadURL).toHaveBeenCalledWith('http://localhost:5173/html/DynamicIslandIndex.html');
    io.dev = false;
    const descriptor = Object.getOwnPropertyDescriptor(process, 'resourcesPath');
    Object.defineProperty(process, 'resourcesPath', { configurable: true, value: 'C:/resources' });
    try { service().createWindow(); expect(io.create.mock.calls.at(-1)?.[0] as unknown).toMatchObject({ icon: expect.stringContaining('eisland_256x256.ico') as unknown });
      expect(win.loadFile).toHaveBeenCalledWith(expect.stringContaining('DynamicIslandIndex.html')); }
    finally { if (descriptor) Object.defineProperty(process, 'resourcesPath', descriptor); else Reflect.deleteProperty(process, 'resourcesPath'); }
  });
});
