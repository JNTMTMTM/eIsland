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
 * @file useIslandStartupAnnouncements.test.ts
 * @description 启动公告指纹标记单元测试
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../store/isLandStore', () => ({ default: { getState: vi.fn() } }));
vi.mock('../../../utils/SvgIcon', () => ({ SvgIcon: {} }));
vi.mock('../../../api/weather/weatherApi', () => ({ fetchStartupWeatherAlerts: vi.fn() }));
vi.mock('../../../api/user/userAccountApi', () => ({ fetchUpdateSourceUrl: vi.fn() }));
vi.mock('../../../api/announcement/announcementApi', () => ({}));
vi.mock('../../../utils/userAccount', () => ({ readLocalToken: vi.fn() }));
vi.mock('../../config/dynamicIslandConfig', () => ({
  UPDATE_SOURCE_STORE_KEY: 'update-source',
  UPDATE_AUTO_PROMPT_STORE_KEY: 'update-auto-prompt',
  WEATHER_ALERT_ENABLED_STORE_KEY: 'weather-alert-enabled',
  normalizeUpdateSource: vi.fn(),
  isProOnlyUpdateSource: vi.fn(),
  getRoleFromToken: vi.fn(),
}));

import { createAnnouncementShownMarker } from '../useIslandStartupAnnouncements';

describe('createAnnouncementShownMarker', () => {
  it('is stable across list ordering', () => {
    const first = createAnnouncementShownMarker('26.6.5', [
      { id: 2, title: 'B', content: '', updatedAt: '2026-08-03T02:00:00Z' },
      { id: 1, title: 'A', content: '', updatedAt: '2026-08-03T01:00:00Z' },
    ]);
    const second = createAnnouncementShownMarker('26.6.5', [
      { id: 1, title: 'A', content: '', updatedAt: '2026-08-03T01:00:00Z' },
      { id: 2, title: 'B', content: '', updatedAt: '2026-08-03T02:00:00Z' },
    ]);

    expect(first).toBe(second);
  });

  it('changes when an announcement is added or updated in the same app version', () => {
    const original = createAnnouncementShownMarker('26.6.5', [
      { id: 1, title: 'A', content: '', updatedAt: '2026-08-03T01:00:00Z' },
    ]);
    const updated = createAnnouncementShownMarker('26.6.5', [
      { id: 1, title: 'A', content: '', updatedAt: '2026-08-03T02:00:00Z' },
    ]);
    const added = createAnnouncementShownMarker('26.6.5', [
      { id: 1, title: 'A', content: '', updatedAt: '2026-08-03T01:00:00Z' },
      { id: 2, title: 'B', content: '', updatedAt: '2026-08-03T01:00:00Z' },
    ]);

    expect(updated).not.toBe(original);
    expect(added).not.toBe(original);
    expect(original).not.toBe('26.6.5');
  });
});