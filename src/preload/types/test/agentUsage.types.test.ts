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
 * @file agentUsage.types.test.ts
 * @description agentUsage 的跨进程类型契约、合法快照与非法字段约束测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { AgentUsageProviderId, AgentUsageRateLimits, AgentUsageSnapshot, AgentUsageTokens } from '../agentUsage';
import type { AgentUsageSnapshot as BarrelAgentUsageSnapshot } from '../index';

describe('agentUsage contracts', () => {
  it('固定来源枚举与 token 字段，并从聚合入口原样导出', () => {
    expectTypeOf<AgentUsageProviderId>().toEqualTypeOf<'claude' | 'codex'>();
    expectTypeOf<AgentUsageTokens>().toEqualTypeOf<{ input: number; output: number; cacheRead: number; cacheWrite: number; total: number }>();
    expectTypeOf<BarrelAgentUsageSnapshot>().toEqualTypeOf<AgentUsageSnapshot>();
    // @ts-expect-error 来源只允许 claude/codex。
    const invalid: AgentUsageProviderId = 'gemini';
    expect(invalid).toBe('gemini');
  });

  it('接受含可空额度窗口的合法快照', () => {
    const tokens: AgentUsageTokens = { input: 1, output: 2, cacheRead: 3, cacheWrite: 4, total: 10 };
    const rateLimits: AgentUsageRateLimits = { primary: { usedPercent: 35, windowMinutes: 10080, resetsAt: 1 }, secondary: null, planType: null, updatedAt: 1 };
    const fixture: AgentUsageSnapshot = {
      generatedAt: 1,
      providers: [{ rateLimits, provider: 'codex', available: true, today: tokens, week: tokens, todaySessions: 1, topModel: null }],
    };
    expect(fixture.providers[0].rateLimits?.primary?.usedPercent).toBe(35);
  });
});
