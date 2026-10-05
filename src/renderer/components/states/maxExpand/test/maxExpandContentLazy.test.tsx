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
 * @file maxExpandContentLazy.test.tsx
 * @description MaxExpandContentLazy 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { createElement, Suspense, type ReactElement } from 'react';
import { MaxExpandContentLazy as Component } from '../MaxExpandContentLazy';
import { MaxExpandContentShell } from '../MaxExpandContentShell';
import { render, value } from './componentHarness';
describe('MaxExpandContentLazy', () => {
  it.each(['aiChat', 'todo', 'urlFavorites', 'localFileSearch', 'clipboardHistory', 'album', 'mail', 'memo', 'countdown', 'alarm', 'toolbox', 'miniGame', 'stock', 'cli', 'calculator', 'worldClock', 'calendar', 'settings'])('wraps ready %s content in Suspense and retains the loading fallback', (tab) => {
    const tree = render(Component);
    expect(value(tree, MaxExpandContentShell, 'performanceModeEnabled')).toBe(true);
    const renderActiveTab = value(tree, MaxExpandContentShell, 'renderActiveTab') as (tab: string, fallback: ReactElement, ready: boolean) => ReactElement;
    const fallback = createElement('span', {}, 'Loading');
    expect(renderActiveTab(tab, fallback, false)).toBe(fallback);
    const ready = renderActiveTab(tab, fallback, true);
    expect(ready.type).toBe(Suspense);
    expect(ready.props).toMatchObject({ fallback, children: expect.objectContaining({ type: expect.any(Object) as unknown }) as unknown });
    const unknown = renderActiveTab('unknown', fallback, true);
    expect(unknown.props).toMatchObject({ children: null });
  });
});

vi.mock('../MaxExpandContentShell', () => ({ MaxExpandContentShell: () => null }));
