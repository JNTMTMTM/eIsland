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
 * @file alarmSidebarSelection.test.tsx
 * @description 使用真实概览选择 Hook 验证闹钟删除、跨窗口更新、加载守卫及可见按钮状态。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHookReactMock, deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../../../hooks/test/startupHookHarness';
import { elements } from '../../../../../../test/elementHarness';
import { DEFAULT_SYSTEM_ALARM_RINGTONE } from '../../../../../../../utils/audio/alarmSound';
import { OVERVIEW_ALARM_STORE_KEY } from '../../config/overviewAlarmConfig';
import { AlarmCard } from '../AlarmCard';
import { AlarmSidebar } from '../AlarmSidebar';
import type { AlarmItem, AlarmSidebarProps } from '../../types/alarmTypes';

vi.mock('react', async (original) => createHookReactMock(await original<typeof import('react')>()));

const read = vi.fn<(key: string) => Promise<unknown>>();
const write = vi.fn<(key: string, value: unknown) => Promise<boolean>>();
const unsubscribe = vi.fn();
let notify: (channel: string, value: unknown) => void;
const alarm: AlarmItem = {
  id: 17, hour: 8, minute: 0, second: 0, label: 'Morning', enabled: true,
  repeat: [], ringtone: DEFAULT_SYSTEM_ALARM_RINGTONE, loop: false, createdAt: 1,
};
const props: AlarmSidebarProps = {
  t: (key) => key, showEditor: true, adding: false, loaded: true,
  sortedAlarms: [alarm], editingId: null, weekdayLabel: String,
  repeatSummary: () => '', nextRingDesc: () => '', startEdit: vi.fn(),
  deleteAlarm: vi.fn(), toggleEnabled: vi.fn(), setAdding: vi.fn(), closeEditor: vi.fn(),
  setNewHour: vi.fn(), setNewMinute: vi.fn(), setNewSecond: vi.fn(),
};

beforeEach(() => {
  resetHook();
  read.mockReset().mockResolvedValue({ alarmIds: [17, 19] });
  write.mockReset().mockResolvedValue(true);
  unsubscribe.mockReset();
  vi.stubGlobal('window', { api: {
    storeRead: read, storeWrite: write,
    onSettingsChanged: (listener: typeof notify) => { notify = listener; return unsubscribe; },
  } });
});

afterEach(() => { unmountHook(); vi.unstubAllGlobals(); });

describe('alarm sidebar selection with native storage', () => {
  it('removes deleted IDs after loading and leaves an unchanged selection alone', async () => {
    renderHook(AlarmSidebar, props);
    flushHookEffects();
    expect(write).not.toHaveBeenCalled();
    await settleHook();
    const tree = renderHook(AlarmSidebar, props);
    flushHookEffects();
    await settleHook();
    expect(elements(tree)[0].props.className).toContain('alarm-tab-sidebar--compact');
    expect(write).toHaveBeenCalledExactlyOnceWith(OVERVIEW_ALARM_STORE_KEY, { alarmIds: [17] });
    const current = renderHook(AlarmSidebar, props);
    flushHookEffects();
    const card = elements(current).find((node) => node.type === AlarmCard);
    expect(card?.props.overviewSelected).toBe(true);
    expect(card?.props.overviewSelectionFull).toBe(false);
    expect(write).toHaveBeenCalledOnce();
  });

  it('waits for both data sources before pruning a cross-window selection', async () => {
    const pending = deferred<unknown>();
    read.mockReturnValue(pending.promise);
    renderHook(AlarmSidebar, props);
    flushHookEffects();
    notify(`store:${OVERVIEW_ALARM_STORE_KEY}`, { alarmIds: [17, 19] });
    renderHook(AlarmSidebar, { ...props, loaded: false });
    flushHookEffects();
    expect(write).not.toHaveBeenCalled();
    renderHook(AlarmSidebar, props);
    flushHookEffects();
    await settleHook();
    expect(write).toHaveBeenCalledExactlyOnceWith(OVERVIEW_ALARM_STORE_KEY, { alarmIds: [17] });
    pending.resolve({ alarmIds: [19] });
    await settleHook();
    const card = elements(renderHook(AlarmSidebar, props)).find((node) => node.type === AlarmCard);
    expect(card?.props.overviewSelected).toBe(true);
  });

  it('marks unselected alarms unavailable when the real stored selection is full', async () => {
    const more = [alarm, { ...alarm, id: 19 }, { ...alarm, id: 23 }];
    renderHook(AlarmSidebar, { ...props, sortedAlarms: more });
    flushHookEffects();
    await settleHook();
    const tree = renderHook(AlarmSidebar, { ...props, sortedAlarms: more });
    flushHookEffects();
    const cards = elements(tree).filter((node) => node.type === AlarmCard);
    expect(cards.map((card) => card.props.overviewSelected)).toEqual([true, true, false]);
    expect(cards.every((card) => card.props.overviewSelectionFull === true)).toBe(true);
    expect(write).not.toHaveBeenCalled();
  });
});
