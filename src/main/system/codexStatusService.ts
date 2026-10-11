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
 * @file codexStatusService.ts
 * @description 轮询 Codex rollout 文件并发布统一 CLI 状态快照。
 * @author 鸡哥
 */

import { app, type BrowserWindow } from 'electron';
import { type Dirent, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import type { ClaudeCodeHeatmapDaily } from '../types/system/ClaudeCodeHeatmapDailyCount';
import type { ClaudeCodeHookEvent } from '../types/system/ClaudeCodeHookEvent';
import type { ClaudeCodeSessionSnapshot } from '../types/system/ClaudeCodeSessionSnapshot';
import type { ClaudeCodeStatusSnapshot } from '../types/system/ClaudeCodeStatusSnapshot';
import type { CodexMonitorMutationResult, CodexStatusService } from '../types/system/CodexStatusService';
import type { ParsedCodexSession } from './codexSessionParser';
import { createCodexScanner } from './codexScannerClient';
import { createCliSnapshotDelta } from './cliSnapshotDelta';
import { MAX_CLI_SESSIONS } from './sessionLimits';

interface CreateCodexStatusServiceOptions {
  getMainWindow: () => BrowserWindow | null;
  pollIntervalMs?: number;
}

interface FileEntry {
  path: string;
  mtimeMs: number;
  size: number;
}

interface PersistedCodexState {
  enabled: boolean;
  clearBefore: number;
  deletedBeforeBySession: Record<string, number>;
}

const MAX_EVENTS = 120;
const MAX_SESSION_EVENTS = 40;
const DEFAULT_POLL_INTERVAL_MS = 5000;

function emptySnapshot(sessionsPath: string, enabled: boolean, running: boolean): ClaudeCodeStatusSnapshot {
  return {
    enabled,
    receiverRunning: running,
    receiverUrl: null,
    settingsPath: sessionsPath,
    hookScriptPath: '',
    sessions: [],
    events: [],
    heatmap: {},
    updatedAt: Date.now(),
  };
}

function collectJsonlFiles(root: string): FileEntry[] {
  if (!existsSync(root)) return [];
  const output: FileEntry[] = [];
  const visit = (directory: string): void => {
    if (output.length >= MAX_CLI_SESSIONS) return;
    let entries: Dirent<string>[];
    try {
      entries = readdirSync(directory, { withFileTypes: true, encoding: 'utf-8' });
    } catch {
      return;
    }
    entries.sort((a, b) => b.name.localeCompare(a.name)).some((entry) => {
      if (output.length >= MAX_CLI_SESSIONS) return true;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(path);
        return false;
      }
      if (!entry.isFile() || !entry.name.endsWith('.jsonl')) return false;
      try {
        const stat = statSync(path);
        output.push({ path, mtimeMs: stat.mtimeMs, size: stat.size });
      } catch {
        // 文件可能在扫描时被 Codex 轮换，下一轮会重新发现。
      }
      return false;
    });
  };
  visit(root);
  return output.sort((a, b) => b.mtimeMs - a.mtimeMs).slice(0, MAX_CLI_SESSIONS);
}

function mergeHeatmap(target: ClaudeCodeHeatmapDaily, source: ClaudeCodeHeatmapDaily): void {
  Object.entries(source).forEach(([date, count]) => {
    const current = target[date] ?? { session: 0, tool: 0, prompt: 0 };
    target[date] = {
      session: current.session + count.session,
      tool: current.tool + count.tool,
      prompt: current.prompt + count.prompt,
    };
  });
}

function phaseForVisibleEvents(events: ClaudeCodeHookEvent[], now: number): ClaudeCodeSessionSnapshot['phase'] {
  const latest = events[0];
  if (!latest || now - latest.createdAt > 10 * 60 * 1000) return 'completed';
  if (latest.eventName === 'PermissionRequest') return 'waiting_permission';
  if (latest.eventName === 'Stop' || latest.eventName === 'StopFailure' || latest.eventName === 'AssistantOutput') return 'idle';
  return 'running';
}

/**
 * 创建 Codex CLI 状态服务
 * @param options - 主窗口访问器与可选轮询周期
 * @returns Codex 状态服务实例
 */
