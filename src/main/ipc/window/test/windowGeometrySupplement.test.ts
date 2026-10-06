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
 * @file windowGeometrySupplement.test.ts
 * @description 窗口各形态几何、延迟取消、销毁保护及配置失败传播的真实 IPC 测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BrowserWindow, Rectangle } from 'electron';
type HandlerFixture = (...args: unknown[]) => unknown;
const io = vi.hoisted(() => ({
  events: new Map<string, HandlerFixture>(), handles: new Map<string, HandlerFixture>(),
  mode: vi.fn<() => 'pill' | 'notch'>(), broadcast: vi.fn(),
  bounds: { x: 100, y: 200, width: 1000, height: 600 },
  selection: 'primary', offset: { x: 1, y: 2 }, main: vi.fn<() => BrowserWindow | null>(),
}));
vi.mock('electron', () => ({
  ipcMain: { on: (channel: string, fn: HandlerFixture) => io.events.set(channel, fn), handle: (channel: string, fn: HandlerFixture) => io.handles.set(channel, fn) },
  screen: {
    getCursorScreenPoint: () => ({ x: 10, y: 20 }),
    getPrimaryDisplay: () => ({ id: 1, workArea: { y: 11, width: 1920, height: 1080 } }),
    getAllDisplays: () => [{ id: 1, workArea: { y: 11, width: 1920, height: 1080 } }, { id: 2, workArea: { y: -200, width: 1280, height: 720 } }],
  },
}));
vi.mock('../../../utils/broadcast', () => ({ broadcastSettingChange: io.broadcast }));
vi.mock('../../../config/storeConfig', () => ({
  readIslandShapeModeConfig: io.mode, PILL_ISLAND_HEIGHT: 52, PILL_EXPANDED_HEIGHT: 72,
  PILL_NOTIFICATION_HEIGHT: 100, PILL_LYRICS_HEIGHT: 52, PILL_LYRICS_TRANSLATION_HEIGHT: 72,
  PILL_EXPANDED_FULL_HEIGHT: 164, PILL_SETTINGS_HEIGHT: 416,
}));
const win = {
  isDestroyed: vi.fn<() => boolean>(), getBounds: vi.fn<() => Rectangle>(),
  setBounds: vi.fn<(bounds: Rectangle) => void>(), setShape: vi.fn(), hide: vi.fn(),
  setIgnoreMouseEvents: vi.fn(), webContents: { send: vi.fn(), invalidate: vi.fn() },
};
const hidden = vi.fn(); const writePosition = vi.fn<() => boolean>(); const writeDisplay = vi.fn<() => boolean>();
const setSelection = vi.fn(); const applyOffset = vi.fn();
let target: typeof import('../window');
/**
 * 调用窗口事件处理器。
 * @param channel - 窗口事件
 * @param args - 事件参数
 * @returns 处理器结果
 */
function event(channel: string, ...args: unknown[]): unknown { return io.events.get(`window:${channel}`)?.({}, ...args); }
/**
 * 调用窗口查询处理器。
 * @param channel - 窗口查询
 * @param args - 查询参数
 * @returns 处理器结果
 */
