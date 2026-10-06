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
 * @file settingsConfig.test.ts
 * @description 展开态与全展开导航配置标准化测试。
 * @author 鸡哥
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock SvgIcon which is imported at module level for icon constants
const { SvgIconMock } = vi.hoisted(() => {
  const SvgIconMock: Record<string, string> = new Proxy(
    {},
    {
      get: (_target, prop: string) => `../svg/${prop}.svg`,
    },
  );
  return { SvgIconMock };
});

vi.mock('../../../../../../../utils/SvgIcon', () => ({
  SvgIcon: SvgIconMock,
}));

// Dynamic import to avoid module caching issues
let mod: typeof import('../settingsConfig');

beforeEach(async () => {
  vi.resetModules();
  // Re-apply the mock after resetModules
  vi.doMock('../../../../../../../utils/SvgIcon', () => ({
    SvgIcon: SvgIconMock,
  }));
  mod = await import('../settingsConfig');
});

describe('normalizeExpandNavLayoutConfig', () => {
  it('returns defaults when raw is null', () => {
    const result = mod.normalizeExpandNavLayoutConfig(null);
    expect(result).toEqual(mod.DEFAULT_EXPAND_NAV_LAYOUT);
  });

  it('returns defaults when raw is undefined', () => {
    const result = mod.normalizeExpandNavLayoutConfig(undefined);
    expect(result).toEqual(mod.DEFAULT_EXPAND_NAV_LAYOUT);
  });

  it('returns defaults when raw is a non-array value', () => {
    expect(mod.normalizeExpandNavLayoutConfig('string')).toEqual(mod.DEFAULT_EXPAND_NAV_LAYOUT);
    expect(mod.normalizeExpandNavLayoutConfig(42)).toEqual(mod.DEFAULT_EXPAND_NAV_LAYOUT);
    expect(mod.normalizeExpandNavLayoutConfig({})).toEqual(mod.DEFAULT_EXPAND_NAV_LAYOUT);
    expect(mod.normalizeExpandNavLayoutConfig(true)).toEqual(mod.DEFAULT_EXPAND_NAV_LAYOUT);
  });

  it('returns defaults when raw is an empty array', () => {
    const result = mod.normalizeExpandNavLayoutConfig([]);
    expect(result).toEqual(mod.DEFAULT_EXPAND_NAV_LAYOUT);
  });

  it('returns defaults when raw contains no valid items', () => {
    const result = mod.normalizeExpandNavLayoutConfig([
      { id: 'nonexistent', visible: true },
      { id: 123, visible: true },
      null,
      'invalid',
    ]);
    expect(result).toEqual(mod.DEFAULT_EXPAND_NAV_LAYOUT);
  });

  it('preserves ordering from input', () => {
    const input = [
      { id: 'tools', visible: true },
      { id: 'song', visible: true },
      { id: 'overview', visible: true },
      { id: 'translation', visible: true },
      { id: 'performanceMonitor', visible: true },
    ];
    const result = mod.normalizeExpandNavLayoutConfig(input);
    expect(result.map((i) => i.id)).toEqual([
      'tools',
      'song',
      'overview',
      'translation',
      'performanceMonitor',
    ]);
  });

  it('keeps overview visible when raw tries to hide it', () => {
    const input = [{ id: 'overview', visible: false }];
    const result = mod.normalizeExpandNavLayoutConfig(input);
    const overview = result.find((i) => i.id === 'overview');
    expect(overview?.visible).toBe(true);
  });

  it('keeps overview visible when every expand page is hidden', () => {
    const input = mod.EXPAND_CONFIGURABLE_TABS.map((id) => ({ id, visible: false }));
    const result = mod.normalizeExpandNavLayoutConfig(input);
    expect(result.find((i) => i.id === 'overview')?.visible).toBe(true);
    expect(result.filter((i) => i.visible)).toHaveLength(1);
  });

  it('respects visible=false for non-always-visible tabs', () => {
    const input = [
      { id: 'overview', visible: true },
      { id: 'song', visible: false },
      { id: 'tools', visible: false },
      { id: 'performanceMonitor', visible: true },
    ];
    const result = mod.normalizeExpandNavLayoutConfig(input);
    expect(result.find((i) => i.id === 'song')?.visible).toBe(false);
    expect(result.find((i) => i.id === 'tools')?.visible).toBe(false);
  });

  it('defaults visible to true when not specified', () => {
    const input = [{ id: 'song' }];
    const result = mod.normalizeExpandNavLayoutConfig(input);
    expect(result.find((i) => i.id === 'song')?.visible).toBe(true);
  });

  it('treats visible=undefined as true (visible !== false)', () => {
    const input = [{ id: 'song', visible: undefined }];
    const result = mod.normalizeExpandNavLayoutConfig(input);
    expect(result.find((i) => i.id === 'song')?.visible).toBe(true);
  });

  it('appends missing configurable tabs at the end with visible=true', () => {
    const input = [{ id: 'song', visible: false }];
    const result = mod.normalizeExpandNavLayoutConfig(input);
    // 'song' first, then missing tabs appended
    const ids = result.map((i) => i.id);
    expect(ids[0]).toBe('song');
    // overview, tools, translation, performanceMonitor should be appended
    expect(ids).toContain('overview');
    expect(ids).toContain('tools');
    expect(ids).toContain('translation');
    expect(ids).toContain('performanceMonitor');
    expect(result.length).toBe(mod.EXPAND_CONFIGURABLE_TABS.length);
  });

  it('deduplicates by id, keeping the first occurrence', () => {
    const input = [
      { id: 'song', visible: true },
      { id: 'song', visible: false },
    ];
    const result = mod.normalizeExpandNavLayoutConfig(input);
    const songEntries = result.filter((i) => i.id === 'song');
    expect(songEntries).toHaveLength(1);
    expect(songEntries[0].visible).toBe(true);
  });

  it('skips non-object items in the array', () => {
    const input = [
      null,
      undefined,
      'string',
      42,
      { id: 'song', visible: true },
    ];
    const result = mod.normalizeExpandNavLayoutConfig(input);
    expect(result.find((i) => i.id === 'song')?.visible).toBe(true);
  });

  it('skips items with non-string id', () => {
    const input = [
      { id: 123, visible: true },
      { id: null, visible: true },
      { id: undefined, visible: true },
    ];
    const result = mod.normalizeExpandNavLayoutConfig(input);
    expect(result).toEqual(mod.DEFAULT_EXPAND_NAV_LAYOUT);
  });

  it('skips items with id not in EXPAND_CONFIGURABLE_TABS', () => {
    const input = [
      { id: 'unknownTab', visible: true },
      { id: 'song', visible: true },
    ];
    const result = mod.normalizeExpandNavLayoutConfig(input);
    expect(result.find((i) => i.id === 'unknownTab')).toBeUndefined();
    expect(result.find((i) => i.id === 'song')?.visible).toBe(true);
  });

  it('returns all configurable tabs even when only partial input given', () => {
    const input = [
      { id: 'song', visible: false },
      { id: 'tools', visible: false },
    ];
    const result = mod.normalizeExpandNavLayoutConfig(input);
    const ids = result.map((i) => i.id);
    mod.EXPAND_CONFIGURABLE_TABS.forEach((tab) => {
      expect(ids).toContain(tab);
    });
    expect(result.length).toBe(mod.EXPAND_CONFIGURABLE_TABS.length);
  });

  it('does not mutate the returned defaults on subsequent calls', () => {
    const result1 = mod.normalizeExpandNavLayoutConfig(null);
    const result2 = mod.normalizeExpandNavLayoutConfig(null);
    expect(result1).toEqual(result2);
    expect(result1).not.toBe(result2);
    // Mutating one should not affect the other
    result1[0].visible = false;
    expect(result2[0].visible).toBe(true);
  });

  it('returns a deep copy: mutating result does not affect internal state', () => {
    const result = mod.normalizeExpandNavLayoutConfig(null);
    result.push({ id: 'extra', visible: true });
    const result2 = mod.normalizeExpandNavLayoutConfig(null);
    expect(result2.length).toBe(mod.EXPAND_CONFIGURABLE_TABS.length);
  });
});

