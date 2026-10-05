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
 * @file imageCompressionStartResult.types.test.ts
 * @description ImageCompressionStartResult.ts 的完整公开形状、合法样例、必需可选字段及非法状态契约测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { ImageCompressionStartResult } from "../ImageCompressionStartResult";
import type { ImageCompressionTaskResult } from '.././ImageCompressionTaskResult';

/** 固定 ImageCompressionStartResult 的完整公开形状，独立于源类型展开。 */
interface ExpectedImageCompressionStartResult {
  ok: boolean;
  results?: ImageCompressionTaskResult[];
  message?: string;
}

describe("ImageCompressionStartResult.ts 完整类型契约", () => {
  it("ImageCompressionStartResult 完整字段、合法样例与非法状态", () => {
    expectTypeOf<ImageCompressionStartResult>().toEqualTypeOf<ExpectedImageCompressionStartResult>();
    const legal: ImageCompressionStartResult = { ok: false, results: [{ id: 'fixture', fileName: 'fixture', inputPath: 'fixture', outputPath: 'fixture', quality: 1, status: 'completed', success: false, originalBytes: 1, compressedBytes: 1, ratio: 1, error: 'fixture', createdAt: 1, updatedAt: 1 }], message: 'fixture' };
    expectTypeOf(legal).toMatchTypeOf<ExpectedImageCompressionStartResult>();
    expect(legal).toBeDefined();
    const minimal: ImageCompressionStartResult = { ok: false };
    expectTypeOf(minimal).toMatchTypeOf<ExpectedImageCompressionStartResult>();
    expect(minimal).toBeDefined();
    expectTypeOf<Omit<ExpectedImageCompressionStartResult, "ok">>().not.toMatchTypeOf<ImageCompressionStartResult>();
    // @ts-expect-error ImageCompressionStartResult.ok 拒绝契约外字段类型或状态。
    const invalid: ImageCompressionStartResult["ok"] = 'invalid';
    expect(invalid).toBeDefined();
    expectTypeOf<null>().not.toMatchTypeOf<ImageCompressionStartResult>();
  });
});
