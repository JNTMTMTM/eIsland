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
 * @file claudeCodeHeatmapDailyCount.types.test.ts
 * @description ClaudeCodeHeatmapDailyCount.ts 的完整公开形状、合法样例、必需可选字段及非法状态契约测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { ClaudeCodeHeatmapDailyCount, ClaudeCodeHeatmapDaily } from "../ClaudeCodeHeatmapDailyCount";

/** 固定 ClaudeCodeHeatmapDailyCount 的完整公开形状，独立于源类型展开。 */
interface ExpectedClaudeCodeHeatmapDailyCount {
  session: number;
  tool: number;
  prompt: number;
}

/** 固定 ClaudeCodeHeatmapDaily 的完整公开形状，独立于源类型展开。 */
type ExpectedClaudeCodeHeatmapDaily = Record<string, ExpectedClaudeCodeHeatmapDailyCount>;

describe("ClaudeCodeHeatmapDailyCount.ts 完整类型契约", () => {
  it("ClaudeCodeHeatmapDailyCount 完整字段、合法样例与非法状态", () => {
    expectTypeOf<ClaudeCodeHeatmapDailyCount>().toEqualTypeOf<ExpectedClaudeCodeHeatmapDailyCount>();
    const legal: ClaudeCodeHeatmapDailyCount = { session: 1, tool: 1, prompt: 1 };
    expectTypeOf(legal).toMatchTypeOf<ExpectedClaudeCodeHeatmapDailyCount>();
    expect(legal).toBeDefined();
    expectTypeOf<Omit<ExpectedClaudeCodeHeatmapDailyCount, "session">>().not.toMatchTypeOf<ClaudeCodeHeatmapDailyCount>();
    // @ts-expect-error ClaudeCodeHeatmapDailyCount.session 拒绝契约外字段类型或状态。
    const invalid: ClaudeCodeHeatmapDailyCount["session"] = 'invalid';
    expect(invalid).toBeDefined();
    expectTypeOf<null>().not.toMatchTypeOf<ClaudeCodeHeatmapDailyCount>();
  });
  it("ClaudeCodeHeatmapDaily 完整字段、合法样例与非法状态", () => {
    expectTypeOf<ClaudeCodeHeatmapDaily>().toEqualTypeOf<ExpectedClaudeCodeHeatmapDaily>();
    const legal: ClaudeCodeHeatmapDaily = {};
    expectTypeOf(legal).toMatchTypeOf<ExpectedClaudeCodeHeatmapDaily>();
    expect(legal).toBeDefined();
    // @ts-expect-error ClaudeCodeHeatmapDaily 拒绝联合以外值或错误的公开结构。
    const invalid: ClaudeCodeHeatmapDaily = { date: 123 };
    expect(invalid).toBeDefined();
  });
});
