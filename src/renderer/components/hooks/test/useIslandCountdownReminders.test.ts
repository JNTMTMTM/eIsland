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
 * @file useIslandCountdownReminders.test.ts
 * @description 验证全局提醒的持久化去重、保存失败重试与生命周期清理。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useIslandCountdownReminders } from '../useIslandCountdownReminders';

const fixture = vi.hoisted(() => ({
  items: [{ id: 1, name: 'Launch', date: '2026-09-22', color: '#69c0ff', type: 'countdown', reminderDays: [1, 0] }],
  cleanups: [] as Array<() => void>,
}));
vi.mock('react', () => ({
  useEffect: (effect: () => (() => void) | undefined) => {
    const cleanup = effect();
    if (cleanup) fixture.cleanups.push(cleanup);
  },
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../states/maxExpand/components/countdown/hooks/useCountdownItems', () => ({
  useCountdownItems: () => ({ loaded: true, items: fixture.items }),
}));
vi.mock('../../../utils/SvgIcon', () => ({ SvgIcon: { TIMER: 'timer' } }));

describe('global countdown reminder lifecycle', () => {
  let ledger: unknown;
  const notify = vi.fn();
  const write = vi.fn();
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-21T10:00:00'));
    ledger = null;
    notify.mockReset();
    write.mockReset().mockImplementation(async (_key: string, value: unknown) => { ledger = value; return true; });
    vi.stubGlobal('window', {
      api: { storeRead: vi.fn(async () => ledger), storeWrite: write },
      setInterval, clearInterval, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    });
    vi.stubGlobal('document', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
  });
  afterEach(() => {
    fixture.cleanups.splice(0).forEach(cleanup => cleanup());
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('notifies once and persists deduplication across remounts', async () => {
    useIslandCountdownReminders({ current: notify });
    await vi.advanceTimersByTimeAsync(0);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(ledger).toEqual({ date: '2026-09-21', keys: ['1:2026-09-22:1'] });
    await vi.advanceTimersByTimeAsync(60000);
    fixture.cleanups.splice(0).forEach(cleanup => cleanup());
    useIslandCountdownReminders({ current: notify });
    await vi.advanceTimersByTimeAsync(0);
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('retries failed persistence without losing the reminder', async () => {
    write.mockResolvedValueOnce(false);
    useIslandCountdownReminders({ current: notify });
    await vi.advanceTimersByTimeAsync(0);
    expect(notify).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(30000);
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('uses a new reminder key for the event day', async () => {
    useIslandCountdownReminders({ current: notify });
    await vi.advanceTimersByTimeAsync(0);
    vi.setSystemTime(new Date('2026-09-22T10:00:00'));
    await vi.advanceTimersByTimeAsync(30000);
    expect(notify).toHaveBeenCalledTimes(2);
    expect(ledger).toEqual({ date: '2026-09-22', keys: ['1:2026-09-22:0'] });
  });

  it('cancels pending work and timers on unmount', async () => {
    useIslandCountdownReminders({ current: notify });
    fixture.cleanups.splice(0).forEach(cleanup => cleanup());
    await vi.advanceTimersByTimeAsync(60000);
    expect(notify).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });
});
