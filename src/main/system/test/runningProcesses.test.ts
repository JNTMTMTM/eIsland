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
 * @file runningProcesses.test.ts
 * @description 运行进程查询模块纯函数单元测试
 * @author 鸡哥
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */

import { describe, expect, it } from 'vitest';
import { normalizeProcessName, sanitizeProcessNameList, sanitizeWindowTitleList } from '../runningProcesses';

describe('normalizeProcessName', () => {
  it('converts to lowercase', () => {
    expect(normalizeProcessName('CHROME.EXE')).toBe('chrome.exe');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeProcessName('  notepad.exe  ')).toBe('notepad.exe');
  });

  it('handles empty string', () => {
    expect(normalizeProcessName('')).toBe('');
  });

  it('handles whitespace-only string', () => {
    expect(normalizeProcessName('   ')).toBe('');
  });

  it('combines trim and lowercase', () => {
    expect(normalizeProcessName('  Code.EXE  ')).toBe('code.exe');
  });
});

describe('sanitizeProcessNameList', () => {
  it('removes duplicates after normalization', () => {
    const result = sanitizeProcessNameList(['Chrome.exe', 'chrome.exe', 'CHROME.EXE']);
    expect(result).toEqual(['Chrome.exe']);
  });

  it('filters empty strings', () => {
    const result = sanitizeProcessNameList(['notepad.exe', '', '  ', 'code.exe']);
    expect(result).toEqual(['notepad.exe', 'code.exe']);
  });

  it('handles mixed case input preserving first occurrence', () => {
    const result = sanitizeProcessNameList(['Code.exe', 'CODE.EXE', 'code.exe']);
    expect(result).toEqual(['Code.exe']);
  });

  it('returns empty array for empty input', () => {
    expect(sanitizeProcessNameList([])).toEqual([]);
  });

  it('returns empty array when all items are empty or whitespace', () => {
    expect(sanitizeProcessNameList(['', '  ', '   '])).toEqual([]);
  });

  it('preserves original trimmed text of first occurrence', () => {
    const result = sanitizeProcessNameList(['  Chrome.exe  ', 'chrome.exe']);
    expect(result).toEqual(['Chrome.exe']);
  });
});

describe('sanitizeWindowTitleList', () => {
  it('removes duplicates after normalization', () => {
    const result = sanitizeWindowTitleList(['My Document', 'my document', 'MY DOCUMENT']);
    expect(result).toEqual(['My Document']);
  });

  it('filters empty strings', () => {
    const result = sanitizeWindowTitleList(['Notepad', '', '  ', 'Calculator']);
    expect(result).toEqual(['Notepad', 'Calculator']);
  });

  it('handles mixed case input preserving first occurrence', () => {
    const result = sanitizeWindowTitleList(['Visual Studio Code', 'visual studio code']);
    expect(result).toEqual(['Visual Studio Code']);
  });

  it('returns empty array for empty input', () => {
    expect(sanitizeWindowTitleList([])).toEqual([]);
  });

  it('returns empty array when all items are empty or whitespace', () => {
    expect(sanitizeWindowTitleList(['', '  ', '   '])).toEqual([]);
  });

  it('preserves original trimmed text of first occurrence', () => {
    const result = sanitizeWindowTitleList(['  GitHub  ', 'github']);
    expect(result).toEqual(['GitHub']);
  });
});
