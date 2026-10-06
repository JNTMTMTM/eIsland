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
 * @file useUpdateSourceSelect.test.ts
 * @description 引导更新源 Hook 的真实持久化加载、即时选择和失败回退测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../../DynamicIslandSharedWaveEffect/hooks/test/waveLifecycleHarness';

import { useUpdateSourceSelect } from '../useUpdateSourceSelect';

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

const read = vi.fn<(key: string) => Promise<unknown>>();
const write = vi.fn<(key: string, value: string) => Promise<boolean>>();
beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
  read.mockResolvedValue(undefined);
  write.mockResolvedValue(true);
  vi.stubGlobal('window', { api: { storeRead: read, storeWrite: write } });
});
afterEach(() => {
  unmountHooks();
  vi.unstubAllGlobals();
});

/** 重新求值实际 Hook 的公开选中状态。
 * @returns 当前更新源与实际选择回调。
 */
function view(): ReturnType<typeof useUpdateSourceSelect> {
  return renderWithHooks(useUpdateSourceSelect);
}

describe('引导更新源真实选择', () => {
  it.each([undefined, null, 1, {}, ''])('无效缓存 %s 保留首次 ESA 选择', async (cached) => {
    read.mockResolvedValue(cached);
    expect(view().selected).toBe('esa-cdn');
    runEffects();
    await settle();
    expect(view().selected).toBe('esa-cdn');
    expect(read).toHaveBeenCalledWith('update-source');
  });
  it.each(['github', 'cloudflare-r2', 'esa-cdn'])('从缓存恢复 %s', async (cached) => {
    read.mockResolvedValue(cached);
    view();
    runEffects();
    await settle();
    expect(view().selected).toBe(cached);
  });
  it('读取失败保持默认', async () => {
    read.mockRejectedValue(new Error('IPC read'));
    view();
    runEffects();
    await settle();
    expect(view().selected).toBe('esa-cdn');
  });
  it.each([false, true])('即时选择并持久化，写入失败=%s 仍保留用户当前选择', async (reject) => {
    if (reject) write.mockRejectedValue(new Error('IPC write'));
    view();
    runEffects();
    await settle();
    ['github', 'cloudflare-r2', 'esa-cdn'].forEach((key) => {
      view().handleSelect(key);
      expect(view().selected).toBe(key);
      expect(write).toHaveBeenLastCalledWith('update-source', key);
    });
    await settle();
  });
});
