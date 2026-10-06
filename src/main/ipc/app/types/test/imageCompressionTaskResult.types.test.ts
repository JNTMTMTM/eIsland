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
 * @file imageCompressionTaskResult.types.test.ts
 * @description ImageCompressionTaskResult.ts 的完整公开形状、合法样例、必需可选字段及非法状态契约测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { ImageCompressionTaskResult } from "../ImageCompressionTaskResult";

/** 固定 ImageCompressionTaskResult 的完整公开形状，独立于源类型展开。 */
interface ExpectedImageCompressionTaskResult {
  id: string;
  fileName: string;
  inputPath: string;
  outputPath: string;
  quality: number;
  status: 'completed' | 'failed';
  success: boolean;
  originalBytes: number;
  compressedBytes: number;
  ratio: number;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

describe("ImageCompressionTaskResult.ts 完整类型契约", () => {
  it("ImageCompressionTaskResult 完整字段、合法样例与非法状态", () => {
    expectTypeOf<ImageCompressionTaskResult>().toEqualTypeOf<ExpectedImageCompressionTaskResult>();
    const legal: ImageCompressionTaskResult = { id: 'fixture', fileName: 'fixture', inputPath: 'fixture', outputPath: 'fixture', quality: 1, status: 'completed', success: false, originalBytes: 1, compressedBytes: 1, ratio: 1, error: 'fixture', createdAt: 1, updatedAt: 1 };
    expectTypeOf(legal).toMatchTypeOf<ExpectedImageCompressionTaskResult>();
    expect(legal).toBeDefined();
    const minimal: ImageCompressionTaskResult = { id: 'fixture', fileName: 'fixture', inputPath: 'fixture', outputPath: 'fixture', quality: 1, status: 'completed', success: false, originalBytes: 1, compressedBytes: 1, ratio: 1, createdAt: 1, updatedAt: 1 };
    expectTypeOf(minimal).toMatchTypeOf<ExpectedImageCompressionTaskResult>();
    expect(minimal).toBeDefined();
    expectTypeOf<Omit<ExpectedImageCompressionTaskResult, "id">>().not.toMatchTypeOf<ImageCompressionTaskResult>();
    // @ts-expect-error ImageCompressionTaskResult.status 拒绝契约外字段类型或状态。
    const invalid: ImageCompressionTaskResult["status"] = 'invalid';
    expect(invalid).toBeDefined();
    expectTypeOf<null>().not.toMatchTypeOf<ImageCompressionTaskResult>();
  });
});
