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
 * @file customDirectOrchestratorRequest.types.test.ts
 * @description CustomDirectOrchestratorRequest.ts 的完整公开形状、合法样例、必需可选字段及非法状态契约测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { CustomDirectOrchestratorRequest } from "../CustomDirectOrchestratorRequest";

/** 固定 CustomDirectOrchestratorRequest 的完整公开形状，独立于源类型展开。 */
interface ExpectedCustomDirectOrchestratorRequest {
  model: string;
  systemPrompt: string;
  userMessage: string;
  context?: string;
  baseUrl: string;
  apiKey: string;
  temperature?: number;
  signal?: AbortSignal;
}

describe("CustomDirectOrchestratorRequest.ts 完整类型契约", () => {
  it("CustomDirectOrchestratorRequest 完整字段、合法样例与非法状态", () => {
    expectTypeOf<CustomDirectOrchestratorRequest>().toEqualTypeOf<ExpectedCustomDirectOrchestratorRequest>();
    const legal: CustomDirectOrchestratorRequest = { model: 'fixture', systemPrompt: 'fixture', userMessage: 'fixture', context: 'fixture', baseUrl: 'fixture', apiKey: 'fixture', temperature: 1, signal: new AbortController().signal };
    expectTypeOf(legal).toMatchTypeOf<ExpectedCustomDirectOrchestratorRequest>();
    expect(legal).toBeDefined();
    const minimal: CustomDirectOrchestratorRequest = { model: 'fixture', systemPrompt: 'fixture', userMessage: 'fixture', baseUrl: 'fixture', apiKey: 'fixture' };
    expectTypeOf(minimal).toMatchTypeOf<ExpectedCustomDirectOrchestratorRequest>();
    expect(minimal).toBeDefined();
    expectTypeOf<Omit<ExpectedCustomDirectOrchestratorRequest, "model">>().not.toMatchTypeOf<CustomDirectOrchestratorRequest>();
    // @ts-expect-error CustomDirectOrchestratorRequest.model 拒绝契约外字段类型或状态。
    const invalid: CustomDirectOrchestratorRequest["model"] = 123;
    expect(invalid).toBeDefined();
    expectTypeOf<null>().not.toMatchTypeOf<CustomDirectOrchestratorRequest>();
  });
});
