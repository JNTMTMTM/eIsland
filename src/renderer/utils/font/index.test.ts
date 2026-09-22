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
 * @description 自定义字体按需加载与 Blob 释放回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initFonts, injectFontFace, releaseCustomFonts } from './index';

interface StyleEntry { id: string; dataset: { fontUrl?: string }; textContent: string; remove: () => void; }
const styles = new Map<string, StyleEntry>();
const readFontFile = vi.fn();
const storeRead = vi.fn();
const setProperty = vi.fn();
const createObjectURL = vi.fn();
const revokeObjectURL = vi.fn();

beforeEach(() => {
  styles.clear();
  let serial = 0;
  createObjectURL.mockImplementation(() => `blob:${++serial}`);
  readFontFile.mockResolvedValue({ data: btoa('font bytes'), ext: 'ttf' });
  vi.stubGlobal('window', { api: { storeRead, readFontFile } });
  vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
  vi.stubGlobal('document', {
    documentElement: { style: { setProperty } },
    getElementById: (id: string) => styles.get(id) ?? null,
    querySelectorAll: () => [...styles.values()],
    createElement: () => {
      const style: StyleEntry = { id: '', dataset: {}, textContent: '', remove: () => { styles.delete(style.id); } };
      return style;
    },
    head: { appendChild: (style: StyleEntry) => { styles.set(style.id, style); } },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('font memory lifetime', () => {
  it('loads only the selected fonts out of large imported lists', async () => {
    const fonts = Array.from({ length: 100 }, (value, i) => {
      void value;
      return { name: `Font${i}`, path: `/fonts/${i}.ttf` };
    });
    const values: Record<string, unknown> = {
      'ui-font-family': 'custom:/fonts/3.ttf', 'lyrics-font-family': 'custom:/fonts/9.ttf',
      'ui-custom-fonts': fonts, 'lyrics-custom-fonts': fonts,
    };
    storeRead.mockImplementation((key: string) => Promise.resolve(values[key]));
    await initFonts();
    expect(readFontFile.mock.calls.map(([path]) => String(path)).sort()).toEqual(['/fonts/3.ttf', '/fonts/9.ttf']);
    expect(styles.size).toBe(2);
    expect(setProperty).toHaveBeenCalledWith('--island-ui-font', "'eIsland-UI-Font3', sans-serif");
    expect(setProperty).toHaveBeenCalledWith('--island-lyrics-font', "'eIsland-Lyrics-Font9', sans-serif");
  });

  it('does not read any custom font bytes when presets are selected', async () => {
    storeRead.mockImplementation((key: string) => Promise.resolve(key.endsWith('custom-fonts') ? [{ name: 'Unused', path: '/unused.ttf' }] : 'default'));
    await initFonts();
    expect(readFontFile).not.toHaveBeenCalled();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('releases the previous font in the same group while preserving the other group', () => {
    injectFontFace('eIsland-UI-First', btoa('one'), 'ttf');
    injectFontFace('eIsland-Lyrics-Lyrics', btoa('two'), 'woff2');
    injectFontFace('eIsland-UI-Second', btoa('three'), 'ttf');
    expect(styles.size).toBe(2);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:1');
    expect(revokeObjectURL).not.toHaveBeenCalledWith('blob:2');
    releaseCustomFonts('eIsland-UI');
    expect(styles.size).toBe(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:3');
  });
});
