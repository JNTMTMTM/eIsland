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
 * @file settingsTabConfig.test.ts
 * @description 设置页配置常量与通用工具函数单元测试
 * @author 鸡哥
 */

import { describe, it, expect, vi } from 'vitest';
import {
  generateMailAccountId,
  isDirectBgMediaUrl,
  normalizeBgMediaConfig,
  getRoleFromToken,
  isProOnlyUpdateSource,
  UPDATE_SOURCES,
  PLUGIN_MARKET_PAGES,
  DEFAULT_AUTO_DIM_DELAY_SEC,
} from '../settingsTabConfig';

/* ------------------------------------------------------------------ */
/*  generateMailAccountId                                              */
/* ------------------------------------------------------------------ */

describe('generateMailAccountId', () => {
  it('returns a string containing a timestamp and a random segment separated by hyphen', () => {
    const id = generateMailAccountId();
    expect(id).toMatch(/^\d+-[a-z0-9]{6}$/);
  });

  it('produces different IDs on successive calls', () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateMailAccountId()));
    expect(ids.size).toBe(50);
  });

  it('uses Date.now as the numeric prefix', () => {
    const fixed = 1700000000000;
    vi.spyOn(Date, 'now').mockReturnValue(fixed);
    const id = generateMailAccountId();
    expect(id).toMatch(new RegExp(`^${fixed}-`));
  });

  it('uses 6 characters from Math.random result', () => {
    const fakeRandom = 0.123456789;
    const fixed = 1700000000000;
    const expectedRandomPart = fakeRandom.toString(36).slice(2, 8);
    vi.spyOn(Date, 'now').mockReturnValue(fixed);
    vi.spyOn(Math, 'random').mockReturnValue(fakeRandom);
    const id = generateMailAccountId();
    expect(id).toBe(`${fixed}-${expectedRandomPart}`);
  });
});

/* ------------------------------------------------------------------ */
/*  isDirectBgMediaUrl                                                 */
/* ------------------------------------------------------------------ */

