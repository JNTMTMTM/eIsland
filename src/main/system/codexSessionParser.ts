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
  return normalized.length > limit ? `${normalized.slice(0, limit - 1)}…` : normalized;
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

function detailItems(specs: Array<[string, unknown]>): Array<{ label: string; value: string }> {
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
    return { eventName: 'TurnStart', kind: 'session', summary: 'Codex 开始处理任务', detailItems: detailItems([['model', context.model]]), toolName: null, toolInputPreview: null };
  }
  if (type === 'user_message') {
    const text = message ?? contentText(payload.content) ?? '';
    return { eventName: 'UserPromptSubmit', kind: 'message', summary: clip(text) ?? '获取到用户提示词', detailItems: detailItems([['userInput', text], ['model', context.model]]), toolName: null, toolInputPreview: null };
  }
  if (type === 'agent_message' || type === 'agent_message_delta') {
    const text = message ?? contentText(payload.content) ?? '';
    if (!text) return null;
    return { eventName: 'AssistantOutput', kind: 'completed', summary: clip(text) ?? 'Codex 输出', detailItems: detailItems([['assistantOutput', text], ['model', context.model]]), toolName: null, toolInputPreview: null };
  }
  if (type === 'exec_approval_request' || type === 'apply_patch_approval_request' || type === 'request_permissions') {
    const toolName = type === 'apply_patch_approval_request' ? 'apply_patch' : 'shell';
    const preview = toolPreview(payload);
    return { eventName: 'PermissionRequest', kind: 'permission', summary: preview ? `${toolName} 请求授权：${preview}` : `${toolName} 请求授权`, detailItems: detailItems([['toolInput', payload], ['model', context.model]]), toolName, toolInputPreview: preview };
  }
  if (type === 'task_complete' || type === 'turn_complete' || type === 'turn_completed') {
    const text = message ?? asString(payload.last_agent_message);
    return { eventName: 'Stop', kind: 'completed', summary: clip(text) ?? '本轮完成', detailItems: detailItems([['assistantOutput', text], ['model', context.model]]), toolName: null, toolInputPreview: null };
  }
  if (type === 'turn_aborted' || type === 'error') {
    return { eventName: 'StopFailure', kind: 'completed', summary: clip(message) ?? '本轮异常结束', detailItems: detailItems([['error', payload.error ?? message], ['rawEvent', payload]]), toolName: null, toolInputPreview: null };
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
      return { eventName: 'UserPromptSubmit', kind: 'message', summary: clip(text) ?? '获取到用户提示词', detailItems: detailItems([['userInput', text], ['model', context.model]]), toolName: null, toolInputPreview: null };
    }
    if (role === 'assistant') {
      return { eventName: 'AssistantOutput', kind: 'completed', summary: clip(text) ?? 'Codex 输出', detailItems: detailItems([['assistantOutput', text], ['model', context.model]]), toolName: null, toolInputPreview: null };
    }
  }
  if (type === 'function_call' || type === 'custom_tool_call' || type === 'local_shell_call') {
    const toolName = asString(payload.name) ?? (type === 'local_shell_call' ? 'shell' : 'tool');
    const preview = toolPreview(payload);
    return { eventName: 'PreToolUse', kind: 'tool', summary: preview ? `正在使用 ${toolName}：${preview}` : `正在使用 ${toolName}`, detailItems: detailItems([['toolUseId', payload.call_id ?? payload.id], ['toolInput', payload.arguments ?? payload.input ?? payload], ['model', context.model]]), toolName, toolInputPreview: preview };
  }
  if (type === 'function_call_output' || type === 'custom_tool_call_output' || type === 'local_shell_call_output') {
    const output = payload.output ?? payload.content;
    return { eventName: 'PostToolUse', kind: 'tool', summary: clip(stringify(output)) ?? '工具调用已完成', detailItems: detailItems([['toolUseId', payload.call_id ?? payload.id], ['toolResult', output], ['model', context.model]]), toolName: asString(payload.name), toolInputPreview: null };
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
 * 解析单个 Codex rollout JSONL 文件
 * @param content - rollout 文件文本
 * @param transcriptPath - rollout 文件绝对路径
 * @param fallbackTimestamp - 缺失时间字段时采用的文件时间戳
 * @param now - 当前时间，用于判断会话是否仍活跃
 * @returns 可并入 CLI 面板的会话、事件与热力图数据；无有效元数据时返回 null
 */
export function parseCodexSessionContent(
  content: string,
  transcriptPath: string,
  fallbackTimestamp: number,
  now = Date.now(),
): ParsedCodexSession | null {
  const lines = content.split(/\r?\n/).flatMap((text) => {
    try {
      return text.trim() ? [asRecord(JSON.parse(text))] : [];
    } catch {
      return [];
    }
  });
  const metaLine = lines.find((line) => asString(line.type) === 'session_meta');
  const meta = asRecord(metaLine?.payload ?? metaLine?.item);
  const sessionId = asString(meta.id) ?? asString(meta.session_id) ?? asString(meta.thread_id);
  if (!sessionId) return null;

  const context: CodexParserContext = {
    sessionId,
    cwd: asString(meta.cwd),
    model: asString(meta.model),
    transcriptPath,
  };
  const events: ClaudeCodeHookEvent[] = [];
  const metaTimestamp = metaLine ? timestampOf(metaLine, fallbackTimestamp) : fallbackTimestamp;
  events.push({
    id: `${sessionId}-session`,
    eventName: 'SessionStart',
    kind: 'session',
    sessionId,
    cwd: context.cwd,
    transcriptPath,
    summary: '发现新的 Codex 终端',
    detail: null,
    detailItems: detailItems([['model', context.model], ['rawEvent', meta]]),
    toolName: null,
    toolInputPreview: null,
    createdAt: metaTimestamp,
    raw: meta,
  });

  lines.forEach((line, index) => {
    const lineType = asString(line.type);
    const payload = asRecord(line.payload ?? line.item);
    if (lineType === 'turn_context') {
      context.cwd = asString(payload.cwd) ?? context.cwd;
      context.model = asString(payload.model) ?? context.model;
      return;
    }
    const mapped = mapLine(line, context);
    if (!mapped) return;
    const createdAt = timestampOf(line, fallbackTimestamp + index);
    events.push({
      id: `${sessionId}-${index}-${createdAt}`,
      eventName: mapped.eventName,
      kind: mapped.kind,
      sessionId,
      cwd: context.cwd,
      transcriptPath,
      summary: mapped.summary,
      detail: null,
      detailItems: [...mapped.detailItems, ...detailItems([['rawEvent', payload]])],
      toolName: mapped.toolName,
      toolInputPreview: mapped.toolInputPreview,
      createdAt,
      raw: payload,
    });
  });

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
  return {
    events: sortedEvents,
    heatmap,
    session: {
      id: sessionId,
      title: sessionTitle(context.cwd, sessionId),
      phase,
      cwd: context.cwd,
      transcriptPath,
      lastSummary: sortedEvents[0]?.summary ?? '',
      lastEventAt: sortedEvents[0]?.createdAt ?? metaTimestamp,
      pendingPermission: phase === 'waiting_permission' ? sortedEvents[0] : null,
      events: sortedEvents.slice(0, 40),
    },
  };
}