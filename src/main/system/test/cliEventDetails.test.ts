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
/** @file cliEventDetails.test.ts
 * @description 真实隔离文件验证摘要预算、UTF-8 分页、迁移备份与异步索引。
 * @author 鸡哥
 */
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync, truncateSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { afterEach, describe, expect, it } from 'vitest';
import { cliDetailPath, createCliSnapshotWriter, readCliDetailPage, removeCliEventDetails, saveCliEventDetails, summarizeCliEvent } from '../cliEventDetails';
import { migrateCliState } from '../cliStateMigration';
import type { ClaudeCodeHookEvent } from '../../types/system/ClaudeCodeHookEvent';
const directories: string[] = [];
/** 只创建当前测试拥有的临时目录。 */
function directory(): string { const path = mkdtempSync(join(tmpdir(), 'eisland-cli-details-')); directories.push(path); return path; }
/** 大输出事件，包含真实多字节字符与历史重复字段。 */
function event(id = 'one'): ClaudeCodeHookEvent {
  const output = '中文🌍'.repeat(120000);
  return { id, eventName: 'PostToolUse', kind: 'tool', sessionId: 's', cwd: null, transcriptPath: null,
    summary: output, detail: output, detailItems: [{ label: 'toolResult', value: output }, { label: 'rawEvent', value: output }],
    toolName: 'Bash', toolInputPreview: output, createdAt: 1, raw: { output } };
}
afterEach(() => { directories.splice(0).forEach((path) => rmSync(path, { recursive: true, force: true })); });
describe('CLI 详情预算', () => {
  it('百万字符输出快照小于 4 KiB，并可逐页恢复完整磁盘正文且不切断 UTF-8', async () => {
    const dir = directory(); const full = event();
    saveCliEventDetails(dir, full);
    const summary = summarizeCliEvent(full);
    expect(Buffer.byteLength(JSON.stringify(summary))).toBeLessThan(4096);
    expect(summary.raw).toEqual({}); expect(summary.detail).toBeNull();
    expect(summary.detailItems.some((item) => item.label === 'rawEvent')).toBe(false);
    let offset: number | null = 0; let recovered = '';
    while (offset !== null) {
      const page = await readCliDetailPage(cliDetailPath(dir, full.id), offset);
      expect(Buffer.byteLength(page.text)).toBeLessThanOrEqual(65536);
      expect(page.text).not.toContain('�'); recovered += page.text; offset = page.nextOffset;
    }
    expect(JSON.parse(recovered).raw.output).toBe(full.raw.output);
    expect(JSON.parse(recovered).details[0].value).toBe(full.detailItems[0].value);
    await removeCliEventDetails(dir, [full.id]); expect(existsSync(cliDetailPath(dir, full.id))).toBe(false);
  });
  it('详情源范围只读取指定 JSONL 行，索引写入合并为最后版本', async () => {
    const dir = directory(); const path = join(dir, 'source');
    writeFileSync(path, 'ignore\n你好🌍\nignore');
    expect((await readCliDetailPage(path, 0, { offset: 7, bytes: Buffer.byteLength('你好🌍') })).text).toBe('你好🌍');
    const write = createCliSnapshotWriter(join(dir, 'index.json'));
    await Promise.all([write({ value: 1 }), write({ value: 2 }), write({ value: 3 })]);
    expect(JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8'))).toEqual({ value: 3 });
  });
  it('旧历史迁移保留原件，正文脱离摘要且重复执行幂等', () => {
    const dir = directory(); const path = join(dir, 'old.json'); const full = event();
    const original = JSON.stringify({ version: 1, events: [full], sessions: [{ id: 's', lastEventAt: 1, events: [full], phase: 'idle' }] });
    writeFileSync(path, original);
    const migrated = migrateCliState(path, join(dir, 'details'));
    expect(migrated.version).toBe(2);
    expect(readFileSync(`${path}.legacy.json`, 'utf8')).toBe(original);
    expect(Buffer.byteLength(readFileSync(path, 'utf8'))).toBeLessThan(8192);
    expect(JSON.parse(readFileSync(cliDetailPath(join(dir, 'details'), 'one'), 'utf8')).raw.output).toBe(full.raw.output);
    expect(migrateCliState(path, join(dir, 'details'))).toEqual(migrated);
  });
});


it('applies backpressure to a large queued detail burst without losing accepted writes', async () => {
  const dir = directory(); const full = event();
  const large = 'x'.repeat(6 * 1024 * 1024);
  const item = { ...full, raw: { output: large }, detailItems: [{ label: 'toolResult', value: large }] };
  saveCliEventDetails(dir, { ...item, id: 'first' });
  saveCliEventDetails(dir, { ...item, id: 'second' });
  expect(() => saveCliEventDetails(dir, { ...item, id: 'overflow' })).toThrow('queue');
  await Promise.all(['first', 'second'].map((id) => readCliDetailPage(cliDetailPath(dir, id))));
  expect(existsSync(cliDetailPath(dir, 'overflow'))).toBe(false);
});

it('leaves the original history untouched when migration cannot write its details', () => {
  const dir = directory(); const path = join(dir, 'history.json'); const blocked = join(dir, 'blocked');
  const original = JSON.stringify({ version: 1, events: [event()], sessions: [] });
  writeFileSync(path, original); writeFileSync(blocked, 'not a directory');
  expect(() => migrateCliState(path, blocked)).toThrow();
  expect(readFileSync(path, 'utf8')).toBe(original);
});


it('checks the legacy byte budget before allocating a whole-file buffer', () => {
  const dir = directory(); const path = join(dir, 'large-legacy.json');
  writeFileSync(path, '{}'); truncateSync(path, 64 * 1024 * 1024 + 1);
  expect(() => migrateCliState(path, join(dir, 'details'))).toThrow('64 MiB');
  expect(existsSync(`${path}.legacy.json`)).toBe(false);
});