describe('isDirectBgMediaUrl', () => {
  const directCases: string[] = [
    'data:image/png;base64,abc',
    'data:video/mp4;base64,xyz',
    'http://example.com/bg.jpg',
    'https://example.com/bg.png',
    'blob:http://localhost/abc-123',
    'file:///C:/Users/test/bg.jpg',
    '/home/user/bg.jpg',
    './assets/bg.png',
    '../resources/bg.jpg',
    'assets/bg.jpg',
  ];

  it.each(directCases)('returns true for direct URL: "%s"', (url) => {
    expect(isDirectBgMediaUrl(url)).toBe(true);
  });

  const indirectCases: string[] = [
    'C:\\Users\\test\\bg.jpg',
    'relative/path/bg.jpg',
    'eisland-media://local/something',
    'ftp://server/file.jpg',
    '',
    'Windows\\path\\bg.jpg',
  ];

  it.each(indirectCases)('returns false for non-direct URL: "%s"', (url) => {
    expect(isDirectBgMediaUrl(url)).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  normalizeBgMediaConfig                                             */
/* ------------------------------------------------------------------ */

describe('normalizeBgMediaConfig', () => {
  /* ---- string input (legacy) ---- */
  describe('when input is a string', () => {
    it('returns image config with trimmed source', () => {
      expect(normalizeBgMediaConfig('  /path/to/img.jpg  ')).toEqual({
        type: 'image',
        source: '/path/to/img.jpg',
      });
    });

    it('returns null for empty string', () => {
      expect(normalizeBgMediaConfig('')).toBeNull();
    });

    it('returns null for whitespace-only string', () => {
      expect(normalizeBgMediaConfig('   ')).toBeNull();
    });
  });

  /* ---- null / undefined / primitives ---- */
  describe('when input is null, undefined, or non-object', () => {
    it('returns null for null', () => {
      expect(normalizeBgMediaConfig(null)).toBeNull();
    });

    it('returns null for undefined', () => {
      expect(normalizeBgMediaConfig(undefined)).toBeNull();
    });

    it('returns null for a number', () => {
      expect(normalizeBgMediaConfig(42)).toBeNull();
    });

    it('returns null for a boolean', () => {
      expect(normalizeBgMediaConfig(true)).toBeNull();
    });
  });

  /* ---- object with source field ---- */
  describe('when input is an object with source field', () => {
    it('returns image config by default (no type)', () => {
      expect(normalizeBgMediaConfig({ source: '/img.jpg' })).toEqual({
        type: 'image',
        source: '/img.jpg',
      });
    });

    it('returns video config when type is "video"', () => {
      expect(normalizeBgMediaConfig({ type: 'video', source: '/vid.mp4' })).toEqual({
        type: 'video',
        source: '/vid.mp4',
      });
    });

    it('trims the source value', () => {
      expect(normalizeBgMediaConfig({ source: '  /img.jpg  ' })).toEqual({
        type: 'image',
        source: '/img.jpg',
      });
    });

    it('returns null when source is empty string', () => {
      expect(normalizeBgMediaConfig({ source: '' })).toBeNull();
    });

    it('returns null when source is whitespace-only', () => {
      expect(normalizeBgMediaConfig({ source: '   ' })).toBeNull();
    });

    it('returns null when source is not a string', () => {
      expect(normalizeBgMediaConfig({ source: 123 })).toBeNull();
    });
  });

  /* ---- legacy image field ---- */
  describe('when input uses legacy "image" field', () => {
    it('falls back to image field when source is absent', () => {
      expect(normalizeBgMediaConfig({ image: '/legacy.jpg' })).toEqual({
        type: 'image',
        source: '/legacy.jpg',
      });
    });

    it('prefers source over image', () => {
      expect(normalizeBgMediaConfig({ source: '/source.jpg', image: '/image.jpg' })).toEqual({
        type: 'image',
        source: '/source.jpg',
      });
    });
  });

  /* ---- legacy url field ---- */
  describe('when input uses legacy "url" field', () => {
    it('falls back to url field when source and image are absent', () => {
      expect(normalizeBgMediaConfig({ url: '/from-url.jpg' })).toEqual({
        type: 'image',
        source: '/from-url.jpg',
      });
    });
  });

  /* ---- priority order: source > image > url ---- */
  describe('field priority', () => {
    it('prefers source over image and url', () => {
      expect(normalizeBgMediaConfig({ source: '/s', image: '/i', url: '/u' })).toEqual({
        type: 'image',
        source: '/s',
      });
    });

    it('prefers image over url when source is missing', () => {
      expect(normalizeBgMediaConfig({ image: '/i', url: '/u' })).toEqual({
        type: 'image',
        source: '/i',
      });
    });
  });

  /* ---- edge: no valid source at all ---- */
  it('returns null when no source, image, or url field exists', () => {
    expect(normalizeBgMediaConfig({ type: 'video' })).toBeNull();
  });

  it('returns null for an empty object', () => {
    expect(normalizeBgMediaConfig({})).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  getRoleFromToken                                                   */
/* ------------------------------------------------------------------ */

describe('getRoleFromToken', () => {
  /** Helper: build a minimal JWT with the given role in the payload. */
  function makeToken(role: unknown): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    // Use URL-safe encoding variants to also exercise the - -> + and _ -> / normalization
    const payload = btoa(JSON.stringify({ role })).replace(/\+/g, '-').replace(/\//g, '_');
    return `${header}.${payload}.sig`;
  }

  /* ---- null / undefined / empty ---- */
  it('returns null for null token', () => {
    expect(getRoleFromToken(null)).toBeNull();
  });

  it('returns null for undefined token', () => {
    expect(getRoleFromToken(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(getRoleFromToken('')).toBeNull();
  });

  it('returns null for whitespace-only string', () => {
    expect(getRoleFromToken('   ')).toBeNull();
  });

  /* ---- invalid tokens ---- */
  it('returns null for a token without dots', () => {
    expect(getRoleFromToken('notajwt')).toBeNull();
  });

  it('returns null for a token with only one dot', () => {
    expect(getRoleFromToken('header.payload')).toBeNull();
  });

  it('returns null when payload is not valid base64 JSON', () => {
    expect(getRoleFromToken('header.!!!invalid!!!.sig')).toBeNull();
  });

  it('returns null when payload JSON has no role field', () => {
    const token = makeToken(undefined);
    expect(getRoleFromToken(token)).toBeNull();
  });

  it('returns null when role is not a string', () => {
    const token = makeToken(42);
    expect(getRoleFromToken(token)).toBeNull();
  });

  it('returns null when role is an object', () => {
    const token = makeToken({ name: 'admin' });
    expect(getRoleFromToken(token)).toBeNull();
  });

  /* ---- role normalization ---- */
  it('returns lowercased role', () => {
    expect(getRoleFromToken(makeToken('Admin'))).toBe('admin');
  });

  it('strips leading "role_" prefix', () => {
    expect(getRoleFromToken(makeToken('role_admin'))).toBe('admin');
  });

  it('strips leading "role_" prefix case-insensitively', () => {
    expect(getRoleFromToken(makeToken('ROLE_moderator'))).toBe('moderator');
  });

  it('trims whitespace from role', () => {
    expect(getRoleFromToken(makeToken('  admin  '))).toBe('admin');
  });

  /* ---- bearer prefix handling ---- */
  it('strips "bearer " prefix from token (case-insensitive)', () => {
    const inner = makeToken('admin');
    expect(getRoleFromToken(`Bearer ${inner}`)).toBe('admin');
  });

  it('strips "BEARER " prefix from token', () => {
    const inner = makeToken('user');
    expect(getRoleFromToken(`BEARER ${inner}`)).toBe('user');
  });

  it('trims whitespace around the raw token', () => {
    const inner = makeToken('admin');
    expect(getRoleFromToken(`  ${inner}  `)).toBe('admin');
  });

  /* ---- valid real-world-ish tokens ---- */
  it('parses a standard role value', () => {
    expect(getRoleFromToken(makeToken('user'))).toBe('user');
  });

  it('parses a pro role value', () => {
    expect(getRoleFromToken(makeToken('pro'))).toBe('pro');
  });
});

/* ------------------------------------------------------------------ */
/*  isProOnlyUpdateSource                                              */
/* ------------------------------------------------------------------ */

describe('isProOnlyUpdateSource', () => {
  it('returns true for "tencent-cos"', () => {
    expect(isProOnlyUpdateSource('tencent-cos')).toBe(true);
  });

  it('returns true for "aliyun-oss"', () => {
    expect(isProOnlyUpdateSource('aliyun-oss')).toBe(true);
  });

  it('returns false for "cloudflare-r2"', () => {
    expect(isProOnlyUpdateSource('cloudflare-r2')).toBe(false);
  });

  it('returns false for "esa-cdn"', () => {
    expect(isProOnlyUpdateSource('esa-cdn')).toBe(false);
  });

  it('returns false for "github"', () => {
    expect(isProOnlyUpdateSource('github')).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  Constant exports sanity                                            */
/* ------------------------------------------------------------------ */

describe('exported constants', () => {
  it('exports the expected default auto-dim delay', () => {
    expect(DEFAULT_AUTO_DIM_DELAY_SEC).toBe(10);
  });

  it('exports PLUGIN_MARKET_PAGES with four entries', () => {
    expect(PLUGIN_MARKET_PAGES).toEqual(['wallpaper', 'contribution', 'edit', 'apps']);
  });

  it('exports UPDATE_SOURCES with five entries', () => {
    expect(UPDATE_SOURCES).toHaveLength(5);
  });

  it('marks exactly tencent-cos and aliyun-oss as proOnly in UPDATE_SOURCES', () => {
    const proOnlyKeys = UPDATE_SOURCES.filter((s) => s.proOnly).map((s) => s.key);
    expect(proOnlyKeys).toEqual(['tencent-cos', 'aliyun-oss']);
  });
});
