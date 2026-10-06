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
 * @file useOverviewAlarmConfig.test.ts
 * @description 概览闹钟选择 Hook 的初始读取竞争、公开写入回滚与卸载测试
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOverviewAlarmConfig } from '../useOverviewAlarmConfig';
import { OVERVIEW_ALARM_STORE_KEY } from '../../config/overviewAlarmConfig';
import { deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../../../hooks/test/startupHookHarness';
vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const { createHookReactMock } = await import('../../../../../../hooks/test/startupHookHarness');
  return createHookReactMock(actual);
});
const read = vi.fn();
const write = vi.fn();
const unsubscribe = vi.fn();
let notify!: (channel: string, value: unknown) => void;
beforeEach(() => {
  resetHook();
  read.mockReset().mockResolvedValue({ alarmIds: [1, 2] });
  write.mockReset().mockResolvedValue(true);
  unsubscribe.mockReset();
  vi.stubGlobal('window', { api: { storeRead: read, storeWrite: write, onSettingsChanged: (listener: typeof notify) => { notify = listener; return unsubscribe; } } });
});
afterEach(() => { unmountHook(); vi.unstubAllGlobals(); });
describe('overview alarm selection', () => {
  it('loads normalized ids and ignores unrelated broadcasts', async () => {
    renderHook(useOverviewAlarmConfig); flushHookEffects(); await settleHook();
    expect(renderHook(useOverviewAlarmConfig)).toMatchObject({ alarmIds: [1, 2], loaded: true });
    notify('other', { alarmIds: [3] });
    expect(renderHook(useOverviewAlarmConfig).alarmIds).toEqual([1, 2]);
    notify(`store:${  OVERVIEW_ALARM_STORE_KEY}`, { alarmIds: [3, 3, 4, 5] });
    expect(renderHook(useOverviewAlarmConfig).alarmIds).toEqual([3, 4]);
  });
  it.each(['broadcast', 'write', 'unmount'] as const)('ignores initial read after %s', async (change) => {
    const pending = deferred<unknown>(); read.mockReturnValue(pending.promise);
    renderHook(useOverviewAlarmConfig); flushHookEffects();
    if (change === 'broadcast') notify(`store:${  OVERVIEW_ALARM_STORE_KEY}`, { alarmIds: [7] });
    if (change === 'write') await renderHook(useOverviewAlarmConfig).updateAlarmIds([7]);
    if (change === 'unmount') unmountHook();
    pending.resolve({ alarmIds: [1] }); await settleHook();
    if (change !== 'unmount') expect(renderHook(useOverviewAlarmConfig).alarmIds).toEqual([7]);
    else { notify(`store:${  OVERVIEW_ALARM_STORE_KEY}`, { alarmIds: [9] }); expect(unsubscribe).toHaveBeenCalledOnce(); }
  });
  it.each(['success', 'false', 'reject'] as const)('handles optimistic write outcome %s', async (outcome) => {
    renderHook(useOverviewAlarmConfig); flushHookEffects(); await settleHook();
    if (outcome === 'false') write.mockResolvedValue(false);
    if (outcome === 'reject') write.mockRejectedValue(new Error('write failed'));
    const result = await renderHook(useOverviewAlarmConfig).updateAlarmIds([3, 3, 4, 5]);
    expect(result).toBe(outcome === 'success');
    expect(write).toHaveBeenCalledWith(OVERVIEW_ALARM_STORE_KEY, { alarmIds: [3, 4] });
    expect(renderHook(useOverviewAlarmConfig).alarmIds).toEqual(outcome === 'success' ? [3, 4] : [1, 2]);
  });
  it('contains rejected initial reads', async () => {
    read.mockRejectedValue(new Error('read failed'));
    renderHook(useOverviewAlarmConfig); flushHookEffects(); await settleHook();
    expect(renderHook(useOverviewAlarmConfig)).toMatchObject({ alarmIds: [], loaded: false });
  });
});
