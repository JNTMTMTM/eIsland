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
 * @file window.types.test.ts
 * @description window 的跨进程类型契约、合法配置与非法字段约束测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { IslandDisplayInfo } from '../window';
describe('window contracts', () => {
  it('fixes IslandDisplayInfo fields and accepts its explicit legal fixture', () => {
    expectTypeOf<IslandDisplayInfo>().toEqualTypeOf<{
      id: string;
      width: number;
      height: number;
      isPrimary: boolean;
    }>();
    const fixture: IslandDisplayInfo = { id: 'sample', width: 0, height: 0, isPrimary: false };
    expect(fixture).toBeDefined();
    // @ts-expect-error IslandDisplayInfo.id 禁止使用契约外字段值。
    const invalid: IslandDisplayInfo['id'] = 123;
    expect(invalid).toBeDefined();
  });
});
