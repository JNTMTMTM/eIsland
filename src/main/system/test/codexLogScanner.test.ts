/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM, pyisland.com
 * Licensed under the GNU General Public License, version 3 or later.
 */
/**
 * @file codexLogScanner.test.ts
 * @description 使用隔离真实日志验证增量读取、半行、轮换及乱序兼容性。
 * @author 鸡哥
 */
import { mkdtempSync, writeFileSync, appendFileSync, rmSync, readFileSync, renameSync, statSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCodexLogScanner } from '../codexLogScanner';
import { summarizeCliEvent } from '../cliEventDetails';
import { parseCodexSessionContent } from '../codexSessionParser';
const io = vi.hoisted(() => ({ bytes: 0 }));
vi.mock('fs', async (original) => {
  const fs = await original<typeof import('fs')>();
  return { ...fs, readSync: (...args: Parameters<typeof fs.readSync>) => {
    const size = fs.readSync(...args);
    io.bytes += size;
    return size;
  } };
});
const directories: string[] = [];
const base = Date.parse('2026-10-11T10:00:00Z');
const meta = JSON.stringify({ type: 'session_meta', timestamp: base, payload: { id: 'test', cwd: '/test' } });
const prompt = (text: string, at = base + 1000): string => JSON.stringify({ type: 'event_msg', timestamp: at, payload: { type: 'user_message', message: text } });
function fixture(content: string): string {
  const directory = mkdtempSync(join(tmpdir(), 'eisland-codex-scan-'));
  directories.push(directory);
  const path = join(directory, 'session.jsonl');
  writeFileSync(path, content);
  return path;
}
afterEach(() => { directories.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true })); });
describe('incremental Codex scanner', () => {
  it('reads only appended bytes after a ten megabyte cold scan', () => {
    const ignored = JSON.stringify({ type: 'ignored', payload: 'x'.repeat(1024) }) + '\n';
    const path = fixture(`${meta}\n${ignored.repeat(10_000)}${prompt('first')}\n`);
    const scanner = createCodexLogScanner();
    expect(scanner.scan(path)?.events[0].summary).toBe('first');
    io.bytes = 0;
    const added = prompt('追加 UTF-8', base + 2000) + '\n';
    appendFileSync(path, added);
    expect(scanner.scan(path)?.events[0].summary).toBe('追加 UTF-8');
    expect(io.bytes).toBeLessThanOrEqual(Buffer.byteLength(added) + 128);
  });
  it('retains split UTF-8 and JSON tails without duplicating already complete lines', () => {
    const path = fixture(`${meta}\n`);
    const scanner = createCodexLogScanner();
    scanner.scan(path);
    const bytes = Buffer.from(prompt('中文 🌍'));
    const split = bytes.indexOf(Buffer.from('中')) + 1;
    appendFileSync(path, bytes.subarray(0, split));
    expect(scanner.scan(path)?.events).toHaveLength(1);
    appendFileSync(path, bytes.subarray(split));
    expect(scanner.scan(path)?.events[0].summary).toBe('中文 🌍');
    appendFileSync(path, `\n${prompt('next', base + 2000)}\n`);
    const result = scanner.scan(path)!;
    expect(result.events).toHaveLength(3);
    expect(Object.values(result.heatmap).reduce((sum, bucket) => sum + bucket.prompt, 0)).toBe(2);
  });
  it('rebuilds for truncation, replacement and unordered appends with the same deduplication result', () => {
    const path = fixture(`${meta}\n${prompt('same', base + 2000)}\n${prompt('same', base + 2100)}\n`);
    const scanner = createCodexLogScanner();
    scanner.scan(path);
    appendFileSync(path, `${prompt('older', base + 1000)}\n${prompt('same', base + 2200)}\n`);
    const result = scanner.scan(path, base + 3000);
    const expected = parseCodexSessionContent(readFileSync(path, 'utf8'), path, statSync(path).mtimeMs, base + 3000);
    const normalized = result!.events.map(({ detailProvider: _provider, detailSource: _source, ...event }) => { void _provider; void _source; return event; });
    expect(normalized).toEqual(expected!.events.map(summarizeCliEvent));
    expect(result!.heatmap).toEqual(expected!.heatmap);
    result!.events.forEach((event) => {
      const source = event.detailSource!;
      expect(JSON.parse(readFileSync(path).subarray(source.offset, source.offset + source.bytes).toString('utf8'))).toHaveProperty('payload');
    });
    writeFileSync(path, `${meta}\n${prompt('short')}\n`);
    expect(scanner.scan(path)?.events[0].summary).toBe('short');
    renameSync(path, `${path}.old`);
    writeFileSync(path, `${meta}\n${prompt('replacement')}\n`);
    expect(scanner.scan(path)?.events[0].summary).toBe('replacement');
  });
});


it('keeps a giant complete/incomplete JSONL row out of the snapshot and preserves its exact source range', () => {
  const large = prompt('base64'.repeat(1024 * 1024));
  const path = fixture(`${meta}\n${large.slice(0, 300000)}`);
  const scanner = createCodexLogScanner();
  expect(scanner.scan(path)?.events).toHaveLength(1);
  appendFileSync(path, `${large.slice(300000)}\n`);
  const result = scanner.scan(path)!;
  expect(result.events[0].eventName).toBe('UserPromptSubmit');
  expect(Buffer.byteLength(JSON.stringify(result))).toBeLessThan(8192);
  const range = result.events[0].detailSource!;
  expect(readFileSync(path).subarray(range.offset, range.offset + range.bytes).toString('utf8')).toBe(large);
  appendFileSync(path, prompt('after', base + 2000));
  expect(scanner.scan(path)?.events[0].summary).toBe('after');
});
