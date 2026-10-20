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
 * @file performanceMonitorWidget.test.tsx
 * @description PerformanceMonitorWidget 自动轮询、取整去重、可见性暂停、硬件配置同步与指标网格渲染测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../../../maxExpand/components/calendar/hooks/test/calendarHookHarness';
import { byClass, elements, invoke, text } from '../../../../../../test/tree';
import { PERFORMANCE_MONITOR_CHART_COLORS_STORE_KEY, PERFORMANCE_MONITOR_HARDWARE_SELECTION_STORE_KEY } from '../../../../../../../../utils/performanceMonitorColors';
import type { ReactElement } from 'react';
import type { PerformanceWidgetMetrics } from '../../PerformanceMetricGrid';

const leaves = vi.hoisted(() => ({
  snapshot: vi.fn<(selection: unknown, hardware: boolean) => Promise<unknown>>(),
  read: vi.fn<(key: string) => Promise<unknown>>(),
  subscribe: vi.fn<(callback: (channel: string, value: unknown) => void) => () => void>(),
  off: vi.fn(),
  setExpandTab: vi.fn<(tab: string) => void>(),
}));
vi.mock('../../../../../../../../store/slices', () => ({
  default: (selector: (store: { setExpandTab: (tab: string) => void }) => unknown) => selector({ setExpandTab: leaves.setExpandTab }),
}));
let Widget: typeof import('../PerformanceMonitorWidget').PerformanceMonitorWidget;
let documentTarget: EventTarget & { hidden: boolean };
let settings: ((channel: string, value: unknown) => void) | undefined;

/**
 * 返回原生快照，GPU 缺失、温度为 0 与越界占用是原生插件的正常输入。
 * @param cpuLoad - CPU 占用率
 * @returns 原生快照
 */
function snapshot(cpuLoad = 31.6): unknown {
  return {
    cpu: { loadPercent: cpuLoad, temperatureCelsius: 55.4 },
    gpu: null,
    memory: { usagePercent: 61.2 },
    disk: { usagePercent: 120, temperatureCelsius: 0 },
  };
}

/**
 * 渲染真实小组件。
 * @returns 当前元素树
 */
function run(): ReactElement {
  return renderHook(Widget);
}

/** 完成配置读取与依赖变化后的挂载。 */
async function mount(): Promise<void> {
  run();
  flushHookEffects();
  await settleHook();
  run();
  flushHookEffects();
}

/**
 * 推进计时器并提交采集结果。
 * @param ms - 推进毫秒数
 */
async function advance(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
  await settleHook();
  run();
  flushHookEffects();
}

/**
 * 读取传给指标网格的属性。
 * @returns 网格属性，未渲染网格时为 undefined
 */
function grid(): { metrics: PerformanceWidgetMetrics; colors: Record<string, string> } | undefined {
  const node = elements(run()).find((item) => typeof item.type === 'function' && item.type.name === 'PerformanceMetricGrid');
  return node?.props as { metrics: PerformanceWidgetMetrics; colors: Record<string, string> } | undefined;
}

/**
 * 判断当前渲染树是否包含指定子组件。
 * @param name - 子组件函数名
 * @returns 是否包含
 */
function renders(name: string): boolean {
  return elements(run()).some((item) => typeof item.type === 'function' && item.type.name === name);
}

beforeEach(async () => {
  unmountHook();
  resetHook();
  vi.resetModules();
  vi.resetAllMocks();
  vi.useFakeTimers();
  leaves.snapshot.mockResolvedValue(snapshot());
  leaves.read.mockResolvedValue(null);
  settings = undefined;
  leaves.subscribe.mockImplementation((callback) => {
    settings = callback;
    return leaves.off;
  });
  documentTarget = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal('document', documentTarget);
  vi.stubGlobal('window', Object.assign(new EventTarget(), {
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    api: {
      getPerformanceSnapshot: leaves.snapshot,
      storeRead: leaves.read,
      onSettingsChanged: leaves.subscribe,
    },
  }));
  Widget = (await import('../PerformanceMonitorWidget')).PerformanceMonitorWidget;
});

