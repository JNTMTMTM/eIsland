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
 * @file performanceMonitorTab.test.tsx
 * @description 性能监控启动、延迟轮询、异常、硬件数据边界、隐藏导航和清理测试。
 * @author 鸡哥
 */

import { Children, type ReactElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushEffects, nodes, render, text, value } from '../../../maxExpand/test/componentHarness';
import { fire } from '../../../maxExpand/components/tools/components/test/toolTestEvents';

const mocks = vi.hoisted(() => ({
  snapshot: vi.fn<(selection: unknown, includeHardware: boolean) => Promise<unknown>>(),
  read: vi.fn<(key: string) => Promise<unknown>>(), write: vi.fn<(key: string, data: unknown) => Promise<boolean>>(),
  subscribe: vi.fn<(callback: (channel: string, data: unknown) => void) => () => void>(),
  unsubscribe: vi.fn(), preview: vi.fn<() => Promise<boolean>>(), open: vi.fn<() => Promise<boolean>>(), max: vi.fn(), select: vi.fn(),
}));
vi.mock('../../../../../store/slices', () => ({ default: () => ({ setMaxExpand: mocks.max, setMaxExpandTab: mocks.select }) }));

/**
 * 构造含缺失与越界硬件字段的接口结果。
 * @returns 系统性能快照。
 */
function snapshot() {
  return { timestamp: 1, host: { hostname: 'host', platform: 'win32', release: '11', arch: 'x64', uptimeSeconds: 90061 },
    cpu: { manufacturer: 'Vendor', brand: 'CPU', cores: 8, physicalCores: 4, speedGhz: 3.1, speedMaxGhz: 4.2, loadPercent: 123, temperatureCelsius: 36.8 },
    memory: { totalBytes: 1024 ** 3, usedBytes: 1024 ** 2, availableBytes: 1024 ** 3 - 1024 ** 2, usagePercent: -5 },
    gpu: null, disk: { totalBytes: 0, usedBytes: 0, usagePercent: Number.NaN, temperatureCelsius: null },
    hardwareOptions: { gpus: [], disks: [] } };
}

/**
 * 执行启动及延迟轮询。
 * @param component - 真实性能监控组件。
 * @returns 当前生命周期清理函数。
 */
async function start(component: unknown): Promise<(() => void)[]> {
  fire(render(component), '.pm-start-monitor-btn', 'onClick');
  const tree = render(component); expect(tree).toBeDefined();
  const cleanup = flushEffects();
  await vi.advanceTimersByTimeAsync(200);
  return cleanup;
}

/**
 * 提取主组件生成的真实仪表盘组件元素。
 * @param tree - 主组件元素树。
 * @returns 私有仪表盘组件及输入。
 */
function metrics(tree: ReactNode): ReactElement<Record<string, unknown>>[] {
  const [{ props }] = nodes(tree, '.pm-metrics-grid');
  return Children.toArray(props.children as ReactNode) as ReactElement<Record<string, unknown>>[];
}

