/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * Licensed under the GNU General Public License (GPL-3.0 or later).
 */

/**
 * @file calendarHolidayApi.test.ts
 * @description 验证年度缓存、并发去重和失败重试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HOLIDAY_CACHE_MS } from '../config/calendarConfig';

const netFetch = vi.fn();

describe('holiday API', () => {
  beforeEach(() => {
    vi.resetModules();
    netFetch.mockReset();
    vi.stubGlobal('window', { api: { netFetch } });
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('shares concurrent requests and refreshes expired country/year entries', async () => {
    vi.useFakeTimers();
    netFetch.mockResolvedValue({ ok: true, status: 200, body: '[]' });
    const { fetchCalendarHolidays } = await import('./calendarHolidayApi');
    await Promise.all([fetchCalendarHolidays('CN', 2026), fetchCalendarHolidays('CN', 2026)]);
    expect(netFetch).toHaveBeenCalledTimes(1);
    expect(netFetch).toHaveBeenCalledWith('https://nagerholidays.com/api/v4/Holidays/CN/2026', { timeoutMs: 10000 });
    await fetchCalendarHolidays('US', 2026);
    await fetchCalendarHolidays('CN', 2027);
    expect(netFetch).toHaveBeenCalledTimes(3);
    vi.advanceTimersByTime(HOLIDAY_CACHE_MS + 1);
    await fetchCalendarHolidays('CN', 2026);
    expect(netFetch).toHaveBeenCalledTimes(4);
  });

  it('does not cache failures and distinguishes unsupported countries', async () => {
    netFetch.mockResolvedValueOnce({ ok: false, status: 404, body: '' })
      .mockResolvedValueOnce({ ok: false, status: 500, body: '' })
      .mockResolvedValueOnce({ ok: true, status: 204, body: '' });
    const { fetchCalendarHolidays, UnsupportedHolidayCountryError } = await import('./calendarHolidayApi');
    await expect(fetchCalendarHolidays('US', 2026)).rejects.toBeInstanceOf(UnsupportedHolidayCountryError);
    await expect(fetchCalendarHolidays('US', 2026)).rejects.toThrow('500');
    await expect(fetchCalendarHolidays('US', 2026)).resolves.toEqual([]);
    expect(netFetch).toHaveBeenCalledTimes(3);
  });

  it('rejects invalid requests and invalid response bodies', async () => {
    const { fetchCalendarHolidays } = await import('./calendarHolidayApi');
    await expect(fetchCalendarHolidays('../US', 2026)).rejects.toThrow();
    await expect(fetchCalendarHolidays('US', 0)).rejects.toThrow();
    expect(netFetch).not.toHaveBeenCalled();
    netFetch.mockResolvedValue({ ok: true, status: 200, body: '{}' });
    await expect(fetchCalendarHolidays('US', 2026)).rejects.toThrow('Invalid holiday response');
  });

  it('reports unsupported years separately from network failures', async () => {
    netFetch.mockResolvedValue({ ok: false, status: 400, body: '{"errors":{"year":["Not supported"]}}' });
    const { fetchCalendarHolidays, UnsupportedHolidayYearError } = await import('./calendarHolidayApi');
    await expect(fetchCalendarHolidays('US', 2022)).rejects.toBeInstanceOf(UnsupportedHolidayYearError);
  });
});
