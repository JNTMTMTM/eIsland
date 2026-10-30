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
 * @file agentUsageService.ts
 * @description 读取本机 Claude Code 与 Codex 的 jsonl 日志，汇总最近 7 天 token 用量及 Codex 额度
 * @description 只读本地日志、不读取任何凭据；按文件缓存解析结果，文件追加时只解析新增部分
 * @author 鸡哥
 */

import { createReadStream } from 'fs';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import type {
  AgentUsageProviderId,
  AgentUsageProviderSnapshot,
  AgentUsageRateLimits,
  AgentUsageRateLimitWindow,
  AgentUsageSnapshot,
  AgentUsageTokens,
} from '../../preload/types/agentUsage';

const WINDOW_DAYS = 7;
const DAY_MS = 86_400_000;
const NEWLINE = 10;

/** 单条用量记录；key 用于跨文件去重 */
export interface AgentUsageRecord {
  key: string;
  timestamp: number;
  sessionId: string;
  model: string | null;
  tokens: AgentUsageTokens;
}

/** Codex 增量解析需要跨批次保留的状态 */
export interface CodexParseState {
  sessionId: string;
  model: string | null;
  previousTotal: AgentUsageTokens | null;
  rateLimits: AgentUsageRateLimits | null;
}

/** Codex 单行解析结果 */
export interface CodexParseResult {
  state: CodexParseState;
  record: AgentUsageRecord | null;
}

interface FileCache {
  mtimeMs: number;
  offset: number;
  records: AgentUsageRecord[];
  codex: CodexParseState | null;
}

interface JsonlFile {
  path: string;
  mtimeMs: number;
  size: number;
}

interface CreateAgentUsageServiceOptions {
  claudeProjectsPath: string;
  codexSessionsPath: string;
  now?: () => number;
}

