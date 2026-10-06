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
 * @file openAIChatRequest.types.test.ts
 * @description OpenAIChatRequest.ts 的完整公开形状、合法样例、必需可选字段及非法状态契约测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { OpenAIChatRequest } from "../OpenAIChatRequest";
import type { OpenAIChatMessage } from '.././OpenAIChatMessage';

/** 固定 OpenAIChatRequest 的完整公开形状，独立于源类型展开。 */
interface ExpectedOpenAIChatRequest {
  model: string;
  messages: OpenAIChatMessage[];
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  baseUrl: string;
  apiKey: string;
  signal?: AbortSignal;
}

describe("OpenAIChatRequest.ts 完整类型契约", () => {
  it("OpenAIChatRequest 完整字段、合法样例与非法状态", () => {
    expectTypeOf<OpenAIChatRequest>().toEqualTypeOf<ExpectedOpenAIChatRequest>();
    const legal: OpenAIChatRequest = { model: 'fixture', messages: [{ role: 'system', content: 'fixture' }], stream: false, temperature: 1, top_p: 1, max_tokens: 1, baseUrl: 'fixture', apiKey: 'fixture', signal: new AbortController().signal };
    expectTypeOf(legal).toMatchTypeOf<ExpectedOpenAIChatRequest>();
    expect(legal).toBeDefined();
    const minimal: OpenAIChatRequest = { model: 'fixture', messages: [{ role: 'system', content: 'fixture' }], baseUrl: 'fixture', apiKey: 'fixture' };
    expectTypeOf(minimal).toMatchTypeOf<ExpectedOpenAIChatRequest>();
    expect(minimal).toBeDefined();
    expectTypeOf<Omit<ExpectedOpenAIChatRequest, "model">>().not.toMatchTypeOf<OpenAIChatRequest>();
    // @ts-expect-error OpenAIChatRequest.model 拒绝契约外字段类型或状态。
    const invalid: OpenAIChatRequest["model"] = 123;
    expect(invalid).toBeDefined();
    expectTypeOf<null>().not.toMatchTypeOf<OpenAIChatRequest>();
  });
});
