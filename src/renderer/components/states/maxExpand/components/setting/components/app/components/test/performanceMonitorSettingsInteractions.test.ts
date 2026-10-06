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
 * @file performanceMonitorSettingsInteractions.test.ts
 * @description 性能设置实际模块缓存、异步读取、颜色提交及硬件菜单事件回归。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { elementProps, elements, findElement, hookMocks, invoke, textContent } from '../../../../../../../../test/elementHarness';
import { lifecycleHooks, renderWithHooks, resetLifecycle, runEffects, unmountHooks } from './themeHookHarness';
import type { ReactElement } from 'react';
import type { PerformanceMonitorHardwareOptions, PerformanceMonitorHardwareSelection } from '../../../../../../../../../utils/performanceMonitorColors';
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));
const options: PerformanceMonitorHardwareOptions = {
  cpu: [{
    id: 'all',
    label: 'All CPU'
  }, {
    id: 'cpu-1',
    label: 'CPU One'
  }],
  gpu: [{
    id: 'auto',
    label: 'Auto GPU'
  }, {
    id: 'gpu-1',
    label: 'GPU One'
  }],
  disk: [{
    id: 'all',
    label: 'All Disks'
  }, {
    id: 'disk-1',
    label: 'Disk One'
  }]
};
const api = {
  storeRead: vi.fn<(key: string) => Promise<unknown>>(),
  storeWrite: vi.fn<(key: string, value: unknown) => Promise<void>>(),
  settingsPreview: vi.fn<(key: string, value: unknown) => Promise<void>>(),
  getPerformanceSnapshot: vi.fn<(selection: PerformanceMonitorHardwareSelection) => Promise<{
    hardwareOptions: PerformanceMonitorHardwareOptions;
  }>>()
};
const addEventListener = vi.fn<(name: string, callback: (event: {
  target: Node;
}) => void) => void>();
const removeEventListener = vi.fn<(name: string, callback: (event: {
  target: Node;
}) => void) => void>();
let Component: typeof import('../PerformanceMonitorSettingsPage')['PerformanceMonitorSettingsPage'];
interface DropdownProps {
  options: {
    id: string;
    label: string;
  }[];
  value: string;
  onChange: (value: string) => void;
  resolveLabel: (id: string, label: string) => string;
}
/**
 * 重绘真实设置组件。
 * @returns 实际元素树。
 */
function render() {
  return renderWithHooks(() => Component());
}
/**
 * 收集父组件实际创建的硬件菜单。
 * @param tree - 实际父树。
 * @returns 实际菜单元素集合。
 */
function dropdowns(tree: ReactElement) {
  return elements(tree).filter((node) => 'resolveLabel' in elementProps(node));
}
/**
 * 等待读取、缓存和拒绝处理队列。
 * @returns 当前异步服务完成。
 */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
/**
 * 按父组件真实 props 执行私有菜单。
 * @param element - 父组件创建的菜单元素。
 * @returns 菜单真实重绘函数。
 */
