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
 * @file countdownRules.test.ts
 * @description 验证日期边界、历史兼容、归档排序及提醒去重。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import i18next from 'i18next';
import { countdownText, defaultRules, diffDays, isArchived, occurrenceDate, parseCountdownItems, sortCountdownItems } from '../countdownUtils';
import { dueCountdownReminders } from '../countdownReminders';
import type { CountdownItem } from '../../types/countdownTypes';

const base: CountdownItem = { id: 1, name: 'Test', date: '2026-09-23', type: 'countdown', color: '#69c0ff' };
const now = new Date('2026-09-21T10:00:00');

const locale = i18next.createInstance();
await locale.init({ lng: 'en', resources: { en: { translation: { countdown: { days: {
  today: 'Today', tomorrow: 'Tomorrow', yesterday: 'Yesterday', after: 'In {{days}} days',
  before: '{{days}} days ago', elapsed: '{{days}} days elapsed',
} } } } } });

describe('calendar counting', () => {
  it('ignores time of day', () => expect(diffDays(base.date, now)).toBe(2));
  it('counts both DST transitions by calendar day', () => {
    expect(diffDays('2026-03-09', new Date('2026-03-08T12:00:00'))).toBe(1);
    expect(diffDays('2026-11-02', new Date('2026-11-01T12:00:00'))).toBe(1);
  });
  it('keeps legacy birthdays single occurrence', () => {
    expect(occurrenceDate({ ...base, type: 'birthday', date: '2000-01-01' }, now)).toBe('2000-01-01');
  });
  it('defaults new birthday/holiday to yearly and anniversary to count up', () => {
    expect(defaultRules('birthday').repeat).toBe('yearly');
    expect(defaultRules('holiday').repeat).toBe('yearly');
    expect(defaultRules('anniversary').mode).toBe('up');
    expect(defaultRules('exam').repeat).toBe('none');
  });
  it('rolls a past annual date forward without mutating its source', () => {
    const item = { ...base, date: '2000-01-01', repeat: 'yearly' as const };
    expect(occurrenceDate(item, now)).toBe('2027-01-01');
    expect(item.date).toBe('2000-01-01');
  });
  it('keeps the current annual occurrence on its day', () => {
    expect(occurrenceDate({ ...base, date: '2000-09-21', repeat: 'yearly' }, now)).toBe('2026-09-21');
  });
  it('does not pull a future first occurrence backwards', () => {
    expect(occurrenceDate({ ...base, date: '2030-01-01', repeat: 'yearly' }, now)).toBe('2030-01-01');
  });
  it('clamps leap-day repeats in ordinary years and preserves leap years', () => {
    const item = { ...base, date: '2024-02-29', repeat: 'yearly' as const };
    expect(occurrenceDate(item, new Date('2027-02-28T12:00:00'))).toBe('2027-02-28');
    expect(occurrenceDate(item, new Date('2027-03-01T12:00:00'))).toBe('2028-02-29');
  });
  it('formats today, tomorrow and yesterday consistently', () => {
    expect(countdownText({ ...base, date: '2026-09-21' }, locale.t, now)).toBe('Today');
    expect(countdownText({ ...base, date: '2026-09-22' }, locale.t, now)).toBe('Tomorrow');
    expect(countdownText({ ...base, date: '2026-09-20' }, locale.t, now)).toBe('Yesterday');
  });
  it('counts the start date as zero or one only in up mode', () => {
    const item = { ...base, date: '2026-09-21', mode: 'up' as const };
    expect(countdownText(item, locale.t, now)).toBe('0 days elapsed');
    expect(countdownText({ ...item, includeToday: true }, locale.t, now)).toBe('1 days elapsed');
    expect(countdownText({ ...item, mode: 'down', includeToday: true }, locale.t, now)).toBe('Today');
  });
});

describe('management rules', () => {
  it('archives only after the date and excludes annual/count-up events', () => {
    const item = { ...base, expiryAction: 'archive' as const };
    expect(isArchived(item, new Date('2026-09-23T23:59:00'))).toBe(false);
    expect(isArchived(item, new Date('2026-09-24T00:00:00'))).toBe(true);
    expect(isArchived({ ...item, repeat: 'yearly' }, new Date('2026-09-24'))).toBe(false);
    expect(isArchived({ ...item, mode: 'up' }, new Date('2026-09-24'))).toBe(false);
    expect(isArchived({ ...item, archived: true }, now)).toBe(true);
  });
  it('sorts pinned first, then upcoming, then past without mutation', () => {
    const items = [{ ...base, id: 1, date: '2026-09-20' }, { ...base, id: 2 }, { ...base, id: 3, pinned: true, date: '2030-01-01' }];
    expect(sortCountdownItems(items, now).map(item => item.id)).toEqual([3, 2, 1]);
    expect(items.map(item => item.id)).toEqual([1, 2, 3]);
  });
  it('rejects invalid records and impossible dates', () => {
    expect(parseCountdownItems([base, null, {}, { ...base, date: '2026-02-30' }, { ...base, date: 'oops' }])).toEqual([base]);
  });
});

describe('reminders', () => {
  const item = { ...base, date: '2026-09-22', reminderDays: [7, 1, 0] };
  it('waits for 9 AM and catches up later that same day', () => {
    expect(dueCountdownReminders([item], [], new Date('2026-09-21T08:59:00'))).toEqual([]);
    expect(dueCountdownReminders([item], [], new Date('2026-09-21T20:00:00'))).toHaveLength(1);
  });
  it('does not repeat a persisted reminder', () => {
    const due = dueCountdownReminders([item], [], now);
    expect(dueCountdownReminders([item], [due[0].key], now)).toEqual([]);
  });
  it('skips archives, disabled reminders and past dates', () => {
    expect(dueCountdownReminders([{ ...item, archived: true }, { ...item, reminderDays: [] }, { ...item, date: '2026-09-20' }], [], now)).toEqual([]);
  });
  it('uses a distinct key for each annual cycle', () => {
    const annual = { ...item, repeat: 'yearly' as const };
    const due = dueCountdownReminders([annual], [], now);
    const next = dueCountdownReminders([annual], [due[0].key], new Date('2027-09-21T10:00:00'));
    expect(next).toHaveLength(1);
    expect(next[0].key).not.toBe(due[0].key);
  });
});
