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
 * @file trayMenuWindow.test.ts
 * @description 自绘托盘菜单窗口的创建、透明预显示、定位、失焦关闭与 IPC 校验测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import mockWindow from './windowMock';
import type { BrowserWindowConstructorOptions } from 'electron';
import type { TrayMenuState } from '../../../shared/trayMenu';

type IpcListener = (event: { sender: unknown }, ...args: unknown[]) => void;

const mocks = vi.hoisted(() => ({
  create: vi.fn<(options: BrowserWindowConstructorOptions) => ReturnType<typeof mockWindow>>(),
  listeners: new Map<string, IpcListener>(),
  ipcOn: vi.fn(),
  cursor: { x: 100, y: 100 },
  workArea: { x: 0, y: 0, width: 1920, height: 1040 },
  dev: false,
}));

vi.mock('electron', () => ({
  BrowserWindow: mocks.create,
  ipcMain: {
    on: (channel: string, listener: IpcListener) => {
      mocks.ipcOn(channel);
      mocks.listeners.set(channel, listener);
    },
  },
  screen: {
    getCursorScreenPoint: () => ({ ...mocks.cursor }),
    getDisplayNearestPoint: () => ({ workArea: { ...mocks.workArea } }),
  },
}));
vi.mock('@electron-toolkit/utils', () => ({ is: { get dev() { return mocks.dev; } } }));

