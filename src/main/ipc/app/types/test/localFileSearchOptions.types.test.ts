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
 * @file localFileSearchOptions.types.test.ts
 * @description LocalFileSearchOptions.ts 的完整公开形状、合法样例、必需可选字段及非法状态契约测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { LocalFileSearchOptions } from "../LocalFileSearchOptions";

/** 固定 LocalFileSearchOptions 的完整公开形状，独立于源类型展开。 */
interface ExpectedLocalFileSearchOptions {
  limit?: number;
  maxDepth?: number;
  includeDirectories?: boolean;
  includeFiles?: boolean;
  includeHidden?: boolean;
  caseSensitive?: boolean;
  matchMode?: 'contains' | 'startsWith' | 'endsWith' | 'exact';
  matchScope?: 'name' | 'path';
  extensions?: string[];
  excludeDirs?: string[];
}

describe("LocalFileSearchOptions.ts 完整类型契约", () => {
  it("LocalFileSearchOptions 完整字段、合法样例与非法状态", () => {
    expectTypeOf<LocalFileSearchOptions>().toEqualTypeOf<ExpectedLocalFileSearchOptions>();
    const legal: LocalFileSearchOptions = { limit: 1, maxDepth: 1, includeDirectories: false, includeFiles: false, includeHidden: false, caseSensitive: false, matchMode: 'contains', matchScope: 'name', extensions: ['fixture'], excludeDirs: ['fixture'] };
    expectTypeOf(legal).toMatchTypeOf<ExpectedLocalFileSearchOptions>();
    expect(legal).toBeDefined();
    const minimal: LocalFileSearchOptions = {  };
    expectTypeOf(minimal).toMatchTypeOf<ExpectedLocalFileSearchOptions>();
    expect(minimal).toBeDefined();
    // @ts-expect-error LocalFileSearchOptions.matchMode 拒绝契约外字段类型或状态。
    const invalid: LocalFileSearchOptions["matchMode"] = 'invalid';
    expect(invalid).toBeDefined();
    expectTypeOf<null>().not.toMatchTypeOf<LocalFileSearchOptions>();
  });
});
