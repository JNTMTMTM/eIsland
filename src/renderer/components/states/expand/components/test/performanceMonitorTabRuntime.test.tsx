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
 * @file performanceMonitorTabRuntime.test.tsx
 * @description 性能监控真实配置监听、仪表盘内部渲染、可见性轮询与设置导航失败边界测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../maxExpand/components/calendar/hooks/test/calendarHookHarness';
import { byClass, elements, invoke, text } from '../../../test/tree';
import { PERFORMANCE_MONITOR_CHART_COLORS_STORE_KEY, PERFORMANCE_MONITOR_HARDWARE_SELECTION_STORE_KEY } from '../../../../../utils/performanceMonitorColors';
import type { ReactElement } from 'react';
const leaves = vi.hoisted(() => ({
  snapshot: vi.fn<(selection: unknown, hardware: boolean) => Promise<unknown>>(),
  read: vi.fn<(key: string) => Promise<unknown>>(),
  write: vi.fn<(key: string, data: unknown) => Promise<boolean>>(),
  subscribe: vi.fn<(callback: (channel: string, value: unknown) => void) => () => void>(),
  off: vi.fn(),
  preview: vi.fn<(channel: string, value: unknown) => Promise<boolean>>(),
  open: vi.fn<() => Promise<boolean>>(),
  max: vi.fn(),
  tab: vi.fn()
}));
vi.mock('../../../../../store/slices', () => ({
  default: () => ({
    setMaxExpand: leaves.max,
    setMaxExpandTab: leaves.tab
  })
}));
let Component: typeof import('../PerformanceMonitorTab').PerformanceMonitorTab;
let documentTarget: EventTarget & {
  hidden: boolean;
};
let settings: ((channel: string, value: unknown) => void) | undefined;
/** 返回合法性能快照，缺失数值与名称是原生不可用硬件的正常输入。
 * @returns 原生快照
 */
function snapshot() {
  return {
    timestamp: 1,
    host: {
      hostname: 'host',
      platform: 'win32',
      release: '11',
      arch: 'x64',
      uptimeSeconds: 61
    },
    cpu: {
      manufacturer: '',
      brand: '',
      cores: 8,
      physicalCores: 4,
      speedGhz: 3.1 as number | null,
      speedMaxGhz: null as number | null,
      loadPercent: NaN,
      temperatureCelsius: 0
    },
    memory: {
      totalBytes: 1024 ** 5,
      usedBytes: 15,
      availableBytes: 1024 ** 3,
      usagePercent: 12
    },
    gpu: {
      vendor: '',
      model: '',
      vramTotalMb: null as number | null,
      loadPercent: null as number | null,
      temperatureCelsius: null as number | null
    },
    disk: {
      totalBytes: 1024 ** 4,
      usedBytes: NaN,
      usagePercent: 0,
      temperatureCelsius: 0
    },
    hardwareOptions: {
      gpus: [],
      disks: []
    }
  };
}
/** 读取真实面板。
 * @returns 当前元素树
 */
function run(): ReactElement {
  return renderHook(Component);
}
/** 完成只读取配置的挂载。
 */
async function mount(): Promise<void> {
  run();
  flushHookEffects();
  await settleHook();
  run();
  flushHookEffects();
}
/** 从可操作的实际按钮开始监控并提交延迟采集。
 */
async function start(): Promise<void> {
  await mount();
  invoke(byClass(run(), 'pm-start-monitor-btn'), 'onClick');
  run();
  flushHookEffects();
  await vi.advanceTimersByTimeAsync(200);
  run();
  flushHookEffects();
}
/** 提取并执行真实私有仪表盘，避免只断言父节点转传属性。
 * @returns 实际仪表盘树
 */