function mountDropdown(element: ReactElement) {
  const component = element.type as (props: DropdownProps) => ReactElement;
  const props = elementProps(element) as unknown as DropdownProps;
  resetLifecycle();
  return () => renderWithHooks(() => component(props));
}
beforeEach(async () => {
  resetLifecycle();
  vi.resetAllMocks();
  vi.resetModules();
  vi.doMock('react', async (original) => ({
    ...(await original<typeof import('react')>()),
    ...hookMocks,
    ...lifecycleHooks
  }));
  Component = (await import('../PerformanceMonitorSettingsPage')).PerformanceMonitorSettingsPage;
  api.storeRead.mockResolvedValue(undefined);
  api.storeWrite.mockResolvedValue(undefined);
  api.settingsPreview.mockResolvedValue(undefined);
  api.getPerformanceSnapshot.mockResolvedValue({
    hardwareOptions: options
  });
  vi.stubGlobal('window', {
    api
  });
  vi.stubGlobal('document', {
    addEventListener,
    removeEventListener
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.doUnmock('react');
});
describe('实际配置与模块缓存生命周期', () => {
  it('规范化保存配置，真实快照更新三个菜单', async () => {
    api.storeRead.mockImplementation((key) => Promise.resolve(key === 'performance-monitor-chart-colors' ? {
      cpu: '#123456',
      gpu: 'bad'
    } : {
      cpu: 'cpu-1',
      gpu: 'gpu-1',
      disk: 'disk-1'
    }));
    render();
    runEffects();
    await settle();
    expect(elements(render()).filter((node) => elementProps(node).type === 'color').map((node) => elementProps(node).value)).toEqual(['#123456', '#93c5fd', '#c084fc', '#fbbf24']);
    expect(dropdowns(render()).map((node) => elementProps(node).value)).toEqual(['cpu-1', 'gpu-1', 'disk-1']);
    expect(api.getPerformanceSnapshot).toHaveBeenCalledWith({
      cpu: 'cpu-1',
      gpu: 'gpu-1',
      disk: 'disk-1'
    });
    expect(dropdowns(render()).map((node) => (elementProps(node).options as unknown[]).length)).toEqual([2, 2, 2]);
  });
  it('存储拒绝使用默认硬件并继续加载快照', async () => {
    api.storeRead.mockRejectedValue(new Error('offline'));
    render();
    runEffects();
    await settle();
    expect(api.getPerformanceSnapshot).toHaveBeenCalledWith({
      cpu: 'all',
      gpu: 'auto',
      disk: 'all'
    });
    expect(dropdowns(render()).map((node) => (elementProps(node).options as unknown[]).length)).toEqual([2, 2, 2]);
  });
  it('快照拒绝保持默认硬件，再挂载重新请求', async () => {
    api.getPerformanceSnapshot.mockRejectedValueOnce(new Error('hardware'));
    render();
    runEffects();
    await settle();
    expect(dropdowns(render()).map((node) => (elementProps(node).options as unknown[]).length)).toEqual([1, 1, 1]);
    resetLifecycle();
    render();
    runEffects();
    await settle();
    expect(api.getPerformanceSnapshot).toHaveBeenCalledTimes(2);
  });
  it('并发挂载共享待定快照，完成后的再挂载使用缓存', async () => {
    let resolve: (value: {
      hardwareOptions: PerformanceMonitorHardwareOptions;
    }) => void = () => undefined;
    api.getPerformanceSnapshot.mockReturnValue(new Promise((done) => {
      resolve = done;
    }));
    render();
    runEffects();
    await settle();
    resetLifecycle();
    render();
    runEffects();
    await settle();
    expect(api.getPerformanceSnapshot).toHaveBeenCalledOnce();
    resolve({
      hardwareOptions: options
    });
    await settle();
    resetLifecycle();
    expect(dropdowns(render()).map((node) => (elementProps(node).options as unknown[]).length)).toEqual([2, 2, 2]);
    runEffects();
    await settle();
    expect(api.getPerformanceSnapshot).toHaveBeenCalledOnce();
  });
  it.each([true, false])('卸载后迟到存储拒绝=%s不启动硬件读取', async (failure) => {
    const pending = new Map<string, {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
    }>();
    api.storeRead.mockImplementation((key) => new Promise((resolve, reject) => {
      pending.set(key, {
        resolve,
        reject
      });
    }));
    render();
    runEffects();
    unmountHooks();
    pending.forEach((operation) => {
      if (failure) operation.reject(new Error('offline'));else {operation.resolve({
        cpu: '#123456'
      });}
    });
    await settle();
    expect(api.getPerformanceSnapshot).not.toHaveBeenCalled();
    expect(elements(render()).filter((node) => elementProps(node).type === 'color').map((node) => elementProps(node).value)).toEqual(['#5eead4', '#93c5fd', '#c084fc', '#fbbf24']);
  });
  it('快照等待中卸载后结果不替换已卸载组件菜单', async () => {
    let resolve: (value: {
      hardwareOptions: PerformanceMonitorHardwareOptions;
    }) => void = () => undefined;
    api.getPerformanceSnapshot.mockReturnValue(new Promise((done) => {
      resolve = done;
    }));
    render();
    runEffects();
    await settle();
    unmountHooks();
    resolve({
      hardwareOptions: options
    });
    await settle();
    expect(dropdowns(render()).map((node) => (elementProps(node).options as unknown[]).length)).toEqual([1, 1, 1]);
  });
});
describe('真实颜色与硬件提交', () => {
  it.each([true, false])('持久化失败=%s时颜色与硬件仍本地更新', async (failure) => {
    if (failure) {
      api.storeWrite.mockRejectedValue(new Error('offline'));
      api.settingsPreview.mockRejectedValue(new Error('offline'));
    }
    const colors = elements(render()).filter((node) => elementProps(node).type === 'color');
    invoke(colors[0], 'onChange', {
      target: {
        value: 'invalid'
      }
    });
    expect(api.storeWrite).not.toHaveBeenCalled();
    colors.forEach((node, index) => {
      void node;
      const current = elements(render()).filter((node) => elementProps(node).type === 'color')[index];
      invoke(current, 'onChange', {
        target: {
          value: '#112233'
        }
      });
    });
    expect(elements(render()).filter((node) => elementProps(node).type === 'color').map((node) => elementProps(node).value)).toEqual(['#112233', '#112233', '#112233', '#112233']);
    const selects = dropdowns(render());
    selects.forEach((node, index) => {
      void node;
      invoke(dropdowns(render())[index], 'onChange', ['cpu-1', 'gpu-1', 'disk-1'][index]);
    });
    expect(dropdowns(render()).map((node) => elementProps(node).value)).toEqual(['cpu-1', 'gpu-1', 'disk-1']);
    invoke(findElement(render(), (node) => elementProps(node)['aria-label'] === 'settings.app.performanceMonitor.resetColors'), 'onClick');
    expect(elements(render()).filter((node) => elementProps(node).type === 'color').map((node) => elementProps(node).value)).toEqual(['#5eead4', '#93c5fd', '#c084fc', '#fbbf24']);
    expect(api.storeWrite).toHaveBeenCalledTimes(8);
    expect(api.settingsPreview).toHaveBeenCalledTimes(8);
    await settle();
  });
});
describe('实际私有硬件菜单及事件清理', () => {
  it.each([0, 1, 2])('硬件索引%s显示翻译默认与真实硬件名并选中', async (index) => {
    render();
    runEffects();
    await settle();
    const child = mountDropdown(dropdowns(render())[index]);
    expect(textContent(child())).toContain(['settings.app.performanceMonitor.hardwareOptions.allCpu', 'settings.app.performanceMonitor.hardwareOptions.autoGpu', 'settings.app.performanceMonitor.hardwareOptions.allDisks'][index]);
    invoke(findElement(child(), (node) => node.type === 'button'), 'onClick');
    const items = elements(child()).filter((node) => String(elementProps(node).className).startsWith('settings-performance-monitor-hardware-dropdown-item'));
    expect(items).toHaveLength(2);
    expect(String(elementProps(items[0]).className)).toContain('active');
    expect(String(elementProps(items[1]).className)).not.toContain('active');
    invoke(items[1], 'onClick');
    expect(api.storeWrite).toHaveBeenCalledWith('performance-monitor-hardware-selection', {
      cpu: index === 0 ? 'cpu-1' : 'all',
      gpu: index === 1 ? 'gpu-1' : 'auto',
      disk: index === 2 ? 'disk-1' : 'all'
    });
    expect(elements(child()).some((node) => elementProps(node).className === 'settings-performance-monitor-hardware-dropdown-menu')).toBe(false);
  });
  it.each([false, true])('快照硬件列表为空=%s时未知配置使用首项或原值', async (empty) => {
    api.storeRead.mockResolvedValue({
      cpu: 'unknown'
    });
    api.getPerformanceSnapshot.mockResolvedValue({
      hardwareOptions: empty ? {
        cpu: [],
        gpu: [],
        disk: []
      } : options
    });
    render();
    runEffects();
    await settle();
    const [element] = dropdowns(render());
    const child = mountDropdown(element);
    expect(textContent(child())).toContain(empty ? 'unknown' : 'settings.app.performanceMonitor.hardwareOptions.allCpu');
  });
  it.each(['inside', 'outside', 'no-ref'])('点击%s及滚轮运行真实回调，卸载解除监听', (mode) => {
    const [element] = dropdowns(render());
    const child = mountDropdown(element);
    child();
    runEffects();
    expect(addEventListener).not.toHaveBeenCalled();
    invoke(findElement(child(), (node) => node.type === 'button'), 'onClick');
    child();
    runEffects();
    expect(addEventListener).toHaveBeenCalledOnce();
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();
    const currentTarget = {
      scrollTop: 4,
      scrollLeft: 7
    };
    invoke(findElement(child(), (node) => elementProps(node).className === 'settings-performance-monitor-hardware-dropdown-scroll'), 'onWheelCapture', {
      preventDefault,
      stopPropagation,
      currentTarget,
      deltaY: 9,
      deltaX: -2
    });
    expect(currentTarget).toEqual({
      scrollTop: 13,
      scrollLeft: 5
    });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(stopPropagation).toHaveBeenCalledOnce();
    const ref = elementProps(findElement(child(), (node) => elementProps(node).className === 'settings-performance-monitor-hardware-dropdown')).ref as {
      current: HTMLDivElement | null;
    };
    const contains = vi.fn(() => mode === 'inside');
    ref.current = mode === 'no-ref' ? null : {
      contains
    } as unknown as HTMLDivElement;
    const [[, listener]] = addEventListener.mock.calls;
    listener({
      target: {} as Node
    });
    expect(elements(child()).some((node) => elementProps(node).className === 'settings-performance-monitor-hardware-dropdown-menu')).toBe(mode !== 'outside');
    unmountHooks();
    expect(removeEventListener).toHaveBeenCalledWith('mousedown', listener);
  });
});
