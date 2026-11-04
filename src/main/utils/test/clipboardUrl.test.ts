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
 * @file clipboardUrl.test.ts
 * @description 剪贴板 URL 工具模块单元测试
 * @author 鸡哥
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */

import { describe, expect, it } from 'vitest';
import {
  normalizeClipboardUrlDetectMode,
  normalizeClipboardUrlBlacklistDomain,
  sanitizeClipboardUrlBlacklist,
  extractUrls,
  isUrlBlacklisted,
} from '../clipboardUrl';

describe('normalizeClipboardUrlDetectMode', () => {
  it('returns "https-only" for valid mode', () => {
    expect(normalizeClipboardUrlDetectMode('https-only')).toBe('https-only');
  });

  it('returns "http-https" for valid mode', () => {
    expect(normalizeClipboardUrlDetectMode('http-https')).toBe('http-https');
  });

  it('returns "domain-only" for valid mode', () => {
    expect(normalizeClipboardUrlDetectMode('domain-only')).toBe('domain-only');
  });

  it('returns null for invalid string', () => {
    expect(normalizeClipboardUrlDetectMode('auto')).toBeNull();
    expect(normalizeClipboardUrlDetectMode('strict')).toBeNull();
    expect(normalizeClipboardUrlDetectMode('')).toBeNull();
  });

  it('returns null for non-string values', () => {
    expect(normalizeClipboardUrlDetectMode(null)).toBeNull();
    expect(normalizeClipboardUrlDetectMode(undefined)).toBeNull();
    expect(normalizeClipboardUrlDetectMode(123)).toBeNull();
    expect(normalizeClipboardUrlDetectMode(true)).toBeNull();
    expect(normalizeClipboardUrlDetectMode({})).toBeNull();
  });
});

describe('normalizeClipboardUrlBlacklistDomain', () => {
  it('returns lowercase hostname for plain domain', () => {
    expect(normalizeClipboardUrlBlacklistDomain('Example.COM')).toBe('example.com');
  });

  it('extracts hostname from full URL', () => {
    expect(normalizeClipboardUrlBlacklistDomain('https://Example.com/path?q=1')).toBe('example.com');
  });

  it('strips trailing dot from hostname', () => {
    expect(normalizeClipboardUrlBlacklistDomain('example.com.')).toBe('example.com');
  });

  it('trims whitespace', () => {
    expect(normalizeClipboardUrlBlacklistDomain('  example.com  ')).toBe('example.com');
  });

  it('returns empty string for empty input', () => {
    expect(normalizeClipboardUrlBlacklistDomain('')).toBe('');
    expect(normalizeClipboardUrlBlacklistDomain('   ')).toBe('');
  });

  it('returns empty string for invalid URL', () => {
    expect(normalizeClipboardUrlBlacklistDomain('://bad')).toBe('');
  });

  it('handles subdomains', () => {
    expect(normalizeClipboardUrlBlacklistDomain('sub.example.com')).toBe('sub.example.com');
  });
});

describe('sanitizeClipboardUrlBlacklist', () => {
  it('returns empty array for non-array input', () => {
    expect(sanitizeClipboardUrlBlacklist(null)).toEqual([]);
    expect(sanitizeClipboardUrlBlacklist(undefined)).toEqual([]);
    expect(sanitizeClipboardUrlBlacklist('string')).toEqual([]);
    expect(sanitizeClipboardUrlBlacklist(123)).toEqual([]);
  });

  it('filters out non-string items', () => {
    expect(sanitizeClipboardUrlBlacklist([1, null, undefined, {}, true])).toEqual([]);
  });

  it('normalizes valid domains', () => {
    expect(sanitizeClipboardUrlBlacklist(['Example.COM', 'test.org'])).toEqual([
      'example.com',
      'test.org',
    ]);
  });

  it('deduplicates domains case-insensitively', () => {
    expect(sanitizeClipboardUrlBlacklist(['example.com', 'EXAMPLE.COM', 'Example.Com'])).toEqual([
      'example.com',
    ]);
  });

  it('filters out invalid domain entries', () => {
    expect(sanitizeClipboardUrlBlacklist(['example.com', '', '   ', '://bad'])).toEqual([
      'example.com',
    ]);
  });

  it('handles empty array', () => {
    expect(sanitizeClipboardUrlBlacklist([])).toEqual([]);
  });
});