describe('PerformanceMonitorTab', () => {
  let component: unknown;
  beforeEach(async () => {
    vi.resetModules(); vi.useFakeTimers();
    mocks.snapshot.mockResolvedValue(snapshot()); mocks.read.mockResolvedValue(null); mocks.write.mockResolvedValue(true);
    mocks.subscribe.mockReturnValue(mocks.unsubscribe); mocks.preview.mockResolvedValue(true); mocks.open.mockResolvedValue(true);
    vi.stubGlobal('document', Object.assign(new EventTarget(), { hidden: false }));
    vi.stubGlobal('window', Object.assign(new EventTarget(), { api: { getPerformanceSnapshot: mocks.snapshot, storeRead: mocks.read,
      storeWrite: mocks.write, onSettingsChanged: mocks.subscribe, settingsPreview: mocks.preview, openStandaloneWindow: mocks.open },
    setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout, setInterval: globalThis.setInterval, clearInterval: globalThis.clearInterval }));
    component = (await import('../PerformanceMonitorTab')).PerformanceMonitorTab;
  });
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('首次进入不自动采集，启动后延迟200ms加载，停止清空快照', async () => {
    let tree = render(component);
    expect(text(tree)).toContain('startHint'); expect(mocks.snapshot).not.toHaveBeenCalled();
    const cleanup = await start(component);
    expect(mocks.snapshot).toHaveBeenCalledOnce();
    tree = render(component);
    expect(metrics(tree)).toHaveLength(4); expect(text(tree)).toContain('host'); expect(text(tree)).toContain('1d 1h');
    fire(tree, '.pm-monitor-toggle-btn', 'onClick');
    expect(text(render(component))).toContain('startHint');
    cleanup.forEach((fn) => fn()); expect(vi.getTimerCount()).toBe(0);
  });

  it('硬件百分比、温度及缺失值格式化并限制仪表盘范围', async () => {
    await start(component);
    const cards = metrics(render(component));
    expect(cards.map((card) => card.props.valueText)).toEqual(['100%', '--', '0%', '--']);
    expect(cards[0].props.temperature).toBe('37℃');
    expect(cards[0].props.detail).toContain('3.10 / 4.20 GHz');
    const cpu = render(cards[0].type, cards[0].props);
    expect(value(cpu, '.pm-progress-fill', 'style')).toEqual(expect.objectContaining({ width: '100%' }));
    expect(text(render(component))).toContain('status.noGpu');
  });

  it('采集失败显示错误，卸载后的迟到响应不更新界面', async () => {
    mocks.snapshot.mockRejectedValue(new Error('hardware offline'));
    const cleanup = await start(component);
    expect(text(render(component))).toContain('performanceMonitor.error');
    cleanup.forEach((fn) => fn());
  });

  it('卸载后的迟到采集不更新界面', async () => {
    const pending = Promise.withResolvers<unknown>(); mocks.snapshot.mockReturnValue(pending.promise);
    const cleanup = await start(component);
    cleanup.forEach((fn) => fn());
    pending.resolve(snapshot()); await vi.advanceTimersByTimeAsync(0);
    expect(nodes(render(component), '.pm-metrics-grid')).toHaveLength(0);
  });

  it('轮询等待前一请求，文档隐藏停止轮询，恢复重新采集并清理', async () => {
    const pending = Promise.withResolvers<unknown>();
    mocks.snapshot.mockReturnValueOnce(pending.promise);
    const cleanup = await start(component);
    await vi.advanceTimersByTimeAsync(4000);
    expect(mocks.snapshot).toHaveBeenCalledOnce();
    pending.resolve(snapshot()); await vi.advanceTimersByTimeAsync(0);
    Object.assign(document, { hidden: true }); document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(4000); expect(mocks.snapshot).toHaveBeenCalledOnce();
    Object.assign(document, { hidden: false }); document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0); expect(mocks.snapshot).toHaveBeenCalledTimes(2);
    cleanup.forEach((fn) => fn()); expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['integrated', 'standalone', 'legacy', 'failed'])('隐藏页面后更新导航并进入布局设置：%s', async (mode) => {
    mocks.read.mockImplementation((key) => {
      if (mode === 'failed') return Promise.reject(new Error('store unavailable'));
      if (key === 'expand-nav-layout') return Promise.resolve([{ id: 'overview', visible: false }, { id: 'song', visible: false }, { id: 'unknown', visible: true }]);
      if (key === 'standalone-window-mode') return Promise.resolve(mode === 'legacy' ? null : mode);
      if (key === 'countdown-window-mode') return Promise.resolve('standalone');
      return Promise.resolve(null);
    });
    fire(render(component), '.pm-start-monitor-btn', 'onClick', 1);
    await vi.advanceTimersByTimeAsync(0);
    expect(mocks.write).toHaveBeenCalledWith('settings-open-tab', 'expand-layout');
    if (mode === 'standalone' || mode === 'legacy') {
      expect(mocks.open).toHaveBeenCalledOnce();
      expect(mocks.write).toHaveBeenCalledWith('standalone-window-active-tab', 'settings');
    } else { expect(mocks.select).toHaveBeenCalledWith('settings'); expect(mocks.max).toHaveBeenCalledOnce(); }
    if (mode !== 'failed') {expect(mocks.write).toHaveBeenCalledWith('expand-nav-layout', expect.arrayContaining([
      { id: 'overview', visible: true }, { id: 'performanceMonitor', visible: false }, { id: 'song', visible: false },
    ]));}
  });

  it('有数据时硬件设置链接进入已存在的设置子页', async () => {
    const cleanup = await start(component);
    fire(render(component), '.pm-hardware-settings-link', 'onClick');
    await vi.advanceTimersByTimeAsync(0);
    expect(mocks.write).toHaveBeenCalledWith('settings-open-tab', 'performance-monitor');
    expect(mocks.select).toHaveBeenCalledWith('settings');
    cleanup.forEach((fn) => fn());
  });
});
