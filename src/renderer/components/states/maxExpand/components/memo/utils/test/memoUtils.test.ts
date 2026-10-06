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
 * @file memoUtils.test.ts
 * @description 备忘录标签规范化、旧存档默认值、摘要搜索、Markdown 镜像及写入失败测试。
 * @author 鸡哥
 */

import { createElement, isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractMemoTags, extractSummary, formatTime, getMarkdownPreviewContent, getMemoSearchText, normalizeMemos, normalizeTag, normalizeTagList, persistMemos, renderMarkdownEditorMirror } from '../memoUtils';
import type { MemoItem } from '../../types/memoTypes';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const memo: MemoItem = { id: 1, title: 'Title #one', content: 'Body #two', tags: ['existing', 'one'], createdAt: 10, updatedAt: 20, pinned: true, bookmarked: false };
const codeMarker = String.fromCharCode(96);
const fence = codeMarker.repeat(3);

describe('memo tag normalization and legacy data', () => {
  it.each([[' ##tag ', 'tag'], ['###', ''], ['x'.repeat(25), 'x'.repeat(24)], ['plain', 'plain']])('normalizes tag %s', (input, expected) => {
    expect(normalizeTag(input)).toBe(expected);
  });
  it.each([null, undefined, 1, false, 'tag', {}])('rejects non-array tag input %s', (input) => {
    expect(normalizeTagList(input)).toEqual([]);
  });
  it('filters non-string/empty tags and deduplicates normalized values', () => {
    expect(normalizeTagList(['##one', ' one ', null, 1, '###', 'Two'])).toEqual(['one', 'Two']);
  });
  it('keeps existing metadata, defaults missing fields and copies each item', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    const normalized = normalizeMemos([memo, { id: 2 }, { id: 3, createdAt: 42 }, { id: 4, title: null, content: null, tags: null, pinned: null, bookmarked: null, updatedAt: 90 }] as MemoItem[]);
    expect(normalized[0]).toEqual(memo);
    expect(normalized[0]).not.toBe(memo);
    expect(normalized[1]).toEqual({ id: 2, title: '', content: '', tags: [], createdAt: 1000, updatedAt: 1000, pinned: false, bookmarked: false });
    expect(normalized[2]).toMatchObject({ createdAt: 42, updatedAt: 42 });
    expect(normalized[3]).toMatchObject({ title: '', content: '', tags: [], createdAt: 1000, updatedAt: 90, pinned: false, bookmarked: false });
    expect(normalizeMemos([])).toEqual([]);
  });
  it.each([false, true])('persists and absorbs remote rejection=%s', async (rejects) => {
    const storeWrite = vi.fn().mockImplementation(() => rejects ? Promise.reject(new Error('offline')) : Promise.resolve());
    vi.stubGlobal('window', { api: { storeWrite } });
    expect(() => persistMemos([memo])).not.toThrow();
    await Promise.resolve();
    expect(storeWrite).toHaveBeenCalledExactlyOnceWith('memos', [memo]);
  });
});

describe('memo summaries, tags and search', () => {
  it('formats local timestamps with padding', () => {
    expect(formatTime(new Date(2026, 0, 2, 3, 4).getTime())).toBe('2026-01-02 03:04');
  });
  it('skips fenced code and empty lines, strips inline formatting and truncates after 60', () => {
    expect(extractSummary(`\n${  fence  }js\ncode\n${  fence  }\n# **Hello** ${  codeMarker  }world${  codeMarker  }\nignored`)).toBe('Hello   world');
    expect(extractSummary('\n  \n')).toBe('');
    expect(extractSummary('a'.repeat(60))).toBe('a'.repeat(60));
    expect(extractSummary('a'.repeat(61))).toBe(`${'a'.repeat(60)  }…`);
  });
  it('combines Unicode inline tags with stored tags and searches case-insensitively', () => {
    const input = { ...memo, content: 'Body #two #中文 #two\n#third_1', tags: ['##existing', 'one', ''] };
    expect(extractMemoTags(input)).toEqual(['existing', 'one', 'two', '中文', 'third_1']);
    expect(extractMemoTags({ title: 'no', content: 'tags', tags: [] })).toEqual([]);
    expect(getMemoSearchText(input)).toBe('title #one\nbody #two #中文 #two\n#third_1\nexisting\none\ntwo\n中文\nthird_1');
  });
  it('uses placeholders only for blank preview content', () => {
    expect(getMarkdownPreviewContent('  \n', 'placeholder')).toBe('placeholder');
    expect(getMarkdownPreviewContent(' body ', 'placeholder')).toBe(' body ');
  });
});

describe('memo Markdown mirror', () => {
  it.each([
    { source: '# Heading', token: '--heading' }, { source: `${codeMarker  }code${  codeMarker}`, token: '--inline-code' },
    { source: `${fence  }js\ncode\n${  fence}`, token: '--code-block' }, { source: '**bold**', token: '--strong' },
    { source: '_italic_', token: '--emphasis' }, { source: '[link](https://example.test)', token: '--link' },
    { source: '> quote', token: '--quote' }, { source: '- list', token: '--list' },
  ])('highlights $token while preserving the source characters', ({ source, token }) => {
    const nodes = renderMarkdownEditorMirror(source);
    const spans = nodes.filter((node) => isValidElement<{ className: string }>(node));
    expect(spans.some((node) => node.props.className.endsWith(token))).toBe(true);
    expect(nodes.map((node) => {
      if (typeof node === 'string') {
        return node;
      }
      if (isValidElement<{ children: string }>(node)) {
        return node.props.children;
      }
      throw new Error('unexpected Markdown mirror node');
    }).join('')).toBe(source);
    expect(renderToStaticMarkup(createElement('div', null, ...nodes))).toContain('memo-tab-markdown-token');
  });
  it('retains plain segments, newline placeholders and empty-content height', () => {
    expect(renderMarkdownEditorMirror('plain text')).toEqual(['plain text']);
    expect(renderMarkdownEditorMirror('')).toEqual([' ']);
    const nodes = renderMarkdownEditorMirror('before **bold** after\n');
    expect(nodes[0]).toBe('before ');
    expect(nodes.slice(-2)).toEqual([' after\n', ' ']);
  });
  it('prioritizes the outer span when Markdown patterns overlap', () => {
    const nodes = renderMarkdownEditorMirror('# **bold** and *italic*');
    const spans = nodes.filter((node) => isValidElement<{ className: string }>(node));
    expect(spans).toHaveLength(1);
    expect(spans[0].props.className).toContain('--heading');
  });
});
