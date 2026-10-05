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
 * @file overviewTab.test.tsx
 * @description 总览布局标准化、全部控件选择、导航模式、待办编辑与快捷方式排序测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushEffects, nodes, render, text, trigger, value } from '../../../maxExpand/test/componentHarness';
import { OverviewTab, normalizeOverviewLayoutConfig, OVERVIEW_WIDGET_OPTIONS, DEFAULT_OVERVIEW_GRADIENT_COLORS } from '../OverviewTab';
import type { OverviewLayoutConfig } from '../OverviewTab';
import type { AppShortcut, TodoItem } from '../OverviewTab/utils/types';

const mocks = vi.hoisted(() => ({
  read: vi.fn<(key: string) => Promise<unknown>>(), write: vi.fn<(key: string, data: unknown) => Promise<boolean>>(),
  subscribe: vi.fn<(callback: (channel: string, data: unknown) => void) => () => void>(), unsubscribe: vi.fn(),
  openFile: vi.fn<(path: string) => Promise<boolean>>(), openWindow: vi.fn<() => Promise<boolean>>(),
  select: vi.fn(), max: vi.fn(), widgets: Array.from({ length: 11 }, () => () => null), localGet: vi.fn<() => string | null>(), localSet: vi.fn(),
}));
vi.mock('../../../../../store/slices', () => ({ default: () => ({ setMaxExpand: mocks.max, setMaxExpandTab: mocks.select }) }));
vi.mock('../OverviewTab/components/OverviewWidgets', () => ({
  AlbumCarouselWidget: mocks.widgets[0],
  BreakReminderWidget: mocks.widgets[1],
  CountdownWidget: mocks.widgets[2],
  MokugyoWidget: mocks.widgets[3],
  PomodoroWidget: mocks.widgets[4],
  ShortcutsWidget: mocks.widgets[5],
  SongWidget: mocks.widgets[6],
  TodoWidget: mocks.widgets[7],
  UrlFavoritesWidget: mocks.widgets[8],
  WorldClockWidget: mocks.widgets[9],
  AlarmWidget: mocks.widgets[10],
}));

/**
 * 应用当前生命周期的初始化并等待IPC微任务。
 * @returns 清理订阅和计时器的函数。
 */
async function boot(): Promise<(() => void)[]> {
  const tree = render(OverviewTab); expect(tree).toBeDefined();
  const cleanup = flushEffects();
  await vi.advanceTimersByTimeAsync(0);
  return cleanup;
}

/**
 * 发送真实订阅回调接收的设置事件。
 * @param channel - 通道名称。
 * @param data - 变更内容。
 */
function update(channel: string, data: unknown): void {
  mocks.subscribe.mock.calls.forEach(([listener]) => { listener(channel, data); });
}

