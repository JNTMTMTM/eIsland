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
 * @file agentUsageService.test.ts
 * @description Agent 用量服务的日志解析、去重、增量读取、统计窗口与 Codex 额度测试。
 * @author 鸡哥
 */

import { appendFileSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createAgentUsageService, createCodexParseState, parseClaudeUsageLine, parseCodexUsageLine } from '../agentUsageService';

const NOW = new Date(2026, 9, 30, 12, 0, 0).getTime();
const iso = (daysAgo: number, hour = 10): string => new Date(2026, 9, 30 - daysAgo, hour, 0, 0).toISOString();

function claudeLine(id: string, timestamp: string, usage: Record<string, number>, message: Record<string, unknown> = {}): string {
  return JSON.stringify({
    timestamp,
    type: 'assistant',
    requestId: `req_${id}`,
    sessionId: 's1',
    message: { usage, id: `msg_${id}`, model: 'claude-opus-5-5', ...message },
  });
}

function codexTokenLine(timestamp: string, total: Record<string, number>, last: Record<string, number> = total, rateLimits?: Record<string, unknown>): string {
  return JSON.stringify({ timestamp, type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: total, last_token_usage: last }, rate_limits: rateLimits } });
}

let root = '';
let claudeDir = '';
let codexDir = '';

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'agent-usage-'));
  claudeDir = join(root, 'claude', 'projects', 'p1');
  codexDir = join(root, 'codex', 'sessions', '2026', '10', '30');
  mkdirSync(claudeDir, { recursive: true });
  mkdirSync(codexDir, { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function service(): ReturnType<typeof createAgentUsageService> {
  return createAgentUsageService({
    claudeProjectsPath: join(root, 'claude', 'projects'),
    codexSessionsPath: join(root, 'codex', 'sessions'),
    now: () => NOW,
  });
}

describe('parseClaudeUsageLine', () => {
  it('解析 assistant 用量，排除非 assistant、无用量与坏行', () => {
    const record = parseClaudeUsageLine(claudeLine('a', iso(0), { input_tokens: 1, output_tokens: 2, cache_read_input_tokens: 3, cache_creation_input_tokens: 4 }));
    expect(record).toMatchObject({
      key: 'claude:msg_a:req_a',
      sessionId: 's1',
      model: 'claude-opus-5-5',
      tokens: { input: 1, output: 2, cacheRead: 3, cacheWrite: 4, total: 10 },
    });
    expect(parseClaudeUsageLine(JSON.stringify({ type: 'user', timestamp: iso(0), message: { usage: { input_tokens: 1 } } }))).toBeNull();
    expect(parseClaudeUsageLine(claudeLine('b', iso(0), { input_tokens: 0, output_tokens: 0 }))).toBeNull();
    expect(parseClaudeUsageLine('{"usage": broken')).toBeNull();
    expect(parseClaudeUsageLine(claudeLine('c', iso(0), { output_tokens: 1 }, { model: '<synthetic>' }))?.model).toBeNull();
  });
});

describe('parseCodexUsageLine', () => {
  it('按累计值求差，重复上报不重复计数，累计回退时使用单轮用量，并记录模型、会话和额度', () => {
    let state = createCodexParseState('file');
    const step = (line: string, key: string) => {
      const result = parseCodexUsageLine(line, state, key);
      ({ state } = result);
      return result.record;
    };
    expect(step(JSON.stringify({ type: 'session_meta', payload: { id: 'sess' } }), 'k0')).toBeNull();
    expect(step(JSON.stringify({ type: 'turn_context', payload: { model: 'gpt-x' } }), 'k1')).toBeNull();
    expect(step(codexTokenLine(iso(0), { input_tokens: 100, cached_input_tokens: 60, output_tokens: 10 }), 'k2'))
      .toMatchObject({ sessionId: 'sess', model: 'gpt-x', tokens: { input: 40, cacheRead: 60, output: 10, total: 110 } });
    expect(step(codexTokenLine(iso(0), { input_tokens: 100, cached_input_tokens: 60, output_tokens: 10 }), 'k3')).toBeNull();

    const second = step(codexTokenLine(iso(0), { input_tokens: 150, cached_input_tokens: 80, output_tokens: 15 }, undefined, {
      primary: { used_percent: 120, window_minutes: 300, resets_at: 2000 },
      secondary: { used_percent: 12.5 },
      plan_type: 'plus',
    }), 'k4');
    expect(second?.tokens).toEqual({ input: 30, cacheRead: 20, output: 5, cacheWrite: 0, total: 55 });
    expect(state.rateLimits).toMatchObject({
      primary: { usedPercent: 100, windowMinutes: 300, resetsAt: 2_000_000 },
      secondary: { usedPercent: 12.5, windowMinutes: null, resetsAt: null },
      planType: 'plus',
    });

    expect(step(codexTokenLine(iso(0), { input_tokens: 5, output_tokens: 1 }), 'k5')?.tokens.total).toBe(6);
    expect(step(JSON.stringify({ type: 'event_msg', timestamp: iso(0), payload: { type: 'token_count', info: null } }), 'k6')).toBeNull();
    expect(state.rateLimits?.planType).toBe('plus');
  });

  it('不修改传入状态', () => {
    const state = createCodexParseState('file');
    const { state: next } = parseCodexUsageLine(JSON.stringify({ type: 'turn_context', payload: { model: 'gpt-x' } }), state, 'k');
    expect(state.model).toBeNull();
    expect(next.model).toBe('gpt-x');
  });
});

describe('createAgentUsageService', () => {
  it('汇总今日与 7 天用量，跨文件去重并忽略窗口外记录', async () => {
    const usage = { input_tokens: 1, output_tokens: 9 };
    writeFileSync(join(claudeDir, 'a.jsonl'), `${[
      claudeLine('1', iso(0), usage),
      claudeLine('1', iso(0), usage),
      claudeLine('2', iso(3), usage),
      claudeLine('3', iso(7), usage),
    ].join('\n')}\n`);
    writeFileSync(join(claudeDir, 'b.jsonl'), `${claudeLine('1', iso(0), usage)}\n`);
    writeFileSync(join(codexDir, 'r.jsonl'), `${[
      JSON.stringify({ type: 'session_meta', payload: { id: 'c1' } }),
      codexTokenLine(iso(0), { input_tokens: 10, output_tokens: 5 }, undefined, {
        primary: { used_percent: 34, window_minutes: 10080, resets_at: 100 },
        plan_type: 'pro',
      }),
    ].join('\n')}\n`);

    const [claude, codex] = (await service().getSnapshot()).providers;
    expect(claude).toMatchObject({ provider: 'claude', available: true, todaySessions: 1, topModel: 'claude-opus-5-5', rateLimits: null });
    expect(claude.today.total).toBe(10);
    expect(claude.week.total).toBe(20);
    expect(codex).toMatchObject({
      provider: 'codex',
      available: true,
      todaySessions: 1,
      today: { total: 15 },
      rateLimits: { primary: { usedPercent: 34 }, planType: 'pro' },
    });
  });

  it('文件追加时只解析新增完整行，半行留到下次，截断后重新解析', async () => {
    const file = join(claudeDir, 'a.jsonl');
    const usage = { output_tokens: 10 };
    writeFileSync(file, `${claudeLine('1', iso(0), usage)}\n`);
    const instance = service();
    expect((await instance.getSnapshot()).providers[0].today.total).toBe(10);

    const next = claudeLine('2', iso(0), usage);
    appendFileSync(file, next.slice(0, 20));
    expect((await instance.getSnapshot()).providers[0].today.total).toBe(10);
    appendFileSync(file, `${next.slice(20)}\n`);
    expect((await instance.getSnapshot()).providers[0].today.total).toBe(20);

    writeFileSync(file, `${claudeLine('3', iso(0), { output_tokens: 1 })}\n`);
    expect((await instance.getSnapshot()).providers[0].today.total).toBe(1);
  });

  it('跳过修改时间早于统计窗口的文件，目录缺失时标记不可用', async () => {
    const old = join(claudeDir, 'old.jsonl');
    writeFileSync(old, `${claudeLine('1', iso(0), { output_tokens: 10 })}\n`);
    const stale = new Date(2026, 9, 1);
    utimesSync(old, stale, stale);
    rmSync(join(root, 'codex'), { recursive: true, force: true });

    const [claude, codex] = (await service().getSnapshot()).providers;
    expect(claude).toMatchObject({ available: true, today: { total: 0 } });
    expect(codex).toMatchObject({ available: false, today: { total: 0 }, topModel: null, rateLimits: null });
  });

  it('并发请求共享同一次扫描', async () => {
    const instance = service();
    const [a, b] = await Promise.all([instance.getSnapshot(), instance.getSnapshot()]);
    expect(a).toBe(b);
  });
});
