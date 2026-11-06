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
 * @file dynamicIslandUpdateSource.test.ts
 * @description dynamicIslandUpdateSource 工具函数单元测试
 * @author 鸡哥
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeUpdateSource,
  isProOnlyUpdateSource,
  getRoleFromToken,
  getUpdateSourceLabel,
} from '../dynamicIslandUpdateSource';

/**
 * Build a fake JWT-like token from a payload object.
 * Uses standard base64 (not base64url) unless overridden.
 */
function buildToken(payload: object, opts?: { base64url?: boolean; prefix?: string }): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  let rawPayload = btoa(JSON.stringify(payload));
  if (opts?.base64url) {
    rawPayload = rawPayload.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  const prefix = opts?.prefix ?? '';
  return `${prefix}${header}.${rawPayload}.fake-sig`;
}

describe('normalizeUpdateSource', () => {
  it('returns "github" for "github"', () => {
    expect(normalizeUpdateSource('github')).toBe('github');
  });

  it('returns "tencent-cos" for "tencent-cos"', () => {
    expect(normalizeUpdateSource('tencent-cos')).toBe('tencent-cos');
  });

  it('returns "aliyun-oss" for "aliyun-oss"', () => {
    expect(normalizeUpdateSource('aliyun-oss')).toBe('aliyun-oss');
  });

  it('returns "cloudflare-r2" for "cloudflare-r2"', () => {
    expect(normalizeUpdateSource('cloudflare-r2')).toBe('cloudflare-r2');
  });

  it('returns "esa-cdn" for "esa-cdn"', () => {
    expect(normalizeUpdateSource('esa-cdn')).toBe('esa-cdn');
  });

  it('returns "esa-cdn" as default for unknown string', () => {
    expect(normalizeUpdateSource('unknown-source')).toBe('esa-cdn');
  });

  it('returns "esa-cdn" for null', () => {
    expect(normalizeUpdateSource(null)).toBe('esa-cdn');
  });

  it('returns "esa-cdn" for undefined', () => {
    expect(normalizeUpdateSource(undefined)).toBe('esa-cdn');
  });

  it('returns "esa-cdn" for numeric value', () => {
    expect(normalizeUpdateSource(42)).toBe('esa-cdn');
  });

  it('returns "esa-cdn" for empty string', () => {
    expect(normalizeUpdateSource('')).toBe('esa-cdn');
  });

  it('returns "esa-cdn" for object', () => {
    expect(normalizeUpdateSource({})).toBe('esa-cdn');
  });

  it('returns "esa-cdn" for boolean true', () => {
    expect(normalizeUpdateSource(true)).toBe('esa-cdn');
  });

  it('is case-sensitive (uppercase variant falls back to default)', () => {
    expect(normalizeUpdateSource('GitHub')).toBe('esa-cdn');
    expect(normalizeUpdateSource('GITHUB')).toBe('esa-cdn');
  });
});

describe('isProOnlyUpdateSource', () => {
  it('returns true for "tencent-cos"', () => {
    expect(isProOnlyUpdateSource('tencent-cos')).toBe(true);
  });

  it('returns true for "aliyun-oss"', () => {
    expect(isProOnlyUpdateSource('aliyun-oss')).toBe(true);
  });

  it('returns false for "github"', () => {
    expect(isProOnlyUpdateSource('github')).toBe(false);
  });

  it('returns false for "cloudflare-r2"', () => {
    expect(isProOnlyUpdateSource('cloudflare-r2')).toBe(false);
  });

  it('returns false for "esa-cdn"', () => {
    expect(isProOnlyUpdateSource('esa-cdn')).toBe(false);
  });
});

