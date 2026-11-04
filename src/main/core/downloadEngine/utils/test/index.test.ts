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
 * @file index.test.ts
 * @description 下载引擎通用工具函数单元测试。
 * @author 鸡哥
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */

import { describe, expect, it } from 'vitest';
import {
  normalizeThreads,
  parseContentDispositionFileName,
  inferFileNameFromUrl,
  safeFileName,
  isAbortError,
  buildChunks,
} from '..';
import { DEFAULT_THREADS, MAX_THREADS, MIN_THREADS, MIN_CHUNK_BYTES } from '../../config';

describe('normalizeThreads', () => {
  it('clamps value above MAX_THREADS down to MAX_THREADS', () => {
    expect(normalizeThreads(100)).toBe(MAX_THREADS);
  });

  it('clamps value below MIN_THREADS up to MIN_THREADS', () => {
    expect(normalizeThreads(0)).toBe(MIN_THREADS);
  });

  it('clamps negative values to MIN_THREADS', () => {
    expect(normalizeThreads(-5)).toBe(MIN_THREADS);
  });

  it('returns DEFAULT_THREADS for NaN', () => {
    expect(normalizeThreads(NaN)).toBe(DEFAULT_THREADS);
  });

  it('returns DEFAULT_THREADS for non-number types', () => {
    expect(normalizeThreads(undefined)).toBe(DEFAULT_THREADS);
    expect(normalizeThreads(null)).toBe(DEFAULT_THREADS);
    expect(normalizeThreads('8')).toBe(DEFAULT_THREADS);
    expect(normalizeThreads({})).toBe(DEFAULT_THREADS);
  });

  it('floors fractional values before clamping', () => {
    expect(normalizeThreads(3.9)).toBe(3);
  });

  it('returns the value itself when within valid range', () => {
    expect(normalizeThreads(4)).toBe(4);
    expect(normalizeThreads(1)).toBe(MIN_THREADS);
    expect(normalizeThreads(16)).toBe(MAX_THREADS);
  });
});

describe('parseContentDispositionFileName', () => {
  it("parses filename*=UTF-8'' encoded value", () => {
    const header = "attachment; filename*=UTF-8''%E6%B5%8B%E8%AF%95%E6%96%87%E4%BB%B6.txt";
    expect(parseContentDispositionFileName(header)).toBe('测试文件.txt');
  });

  it('parses simple filename= value', () => {
    const header = 'attachment; filename=readme.md';
    expect(parseContentDispositionFileName(header)).toBe('readme.md');
  });

  it('parses quoted filename= value', () => {
    const header = 'attachment; filename="my file (1).zip"';
    expect(parseContentDispositionFileName(header)).toBe('my file (1).zip');
  });

  it('prefers filename* over filename when both present', () => {
    const header = "attachment; filename=fallback.txt; filename*=UTF-8''preferred.txt";
    expect(parseContentDispositionFileName(header)).toBe('preferred.txt');
  });

  it('returns empty string when no filename is present', () => {
    expect(parseContentDispositionFileName('attachment')).toBe('');
    expect(parseContentDispositionFileName('')).toBe('');
  });

  it('falls back to raw value when decodeURIComponent throws', () => {
    const header = "attachment; filename*=UTF-8''%";
    expect(parseContentDispositionFileName(header)).toBe('%');
  });
});

describe('inferFileNameFromUrl', () => {
  it('extracts last path segment', () => {
    const url = new URL('https://example.com/files/document.pdf');
    expect(inferFileNameFromUrl(url)).toBe('document.pdf');
  });

  it('handles URL-encoded path segments', () => {
    const url = new URL('https://example.com/files/%E6%B5%8B%E8%AF%95.txt');
    expect(inferFileNameFromUrl(url)).toBe('测试.txt');
  });

  it('extracts directory name for trailing slash', () => {
    const url = new URL('https://example.com/downloads/');
    expect(inferFileNameFromUrl(url)).toBe('downloads');
  });

  it('returns fallback for root path', () => {
    const url = new URL('https://example.com/');
    const result = inferFileNameFromUrl(url);
    expect(result).toMatch(/^download-\d+\.bin$/);
  });
});