export function createCodexStatusService(options: CreateCodexStatusServiceOptions): CodexStatusService {
  const sessionsPath = join(app.getPath('home'), '.codex', 'sessions');
  const persistPath = join(app.getPath('userData'), 'eIsland_store', 'codex-status-state.json');
  const scanner = createCodexScanner();
  let parsedSessions: ParsedCodexSession[] = [];
  let fileSignature = '';
  let scanning: Promise<void> | null = null;
  let generation = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  let enabled = true;
  let clearBefore = 0;
  let deletedBeforeBySession: Record<string, number> = {};
  let snapshot = emptySnapshot(sessionsPath, enabled, false);
  let snapshotSignature = '';
  let dataVersion = 0;
  let metadata = new Map<string, string>();
  let mutationVersion = 0;
  const deltas = createCliSnapshotDelta();

  const loadState = (): void => {
    try {
      if (!existsSync(persistPath)) return;
      const persisted = JSON.parse(readFileSync(persistPath, 'utf-8')) as Partial<PersistedCodexState>;
      enabled = persisted.enabled !== false;
      clearBefore = typeof persisted.clearBefore === 'number' ? persisted.clearBefore : 0;
      deletedBeforeBySession = persisted.deletedBeforeBySession && typeof persisted.deletedBeforeBySession === 'object'
        ? persisted.deletedBeforeBySession
        : {};
    } catch {
      // 配置损坏时回退为默认启用，不阻塞应用启动。
    }
  };

  const persistState = (): void => {
    try {
      mkdirSync(dirname(persistPath), { recursive: true });
      writeFileSync(persistPath, JSON.stringify({ enabled, clearBefore, deletedBeforeBySession }, null, 2), 'utf-8');
    } catch {
      // 状态持久化失败不影响会话读取。
    }
  };

  const emitSnapshot = (): void => {
    const win = options.getMainWindow();
    if (!win || win.isDestroyed()) return;
    const update = deltas.next(snapshot);
    snapshot = { ...snapshot, revision: update.revision };
    win.webContents.send('codex:status-updated', update);
  };

  const rebuildSnapshot = (): void => {
    const now = Date.now();
    const heatmap: ClaudeCodeHeatmapDaily = {};
    parsedSessions.forEach((parsed) => mergeHeatmap(heatmap, parsed.heatmap));
    const sessions = parsedSessions.flatMap((parsed) => {
      const cutoff = Math.max(clearBefore, deletedBeforeBySession[parsed.session.id] ?? 0);
      const events = parsed.events.filter((event) => event.createdAt > cutoff);
      if (events.length === 0) return [];
      const phase = phaseForVisibleEvents(events, now);
      return [{
        ...parsed.session,
        phase,
        lastSummary: events[0].summary,
        lastEventAt: events[0].createdAt,
        pendingPermission: phase === 'waiting_permission' ? events[0] : null,
        events: events.slice(0, MAX_SESSION_EVENTS),
      }];
    }).sort((a, b) => b.lastEventAt - a.lastEventAt);
    const events = sessions.flatMap((session) => session.events).sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_EVENTS);
    const next: ClaudeCodeStatusSnapshot = {
      enabled,
      revision: deltas.revision(),
      receiverRunning: Boolean(timer),
      receiverUrl: null,
      settingsPath: sessionsPath,
      hookScriptPath: '',
      sessions,
      events,
      heatmap,
      updatedAt: Date.now(),
    };
    // 增量签名：排除 updatedAt 等易变字段，保留阶段与事件内容以确保变更可检测
    const signature = JSON.stringify([enabled, Boolean(timer), dataVersion, mutationVersion, clearBefore, sessions.map((session) => [session.id, session.phase])]);
    snapshot = next;
    if (signature !== snapshotSignature) {
      snapshotSignature = signature;
      emitSnapshot();
    }
  };

  const refresh = (): Promise<void> => {
    if (scanning) return scanning;
    const version = generation;
    const request = (async () => {
      const files = collectJsonlFiles(sessionsPath);
      const signature = JSON.stringify(files);
      if (signature !== fileSignature) {
        try {
          const next = files.length ? await scanner.scan(files.map((file) => file.path), Date.now()) : [];
          if (version !== generation) return;
          if (!files.length) scanner.stop();
          const nextMetadata = new Map(files.map((file) => [file.path, `${file.mtimeMs}:${file.size}`]));
          const previous = new Map(parsedSessions.map((parsed) => [parsed.session.transcriptPath, parsed]));
          parsedSessions = next.map((parsed) => {
            const path = parsed.session.transcriptPath!;
            return metadata.get(path) === nextMetadata.get(path) && previous.has(path) ? previous.get(path)! : parsed;
          });
          metadata = nextMetadata;
          dataVersion += 1;
          fileSignature = signature;
        } catch { return; }
      }
      if (version === generation) rebuildSnapshot();
    })().finally(() => { if (scanning === request) scanning = null; });
    scanning = request;
    return request;
  };

  const startPolling = async (): Promise<void> => {
    if (timer || !enabled) return;
    timer = setInterval(() => { void refresh(); }, options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS);
    await refresh();
  };

  async function start(): Promise<void> {
    loadState();
    snapshot = emptySnapshot(sessionsPath, enabled, false);
    await startPolling();
    if (!enabled) emitSnapshot();
  }

  function stop(): void {
    if (timer) clearInterval(timer);
    timer = null;
    generation += 1;
    scanning = null;
    scanner.stop();
    parsedSessions = [];
    fileSignature = '';
    snapshotSignature = '';
    snapshot = { ...snapshot, receiverRunning: false, updatedAt: Date.now() };
    emitSnapshot();
  }

  async function enableMonitor(): Promise<CodexMonitorMutationResult> {
    enabled = true;
    persistState();
    await startPolling();
    return { ok: true, message: 'Codex 会话监视已启用。', snapshot };
  }

  async function disableMonitor(): Promise<CodexMonitorMutationResult> {
    enabled = false;
    if (timer) clearInterval(timer);
    timer = null;
    generation += 1;
    scanning = null;
    scanner.stop();
    parsedSessions = [];
    fileSignature = '';
    persistState();
    snapshot = { ...snapshot, enabled: false, receiverRunning: false, updatedAt: Date.now() };
    snapshotSignature = '';
    emitSnapshot();
    return { ok: true, message: 'Codex 会话监视已关闭。', snapshot };
  }

  function clearEvents(): ClaudeCodeStatusSnapshot {
    clearBefore = Date.now();
    deletedBeforeBySession = {};
    persistState();
    rebuildSnapshot();
    return snapshot;
  }

  function deleteSessions(sessionIds: string[]): ClaudeCodeStatusSnapshot {
    const deletedAt = Date.now();
    mutationVersion += 1;
    sessionIds.filter(Boolean).forEach((sessionId) => {
      deletedBeforeBySession[sessionId] = deletedAt;
    });
    persistState();
    rebuildSnapshot();
    return snapshot;
  }

  return { start, stop, getSnapshot: () => snapshot, enableMonitor, disableMonitor, clearEvents, deleteSessions };
}