function handle(channel: string, ...args: unknown[]): unknown { return io.handles.get(`window:${channel}`)?.({ sender: { id: 7 } }, ...args); }
beforeEach(async () => {
  vi.resetModules(); vi.resetAllMocks(); io.events.clear(); io.handles.clear();
  io.bounds = { x: 100, y: 200, width: 1000, height: 600 }; io.selection = 'primary'; io.offset = { x: 1, y: 2 };
  io.mode.mockReturnValue('notch'); io.main.mockReturnValue(win as unknown as BrowserWindow);
  win.isDestroyed.mockReturnValue(false); win.getBounds.mockImplementation(() => ({ ...io.bounds }));
  win.setBounds.mockImplementation((bounds) => { io.bounds = { ...bounds }; });
  writePosition.mockReturnValue(false); writeDisplay.mockReturnValue(false);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  target = await import('../window');
  target.registerWindowIpcHandlers({
    getMainWindow: io.main, getInitialCenterX: () => 500, setHiddenByAutoHideProcess: hidden,
    getIslandPositionOffset: () => io.offset, getIslandDisplaySelection: () => io.selection,
    sanitizeIslandDisplaySelection: () => '2', setIslandDisplaySelection: setSelection,
    sanitizeIslandPositionOffset: () => ({ x: 8, y: 9 }), applyIslandPositionOffset: applyOffset,
    writeIslandPositionOffsetConfig: writePosition, writeIslandDisplaySelectionConfig: writeDisplay,
    sizes: { expandedWidth: 600, expandedHeight: 200, notificationWidth: 500, notificationHeight: 210,
      lyricsWidth: 700, lyricsHeight: 240, lyricsTranslationHeight: 300, expandedFullWidth: 900,
      expandedFullHeight: 400, settingsWidth: 1000, settingsHeight: 610, islandWidth: 300, islandHeight: 100 },
  });
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
const states = [
  ['expand', 600, 200, 72], ['expand-notification', 500, 210, 100], ['expand-lyrics', 700, 240, 52],
  ['expand-lyrics-translation', 700, 300, 72], ['expand-full', 900, 400, 164],
  ['expand-settings', 1000, 610, 416], ['collapse', 300, 100, 52],
] as const;
describe('各状态窗口形态与逻辑边界', () => {
  it.each(states)('%s 在 notch 与 pill 模式使用各自高度与中心', (channel, width, notchHeight, pillHeight) => {
    event(channel);
    expect(handle('get-bounds')).toEqual({ width, x: 500 - width / 2, y: 11, height: notchHeight });
    expect(win.setShape).toHaveBeenLastCalledWith([{ width, x: (1000 - width) / 2, y: 0, height: notchHeight }]);
    io.mode.mockReturnValue('pill'); io.bounds = { x: 100, y: 200, width: 1000, height: 600 };
    event(channel);
    expect(handle('get-bounds')).toEqual({ width, x: 600 - width / 2, y: 200, height: pillHeight });
    expect(win.webContents.invalidate).toHaveBeenCalledTimes(2);
  });
  it.each(['2', '999', 'invalid'])('显示选择 %s 匹配副显示器或回退主显示器', (selection) => {
    io.selection = selection; event('expand');
    expect(io.bounds.y).toBe(selection === '2' ? -200 : 11);
  });
  it('首次查询排除透明预留区并复制位置对象', () => {
    expect(handle('get-bounds')).toEqual({ x: 450, y: 200, width: 300, height: 600 });
    expect(handle('get-mouse-window-state')).toEqual({ mousePosition: { x: 10, y: 20 }, bounds: { x: 450, y: 200, width: 300, height: 600 } });
    expect(handle('island-display:get')).toBe('primary');
    const position = handle('island-position:get');
    expect(position).toEqual({ x: 1, y: 2 }); expect(position).not.toBe(io.offset);
    expect(handle('island-displays:list')).toEqual([{ id: '1', width: 1920, height: 1080, isPrimary: true }, { id: '2', width: 1280, height: 720, isPrimary: false }]);
  });
  it('新的立即请求取消挂起定时器，非法延迟按立即请求处理', () => {
    vi.useFakeTimers(); event('expand-settings', 100);
    expect(vi.getTimerCount()).toBe(1);
    event('collapse', NaN);
    expect(vi.getTimerCount()).toBe(0);
    expect(handle('get-bounds')).toMatchObject({ width: 300, height: 100 });
    vi.advanceTimersByTime(100); expect(win.setBounds).toHaveBeenCalledTimes(2);
  });
  it('延迟提交前窗口销毁则安全跳过最终几何更新', () => {
    vi.useFakeTimers(); event('expand', 100); win.isDestroyed.mockReturnValue(true);
    vi.advanceTimersByTime(100); expect(win.setBounds).toHaveBeenCalledOnce();
  });
});
describe('窗口状态与失败边界', () => {
  it.each(['absent', 'destroyed'])('%s 窗口不执行操作并返回 null', (state) => {
    if (state === 'absent') io.main.mockReturnValue(null); else win.isDestroyed.mockReturnValue(true);
    event('expand'); event('hide'); event('enable-mouse-passthrough'); event('move-delta', 1, 2);
    expect(handle('get-bounds')).toBeNull(); expect(handle('get-mouse-window-state')).toBeNull();
    target.toggleMousePassthroughLock(io.main);
    expect(win.setBounds).not.toHaveBeenCalled(); expect(win.hide).not.toHaveBeenCalled(); expect(win.webContents.send).not.toHaveBeenCalled();
  });
  it('鼠标锁定期间忽略解锁事件，切换后恢复常规行为', () => {
    target.toggleMousePassthroughLock(io.main); win.setIgnoreMouseEvents.mockClear();
    event('disable-mouse-passthrough'); expect(win.setIgnoreMouseEvents).not.toHaveBeenCalled();
    target.toggleMousePassthroughLock(io.main); event('disable-mouse-passthrough'); event('enable-mouse-passthrough');
    expect(win.setIgnoreMouseEvents).toHaveBeenCalledWith(false);
    expect(win.setIgnoreMouseEvents).toHaveBeenLastCalledWith(true, { forward: true });
    event('hide'); expect(hidden).toHaveBeenCalledExactlyOnceWith(false); expect(win.hide).toHaveBeenCalledOnce();
  });
  it.each([new Error('native failure'), 'native failure', new Error('Object has been destroyed')])('原生窗口异常 %s 被处理并区分销毁日志', (failure) => {
    win.setIgnoreMouseEvents.mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- 原生叶接口任意拒绝值需要验证既有字符串处理。
      throw failure;
    });
    expect(() => event('enable-mouse-passthrough')).not.toThrow();
    if (failure instanceof Error && failure.message.includes('destroyed')) expect(console.error).not.toHaveBeenCalled();
    else expect(console.error).toHaveBeenCalledWith('[WindowIPC] handler error:', failure);
  });
  it('移动使用整数边界，非法数值不修改窗口', () => {
    event('move-delta', 1.4, -2.4);
    expect(win.setBounds).toHaveBeenCalledWith({ x: 101, y: 198, width: 1000, height: 600 });
    event('move-delta', NaN, 1); event('move-delta', 1, Infinity);
    expect(win.setBounds).toHaveBeenCalledOnce();
  });
  it('配置写入失败原样返回 false，并广播已经应用的设置', () => {
    expect(handle('island-display:set', 'invalid')).toBe(false); expect(setSelection).toHaveBeenCalledWith('2');
    expect(handle('island-position:set', { x: 50 })).toBe(false); expect(applyOffset).toHaveBeenCalledWith({ x: 8, y: 9 });
    expect(io.broadcast).toHaveBeenCalledWith(7, 'island:display', '2');
    expect(io.broadcast).toHaveBeenCalledWith(7, 'island:position', { x: 8, y: 9 });
  });
});
