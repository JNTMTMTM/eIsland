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
 * @file extension.types.test.ts
 * @description extension 的跨进程类型契约、合法配置与非法字段约束测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { ExtensionStatus, ExtensionProgressData } from '../extension';
import type { ExtensionStatus as OriginalExtensionStatus, ExtensionProgressData as OriginalExtensionProgressData  } from '../../../shared/extensionTypes';
describe('extension contracts', () => {
  it('retains ExtensionStatus re-export contract', () => {
    expectTypeOf<ExtensionStatus>().toEqualTypeOf<OriginalExtensionStatus>();
    const fixture: ExtensionStatus = { id: 'sample', name: 'sample', description: 'sample', availableVersion: 'sample', installedVersion: null, isInstalled: false, requiredRestart: false };
    expect(fixture).toBeDefined();
    // @ts-expect-error 扩展已安装版本只能是字符串或未安装状态。
    const invalid: ExtensionStatus['installedVersion'] = 123;
    expect(invalid).toBe(123);
  });
  it('retains ExtensionProgressData re-export contract', () => {
    expectTypeOf<ExtensionProgressData>().toEqualTypeOf<OriginalExtensionProgressData>();
    const fixture: ExtensionProgressData = { id: 'sample', progress: 0, transferred: 0, total: 0 };
    expect(fixture).toBeDefined();
  });
});
