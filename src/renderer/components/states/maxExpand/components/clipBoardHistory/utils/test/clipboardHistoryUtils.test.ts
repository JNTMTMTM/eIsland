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
 * @file clipboardHistoryUtils.test.ts
 * @description 剪贴板历史隐私过滤、清洗、时间范围、导出下载及双层存储边界测试。
 * @author 鸡哥
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildClipboardHistoryExport, downloadTextFile, getClipboardHistoryExportFileName, getPreviewText, isItemInCleanupRange, isLikelyPassword, isLikelyUrl, isRecordableClipboardText, isSameLocalDay, matchesClipboardFilter, normalizeClipboardText, persistHistory, sanitizeHistory } from '../clipboardHistoryUtils';
import type { ClipboardCleanupRange, ClipboardHistoryFilter, ClipboardHistoryItem } from '../../types/clipboardHistoryTypes';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('clipboard text privacy and filtering', () => {
  it('normalizes CRLF without changing interior whitespace', () => {
    expect(normalizeClipboardText('  one\r\n  two  ')).toBe('one\n  two');
    expect(normalizeClipboardText('   ')).toBe('');
  });
  it.each([
    ['https://example.test/a', true], [' HTTP://example.test ', true], ['www.example.test', true],
    ['example.test:80/a', true], ['example.test?q=1', true], ['plain text', false], ['https://a b', false], ['www.local', true], ['localhost', false],
  ])('URL %s -> %s', (text, expected) => {
    expect(isLikelyUrl(text)).toBe(expected);
  });
  it.each([
    ['', false], ['https://example.test/token', false], ['person@example.test', false],
    ['tokenA.tokenB.tokenC1', true], ['a'.repeat(32), true], ['lower', false], ['a!'.repeat(65), false],
    ['Abc def1!', false], ['Abcdef1!', true], ['abcdef12', false], ['abcdef123456', true], ['abcdefghijk!', true], ['abcdefghijkl', false],
  ])('password %s -> %s', (text, expected) => {
    expect(isLikelyPassword(text)).toBe(expected);
  });
  it('records normal text and URLs while suppressing empty/password text', () => {
    expect(isRecordableClipboardText('')).toBe(false);
    expect(isRecordableClipboardText('Abcdef1!')).toBe(false);
    expect(isRecordableClipboardText('ordinary words')).toBe(true);
  });
  it.each<{ text: string; filter: ClipboardHistoryFilter; expected: boolean }>([
    { text: 'Abcdef1!', filter: 'all', expected: true },
    { text: 'https://example.test', filter: 'url', expected: true },
    { text: 'words', filter: 'url', expected: false },
    { text: 'https://example.test', filter: 'text', expected: false },
    { text: 'Abcdef1!', filter: 'text', expected: false },
    { text: 'ordinary words', filter: 'text', expected: true },
  ])('filter $filter on $text', ({ text, filter, expected }) => {
    expect(matchesClipboardFilter({ text, id: 1, createdAt: 0 }, filter)).toBe(expected);
  });
  it('flattens whitespace and truncates only text longer than 72 characters', () => {
    expect(getPreviewText(' one\n  two ')).toBe('one two');
    expect(getPreviewText('a'.repeat(72))).toBe('a'.repeat(72));
    expect(getPreviewText('a'.repeat(73))).toBe(`${'a'.repeat(72)  }…`);
  });
});

describe('clipboard saved history and persistence', () => {
  it.each([undefined, null, {}, 1, false, 'wrong'])('rejects non-arrays %s', (value) => {
    expect(sanitizeHistory(value, 10)).toEqual([]);
  });
  it('filters unsafe/empty text, defaults invalid metadata and respects the history limit', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    const input = [{ text: '  hi\r\nthere ', id: 10, createdAt: 20 }, { text: 'Abcdef1!' }, {}, { text: 2 }, { text: 'next', id: Infinity, createdAt: NaN }, { text: 'last', id: 30, createdAt: 40 }];
    expect(sanitizeHistory(input, 2)).toEqual([{ id: 10, text: 'hi\nthere', createdAt: 20 }, { id: 1000, text: 'next', createdAt: 1000 }]);
    expect(sanitizeHistory(input, 0)).toEqual([]);
  });
  it.each([false, true])('persists to remote after local failure=%s', async (fails) => {
    const items: ClipboardHistoryItem[] = [{ id: 1, text: 'words', createdAt: 2 }];
    const setItem = vi.fn(() => {
      if (fails) {
        throw new Error('quota');
      }
    });
    const storeWrite = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('localStorage', { setItem });
    vi.stubGlobal('window', { api: { storeWrite } });
    persistHistory(items);
    await Promise.resolve();
    expect(setItem).toHaveBeenCalledExactlyOnceWith('eIsland_clipboard_history_recent', JSON.stringify(items));
    expect(storeWrite).toHaveBeenCalledExactlyOnceWith('clipboard-history-recent', items);
  });
  it('absorbs rejected remote writes', async () => {
    const storeWrite = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('localStorage', { setItem: vi.fn() });
    vi.stubGlobal('window', { api: { storeWrite } });
    expect(() => persistHistory([])).not.toThrow();
    await Promise.resolve();
  });
});

