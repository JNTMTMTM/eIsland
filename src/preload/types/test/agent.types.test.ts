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
 * @file agent.types.test.ts
 * @description agent 的跨进程类型契约、合法配置与非法字段约束测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { ExecuteAgentLocalToolRequest, ExecuteAgentLocalToolResult, OllamaChatRequest, CustomDirectChatRequest, ChatEvent, ChatStartResult, ChatAbortResult } from '../agent';
describe('agent contracts', () => {
  it('fixes ExecuteAgentLocalToolRequest fields and accepts its explicit legal fixture', () => {
    expectTypeOf<ExecuteAgentLocalToolRequest>().toEqualTypeOf<{
      tool: string;
      arguments?: Record<string, unknown>;
      workspaces?: string[];
    }>();
    const fixture: ExecuteAgentLocalToolRequest = { tool: 'sample', arguments: {}, workspaces: [] };
    expect(fixture).toBeDefined();
    // @ts-expect-error ExecuteAgentLocalToolRequest.tool 禁止使用契约外字段值。
    const invalid: ExecuteAgentLocalToolRequest['tool'] = 123;
    expect(invalid).toBeDefined();
  });
  it('fixes ExecuteAgentLocalToolResult fields and accepts its explicit legal fixture', () => {
    expectTypeOf<ExecuteAgentLocalToolResult>().toEqualTypeOf<{
      success: boolean;
      result: unknown;
      error: string;
      durationMs: number;
    }>();
    const fixture: ExecuteAgentLocalToolResult = { success: false, result: {}, error: 'sample', durationMs: 0 };
    expect(fixture).toBeDefined();
    // @ts-expect-error ExecuteAgentLocalToolResult.success 禁止使用契约外字段值。
    const invalid: ExecuteAgentLocalToolResult['success'] = 'invalid';
    expect(invalid).toBeDefined();
  });
  it('fixes OllamaChatRequest fields and accepts its explicit legal fixture', () => {
    expectTypeOf<OllamaChatRequest>().toEqualTypeOf<{
      model: string;
      systemPrompt: string;
      userMessage: string;
      context?: string;
      baseUrl?: string;
      temperature?: number;
    }>();
    const fixture: OllamaChatRequest = { model: 'sample', systemPrompt: 'sample', userMessage: 'sample', context: 'sample', baseUrl: 'sample', temperature: 0 };
    expect(fixture).toBeDefined();
    // @ts-expect-error OllamaChatRequest.model 禁止使用契约外字段值。
    const invalid: OllamaChatRequest['model'] = 123;
    expect(invalid).toBeDefined();
  });
  it('fixes CustomDirectChatRequest fields and accepts its explicit legal fixture', () => {
    expectTypeOf<CustomDirectChatRequest>().toEqualTypeOf<{
      model: string;
      systemPrompt: string;
      userMessage: string;
      context?: string;
      baseUrl: string;
      apiKey: string;
      temperature?: number;
    }>();
    const fixture: CustomDirectChatRequest = { model: 'sample', systemPrompt: 'sample', userMessage: 'sample', context: 'sample', baseUrl: 'sample', apiKey: 'sample', temperature: 0 };
    expect(fixture).toBeDefined();
    // @ts-expect-error CustomDirectChatRequest.model 禁止使用契约外字段值。
    const invalid: CustomDirectChatRequest['model'] = 123;
    expect(invalid).toBeDefined();
  });
  it('fixes ChatEvent fields and accepts its explicit legal fixture', () => {
    expectTypeOf<ChatEvent>().toEqualTypeOf<{
      type: string;
      payload: Record<string, unknown>;
    }>();
    const fixture: ChatEvent = { type: 'sample', payload: {} };
    expect(fixture).toBeDefined();
    // @ts-expect-error ChatEvent.type 禁止使用契约外字段值。
    const invalid: ChatEvent['type'] = 123;
    expect(invalid).toBeDefined();
  });
  it('fixes ChatStartResult fields and accepts its explicit legal fixture', () => {
    expectTypeOf<ChatStartResult>().toEqualTypeOf<{
      started: boolean;
      sessionId: string;
    }>();
    const fixture: ChatStartResult = { started: false, sessionId: 'sample' };
    expect(fixture).toBeDefined();
    // @ts-expect-error ChatStartResult.started 禁止使用契约外字段值。
    const invalid: ChatStartResult['started'] = 'invalid';
    expect(invalid).toBeDefined();
  });
  it('fixes ChatAbortResult fields and accepts its explicit legal fixture', () => {
    expectTypeOf<ChatAbortResult>().toEqualTypeOf<{
      aborted: boolean;
    }>();
    const fixture: ChatAbortResult = { aborted: false };
    expect(fixture).toBeDefined();
    // @ts-expect-error ChatAbortResult.aborted 禁止使用契约外字段值。
    const invalid: ChatAbortResult['aborted'] = 'invalid';
    expect(invalid).toBeDefined();
  });
});
