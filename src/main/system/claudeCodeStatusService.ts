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
 * @file claudeCodeStatusService.ts
 * @description Claude Code CLI hook 状态采集服务。
 * @author 鸡哥
 */

import { BrowserWindow, app } from 'electron';
import http from 'http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import type { ClaudeCodeHookEventDetailItem } from '../types/system/ClaudeCodeHookEventDetailItem';
import type { ClaudeCodeHookEvent, ClaudeCodeHookEventKind } from '../types/system/ClaudeCodeHookEvent';
import type { ClaudeCodeSessionSnapshot, ClaudeCodeSessionPhase } from '../types/system/ClaudeCodeSessionSnapshot';
import type { ClaudeCodeHeatmapDailyCount, ClaudeCodeHeatmapDaily } from '../types/system/ClaudeCodeHeatmapDailyCount';
import type { ClaudeCodeStatusSnapshot } from '../types/system/ClaudeCodeStatusSnapshot';
import type { ClaudeCodeStatusService, ClaudeSettingsMutationResult, PermissionDecision } from '../types/system/ClaudeCodeStatusService';
import { limitRecentSessions } from './sessionLimits';
import { readLastTextLinesSync } from '../utils/textFileLines';
import { summarizeCliEvent, saveCliEventDetails, createCliSnapshotWriter, removeCliEventDetails } from './cliEventDetails';
import { loadCliState } from './cliStateLoader';
import { createCliSnapshotDelta } from './cliSnapshotDelta';

export type {
  ClaudeCodeHookEventDetailItem,
  ClaudeCodeHookEvent,
  ClaudeCodeHookEventKind,
  ClaudeCodeSessionSnapshot,
  ClaudeCodeSessionPhase,
  ClaudeCodeHeatmapDailyCount,
  ClaudeCodeHeatmapDaily,
  ClaudeCodeStatusSnapshot,
  ClaudeCodeStatusService,
  ClaudeSettingsMutationResult,
  PermissionDecision,
};

interface CreateClaudeCodeStatusServiceOptions {
  getMainWindow: () => BrowserWindow | null;
  port?: number;
}

const MAX_EVENTS = 120;
const MAX_SESSION_EVENTS = 40;
const DEFAULT_PORT = 17861;
/** 授权等待的安全超时（无操作则放行 hook，回退到 Claude Code 自身的交互流程） */
const PERMISSION_WAIT_TIMEOUT_MS = 10 * 60 * 1000;
const MANAGED_MARKER = 'eisland-claude-code-status';
const HOOK_EVENTS: Array<{ name: string; matcher?: string; timeout?: number }> = [
  { name: 'UserPromptSubmit' },
  { name: 'SessionStart' },
  { name: 'SessionEnd' },
  { name: 'Stop' },
  { name: 'StopFailure' },
  { name: 'PreToolUse', matcher: '*' },
  { name: 'PermissionRequest', matcher: '*', timeout: 86400 },
  { name: 'PostToolUse', matcher: '*' },
  { name: 'PostToolUseFailure', matcher: '*' },
  { name: 'PermissionDenied', matcher: '*' },
  { name: 'SubagentStart' },
  { name: 'SubagentStop' },
  { name: 'PreCompact' },
];

