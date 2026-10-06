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
 * @file navigation.types.test.ts
 * @description navigation 的跨进程类型契约、合法配置与非法字段约束测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { NavOrderPayload } from '../navigation';
describe('navigation contracts', () => {
  it('fixes NavOrderPayload fields and accepts its explicit legal fixture', () => {
    expectTypeOf<NavOrderPayload>().toEqualTypeOf<{
      visibleOrder: string[];
      hiddenOrder: string[];
    }>();
    const fixture: NavOrderPayload = { visibleOrder: [], hiddenOrder: [] };
    expect(fixture).toBeDefined();
  });
});
