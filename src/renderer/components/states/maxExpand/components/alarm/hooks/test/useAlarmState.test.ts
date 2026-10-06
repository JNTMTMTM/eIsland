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
 * @file useAlarmState.test.ts
 * @description 闹钟真实状态 Hook 的存档竞争、编辑持久化、去重、预览和响铃描述测试
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAlarmState } from '../useAlarmState';
import { STORE_KEY } from '../../types/alarmTypes';
import { previewAlarmSound, stopPreviewAlarmSound, SystemAlarmRingtone } from '../../../../../../../utils/audio/alarmSound';
import { deferred, flushHookEffects, renderHook, resetHook, settleHook, translationProbe, unmountHook } from '../../../../../../hooks/test/startupHookHarness';
import type { AlarmItem, Weekday } from '../../types/alarmTypes';
import type { AlarmState } from '../useAlarmState';
vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const { createHookReactMock } = await import('../../../../../../hooks/test/startupHookHarness');
  return createHookReactMock(actual);
});
const read = vi.fn();
const write = vi.fn();
const toggle = vi.fn();
const unsubscribe = vi.fn();
let notify!: (channel: string, value: unknown) => void;
class AudioLeaf {
  currentTime = 0;

  duration = 60;

  paused = true;

  preload = '';

  loop = false;

  volume = 1;

  onended: (() => void) | null = null;

  /** 模拟原生播放完成并切换暂停状态。
   * @returns 已完成的播放 Promise
   */
  play = (): Promise<void> => { this.paused = false; return Promise.resolve(); };

  /** 模拟原生暂停以验证真实预览清理。 */
  pause = (): void => { this.paused = true; };
}
/** 生成合法闹钟存档以调用真实规范化逻辑。
 * @param overrides - 要调整的公开闹钟字段
 * @returns 完整闹钟记录
 */
function alarm(overrides: Partial<AlarmItem> = {}): AlarmItem {
  return { id: 1, hour: 9, minute: 0, second: 0, label: 'Morning', enabled: true, repeat: [], ringtone: SystemAlarmRingtone.ALARM_1, loop: true, createdAt: 1, ...overrides };
}
/** 渲染并提交真实 Hook 的待执行生命周期。
 * @returns 当前闹钟状态
 */
function view(): AlarmState { const result = renderHook(useAlarmState); flushHookEffects(); return result; }
/** 完成初始存档读取并提交 loaded 的持久化跳过逻辑。
 * @returns 加载完成的状态
 */
async function mount(): Promise<AlarmState> { view(); await settleHook(); return view(); }

