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
 * @file worldClockLifecycle.test.tsx
 * @description 世界时钟主组件真实城市存储与总览选择 Hook 的事件和异步失败集成测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { WorldClockTab } from '../WorldClockTab';
import { WorldClockCard } from '../WorldClockCard';
import { WorldClockCityPicker } from '../WorldClockCityPicker';
import { OVERVIEW_TIMEZONES_STORE_KEY } from '../../config/overviewWorldClockConfig';
import { STORE_KEY } from '../../types/worldClockTypes';
import { elements, find, byClass, invoke } from '../../../../../test/tree';
import { resetHook, renderHook, flushHookEffects, settleHook, unmountHook } from '../../../../../../hooks/test/startupHookHarness';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en-US', resolvedLanguage: 'en-US' } }) }));
vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const { createHookReactMock } = await import('../../../../../../hooks/test/startupHookHarness');
  return createHookReactMock(actual);
});
const write = vi.fn<Window['api']['storeWrite']>();
const unsubscribe = vi.fn();
beforeEach(() => {
  resetHook();
  vi.useFakeTimers();
  vi.clearAllMocks();
  write.mockResolvedValue(true);
  vi.stubGlobal('window', { api: {
    storeWrite: write,
    storeRead: (key: string) => Promise.resolve(key === STORE_KEY ? [
      { timezone: 'UTC', label: 'UTC', order: 0 },
      { timezone: 'Asia/Tokyo', label: 'Tokyo', order: 1 },
      { timezone: 'Europe/London', label: 'London', order: 2 },
    ] : { timezones: ['UTC'] }),
    onSettingsChanged: () => unsubscribe,
  } });
});
afterEach(() => {
  unmountHook();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
/** 提交真实主组件及其全部子 Hook effect。
 * @returns 实际元素树。
 */
function view() {
  const tree = renderHook(WorldClockTab);
  flushHookEffects();
  return tree;
}
/** 完成原生读取、真实配置正规化及实际时钟 tick。
 * @returns 当前实际组件树。
 */
async function mount() {
  view();
  await settleHook();
  view();
  await settleHook();
  return view();
}
it('读取真实城市后公共按钮打开、关闭选择器并传入已有时区', async () => {
  let tree = await mount();
  expect(find(tree, (node) => node.type === WorldClockCityPicker).props.existingTimezones).toEqual(['UTC', 'Asia/Tokyo', 'Europe/London']);
  invoke(byClass(tree, 'world-clock-add-btn'), 'onClick');
  tree = view();
  expect(find(tree, (node) => node.type === WorldClockCityPicker).props.visible).toBe(true);
  invoke(find(tree, (node) => node.type === WorldClockCityPicker), 'onClose');
  expect(find(view(), (node) => node.type === WorldClockCityPicker).props.visible).toBe(false);
});
it('取消总览、添加至上限、删除选中和未选中城市均按真实存储契约接线', async () => {
  let tree = await mount();
  const card = find(tree, (node) => node.type === WorldClockCard);
  invoke(card, 'onToggleOverview', 'UTC');
  tree = view();
  expect(find(tree, (node) => node.type === WorldClockCard).props.overviewSelected).toBe(false);
  invoke(find(tree, (node) => node.type === WorldClockCard), 'onToggleOverview', 'Asia/Tokyo');
  tree = view();
  expect(write).toHaveBeenCalledWith(OVERVIEW_TIMEZONES_STORE_KEY, { timezones: ['Asia/Tokyo'] });
  invoke(find(tree, (node) => node.type === WorldClockCard), 'onToggleOverview', 'Europe/London');
  tree = view();
  expect(write).toHaveBeenCalledWith(OVERVIEW_TIMEZONES_STORE_KEY, { timezones: ['Asia/Tokyo', 'Europe/London'] });
  write.mockClear();
  invoke(find(tree, (node) => node.type === WorldClockCard), 'onToggleOverview', 'UTC');
  expect(write).not.toHaveBeenCalled();
  invoke(find(tree, (node) => node.type === WorldClockCard), 'onRemove', 'UTC');
  tree = view();
  expect(write.mock.calls.some(([key]) => key === OVERVIEW_TIMEZONES_STORE_KEY)).toBe(false);
  write.mockRejectedValue(new Error('disk closed'));
  invoke(find(tree, (node) => node.type === WorldClockCard), 'onRemove', 'Asia/Tokyo');
  tree = view();
  await settleHook();
  tree = view();
  expect(write).toHaveBeenCalledWith(OVERVIEW_TIMEZONES_STORE_KEY, { timezones: ['Europe/London'] });
  expect(elements(tree).filter((node) => node.type === WorldClockCard)).toHaveLength(1);
  unmountHook();
  expect(unsubscribe).toHaveBeenCalledTimes(2);
  expect(vi.getTimerCount()).toBe(0);
});
