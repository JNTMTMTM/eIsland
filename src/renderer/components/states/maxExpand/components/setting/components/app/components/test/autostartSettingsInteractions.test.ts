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
 * @file autostartSettingsInteractions.test.ts
 * @description 自启动设置真实工具操作、清理异步反馈、计时重置和卸载回归。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AutostartSettingsPage } from '../AutostartSettingsPage';
import { elementProps, elements, findElement, invoke, textContent } from '../../../../../../../../test/elementHarness';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from './themeHookHarness';
import type { ComponentProps } from 'react';
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../../../test/elementHarness')).hookMocks,
  ...(await import('./themeHookHarness')).lifecycleHooks
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: {
      kb?: string;
    }) => options?.kb ? `${key}:${options.kb}` : key
  })
}));
const api = {
  quitApp: vi.fn<() => void>(),
  restartApp: vi.fn<() => Promise<void>>(),
  openLogsFolder: vi.fn<() => Promise<void>>(),
  clearLogsCache: vi.fn<() => Promise<{
    success: boolean;
    freedBytes: number;
  }>>(),
  autostartSet: vi.fn<(mode: string) => Promise<void>>()
};
let props: ComponentProps<typeof AutostartSettingsPage>;
/**
 * 重绘实际工具设置。
 * @returns 实际元素树。
 */
function render() {
  return renderWithHooks(() => AutostartSettingsPage(props));
}
/**
 * 查找实际日志清理按钮的动态反馈。
 * @returns 实际日志按钮。
 */
function clearButton() {
  return findElement(render(), (node) => node.type === 'button' && /settings\.app\.autostart\.(clearLogs|logsClear)/.test(textContent(node)));
}
/**
 * 等待服务清理回调。
 * @returns 当前异步操作完成。
 */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
beforeEach(() => {
  resetLifecycle();
  vi.resetAllMocks();
  vi.useFakeTimers();
  props = {
    autostartMode: 'disabled',
    setAutostartMode: vi.fn()
  };
  api.restartApp.mockResolvedValue(undefined);
  api.openLogsFolder.mockResolvedValue(undefined);
  api.autostartSet.mockResolvedValue(undefined);
  api.clearLogsCache.mockResolvedValue({
    success: true,
    freedBytes: 1536
  });
  vi.stubGlobal('window', {
    api
  });
});
afterEach(() => {
  unmountHooks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('真实工具操作和模式切换', () => {
  it.each([true, false])('工具和自启动持久化失败=%s吞掉拒绝，实际按钮仍调用服务', async (failure) => {
    if (failure) {
      api.restartApp.mockRejectedValue(new Error('offline'));
      api.openLogsFolder.mockRejectedValue(new Error('offline'));
      api.autostartSet.mockRejectedValue(new Error('offline'));
    }
    ['quit', 'restart', 'openLogs'].forEach((action) => {
      invoke(findElement(render(), (node) => node.type === 'button' && textContent(node) === `settings.app.autostart.${action}`), 'onClick');
    });
    expect(api.quitApp).toHaveBeenCalledOnce();
    expect(api.restartApp).toHaveBeenCalledOnce();
    expect(api.openLogsFolder).toHaveBeenCalledOnce();
    elements(render()).filter((node) => node.type === 'button' && String(elementProps(node).className).startsWith('settings-lyrics-source-btn')).forEach((node) => {
      invoke(node, 'onClick');
    });
    expect(api.autostartSet.mock.calls.map(([mode]) => mode)).toEqual(['disabled', 'enabled', 'high-priority']);
    expect(props.setAutostartMode).toHaveBeenCalledTimes(3);
    await settle();
  });
  it.each([{
    mode: 'disabled',
    status: 'disabled'
  }, {
    mode: 'enabled',
    status: 'enabled'
  }, {
    mode: 'high-priority',
    status: 'highPriority'
  }] as const)('模式$mode显示唯一实际状态', ({
    mode,
    status
  }) => {
    props.autostartMode = mode;
    expect(textContent(render())).toContain(`settings.app.autostart.status.${status}`);
    expect(elements(render()).filter((node) => node.type === 'button' && String(elementProps(node).className).endsWith('active'))).toHaveLength(1);
  });
});
describe('真实清理状态和定时器生命周期', () => {
  it.each(['success', 'failed', 'rejected'])('清理%s异步反馈后3000ms恢复', async (result) => {
    if (result === 'failed') {api.clearLogsCache.mockResolvedValue({
      success: false,
      freedBytes: 0
    });}
    if (result === 'rejected') api.clearLogsCache.mockRejectedValue(new Error('offline'));
    render();
    runEffects();
    invoke(clearButton(), 'onClick');
    expect(elementProps(clearButton()).disabled).toBe(true);
    expect(textContent(clearButton())).toBe('settings.app.autostart.logsClearing');
    await settle();
    expect(elementProps(clearButton()).disabled).toBe(false);
    expect(textContent(clearButton())).toBe(result === 'success' ? 'settings.app.autostart.logsCleared:1.5' : 'settings.app.autostart.logsClearFailed');
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(2999);
    expect(textContent(clearButton())).not.toBe('settings.app.autostart.clearLogs');
    vi.advanceTimersByTime(1);
    expect(textContent(clearButton())).toBe('settings.app.autostart.clearLogs');
    expect(vi.getTimerCount()).toBe(0);
  });
  it('重复清理替换已有重置计时器而不提前恢复', async () => {
    render();
    runEffects();
    invoke(clearButton(), 'onClick');
    await settle();
    vi.advanceTimersByTime(1000);
    invoke(clearButton(), 'onClick');
    await settle();
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(2000);
    expect(textContent(clearButton())).toBe('settings.app.autostart.logsCleared:1.5');
    vi.advanceTimersByTime(1000);
    expect(textContent(clearButton())).toBe('settings.app.autostart.clearLogs');
  });
  it.each([true, false])('卸载时已有重置计时器=%s清除资源', async (scheduled) => {
    render();
    runEffects();
    if (scheduled) {
      invoke(clearButton(), 'onClick');
      await settle();
      expect(vi.getTimerCount()).toBe(1);
    }
    unmountHooks();
    expect(vi.getTimerCount()).toBe(0);
  });
});