describe('safeFileName', () => {
  it('replaces invalid characters with underscores', () => {
    expect(safeFileName('file<>:"/\\|?*name')).toBe('file_________name');
  });

  it('trims whitespace', () => {
    expect(safeFileName('  hello  ')).toBe('hello');
  });

  it('truncates to 180 characters', () => {
    const long = 'a'.repeat(200);
    expect(safeFileName(long).length).toBe(180);
  });

  it('returns fallback for empty or whitespace-only input', () => {
    const result = safeFileName('   ');
    expect(result).toMatch(/^download-\d+\.bin$/);
  });

  it('returns fallback for empty string', () => {
    const result = safeFileName('');
    expect(result).toMatch(/^download-\d+\.bin$/);
  });

  it('preserves valid characters unchanged', () => {
    expect(safeFileName('normal-file_v2.txt')).toBe('normal-file_v2.txt');
  });
});

describe('isAbortError', () => {
  it('returns true for Error with name AbortError', () => {
    const err = new Error('request aborted');
    err.name = 'AbortError';
    expect(isAbortError(err)).toBe(true);
  });

  it('returns true for Error with abort keyword in message', () => {
    expect(isAbortError(new Error('The operation was aborted'))).toBe(true);
  });

  it('returns true for Error with abort keyword (case insensitive)', () => {
    expect(isAbortError(new Error('Request was ABORTED'))).toBe(true);
  });

  it('returns false for a regular Error', () => {
    expect(isAbortError(new Error('something went wrong'))).toBe(false);
  });

  it('returns false for non-Error values', () => {
    expect(isAbortError('string')).toBe(false);
    expect(isAbortError(null)).toBe(false);
    expect(isAbortError(undefined)).toBe(false);
    expect(isAbortError(42)).toBe(false);
  });
});

describe('buildChunks', () => {
  it('splits totalBytes evenly across threads', () => {
    const total = MIN_CHUNK_BYTES * 4;
    const chunks = buildChunks(total, 4, '/tmp');
    expect(chunks).toHaveLength(4);
    expect(chunks[0].start).toBe(0);
    expect(chunks[0].end).toBe(MIN_CHUNK_BYTES - 1);
    expect(chunks[1].start).toBe(MIN_CHUNK_BYTES);
    expect(chunks[3].end).toBe(total - 1);
  });

  it('handles remainder bytes in the last chunk', () => {
    const total = MIN_CHUNK_BYTES * 3 + 500;
    const chunks = buildChunks(total, 3, '/tmp');
    expect(chunks).toHaveLength(3);
    const totalCovered = chunks.reduce((sum, c) => sum + (c.end - c.start + 1), 0);
    expect(totalCovered).toBe(total);
    expect(chunks[chunks.length - 1].end).toBe(total - 1);
  });

  it('produces a single chunk when threads is 1', () => {
    const chunks = buildChunks(500, 1, '/tmp');
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({ index: 0, start: 0, end: 499 });
  });

  it('returns a single chunk for zero bytes', () => {
    const chunks = buildChunks(0, 4, '/tmp');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].start).toBe(0);
    expect(chunks[0].end).toBe(-1);
  });

  it('reduces threads when totalBytes is smaller than MIN_CHUNK_BYTES * threads', () => {
    // totalBytes < MIN_CHUNK_BYTES, so floor(totalBytes / MIN_CHUNK_BYTES) = 0 → targetThreads = 1
    const chunks = buildChunks(100, 8, '/tmp');
    expect(chunks).toHaveLength(1);
  });

  it('assigns correct partPath to each chunk', () => {
    const chunks = buildChunks(MIN_CHUNK_BYTES * 2, 2, '/data/tmp');
    expect(chunks[0].partPath).toMatch(/chunk-0\.part$/);
    expect(chunks[1].partPath).toMatch(/chunk-1\.part$/);
  });

  it('chunks are contiguous with no gaps', () => {
    const chunks = buildChunks(MIN_CHUNK_BYTES * 6, 6, '/tmp');
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].start).toBe(chunks[i - 1].end + 1);
    }
  });
});
