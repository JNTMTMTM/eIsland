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
 * @file outputBuffer.test.ts
 * @description 验证子进程输出的行切分与控制序列清理
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';

import { sanitizeLine, splitChunk } from '../outputBuffer';

describe('splitChunk', () => {
  it('按 LF 与 CRLF 切分并保留未完成的末尾片段', () => {
    expect(splitChunk('', 'a\r\nb\nc')).toEqual({ complete: ['a', 'b'], partial: 'c' });
  });

  it('与上次残留片段拼接', () => {
    expect(splitChunk('hel', 'lo\nwor')).toEqual({ complete: ['hello'], partial: 'wor' });
  });

  it('数据块恰好以换行结束时残留为空', () => {
    expect(splitChunk('', 'done\n')).toEqual({ complete: ['done'], partial: '' });
  });
});

describe('sanitizeLine', () => {
  it('保留 SGR 颜色序列', () => {
    expect(sanitizeLine('\u001B[32mok\u001B[39m')).toBe('\u001B[32mok\u001B[39m');
  });

  it('移除光标移动、清行与 OSC 标题序列', () => {
    expect(sanitizeLine('\u001B[2K\u001B[1Abuild\u001B]0;title\u0007 done')).toBe('build done');
  });

  it('进度条以 \\r 覆盖时仅保留最后内容', () => {
    expect(sanitizeLine('10%\r50%\r100%')).toBe('100%');
    expect(sanitizeLine('100%\r')).toBe('100%');
  });

  it('制表符展开为空格', () => {
    expect(sanitizeLine('a\tb')).toBe('a  b');
  });
});
