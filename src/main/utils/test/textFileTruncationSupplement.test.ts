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
 * @file textFileTruncationSupplement.test.ts
 * @description 日志读取期间文件截断与 UTF-8 尾字符边界测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readTextLinesSync } from '../textFileLines';
const io = vi.hoisted(() => ({ open: vi.fn(), close: vi.fn(), stat: vi.fn(), read: vi.fn() }));
vi.mock('fs', () => ({ openSync: io.open, closeSync: io.close, fstatSync: io.stat, readSync: io.read }));
beforeEach(() => { vi.resetAllMocks(); io.open.mockReturnValue(17); });
afterEach(() => { vi.restoreAllMocks(); });
describe('文件追加中途截断与 UTF-8 尾字节', () => {
  it('stat 之后文件被截短，read 返回零时停止并关闭句柄', () => {
    io.stat.mockReturnValue({ size: 10 }); io.read.mockReturnValue(0);
    expect([...readTextLinesSync('fixture.jsonl')]).toEqual([]);
    expect(io.read).toHaveBeenCalledOnce(); expect(io.close).toHaveBeenCalledWith(17);
  });
  it('块恰好以换行结束时不追加空尾行', () => {
    io.stat.mockReturnValue({ size: 4 });
    io.read.mockImplementation((...[, buffer]: [number, Buffer]) => { buffer.write('one\n'); return 4; });
    expect([...readTextLinesSync('fixture.jsonl')]).toEqual(['one']);
    expect(io.close).toHaveBeenCalledWith(17);
  });
  it('截断 UTF-8 最后字符由 StringDecoder 产生替代符并保留尾行', () => {
    io.stat.mockReturnValue({ size: 2 });
    io.read.mockImplementation((...[, buffer]: [number, Buffer]) => { buffer.set([0xe4, 0xb8]); return 2; });
    expect([...readTextLinesSync('fixture.jsonl')]).toEqual(['�']);
    expect(io.close).toHaveBeenCalledWith(17);
  });
});