describe('getRoleFromToken', () => {
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

  it('returns null for token without dots', () => {
    expect(getRoleFromToken('notajwt')).toBeNull();
  });

  it('returns null for token with only one dot', () => {
    expect(getRoleFromToken('header.payload')).toBeNull();
  });

  it('extracts role from a valid JWT-like token', () => {
    const token = buildToken({ role: 'admin' });
    expect(getRoleFromToken(token)).toBe('admin');
  });

  it('returns null when role field is missing from payload', () => {
    const token = buildToken({ sub: '12345' });
    expect(getRoleFromToken(token)).toBeNull();
  });

  it('returns null when role is not a string', () => {
    const token = buildToken({ role: 123 });
    expect(getRoleFromToken(token)).toBeNull();
  });

  it('returns null when role is an object', () => {
    const token = buildToken({ role: { name: 'admin' } });
    expect(getRoleFromToken(token)).toBeNull();
  });

  it('returns null when role is null in payload', () => {
    const token = buildToken({ role: null });
    expect(getRoleFromToken(token)).toBeNull();
  });

  it('strips "Bearer " prefix (case-insensitive)', () => {
    const raw = buildToken({ role: 'user' });
    expect(getRoleFromToken(`Bearer ${raw}`)).toBe('user');
    expect(getRoleFromToken(`bearer ${raw}`)).toBe('user');
    expect(getRoleFromToken(`BEARER ${raw}`)).toBe('user');
  });

  it('trims surrounding whitespace from token', () => {
    const raw = buildToken({ role: 'editor' });
    expect(getRoleFromToken(`  ${raw}  `)).toBe('editor');
  });

  it('normalizes role: trims whitespace', () => {
    const token = buildToken({ role: '  admin  ' });
    expect(getRoleFromToken(token)).toBe('admin');
  });

  it('normalizes role: lowercases', () => {
    const token = buildToken({ role: 'ADMIN' });
    expect(getRoleFromToken(token)).toBe('admin');
  });

  it('normalizes role: strips "role_" prefix', () => {
    const token = buildToken({ role: 'role_admin' });
    expect(getRoleFromToken(token)).toBe('admin');
  });

  it('normalizes role: strips "role_" prefix case-insensitively after lowercasing', () => {
    const token = buildToken({ role: 'ROLE_USER' });
    expect(getRoleFromToken(token)).toBe('user');
  });

  it('normalizes role: combined trim, lowercase, and prefix strip', () => {
    const token = buildToken({ role: '  ROLE_Moderator  ' });
    expect(getRoleFromToken(token)).toBe('moderator');
  });

  it('handles base64url encoding (uses - and _ instead of + and /)', () => {
    const token = buildToken({ role: 'admin??' }, { base64url: true });
    expect(getRoleFromToken(token)).toBe('admin??');
  });

  it('returns null for payload with invalid base64', () => {
    const token = 'header.!!!invalid-base64!!!.sig';
    expect(getRoleFromToken(token)).toBeNull();
  });

  it('returns null for payload that decodes to invalid JSON', () => {
    const invalidJson = btoa('not json at all');
    const token = `header.${invalidJson}.sig`;
    expect(getRoleFromToken(token)).toBeNull();
  });

  it('handles payload that needs padding normalization', () => {
    // btoa of '{"role":"viewer"}' may or may not need padding; test explicit short payload
    const payload = btoa(JSON.stringify({ role: 'viewer' }));
    const unpadded = payload.replace(/=+$/, '');
    const token = `header.${unpadded}.sig`;
    expect(getRoleFromToken(token)).toBe('viewer');
  });

  it('returns "admin" for role that only has role_ prefix stripped once', () => {
    const token = buildToken({ role: 'role_role_admin' });
    // regex only strips leading "role_", so "role_role_admin" -> "role_admin"
    expect(getRoleFromToken(token)).toBe('role_admin');
  });
});

describe('getUpdateSourceLabel', () => {
  it('returns "GitHub Releases" for "github"', () => {
    expect(getUpdateSourceLabel('github')).toBe('GitHub Releases');
  });

  it('returns "Tencent COS" for "tencent-cos"', () => {
    expect(getUpdateSourceLabel('tencent-cos')).toBe('Tencent COS');
  });

  it('returns "Aliyun OSS" for "aliyun-oss"', () => {
    expect(getUpdateSourceLabel('aliyun-oss')).toBe('Aliyun OSS');
  });

  it('returns "Cloudflare R2" for "cloudflare-r2"', () => {
    expect(getUpdateSourceLabel('cloudflare-r2')).toBe('Cloudflare R2');
  });

  it('returns "ESA CDN" for "esa-cdn"', () => {
    expect(getUpdateSourceLabel('esa-cdn')).toBe('ESA CDN');
  });

  it('returns "ESA CDN" as default for unknown string', () => {
    expect(getUpdateSourceLabel('unknown')).toBe('ESA CDN');
  });

  it('returns "ESA CDN" for null', () => {
    expect(getUpdateSourceLabel(null)).toBe('ESA CDN');
  });

  it('returns "ESA CDN" for undefined', () => {
    expect(getUpdateSourceLabel(undefined)).toBe('ESA CDN');
  });

  it('returns "ESA CDN" for numeric value', () => {
    expect(getUpdateSourceLabel(0)).toBe('ESA CDN');
  });

  it('returns "ESA CDN" for empty string', () => {
    expect(getUpdateSourceLabel('')).toBe('ESA CDN');
  });

  it('returns "ESA CDN" for boolean false', () => {
    expect(getUpdateSourceLabel(false)).toBe('ESA CDN');
  });

  it('is case-sensitive (uppercase "GitHub" falls back to default)', () => {
    expect(getUpdateSourceLabel('GitHub')).toBe('ESA CDN');
  });
});
