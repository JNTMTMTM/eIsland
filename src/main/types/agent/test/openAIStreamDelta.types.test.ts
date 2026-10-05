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
 * @file openAIStreamDelta.types.test.ts
 * @description OpenAIStreamDelta.ts 的完整公开形状、合法样例、必需可选字段及非法状态契约测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { OpenAIStreamDelta } from "../OpenAIStreamDelta";

/** 固定 OpenAIStreamDelta 的完整公开形状，独立于源类型展开。 */
interface ExpectedOpenAIStreamDelta {
  content?: string;
  reasoning_content?: string;
  role?: string;
}

describe("OpenAIStreamDelta.ts 完整类型契约", () => {
  it("OpenAIStreamDelta 完整字段、合法样例与非法状态", () => {
    expectTypeOf<OpenAIStreamDelta>().toEqualTypeOf<ExpectedOpenAIStreamDelta>();
    const legal: OpenAIStreamDelta = { content: 'fixture', reasoning_content: 'fixture', role: 'fixture' };
    expectTypeOf(legal).toMatchTypeOf<ExpectedOpenAIStreamDelta>();
    expect(legal).toBeDefined();
    const minimal: OpenAIStreamDelta = {  };
    expectTypeOf(minimal).toMatchTypeOf<ExpectedOpenAIStreamDelta>();
    expect(minimal).toBeDefined();
    // @ts-expect-error OpenAIStreamDelta.role 拒绝契约外字段类型或状态。
    const invalid: OpenAIStreamDelta["role"] = 123;
    expect(invalid).toBeDefined();
    expectTypeOf<null>().not.toMatchTypeOf<OpenAIStreamDelta>();
  });
});
