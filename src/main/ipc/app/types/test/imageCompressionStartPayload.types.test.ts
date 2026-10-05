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
 * @file imageCompressionStartPayload.types.test.ts
 * @description ImageCompressionStartPayload.ts 的完整公开形状、合法样例、必需可选字段及非法状态契约测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { ImageCompressionStartPayload } from "../ImageCompressionStartPayload";

/** 固定 ImageCompressionStartPayload 的完整公开形状，独立于源类型展开。 */
interface ExpectedImageCompressionStartPayload {
  inputPaths?: unknown;
  outputDir?: unknown;
  quality?: unknown;
}

describe("ImageCompressionStartPayload.ts 完整类型契约", () => {
  it("ImageCompressionStartPayload 完整字段、合法样例与非法状态", () => {
    expectTypeOf<ImageCompressionStartPayload>().toEqualTypeOf<ExpectedImageCompressionStartPayload>();
    const legal: ImageCompressionStartPayload = { inputPaths: { raw: 'fixture' }, outputDir: { raw: 'fixture' }, quality: { raw: 'fixture' } };
    expectTypeOf(legal).toMatchTypeOf<ExpectedImageCompressionStartPayload>();
    expect(legal).toBeDefined();
    const minimal: ImageCompressionStartPayload = {  };
    expectTypeOf(minimal).toMatchTypeOf<ExpectedImageCompressionStartPayload>();
    expect(minimal).toBeDefined();
    // @ts-expect-error 未知值载荷允许任意字段值，但拒绝未声明的顶层字段。
    const invalid: ImageCompressionStartPayload = { unexpectedField: true };
    expect(invalid).toBeDefined();
    expectTypeOf<null>().not.toMatchTypeOf<ImageCompressionStartPayload>();
  });
});
