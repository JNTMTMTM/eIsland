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
 * @file renderEagerLoadingTab.test.tsx
 * @description eager 加载工具保留传入 fallback 元素的测试。
 * @author 鸡哥
 */

import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderEagerLoadingTab } from '../renderEagerLoadingTab';

describe('renderEagerLoadingTab', () => {
  it.each(['todo', 'calendar', null, undefined])('returns the exact fallback for %s', (tab) => {
    const fallback = createElement('div', {}, 'Loading');
    expect(renderEagerLoadingTab(tab, fallback)).toBe(fallback);
  });
});