describe('OverviewTab', () => {
  let layout: OverviewLayoutConfig;
  let apps: AppShortcut[];
  let todos: TodoItem[];
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-06T12:34:56Z'));
    layout = normalizeOverviewLayoutConfig(null);
    apps = [{ id: 1, name: 'one', path: 'one.exe', iconBase64: null }, { id: 2, name: 'two', path: 'two.exe', iconBase64: 'icon' }];
    todos = [{ id: 1, text: 'task', done: false, createdAt: 1, subTodos: [{ id: 2, text: 'sub', done: false }] }];
    mocks.read.mockImplementation((key) => {
      if (key === 'overview-layout') return Promise.resolve(layout);
      if (key === 'app-shortcuts') return Promise.resolve(apps);
      if (key === 'todos') return Promise.resolve(todos);
      return Promise.resolve('integrated');
    });
    mocks.write.mockResolvedValue(true); mocks.openWindow.mockResolvedValue(true); mocks.openFile.mockResolvedValue(true);
    mocks.subscribe.mockReturnValue(mocks.unsubscribe); mocks.localGet.mockReturnValue(null);
    vi.stubGlobal('window', { api: { storeRead: mocks.read, storeWrite: mocks.write, onSettingsChanged: mocks.subscribe, openStandaloneWindow: mocks.openWindow, openFile: mocks.openFile } });
    vi.stubGlobal('localStorage', { getItem: mocks.localGet, setItem: mocks.localSet });
  });
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

  it.each([null, false, 'bad', {}, { left: 'invalid', right: 7, clockStyle: 'invalid', gradientColors: { start: 'red' } }])('非法布局 %j 回退默认字段和颜色', (raw) => {
    const result = normalizeOverviewLayoutConfig(raw);
    expect(result).toEqual({ left: 'shortcuts', right: 'todo', clockStyle: 'classic', gradientColors: DEFAULT_OVERVIEW_GRADIENT_COLORS });
  });

  it.each(OVERVIEW_WIDGET_OPTIONS)('控件 $value 可选为左右两栏并生成对应组件', async ({ value: widget }) => {
    layout = { ...layout, left: widget, right: widget };
    const cleanup = await boot();
    const map: Record<string, number> = { album: 0, breakReminder: 1, countdown: 2, mokugyo: 3, pomodoro: 4, shortcuts: 5, song: 6, todo: 7, urlFavorites: 8, worldClock: 9, alarm: 10 };
    expect(nodes(render(OverviewTab), mocks.widgets[map[widget]])).toHaveLength(2);
    cleanup.forEach((fn) => fn());
  });

  it.each(['classic', 'gradient', 'minimal'] as const)('时钟 %s 配置样式、时间位数及宜忌分支', async (clockStyle) => {
    layout = { ...layout, gradientColors: { start: '#123456', middle: '#654321', end: '#abcdef' } };
    layout.clockStyle = clockStyle;
    const cleanup = await boot();
    const tree = render(OverviewTab);
    expect(value(tree, '.ov-dash-time', 'className')).toContain(`--${  clockStyle}`);
    expect(text(nodes(tree, '.ov-dash-clock')).split(':')).toHaveLength(clockStyle === 'minimal' ? 2 : 3);
    expect(nodes(tree, '.ov-dash-yiji')).toHaveLength(clockStyle === 'minimal' ? 0 : 1);
    expect(value(tree, '.ov-dash-time', 'style')).toEqual(clockStyle === 'classic' ? undefined : {
      '--ov-clock-gradient-start': '#123456', '--ov-clock-gradient-middle': '#654321', '--ov-clock-gradient-end': '#abcdef',
    });
    cleanup.forEach((fn) => fn());
  });

  it('待办展开、主项和子项完成及删除同时持久化，删除展开项清理状态', async () => {
    const cleanup = await boot(); const { 7: todo } = mocks.widgets;
    trigger(render(OverviewTab), todo, 'onToggleExpand', 1);
    expect(value(render(OverviewTab), todo, 'expandedId')).toBe(1);
    trigger(render(OverviewTab), todo, 'onToggleDone', 1);
    expect((value(render(OverviewTab), todo, 'todos') as TodoItem[])[0].done).toBe(true);
    trigger(render(OverviewTab), todo, 'onToggleSubDone', 1, 2);
    expect((value(render(OverviewTab), todo, 'todos') as TodoItem[])[0].subTodos?.[0].done).toBe(true);
    expect(mocks.localSet).toHaveBeenCalledWith('eIsland_todos', expect.any(String));
    trigger(render(OverviewTab), todo, 'onRemoveTodo', 1);
    expect(value(render(OverviewTab), todo, 'todos')).toEqual([]);
    expect(value(render(OverviewTab), todo, 'expandedId')).toBe(null);
    expect(mocks.write).toHaveBeenLastCalledWith('todos', []);
    cleanup.forEach((fn) => fn());
  });

  it('快捷方式启动、拖拽改序及结束清理，写入异常不阻断局部排序', async () => {
    const cleanup = await boot(); const { 5: shortcuts } = mocks.widgets;
    mocks.write.mockRejectedValue(new Error('storage unavailable'));
    trigger(render(OverviewTab), shortcuts, 'onOpenApp', 'one.exe');
    const event = { preventDefault: vi.fn(), dataTransfer: { effectAllowed: '', dropEffect: '' } };
    trigger(render(OverviewTab), shortcuts, 'onDrop', event, 1);
    trigger(render(OverviewTab), shortcuts, 'onDragStart', event, 0);
    trigger(render(OverviewTab), shortcuts, 'onDragOver', event, 1);
    expect(value(render(OverviewTab), shortcuts, 'dragOverIndex')).toBe(1);
    trigger(render(OverviewTab), shortcuts, 'onDrop', event, 1);
    expect((value(render(OverviewTab), shortcuts, 'apps') as AppShortcut[]).map((app) => app.id)).toEqual([2, 1]);
    expect(mocks.write).toHaveBeenCalledWith('app-shortcuts', [apps[1], apps[0]]);
    trigger(render(OverviewTab), shortcuts, 'onDragEnd');
    expect(value(render(OverviewTab), shortcuts, 'dragOverIndex')).toBe(null);
    await vi.advanceTimersByTimeAsync(0);
    expect(mocks.openFile).toHaveBeenCalledWith('one.exe');
    cleanup.forEach((fn) => fn());
  });

  it.each(['integrated', 'standalone', 'legacy', 'failed'])('待办导航按窗口模式 %s 打开并处理失败', async (mode) => {
    const cleanup = await boot();
    mocks.read.mockImplementation((key) => {
      if (mode === 'failed') return Promise.reject(new Error('store offline'));
      if (key !== 'standalone-window-mode') return Promise.resolve('standalone');
      return Promise.resolve(mode === 'legacy' ? null : mode);
    });
    trigger(render(OverviewTab), mocks.widgets[7], 'onOpenTodoPage');
    await vi.advanceTimersByTimeAsync(0);
    if (mode === 'standalone' || mode === 'legacy') {
      expect(mocks.write).toHaveBeenCalledWith('standalone-window-active-tab', 'todo');
      expect(mocks.openWindow).toHaveBeenCalledOnce();
    } else { expect(mocks.select).toHaveBeenCalledWith('todo'); expect(mocks.max).toHaveBeenCalledOnce(); }
    cleanup.forEach((fn) => fn());
  });

  it('配置订阅选择世界时钟始终进入集成页，待办更新和卸载后事件边界', async () => {
    const cleanup = await boot();
    update('store:overview-layout', { left: 'worldClock', right: 'todo' });
    trigger(render(OverviewTab), mocks.widgets[9], 'onOpenWorldClockPage');
    expect(mocks.select).toHaveBeenCalledWith('worldClock');
    expect(mocks.openWindow).not.toHaveBeenCalled();
    update('store:todos', []);
    expect(value(render(OverviewTab), mocks.widgets[7], 'todos')).toEqual([]);
    cleanup.forEach((fn) => fn());
    update('store:todos', todos);
    expect(value(render(OverviewTab), mocks.widgets[7], 'todos')).toEqual([]);
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(2);
  });

  it('空存储待办回退旧localStorage', async () => {
    todos = []; mocks.localGet.mockReturnValue('[{"id":9,"text":"legacy","done":false,"createdAt":0}]');
    const cleanup = await boot();
    expect((value(render(OverviewTab), mocks.widgets[7], 'todos') as TodoItem[])[0].text).toBe('legacy');
    cleanup.forEach((fn) => fn());
  });

  it.each([
    { widget: 'album', index: 0, event: 'openAlbumPage', target: 'album' },
    { widget: 'breakReminder', index: 1, event: 'openBreakReminderPage', target: 'settings' },
    { widget: 'countdown', index: 2, event: 'openTargetPage', target: 'countdown' },
    { widget: 'urlFavorites', index: 8, event: 'openUrlFavoritesPage', target: 'urlFavorites' },
    { widget: 'alarm', index: 10, event: 'onOpenAlarmPage', target: 'alarm' },
  ] as const)('控件 $widget 导航到 $target', async ({ widget, index, event, target }) => {
    layout = { ...layout, left: widget };
    const cleanup = await boot();
    trigger(render(OverviewTab), mocks.widgets[index], event, ...(widget === 'countdown' ? [target] : []));
    await vi.advanceTimersByTimeAsync(0);
    expect(mocks.select).toHaveBeenCalledWith(target);
    expect(mocks.max).toHaveBeenCalledOnce();
    cleanup.forEach((fn) => fn());
  });

  it.each([true, false])('待办读取失败=%s 且旧JSON损坏时保留空状态', async (failed) => {
    todos = []; mocks.localGet.mockReturnValue('{invalid');
    if (failed) mocks.read.mockRejectedValue(new Error('store offline'));
    const cleanup = await boot();
    expect(value(render(OverviewTab), mocks.widgets[7], 'todos')).toEqual([]);
    cleanup.forEach((fn) => fn());
  });
});
