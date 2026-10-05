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
 * @file mainLogWriter.types.test.ts
 * @description MainLogWriter.ts 的完整公开形状、合法样例、必需可选字段及非法状态契约测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { MainLogWriter } from "../MainLogWriter";

/** 固定 MainLogWriter 的完整公开形状，独立于源类型展开。 */
type ExpectedMainLogWriter = (level: 'info' | 'warn' | 'error', message: string) => void;

describe("MainLogWriter.ts 完整类型契约", () => {
  it("MainLogWriter 完整字段、合法样例与非法状态", () => {
    expectTypeOf<MainLogWriter>().toEqualTypeOf<ExpectedMainLogWriter>();
    const legal: MainLogWriter = () => {};
    expectTypeOf(legal).toMatchTypeOf<ExpectedMainLogWriter>();
    expect(legal).toBeDefined();
    // @ts-expect-error MainLogWriter 拒绝联合以外值或错误的公开结构。
    const invalid: MainLogWriter = 123;
    expect(invalid).toBeDefined();
  });
});
