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
 * @file breakReminderSettingsInteractions.test.ts
 * @description 休息提醒真实加载迁移、默认生成、编辑删除及异步取消回归。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BreakReminderSettingsPage } from '../BreakReminderSettingsPage';
import { elementProps, elements, findElement, invoke, textContent } from '../../../../../../../../test/elementHarness';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from './themeHookHarness';
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../../../test/elementHarness')).hookMocks,
  ...(await import('./themeHookHarness')).lifecycleHooks
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));
const api = {
  storeRead: vi.fn<() => Promise<unknown>>(),
  storeWrite: vi.fn<(key: string, value: unknown) => Promise<void>>()
};
interface Reminder {
  id: string;
  name: string;
  intervalMinutes: number;
  enabled: boolean;
  icon?: string;
}
const saved: Reminder[] = [{
  id: 'a',
  name: 'Alpha',
  intervalMinutes: 20,
  enabled: true,
  icon: 'custom-icon'
}, {
  id: 'b',
  name: 'Beta',
  intervalMinutes: 50,
  enabled: false,
  icon: 'other-icon'
}];
/**
 * 重绘实际提醒组件。
 * @returns 实际元素树。
 */
function render() {
  return renderWithHooks(() => BreakReminderSettingsPage());
}
/**
 * 等待加载与持久化失败回调。
 * @returns 当前服务队列完成。
 */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
/**
 * 按真实读取生命周期初始化提醒。
 * @param value - 保存服务返回值。
 * @returns 加载完成。
 */
async function boot(value: unknown): Promise<void> {
  api.storeRead.mockResolvedValue(value);
  render();
  runEffects();
  await settle();
}
/**
 * 获取实际提醒行。
 * @returns 当前实际行集合。
 */
function rows() {
  return elements(render()).filter((node) => elementProps(node).className === 'break-reminder-item');
}
/**
 * 取得最后一次真实持久化的提醒列表。
 * @returns 真实回调提交的提醒数据。
 */
function lastSaved() {
  return api.storeWrite.mock.calls.at(-1)?.[1] as Reminder[];
}
/**
 * 点击实际页面文字按钮。
 * @param key - 真实翻译键。
 * @returns 无返回值。
 */