/** 对身份及路径做整字段校验，不能截断后把不同会话或权限请求误合并。 */
function validateHookMetadata(payload: Record<string, unknown>): void {
  const groups: Array<[string[], number]> = [
    [['session_id', 'sessionID', 'sessionId'], 512],
    [['hook_event_name', 'hookEventName', 'event_name', 'eventName', 'event', 'type'], 128],
    [['tool_name', 'toolName', 'name', 'model'], 512],
    [['transcript_path', 'transcriptPath', 'cwd', 'workspace', 'project_dir', 'projectDir'], 32767],
  ];
  groups.forEach(([keys, limit]) => keys.forEach((key) => {
    if (typeof payload[key] === 'string' && payload[key].length > limit) throw new Error(`CLI metadata field too long: ${key}`);
  }));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function clipped(value: string | null, limit = 1000): string | null {
  if (!value) return null;
  const collapsed = value.replace(/[\n\t]+/g, ' ').split(' ').filter(Boolean).join(' ').trim();
  if (!collapsed) return null;
  return collapsed.length > limit ? `${collapsed.slice(0, limit - 1)}…` : collapsed;
}

function jsonValueString(value: unknown): string | null {
  if (value === null) return 'null';
  if (value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `[${value.map((item) => jsonValueString(item) ?? 'null').join(', ')}]`;
  const record = asRecord(value);
  const rendered = Object.keys(record)
    .sort()
    .map((key) => `${key}: ${jsonValueString(record[key]) ?? 'null'}`)
    .join(', ');
  return `{${rendered}}`;
}

function toolInputPreviewFrom(toolInput: unknown): string | null {
  const record = asRecord(toolInput);
  const priorityKeys = ['command', 'file_path', 'pattern', 'query', 'prompt', 'description', 'skill', 'url'];
  const match = priorityKeys.map((key) => asString(record[key])).find(Boolean);
  return clipped(match ?? jsonValueString(toolInput));
}

function notificationPreview(payload: Record<string, unknown>): string | null {
  const preview = [asString(payload.title), asString(payload.message)]
    .filter((item): item is string => Boolean(item))
    .join(' · ');
  return clipped(preview);
}

function payloadAssistantOutput(payload: Record<string, unknown>, transcriptPath: string | null): string | null {
  return firstDetailValue(payload, ['last_assistant_message', 'lastAssistantMessage'])
    ?? assistantOutputFromTranscript(transcriptPath);
}

function payloadToolResponse(payload: Record<string, unknown>): unknown {
  return payload.tool_response ?? payload.toolResponse ?? payload.response ?? payload.result ?? payload.output;
}

function detailValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value.trim() || null;
  return JSON.stringify(value, null, 2);
}

function firstDetailValue(payload: Record<string, unknown>, keys: string[]): string | null {
  return keys.reduce<string | null>((found, key) => found ?? detailValue(payload[key]), null);
}

function textFromContent(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (!Array.isArray(value)) return null;
  const text = value
    .map((item) => {
      if (typeof item === 'string') return item;
      const record = asRecord(item);
      const type = asString(record.type);
      if (type && type !== 'text') return '';
      return asString(record.text) ?? asString(record.content) ?? '';
    })
    .filter(Boolean)
    .join('\n')
    .trim();
  return text || null;
}

function transcriptTextFromRole(transcriptPath: string | null, roleName: 'user' | 'assistant'): string | null {
  if (!transcriptPath || !existsSync(transcriptPath)) return null;
  try {
    const lines = readLastTextLinesSync(transcriptPath, 120, 1024 * 1024).reverse();
    return lines.reduce<string | null>((found, line) => {
      if (found) return found;
      const entry = asRecord(JSON.parse(line));
      const message = asRecord(entry.message);
      const role = asString(message.role) ?? asString(entry.role);
      if (role !== roleName) return null;
      return textFromContent(message.content) ?? textFromContent(entry.content);
    }, null);
  } catch {
    return null;
  }
  return null;
}

function userInputFromTranscript(transcriptPath: string | null): string | null {
  return transcriptTextFromRole(transcriptPath, 'user');
}

function assistantOutputFromTranscript(transcriptPath: string | null): string | null {
  return transcriptTextFromRole(transcriptPath, 'assistant');
}

interface ClaudeTranscriptDetails {
  sessionId: string | null;
  userInput: string | null;
  assistantOutput: string | null;
  model: string | null;
  toolUseId: string | null;
  toolName: string | null;
  toolInput: unknown;
  toolInputPreview: string | null;
  toolResult: string | null;
}

function emptyTranscriptDetails(): ClaudeTranscriptDetails {
  return {
    sessionId: null,
    userInput: null,
    assistantOutput: null,
    model: null,
    toolUseId: null,
    toolName: null,
    toolInput: undefined,
    toolInputPreview: null,
    toolResult: null,
  };
}

function contentBlocks(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.map((item) => asRecord(item)).filter((item) => Object.keys(item).length > 0)
    : [];
}

function textBlockValue(value: unknown): string | null {
  if (typeof value === 'string') return clipped(value, 140);
  const text = contentBlocks(value)
    .filter((block) => asString(block.type) === 'text')
    .map((block) => asString(block.text))
    .find(Boolean);
  return text ? clipped(text, 140) : null;
}

function toolResultFromContent(value: unknown, expectedToolUseId: string | null): { id: string | null; value: string | null } | null {
  const match = contentBlocks(value).find((block) => {
    if (asString(block.type) !== 'tool_result') return false;
    const id = asString(block.tool_use_id) ?? asString(block.toolUseId);
    return !expectedToolUseId || id === expectedToolUseId;
  });
  if (!match) return null;
  const id = asString(match.tool_use_id) ?? asString(match.toolUseId);
  return { id, value: detailValue(match.content) ?? textBlockValue(match.content) ?? detailValue(match) };
}

function toolUseFromContent(
  value: unknown,
  expectedToolUseId: string | null,
  expectedToolName: string | null,
): { id: string; name: string; input: unknown; preview: string | null } | null {
  const match = contentBlocks(value).reverse().find((block) => {
    if (asString(block.type) !== 'tool_use') return false;
    const id = asString(block.id);
    const name = asString(block.name);
    if (!id || !name) return false;
    if (expectedToolUseId && id !== expectedToolUseId) return false;
    if (!expectedToolUseId && expectedToolName && name !== expectedToolName) return false;
    return true;
  });
  if (!match) return null;
  const id = asString(match.id)!;
  const name = asString(match.name)!;
  const input = match.input;
  return { id, name, input, preview: toolInputPreviewFrom(input) };
}

function readClaudeTranscriptDetails(transcriptPath: string | null, payload: Record<string, unknown>): ClaudeTranscriptDetails {
  if (!transcriptPath || !existsSync(transcriptPath)) return emptyTranscriptDetails();
  const expectedToolUseId = firstDetailValue(payload, ['tool_use_id', 'toolUseID', 'toolUseId']);
  const expectedToolName = asString(payload.tool_name) ?? asString(payload.toolName) ?? asString(payload.name);
  const details = emptyTranscriptDetails();
  try {
    const lines = readLastTextLinesSync(transcriptPath, 260, 1024 * 1024).reverse();
    lines.some((line) => {
      const entry = asRecord(JSON.parse(line));
      details.sessionId = details.sessionId ?? asString(entry.sessionId) ?? asString(entry.session_id);
      const message = asRecord(entry.message);
      const role = asString(message.role) ?? asString(entry.role);
      const content = message.content ?? entry.content;
      if (role === 'user') {
        if (!details.userInput) details.userInput = textBlockValue(content);
        if (!details.toolResult) {
          const result = toolResultFromContent(content, expectedToolUseId ?? details.toolUseId);
          if (result?.value) {
            details.toolResult = result.value;
            details.toolUseId = details.toolUseId ?? result.id;
          }
        }
      } else if (role === 'assistant') {
        if (!details.assistantOutput) details.assistantOutput = textBlockValue(content);
        details.model = details.model ?? asString(message.model) ?? asString(entry.model);
        if (!details.toolName || !details.toolInputPreview) {
          const toolUse = toolUseFromContent(content, expectedToolUseId ?? details.toolUseId, expectedToolName);
          if (toolUse) {
            details.toolUseId = details.toolUseId ?? toolUse.id;
            details.toolName = details.toolName ?? toolUse.name;
            details.toolInput = details.toolInput ?? toolUse.input;
            details.toolInputPreview = details.toolInputPreview ?? toolUse.preview;
          }
        }
      } else if (asString(entry.type) === 'summary' && !details.assistantOutput) {
        details.assistantOutput = asString(entry.summary);
      }
      return Boolean(details.userInput && details.assistantOutput && details.toolName && details.toolInputPreview && details.toolResult);
    });
  } catch {
    return emptyTranscriptDetails();
  }
  return details;
}

function inferUserInput(payload: Record<string, unknown>, transcriptPath: string | null): string | null {
  return firstDetailValue(payload, ['prompt', 'user_prompt', 'userPrompt', 'user_input', 'userInput'])
    ?? userInputFromTranscript(transcriptPath);
}

function inferDetailItems(
  payload: Record<string, unknown>,
  toolInput: unknown,
  userInput: string | null,
  assistantOutput: string | null,
): ClaudeCodeHookEventDetailItem[] {
  const toolResponse = payloadToolResponse(payload);
  const detailSpecs: Array<[string, string | null]> = [
    ['userInput', userInput],
    ['assistantOutput', assistantOutput],
    ['toolUseId', firstDetailValue(payload, ['tool_use_id', 'toolUseID', 'toolUseId'])],
    ['toolInput', detailValue(toolInput)],
    ['toolResult', detailValue(toolResponse)],
    ['model', firstDetailValue(payload, ['model'])],
    ['notification', notificationPreview(payload)],
    ['eventSubtype', firstDetailValue(payload, ['notification_type', 'notificationType', 'subtype'])],
    ['error', firstDetailValue(payload, ['error', 'error_details', 'errorDetails'])],
    ['reason', firstDetailValue(payload, ['reason', 'permission_decision', 'permissionDecision'])],
  ];
  return detailSpecs
    .filter((item): item is [string, string] => Boolean(item[1]))
    .map(([label, value]) => ({ label, value }));
}

function inferEventName(payload: Record<string, unknown>): string {
  return asString(payload.hook_event_name)
    ?? asString(payload.hookEventName)
    ?? asString(payload.event_name)
    ?? asString(payload.eventName)
    ?? asString(payload.event)
    ?? asString(payload.type)
    ?? 'Unknown';
}

function inferKind(eventName: string): ClaudeCodeHookEventKind {
  if (eventName === 'PermissionRequest' || eventName === 'PermissionDenied') return 'permission';
  if (eventName === 'PreToolUse' || eventName === 'PostToolUse' || eventName === 'PostToolUseFailure') return 'tool';
  if (eventName === 'UserPromptSubmit') return 'message';
  if (eventName === 'Notification') return 'notification';
  if (eventName === 'Stop' || eventName === 'StopFailure' || eventName === 'SessionEnd' || eventName === 'SubagentStop') return 'completed';
  if (eventName === 'SessionStart' || eventName === 'SubagentStart' || eventName === 'PreCompact') return 'session';
  return 'unknown';
}

function inferSummary(eventName: string, payload: Record<string, unknown>, toolName: string | null): string {
  const toolResponsePreview = clipped(jsonValueString(payloadToolResponse(payload)));
  const assistantPreview = clipped(firstDetailValue(payload, ['last_assistant_message', 'lastAssistantMessage']));
  const direct = asString(payload.message)
    ?? asString(payload.prompt)
    ?? asString(payload.reason)
    ?? asString(payload.summary)
    ?? asString(payload.notification);
  if (eventName === 'SessionStart') return '发现新的 Claude Code 终端';
  if (eventName === 'SessionEnd') return '用户关闭了 Claude Code 终端';
  if (eventName === 'UserPromptSubmit') return '获取到用户提示词';
  if (eventName === 'PostToolUse' && toolName && toolResponsePreview) return `${toolName} 已完成：${toolResponsePreview}`;
  if ((eventName === 'Stop' || eventName === 'StopFailure' || eventName === 'SubagentStop') && assistantPreview) return assistantPreview;
  if (eventName === 'Notification') return notificationPreview(payload) ?? direct ?? '收到通知';
  if (direct) return direct;
  if (eventName === 'PreToolUse' && toolName) return `正在使用 ${toolName}`;
  if (eventName === 'PostToolUse' && toolName) return `${toolName} 已完成`;
  if (eventName === 'PostToolUseFailure' && toolName) return `${toolName} 执行失败`;
  if (eventName === 'PermissionRequest') return toolName ? `${toolName} 请求授权` : '请求授权';
  if (eventName === 'PermissionDenied') return toolName ? `${toolName} 授权被拒绝` : '授权被拒绝';
  if (eventName === 'Stop') return '本轮完成';
  if (eventName === 'StopFailure') return '本轮异常结束';
  if (eventName === 'SubagentStart') return '子代理开始';
  if (eventName === 'SubagentStop') return '子代理完成';
  if (eventName === 'PreCompact') return '正在压缩上下文';
  return eventName;
}

function sessionTitleFrom(cwd: string | null, sessionId: string): string {
  if (!cwd) return sessionId === 'claude-code' ? 'Claude Code' : sessionId;
  const normalized = cwd.replace(/\\/g, '/');
  return normalized.split('/').filter(Boolean).pop() ?? cwd;
}

function phaseAfterEvent(current: ClaudeCodeSessionPhase, event: ClaudeCodeHookEvent): ClaudeCodeSessionPhase {
  if (event.eventName === 'PermissionRequest') return 'waiting_permission';
  if (event.eventName === 'SessionEnd') return 'completed';
  if (event.eventName === 'SessionStart' || event.eventName === 'SubagentStart') return 'idle';
  if (event.eventName === 'Stop' || event.eventName === 'StopFailure') return 'idle';
  if (event.eventName === 'PostToolUse' && current === 'waiting_permission') return 'running';
  if (event.kind === 'tool' || event.kind === 'message' || event.kind === 'session') return 'running';
  return current;
}

function createHookScript(port: number): string {
  return `const http = require('http');\nconst fs = require('fs');\nconst os = require('os');\nconst path = require('path');\nconst hookEventName = process.argv[2] || null;\nlet input = '';\nfunction normalize(value) { return String(value || '').replace(/\\\\/g, '/').toLowerCase(); }\nfunction readJsonLine(filePath, fromEnd) {\n  try {\n    const text = fs.readFileSync(filePath, 'utf8').trim();\n    const lines = text.split(/\\r?\\n/);\n    const selected = fromEnd ? lines.slice(-80).reverse() : lines.slice(0, 80);\n    let _parsed = null;\n    selected.some((line) => { try { _parsed = JSON.parse(line); return true; } catch (_) { return false; } });\n    return _parsed;\n  } catch (_) {}\n  return null;\n}\nfunction entryCwd(filePath) {\n  const first = readJsonLine(filePath, false);\n  if (first && typeof first.cwd === 'string' && first.cwd) return first.cwd;\n  const recent = readJsonLine(filePath, true);\n  if (recent && typeof recent.cwd === 'string' && recent.cwd) return recent.cwd;\n  return null;\n}\nfunction collectJsonlFiles(dir, output, deadline) {\n  if (Date.now() > deadline || output.length > 240) return;\n  let entries = [];\n  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }\n  let _done = false;\n  entries.forEach((entry) => {\n    if (_done) return;\n    if (Date.now() > deadline || output.length > 240) { _done = true; return; }\n    const fullPath = path.join(dir, entry.name);\n    if (entry.isDirectory()) {\n      if (entry.name !== 'subagents') collectJsonlFiles(fullPath, output, deadline);\n      return;\n    }\n    if (entry.isFile() && entry.name.endsWith('.jsonl')) {\n      try { output.push({ path: fullPath, mtimeMs: fs.statSync(fullPath).mtimeMs }); } catch (_) {}\n    }\n  });\n}\nfunction latestTranscriptForCwd(cwd) {\n  const root = path.join(os.homedir(), '.claude', 'projects');\n  const files = [];\n  collectJsonlFiles(root, files, Date.now() + 650);\n  const normalizedCwd = normalize(cwd);\n  const recentFiles = files.sort((a, b) => b.mtimeMs - a.mtimeMs).slice(0, 80);\n  const _matched = recentFiles.find((file) => { const fileCwd = entryCwd(file.path); return fileCwd && normalize(fileCwd) === normalizedCwd; });\n  if (_matched) return _matched.path;\n  return recentFiles[0] ? recentFiles[0].path : null;\n}\nfunction enrichPayload(payload) {\n  const cwd = payload.cwd || payload.project_dir || payload.projectDir || process.cwd();\n  if (!payload.cwd) payload.cwd = cwd;\n  if (!payload.transcript_path && !payload.transcriptPath) {\n    const transcriptPath = latestTranscriptForCwd(cwd);\n    if (transcriptPath) payload.transcript_path = transcriptPath;\n  }\n  return payload;\n}\nprocess.stdin.setEncoding('utf8');\nprocess.stdin.on('data', chunk => { input += chunk; });\nprocess.stdin.on('end', () => {\n  let payload = {};\n  try { payload = input.trim() ? JSON.parse(input) : {}; } catch (error) { payload = { parseError: String(error), raw: input }; }\n  if (hookEventName && !payload.hook_event_name) payload.hook_event_name = hookEventName;\n  payload = enrichPayload(payload);\n  const body = JSON.stringify(payload);\n  const isPermission = hookEventName === 'PermissionRequest';\n  const req = http.request({ hostname: '127.0.0.1', port: ${port}, path: '/claude-code/hook', method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) }, timeout: isPermission ? ${PERMISSION_WAIT_TIMEOUT_MS + 5000} : 1500 }, res => { let resBody = ''; res.setEncoding('utf8'); res.on('data', c => { resBody += c; }); res.on('end', () => { if (isPermission) { try { const parsed = JSON.parse(resBody || '{}'); const decision = parsed && parsed.decision; if (decision === 'deny') { process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true, hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'deny', message: 'User denied the permission request', interrupt: false } } })); } else if (decision === 'allow' || decision === 'always') { process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true, hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'allow' } } })); } } catch (_) {} } process.exit(0); }); });\n  req.on('timeout', () => { req.destroy(); process.exit(0); });\n  req.on('error', () => process.exit(0));\n  req.write(body);\n  req.end();\n});\n  if (hookEventName !== 'PermissionRequest') setTimeout(() => process.exit(0), 2500);\n`;
}

function shellQuote(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

function buildManagedCommand(scriptPath: string, eventName: string): string {
  return `${shellQuote(process.execPath)} ${shellQuote(scriptPath)} ${shellQuote(eventName)} # ${MANAGED_MARKER}`;
}

function managedHook(command: string, matcher?: string, timeout?: number): Record<string, unknown> {
  const hook: Record<string, unknown> = { type: 'command', command };
  if (typeof timeout === 'number') hook.timeout = timeout;
  const group: Record<string, unknown> = { hooks: [hook] };
  if (matcher) group.matcher = matcher;
  return group;
}

function removeManagedGroups(groups: unknown): Record<string, unknown>[] {
  if (!Array.isArray(groups)) return [];
  return groups
    .map((item) => asRecord(item))
    .map((group) => {
      const hooks = Array.isArray(group.hooks) ? group.hooks : [];
      return {
        ...group,
        hooks: hooks.filter((hook) => !String(asRecord(hook).command ?? '').includes(MANAGED_MARKER)),
      };
    })
    .filter((group) => Array.isArray(group.hooks) && group.hooks.length > 0);
}

/**
 * 创建 Claude Code 状态服务实例
 * @param options - 创建参数，包含主窗口获取函数和可选端口号
 * @returns 状态服务实例
 */
export function createClaudeCodeStatusService(options: CreateClaudeCodeStatusServiceOptions): ClaudeCodeStatusService {
  const port = options.port ?? DEFAULT_PORT;
  const settingsPath = join(app.getPath('home'), '.claude', 'settings.json');
  const hookScriptPath = join(app.getPath('userData'), 'claude-code-hook.cjs');
  const persistPath = join(app.getPath('userData'), 'eIsland_store', 'claude-code-status.json');
  const detailDirectory = join(app.getPath('userData'), 'eIsland_store', 'cli-details');
  const writeSnapshot = createCliSnapshotWriter(persistPath);
  let persistenceReady = true;
  let persistedDetailIds = new Set<string>();
  const backfillTimers = new Set<ReturnType<typeof setTimeout>>();
  // 热力图独立持久化：与事件/会话存储互不影响，清空会话或事件不波及热力图
  const persistHeatmapPath = join(app.getPath('userData'), 'eIsland_store', 'claude-code-heatmap.json');
  const sessions = new Map<string, ClaudeCodeSessionSnapshot>();
  const deltas = createCliSnapshotDelta();
  let activeRequests = 0;
  const bodyRequests = new Map<http.IncomingMessage, () => void>();
  let events: ClaudeCodeHookEvent[] = [];
  let heatmapDaily: ClaudeCodeHeatmapDaily = {};
  let server: http.Server | null = null;
  let starting: Promise<void> | null = null;
  let lifecycleVersion = 0;
  let loadController: AbortController | null = null;
  let receiverUrl: string | null = null;
  let updatedAt = Date.now();

  // ── 持久化：事件流与会话写入磁盘，重启后恢复 maxExpand CLI 面板内容 ──
  let persistTimer: ReturnType<typeof setTimeout> | null = null;

  const persistNow = (): void => {
    if (!persistenceReady) return;
    const keptSessions = limitRecentSessions(sessions.values());
    const ids = new Set([...events, ...keptSessions.flatMap((session) => session.events)].map((event) => event.id));
    const candidates = [...persistedDetailIds];
    void writeSnapshot({ version: 2, events, sessions: keptSessions, updatedAt }).then((success) => {
      if (!success) return;
      const removed = candidates.filter((id) => !ids.has(id));
      removed.forEach((id) => persistedDetailIds.delete(id));
      void removeCliEventDetails(detailDirectory, removed);
    });
  };

  const schedulePersist = (): void => {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => { persistTimer = null; persistNow(); }, 400);
  };

  // ── 热力图独立持久化：单独文件、单独防抖，不与事件/会话存储耦合 ──
  let heatmapPersistTimer: ReturnType<typeof setTimeout> | null = null;

  const writeHeatmap = createCliSnapshotWriter(persistHeatmapPath);
  const persistHeatmapNow = (): void => { void writeHeatmap({ version: 1, daily: heatmapDaily }); };

  const scheduleHeatmapPersist = (): void => {
    if (heatmapPersistTimer) clearTimeout(heatmapPersistTimer);
    heatmapPersistTimer = setTimeout(() => { heatmapPersistTimer = null; persistHeatmapNow(); }, 400);
  };

  /** 事件名到热力图指标的映射，仅这三类计入热力图 */
  const heatmapMetricOf = (eventName: string): keyof ClaudeCodeHeatmapDailyCount | null => {
    if (eventName === 'SessionStart') return 'session';
    if (eventName === 'PreToolUse') return 'tool';
    if (eventName === 'UserPromptSubmit') return 'prompt';
    return null;
  };

  /** 把一个事件累计进热力图当日计数；累计后独立落盘 */
  const recordHeatmap = (eventName: string, createdAt: number): void => {
    const metric = heatmapMetricOf(eventName);
    if (!metric) return;
    const d = new Date(createdAt);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    const bucket = heatmapDaily[key] ?? { session: 0, tool: 0, prompt: 0 };
    bucket[metric] += 1;
    heatmapDaily[key] = bucket;
    scheduleHeatmapPersist();
  };

  const loadPersisted = async (signal: AbortSignal): Promise<void> => {
    try {
      if (!existsSync(persistPath)) return;
      const root = await loadCliState(persistPath, detailDirectory, signal);
      if (signal.aborted) return;
      const loadedEvents = Array.isArray(root.events) ? (root.events as ClaudeCodeHookEvent[]) : [];
      const loadedSessions = Array.isArray(root.sessions)
        ? limitRecentSessions(root.sessions as ClaudeCodeSessionSnapshot[])
        : [];
      events = loadedEvents.slice(0, MAX_EVENTS).map(summarizeCliEvent);
      persistedDetailIds = new Set([...events, ...loadedSessions.flatMap((session) => session.events ?? [])].map((event) => event.id));
      sessions.clear();
      loadedSessions.forEach((session) => {
        if (session && typeof session.id === 'string') {
          // 重启后无法再响应历史待授权请求，挂起态归并为已结束/空闲展示
          const phase = session.phase === 'waiting_permission' ? 'idle' : session.phase;
          sessions.set(session.id, { ...session, phase, pendingPermission: null, events: (session.events ?? []).slice(0, MAX_SESSION_EVENTS).map(summarizeCliEvent) });
          // 重建合并锚点，避免重启后同一 cwd / transcript 再次分裂
          if (session.cwd) cwdToSession.set(session.cwd, session.id);
          if (session.transcriptPath) transcriptToSession.set(session.transcriptPath, session.id);
        }
      });
    } catch {
      // 迁移失败保留旧文件，禁止以空快照覆盖历史。
      if (!signal.aborted) persistenceReady = false;
    }
  };

  const loadHeatmap = (): void => {
    try {
      if (!existsSync(persistHeatmapPath)) return;
      const root = asRecord(JSON.parse(readFileSync(persistHeatmapPath, 'utf-8')));
      const daily = asRecord(root.daily);
      const next: ClaudeCodeHeatmapDaily = {};
      Object.entries(daily).forEach(([key, value]) => {
        const rec = asRecord(value);
        next[key] = {
          session: typeof rec.session === 'number' ? rec.session : 0,
          tool: typeof rec.tool === 'number' ? rec.tool : 0,
          prompt: typeof rec.prompt === 'number' ? rec.prompt : 0,
        };
      });
      heatmapDaily = next;
    } catch {
      // 读取失败时忽略，使用空状态
    }
  };

  const emitSnapshot = (persist = true): void => {
    updatedAt = Date.now();
    if (persist) schedulePersist();
    const win = options.getMainWindow();
    if (!win || win.isDestroyed()) return;
    win.webContents.send('claude-code:status-updated', deltas.next(getSnapshot()));
  };

  const isHookInstalled = (): boolean => {
    try {
      if (!existsSync(settingsPath)) return false;
      return readFileSync(settingsPath, 'utf-8').includes(MANAGED_MARKER);
    } catch {
      return false;
    }
  };

  const syncInstalledHookCommands = (): void => {
    try {
      if (!existsSync(settingsPath)) return;
      const raw = readFileSync(settingsPath, 'utf-8');
      if (!raw.includes(MANAGED_MARKER)) return;
      const root = asRecord(JSON.parse(raw));
      const hooks = asRecord(root.hooks);
      let changed = false;
      HOOK_EVENTS.forEach((spec) => {
        const currentGroups = removeManagedGroups(hooks[spec.name]);
        const nextGroups = [...currentGroups, managedHook(buildManagedCommand(hookScriptPath, spec.name), spec.matcher, spec.timeout)];
        if (JSON.stringify(hooks[spec.name]) !== JSON.stringify(nextGroups)) {
          hooks[spec.name] = nextGroups;
          changed = true;
        }
      });
      if (changed) writeFileSync(settingsPath, JSON.stringify({ ...root, hooks }, null, 2), 'utf-8');
    } catch {
      // Keep status receiver available even if Claude settings cannot be migrated.
    }
  };

  const getSnapshot = (): ClaudeCodeStatusSnapshot => ({
    revision: deltas.revision(),
    enabled: isHookInstalled(),
    receiverRunning: Boolean(server),
    receiverUrl,
    settingsPath,
    hookScriptPath,
    sessions: limitRecentSessions(sessions.values()),
    events,
    heatmap: heatmapDaily,
    updatedAt,
  });

  const scheduleEventBackfill = (event: ClaudeCodeHookEvent): void => {
    const labels = event.eventName === 'UserPromptSubmit' ? ['userInput'] : event.kind === 'tool' ? ['toolUseId', 'toolResult']
      : ['Stop', 'StopFailure', 'SessionEnd', 'SubagentStop'].includes(event.eventName) ? ['assistantOutput'] : [];
    if (!labels.some((label) => !event.detailItems.some((item) => item.label === label))) return;
    [350, 1200].forEach((delay) => {
      const timer = setTimeout(() => {
        backfillTimers.delete(timer);
        const session = sessions.get(event.sessionId);
        const current = session?.events.find((item) => item.id === event.id) ?? events.find((item) => item.id === event.id);
        if (!current) return;
        const missing = labels.filter((label) => !current.detailItems.some((item) => item.label === label));
        if (!missing.length) return;
        const details = readClaudeTranscriptDetails(event.transcriptPath, { tool_name: event.toolName,
          tool_use_id: current.detailItems.find((item) => item.label === 'toolUseId')?.value });
        const extra = missing.flatMap((label) => {
          const value = details[label as keyof ClaudeTranscriptDetails];
          return typeof value === 'string' && value ? [{ label, value }] : [];
        });
        if (!extra.length) return;
        try { saveCliEventDetails(detailDirectory, { ...current, detailItems: extra }, true); } catch { return; }
        const updated = summarizeCliEvent({ ...current, detailItems: [...extra, ...current.detailItems], detailRevision: (current.detailRevision ?? 0) + 1 });
        events = events.map((item) => item.id === event.id ? updated : item);
        const currentSession = sessions.get(current.sessionId) ?? session;
        if (currentSession) sessions.set(currentSession.id, { ...currentSession, events: currentSession.events.map((item) => item.id === event.id ? updated : item) });
        emitSnapshot();
      }, delay);
      backfillTimers.add(timer);
    });
  };

  // transcriptPath / cwd → 规范 sessionId 映射，用于把同一会话的事件并入，避免会话分裂
  const transcriptToSession = new Map<string, string>();
  const cwdToSession = new Map<string, string>();

  /** 等待用户授权决策的 hook 请求（按 sessionId 暂存其 HTTP 响应） */
  const permissionWaiters = new Map<string, { response: http.ServerResponse; timer: ReturnType<typeof setTimeout>; identity: { sessionId: string } }>();

  /** 向暂存的 hook 请求写回授权决策并结束响应 */
  const respondPermission = (sessionId: string, decision: PermissionDecision | null): boolean => {
    const waiter = permissionWaiters.get(sessionId);
    if (!waiter) return false;
    clearTimeout(waiter.timer);
    permissionWaiters.delete(sessionId);
    try {
      waiter.response.writeHead(200, { 'content-type': 'application/json' });
      waiter.response.end(JSON.stringify({ ok: true, decision }));
    } catch { /* 响应已结束，忽略 */ }
    return true;
  };

  /** 将 fromId 会话的事件并入 toId 会话，并清理来源会话 */
  const mergeSession = (fromId: string, toId: string): void => {
    if (fromId === toId) return;
    const waiter = permissionWaiters.get(fromId);
    const targetWaiter = permissionWaiters.get(toId);
    if (waiter) {
      if (targetWaiter) {
        // 目标请求与目标会话状态一致；释放来源请求，避免覆盖目标授权等待。
        respondPermission(fromId, null);
      } else {
        permissionWaiters.delete(fromId);
        waiter.identity.sessionId = toId;
        permissionWaiters.set(toId, waiter);
      }
    }
    const from = sessions.get(fromId);
    events = events.map((e) => (e.sessionId === fromId ? { ...e, sessionId: toId } : e));
    if (from) {
      const to = sessions.get(toId);
      if (to) {
        let { phase: mergedPhase, pendingPermission: mergedPermission } = to;
        if (waiter && !targetWaiter) {
          ({ phase: mergedPhase } = from);
          mergedPermission = from.pendingPermission ? { ...from.pendingPermission, sessionId: toId } : null;
        }
        const mergedEvents = [...to.events, ...from.events]
          .map((e) => (e.sessionId === fromId ? { ...e, sessionId: toId } : e))
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, MAX_SESSION_EVENTS);
        sessions.set(toId, { ...to, phase: mergedPhase, pendingPermission: mergedPermission, events: mergedEvents, lastEventAt: Math.max(to.lastEventAt, from.lastEventAt) });
      } else {
        sessions.set(toId, {
          ...from,
          id: toId,
          events: from.events.map((event) => ({ ...event, sessionId: toId })),
          pendingPermission: from.pendingPermission ? { ...from.pendingPermission, sessionId: toId } : null,
        });
      }
      sessions.delete(fromId);
    }
    transcriptToSession.forEach((value, key) => {
      if (value === fromId) transcriptToSession.set(key, toId);
    });
    cwdToSession.forEach((value, key) => {
      if (value === fromId) cwdToSession.set(key, toId);
    });
  };

  /**
   * 解析事件所属会话：优先 session_id，并以 transcriptPath 与 cwd 作为合并锚点防止分裂。
   * Claude Code 在新会话启动早期常把 transcript 富化为上一轮文件、且 session_id 可能与
   * 结束事件不一致，导致同一终端被拆成两个会话；以 cwd 归并保证一个工作目录只对应一个会话卡片。
   */
  const resolveSessionId = (payload: Record<string, unknown>, transcriptPath: string | null, cwd: string | null): string => {
    const explicit = asString(payload.session_id) ?? asString(payload.sessionID) ?? asString(payload.sessionId);
    let canonical: string;
    if (explicit) {
      canonical = explicit;
    } else if (transcriptPath && transcriptToSession.has(transcriptPath)) {
      canonical = transcriptToSession.get(transcriptPath)!;
    } else if (cwd && cwdToSession.has(cwd)) {
      canonical = cwdToSession.get(cwd)!;
    } else {
      canonical = transcriptPath ?? cwd ?? 'claude-code';
    }

    // 以 cwd 归并：同一工作目录已有其它会话则合并为同一个
    if (cwd) {
      const prev = cwdToSession.get(cwd);
      if (prev && prev !== canonical) mergeSession(prev, canonical);
      cwdToSession.set(cwd, canonical);
    }
    if (transcriptPath) {
      const prev = transcriptToSession.get(transcriptPath);
      if (prev && prev !== canonical) mergeSession(prev, canonical);
      transcriptToSession.set(transcriptPath, canonical);
    }
    return canonical;
  };

  const addEvent = (payload: Record<string, unknown>): ClaudeCodeHookEvent => {
    const eventName = inferEventName(payload);
    // 不在 CLI / maxExpand 面板展示 Notification 事件：直接忽略，不存储也不广播
    if (eventName === 'Notification') {
      return {
        id: '', eventName, kind: 'notification', sessionId: '', cwd: null, transcriptPath: null,
        summary: '', detail: null, detailItems: [], toolName: null, toolInputPreview: null,
        createdAt: Date.now(), raw: payload,
      };
    }
    const rawTranscriptPath = asString(payload.transcript_path) ?? asString(payload.transcriptPath);
    const transcriptDetails = readClaudeTranscriptDetails(rawTranscriptPath, payload);
    const enrichedPayload: Record<string, unknown> = {
      ...payload,
      tool_use_id: firstDetailValue(payload, ['tool_use_id', 'toolUseID', 'toolUseId']) ?? transcriptDetails.toolUseId ?? undefined,
      tool_name: asString(payload.tool_name) ?? asString(payload.toolName) ?? asString(payload.name) ?? transcriptDetails.toolName ?? undefined,
      tool_input: payload.tool_input ?? payload.toolInput ?? payload.input ?? transcriptDetails.toolInput,
      tool_response: payloadToolResponse(payload) ?? transcriptDetails.toolResult ?? undefined,
      model: asString(payload.model) ?? transcriptDetails.model ?? undefined,
      last_assistant_message: firstDetailValue(payload, ['last_assistant_message', 'lastAssistantMessage']) ?? transcriptDetails.assistantOutput ?? undefined,
      prompt: asString(payload.prompt) ?? asString(payload.user_prompt) ?? asString(payload.userPrompt) ?? transcriptDetails.userInput ?? undefined,
    };
    const cwd = asString(enrichedPayload.cwd) ?? asString(enrichedPayload.workspace) ?? asString(enrichedPayload.project_dir) ?? asString(enrichedPayload.projectDir);
    const transcriptPath = asString(enrichedPayload.transcript_path) ?? asString(enrichedPayload.transcriptPath);
    const sessionId = resolveSessionId(enrichedPayload, transcriptPath, cwd);
    const toolName = asString(enrichedPayload.tool_name) ?? asString(enrichedPayload.toolName) ?? asString(enrichedPayload.name);
    const toolInput = enrichedPayload.tool_input ?? enrichedPayload.toolInput ?? enrichedPayload.input;
    if (eventName === 'PermissionRequest' && Buffer.byteLength(JSON.stringify(toolInput ?? {})) > 64 * 1024) throw new Error('Permission input exceeds the UI budget; review in the CLI.');
    const userInput = inferUserInput(enrichedPayload, transcriptPath);
    const assistantOutput = eventName === 'Stop' || eventName === 'StopFailure' || eventName === 'SessionEnd' || eventName === 'SubagentStop'
      ? payloadAssistantOutput(enrichedPayload, transcriptPath)
      : firstDetailValue(enrichedPayload, ['last_assistant_message', 'lastAssistantMessage']);
    const detailItems = inferDetailItems(enrichedPayload, toolInput, userInput, assistantOutput);
    const fullEvent: ClaudeCodeHookEvent = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      eventName,
      kind: inferKind(eventName),
      sessionId,
      cwd,
      transcriptPath,
      summary: inferSummary(eventName, enrichedPayload, toolName),
      detail: null,
      detailItems,
      toolName,
      toolInputPreview: transcriptDetails.toolInputPreview ?? toolInputPreviewFrom(toolInput),
      createdAt: Date.now(),
      raw: enrichedPayload,
    };

    saveCliEventDetails(detailDirectory, fullEvent);
    persistedDetailIds.add(fullEvent.id);
    const event = summarizeCliEvent({ ...fullEvent, detailProvider: 'claude', detailRevision: 0 });
    events = [event, ...events].slice(0, MAX_EVENTS);
    // 热力图累计：独立于事件/会话存储，清空时不会被清除
    recordHeatmap(eventName, event.createdAt);
    const current = sessions.get(sessionId);
    const nextEvents = [event, ...(current?.events ?? [])].slice(0, MAX_SESSION_EVENTS);
    const nextPhase = phaseAfterEvent(current?.phase ?? 'idle', event);
    let pendingPermission: ClaudeCodeHookEvent | null = null;
    if (nextPhase === 'waiting_permission') {
      pendingPermission = event.eventName === 'PermissionRequest' ? { ...event, raw: { tool_input: toolInput } } : event;
      if (event.eventName !== 'PermissionRequest' && current?.pendingPermission?.eventName === 'PermissionRequest') {
        ({ pendingPermission } = current);
      }
    }
    sessions.set(sessionId, {
      pendingPermission,
      id: sessionId,
      title: current?.title ?? sessionTitleFrom(cwd, sessionId),
      phase: nextPhase,
      cwd: cwd ?? current?.cwd ?? null,
      transcriptPath: transcriptPath ?? current?.transcriptPath ?? null,
      lastSummary: event.summary,
      lastEventAt: event.createdAt,
      events: nextEvents,
    });
    const retainedSessionIds = new Set(limitRecentSessions(sessions.values()).map((session) => session.id));
    Array.from(sessions.keys())
      .filter((sessionIdToRemove) => !retainedSessionIds.has(sessionIdToRemove))
      .forEach((sessionIdToRemove) => { respondPermission(sessionIdToRemove, null); sessions.delete(sessionIdToRemove); });
    transcriptToSession.forEach((id, key) => { if (!sessions.has(id)) transcriptToSession.delete(key); });
    cwdToSession.forEach((id, key) => { if (!sessions.has(id)) cwdToSession.delete(key); });
    scheduleEventBackfill(event);
    emitSnapshot();
    return event;
  };

  const resolvePermission = (sessionId: string, decision: PermissionDecision): ClaudeCodeStatusSnapshot => {
    respondPermission(sessionId, decision);
    const current = sessions.get(sessionId);
    if (current && current.phase === 'waiting_permission') {
      sessions.set(sessionId, { ...current, phase: 'running', pendingPermission: null });
      emitSnapshot();
    }
    return getSnapshot();
  };

  const handleRequest = (request: http.IncomingMessage, response: http.ServerResponse): void => {
    if (request.method !== 'POST' || request.url !== '/claude-code/hook') {
      response.writeHead(404);
      response.end();
      return;
    }
    const rejectRequest = (status: number): void => {
      response.shouldKeepAlive = false;
      response.writeHead(status);
      response.end(() => request.destroy());
      request.resume?.();
    };
    if (activeRequests >= 4) { rejectRequest(503); return; }
    activeRequests += 1;
    let receiving = true;
    const release = (): void => {
      if (receiving) { receiving = false; activeRequests -= 1; }
      clearTimeout(deadline); bodyRequests.delete(request);
    };
    let body = '';
    let bodyBytes = 0;
    let rejected = false;
    request.setEncoding('utf-8');
    request.on('aborted', () => { rejected = true; body = ''; release(); });
    request.on('error', () => { rejected = true; body = ''; release(); });
    // 硬期限不会因持续收到零碎数据而延长，停止时也能主动销毁当前所有请求。
    const deadline = setTimeout(() => { body = ''; rejected = true; release(); rejectRequest(408); }, 10000);
    bodyRequests.set(request, () => { rejected = true; body = ''; release(); request.destroy?.(); });
    request.on('data', (chunk: string) => {
      if (rejected) return;
      bodyBytes += Buffer.byteLength(chunk);
      if (bodyBytes > 4 * 1024 * 1024) {
        rejected = true; body = ''; release(); rejectRequest(413); return;
      }
      body += chunk;
    });
    request.on('end', () => {
      release();
      if (rejected) return;
      try {
        const payload = asRecord(JSON.parse(body || '{}'));
        body = '';
        validateHookMetadata(payload);
        // 完整权限输入超预算时交还 CLI 审批，绝不裁剪后提供批准按钮。
        if (inferEventName(payload) === 'PermissionRequest' && Buffer.byteLength(JSON.stringify(payload.tool_input ?? payload.toolInput ?? payload.input ?? {})) > 64 * 1024) {
          rejectRequest(413); return;
        }
        const event = addEvent(payload);
        // 授权请求：暂存响应，等待用户在 UI 上做出决策（批准/永久批准/拒绝）
        if (event.eventName === 'PermissionRequest') {
          respondPermission(event.sessionId, null); // 清理同会话的旧等待
          // 更新同一身份对象，让原定时器使用迁移后的 ID，保留原截止时间。
          const identity = { sessionId: event.sessionId };
          const timer = setTimeout(() => { respondPermission(identity.sessionId, null); }, PERMISSION_WAIT_TIMEOUT_MS);
          permissionWaiters.set(event.sessionId, { response, timer, identity });
          return;
        }
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ ok: true }));
      } catch (error) {
        response.writeHead(400, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ ok: false, error: String(error) }));
      }
    });
  };

  async function start(): Promise<void> {
    if (server) return;
    if (starting) return starting;
    const version = ++lifecycleVersion;
    const controller = new AbortController();
    loadController = controller;
    persistenceReady = true;
    const request = (async () => {
      await loadPersisted(controller.signal);
      if (controller.signal.aborted || version !== lifecycleVersion) return;
      loadHeatmap();
      mkdirSync(dirname(hookScriptPath), { recursive: true });
      writeFileSync(hookScriptPath, createHookScript(port), 'utf-8');
      syncInstalledHookCommands();
      await new Promise<void>((resolve) => {
        const created = http.createServer(handleRequest);
        server = created;
        created.listen(port, '127.0.0.1', () => {
          if (version === lifecycleVersion) receiverUrl = `http://127.0.0.1:${port}/claude-code/hook`;
          resolve();
        });
        created.on('error', () => {
          if (server === created) { server = null; receiverUrl = null; }
          resolve();
        });
      });
      if (version === lifecycleVersion) emitSnapshot();
    })().finally(() => {
      if (starting === request) starting = null;
      if (loadController === controller) loadController = null;
    });
    starting = request;
    return request;
  }

  function stop(): void {
    lifecycleVersion += 1; loadController?.abort(); loadController = null; starting = null;
    [...bodyRequests.values()].forEach((cancel) => cancel());
    backfillTimers.forEach(clearTimeout); backfillTimers.clear();
    if (persistTimer) { clearTimeout(persistTimer); persistTimer = null; persistNow(); }
    if (heatmapPersistTimer) { clearTimeout(heatmapPersistTimer); heatmapPersistTimer = null; persistHeatmapNow(); }
    if (!server) return;
    Array.from(permissionWaiters.keys()).forEach((sessionId) => respondPermission(sessionId, null));
    server.close();
    server.closeAllConnections?.();
    server = null;
    receiverUrl = null;
    emitSnapshot(false);
  }

  async function installHook(): Promise<ClaudeSettingsMutationResult> {
    try {
      await start();
      mkdirSync(dirname(settingsPath), { recursive: true });
      const root = existsSync(settingsPath) ? asRecord(JSON.parse(readFileSync(settingsPath, 'utf-8'))) : {};
      const hooks = asRecord(root.hooks);
      HOOK_EVENTS.forEach((spec) => {
        const currentGroups = removeManagedGroups(hooks[spec.name]);
        hooks[spec.name] = [...currentGroups, managedHook(buildManagedCommand(hookScriptPath, spec.name), spec.matcher, spec.timeout)];
      });
      writeFileSync(settingsPath, JSON.stringify({ ...root, hooks }, null, 2), 'utf-8');
      emitSnapshot();
      return { ok: true, message: 'Claude Code 状态 hook 已启用。', snapshot: getSnapshot() };
    } catch (error) {
      return { ok: false, message: String(error), snapshot: getSnapshot() };
    }
  }

  async function uninstallHook(): Promise<ClaudeSettingsMutationResult> {
    try {
      if (!existsSync(settingsPath)) return { ok: true, message: 'Claude Code 配置不存在。', snapshot: getSnapshot() };
      const root = asRecord(JSON.parse(readFileSync(settingsPath, 'utf-8')));
      const hooks = asRecord(root.hooks);
      // 遍历所有已存在的 hook 键，清除托管分组（含历史遗留/已移除的事件，如 Notification）
      Object.keys(hooks).forEach((name) => {
        const currentGroups = removeManagedGroups(hooks[name]);
        if (currentGroups.length > 0) hooks[name] = currentGroups;
        else delete hooks[name];
      });
      const nextRoot = Object.keys(hooks).length > 0 ? { ...root, hooks } : { ...root };
      if (Object.keys(hooks).length === 0) delete nextRoot.hooks;
      writeFileSync(settingsPath, JSON.stringify(nextRoot, null, 2), 'utf-8');
      emitSnapshot();
      return { ok: true, message: 'Claude Code 状态 hook 已关闭。', snapshot: getSnapshot() };
    } catch (error) {
      return { ok: false, message: String(error), snapshot: getSnapshot() };
    }
  }

  function clearEvents(): ClaudeCodeStatusSnapshot {
    backfillTimers.forEach(clearTimeout); backfillTimers.clear();
    transcriptToSession.clear(); cwdToSession.clear();
    Array.from(permissionWaiters.keys()).forEach((id) => respondPermission(id, null));
    events = [];
    sessions.clear();
    emitSnapshot();
    return getSnapshot();
  }

  function deleteSessions(sessionIds: string[]): ClaudeCodeStatusSnapshot {
    const sessionIdSet = new Set(sessionIds.filter(Boolean));
    if (sessionIdSet.size === 0) return getSnapshot();
    events = events.filter((event) => !sessionIdSet.has(event.sessionId));
    sessionIdSet.forEach((sessionId) => { respondPermission(sessionId, null); sessions.delete(sessionId); });
    emitSnapshot();
    return getSnapshot();
  }

  return { start, stop, getSnapshot, installHook, uninstallHook, clearEvents, deleteSessions, resolvePermission };
}