afterEach(() => {
  unmountHook();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('PerformanceMonitorWidget', () => {
  it('waits for the expand delay, then polls without hardware options and rounds metrics', async () => {
    await mount();
    expect(renders('PerformanceMetricSkeleton')).toBe(true);
    expect(leaves.snapshot).not.toHaveBeenCalled();
    await advance(200);
    expect(leaves.snapshot).toHaveBeenCalledWith({ cpu: 'all', gpu: 'auto', disk: 'all' }, false);
    expect(grid()?.metrics).toEqual({
      cpu: { percent: 32, temperature: 55 },
      gpu: { percent: null, temperature: null },
      memory: { percent: 61, temperature: null },
      disk: { percent: 100, temperature: null },
    });
    await advance(2000);
    expect(leaves.snapshot).toHaveBeenCalledTimes(2);
  });

  it('reuses unchanged rounded metrics and skips polls while a request is pending', async () => {
    await mount();
    await advance(200);
    const first = grid()?.metrics;
    leaves.snapshot.mockResolvedValueOnce(snapshot(32.4));
    await advance(2000);
    expect(grid()?.metrics).toBe(first);
    const pending = deferred<unknown>();
    leaves.snapshot.mockReturnValueOnce(pending.promise);
    await advance(2000);
    await advance(4000);
    expect(leaves.snapshot).toHaveBeenCalledTimes(3);
    pending.resolve(snapshot(80));
    await advance(0);
    expect(grid()?.metrics.cpu.percent).toBe(80);
  });

  it('pauses polling while the window is hidden and resumes when visible', async () => {
    await mount();
    await advance(200);
    documentTarget.hidden = true;
    documentTarget.dispatchEvent(new Event('visibilitychange'));
    await advance(6000);
    expect(leaves.snapshot).toHaveBeenCalledTimes(1);
    documentTarget.hidden = false;
    documentTarget.dispatchEvent(new Event('visibilitychange'));
    await advance(0);
    expect(leaves.snapshot).toHaveBeenCalledTimes(2);
  });

  it('shows the error state on failure and stops timers, listeners and subscriptions after unmount', async () => {
    leaves.snapshot.mockRejectedValue(new Error('native'));
    await mount();
    await advance(200);
    expect(text(run())).toContain('expanded.performanceMonitor.error');
    expect(renders('PerformanceMetricSkeleton')).toBe(false);
    unmountHook();
    documentTarget.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(6000);
    expect(leaves.snapshot).toHaveBeenCalledTimes(1);
    expect(leaves.off).toHaveBeenCalled();
  });

  it('applies stored hardware selection and colors, then restarts polling on settings changes', async () => {
    leaves.read.mockImplementation((key) => Promise.resolve(key === PERFORMANCE_MONITOR_HARDWARE_SELECTION_STORE_KEY
      ? { cpu: 'cpu:1', gpu: 'gpu:0', disk: 'fs:0' }
      : { cpu: '#111111' }));
    await mount();
    await advance(200);
    expect(leaves.snapshot).toHaveBeenLastCalledWith({ cpu: 'cpu:1', gpu: 'gpu:0', disk: 'fs:0' }, false);
    expect(grid()?.colors).toMatchObject({ cpu: '#111111', gpu: '#93c5fd' });
    settings?.('store:unrelated', { cpu: 'cpu:9' });
    settings?.(`store:${PERFORMANCE_MONITOR_HARDWARE_SELECTION_STORE_KEY}`, { cpu: 'cpu:2' });
    settings?.(`store:${PERFORMANCE_MONITOR_CHART_COLORS_STORE_KEY}`, { disk: '#222222' });
    run();
    flushHookEffects();
    await advance(200);
    expect(leaves.snapshot).toHaveBeenLastCalledWith({ cpu: 'cpu:2', gpu: 'auto', disk: 'all' }, false);
    expect(grid()?.colors).toMatchObject({ cpu: '#5eead4', disk: '#222222' });
  });

  it('shows the last metrics immediately after remount', async () => {
    await mount();
    await advance(200);
    unmountHook();
    resetHook();
    expect(grid()?.metrics.cpu.percent).toBe(32);
  });

  it('replaces cached readings with an error after a failed refresh, then recovers', async () => {
    await mount();
    await advance(200);
    expect(grid()).toBeDefined();
    leaves.snapshot.mockRejectedValueOnce(new Error('refresh failed'));
    await advance(2000);
    expect(grid()).toBeUndefined();
    expect(text(run())).toContain('expanded.performanceMonitor.error');
    await advance(2000);
    expect(grid()).toBeDefined();
    expect(text(run())).not.toContain('expanded.performanceMonitor.error');
  });

  it('ignores persisted values overtaken by settings events independently for each key', async () => {
    const colors = deferred<unknown>();
    const hardware = deferred<unknown>();
    leaves.read.mockImplementation((key) => key === PERFORMANCE_MONITOR_CHART_COLORS_STORE_KEY ? colors.promise : hardware.promise);
    await mount();
    settings?.(`store:${PERFORMANCE_MONITOR_HARDWARE_SELECTION_STORE_KEY}`, { cpu: 'cpu:2' });
    settings?.(`store:${PERFORMANCE_MONITOR_CHART_COLORS_STORE_KEY}`, { cpu: '#222222' });
    colors.resolve({ cpu: '#111111' });
    hardware.resolve({ cpu: 'cpu:1' });
    await advance(200);
    await advance(200);
    expect(leaves.snapshot).toHaveBeenLastCalledWith({ cpu: 'cpu:2', gpu: 'auto', disk: 'all' }, false);
    expect(grid()?.colors.cpu).toBe('#222222');
  });

  it('still applies a persisted setting when only the other key has received an event', async () => {
    const colors = deferred<unknown>();
    leaves.read.mockImplementation((key) => key === PERFORMANCE_MONITOR_CHART_COLORS_STORE_KEY ? colors.promise : Promise.resolve(null));
    await mount();
    settings?.(`store:${PERFORMANCE_MONITOR_HARDWARE_SELECTION_STORE_KEY}`, { disk: 'fs:1' });
    colors.resolve({ cpu: '#123456' });
    await advance(200);
    await advance(200);
    expect(grid()?.colors.cpu).toBe('#123456');
    expect(leaves.snapshot).toHaveBeenLastCalledWith({ cpu: 'all', gpu: 'auto', disk: 'fs:1' }, false);
  });

  it('opens the expand performance monitor tab from the title by click or keyboard', async () => {
    await mount();
    const title = byClass(run(), 'ov-dash-widget-title--link');
    expect(title.props).toMatchObject({ role: 'button', tabIndex: 0 });
    invoke(title, 'onClick');
    const preventDefault = vi.fn();
    invoke(title, 'onKeyDown', { preventDefault, key: 'Tab' });
    invoke(title, 'onKeyDown', { preventDefault, key: 'Enter' });
    invoke(title, 'onKeyDown', { preventDefault, key: ' ' });
    expect(leaves.setExpandTab.mock.calls).toEqual([['performanceMonitor'], ['performanceMonitor'], ['performanceMonitor']]);
    expect(preventDefault).toHaveBeenCalledTimes(2);
  });

  it('renders a four-cell loading skeleton that announces loading', async () => {
    const { PerformanceMetricSkeleton } = await import('../../PerformanceMetricGrid');
    const tree = PerformanceMetricSkeleton();
    expect(tree.props).toMatchObject({ role: 'status', 'aria-busy': 'true', 'aria-label': 'expanded.performanceMonitor.loading' });
    expect(elements(tree).filter((node) => node.props.className === 'ov-dash-performance-item ov-dash-performance-skeleton')).toHaveLength(4);
    expect(text(tree)).toBe('');
  });

  it('renders labels, percentages, available temperatures and scaled bars', async () => {
    const { PerformanceMetricGrid } = await import('../../PerformanceMetricGrid');
    const tree = PerformanceMetricGrid({
      metrics: {
        cpu: { percent: 32, temperature: 55 },
        gpu: { percent: null, temperature: null },
        memory: { percent: 61, temperature: null },
        disk: { percent: 100, temperature: 38 },
      },
      colors: { cpu: '#000001', gpu: '#000002', memory: '#000003', disk: '#000004' },
    });
    const byClassName = (className: string) => elements(tree).filter((node) => node.props.className === className);
    expect(byClassName('ov-dash-performance-label').map(text)).toEqual([
      'expanded.performanceMonitor.labels.cpu',
      'expanded.performanceMonitor.labels.gpu',
      'expanded.performanceMonitor.labels.memory',
      'expanded.performanceMonitor.labels.disk',
    ]);
    expect(byClassName('ov-dash-performance-value').map(text)).toEqual(['32%', '--', '61%', '100%']);
    expect(byClassName('ov-dash-performance-temp').map(text)).toEqual(['55℃', '38℃']);
    expect(byClassName('ov-dash-performance-fill').map((node) => node.props.style)).toEqual([
      { background: '#000001', transform: 'scaleX(0.32)' },
      { background: '#000002', transform: 'scaleX(0)' },
      { background: '#000003', transform: 'scaleX(0.61)' },
      { background: '#000004', transform: 'scaleX(1)' },
    ]);
  });
});
