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
 */

/**
 * @file codexSessionParser.ts
 * @description 将 Codex rollout JSONL 转换为 CLI 面板统一快照数据。
 * @author 鸡哥
 */

import type { ClaudeCodeHeatmapDaily } from '../types/system/ClaudeCodeHeatmapDailyCount';
import type { ClaudeCodeHookEvent, ClaudeCodeHookEventKind } from '../types/system/ClaudeCodeHookEvent';
import type { ClaudeCodeSessionSnapshot, ClaudeCodeSessionPhase } from '../types/system/ClaudeCodeSessionSnapshot';

export interface ParsedCodexSession {
  session: ClaudeCodeSessionSnapshot;
  events: ClaudeCodeHookEvent[];
  heatmap: ClaudeCodeHeatmapDaily;
}

interface CodexParserContext {
  sessionId: string;
  cwd: string | null;
  model: string | null;
  transcriptPath: string;
  includeDetails: boolean;
}

interface MappedEvent {
  eventName: string;
  kind: ClaudeCodeHookEventKind;
  summary: string;
  detailItems: Array<{ label: string; value: string }>;
  toolName: string | null;
  toolInputPreview: string | null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function stringify(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value.trim() || null;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function clip(value: string | null, limit = 220): string | null {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, ' ').trim();
  // 复制短摘要，避免 V8 的切片字符串继续引用整段工具输出。
  return normalized.length > limit ? `${normalized.slice(0, limit - 1).split('').join('')}…` : normalized;
}

function contentText(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (!Array.isArray(value)) return null;
  const text = value
    .map((item) => {
      if (typeof item === 'string') return item;
      const block = asRecord(item);
      return asString(block.text) ?? asString(block.input_text) ?? asString(block.output_text) ?? '';
    })
    .filter(Boolean)
    .join('\n')
    .trim();
  return text || null;
}

function timestampOf(line: Record<string, unknown>, fallback: number): number {
  const value = line.timestamp ?? line.created_at ?? line.createdAt;
  if (typeof value === 'number' && Number.isFinite(value)) return value > 1e12 ? value : value * 1000;
  const parsed = typeof value === 'string' ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function detailItems(context: CodexParserContext, specs: Array<[string, unknown]>): Array<{ label: string; value: string }> {
  if (!context.includeDetails) return [];
  return specs.flatMap(([label, value]) => {
    const text = stringify(value);
    return text ? [{ label, value: text }] : [];
  });
}

function toolPreview(payload: Record<string, unknown>): string | null {
  const source = payload.arguments ?? payload.input ?? payload.command ?? payload.args;
  let record = asRecord(source);
  if (typeof source === 'string') {
    try {
      record = asRecord(JSON.parse(source));
    } catch {
      return clip(source);
    }
  }
  return clip(
    asString(record.command)
      ?? asString(record.file_path)
      ?? asString(record.query)
      ?? asString(record.prompt)
      ?? stringify(source),
  );
}

function mapEventMessage(payload: Record<string, unknown>, context: CodexParserContext): MappedEvent | null {
  const type = asString(payload.type) ?? '';
  const message = asString(payload.message) ?? asString(payload.text) ?? asString(payload.last_agent_message);
  if (type === 'task_started' || type === 'turn_started') {
    return { eventName: 'TurnStart', kind: 'session', summary: 'Codex 开始处理任务', detailItems: detailItems(context, [['model', context.model], ['rawEvent', payload]]), toolName: null, toolInputPreview: null };
  }
  if (type === 'user_message') {
    const text = message ?? contentText(payload.content) ?? '';
    return { eventName: 'UserPromptSubmit', kind: 'message', summary: clip(text) ?? '获取到用户提示词', detailItems: detailItems(context, [['userInput', text], ['model', context.model], ['rawEvent', payload]]), toolName: null, toolInputPreview: null };
  }
  if (type === 'agent_message' || type === 'agent_message_delta') {
    const text = message ?? contentText(payload.content) ?? '';
    if (!text) return null;
    return { eventName: 'AssistantOutput', kind: 'completed', summary: clip(text) ?? 'Codex 输出', detailItems: detailItems(context, [['assistantOutput', text], ['model', context.model], ['rawEvent', payload]]), toolName: null, toolInputPreview: null };
  }
  if (type === 'exec_approval_request' || type === 'apply_patch_approval_request' || type === 'request_permissions') {
    const toolName = type === 'apply_patch_approval_request' ? 'apply_patch' : 'shell';
    const preview = toolPreview(payload);
    return { eventName: 'PermissionRequest', kind: 'permission', summary: preview ? `${toolName} 请求授权：${preview}` : `${toolName} 请求授权`, detailItems: detailItems(context, [['toolInput', payload], ['model', context.model], ['rawEvent', payload]]), toolName, toolInputPreview: preview };
  }
  if (type === 'task_complete' || type === 'turn_complete' || type === 'turn_completed') {
    const text = message ?? asString(payload.last_agent_message);
    return { eventName: 'Stop', kind: 'completed', summary: clip(text) ?? '本轮完成', detailItems: detailItems(context, [['assistantOutput', text], ['model', context.model], ['rawEvent', payload]]), toolName: null, toolInputPreview: null };
  }
  if (type === 'turn_aborted' || type === 'error') {
    return { eventName: 'StopFailure', kind: 'completed', summary: clip(message) ?? '本轮异常结束', detailItems: detailItems(context, [['error', payload.error ?? message], ['rawEvent', payload]]), toolName: null, toolInputPreview: null };
  }
  return null;
}

function mapResponseItem(payload: Record<string, unknown>, context: CodexParserContext): MappedEvent | null {
  const type = asString(payload.type) ?? '';
  const role = asString(payload.role);
  if (type === 'message') {
    const text = contentText(payload.content) ?? asString(payload.text) ?? '';
    if (!text) return null;
    if (role === 'user') {
      return { eventName: 'UserPromptSubmit', kind: 'message', summary: clip(text) ?? '获取到用户提示词', detailItems: detailItems(context, [['userInput', text], ['model', context.model], ['rawEvent', payload]]), toolName: null, toolInputPreview: null };
    }
    if (role === 'assistant') {
      return { eventName: 'AssistantOutput', kind: 'completed', summary: clip(text) ?? 'Codex 输出', detailItems: detailItems(context, [['assistantOutput', text], ['model', context.model], ['rawEvent', payload]]), toolName: null, toolInputPreview: null };
    }
  }
  if (type === 'function_call' || type === 'custom_tool_call' || type === 'local_shell_call') {
    const toolName = asString(payload.name) ?? (type === 'local_shell_call' ? 'shell' : 'tool');
    const preview = toolPreview(payload);
    return { eventName: 'PreToolUse', kind: 'tool', summary: preview ? `正在使用 ${toolName}：${preview}` : `正在使用 ${toolName}`, detailItems: detailItems(context, [['toolUseId', payload.call_id ?? payload.id], ['toolInput', payload.arguments ?? payload.input ?? payload], ['model', context.model], ['rawEvent', payload]]), toolName, toolInputPreview: preview };
  }
  if (type === 'function_call_output' || type === 'custom_tool_call_output' || type === 'local_shell_call_output') {
    const output = payload.output ?? payload.content;
    return { eventName: 'PostToolUse', kind: 'tool', summary: clip(stringify(output)) ?? '工具调用已完成', detailItems: detailItems(context, [['toolUseId', payload.call_id ?? payload.id], ['toolResult', output], ['model', context.model], ['rawEvent', payload]]), toolName: asString(payload.name), toolInputPreview: null };
  }
  return null;
}

function mapLine(line: Record<string, unknown>, context: CodexParserContext): MappedEvent | null {
  const lineType = asString(line.type) ?? '';
  const payload = asRecord(line.payload ?? line.item);
  if (lineType === 'event_msg') return mapEventMessage(payload, context);
  if (lineType === 'response_item') return mapResponseItem(payload, context);
  return null;
}

function sessionTitle(cwd: string | null, sessionId: string): string {
  if (!cwd) return sessionId || 'Codex';
  return cwd.replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? cwd;
}

function phaseFrom(events: ClaudeCodeHookEvent[], now: number): ClaudeCodeSessionPhase {
  const latest = events[0];
  if (!latest || now - latest.createdAt > 10 * 60 * 1000) return 'completed';
  if (latest.eventName === 'PermissionRequest') return 'waiting_permission';
  if (latest.eventName === 'Stop' || latest.eventName === 'StopFailure' || latest.eventName === 'AssistantOutput') return 'idle';
  return 'running';
}

function incrementHeatmap(heatmap: ClaudeCodeHeatmapDaily, event: ClaudeCodeHookEvent): void {
  const metric = event.eventName === 'SessionStart' ? 'session' : event.eventName === 'PreToolUse' ? 'tool' : event.eventName === 'UserPromptSubmit' ? 'prompt' : null;
  if (!metric) return;
  const date = new Date(event.createdAt);
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  const bucket = heatmap[key] ?? { session: 0, tool: 0, prompt: 0 };
  heatmap[key] = { ...bucket, [metric]: bucket[metric] + 1 };
}

/**
 * 迭代文本行，避免 split 额外保留整份日志的行数组。
 * @param content - 完整日志文本
 * @returns 按原顺序迭代的文本行
 */
function* textLines(content: string): Generator<string> {
  let start = 0;
  while (start < content.length) {
    const end = content.indexOf('\n', start);
    if (end < 0) {
      yield content.slice(start);
      return;
    }
    yield content.slice(start, end);
    start = end + 1;
  }
}

/**
 * 仅在消费当前行时解析 JSON，跳过未写完的日志行。
 * @param readLines - 从头迭代日志行的读取函数
 * @returns 有效 JSON 记录的迭代器
 */
function* jsonLines(readLines: () => Iterable<string>): Generator<Record<string, unknown>> {
  const iterator = readLines()[Symbol.iterator]();
  let next = iterator.next();
  try {
    while (!next.done) {
      const text = next.value;
      try {
        if (text.trim()) yield asRecord(JSON.parse(text));
      } catch {
        // CLI 可能正在追加当前行，下一次轮询会重新读取。
      }
      next = iterator.next();
    }
  } finally {
    if (!next.done) iterator.return?.();
  }
}

/**
 * 分批解析日志，仅为最终显示的事件构造完整详情。
 * @param readLines - 每次调用均从日志开头迭代的读取函数
 * @param transcriptPath - 日志绝对路径
 * @param fallbackTimestamp - 缺失时间字段时采用的时间戳
 * @param now - 判断会话活跃状态的当前时间
 * @returns 会话快照；缺少会话标识时返回 null
 */
export function parseCodexSessionLines(
  readLines: () => Iterable<string>,
  transcriptPath: string,
  fallbackTimestamp: number,
  now = Date.now(),
): ParsedCodexSession | null {
  let metaLine: Record<string, unknown> | undefined;
  const metaIterator = jsonLines(readLines);
  let metaNext = metaIterator.next();
  while (!metaNext.done) {
    const line = metaNext.value;
    if (asString(line.type) === 'session_meta') {
      metaLine = line;
      break;
    }
    metaNext = metaIterator.next();
  }
  metaIterator.return(undefined);
  const meta = asRecord(metaLine?.payload ?? metaLine?.item);
  const sessionId = asString(meta.id) ?? asString(meta.session_id) ?? asString(meta.thread_id);
  if (!sessionId) return null;

  const context: CodexParserContext = {
    sessionId,
    transcriptPath,
    cwd: asString(meta.cwd),
    model: asString(meta.model),
    includeDetails: false,
  };
  const events: ClaudeCodeHookEvent[] = [];
  const metaTimestamp = metaLine ? timestampOf(metaLine, fallbackTimestamp) : fallbackTimestamp;
  events.push({
    sessionId,
    transcriptPath,
    id: `${sessionId}-session`,
    eventName: 'SessionStart',
    kind: 'session',
    cwd: context.cwd,
    summary: '发现新的 Codex 终端',
    detail: null,
    detailItems: detailItems(context, [['model', context.model], ['rawEvent', meta]]),
    toolName: null,
    toolInputPreview: null,
    createdAt: metaTimestamp,
    raw: {},
  });

  let index = -1;
  const eventIterator = jsonLines(readLines);
  let eventNext = eventIterator.next();
  while (!eventNext.done) {
    const line = eventNext.value;
    index += 1;
    const lineType = asString(line.type);
    const payload = asRecord(line.payload ?? line.item);
    if (lineType === 'turn_context') {
      context.cwd = asString(payload.cwd) ?? context.cwd;
      context.model = asString(payload.model) ?? context.model;
      eventNext = eventIterator.next();
      continue;
    }
    const mapped = mapLine(line, context);
    if (!mapped) {
      eventNext = eventIterator.next();
      continue;
    }
    const createdAt = timestampOf(line, fallbackTimestamp + index);
    events.push({
      sessionId,
      transcriptPath,
      createdAt,
      id: `${sessionId}-${index}-${createdAt}`,
      eventName: mapped.eventName,
      kind: mapped.kind,
      cwd: context.cwd,
      summary: mapped.summary,
      detail: null,
      detailItems: mapped.detailItems,
      toolName: mapped.toolName,
      toolInputPreview: mapped.toolInputPreview,
      raw: {},
    });
    eventNext = eventIterator.next();
  }

  const seenAt = new Map<string, number>();
  const sortedEvents = events
    .sort((a, b) => b.createdAt - a.createdAt)
    .filter((event) => {
      const key = `${event.eventName}\u0000${event.summary}\u0000${event.toolName ?? ''}`;
      const previous = seenAt.get(key);
      seenAt.set(key, event.createdAt);
      return previous === undefined || previous - event.createdAt > 250;
    });
  const heatmap: ClaudeCodeHeatmapDaily = {};
  sortedEvents.forEach((event) => incrementHeatmap(heatmap, event));
  const phase = phaseFrom(sortedEvents, now);
  // 历史只保留用于排序、去重和热力图的摘要，工具输出及图片不会随历史一起驻留。
  const recentEvents = sortedEvents.slice(0, 40);
  const selected = new Map(recentEvents.map((event) => [event.id, event]));
  const detailContext: CodexParserContext = {
    sessionId,
    transcriptPath,
    cwd: asString(meta.cwd),
    model: asString(meta.model),
    includeDetails: true,
  };
  const startEvent = selected.get(`${sessionId}-session`);
  if (startEvent) {
    startEvent.raw = meta;
    startEvent.detailItems = detailItems(detailContext, [['model', detailContext.model], ['rawEvent', meta]]);
  }
  index = -1;
  const detailIterator = jsonLines(readLines);
  let detailNext = detailIterator.next();
  while (!detailNext.done) {
    const line = detailNext.value;
    index += 1;
    const payload = asRecord(line.payload ?? line.item);
    if (asString(line.type) === 'turn_context') {
      detailContext.cwd = asString(payload.cwd) ?? detailContext.cwd;
      detailContext.model = asString(payload.model) ?? detailContext.model;
      detailNext = detailIterator.next();
      continue;
    }
    const createdAt = timestampOf(line, fallbackTimestamp + index);
    const event = selected.get(`${sessionId}-${index}-${createdAt}`);
    if (event) {
      const mapped = mapLine(line, detailContext);
      if (mapped) {
        event.detailItems = mapped.detailItems;
        event.raw = payload;
      }
    }
    detailNext = detailIterator.next();
  }
  return {
    heatmap,
    events: recentEvents,
    session: {
      phase,
      transcriptPath,
      id: sessionId,
      title: sessionTitle(context.cwd, sessionId),
      cwd: context.cwd,
      lastSummary: sortedEvents[0]?.summary ?? '',
      lastEventAt: sortedEvents[0]?.createdAt ?? metaTimestamp,
      pendingPermission: phase === 'waiting_permission' ? sortedEvents[0] : null,
      events: recentEvents,
    },
  };
}

/**
 * 解析单个 Codex rollout JSONL 文件。
 * @param content - rollout 文件文本
 * @param transcriptPath - rollout 文件绝对路径
 * @param fallbackTimestamp - 缺失时间字段时采用的文件时间戳
 * @param now - 当前时间，用于判断会话是否仍活跃
 * @returns 会话、事件与热力图数据；无有效元数据时返回 null
 */
export function parseCodexSessionContent(
  content: string,
  transcriptPath: string,
  fallbackTimestamp: number,
  now = Date.now(),
): ParsedCodexSession | null {
  return parseCodexSessionLines(() => textLines(content), transcriptPath, fallbackTimestamp, now);
}
