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
 * @file theme.test.ts
 * @description 股票主题工具对无浏览器、根节点和正文亮色配置的真实读取测试。
 * @author 鸡哥
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { isLightTheme } from '../theme';
afterEach(() => vi.unstubAllGlobals());
describe('股票真实主题', () => {
  it('无 document 的运行时回退暗色', () => {
    vi.stubGlobal('document', undefined);
    expect(isLightTheme()).toBe(false);
  });
  it.each([
    { root: 'light', body: 'dark', expected: true },
    { root: 'dark', body: 'light', expected: true },
    { root: 'dark', body: 'dark', expected: false },
  ])('根与正文配置：%s', ({ root, body, expected }) => {
    vi.stubGlobal('document', { documentElement: { dataset: { theme: root } }, body: { dataset: { theme: body } } });
    expect(isLightTheme()).toBe(expected);
  });
});
