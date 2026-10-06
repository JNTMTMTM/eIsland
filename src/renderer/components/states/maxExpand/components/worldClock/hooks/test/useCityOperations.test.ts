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
 * @file useCityOperations.test.ts
 * @description 城市公开增删、时区别名去重和顺序重排的真实状态测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { useCityOperations } from '../useCityOperations';
import { renderWithHooks, resetLifecycle, unmountHooks } from '../../../setting/hooks/test/settingsCoverageHarness';
import type { WorldClockCity } from '../../types/worldClockTypes';
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../test/elementHarness')).hookMocks,
  ...(await import('../../../setting/hooks/test/settingsCoverageHarness')).lifecycleHooks
}));
/**
 * 在真实状态 setter 上调用城市增删 Hook。
 * @returns 列表与公开增删操作。
 */
function view() {
  return renderWithHooks(() => {
    const [cities, setCities] = useState<WorldClockCity[]>([]);
    return { cities, ...useCityOperations(setCities) };
  });
}
beforeEach(() => resetLifecycle());
afterEach(() => unmountHooks());
describe('useCityOperations real city state', () => {
  it('adds unique cities, deduplicates canonical aliases and preserves existing array', () => {
    view().addCity({ timezone: 'America/New_York', label: 'New York', order: 99 });
    const before = view().cities;
    view().addCity({ timezone: 'US/Eastern', label: 'Alias', order: 23 });
    expect(view().cities).toBe(before);
    view().addCity({ timezone: 'UTC', label: 'UTC', order: 24 });
    expect(view().cities).toEqual([
      { timezone: 'America/New_York', label: 'New York', order: 0 },
      { timezone: 'UTC', label: 'UTC', order: 1 }
    ]);
  });
  it('removes exact city identifiers and reindexes remaining cities, including unknown and empty removal', () => {
    view().addCity({ timezone: 'UTC', label: 'UTC', order: 4 });
    view().addCity({ timezone: 'Asia/Shanghai', label: 'Shanghai', order: 4 });
    view().addCity({ timezone: 'Europe/London', label: 'London', order: 4 });
    view().removeCity('Asia/Shanghai');
    expect(view().cities).toEqual([
      { timezone: 'UTC', label: 'UTC', order: 0 },
      { timezone: 'Europe/London', label: 'London', order: 1 }
    ]);
    view().removeCity('missing');
    expect(view().cities).toHaveLength(2);
    view().removeCity('UTC');
    view().removeCity('Europe/London');
    view().removeCity('missing');
    expect(view().cities).toEqual([]);
  });
});
