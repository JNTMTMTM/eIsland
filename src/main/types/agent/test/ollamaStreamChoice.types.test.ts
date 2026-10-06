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
 * @file ollamaStreamChoice.types.test.ts
 * @description OllamaStreamChoice.ts 的完整公开形状、合法样例、必需可选字段及非法状态契约测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { OllamaStreamChoice } from "../OllamaStreamChoice";
import type { OllamaStreamDelta } from '.././OllamaStreamDelta';

/** 固定 OllamaStreamChoice 的完整公开形状，独立于源类型展开。 */
interface ExpectedOllamaStreamChoice {
  index: number;
  delta: OllamaStreamDelta;
  finish_reason: string | null;
}

describe("OllamaStreamChoice.ts 完整类型契约", () => {
  it("OllamaStreamChoice 完整字段、合法样例与非法状态", () => {
    expectTypeOf<OllamaStreamChoice>().toEqualTypeOf<ExpectedOllamaStreamChoice>();
    const legal: OllamaStreamChoice = { index: 1, delta: { content: 'fixture', role: 'fixture' }, finish_reason: null };
    expectTypeOf(legal).toMatchTypeOf<ExpectedOllamaStreamChoice>();
    expect(legal).toBeDefined();
    expectTypeOf<Omit<ExpectedOllamaStreamChoice, "index">>().not.toMatchTypeOf<OllamaStreamChoice>();
    expectTypeOf<null>().toMatchTypeOf<OllamaStreamChoice["finish_reason"]>();
    // @ts-expect-error OllamaStreamChoice.index 拒绝契约外字段类型或状态。
    const invalid: OllamaStreamChoice["index"] = 'invalid';
    expect(invalid).toBeDefined();
    expectTypeOf<null>().not.toMatchTypeOf<OllamaStreamChoice>();
  });
});
