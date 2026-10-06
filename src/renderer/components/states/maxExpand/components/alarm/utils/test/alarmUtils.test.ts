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
 * @file alarmUtils.test.ts
 * @description 闹钟旧存档字段默认、时间格式、星期切换不可变性和持久化错误测试。
 * @author 鸡哥
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatTime, normalizeAlarms, persistAlarms, toggleWeekday } from '../alarmUtils';
import { SystemAlarmRingtone } from '../../../../../../../utils/audio/alarmSound';
import type { AlarmItem, Weekday } from '../../types/alarmTypes';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('alarm utility contracts', () => {
  it('defaults all missing legacy fields and normalizes unknown ringtones', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    expect(normalizeAlarms([{ id: 1 }] as AlarmItem[])).toEqual([{ id: 1, hour: 0, minute: 0, second: 0, label: '', enabled: true, repeat: [], ringtone: SystemAlarmRingtone.ALARM_1, loop: true, createdAt: 1000 }]);
    expect(normalizeAlarms([])).toEqual([]);
  });
  it('preserves false flags, zero timestamps and valid field values without mutating input', () => {
    const item: AlarmItem = { id: 1, hour: 1, minute: 2, second: 3, label: 'Alarm', enabled: false, repeat: [1, 3], ringtone: SystemAlarmRingtone.ALARM_2, loop: false, createdAt: 0 };
    const result = normalizeAlarms([item]);
    expect(result).toEqual([item]);
    expect(result[0]).not.toBe(item);
  });
  it('pads times and toggles weekdays without changing the original list', () => {
    expect(formatTime(1, 2, 3)).toBe('01:02:03');
    const list: Weekday[] = [1, 3];
    expect(toggleWeekday(list, 1)).toEqual([3]);
    expect(toggleWeekday(list, 2)).toEqual([1, 3, 2]);
    expect(list).toEqual([1, 3]);
  });
  it.each([false, true])('persists while handling write failure=%s', async (fails) => {
    const write = vi.fn().mockImplementation(() => fails ? Promise.reject(new Error('offline')) : Promise.resolve());
    vi.stubGlobal('window', { api: { storeWrite: write } });
    expect(() => persistAlarms([])).not.toThrow();
    await Promise.resolve();
    expect(write).toHaveBeenCalledExactlyOnceWith('alarms', []);
  });
});
