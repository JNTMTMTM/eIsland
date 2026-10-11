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
import { StringDecoder } from 'string_decoder';
import { createCodexAppendParser, parseCodexSessionLines, type ParsedCodexSession } from './codexSessionParser';
import { readTextLinesSync } from '../utils/textFileLines';

interface Cursor {
  identity: string;
  offset: number;
  mtime: number;
  tail: string;
  decoder: StringDecoder;
  parser: ReturnType<typeof createCodexAppendParser>;
  anchor: Buffer;
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
        cursor = { identity, offset: 0, mtime: 0, tail: '', decoder: new StringDecoder('utf8'), parser: createCodexAppendParser(path, info.mtimeMs), anchor: Buffer.alloc(0) };
        cursors.set(path, cursor);
      }
      if (cursor.offset === info.size && cursor.mtime === info.mtimeMs) return cursor.parser.snapshot(now);
      const buffer = Buffer.allocUnsafe(64 * 1024);
      const consume = (text: string): boolean => {
        if (!text.trim()) return true;
        try {
          const line: unknown = JSON.parse(text);
          if (line && typeof line === 'object' && !Array.isArray(line)) cursor!.parser.consume(line as Record<string, unknown>);
          return true;
        } catch { return false; }
      };
      while (cursor.offset < info.size) {
        const count = readSync(fd, buffer, 0, Math.min(buffer.length, info.size - cursor.offset), cursor.offset);
        if (!count) break;
        cursor.offset += count;
        const text = cursor.tail + cursor.decoder.write(buffer.subarray(0, count));
        const lines = text.split('\n');
        cursor.tail = lines.pop() ?? '';
        lines.forEach(consume);
      }
      // 完整但尚未写换行的 JSON 可立即显示；半行保留到下一次追加。
      if (consume(cursor.tail)) cursor.tail = '';
      cursor.anchor = Buffer.alloc(Math.min(64, cursor.offset));
      if (cursor.anchor.length) readSync(fd, cursor.anchor, 0, cursor.anchor.length, cursor.offset - cursor.anchor.length);
      cursor.mtime = info.mtimeMs;
      if (cursor.parser.needsRebuild()) {
        cursor.parser.restore(parseCodexSessionLines(() => readTextLinesSync(path), path, info.mtimeMs, now));
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