function cards(): ReactElement[] {
  return elements(run()).filter((node) => typeof node.type === 'function' && node.type.name === 'MetricCard').map((node) => (node.type as (props: Record<string, unknown>) => ReactElement)(node.props));
}
beforeEach(async () => {
  unmountHook();
  resetHook();
  vi.resetModules();
  vi.resetAllMocks();
  vi.useFakeTimers();
  leaves.snapshot.mockResolvedValue(snapshot());
  leaves.read.mockResolvedValue(null);
  leaves.write.mockResolvedValue(true);
  leaves.preview.mockResolvedValue(true);
  leaves.open.mockResolvedValue(true);
  settings = undefined;
  leaves.subscribe.mockImplementation((callback) => {
    settings = callback;
    return leaves.off;
  });
  documentTarget = Object.assign(new EventTarget(), {
    hidden: false
  });
  vi.stubGlobal('document', documentTarget);
  vi.stubGlobal('window', Object.assign(new EventTarget(), {
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    api: {
      getPerformanceSnapshot: leaves.snapshot,
      storeRead: leaves.read,
      storeWrite: leaves.write,
      onSettingsChanged: leaves.subscribe,
      settingsPreview: leaves.preview,
      openStandaloneWindow: leaves.open
    }
  }));
  Component = (await import('../PerformanceMonitorTab')).PerformanceMonitorTab;
});
afterEach(() => {
  unmountHook();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('PerformanceMonitorTab runtime', () => {
  it('stop prevents native visibility and interval callbacks before passive cleanup and does not cache the old snapshot on immediate unmount', async () => {
    await start();
    invoke(byClass(run(), 'pm-monitor-toggle-btn'), 'onClick');
    documentTarget.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(2000);
    expect(leaves.snapshot).toHaveBeenCalledTimes(1);
    unmountHook();
    resetHook();
    expect(text(run())).not.toContain('performanceMonitor.labels.host');
    expect(cards()).toHaveLength(0);
  });
  it('stop before initial delay prevents that native callback from starting a request', async () => {
    await start();
    unmountHook();
    resetHook();
    run();
    flushHookEffects();
    invoke(byClass(run(), 'pm-monitor-toggle-btn'), 'onClick');
    await vi.advanceTimersByTimeAsync(200);
    expect(leaves.snapshot).toHaveBeenCalledTimes(1);
    expect(text(run())).toContain('performanceMonitor.startHint');
  });
  it.each(['resolve', 'reject'] as const)('stop immediately invalidates pending %s before passive cleanup and restart uses a fresh poll', async (outcome) => {
    await start();
    const pending = deferred<unknown>();
    leaves.snapshot.mockReturnValueOnce(pending.promise);
    await vi.advanceTimersByTimeAsync(2000);
    invoke(byClass(run(), 'pm-monitor-toggle-btn'), 'onClick');
    expect(text(run())).toContain('performanceMonitor.startHint');
    if (outcome === 'resolve') pending.resolve(snapshot());else pending.reject(new Error('late stop'));
    await settleHook();
    expect(text(run())).toContain('performanceMonitor.startHint');
    expect(text(run())).not.toContain('performanceMonitor.error');
    expect(elements(run()).some((node) => node.props.className === 'pm-dashboard')).toBe(false);
    flushHookEffects();
    expect(vi.getTimerCount()).toBe(0);
    invoke(byClass(run(), 'pm-start-monitor-btn'), 'onClick');
    run();
    flushHookEffects();
    await vi.advanceTimersByTimeAsync(200);
    expect(cards()).toHaveLength(4);
    expect(leaves.snapshot).toHaveBeenCalledTimes(3);
  });
  it('private metric cards clamp NaN/null to zero and native name/time/size fallbacks render', async () => {
    await start();
    const metrics = cards();
    expect(byClass(metrics[0], 'pm-progress-fill').props.style).toMatchObject({
      width: '0%'
    });
    expect(text(run())).toContain('1m');
    expect(text(metrics[1])).toContain('status.unavailable');
    expect(text(metrics[0])).toContain('3.10 GHz');
    expect(text(metrics[2])).toContain('1024 TB');
    expect(text(metrics[2])).toContain('15 B');
  });
  it('normal hardware temperature, VRAM and hour uptime format from fresh poll', async () => {
    const data = snapshot();
    data.host.uptimeSeconds = 3661;
    data.cpu.speedGhz = null;
    data.gpu = {
      vendor: 'Vendor',
      model: 'GPU',
      vramTotalMb: 2048,
      loadPercent: 50,
      temperatureCelsius: 36.8
    };
    leaves.snapshot.mockResolvedValue(data);
    await start();
    expect(text(run())).toContain('Vendor GPU');
    expect(text(run())).toContain('1h 1m');
    const metrics = cards();
    expect(text(metrics[1])).toContain('2048 MB VRAM');
    expect(text(metrics[1])).toContain('37℃');
    expect(text(metrics[0])).toContain('--');
  });
  it('snapshot layout cache survives new mount after successful ref effect and cleanup', async () => {
    await start();
    expect(cards()).toHaveLength(4);
    unmountHook();
    resetHook();
    run();
    expect(cards()).toHaveLength(4);
    flushHookEffects();
    await vi.advanceTimersByTimeAsync(200);
    expect(leaves.snapshot).toHaveBeenCalledTimes(2);
  });
  it('initial hidden document starts no poll until visible, repeated visibility avoids duplicate intervals', async () => {
    documentTarget.hidden = true;
    await start();
    expect(leaves.snapshot).not.toHaveBeenCalled();
    documentTarget.hidden = false;
    documentTarget.dispatchEvent(new Event('visibilitychange'));
    await settleHook();
    expect(leaves.snapshot).toHaveBeenCalledTimes(1);
    documentTarget.dispatchEvent(new Event('visibilitychange'));
    expect(vi.getTimerCount()).toBe(1);
    documentTarget.hidden = true;
    documentTarget.dispatchEvent(new Event('visibilitychange'));
    documentTarget.dispatchEvent(new Event('visibilitychange'));
    expect(vi.getTimerCount()).toBe(0);
  });
  it('unmount before initial delay and late rejected active request do not show failure or restart polling', async () => {
    await mount();
    invoke(byClass(run(), 'pm-start-monitor-btn'), 'onClick');
    run();
    flushHookEffects();
    unmountHook();
    expect(vi.getTimerCount()).toBe(0);
    resetHook();
    const pending = deferred<unknown>();
    leaves.snapshot.mockReturnValueOnce(pending.promise);
    run();
    flushHookEffects();
    await vi.advanceTimersByTimeAsync(200);
    unmountHook();
    pending.reject(new Error('late'));
    await settleHook();
    expect(text(run())).not.toContain('performanceMonitor.error');
    expect(vi.getTimerCount()).toBe(0);
  });
  it('configuration native failures are contained and stale reads/settings events after unmount ignored', async () => {
    leaves.read.mockRejectedValue(new Error('store'));
    await mount();
    expect(leaves.off).not.toHaveBeenCalled();
    unmountHook();
    resetHook();
    const pending = deferred<unknown>();
    leaves.read.mockReturnValue(pending.promise);
    run();
    flushHookEffects();
    const listener = settings;
    unmountHook();
    pending.resolve({
      cpu: '#ff0000'
    });
    listener?.(`store:${PERFORMANCE_MONITOR_CHART_COLORS_STORE_KEY}`, {
      cpu: '#ff0000'
    });
    await settleHook();
    expect(leaves.off).toHaveBeenCalledTimes(2);
  });
  it('real settings normalization updates colors/hardware and ignores unrelated channels', async () => {
    await start();
    settings?.('unrelated', {});
    settings?.(`store:${PERFORMANCE_MONITOR_CHART_COLORS_STORE_KEY}`, {
      cpu: '#ff0000',
      gpu: '#00ff00'
    });
    run();
    flushHookEffects();
    expect(byClass(cards()[0], 'pm-progress-fill').props.style).toMatchObject({
      background: '#ff0000'
    });
    settings?.(`store:${PERFORMANCE_MONITOR_HARDWARE_SELECTION_STORE_KEY}`, {
      gpuIndex: 0,
      diskIndex: 0
    });
    run();
    flushHookEffects();
    await vi.advanceTimersByTimeAsync(200);
    expect(leaves.snapshot).toHaveBeenCalledTimes(2);
  });
  it.each([null, []])('hidden layout %j uses defaults and preview failure stays contained', async (layout) => {
    leaves.read.mockImplementation((key) => Promise.resolve(key === 'expand-nav-layout' ? layout : 'integrated'));
    leaves.preview.mockRejectedValue(new Error('preview'));
    await mount();
    invoke(elements(run()).filter((node) => node.type === 'button')[1], 'onClick');
    await settleHook();
    expect(leaves.write).toHaveBeenCalledWith('expand-nav-layout', [{
      id: 'overview',
      visible: true
    }, {
      id: 'song',
      visible: true
    }, {
      id: 'tools',
      visible: true
    }, {
      id: 'performanceMonitor',
      visible: false
    }]);
    expect(leaves.max).toHaveBeenCalledTimes(1);
  });
  it('hidden layout normalizes invalid item types and keeps overview visible despite stored false', async () => {
    leaves.read.mockImplementation((key) => Promise.resolve(key === 'expand-nav-layout' ? [null, 1, {
      id: 3
    }, {
      id: 'unknown'
    }, {
      id: 'overview',
      visible: false
    }, {
      id: 'song',
      visible: false
    }, {
      id: 'tools',
      visible: true
    }, {
      id: 'performanceMonitor',
      visible: true
    }] : 'integrated'));
    await mount();
    invoke(elements(run()).filter((node) => node.type === 'button')[1], 'onClick');
    await settleHook();
    expect(leaves.write).toHaveBeenCalledWith('expand-nav-layout', [{
      id: 'overview',
      visible: true
    }, {
      id: 'song',
      visible: false
    }, {
      id: 'tools',
      visible: true
    }, {
      id: 'performanceMonitor',
      visible: false
    }]);
  });
  it.each(['integrated', 'standalone', 'legacy', 'legacy-failed', 'read-failed', 'write-failed', 'open-failed'] as const)('hardware settings native mode %s forwards route and contains failures', async (mode) => {
    await start();
    leaves.read.mockImplementation((key) => {
      if (mode === 'read-failed') return Promise.reject(new Error('read'));
      if (key === 'standalone-window-mode') {
        if (mode === 'legacy' || mode === 'legacy-failed') return Promise.resolve('unknown');
        return Promise.resolve(mode === 'open-failed' ? 'standalone' : mode);
      }
      if (key === 'countdown-window-mode') {
        if (mode === 'legacy-failed') return Promise.reject(new Error('legacy'));
        return Promise.resolve('standalone');
      }
      return Promise.resolve(null);
    });
    if (mode === 'write-failed') leaves.write.mockRejectedValue(new Error('write'));
    if (mode === 'open-failed') leaves.open.mockRejectedValue(new Error('open'));
    invoke(byClass(run(), 'pm-hardware-settings-link'), 'onClick');
    await settleHook();
    await settleHook();
    expect(leaves.write).toHaveBeenCalledWith('settings-open-tab', 'performance-monitor');
    if (mode === 'standalone' || mode === 'legacy' || mode === 'open-failed') {
      expect(leaves.open).toHaveBeenCalledTimes(1);
      expect(leaves.max).not.toHaveBeenCalled();
    } else {
      expect(leaves.tab).toHaveBeenCalledWith('settings');
      expect(leaves.max).toHaveBeenCalledTimes(1);
    }
  });
  it('hidden-page legacy/read-open failures are contained while integrated fallback still opens settings', async () => {
    leaves.read.mockImplementation((key) => key === 'countdown-window-mode' ? Promise.reject(new Error('legacy')) : Promise.resolve(null));
    await mount();
    invoke(elements(run()).filter((node) => node.type === 'button')[1], 'onClick');
    await settleHook();
    expect(leaves.max).toHaveBeenCalledTimes(1);
    leaves.max.mockClear();
    leaves.read.mockResolvedValue('standalone');
    leaves.open.mockRejectedValue(new Error('open'));
    invoke(elements(run()).filter((node) => node.type === 'button')[1], 'onClick');
    await settleHook();
    expect(leaves.open).toHaveBeenCalledTimes(1);
    expect(leaves.max).not.toHaveBeenCalled();
  });
});
