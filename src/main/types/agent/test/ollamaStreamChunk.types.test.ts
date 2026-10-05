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
 * @file ollamaStreamChunk.types.test.ts
 * @description OllamaStreamChunk.ts 的完整公开形状、合法样例、必需可选字段及非法状态契约测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { OllamaStreamChunk } from "../OllamaStreamChunk";
import type { OllamaStreamChoice } from '.././OllamaStreamChoice';

/** 固定 OllamaStreamChunk 的完整公开形状，独立于源类型展开。 */
interface ExpectedOllamaStreamChunk {
  id?: string;
  object?: string;
  model?: string;
  choices: OllamaStreamChoice[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

describe("OllamaStreamChunk.ts 完整类型契约", () => {
  it("OllamaStreamChunk 完整字段、合法样例与非法状态", () => {
    expectTypeOf<OllamaStreamChunk>().toEqualTypeOf<ExpectedOllamaStreamChunk>();
    const legal: OllamaStreamChunk = { id: 'fixture', object: 'fixture', model: 'fixture', choices: [{ index: 1, delta: { content: 'fixture', role: 'fixture' }, finish_reason: null }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 1 } };
    expectTypeOf(legal).toMatchTypeOf<ExpectedOllamaStreamChunk>();
    expect(legal).toBeDefined();
    const minimal: OllamaStreamChunk = { choices: [{ index: 1, delta: {  }, finish_reason: null }] };
    expectTypeOf(minimal).toMatchTypeOf<ExpectedOllamaStreamChunk>();
    expect(minimal).toBeDefined();
    expectTypeOf<Omit<ExpectedOllamaStreamChunk, "choices">>().not.toMatchTypeOf<OllamaStreamChunk>();
    // @ts-expect-error OllamaStreamChunk.id 拒绝契约外字段类型或状态。
    const invalid: OllamaStreamChunk["id"] = 123;
    expect(invalid).toBeDefined();
    expectTypeOf<null>().not.toMatchTypeOf<OllamaStreamChunk>();
  });
});
