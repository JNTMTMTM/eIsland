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
 * @file ollamaChatRequest.types.test.ts
 * @description OllamaChatRequest.ts 的完整公开形状、合法样例、必需可选字段及非法状态契约测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { OllamaChatRequest } from "../OllamaChatRequest";
import type { OllamaChatMessage } from '.././OllamaChatMessage';

/** 固定 OllamaChatRequest 的完整公开形状，独立于源类型展开。 */
interface ExpectedOllamaChatRequest {
  model: string;
  messages: OllamaChatMessage[];
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  baseUrl?: string;
  signal?: AbortSignal;
}

describe("OllamaChatRequest.ts 完整类型契约", () => {
  it("OllamaChatRequest 完整字段、合法样例与非法状态", () => {
    expectTypeOf<OllamaChatRequest>().toEqualTypeOf<ExpectedOllamaChatRequest>();
    const legal: OllamaChatRequest = { model: 'fixture', messages: [{ role: 'system', content: 'fixture' }], stream: false, temperature: 1, top_p: 1, max_tokens: 1, baseUrl: 'fixture', signal: new AbortController().signal };
    expectTypeOf(legal).toMatchTypeOf<ExpectedOllamaChatRequest>();
    expect(legal).toBeDefined();
    const minimal: OllamaChatRequest = { model: 'fixture', messages: [{ role: 'system', content: 'fixture' }] };
    expectTypeOf(minimal).toMatchTypeOf<ExpectedOllamaChatRequest>();
    expect(minimal).toBeDefined();
    expectTypeOf<Omit<ExpectedOllamaChatRequest, "model">>().not.toMatchTypeOf<OllamaChatRequest>();
    // @ts-expect-error OllamaChatRequest.model 拒绝契约外字段类型或状态。
    const invalid: OllamaChatRequest["model"] = 123;
    expect(invalid).toBeDefined();
    expectTypeOf<null>().not.toMatchTypeOf<OllamaChatRequest>();
  });
});