function click(key: string): void {
  invoke(findElement(render(), (node) => node.type === 'button' && textContent(node) === key), 'onClick');
}
beforeEach(() => {
  resetLifecycle();
  vi.resetAllMocks();
  api.storeRead.mockResolvedValue(saved);
  api.storeWrite.mockResolvedValue(undefined);
  vi.stubGlobal('window', {
    api
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});
describe('真实加载与图标迁移', () => {
  it.each([null, undefined])('缺省存储%o生成两条默认并持久化', async (value) => {
    expect(textContent(render())).toBe('');
    await boot(value);
    expect(rows()).toHaveLength(2);
    const defaults = lastSaved();
    expect(defaults.map((item) => ({
      name: item.name,
      intervalMinutes: item.intervalMinutes,
      enabled: item.enabled
    }))).toEqual([{
      name: 'settings.breakReminder.defaultSedentary',
      intervalMinutes: 30,
      enabled: true
    }, {
      name: 'settings.breakReminder.defaultHydration',
      intervalMinutes: 60,
      enabled: true
    }]);
    defaults.forEach((item) => {
      expect(item.id).toMatch(/^\d+-[a-z0-9]+$/);
      expect(typeof item.icon).toBe('string');
    });
  });
  it.each([true, false])('缺失图标迁移写入失败=%s仍使用默认图标', async (failure) => {
    if (failure) api.storeWrite.mockRejectedValue(new Error('offline'));
    const [first, second] = saved;
    await boot([first, {
      ...second,
      icon: ''
    }]);
    expect(rows()).toHaveLength(2);
    expect(lastSaved()[0]).toEqual(first);
    expect(lastSaved()[1].icon).not.toBe('');
    expect(lastSaved()[1].name).toBe('Beta');
  });
  it('首次默认提醒持久化失败仍完成加载', async () => {
    api.storeWrite.mockRejectedValue(new Error('offline'));
    await boot(null);
    expect(rows()).toHaveLength(2);
    expect(api.storeWrite).toHaveBeenCalledOnce();
  });
  it('完整数组无需迁移写入', async () => {
    await boot(saved);
    expect(rows()).toHaveLength(2);
    expect(api.storeWrite).not.toHaveBeenCalled();
  });
  it.each([[], 42])('保存值%o加载完成显示空列表', async (value) => {
    await boot(value);
    expect(rows()).toHaveLength(0);
    expect(textContent(render())).toContain('settings.breakReminder.emptyHint');
    expect(api.storeWrite).not.toHaveBeenCalled();
  });
  it('加载拒绝回退默认且不进行存储写入', async () => {
    api.storeRead.mockRejectedValue(new Error('offline'));
    render();
    runEffects();
    await settle();
    expect(rows()).toHaveLength(2);
    expect(api.storeWrite).not.toHaveBeenCalled();
  });
  it.each([true, false])('卸载后读取拒绝=%s不完成加载或持久化', async (failure) => {
    let resolve: (value: unknown) => void = () => undefined;
    let reject: (error: Error) => void = () => undefined;
    api.storeRead.mockReturnValue(new Promise((done, fail) => {
      resolve = done;
      reject = fail;
    }));
    render();
    runEffects();
    unmountHooks();
    if (failure) reject(new Error('offline'));else resolve(null);
    await settle();
    expect(textContent(render())).toBe('');
    expect(api.storeWrite).not.toHaveBeenCalled();
  });
});
describe('真实提醒编辑与边界', () => {
  it.each([true, false])('新增删除重置持久化失败=%s仍即时更新真实列表', async (failure) => {
    await boot(saved);
    if (failure) api.storeWrite.mockRejectedValue(new Error('offline'));
    click('settings.breakReminder.addBtn');
    expect(rows()).toHaveLength(3);
    const [, , addition] = lastSaved();
    expect(addition.name).toBe('');
    expect(addition.intervalMinutes).toBe(30);
    expect(addition.enabled).toBe(true);
    invoke(findElement(rows()[0], (node) => elementProps(node).className === 'break-reminder-delete'), 'onClick');
    expect(lastSaved().map((item) => item.name)).toEqual(['Beta', '']);
    click('settings.breakReminder.resetBtn');
    expect(lastSaved().map((item) => item.name)).toEqual(['settings.breakReminder.defaultSedentary', 'settings.breakReminder.defaultHydration']);
    await settle();
  });
  it('编辑名称与启用只更新目标提醒，另一个保持完整', async () => {
    await boot(saved);
    invoke(findElement(rows()[0], (node) => elementProps(node).className === 'break-reminder-name'), 'onChange', {
      target: {
        value: 'New name'
      }
    });
    expect(lastSaved()[0].name).toBe('New name');
    expect(lastSaved()[1]).toEqual(saved[1]);
    invoke(findElement(rows()[0], (node) => elementProps(node).type === 'checkbox'), 'onChange', {
      target: {
        checked: false
      }
    });
    expect(lastSaved()[0].enabled).toBe(false);
    expect(lastSaved()[0].name).toBe('New name');
    expect(lastSaved()[1]).toEqual(saved[1]);
  });
  it.each([{
    input: '',
    expected: 1
  }, {
    input: 'invalid',
    expected: 1
  }, {
    input: '0',
    expected: 1
  }, {
    input: '3.5',
    expected: 4
  }, {
    input: '2000',
    expected: 1440
  }])('间隔$input限制至$expected', async ({
    input,
    expected
  }) => {
    await boot(saved);
    invoke(findElement(rows()[0], (node) => elementProps(node).className === 'break-reminder-interval'), 'onChange', {
      target: {
        value: input
      }
    });
    expect(lastSaved()[0].intervalMinutes).toBe(expected);
    expect(lastSaved()[1]).toEqual(saved[1]);
  });
  it('图标选择器实际开关与两种图标提交后关闭', async () => {
    await boot(null);
    const toggle = () => invoke(findElement(rows()[0], (node) => elementProps(node).className === 'break-reminder-icon-current'), 'onClick');
    toggle();
    expect(elements(rows()[0]).some((node) => elementProps(node).className === 'break-reminder-icon-dropdown-wrap open')).toBe(true);
    toggle();
    expect(elements(rows()[0]).some((node) => elementProps(node).className === 'break-reminder-icon-dropdown-wrap open')).toBe(false);
    const buttons = elements(rows()[0]).filter((node) => String(elementProps(node).className).startsWith('break-reminder-icon-btn'));
    expect(String(elementProps(buttons[0]).className)).toContain(' active');
    expect(String(elementProps(buttons[1]).className)).not.toContain(' active');
    toggle();
    invoke(buttons[1], 'onClick');
    expect(elements(rows()[0]).some((node) => elementProps(node).className === 'break-reminder-icon-dropdown-wrap open')).toBe(false);
    expect(lastSaved()[0].icon).toBe(elementProps(findElement(buttons[1], (node) => node.type === 'img')).src);
    const first = findElement(rows()[0], (node) => String(elementProps(node).className).startsWith('break-reminder-icon-btn'));
    invoke(first, 'onClick');
    expect(lastSaved()[0].icon).toBe(elementProps(findElement(buttons[0], (node) => node.type === 'img')).src);
  });
});
