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
 * @file ollamaOrchestratorRequest.types.test.ts
 * @description OllamaOrchestratorRequest.ts 的完整公开形状、合法样例、必需可选字段及非法状态契约测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { OllamaOrchestratorRequest } from "../OllamaOrchestratorRequest";

/** 固定 OllamaOrchestratorRequest 的完整公开形状，独立于源类型展开。 */
interface ExpectedOllamaOrchestratorRequest {
  model: string;
  systemPrompt: string;
  userMessage: string;
  context?: string;
  baseUrl?: string;
  temperature?: number;
  signal?: AbortSignal;
}

describe("OllamaOrchestratorRequest.ts 完整类型契约", () => {
  it("OllamaOrchestratorRequest 完整字段、合法样例与非法状态", () => {
    expectTypeOf<OllamaOrchestratorRequest>().toEqualTypeOf<ExpectedOllamaOrchestratorRequest>();
    const legal: OllamaOrchestratorRequest = { model: 'fixture', systemPrompt: 'fixture', userMessage: 'fixture', context: 'fixture', baseUrl: 'fixture', temperature: 1, signal: new AbortController().signal };
    expectTypeOf(legal).toMatchTypeOf<ExpectedOllamaOrchestratorRequest>();
    expect(legal).toBeDefined();
    const minimal: OllamaOrchestratorRequest = { model: 'fixture', systemPrompt: 'fixture', userMessage: 'fixture' };
    expectTypeOf(minimal).toMatchTypeOf<ExpectedOllamaOrchestratorRequest>();
    expect(minimal).toBeDefined();
    expectTypeOf<Omit<ExpectedOllamaOrchestratorRequest, "model">>().not.toMatchTypeOf<OllamaOrchestratorRequest>();
    // @ts-expect-error OllamaOrchestratorRequest.model 拒绝契约外字段类型或状态。
    const invalid: OllamaOrchestratorRequest["model"] = 123;
    expect(invalid).toBeDefined();
    expectTypeOf<null>().not.toMatchTypeOf<OllamaOrchestratorRequest>();
  });
});
