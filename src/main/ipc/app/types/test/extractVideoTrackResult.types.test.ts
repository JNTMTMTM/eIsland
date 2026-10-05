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
 * @file extractVideoTrackResult.types.test.ts
 * @description ExtractVideoTrackResult.ts 的完整公开形状、合法样例、必需可选字段及非法状态契约测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { ExtractVideoTrackResult } from "../ExtractVideoTrackResult";

/** 固定 ExtractVideoTrackResult 的完整公开形状，独立于源类型展开。 */
interface ExpectedExtractVideoTrackResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  fileSize?: number;
}

describe("ExtractVideoTrackResult.ts 完整类型契约", () => {
  it("ExtractVideoTrackResult 完整字段、合法样例与非法状态", () => {
    expectTypeOf<ExtractVideoTrackResult>().toEqualTypeOf<ExpectedExtractVideoTrackResult>();
    const legal: ExtractVideoTrackResult = { success: false, outputPath: 'fixture', error: 'fixture', fileSize: 1 };
    expectTypeOf(legal).toMatchTypeOf<ExpectedExtractVideoTrackResult>();
    expect(legal).toBeDefined();
    const minimal: ExtractVideoTrackResult = { success: false };
    expectTypeOf(minimal).toMatchTypeOf<ExpectedExtractVideoTrackResult>();
    expect(minimal).toBeDefined();
    expectTypeOf<Omit<ExpectedExtractVideoTrackResult, "success">>().not.toMatchTypeOf<ExtractVideoTrackResult>();
    // @ts-expect-error ExtractVideoTrackResult.success 拒绝契约外字段类型或状态。
    const invalid: ExtractVideoTrackResult["success"] = 'invalid';
    expect(invalid).toBeDefined();
    expectTypeOf<null>().not.toMatchTypeOf<ExtractVideoTrackResult>();
  });
});