beforeEach(() => {
  resetHook();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 5, 8, 0, 0));
  read.mockReset().mockResolvedValue([]);
  write.mockReset().mockResolvedValue(true);
  toggle.mockReset().mockResolvedValue(true);
  unsubscribe.mockReset();
  vi.stubGlobal('Audio', AudioLeaf);
  vi.stubGlobal('window', { requestAnimationFrame: vi.fn(() => 1), cancelAnimationFrame: vi.fn(), api: {
    storeRead: read, storeWrite: write, setAlarmEnabled: toggle,
    onSettingsChanged: (listener: typeof notify) => { notify = listener; return unsubscribe; },
  } });
  stopPreviewAlarmSound();
});
afterEach(() => { unmountHook(); stopPreviewAlarmSound(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('alarm storage lifecycle', () => {
  it.each([null, {}, [alarm({ hour: 12 }), alarm({ id: 2, hour: 9 })]])('loads persisted alarms %j without writing them back', async (data) => {
    read.mockResolvedValue(data);
    const state = await mount();
    expect(state.loaded).toBe(true);
    expect(state.alarms).toHaveLength(Array.isArray(data) ? 2 : 0);
    expect(state.sortedAlarms.map((item) => item.hour)).toEqual(Array.isArray(data) ? [9, 12] : []);
    expect(write).not.toHaveBeenCalled();
  });
  it('lets a settings event win over a stale initial read and ignores unrelated events', async () => {
    const pending = deferred<unknown>();
    read.mockReturnValue(pending.promise);
    view();
    notify('other', [alarm()]);
    expect(view().alarms).toEqual([]);
    notify(`store:${  STORE_KEY}`, [alarm({ label: 'Broadcast' })]);
    notify(`store:${  STORE_KEY}`, null);
    pending.resolve([alarm({ label: 'Stale' })]);
    await settleHook();
    expect(view().alarms[0].label).toBe('Broadcast');
    expect(write).not.toHaveBeenCalled();
    notify(`store:${  STORE_KEY}`, [alarm({ label: 'Latest' })]);
    expect(view().alarms[0].label).toBe('Latest');
    expect(write).not.toHaveBeenCalled();
  });
  it.each(['resolve', 'reject'] as const)('ignores initial %s and broadcasts after unmount', async (outcome) => {
    const pending = deferred<unknown>();
    read.mockReturnValue(pending.promise);
    view();
    unmountHook();
    if (outcome === 'resolve') pending.resolve([alarm()]);
    else pending.reject(new Error('read failed'));
    notify(`store:${  STORE_KEY}`, [alarm()]);
    await settleHook();
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(write).not.toHaveBeenCalled();
  });
  it('marks failed reads loaded and contains a later persistence failure', async () => {
    read.mockRejectedValue(new Error('read failed'));
    expect((await mount()).loaded).toBe(true);
    write.mockRejectedValue(new Error('write failed'));
    view().addAlarm();
    expect(view().alarms).toHaveLength(1);
    await settleHook();
    expect(write).toHaveBeenCalledWith(STORE_KEY, expect.any(Array));
  });
});

describe('alarm editing and controls', () => {
  it('adds a trimmed record using all public setters and clears the editor', async () => {
    await mount();
    const state = view();
    state.setAdding(true);
    state.setNewHour(7); state.setNewMinute(12); state.setNewSecond(34); state.setNewLabel('  Wake up  ');
    state.setNewRepeat([1, 3]); state.setNewRingtone(SystemAlarmRingtone.ALARM_2); state.setNewLoop(false);
    expect(view().showEditor).toBe(true);
    view().addAlarm();
    expect(view().alarms[0]).toMatchObject({ hour: 7, minute: 12, second: 34, label: 'Wake up', repeat: [1, 3], ringtone: SystemAlarmRingtone.ALARM_2, loop: false, enabled: true });
    expect(view()).toMatchObject({ adding: false, editingId: null, newHour: 8, newMinute: 0, newSecond: 0, newLabel: '', newRepeat: [], newLoop: true, showEditor: false });
  });
  it('rejects duplicate times when adding or editing and excludes the edited record itself', async () => {
    read.mockResolvedValue([alarm({ hour: 8 }), alarm({ id: 2, hour: 10 })]);
    await mount();
    view().addAlarm();
    expect(view().alarms).toHaveLength(2);
    view().saveEdit();
    view().startEdit(view().alarms[1]);
    view().setEditHour(8);
    view().saveEdit();
    expect(view().editingId).toBe(2);
    view().setEditHour(10);
    view().saveEdit();
    expect(view().editingId).toBeNull();
    expect(view().alarms).toHaveLength(2);
  });
  it('saves edits with all public fields and preserves unrelated records', async () => {
    read.mockResolvedValue([alarm(), alarm({ id: 2, hour: 10 })]);
    await mount();
    view().startEdit(view().alarms[0]);
    const state = view();
    state.setEditHour(6); state.setEditMinute(45); state.setEditSecond(30); state.setEditLabel('  Edited  ');
    state.setEditRepeat([0, 6]); state.setEditRingtone(SystemAlarmRingtone.ALARM_3); state.setEditLoop(false);
    view().saveEdit();
    expect(view().alarms[0]).toMatchObject({ hour: 6, minute: 45, second: 30, label: 'Edited', repeat: [0, 6], ringtone: SystemAlarmRingtone.ALARM_3, loop: false });
    expect(view().alarms[1].hour).toBe(10);
  });
  it('normalizes legacy edit data and deletes the active or an unrelated record', async () => {
    read.mockResolvedValue([alarm(), alarm({ id: 2 })]);
    await mount();
    view().startEdit({ ...alarm(), loop: undefined } as unknown as AlarmItem);
    expect(view().editLoop).toBe(true);
    view().deleteAlarm(2);
    expect(view().editingId).toBe(1);
    view().deleteAlarm(1);
    expect(view().editingId).toBeNull();
    expect(view().alarms).toEqual([]);
  });
  it.each([true, false])('sends enabled=%s changes and waits for the authoritative broadcast', async (enabled) => {
    read.mockResolvedValue([alarm({ enabled })]);
    await mount();
    view().toggleEnabled(999);
    expect(toggle).not.toHaveBeenCalled();
    toggle.mockRejectedValueOnce(new Error('native failed'));
    view().toggleEnabled(1);
    await settleHook();
    expect(toggle).toHaveBeenCalledWith(1, !enabled);
    expect(view().alarms[0].enabled).toBe(enabled);
    notify(`store:${  STORE_KEY}`, [alarm({ enabled: !enabled })]);
    expect(view().alarms[0].enabled).toBe(!enabled);
  });
  it('subscribes to real preview state and stops preview when closing the editor', async () => {
    await mount();
    expect(view().previewPlaying).toBe(false);
    previewAlarmSound(SystemAlarmRingtone.ALARM_1);
    await settleHook();
    expect(view().previewPlaying).toBe(true);
    view().closeEditor();
    expect(view().previewPlaying).toBe(false);
  });
});

describe('alarm display descriptions', () => {
  it.each([
    { repeat: [], key: 'repeatOnce' },
    { repeat: [0, 1, 2, 3, 4, 5, 6], key: 'repeatEveryday' },
    { repeat: [1, 2, 3, 4, 5], key: 'repeatWeekdays' },
    { repeat: [0, 6], key: 'repeatWeekend' },
    { repeat: [1, 6], key: 'weekday.mon maxExpand.alarm.weekday.sat' },
  ] satisfies Array<{ repeat: Weekday[]; key: string }>)('describes repeat $repeat', ({ repeat, key }) => {
    expect(view().repeatSummary(repeat)).toBe(`maxExpand.alarm.${  key}`);
  });
  it.each([
    { item: alarm({ enabled: false }), key: 'disabled' },
    { item: alarm({ hour: 9 }), key: 'ringIn' },
    { item: alarm({ hour: 8, minute: 15 }), key: 'ringInMin' },
    { item: alarm({ hour: 7 }), key: 'ringTomorrow' },
    { item: alarm({ hour: 9, repeat: [1] }), key: 'ringIn' },
    { item: alarm({ hour: 8, minute: 15, repeat: [1] }), key: 'ringInMin' },
    { item: alarm({ hour: 7, repeat: [1, 2] }), key: 'ringTomorrow' },
    { item: alarm({ repeat: [3] }), key: 'ringInDays' },
  ])('describes next ringing as $key', ({ item, key }) => expect(view().nextRingDesc(item)).toBe(`maxExpand.alarm.${  key}`));
  it('describes next week when only today is selected and its time passed', () => {
    expect(view().nextRingDesc(alarm({ hour: 7, repeat: [1] }))).toBe('maxExpand.alarm.ringInDays');
    expect(translationProbe).toHaveBeenLastCalledWith('maxExpand.alarm.ringInDays', expect.objectContaining({ n: 7 }));
  });
});

it('keeps malformed persisted weekday values from producing a date description', async () => {
  read.mockResolvedValue([alarm({ repeat: [8] as unknown as Weekday[] })]);
  await mount();
  expect(view().nextRingDesc(view().alarms[0])).toBe('');
});