/** Agent 用量服务 */
export interface AgentUsageService {
  getSnapshot: () => Promise<AgentUsageSnapshot>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

function makeTokens(input: number, output: number, cacheRead: number, cacheWrite: number): AgentUsageTokens {
  return { input, output, cacheRead, cacheWrite, total: input + output + cacheRead + cacheWrite };
}

const EMPTY_TOKENS: AgentUsageTokens = makeTokens(0, 0, 0, 0);

function sumTokens(a: AgentUsageTokens, b: AgentUsageTokens): AgentUsageTokens {
  return makeTokens(a.input + b.input, a.output + b.output, a.cacheRead + b.cacheRead, a.cacheWrite + b.cacheWrite);
}

function parseTimestamp(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function parseJson(line: string): Record<string, unknown> | null {
  try {
    return asRecord(JSON.parse(line));
  } catch {
    return null;
  }
}

/**
 * 解析 Claude Code 日志行。
 * @description 同一条 assistant 消息按内容块拆成多行且重复携带 usage，调用方需按 key 去重。
 * @param line - jsonl 原始行
 * @returns 用量记录，非 assistant 用量行返回 null
 */
export function parseClaudeUsageLine(line: string): AgentUsageRecord | null {
  if (!line.includes('"usage"')) return null;
  const entry = parseJson(line);
  const message = asRecord(entry?.message);
  const usage = asRecord(message?.usage);
  const timestamp = parseTimestamp(entry?.timestamp);
  if (!entry || entry.type !== 'assistant' || !message || !usage || timestamp === null) return null;
  const tokens = makeTokens(
    asNumber(usage.input_tokens),
    asNumber(usage.output_tokens),
    asNumber(usage.cache_read_input_tokens),
    asNumber(usage.cache_creation_input_tokens),
  );
  if (tokens.total === 0) return null;
  const messageId = typeof message.id === 'string' ? message.id : '';
  const requestId = typeof entry.requestId === 'string' ? entry.requestId : '';
  const fallbackId = typeof entry.uuid === 'string' ? entry.uuid : String(timestamp);
  return {
    timestamp,
    tokens,
    key: messageId || requestId ? `claude:${messageId}:${requestId}` : `claude:${fallbackId}`,
    sessionId: typeof entry.sessionId === 'string' ? entry.sessionId : '',
    model: typeof message.model === 'string' && message.model !== '<synthetic>' ? message.model : null,
  };
}

function codexTotal(value: unknown): AgentUsageTokens | null {
  const usage = asRecord(value);
  if (!usage) return null;
  const cached = asNumber(usage.cached_input_tokens);
  // Codex 的 input_tokens 包含缓存命中部分，扣除后与 Claude 口径一致。
  return makeTokens(
    Math.max(0, asNumber(usage.input_tokens) - cached),
    asNumber(usage.output_tokens),
    cached,
    asNumber(usage.cache_write_input_tokens),
  );
}

function codexWindow(value: unknown): AgentUsageRateLimitWindow | null {
  const window = asRecord(value);
  if (!window || typeof window.used_percent !== 'number') return null;
  return {
    usedPercent: Math.max(0, Math.min(100, window.used_percent)),
    windowMinutes: typeof window.window_minutes === 'number' ? window.window_minutes : null,
    resetsAt: typeof window.resets_at === 'number' ? window.resets_at * 1000 : null,
  };
}

function codexRateLimits(value: unknown, timestamp: number): AgentUsageRateLimits | null {
  const rateLimits = asRecord(value);
  if (!rateLimits) return null;
  return {
    primary: codexWindow(rateLimits.primary),
    secondary: codexWindow(rateLimits.secondary),
    planType: typeof rateLimits.plan_type === 'string' ? rateLimits.plan_type : null,
    updatedAt: timestamp,
  };
}

/**
 * 计算本次 token_count 新增的用量。
 * @description 同一轮用量可能重复上报，按累计值求差避免重复计数；累计值回退时退回单轮用量。
 * @param previous - 上一次的累计值，首条事件为 null
 * @param total - 本次累计值
 * @param last - 本次上报的单轮用量
 * @returns 新增用量
 */
function codexDelta(previous: AgentUsageTokens | null, total: AgentUsageTokens, last: AgentUsageTokens | null): AgentUsageTokens | null {
  if (!previous) return total;
  if (total.total < previous.total) return last;
  return makeTokens(
    Math.max(0, total.input - previous.input),
    Math.max(0, total.output - previous.output),
    Math.max(0, total.cacheRead - previous.cacheRead),
    Math.max(0, total.cacheWrite - previous.cacheWrite),
  );
}

/**
 * 创建 Codex 解析状态。
 * @param sessionId - 默认会话标识，读到 session_meta 后会被替换
 * @returns 初始解析状态
 */
export function createCodexParseState(sessionId: string): CodexParseState {
  return { sessionId, model: null, previousTotal: null, rateLimits: null };
}

/**
 * 解析 Codex 日志行。
 * @param line - jsonl 原始行
 * @param state - 当前文件的解析状态
 * @param key - 记录去重键
 * @returns 下一个解析状态及用量记录，非用量行的记录为 null
 */
export function parseCodexUsageLine(line: string, state: CodexParseState, key: string): CodexParseResult {
  const unchanged = { state, record: null };
  if (!line.includes('"token_count"') && !line.includes('"turn_context"') && !line.includes('"session_meta"')) return unchanged;
  const entry = parseJson(line);
  const payload = asRecord(entry?.payload);
  if (!entry || !payload) return unchanged;
  if (entry.type === 'session_meta') {
    return typeof payload.id === 'string' ? { state: { ...state, sessionId: payload.id }, record: null } : unchanged;
  }
  if (entry.type === 'turn_context') {
    return typeof payload.model === 'string' ? { state: { ...state, model: payload.model }, record: null } : unchanged;
  }
  const timestamp = parseTimestamp(entry.timestamp);
  if (entry.type !== 'event_msg' || payload.type !== 'token_count' || timestamp === null) return unchanged;

  const info = asRecord(payload.info);
  const total = codexTotal(info?.total_token_usage);
  const next: CodexParseState = {
    ...state,
    previousTotal: total ?? state.previousTotal,
    rateLimits: codexRateLimits(payload.rate_limits, timestamp) ?? state.rateLimits,
  };
  const tokens = total ? codexDelta(state.previousTotal, total, codexTotal(info?.last_token_usage)) : null;
  if (!tokens || tokens.total === 0) return { state: next, record: null };
  return { state: next, record: { key, timestamp, tokens, sessionId: next.sessionId, model: next.model } };
}

async function collectJsonlFiles(root: string, since: number): Promise<JsonlFile[]> {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }
  const nested = await Promise.all(entries.map(async (entry): Promise<JsonlFile[]> => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return collectJsonlFiles(path, since);
    if (!entry.isFile() || !entry.name.endsWith('.jsonl')) return [];
    try {
      const info = await stat(path);
      return info.mtimeMs >= since ? [{ path, mtimeMs: info.mtimeMs, size: info.size }] : [];
    } catch {
      // 文件在扫描期间被删除时跳过。
      return [];
    }
  }));
  return nested.flat();
}

