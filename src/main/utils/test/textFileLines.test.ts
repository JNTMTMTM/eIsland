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
 * @file textFileLines.test.ts
 * @description 日志分块读取的边界、句柄释放与读取量回归测试。
 * @author 鸡哥
 */

import * as fs from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readLastTextLinesSync, readTextLinesSync } from '../textFileLines';

vi.mock('fs', { spy: true });

let directory: string;
let filePath: string;

beforeEach(() => {
  directory = fs.mkdtempSync(join(tmpdir(), 'eisland-lines-'));
  filePath = join(directory, 'session.jsonl');
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(directory, { recursive: true, force: true });
});

describe('text file lines', () => {
  it('preserves UTF-8 and CRLF across chunk boundaries and an unterminated last line', () => {
    const lines = [`${'x'.repeat(65535)  }中文😀`, 'second', '末行'];
    fs.writeFileSync(filePath, lines.join('\r\n'));
    expect([...readTextLinesSync(filePath)]).toEqual(lines);
    expect(readLastTextLinesSync(filePath, 3)).toEqual(lines);
    expect(readLastTextLinesSync(filePath, 2)).toEqual(lines.slice(-2));
  });

  it('preserves a multi-megabyte JSONL record and the line following it', () => {
    const output = `${'x'.repeat(8 * 1024 * 1024 - 1)}中文😀`;
    const record = JSON.stringify({ output, type: 'function_call_output' });
    fs.writeFileSync(filePath, `${record}\r\n尾行😀`);
    const lines = readTextLinesSync(filePath);
    expect(JSON.parse(lines.next().value as string)).toEqual({ output, type: 'function_call_output' });
    expect(lines.next()).toEqual({ value: '尾行😀', done: false });
    expect(lines.next().done).toBe(true);
    expect(readLastTextLinesSync(filePath, 2)).toEqual([record, '尾行😀']);
  });

  it('ignores trailing whitespace and retains internal empty lines', () => {
    fs.writeFileSync(filePath, 'first\n\nthird\r\n   \r\n\n');
    expect(readLastTextLinesSync(filePath, 3)).toEqual(['first', '', 'third']);
    expect(readLastTextLinesSync(filePath, 1)).toEqual(['third']);
  });

  it('handles empty files, zero limits and files shorter than the limit', () => {
    fs.writeFileSync(filePath, '');
    expect(readLastTextLinesSync(filePath, 10)).toEqual([]);
    expect([...readTextLinesSync(filePath)]).toEqual([]);
    fs.writeFileSync(filePath, 'only');
    expect(readLastTextLinesSync(filePath, 10)).toEqual(['only']);
    expect(readLastTextLinesSync(filePath, 0)).toEqual([]);
  });

  it('reads only the tail of a large log', () => {
    fs.writeFileSync(filePath, `${'historical line\n'.repeat(300000)}recent one\nrecent two\n`);
    const read = vi.spyOn(fs, 'readSync');
    expect(readLastTextLinesSync(filePath, 2)).toEqual(['recent one', 'recent two']);
    expect(read).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledWith(expect.any(Number), expect.any(Buffer), 0, 64 * 1024, expect.any(Number));
  });

  it('closes the file when a consumer stops iterating early', () => {
    fs.writeFileSync(filePath, 'first\nsecond\n');
    const close = vi.spyOn(fs, 'closeSync');
    const lines = readTextLinesSync(filePath);
    expect(lines.next().value).toBe('first');
    lines.return(undefined);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('closes the file if a disk read fails', () => {
    fs.writeFileSync(filePath, 'first\nsecond\n');
    const close = vi.spyOn(fs, 'closeSync');
    vi.spyOn(fs, 'readSync').mockImplementation(() => { throw new Error('disk failure'); });
    expect(() => [...readTextLinesSync(filePath)]).toThrow('disk failure');
    expect(() => readLastTextLinesSync(filePath, 1)).toThrow('disk failure');
    expect(close).toHaveBeenCalledTimes(2);
  });
});
