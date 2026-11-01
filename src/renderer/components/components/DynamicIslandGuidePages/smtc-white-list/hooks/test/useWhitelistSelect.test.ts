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
 * @file useWhitelistSelect.test.ts
 * @description 引导播放器白名单 Hook 的真实初始加载、多选切换和读写失败测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../../DynamicIslandSharedWaveEffect/hooks/test/waveLifecycleHarness';

import { useWhitelistSelect } from '../useWhitelistSelect';

vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../test/elementHarness')).hookMocks,
  ...(await import('../../../../DynamicIslandSharedWaveEffect/hooks/test/waveLifecycleHarness')).lifecycleHooks,
}));

/** 等待实际 Promise 加载或持久化失败回调完成。
 * @returns 异步回调完成。
 */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

const get = vi.fn<() => Promise<unknown>>();
const set = vi.fn<(selected: string[]) => Promise<void>>();
beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
  get.mockResolvedValue(undefined);
  set.mockResolvedValue();
  vi.stubGlobal('window', { api: { musicWhitelistGet: get, musicWhitelistSet: set } });
});
afterEach(() => {
  unmountHooks();
  vi.unstubAllGlobals();
});

/** 重新求值实际 Hook 的公开多选状态。
 * @returns 当前选中项和实际 toggle 回调。
 */
function view(): ReturnType<typeof useWhitelistSelect> {
  return renderWithHooks(useWhitelistSelect);
}

describe('引导白名单真实选择', () => {
  it.each([
    ['Chrome._crx_cinhimbnkkghhklpknlkffjgod'],
    ['_crx_cinhimbnkkghhklpknlkffjgod'],
    ['_crx_cinhimbnkkghhklpknlkffjgod', 'Chrome._crx_cinhimbnkkghhklpknlkffjgod'],
  ])('PWA 缓存 %s 使用完整 ID，切换时移除所有等价条目', async (...cached) => {
    get.mockResolvedValue(['Spotify.exe', ...cached]);
    view();
    runEffects();
    await settle();
    expect(view().selected).toEqual(['Spotify.exe', 'Chrome._crx_cinhimbnkkghhklpknlkffjgod']);
    view().toggle('Chrome._crx_cinhimbnkkghhklpknlkffjgod');
    expect(view().selected).toEqual(['Spotify.exe']);
    expect(set).toHaveBeenLastCalledWith(['Spotify.exe']);
  });
  it.each(['com.github.th-ch.youtube-music', 'Chrome._crx_cinhimbnkkghhklpknlkffjgod'])('初始读取延迟返回时保留用户对 %s 的选择', async (sourceId) => {
    let resolveList!: (list: string[]) => void;
    get.mockReturnValue(new Promise<string[]>((resolve) => { resolveList = resolve; }));
    view();
    runEffects();
    view().toggle(sourceId);
    const selected = [...view().selected];
    expect(selected).toContain(sourceId);
    resolveList(['Spotify.exe']);
    await settle();
    expect(view().selected).toEqual(selected);
    expect(set).toHaveBeenLastCalledWith(selected);
    view().toggle(sourceId);
    expect(view().selected).toEqual(selected.filter((item) => item !== sourceId));
    expect(set).toHaveBeenCalledTimes(2);
  });
  it.each([undefined, null, {}, 'QQMusic.exe', 2])('非数组缓存 %s 不替换默认选择', async (cached) => {
    get.mockResolvedValue(cached);
    expect(view().selected).toEqual(['QQMusic.exe', 'cloudmusic.exe', '汽水音乐', 'kugou']);
    runEffects();
    await settle();
    expect(view().selected).toEqual(['QQMusic.exe', 'cloudmusic.exe', '汽水音乐', 'kugou']);
    expect(get).toHaveBeenCalledOnce();
  });
  it.each([[], ['Spotify.exe', 'AppleMusic.exe']])('数组缓存完整恢复 %s', async (...selected) => {
    const list = selected;
    get.mockResolvedValue(list);
    view();
    runEffects();
    await settle();
    expect(view().selected).toEqual(list);
  });
  it('读取失败仍保留首次选择', async () => {
    get.mockRejectedValue(new Error('IPC read'));
    view();
    runEffects();
    await settle();
    expect(view().selected).toEqual(['QQMusic.exe', 'cloudmusic.exe', '汽水音乐', 'kugou']);
  });
  it.each([false, true])('添加与移除保留其他项顺序，持久化失败=%s 仍更新当前选择', async (reject) => {
    get.mockResolvedValue(['QQMusic.exe', 'Spotify.exe']);
    if (reject) set.mockRejectedValue(new Error('IPC write'));
    view();
    runEffects();
    await settle();
    view().toggle('AppleMusic.exe');
    expect(view().selected).toEqual(['QQMusic.exe', 'Spotify.exe', 'AppleMusic.exe']);
    expect(set).toHaveBeenLastCalledWith(['QQMusic.exe', 'Spotify.exe', 'AppleMusic.exe']);
    view().toggle('Spotify.exe');
    expect(view().selected).toEqual(['QQMusic.exe', 'AppleMusic.exe']);
    expect(set).toHaveBeenLastCalledWith(['QQMusic.exe', 'AppleMusic.exe']);
    await settle();
  });
});
