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
 * @file islandDimensions.test.ts
 * @description 共享灵动岛基础尺寸的稳定值与字面量类型契约测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import { ISLAND_HEIGHT, ISLAND_WIDTH } from '../islandDimensions';
describe('shared island dimensions', () => {
  it('keeps the main and renderer base geometry identical', () => {
    expect(ISLAND_WIDTH).toBe(260);
    expect(ISLAND_HEIGHT).toBe(42);
    expectTypeOf<typeof ISLAND_WIDTH>().toEqualTypeOf<260>();
    expectTypeOf<typeof ISLAND_HEIGHT>().toEqualTypeOf<42>();
  });
});