describe('clipboard local dates and cleanup boundaries', () => {
  it('compares each local date field and ignores time', () => {
    const now = new Date(2026, 4, 2, 12);
    expect(isSameLocalDay(now, new Date(2026, 4, 2, 0))).toBe(true);
    expect(isSameLocalDay(now, new Date(2025, 4, 2))).toBe(false);
    expect(isSameLocalDay(now, new Date(2026, 3, 2))).toBe(false);
    expect(isSameLocalDay(now, new Date(2026, 4, 1))).toBe(false);
  });
  it.each<{ range: ClipboardCleanupRange; age: number; expected: boolean }>([
    { range: 'lastHour', age: 3600000, expected: true }, { range: 'lastHour', age: 3600001, expected: false },
    { range: 'last7Days', age: 604800000, expected: true }, { range: 'last7Days', age: 604800001, expected: false },
    { range: 'last30Days', age: 2592000000, expected: true }, { range: 'last30Days', age: 2592000001, expected: false },
    { range: 'olderThan30Days', age: 2592000000, expected: false }, { range: 'olderThan30Days', age: 2592000001, expected: true },
  ])('range $range age=$age', ({ range, age, expected }) => {
    const now = 1800000000000;
    expect(isItemInCleanupRange({ id: 1, text: 'words', createdAt: now - age }, range, now)).toBe(expected);
  });
  it('today uses local midnight instead of a rolling 24-hour window', () => {
    const now = new Date(2026, 4, 2, 12).getTime();
    expect(isItemInCleanupRange({ id: 1, text: 'words', createdAt: new Date(2026, 4, 2, 0).getTime() }, 'today', now)).toBe(true);
    expect(isItemInCleanupRange({ id: 1, text: 'words', createdAt: new Date(2026, 4, 1, 23).getTime() }, 'today', now)).toBe(false);
  });
});

describe('clipboard JSON export and download', () => {
  it('pads a local export filename and includes UTC item/export timestamps', () => {
    expect(getClipboardHistoryExportFileName(new Date(2026, 0, 2, 3, 4, 5))).toBe('eIsland-clipboard-history-20260102-030405.json');
    const item = { id: 1, text: 'hello\nworld', createdAt: 0 };
    expect(JSON.parse(buildClipboardHistoryExport([item], new Date('2026-01-02T03:04:05Z')))).toEqual({
      app: 'eIsland', type: 'clipboard-history', exportedAt: '2026-01-02T03:04:05.000Z', count: 1,
      items: [{ ...item, createdAtText: '1970-01-01T00:00:00.000Z' }],
    });
    expect(JSON.parse(buildClipboardHistoryExport([], new Date(0)))).toMatchObject({ count: 0 });
  });
  it('downloads the exact JSON blob and cleans up the anchor/object URL', async () => {
    const anchor = { href: '', download: '', style: { display: '' }, click: vi.fn(), remove: vi.fn() };
    const createElement = vi.fn().mockReturnValue(anchor);
    const appendChild = vi.fn();
    vi.stubGlobal('document', { createElement, body: { appendChild } });
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:export');
    const revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    downloadTextFile('history.json', '{"hello":"world"}');
    const blob = createUrl.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('application/json;charset=utf-8');
    expect(await blob.text()).toBe('{"hello":"world"}');
    expect(createElement).toHaveBeenCalledExactlyOnceWith('a');
    expect(anchor).toMatchObject({ href: 'blob:export', download: 'history.json', style: { display: 'none' } });
    expect(appendChild).toHaveBeenCalledExactlyOnceWith(anchor);
    expect(anchor.click).toHaveBeenCalledOnce();
    expect(anchor.remove).toHaveBeenCalledOnce();
    expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:export');
  });
});
