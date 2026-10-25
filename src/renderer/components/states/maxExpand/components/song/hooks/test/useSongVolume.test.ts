/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM / pyisland.com
 * Licensed under the GNU General Public License, version 3 or later.
 */

/**
 * @file useSongVolume.test.ts
 * @description 验证插件音量读写、串行合并、外部同步及卸载边界。
 * @author 鸡哥
 */
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../../../hooks/test/startupHookHarness';
import useSongVolume from '../useSongVolume';
import type { ChangeEvent } from 'react';

vi.mock('react', async (load) => {
  const actual = await load<typeof import('react')>();
  const { createHookReactMock } = await import('../../../../../../hooks/test/startupHookHarness');
  return createHookReactMock(actual);
});
const get = vi.fn<() => Promise<number | null>>();
const set = vi.fn<(value: number) => Promise<boolean>>();

/**
 * 模拟原生音量滑块输入。
 * @param value - 目标百分比。
 */
function change(value: number): void {
  renderHook(useSongVolume).handleVolumeChange({ currentTarget: { value: String(value) } } as ChangeEvent<HTMLInputElement>);
}

beforeEach(() => {
  resetHook(); vi.useFakeTimers(); vi.resetAllMocks();
  get.mockResolvedValue(65); set.mockResolvedValue(true);
  vi.stubGlobal('window', { api: { getVolume: get, setVolume: set } });
});
afterEach(() => { unmountHook(); vi.useRealTimers(); vi.unstubAllGlobals(); });

it('读取插件音量，合并快速输入，写入后回读并同步外部修改', async () => {
  expect(renderHook(useSongVolume).isAvailable).toBe(false);
  flushHookEffects(); await settleHook();
  expect(renderHook(useSongVolume)).toMatchObject({ volume: 65, isAvailable: true });
  change(20); await vi.advanceTimersByTimeAsync(40); change(80);
  get.mockResolvedValue(80);
  await vi.advanceTimersByTimeAsync(79); expect(set).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(set).toHaveBeenCalledExactlyOnceWith(80);
  get.mockResolvedValue(35); await vi.advanceTimersByTimeAsync(2000);
  expect(renderHook(useSongVolume).volume).toBe(35);
});

it.each(['false', 'reject'] as const)('写入%s时恢复真实音量', async (failure) => {
  renderHook(useSongVolume); flushHookEffects(); await settleHook();
  if (failure === 'false') set.mockResolvedValue(false);
  else set.mockRejectedValue(new Error('device unavailable'));
  change(90); await vi.advanceTimersByTimeAsync(80);
  expect(renderHook(useSongVolume)).toMatchObject({ volume: 65, isAvailable: true });
});

it('串行写入期间仅保留最后一次输入，过期读数不会覆盖新预览', async () => {
  renderHook(useSongVolume); flushHookEffects(); await settleHook();
  const stale = deferred<number | null>(); get.mockReturnValueOnce(stale.promise);
  await vi.advanceTimersByTimeAsync(2000);
  const writing = deferred<boolean>(); set.mockReturnValueOnce(writing.promise);
  change(30); await vi.advanceTimersByTimeAsync(80);
  stale.resolve(10); await settleHook();
  expect(renderHook(useSongVolume).volume).toBe(30);
  change(50); change(95); await vi.advanceTimersByTimeAsync(80);
  expect(set).toHaveBeenCalledTimes(1);
  get.mockResolvedValue(95); writing.resolve(true); await settleHook();
  expect(set.mock.calls).toEqual([[30], [95]]);
  expect(renderHook(useSongVolume).volume).toBe(95);
});

it('插件不可用时禁用，恢复后重新启用；卸载清理轮询和待提交写入', async () => {
  get.mockResolvedValue(null);
  renderHook(useSongVolume); flushHookEffects(); await settleHook();
  expect(renderHook(useSongVolume).isAvailable).toBe(false);
  get.mockResolvedValue(45); await vi.advanceTimersByTimeAsync(2000);
  expect(renderHook(useSongVolume)).toMatchObject({ volume: 45, isAvailable: true });
  change(70); unmountHook();
  const calls = get.mock.calls.length;
  await vi.advanceTimersByTimeAsync(4000);
  expect(set).not.toHaveBeenCalled(); expect(get).toHaveBeenCalledTimes(calls);
});