describe('extractUrls', () => {
  describe('https-only mode', () => {
    it('extracts https URLs', () => {
      const text = 'visit https://example.com and https://test.org/path';
      expect(extractUrls(text, 'https-only')).toEqual([
        'https://example.com',
        'https://test.org/path',
      ]);
    });

    it('ignores http URLs', () => {
      const text = 'visit http://example.com and https://test.org';
      expect(extractUrls(text, 'https-only')).toEqual(['https://test.org']);
    });

    it('returns empty array when no https URLs found', () => {
      expect(extractUrls('no urls here', 'https-only')).toEqual([]);
    });
  });

  describe('http-https mode', () => {
    it('extracts both http and https URLs', () => {
      const text = 'visit http://a.com and https://b.com';
      expect(extractUrls(text, 'http-https')).toEqual(['http://a.com', 'https://b.com']);
    });

    it('returns empty array when no URLs found', () => {
      expect(extractUrls('no urls here', 'http-https')).toEqual([]);
    });
  });

  describe('domain-only mode', () => {
    it('extracts bare domains and prepends https', () => {
      const text = 'visit example.com for more info';
      expect(extractUrls(text, 'domain-only')).toEqual(['https://example.com']);
    });

    it('extracts domains with paths', () => {
      const text = 'check example.com/path?q=1';
      expect(extractUrls(text, 'domain-only')).toEqual(['https://example.com/path?q=1']);
    });

    it('does not duplicate https scheme', () => {
      const text = 'https://example.com';
      const result = extractUrls(text, 'domain-only');
      expect(result[0]).toMatch(/^https:\/\//);
    });
  });

  describe('common behavior', () => {
    it('returns empty array for empty text', () => {
      expect(extractUrls('', 'https-only')).toEqual([]);
      expect(extractUrls('', 'http-https')).toEqual([]);
      expect(extractUrls('', 'domain-only')).toEqual([]);
    });

    it('deduplicates URLs case-insensitively', () => {
      const text = 'https://Example.com and https://example.com';
      expect(extractUrls(text, 'https-only')).toEqual(['https://Example.com']);
    });
  });
});

describe('isUrlBlacklisted', () => {
  it('returns false for empty blacklist', () => {
    expect(isUrlBlacklisted('https://example.com', [])).toBe(false);
  });

  it('returns true when hostname matches exactly', () => {
    expect(isUrlBlacklisted('https://example.com', ['example.com'])).toBe(true);
  });

  it('returns true for subdomain match', () => {
    expect(isUrlBlacklisted('https://sub.example.com', ['example.com'])).toBe(true);
  });

  it('returns false when hostname does not match', () => {
    expect(isUrlBlacklisted('https://other.com', ['example.com'])).toBe(false);
  });

  it('matches case-insensitively for URL hostname', () => {
    expect(isUrlBlacklisted('https://EXAMPLE.COM', ['example.com'])).toBe(true);
  });

  it('does not lowercase blacklist entries (caller is expected to normalize)', () => {
    // The function only lowercases the URL hostname, not blacklist entries.
    // Blacklist entries should be pre-normalized via sanitizeClipboardUrlBlacklist.
    expect(isUrlBlacklisted('https://example.com', ['EXAMPLE.COM'])).toBe(false);
  });

  it('matches case-insensitively when blacklist is pre-normalized', () => {
    // When blacklist entries are already lowercase (as produced by sanitizeClipboardUrlBlacklist),
    // URL hostnames with different cases still match.
    expect(isUrlBlacklisted('https://EXAMPLE.COM', ['example.com'])).toBe(true);
    expect(isUrlBlacklisted('https://Example.Com', ['example.com'])).toBe(true);
  });

  it('does not match partial hostname segments', () => {
    expect(isUrlBlacklisted('https://notexample.com', ['example.com'])).toBe(false);
  });

  it('returns false for invalid URL', () => {
    expect(isUrlBlacklisted('not-a-url', ['example.com'])).toBe(false);
  });

  it('matches against multiple blacklist entries', () => {
    const blacklist = ['ads.example.com', 'tracker.org'];
    expect(isUrlBlacklisted('https://tracker.org', blacklist)).toBe(true);
    expect(isUrlBlacklisted('https://sub.ads.example.com', blacklist)).toBe(true);
    expect(isUrlBlacklisted('https://safe.com', blacklist)).toBe(false);
  });
});
