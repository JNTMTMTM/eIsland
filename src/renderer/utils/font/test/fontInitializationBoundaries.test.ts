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
 * @file fontInitializationBoundaries.test.ts
 * @description 字体初始化默认值、自定义字体读取失败、真实 Blob MIME 与样式重用测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initFonts, injectFontFace, PRESET_FONTS, releaseCustomFonts } from '../index';

/** 浏览器样式节点边界，删除操作同步更新文档的 ID 索引。 */
interface StyleEntry {
  id: string;
  dataset: { fontUrl?: string };
  textContent: string;
  remove: () => void;
}
const styles = new Map<string, StyleEntry>();
const store = vi.fn();
const read = vi.fn();
const apply = vi.fn();
const create = vi.fn();
const revoke = vi.fn();

/**
 * 创建叶 DOM 样式节点，不模拟字体选择或清理算法。
 * @returns 样式节点。
 */
function styleNode(): StyleEntry {
  const node: StyleEntry = { id: '', dataset: {}, textContent: '', remove: () => { styles.delete(node.id); } };
  return node;
}

beforeEach(() => {
  styles.clear();
  store.mockReset().mockResolvedValue(null);
  read.mockReset().mockResolvedValue(null);
  apply.mockReset();
  create.mockReset().mockImplementation(() => `blob:${  create.mock.calls.length}`);
  revoke.mockReset();
  vi.stubGlobal('window', { api: { storeRead: store, readFontFile: read } });
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => create(blob) as string);
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation((url) => { revoke(url); });
  vi.stubGlobal('document', {
    documentElement: { style: { setProperty: apply } },
    getElementById: (id: string) => styles.get(id) ?? null,
    querySelectorAll: () => [...styles.values()].filter((node) => 'fontUrl' in node.dataset),
    createElement: styleNode,
    head: { appendChild: (node: StyleEntry) => { styles.set(node.id, node); } },
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('font initialization boundary states', () => {
  it.each([{ selected: null }, { selected: 3 }, { selected: 'unknown-preset' }, { selected: 'custom:/missing.ttf' }])('keeps default CSS when selection $selected cannot be loaded', async ({ selected }) => {
    store.mockImplementation((key: string) => Promise.resolve(key.endsWith('custom-fonts') ? null : selected));
    await initFonts();
    expect(read).not.toHaveBeenCalled();
    expect(apply).not.toHaveBeenCalled();
  });
  it('applies known UI and lyric presets without custom loading', async () => {
    store.mockImplementation((key: string) => Promise.resolve(key.endsWith('custom-fonts') ? {} : 'consolas'));
    await initFonts();
    expect(apply).toHaveBeenCalledWith('--island-ui-font', PRESET_FONTS.consolas);
    expect(apply).toHaveBeenCalledWith('--island-lyrics-font', PRESET_FONTS.consolas);
  });
  it.each(['empty', 'reject', 'invalid base64'])('uses default CSS for selected font read failure %s', async (failure) => {
    store.mockImplementation((key: string) => Promise.resolve(key.endsWith('custom-fonts') ? [{ name: 'Font', path: '/font.ttf' }] : 'custom:/font.ttf'));
    if (failure === 'reject') {
      read.mockRejectedValue(new Error('read failed'));
    } else if (failure === 'invalid base64') {
      read.mockResolvedValue({ data: '!', ext: 'ttf' });
    }
    await initFonts();
    expect(read).toHaveBeenCalledTimes(2);
    expect(apply).not.toHaveBeenCalled();
  });
  it('contains startup storage rejection', async () => {
    store.mockRejectedValue(new Error('IPC unavailable'));
    await expect(initFonts()).resolves.toBeUndefined();
    expect(read).not.toHaveBeenCalled();
  });
});

describe('font Blob and existing style handling', () => {
  it.each([{ ext: 'otf', mime: 'font/otf', format: 'opentype' }, { ext: 'woff', mime: 'font/woff', format: 'woff' }, { ext: 'unknown', mime: 'font/ttf', format: 'unknown' }])('injects real Blob using $ext MIME and format', async ({ ext, mime, format }) => {
    expect(injectFontFace('Fixture', btoa('font-data'), ext)).toBe("'Fixture', sans-serif");
    const blob = create.mock.calls[0][0] as Blob;
    expect(blob.type).toBe(mime);
    expect(await blob.text()).toBe('font-data');
    expect(styles.get('custom-font-Fixture')?.textContent).toContain(`format('${  format  }')`);
  });
  it('reuses an existing style and revokes its previous URL', () => {
    injectFontFace('Fixture', btoa('first'), 'ttf');
    const first = styles.get('custom-font-Fixture');
    injectFontFace('Fixture', btoa('second'), 'ttf');
    expect(styles.get('custom-font-Fixture')).toBe(first);
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:1');
  });
  it('reuses a style without an old URL and removes matching empty attributes', () => {
    const existing = styleNode();
    existing.id = 'custom-font-Fixture';
    styles.set(existing.id, existing);
    injectFontFace('Fixture', btoa('font-data'), 'ttf');
    expect(revoke).not.toHaveBeenCalled();
    const blank = styleNode();
    blank.id = 'custom-font-eIsland-UI-Blank';
    blank.dataset.fontUrl = '';
    styles.set(blank.id, blank);
    releaseCustomFonts('eIsland-UI');
    expect(styles.has(blank.id)).toBe(false);
    expect(styles.has(existing.id)).toBe(true);
    expect(revoke).not.toHaveBeenCalled();
  });
});
