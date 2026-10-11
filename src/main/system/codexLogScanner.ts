/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM, pyisland.com
 * Licensed under the GNU General Public License, version 3 or later.
 */
/**
 * @file codexLogScanner.ts
 * @description 在扫描 Worker 内按文件身份与偏移增量读取会话。
 * @author 鸡哥
 */
import { closeSync, openSync, readSync, statSync } from 'fs';
import { createCodexAppendParser, parseCodexSessionLines, type ParsedCodexSession } from './codexSessionParser';
import { readTextLinesSync } from '../utils/textFileLines';
import { summarizeCliEvent } from './cliEventDetails';

interface Cursor {
  identity: string;
  offset: number;
  mtime: number;
  tail: Buffer[];
  tailBytes: number;
  lineStart: number;
  oversized: boolean;
  parser: ReturnType<typeof createCodexAppendParser>;
  anchor: Buffer;
}

/** 超大行只读取路由字段；完整原文通过字节范围分页，避免解析 base64 正文。 */
function largeRecord(prefix: string): Record<string, unknown> {
  const field = (text: string, name: string): unknown => {
    const match = text.match(new RegExp(`"${name}"\\s*:\\s*("(?:\\\\.|[^"\\\\])*"|[0-9]+)`));
    try { return match ? JSON.parse(match[1]) : undefined; } catch { return undefined; }
  };
  const payload = prefix.slice(prefix.indexOf('"payload"') + 9);
  const type = field(prefix, 'type');
  return { type: type === 'session_meta' || type === 'turn_context' ? type : type === 'response_item' ? type : 'event_msg',
    timestamp: field(prefix, 'timestamp'), payload: {
      id: field(payload, 'id'), cwd: field(payload, 'cwd'), model: field(payload, 'model'),
      type: field(payload, 'type') ?? 'agent_message', name: field(payload, 'name'),
      message: 'Large CLI record — open details for the complete content',
      output: 'Large CLI record — open details for the complete content',
      content: 'Large CLI record — open details for the complete content',
    } };
}

/**
 * 建立仅在 Worker 使用的增量日志缓存。
 * @returns 扫描文件、淘汰文件与清理缓存的操作。
 */
export function createCodexLogScanner() {
  const cursors = new Map<string, Cursor>();
  const scan = (path: string, now = Date.now()): ParsedCodexSession | null => {
    const info = statSync(path);
    const identity = `${info.dev}:${info.ino}:${info.birthtimeMs}`;
    let cursor = cursors.get(path);
    const fd = openSync(path, 'r');
    try {
      let changedPrefix = false;
      if (cursor?.anchor.length && info.size >= cursor.offset) {
        const check = Buffer.alloc(cursor.anchor.length);
        readSync(fd, check, 0, check.length, cursor.offset - check.length);
        changedPrefix = !check.equals(cursor.anchor);
      }
      if (!cursor || cursor.identity !== identity || info.size < cursor.offset || changedPrefix
        || (info.size === cursor.offset && info.mtimeMs !== cursor.mtime)) {
        cursor = { identity, offset: 0, mtime: 0, tail: [], tailBytes: 0, lineStart: 0, oversized: false, parser: createCodexAppendParser(path, info.mtimeMs), anchor: Buffer.alloc(0) };
        cursors.set(path, cursor);
      }
      if (cursor.offset === info.size && cursor.mtime === info.mtimeMs) return cursor.parser.snapshot(now);
      const buffer = Buffer.allocUnsafe(64 * 1024);
      const consume = (end: number, complete: boolean): boolean => {
        const text = Buffer.concat(cursor!.tail).toString('utf8');
        if (!text.trim()) return true;
        try {
          const line: unknown = cursor!.oversized ? largeRecord(text) : JSON.parse(text);
          if (cursor!.oversized && !complete) return false;
          cursor!.parser.consume(line && typeof line === 'object' && !Array.isArray(line) ? line as Record<string, unknown> : {},
            { offset: cursor!.lineStart, bytes: end - cursor!.lineStart });
          return true;
        } catch { return false; }
      };
      while (cursor.offset < info.size) {
        const startOffset = cursor.offset;
        const count = readSync(fd, buffer, 0, Math.min(buffer.length, info.size - cursor.offset), cursor.offset);
        if (!count) break;
        cursor.offset += count;
        let start = 0;
        while (start < count) {
          const found = buffer.indexOf(10, start);
          const end = found >= 0 && found < count ? found : count;
          if (!cursor.oversized) {
            const length = Math.min(end - start, 256 * 1024 - cursor.tailBytes);
            if (length) { cursor.tail.push(Buffer.from(buffer.subarray(start, start + length))); cursor.tailBytes += length; }
            if (length < end - start) cursor.oversized = true;
          }
          if (end < count) {
            consume(startOffset + end, true);
            cursor.tail = []; cursor.tailBytes = 0; cursor.oversized = false;
            cursor.lineStart = startOffset + end + 1;
          }
          start = end + 1;
        }
      }
      // 完整但尚未写换行的 JSON 可立即显示；半行最多保留 256 KiB 的前缀。
      if (!cursor.oversized && consume(cursor.offset, false)) {
        cursor.tail = []; cursor.tailBytes = 0; cursor.lineStart = cursor.offset;
      }
      cursor.anchor = Buffer.alloc(Math.min(64, cursor.offset));
      if (cursor.anchor.length) readSync(fd, cursor.anchor, 0, cursor.anchor.length, cursor.offset - cursor.anchor.length);
      cursor.mtime = info.mtimeMs;
      if (cursor.parser.needsRebuild()) {
        let source = { offset: 0, bytes: 0 };
        const parsed = parseCodexSessionLines(() => readTextLinesSync(path, 256 * 1024, (value) => { source = value; }, (prefix) => JSON.stringify(largeRecord(prefix))), path, info.mtimeMs, now, () => source);
        if (parsed) {
          parsed.events = parsed.events.map(summarizeCliEvent);
          parsed.session.events = parsed.events;
          parsed.session.pendingPermission = parsed.session.phase === 'waiting_permission' ? parsed.events[0] : null;
        }
        cursor.parser.restore(parsed);
      }
      return cursor.parser.snapshot(now);
    } finally { closeSync(fd); }
  };
  return {
    scan,
    retain: (paths: string[]): void => {
      const kept = new Set(paths);
      cursors.forEach((_cursor, path) => { if (!kept.has(path)) cursors.delete(path); });
    },
  };
}