describe('normalizeMaxExpandNavLayoutConfig', () => {
  it('returns defaults when raw is null', () => {
    const result = mod.normalizeMaxExpandNavLayoutConfig(null);
    expect(result).toEqual(mod.DEFAULT_MAXEXPAND_NAV_LAYOUT);
  });

  it('returns defaults when raw is undefined', () => {
    const result = mod.normalizeMaxExpandNavLayoutConfig(undefined);
    expect(result).toEqual(mod.DEFAULT_MAXEXPAND_NAV_LAYOUT);
  });

  it('returns defaults when raw is a non-array value', () => {
    expect(mod.normalizeMaxExpandNavLayoutConfig('string')).toEqual(mod.DEFAULT_MAXEXPAND_NAV_LAYOUT);
    expect(mod.normalizeMaxExpandNavLayoutConfig(42)).toEqual(mod.DEFAULT_MAXEXPAND_NAV_LAYOUT);
    expect(mod.normalizeMaxExpandNavLayoutConfig({})).toEqual(mod.DEFAULT_MAXEXPAND_NAV_LAYOUT);
    expect(mod.normalizeMaxExpandNavLayoutConfig(true)).toEqual(mod.DEFAULT_MAXEXPAND_NAV_LAYOUT);
  });

  it('returns defaults when raw is an empty array', () => {
    const result = mod.normalizeMaxExpandNavLayoutConfig([]);
    expect(result).toEqual(mod.DEFAULT_MAXEXPAND_NAV_LAYOUT);
  });

  it('returns defaults when raw contains no valid items', () => {
    const result = mod.normalizeMaxExpandNavLayoutConfig([
      { id: 'nonexistent', visible: true },
      null,
      'invalid',
    ]);
    expect(result).toEqual(mod.DEFAULT_MAXEXPAND_NAV_LAYOUT);
  });

  it('preserves ordering from input', () => {
    const input = [
      { id: 'miniGame', visible: true },
      { id: 'todo', visible: true },
      { id: 'aiChat', visible: true },
      { id: 'album', visible: true },
    ];
    const result = mod.normalizeMaxExpandNavLayoutConfig(input);
    expect(result.map((i) => i.id).slice(0, 4)).toEqual(['miniGame', 'todo', 'aiChat', 'album']);
  });

  it('allows previously fixed tabs to be hidden', () => {
    const input = [
      { id: 'aiChat', visible: false },
      { id: 'miniGame', visible: false },
      { id: 'todo', visible: true },
    ];
    const result = mod.normalizeMaxExpandNavLayoutConfig(input);
    expect(result.find((i) => i.id === 'aiChat')?.visible).toBe(false);
    expect(result.find((i) => i.id === 'miniGame')?.visible).toBe(false);
  });

  it('respects visible=false when at least one page remains visible', () => {
    const input = [
      { id: 'todo', visible: false },
      { id: 'album', visible: false },
      { id: 'mail', visible: false },
      { id: 'aiChat', visible: true },
    ];
    const result = mod.normalizeMaxExpandNavLayoutConfig(input);
    expect(result.find((i) => i.id === 'todo')?.visible).toBe(false);
    expect(result.find((i) => i.id === 'album')?.visible).toBe(false);
    expect(result.find((i) => i.id === 'mail')?.visible).toBe(false);
  });

  it('allows every page to be hidden', () => {
    const input = mod.MAXEXPAND_CONFIGURABLE_TABS.map((id) => ({ id, visible: false }));
    const result = mod.normalizeMaxExpandNavLayoutConfig(input);
    expect(result.filter((i) => i.visible)).toHaveLength(0);
  });

  it('defaults missing tabs to visible=true', () => {
    const input = [{ id: 'todo', visible: false }, { id: 'aiChat', visible: true }];
    const result = mod.normalizeMaxExpandNavLayoutConfig(input);
    expect(result.find((i) => i.id === 'todo')?.visible).toBe(false);
    // All other non-always-visible tabs should default to true
    expect(result.find((i) => i.id === 'urlFavorites')?.visible).toBe(true);
    expect(result.find((i) => i.id === 'album')?.visible).toBe(true);
    expect(result.find((i) => i.id === 'mail')?.visible).toBe(true);
    expect(result.find((i) => i.id === 'localFileSearch')?.visible).toBe(true);
    expect(result.find((i) => i.id === 'clipboardHistory')?.visible).toBe(true);
    expect(result.find((i) => i.id === 'memo')?.visible).toBe(true);
    expect(result.find((i) => i.id === 'countdown')?.visible).toBe(true);
    expect(result.find((i) => i.id === 'alarm')?.visible).toBe(true);
    expect(result.find((i) => i.id === 'toolbox')?.visible).toBe(true);
  });

  it('treats visible=undefined as visible=true', () => {
    const input = [{ id: 'todo', visible: undefined }];
    const result = mod.normalizeMaxExpandNavLayoutConfig(input);
    expect(result.find((i) => i.id === 'todo')?.visible).toBe(true);
  });

  it('deduplicates by id, keeping the first occurrence', () => {
    const input = [
      { id: 'todo', visible: true },
      { id: 'todo', visible: false },
    ];
    const result = mod.normalizeMaxExpandNavLayoutConfig(input);
    expect(result.find((i) => i.id === 'todo')?.visible).toBe(true);
  });

  it('skips non-object items in the array', () => {
    const input = [null, undefined, 'string', 42, { id: 'todo', visible: false }, { id: 'aiChat', visible: true }];
    const result = mod.normalizeMaxExpandNavLayoutConfig(input);
    expect(result.find((i) => i.id === 'todo')?.visible).toBe(false);
  });

  it('skips items with non-string id', () => {
    const input = [
      { id: 123, visible: true },
      { id: null, visible: true },
    ];
    const result = mod.normalizeMaxExpandNavLayoutConfig(input);
    expect(result).toEqual(mod.DEFAULT_MAXEXPAND_NAV_LAYOUT);
  });

  it('skips items with id not in MAXEXPAND_CONFIGURABLE_TABS', () => {
    const input = [
      { id: 'unknownTab', visible: false },
      { id: 'todo', visible: false },
      { id: 'aiChat', visible: true },
    ];
    const result = mod.normalizeMaxExpandNavLayoutConfig(input);
    expect(result.find((i) => i.id === 'unknownTab')).toBeUndefined();
    expect(result.find((i) => i.id === 'todo')?.visible).toBe(false);
  });

  it('always returns all configurable tabs', () => {
    const input = [{ id: 'todo', visible: false }, { id: 'aiChat', visible: true }];
    const result = mod.normalizeMaxExpandNavLayoutConfig(input);
    expect(result.length).toBe(mod.MAXEXPAND_CONFIGURABLE_TABS.length);
    mod.MAXEXPAND_CONFIGURABLE_TABS.forEach((tab) => {
      expect(result.find((i) => i.id === tab)).toBeDefined();
    });
  });

  it('returns deep copies: mutating result does not affect internal state', () => {
    const result1 = mod.normalizeMaxExpandNavLayoutConfig(null);
    const result2 = mod.normalizeMaxExpandNavLayoutConfig(null);
    expect(result1).toEqual(result2);
    expect(result1).not.toBe(result2);
    result1[0].visible = false;
    expect(result2[0].visible).toBe(true);
  });
});
