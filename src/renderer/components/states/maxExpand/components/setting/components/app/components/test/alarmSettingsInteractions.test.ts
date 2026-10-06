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
 * @file alarmSettingsInteractions.test.ts
 * @description 闹钟设置真实加载边界、取消、全部控件提交与失败回滚回归。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AlarmSettingsPage } from '../AlarmSettingsPage';
import { elementProps, elements, invoke, textContent } from '../../../../../../../../test/elementHarness';
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
  storeRead: vi.fn<(key: string) => Promise<unknown>>(),
  storeWrite: vi.fn<(key: string, value: unknown) => Promise<void>>()
};
/**
 * 重绘真实闹钟设置。
 * @returns 实际元素树。
 */
function render() {
  return renderWithHooks(() => AlarmSettingsPage());
}
/**
 * 等待真实读取与写入回滚。
 * @returns 当前队列完成。
 */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
/**
 * 收集页面实际显示为选中的选项文字。
 * @returns 当前实际选中选项。
 */
function active() {
  return elements(render()).filter((node) => node.type === 'button' && String(elementProps(node).className).endsWith('active')).map((node) => textContent(node));
}
beforeEach(() => {
  resetLifecycle();
  vi.resetAllMocks();
  api.storeRead.mockResolvedValue(undefined);
  api.storeWrite.mockResolvedValue(undefined);
  vi.stubGlobal('window', {
    api
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});
describe('真实读取规范化与取消', () => {
  it.each([{
    value: -5,
    snooze: '1',
    dismiss: 'never'
  }, {
    value: 3.4,
    snooze: '3',
    dismiss: 'options.3'
  }, {
    value: 100,
    snooze: '',
    dismiss: ''
  }])('数值$value读取后夹紧或取整', async ({
    value,
    snooze,
    dismiss
  }) => {
    api.storeRead.mockResolvedValue(value);
    render();
    runEffects();
    await settle();
    expect(active()).toEqual(snooze ? [`settings.alarm.snooze.options.${snooze}`, `settings.alarm.autoDismiss.${dismiss}`] : []);
    expect(elements(render()).filter((node) => elementProps(node).type === 'checkbox').map((node) => elementProps(node).checked)).toEqual([true, true]);
  });
  it.each(['bad', NaN, Infinity])('非法数值%o读取保持默认时长', async (value) => {
    api.storeRead.mockResolvedValue(value);
    render();
    runEffects();
    await settle();
    expect(active()).toEqual(['settings.alarm.snooze.options.5', 'settings.alarm.autoDismiss.options.5']);
  });
  it.each([true, false])('合法布尔%s读取更新两个开关', async (value) => {
    api.storeRead.mockResolvedValue(value);
    render();
    runEffects();
    await settle();
    expect(elements(render()).filter((node) => elementProps(node).type === 'checkbox').map((node) => elementProps(node).checked)).toEqual([value, value]);
  });
  it('读取拒绝恢复默认并吞掉全部错误', async () => {
    api.storeRead.mockRejectedValue(new Error('offline'));
    render();
    runEffects();
    await settle();
    expect(active()).toEqual(['settings.alarm.snooze.options.5', 'settings.alarm.autoDismiss.options.5']);
    expect(api.storeRead).toHaveBeenCalledTimes(4);
  });
  it('卸载后迟到四项配置均不改变状态', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    api.storeRead.mockReturnValue(new Promise((done) => {
      resolve = done;
    }));
    render();
    runEffects();
    unmountHooks();
    resolve(false);
    await settle();
    expect(elements(render()).filter((node) => elementProps(node).type === 'checkbox').map((node) => elementProps(node).checked)).toEqual([true, true]);
    expect(active()).toEqual(['settings.alarm.snooze.options.5', 'settings.alarm.autoDismiss.options.5']);
  });
});
describe('实际控件持久化和回滚', () => {
  it.each([true, false])('写入失败=%s时两个开关和所有选项回滚或保持', async (failure) => {
    if (failure) api.storeWrite.mockRejectedValue(new Error('offline'));
    const tree = render();
    elements(tree).filter((node) => elementProps(node).type === 'checkbox').forEach((node) => {
      invoke(node, 'onChange', {
        target: {
          checked: false
        }
      });
    });
    elements(tree).filter((node) => node.type === 'button').forEach((node) => {
      invoke(node, 'onClick');
    });
    expect(api.storeWrite).toHaveBeenCalledTimes(12);
    expect(api.storeWrite).toHaveBeenCalledWith('alarm-sound-enabled', false);
    expect(api.storeWrite).toHaveBeenCalledWith('alarm-notification-enabled', false);
    expect(api.storeWrite.mock.calls.filter(([key]) => key === 'alarm-snooze-duration').map(([, value]) => value)).toEqual([1, 3, 5, 10, 15]);
    expect(api.storeWrite.mock.calls.filter(([key]) => key === 'alarm-auto-dismiss').map(([, value]) => value)).toEqual([1, 3, 5, 10, 0]);
    expect(elements(render()).filter((node) => elementProps(node).type === 'checkbox').map((node) => elementProps(node).checked)).toEqual([false, false]);
    expect(active()).toEqual(['settings.alarm.snooze.options.15', 'settings.alarm.autoDismiss.never']);
    await settle();
    expect(elements(render()).filter((node) => elementProps(node).type === 'checkbox').map((node) => elementProps(node).checked)).toEqual([failure, failure]);
    expect(active()).toEqual(failure ? ['settings.alarm.snooze.options.5', 'settings.alarm.autoDismiss.options.5'] : ['settings.alarm.snooze.options.15', 'settings.alarm.autoDismiss.never']);
  });
});
