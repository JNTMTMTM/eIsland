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
 * @file updater.types.test.ts
 * @description updater 的跨进程类型契约、合法配置与非法字段约束测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { UpdaterCheckResult, UpdaterProgress, UpdaterDownloadedData, UpdaterAvailableData, UpdaterNotAvailableData, UpdaterStartupAutoCheckRequestData } from '../updater';
describe('updater contracts', () => {
  it('fixes UpdaterCheckResult fields and accepts its explicit legal fixture', () => {
    expectTypeOf<UpdaterCheckResult>().toEqualTypeOf<{
      available: boolean;
      version?: string;
      releaseNotes?: string;
      currentVersion?: string;
      error?: string;
    }>();
    const fixture: UpdaterCheckResult = { available: false, version: 'sample', releaseNotes: 'sample', currentVersion: 'sample', error: 'sample' };
    expect(fixture).toBeDefined();
    // @ts-expect-error UpdaterCheckResult.available 禁止使用契约外字段值。
    const invalid: UpdaterCheckResult['available'] = 'invalid';
    expect(invalid).toBeDefined();
  });
  it('fixes UpdaterProgress fields and accepts its explicit legal fixture', () => {
    expectTypeOf<UpdaterProgress>().toEqualTypeOf<{
      percent: number;
      transferred: number;
      total: number;
      bytesPerSecond: number;
    }>();
    const fixture: UpdaterProgress = { percent: 0, transferred: 0, total: 0, bytesPerSecond: 0 };
    expect(fixture).toBeDefined();
    // @ts-expect-error UpdaterProgress.percent 禁止使用契约外字段值。
    const invalid: UpdaterProgress['percent'] = 'invalid';
    expect(invalid).toBeDefined();
  });
  it('fixes UpdaterDownloadedData fields and accepts its explicit legal fixture', () => {
    expectTypeOf<UpdaterDownloadedData>().toEqualTypeOf<{
      version: string;
    }>();
    const fixture: UpdaterDownloadedData = { version: 'sample' };
    expect(fixture).toBeDefined();
    // @ts-expect-error UpdaterDownloadedData.version 禁止使用契约外字段值。
    const invalid: UpdaterDownloadedData['version'] = 123;
    expect(invalid).toBeDefined();
  });
  it('fixes UpdaterAvailableData fields and accepts its explicit legal fixture', () => {
    expectTypeOf<UpdaterAvailableData>().toEqualTypeOf<{
      version: string;
      releaseNotes: string;
    }>();
    const fixture: UpdaterAvailableData = { version: 'sample', releaseNotes: 'sample' };
    expect(fixture).toBeDefined();
    // @ts-expect-error UpdaterAvailableData.version 禁止使用契约外字段值。
    const invalid: UpdaterAvailableData['version'] = 123;
    expect(invalid).toBeDefined();
  });
  it('fixes UpdaterNotAvailableData fields and accepts its explicit legal fixture', () => {
    expectTypeOf<UpdaterNotAvailableData>().toEqualTypeOf<{
      version: string;
    }>();
    const fixture: UpdaterNotAvailableData = { version: 'sample' };
    expect(fixture).toBeDefined();
    // @ts-expect-error UpdaterNotAvailableData.version 禁止使用契约外字段值。
    const invalid: UpdaterNotAvailableData['version'] = 123;
    expect(invalid).toBeDefined();
  });
  it('fixes UpdaterStartupAutoCheckRequestData fields and accepts its explicit legal fixture', () => {
    expectTypeOf<UpdaterStartupAutoCheckRequestData>().toEqualTypeOf<{
      requestedAt: number;
    }>();
    const fixture: UpdaterStartupAutoCheckRequestData = { requestedAt: 0 };
    expect(fixture).toBeDefined();
    // @ts-expect-error UpdaterStartupAutoCheckRequestData.requestedAt 禁止使用契约外字段值。
    const invalid: UpdaterStartupAutoCheckRequestData['requestedAt'] = 'invalid';
    expect(invalid).toBeDefined();
  });
});
