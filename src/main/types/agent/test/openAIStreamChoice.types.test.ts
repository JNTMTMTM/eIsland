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
 * @file openAIStreamChoice.types.test.ts
 * @description OpenAIStreamChoice.ts 的完整公开形状、合法样例、必需可选字段及非法状态契约测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { OpenAIStreamChoice } from "../OpenAIStreamChoice";
import type { OpenAIStreamDelta } from '.././OpenAIStreamDelta';

/** 固定 OpenAIStreamChoice 的完整公开形状，独立于源类型展开。 */
interface ExpectedOpenAIStreamChoice {
  index: number;
  delta: OpenAIStreamDelta;
  finish_reason: string | null;
}

describe("OpenAIStreamChoice.ts 完整类型契约", () => {
  it("OpenAIStreamChoice 完整字段、合法样例与非法状态", () => {
    expectTypeOf<OpenAIStreamChoice>().toEqualTypeOf<ExpectedOpenAIStreamChoice>();
    const legal: OpenAIStreamChoice = { index: 1, delta: { content: 'fixture', reasoning_content: 'fixture', role: 'fixture' }, finish_reason: null };
    expectTypeOf(legal).toMatchTypeOf<ExpectedOpenAIStreamChoice>();
    expect(legal).toBeDefined();
    expectTypeOf<Omit<ExpectedOpenAIStreamChoice, "index">>().not.toMatchTypeOf<OpenAIStreamChoice>();
    expectTypeOf<null>().toMatchTypeOf<OpenAIStreamChoice["finish_reason"]>();
    // @ts-expect-error OpenAIStreamChoice.index 拒绝契约外字段类型或状态。
    const invalid: OpenAIStreamChoice["index"] = 'invalid';
    expect(invalid).toBeDefined();
    expectTypeOf<null>().not.toMatchTypeOf<OpenAIStreamChoice>();
  });
});
