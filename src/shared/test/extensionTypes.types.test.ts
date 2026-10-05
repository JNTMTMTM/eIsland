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
 * @file extensionTypes.types.test.ts
 * @description extensionTypes 的跨进程类型契约、合法配置与非法字段约束测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { ExtensionStatus, ExtensionProgressData } from '../extensionTypes';
describe('extensionTypes contracts', () => {
  it('fixes ExtensionStatus fields and accepts its explicit legal fixture', () => {
    expectTypeOf<ExtensionStatus>().toEqualTypeOf<{
      id: string;
      name: string;
      description: string;
      availableVersion: string;
      installedVersion: string | null;
      isInstalled: boolean;
      requiredRestart: boolean;
    }>();
    const fixture: ExtensionStatus = { id: 'sample', name: 'sample', description: 'sample', availableVersion: 'sample', installedVersion: null, isInstalled: false, requiredRestart: false };
    expect(fixture).toBeDefined();
    // @ts-expect-error ExtensionStatus.id 禁止使用契约外字段值。
    const invalid: ExtensionStatus['id'] = 123;
    expect(invalid).toBeDefined();
  });
  it('fixes ExtensionProgressData fields and accepts its explicit legal fixture', () => {
    expectTypeOf<ExtensionProgressData>().toEqualTypeOf<{
      id: string;
      progress: number;
      transferred: number;
      total: number;
    }>();
    const fixture: ExtensionProgressData = { id: 'sample', progress: 0, transferred: 0, total: 0 };
    expect(fixture).toBeDefined();
    // @ts-expect-error ExtensionProgressData.id 禁止使用契约外字段值。
    const invalid: ExtensionProgressData['id'] = 123;
    expect(invalid).toBeDefined();
  });
});
