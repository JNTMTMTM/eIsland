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
 * @file downloadFormatters.test.ts
 * @description 下载文件大小、建议文件名与任务耗时格式化测试。
 * @author 鸡哥
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatBytes, inferSuggestedName, formatDurationMs } from '../downloadFormatters';

describe('formatBytes', () => {
  it('returns "0 B" for 0', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('returns "0 B" for negative values', () => {
    expect(formatBytes(-100)).toBe('0 B');
  });

  it('returns "0 B" for NaN', () => {
    expect(formatBytes(NaN)).toBe('0 B');
  });

  it('returns "0 B" for Infinity', () => {
    expect(formatBytes(Infinity)).toBe('0 B');
  });

  it('returns "0 B" for -Infinity', () => {
    expect(formatBytes(-Infinity)).toBe('0 B');
  });

  it('formats bytes below 1024 without unit conversion', () => {
    expect(formatBytes(1)).toBe('1 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('formats kilobytes correctly', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1024 * 1023)).toBe('1023.0 KB');
  });

  it('formats megabytes correctly', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
    expect(formatBytes(1024 * 1024 * 1.5)).toBe('1.5 MB');
    expect(formatBytes(1024 * 1024 * 999)).toBe('999.0 MB');
  });

  it('formats gigabytes correctly', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB');
    expect(formatBytes(1024 * 1024 * 1024 * 2.5)).toBe('2.50 GB');
  });

  it('handles exactly 1024 bytes as KB', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
  });

  it('handles exactly 1 MB boundary', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
  });

  it('handles exactly 1 GB boundary', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB');
  });
});

describe('inferSuggestedName', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
  });

  it('returns fallback name for empty string', () => {
    expect(inferSuggestedName('')).toBe('download-1700000000000.bin');
  });

  it('returns fallback name for whitespace-only string', () => {
    expect(inferSuggestedName('   ')).toBe('download-1700000000000.bin');
  });

  it('extracts filename from a simple HTTPS URL', () => {
    expect(inferSuggestedName('https://example.com/file.zip')).toBe('file.zip');
  });

  it('extracts filename from an HTTP URL', () => {
    expect(inferSuggestedName('http://example.com/path/to/doc.pdf')).toBe('doc.pdf');
  });

  it('extracts filename from URL without protocol', () => {
    expect(inferSuggestedName('example.com/files/image.png')).toBe('image.png');
  });

  it('handles URL with encoded characters in filename', () => {
    expect(inferSuggestedName('https://example.com/%E4%B8%AD%E6%96%87.txt')).toBe('中文.txt');
  });

  it('handles URL with query string and hash', () => {
    expect(inferSuggestedName('https://example.com/file.tar.gz?token=abc#section')).toBe('file.tar.gz');
  });

  it('handles URL with trailing slash (empty last segment)', () => {
    expect(inferSuggestedName('https://example.com/downloads/')).toBe('downloads');
  });

  it('returns fallback for invalid URL', () => {
    expect(inferSuggestedName('not a url at all %%')).toBe('download-1700000000000.bin');
  });

  it('handles URL with deep nested path', () => {
    expect(inferSuggestedName('https://cdn.example.com/a/b/c/d/e/setup.exe')).toBe('setup.exe');
  });

  it('handles URL with port number', () => {
    expect(inferSuggestedName('https://example.com:8080/file.bin')).toBe('file.bin');
  });
});

describe('formatDurationMs', () => {
  it('returns "-" for 0', () => {
    expect(formatDurationMs(0)).toBe('-');
  });

  it('returns "-" for negative values', () => {
    expect(formatDurationMs(-5000)).toBe('-');
  });

  it('returns "-" for NaN', () => {
    expect(formatDurationMs(NaN)).toBe('-');
  });

  it('returns "-" for Infinity', () => {
    expect(formatDurationMs(Infinity)).toBe('-');
  });

  it('returns "-" for -Infinity', () => {
    expect(formatDurationMs(-Infinity)).toBe('-');
  });

  it('formats seconds only (< 1 minute)', () => {
    expect(formatDurationMs(30000)).toBe('00:30');
    expect(formatDurationMs(1000)).toBe('00:01');
    expect(formatDurationMs(59000)).toBe('00:59');
  });

  it('formats minutes and seconds (< 1 hour)', () => {
    expect(formatDurationMs(60000)).toBe('01:00');
    expect(formatDurationMs(90000)).toBe('01:30');
    expect(formatDurationMs(3599000)).toBe('59:59');
  });

  it('formats hours, minutes and seconds', () => {
    expect(formatDurationMs(3600000)).toBe('01:00:00');
    expect(formatDurationMs(3661000)).toBe('01:01:01');
    expect(formatDurationMs(7200000)).toBe('02:00:00');
  });

  it('pads single digits with leading zeros', () => {
    expect(formatDurationMs(61000)).toBe('01:01');
    expect(formatDurationMs(3601000)).toBe('01:00:01');
  });

  it('truncates sub-second remainder', () => {
    expect(formatDurationMs(1999)).toBe('00:01');
    expect(formatDurationMs(61999)).toBe('01:01');
  });

  it('handles exactly 1 second', () => {
    expect(formatDurationMs(1000)).toBe('00:01');
  });

  it('handles exactly 1 hour', () => {
    expect(formatDurationMs(3600000)).toBe('01:00:00');
  });

  it('handles large durations', () => {
    expect(formatDurationMs(36000000)).toBe('10:00:00');
  });
});
