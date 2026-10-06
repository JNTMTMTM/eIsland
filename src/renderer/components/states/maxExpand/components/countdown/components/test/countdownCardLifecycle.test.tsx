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
 * @file countdownCardLifecycle.test.tsx
 * @description 倒数卡片真实背景路径转换、异步失败及卸载保护生命周期测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CountdownCard } from '../CountdownCard';
import { byClass, elements } from '../../../../../test/tree';
import { resetHook, renderHook, flushHookEffects, settleHook, unmountHook } from '../../../../../../hooks/test/startupHookHarness';
import type { CountdownItem } from '../../types/countdownTypes';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));
vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const { createHookReactMock } = await import('../../../../../../hooks/test/startupHookHarness');
  return createHookReactMock(actual);
});
const load = vi.fn<Window['api']['loadWallpaperFile']>();
const item: CountdownItem = { id: 1, name: 'Release', date: '2026-10-10', type: 'countdown', color: '#fff', backgroundImage: 'C:/image.png' };
const now = new Date(2026, 9, 6);
beforeEach(() => {
  resetHook();
  load.mockReset().mockResolvedValue('data:image/png;base64,AA');
  vi.stubGlobal('window', { api: { loadWallpaperFile: load } });
});
afterEach(() => {
  unmountHook();
  vi.unstubAllGlobals();
});
/** 提交真实图片转换及卡片 effect。
 * @param extra - 公开背景字段。
 * @returns 实际卡片树。
 */
function view(extra: Partial<CountdownItem> = {}) {
  const tree = renderHook(() => CountdownCard({ now, item: { ...item, ...extra } }));
  flushHookEffects();
  return tree;
}
it.each([undefined, 0.6])('背景成功后展示真实地址及透明度边界 %s', async (opacity) => {
  view({ backgroundOpacity: opacity });
  await settleHook();
  const tree = view({ backgroundOpacity: opacity });
  expect(byClass(tree, 'cd-card-bg').props.style).toEqual({ backgroundImage: 'url(data:image/png;base64,AA)', opacity: opacity ?? 0.35 });
  expect(load).toHaveBeenCalledWith('C:/image.png');
});
it('原生调用同步失败时实际转换 Promise 拒绝并清空背景', async () => {
  load.mockImplementation(() => { throw new Error('IPC closed'); });
  view();
  await settleHook();
  expect(elements(view()).some((node) => node.props.className === 'cd-card-bg')).toBe(false);
});
it.each([false, true])('卸载后迟到原生结果忽略：failure=%s', async (failure) => {
  let resolve!: (value: string | null) => void;
  load.mockImplementation(() => {
    if (failure) throw new Error('IPC closed');
    return new Promise((yes) => { resolve = yes; });
  });
  view();
  unmountHook();
  if (!failure) resolve('data:image/png;base64,LATE');
  await settleHook();
  expect(elements(view()).some((node) => node.props.className === 'cd-card-bg')).toBe(false);
});
