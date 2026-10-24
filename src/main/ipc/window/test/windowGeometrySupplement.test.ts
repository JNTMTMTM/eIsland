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
  scale: 100, writeScale: vi.fn<() => boolean>(),
  bounds: { x: 100, y: 200, width: 1000, height: 600 },
  selection: 'primary', offset: { x: 1, y: 2 }, main: vi.fn<() => BrowserWindow | null>(),
}));
// 淡入淡出过渡由 islandVisibility 单测覆盖，此处直接切换以验证显示/隐藏的调用路由。
vi.mock('../../../window/islandVisibility', () => ({
  isIslandShown: (window: { isVisible: () => boolean }) => window.isVisible(),
  showIsland: (window: { show: () => void }) => { window.show(); },
  hideIsland: (window: { hide: () => void }) => { window.hide(); },
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
vi.mock('../../../config/islandScaleConfig', () => ({
  readIslandScaleConfig: () => io.scale, writeIslandScaleConfig: io.writeScale,
}));
vi.mock('../../../config/storeConfig', () => ({
  readIslandShapeModeConfig: io.mode, PILL_ISLAND_HEIGHT: 52, PILL_EXPANDED_HEIGHT: 72,
  PILL_NOTIFICATION_HEIGHT: 100, PILL_LYRICS_HEIGHT: 52, PILL_LYRICS_TRANSLATION_HEIGHT: 72,
  PILL_EXPANDED_FULL_HEIGHT: 164, PILL_SETTINGS_HEIGHT: 416,
}));
const win = {
  isDestroyed: vi.fn<() => boolean>(), getBounds: vi.fn<() => Rectangle>(),
  setBounds: vi.fn<(bounds: Rectangle) => void>(), setShape: vi.fn(), hide: vi.fn(),
  setIgnoreMouseEvents: vi.fn(), webContents: { send: vi.fn(), invalidate: vi.fn(), setZoomFactor: vi.fn() },
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
/**
 * 从主窗口发出形变生命周期事件。
 * @param phase - 开始或完成阶段
 * @param id - 本次形变令牌
 * @param sender - 实际发送消息的页面
 * @returns 处理器结果
 */
function transition(phase: 'begin' | 'complete', id: number, sender: unknown = win.webContents): unknown {
  return io.events.get(`window:transition:${phase}`)?.({ sender }, id);
}
beforeEach(async () => {
  vi.resetModules(); vi.resetAllMocks(); io.events.clear(); io.handles.clear();
  io.bounds = { x: 100, y: 200, width: 1000, height: 600 }; io.selection = 'primary'; io.offset = { x: 1, y: 2 };
  io.scale = 100; io.writeScale.mockReturnValue(true);
  io.mode.mockReturnValue('notch'); io.main.mockReturnValue(win as unknown as BrowserWindow);
  win.isDestroyed.mockReturnValue(false); win.getBounds.mockImplementation(() => ({ ...io.bounds }));
  win.setBounds.mockImplementation((bounds) => { io.bounds = { ...bounds }; });
  writePosition.mockReturnValue(false); writeDisplay.mockReturnValue(false);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  target = await import('../window');
  target.registerWindowIpcHandlers({
    getMainWindow: io.main, getInitialCenterX: () => 500, setManualVisibility: hidden,
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
  it.each(states)('%s 缩放后同时调整渲染、裁剪和命中边界并保留中心', (channel, width, notchHeight) => {
    event(channel);
    expect(io.handles.get('island:scale:set')?.({ sender: { id: 7 } }, 75)).toBe(true);
    expect(win.webContents.setZoomFactor).toHaveBeenLastCalledWith(0.75);
    expect(handle('get-bounds')).toEqual({ width: Math.round(width * 0.75), height: Math.round(notchHeight * 0.75), x: Math.round(500 - Math.round(width * 0.75) / 2), y: 11 });
    expect(io.handles.get('island:scale:get')?.()).toBe(75);
    expect(io.broadcast).toHaveBeenLastCalledWith(7, 'island:scale', 75);
    event(channel);
    expect(handle('get-bounds')).toMatchObject({ width: Math.round(width * 0.75) });
  });
  it('pill 缩放保持拖动后的中心与纵坐标，并取消旧比例的延迟收缩', async () => {
    vi.useFakeTimers(); io.mode.mockReturnValue('pill');
    event('expand-settings'); event('collapse', 250);
    io.handles.get('island:scale:set')?.({ sender: { id: 7 } }, 50);
    expect(handle('get-bounds')).toEqual({ x: 525, y: 200, width: 150, height: 26 });
    await vi.advanceTimersByTimeAsync(300);
    expect(handle('get-bounds')).toEqual({ x: 525, y: 200, width: 150, height: 26 });
  });
  it('保存失败时保持原有比例与窗口，异常数字回退为默认值', () => {
    io.writeScale.mockReturnValue(false);
    expect(io.handles.get('island:scale:set')?.({ sender: { id: 7 } }, 50)).toBe(false);
    expect(win.webContents.setZoomFactor).not.toHaveBeenCalled();
    expect(io.handles.get('island:scale:get')?.()).toBe(100);
    io.writeScale.mockReturnValue(true);
    io.handles.get('island:scale:set')?.({ sender: { id: 7 } }, Infinity);
    expect(io.writeScale).toHaveBeenLastCalledWith(100);
  });
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
    expect(handle('get-bounds')).toEqual({ x: 450, y: 200, width: 300, height: 100 });
    expect(handle('get-mouse-window-state')).toEqual({ mousePosition: { x: 10, y: 20 }, bounds: { x: 450, y: 200, width: 300, height: 100 } });
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
  it('增长立即预留画布，不因完整动画保护时长创建多余延迟', () => {
    vi.useFakeTimers(); event('collapse');
    event('expand-notification', 700);
    expect(handle('get-bounds')).toMatchObject({ width: 500, height: 210 });
    expect(vi.getTimerCount()).toBe(0);
  });
  it('通知切换到更宽更矮状态时，立即扩宽并保护旧高度直到动画结束', () => {
    vi.useFakeTimers(); event('expand-notification');
    event('expand', 700);
    expect(handle('get-bounds')).toMatchObject({ width: 600, height: 210 });
    expect(io.bounds.height).toBe(210);
    vi.advanceTimersByTime(699);
    expect(win.setShape).toHaveBeenLastCalledWith([{ x: 200, y: 0, width: 600, height: 210 }]);
    vi.advanceTimersByTime(1);
    expect(handle('get-bounds')).toMatchObject({ width: 600, height: 200 });
  });
  it('通知收缩被 hover 打断后，以当前包络保护新动画，不提前执行旧收缩', () => {
    vi.useFakeTimers(); event('expand-notification');
    event('collapse', 700);
    vi.advanceTimersByTime(200);
    event('expand', 700);
    expect(handle('get-bounds')).toMatchObject({ width: 600, height: 210 });
    vi.advanceTimersByTime(500);
    expect(handle('get-bounds')).toMatchObject({ width: 600, height: 210 });
    vi.advanceTimersByTime(199);
    expect(io.bounds.height).toBe(210);
    vi.advanceTimersByTime(1);
    expect(handle('get-bounds')).toMatchObject({ width: 600, height: 200 });
  });
  it('重复目标不推迟原收缩截止时间，内容刷新不会让旧通知画布一直滞留', () => {
    vi.useFakeTimers(); event('expand-notification');
    event('collapse', 700);
    vi.advanceTimersByTime(500);
    event('collapse', 700);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(200);
    expect(handle('get-bounds')).toMatchObject({ width: 300, height: 100 });
    expect(vi.getTimerCount()).toBe(0);
  });
  it('取消后迟到的旧回调不会裁剪当前画布或清除新请求', () => {
    vi.useFakeTimers(); event('expand-notification');
    const timer = vi.spyOn(globalThis, 'setTimeout');
    event('collapse', 700);
    const oldCallback = timer.mock.calls[0]?.[0];
    vi.advanceTimersByTime(200);
    event('expand', 700);
    const calls = win.setBounds.mock.calls.length;
    oldCallback?.();
    expect(win.setBounds).toHaveBeenCalledTimes(calls);
    vi.advanceTimersByTime(700);
    expect(handle('get-bounds')).toMatchObject({ width: 600, height: 200 });
  });
  it('旧窗口的收缩回调不能改动新建窗口', () => {
    vi.useFakeTimers(); event('expand-notification');
    event('collapse', 700);
    const replacement = { ...win, setBounds: vi.fn(), setShape: vi.fn() };
    io.main.mockReturnValue(replacement as unknown as BrowserWindow);
    vi.advanceTimersByTime(700);
    expect(replacement.setBounds).not.toHaveBeenCalled();
    expect(replacement.setShape).not.toHaveBeenCalled();
  });
});
describe('renderer 完成确认保护原生窗口', () => {
  it('renderer 忙帧超过名义动画时长仍保留通知包络，匹配确认后立即收敛', () => {
    vi.useFakeTimers(); event('expand-notification');
    transition('begin', 1); event('collapse', 220);
    vi.advanceTimersByTime(1000);
    expect(handle('get-bounds')).toMatchObject({ width: 500, height: 210 });
    expect(io.bounds.height).toBe(210);
    transition('complete', 1);
    expect(handle('get-bounds')).toMatchObject({ width: 300, height: 100 });
    expect(vi.getTimerCount()).toBe(0);
  });
  it('新形变替换令牌并保护混合宽高，迟到的旧确认不能收缩', () => {
    vi.useFakeTimers(); event('expand-notification');
    transition('begin', 1); event('collapse', 700);
    vi.advanceTimersByTime(200);
    transition('begin', 2); event('expand', 700);
    transition('complete', 1);
    vi.advanceTimersByTime(1000);
    expect(handle('get-bounds')).toMatchObject({ width: 600, height: 210 });
    expect(vi.getTimerCount()).toBe(1);
    transition('complete', 2);
    expect(handle('get-bounds')).toMatchObject({ width: 600, height: 200 });
  });
  it('重复开始与相同目标不延长五秒兜底，缺失确认仍能释放画布', () => {
    vi.useFakeTimers(); event('expand-notification');
    transition('begin', 1); event('collapse', 220);
    vi.advanceTimersByTime(3000);
    transition('begin', 1); event('collapse', 220);
    vi.advanceTimersByTime(1999);
    expect(handle('get-bounds')).toMatchObject({ width: 500, height: 210 });
    vi.advanceTimersByTime(1);
    expect(handle('get-bounds')).toMatchObject({ width: 300, height: 100 });
    transition('complete', 1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each([[2000, 6000], [20000, 30000]])('时长 %d 的兜底为 %d 毫秒', (delay, fallback) => {
    vi.useFakeTimers(); event('expand-notification');
    transition('begin', 1); event('collapse', delay);
    vi.advanceTimersByTime(fallback - 1);
    expect(handle('get-bounds')).toMatchObject({ width: 500, height: 210 });
    vi.advanceTimersByTime(1);
    expect(handle('get-bounds')).toMatchObject({ width: 300, height: 100 });
  });
  it('立即调整清除待确认形变，后续旧确认与超时均不能恢复旧尺寸', () => {
    vi.useFakeTimers(); event('expand-notification');
    transition('begin', 1); event('collapse', 700);
    event('expand');
    transition('complete', 1);
    vi.advanceTimersByTime(5000);
    expect(handle('get-bounds')).toMatchObject({ width: 600, height: 200 });
    expect(vi.getTimerCount()).toBe(0);
  });
  it('纯增长立即完成几何，确认只释放令牌，不改变后续传统延时请求', () => {
    vi.useFakeTimers(); event('collapse');
    transition('begin', 1); event('expand-notification', 700);
    expect(handle('get-bounds')).toMatchObject({ width: 500, height: 210 });
    expect(vi.getTimerCount()).toBe(0);
    transition('complete', 1); event('collapse', 220);
    vi.advanceTimersByTime(220);
    expect(handle('get-bounds')).toMatchObject({ width: 300, height: 100 });
  });
  it('其他窗口的生命周期消息与非法令牌不能创建保护或确认当前形变', () => {
    vi.useFakeTimers(); event('expand-notification');
    transition('begin', 1, {}); transition('begin', NaN); transition('begin', 0);
    transition('begin', -1); transition('begin', 1.5);
    event('collapse', 220); vi.advanceTimersByTime(220);
    expect(handle('get-bounds')).toMatchObject({ width: 300, height: 100 });
    event('expand-notification'); transition('begin', 2); event('collapse', 220);
    transition('complete', 2, {}); vi.advanceTimersByTime(1000);
    expect(handle('get-bounds')).toMatchObject({ width: 500, height: 210 });
    transition('complete', 2);
    expect(handle('get-bounds')).toMatchObject({ width: 300, height: 100 });
  });
  it('已替换窗口的确认和兜底均不能修改新的主窗口', () => {
    vi.useFakeTimers(); event('expand-notification');
    transition('begin', 1); event('collapse', 220);
    const replacement = { ...win, webContents: { ...win.webContents }, setBounds: vi.fn(), setShape: vi.fn() };
    io.main.mockReturnValue(replacement as unknown as BrowserWindow);
    transition('complete', 1);
    transition('complete', 1, replacement.webContents);
    vi.advanceTimersByTime(5000);
    expect(replacement.setBounds).not.toHaveBeenCalled();
    expect(replacement.setShape).not.toHaveBeenCalled();
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
  it('移动时忽略 getBounds 被放大的宽高，尺寸变化后改用新外框', () => {
    event('move-delta', 1, 0);
    io.bounds.width += 8;
    io.bounds.height += 4;
    event('move-delta', 2, -1);
    expect(win.setBounds).toHaveBeenLastCalledWith({ x: 103, y: 199, width: 1000, height: 600 });
    event('expand');
    expect(win.setBounds).toHaveBeenCalledTimes(3);
    expect(win.setBounds).toHaveBeenLastCalledWith({ x: 0, y: 11, width: 1000, height: 200 });
    const expanded = win.setBounds.mock.calls.at(-1)?.[0];
    if (!expanded) throw new Error('expand did not set bounds');
    io.bounds = { ...expanded, width: expanded.width + 8, height: expanded.height + 4 };
    event('move-delta', 3, 4);
    expect(win.setBounds).toHaveBeenLastCalledWith({
      x: expanded.x + 3,
      y: expanded.y + 4,
      width: expanded.width,
      height: expanded.height,
    });
  });
  it('配置写入失败原样返回 false，并广播已经应用的设置', () => {
    expect(handle('island-display:set', 'invalid')).toBe(false); expect(setSelection).toHaveBeenCalledWith('2');
    expect(handle('island-position:set', { x: 50 })).toBe(false); expect(applyOffset).toHaveBeenCalledWith({ x: 8, y: 9 });
    expect(io.broadcast).toHaveBeenCalledWith(7, 'island:display', '2');
    expect(io.broadcast).toHaveBeenCalledWith(7, 'island:position', { x: 8, y: 9 });
  });
});