async function directoryExists(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

/**
 * 从指定偏移读取完整行；末尾未写完的半行留到下次读取。
 * @param path - 文件路径
 * @param start - 起始字节偏移
 * @param onLine - 每个完整行的回调，参数为行文本及其起始偏移
 * @returns 下次读取的起始偏移
 */
function readCompleteLines(path: string, start: number, onLine: (line: string, offset: number) => void): Promise<number> {
  return new Promise((resolve, reject) => {
    let pending = Buffer.alloc(0);
    let pendingOffset = start;
    const stream = createReadStream(path, { start });
    stream.on('data', (chunk: Buffer) => {
      const buffer = pending.length > 0 ? Buffer.concat([pending, chunk]) : chunk;
      let lineStart = 0;
      let newline = buffer.indexOf(NEWLINE);
      while (newline !== -1) {
        const line = buffer.toString('utf8', lineStart, newline).trim();
        if (line) onLine(line, pendingOffset + lineStart);
        lineStart = newline + 1;
        newline = buffer.indexOf(NEWLINE, lineStart);
      }
      pendingOffset += lineStart;
      pending = Buffer.from(buffer.subarray(lineStart));
    });
    stream.on('end', () => resolve(pendingOffset));
    stream.on('error', reject);
  });
}

function startOfLocalDay(time: number): number {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function summarize(
  provider: AgentUsageProviderId,
  available: boolean,
  records: AgentUsageRecord[],
  range: { todayStart: number; weekStart: number },
  rateLimits: AgentUsageRateLimits | null,
): AgentUsageProviderSnapshot {
  const seen = new Set<string>();
  const sessions = new Set<string>();
  const models = new Map<string, number>();
  let today = EMPTY_TOKENS;
  let week = EMPTY_TOKENS;
  records.forEach((record) => {
    if (record.timestamp < range.weekStart || seen.has(record.key)) return;
    seen.add(record.key);
    week = sumTokens(week, record.tokens);
    if (record.model) models.set(record.model, (models.get(record.model) ?? 0) + record.tokens.total);
    if (record.timestamp < range.todayStart) return;
    today = sumTokens(today, record.tokens);
    if (record.sessionId) sessions.add(record.sessionId);
  });
  const topModel = [...models.entries()].reduce<[string, number] | null>(
    (best, current) => (!best || current[1] > best[1] ? current : best),
    null,
  )?.[0] ?? null;
  return { provider, available, today, week, topModel, rateLimits, todaySessions: sessions.size };
}

/**
 * 创建 Agent 用量服务。
 * @param options - 日志目录及可注入的当前时间
 * @returns 用量服务实例
 */
export function createAgentUsageService(options: CreateAgentUsageServiceOptions): AgentUsageService {
  const now = options.now ?? Date.now;
  const caches = new Map<string, FileCache>();
  let inFlight: Promise<AgentUsageSnapshot> | null = null;

  const loadFile = async (provider: AgentUsageProviderId, file: JsonlFile): Promise<FileCache> => {
    const cached = caches.get(file.path);
    if (cached && cached.mtimeMs === file.mtimeMs && cached.offset === file.size) return cached;
    // 文件被截断或改写时整体重新解析。
    const base: FileCache = cached && file.size >= cached.offset
      ? cached
      : { mtimeMs: file.mtimeMs, offset: 0, records: [], codex: provider === 'codex' ? createCodexParseState(file.path) : null };
    const records = [...base.records];
    let { codex } = base;
    try {
      const offset = await readCompleteLines(file.path, base.offset, (line, lineOffset) => {
        let record: AgentUsageRecord | null;
        if (codex) {
          ({ state: codex, record } = parseCodexUsageLine(line, codex, `codex:${file.path}:${lineOffset}`));
        } else {
          record = parseClaudeUsageLine(line);
        }
        if (record) records.push(record);
      });
      const next: FileCache = { offset, records, codex, mtimeMs: file.mtimeMs };
      caches.set(file.path, next);
      return next;
    } catch {
      // 读取失败时保留上次结果，下次刷新重试。
      return base;
    }
  };

  const loadFiles = async (provider: AgentUsageProviderId, root: string, weekStart: number): Promise<FileCache[]> => {
    const files = await collectJsonlFiles(root, weekStart);
    // 移出统计窗口的文件不再保留缓存。
    const current = new Set(files.map((file) => file.path));
    [...caches.keys()].forEach((path) => {
      if (path.startsWith(root) && !current.has(path)) caches.delete(path);
    });
    return Promise.all(files.map((file) => loadFile(provider, file)));
  };

  const build = async (): Promise<AgentUsageSnapshot> => {
    const generatedAt = now();
    const todayStart = startOfLocalDay(generatedAt);
    const range = { todayStart, weekStart: todayStart - (WINDOW_DAYS - 1) * DAY_MS };
    const [claudeAvailable, codexAvailable, claudeFiles, codexFiles] = await Promise.all([
      directoryExists(options.claudeProjectsPath),
      directoryExists(options.codexSessionsPath),
      loadFiles('claude', options.claudeProjectsPath, range.weekStart),
      loadFiles('codex', options.codexSessionsPath, range.weekStart),
    ]);
    const rateLimits = codexFiles.reduce<AgentUsageRateLimits | null>((latest, file) => {
      const candidate = file.codex?.rateLimits ?? null;
      return candidate && (!latest || candidate.updatedAt > latest.updatedAt) ? candidate : latest;
    }, null);
    const records = (files: FileCache[]): AgentUsageRecord[] => files.flatMap((file) => file.records);
    return {
      generatedAt,
      providers: [
        summarize('claude', claudeAvailable, records(claudeFiles), range, null),
        summarize('codex', codexAvailable, records(codexFiles), range, rateLimits),
      ],
    };
  };

  const share = async (): Promise<AgentUsageSnapshot> => {
    try {
      const snapshot = await build();
      return snapshot;
    } finally {
      inFlight = null;
    }
  };

  return {
    getSnapshot: () => {
      // 多个窗口同时刷新时共享同一次扫描。
      inFlight ??= share();
      return inFlight;
    },
  };
}