const STATE: TrayMenuState = { windowAvailable: true, alwaysOnTop: true, standaloneMode: false, language: 'zh-CN' };

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.listeners.clear();
  mocks.cursor = { x: 100, y: 100 };
  mocks.workArea = { x: 0, y: 0, width: 1920, height: 1040 };
  mocks.dev = false;
  vi.stubEnv('ELECTRON_RENDERER_URL', undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

/**
 * 导入全新的菜单窗口模块，并让构造器返回可控窗口替身。
 * @returns 窗口替身与模块导出。
 */
async function setup() {
  const win = Object.assign(mockWindow(), { setOpacity: vi.fn(), showInactive: vi.fn() });
  win.showInactive.mockImplementation(() => { win.state.visible = true; });
  function constructWindow() { return win; }
  mocks.create.mockImplementation(constructWindow);
  const service = await import('../trayMenuWindow');
  return { win, service };
}

/**
 * 以指定发送方触发主进程菜单 IPC。
 * @param channel - IPC 通道。
 * @param sender - 发送方 webContents。
 * @param args - IPC 参数。
 */
function emit(channel: string, sender: unknown, ...args: unknown[]): void {
  const listener = mocks.listeners.get(channel);
  if (!listener) throw new Error(`Missing IPC listener ${channel}`);
  listener({ sender }, ...args);
}

describe('trayMenuWindow', () => {
  it.each([
    { dev: true, url: 'http://localhost:5173', expected: 'url' },
    { dev: true, url: undefined, expected: 'file' },
    { dev: false, url: 'http://localhost:5173', expected: 'file' },
  ])('creates a hidden frameless popup and loads by $expected (dev=$dev)', async ({ dev, url, expected }) => {
    mocks.dev = dev;
    vi.stubEnv('ELECTRON_RENDERER_URL', url);
    const { win, service } = await setup();
    service.showTrayMenuWindow(STATE, vi.fn());
    expect(mocks.create.mock.calls[0][0]).toMatchObject({
      width: service.TRAY_MENU_WIDTH,
      show: false,
      frame: false,
      transparent: true,
      skipTaskbar: true,
      webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false },
    });
    expect(win.setAlwaysOnTop).toHaveBeenCalledWith(true, 'pop-up-menu');
    if (expected === 'url') {
      expect(win.loadURL).toHaveBeenCalledWith(`${url}/html/DynamicIslandTrayMenu.html`);
      expect(win.loadFile).not.toHaveBeenCalled();
    } else {
      expect(win.loadFile.mock.calls[0][0]).toMatch(/DynamicIslandTrayMenu\.html$/);
      expect(win.loadURL).not.toHaveBeenCalled();
    }
  });

  it('waits for the renderer to subscribe, then pre-shows transparently and sends the state', async () => {
    const { win, service } = await setup();
    service.showTrayMenuWindow(STATE, vi.fn());
    expect(win.webContents.send).not.toHaveBeenCalled();
    emit('tray-menu:mounted', { foreign: true });
    expect(win.webContents.send).not.toHaveBeenCalled();
    emit('tray-menu:mounted', win.webContents);
    expect(win.setOpacity).toHaveBeenCalledWith(0);
    expect(win.setBounds).toHaveBeenCalledWith({ height: 360, x: 100, y: 100, width: service.TRAY_MENU_WIDTH });
    expect(win.showInactive).toHaveBeenCalledOnce();
    expect(win.show).not.toHaveBeenCalled();
    expect(win.focus).not.toHaveBeenCalled();
    expect(win.webContents.send).toHaveBeenCalledWith('tray-menu:open', STATE);
    expect(win.setOpacity.mock.invocationCallOrder[0]).toBeLessThan(win.showInactive.mock.invocationCallOrder[0]);
  });

  it('reveals only after a valid ready height and repositions later reports without refocusing', async () => {
    const { win, service } = await setup();
    service.showTrayMenuWindow(STATE, vi.fn());
    emit('tray-menu:mounted', win.webContents);
    win.setOpacity.mockClear();
    for (const invalid of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, '200']) emit('tray-menu:ready', win.webContents, invalid);
    emit('tray-menu:ready', { foreign: true }, 200);
    expect(win.setOpacity).not.toHaveBeenCalled();
    emit('tray-menu:ready', win.webContents, 199.2);
    expect(win.setBounds).toHaveBeenLastCalledWith({ height: 200, x: 100, y: 100, width: service.TRAY_MENU_WIDTH });
    expect(win.setOpacity).toHaveBeenCalledWith(1);
    expect(win.focus).toHaveBeenCalledOnce();
    emit('tray-menu:ready', win.webContents, 240);
    expect(win.setBounds).toHaveBeenLastCalledWith({ height: 240, x: 100, y: 100, width: service.TRAY_MENU_WIDTH });
    expect(win.focus).toHaveBeenCalledOnce();
  });

  it('flips left and up near the bottom-right taskbar and stays inside the work area', async () => {
    mocks.cursor = { x: 1900, y: 1030 };
    const { win, service } = await setup();
    service.showTrayMenuWindow(STATE, vi.fn());
    emit('tray-menu:mounted', win.webContents);
    emit('tray-menu:ready', win.webContents, 300);
    expect(win.setBounds).toHaveBeenLastCalledWith({ height: 300, x: 1900 - service.TRAY_MENU_WIDTH, y: 730, width: service.TRAY_MENU_WIDTH });
    mocks.cursor = { x: 10, y: 20 };
    mocks.workArea = { x: 0, y: 0, width: 200, height: 100 };
    service.showTrayMenuWindow(STATE, vi.fn());
    emit('tray-menu:ready', win.webContents, 300);
    expect(win.setBounds).toHaveBeenLastCalledWith({ height: 300, x: 200 - service.TRAY_MENU_WIDTH, y: -200, width: service.TRAY_MENU_WIDTH });
  });

  it('ignores a ready report after the menu was hidden', async () => {
    const { win, service } = await setup();
    service.showTrayMenuWindow(STATE, vi.fn());
    emit('tray-menu:mounted', win.webContents);
    service.hideTrayMenuWindow();
    win.setOpacity.mockClear();
    emit('tray-menu:ready', win.webContents, 200);
    expect(win.setOpacity).not.toHaveBeenCalled();
    expect(win.focus).not.toHaveBeenCalled();
  });

  it('hides before running a valid action and rejects invalid or foreign actions', async () => {
    const { win, service } = await setup();
    const onAction = vi.fn();
    service.showTrayMenuWindow(STATE, onAction);
    emit('tray-menu:mounted', win.webContents);
    emit('tray-menu:ready', win.webContents, 200);
    emit('tray-menu:action', win.webContents, 'format-disk');
    emit('tray-menu:action', { foreign: true }, 'quit');
    expect(onAction).not.toHaveBeenCalled();
    expect(win.hide).not.toHaveBeenCalled();
    emit('tray-menu:action', win.webContents, 'show-island');
    expect(win.hide).toHaveBeenCalledOnce();
    expect(onAction).toHaveBeenCalledWith('show-island');
    expect(win.hide.mock.invocationCallOrder[0]).toBeLessThan(onAction.mock.invocationCallOrder[0]);
  });

  it('closes on request from the menu only', async () => {
    const { win, service } = await setup();
    service.showTrayMenuWindow(STATE, vi.fn());
    emit('tray-menu:mounted', win.webContents);
    emit('tray-menu:close', { foreign: true });
    expect(win.hide).not.toHaveBeenCalled();
    emit('tray-menu:close', win.webContents);
    expect(win.setOpacity).toHaveBeenLastCalledWith(0);
    expect(win.hide).toHaveBeenCalledOnce();
    service.hideTrayMenuWindow();
    expect(win.hide).toHaveBeenCalledOnce();
  });

  it('hides on blur only after the menu was revealed', async () => {
    const { win, service } = await setup();
    service.showTrayMenuWindow(STATE, vi.fn());
    emit('tray-menu:mounted', win.webContents);
    win.emit('blur');
    expect(win.hide).not.toHaveBeenCalled();
    emit('tray-menu:ready', win.webContents, 200);
    win.emit('blur');
    expect(win.hide).toHaveBeenCalledOnce();
  });

  it('reuses the loaded window, registers IPC once and uses the latest action handler', async () => {
    const { win, service } = await setup();
    const first = vi.fn();
    const second = vi.fn();
    service.showTrayMenuWindow(STATE, first);
    emit('tray-menu:mounted', win.webContents);
    service.hideTrayMenuWindow();
    const next = { ...STATE, standaloneMode: true };
    service.showTrayMenuWindow(next, second);
    expect(mocks.create).toHaveBeenCalledOnce();
    expect(win.webContents.send).toHaveBeenLastCalledWith('tray-menu:open', next);
    expect(mocks.ipcOn).toHaveBeenCalledTimes(4);
    emit('tray-menu:action', win.webContents, 'quit');
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith('quit');
  });

  it('recreates the window after it closes and waits for the new renderer', async () => {
    const { win, service } = await setup();
    service.showTrayMenuWindow(STATE, vi.fn());
    emit('tray-menu:mounted', win.webContents);
    win.close();
    const replacement = Object.assign(mockWindow(), { setOpacity: vi.fn(), showInactive: vi.fn() });
    function constructReplacement() { return replacement; }
    mocks.create.mockImplementation(constructReplacement);
    service.showTrayMenuWindow(STATE, vi.fn());
    expect(mocks.create).toHaveBeenCalledTimes(2);
    expect(replacement.webContents.send).not.toHaveBeenCalled();
    emit('tray-menu:mounted', win.webContents);
    expect(replacement.webContents.send).not.toHaveBeenCalled();
    emit('tray-menu:mounted', replacement.webContents);
    expect(replacement.webContents.send).toHaveBeenCalledWith('tray-menu:open', STATE);
  });

  it('destroys the window and is safe to call repeatedly', async () => {
    const { win, service } = await setup();
    service.destroyTrayMenuWindow();
    service.showTrayMenuWindow(STATE, vi.fn());
    service.destroyTrayMenuWindow();
    service.destroyTrayMenuWindow();
    expect(win.destroy).toHaveBeenCalledOnce();
    service.hideTrayMenuWindow();
    expect(win.hide).not.toHaveBeenCalled();
  });

  it('reports a page load failure without an unhandled rejection', async () => {
    const report = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { win, service } = await setup();
    const failure = new Error('load failed');
    win.loadFile.mockRejectedValueOnce(failure);
    service.showTrayMenuWindow(STATE, vi.fn());
    await Promise.resolve();
    await Promise.resolve();
    expect(report).toHaveBeenCalledWith('[TrayMenu] Failed to load tray menu page:', failure);
    report.mockRestore();
  });
});
