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
 * @file maxExpandLazyImportsRuntime.test.tsx
 * @description 全展开性能模式真实 React 懒加载、全部标签导入及暂缓内容回退测试
 * @author 鸡哥
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import type { MaxExpandTab } from '../../../../store/types';
import type { MaxExpandContentShellProps } from '../MaxExpandContentShell';

let lazyContent: typeof import('../MaxExpandContentLazy');
beforeAll(async () => {
  vi.stubGlobal('Element', class extends EventTarget { matches = () => false; });
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() });
  vi.stubGlobal('window', Object.assign(new EventTarget(), { matchMedia: () => Object.assign(new EventTarget(), { matches: false }), location: { hostname: 'localhost' }, api: { storeRead: () => Promise.resolve(null), onSettingsChanged: () => () => undefined }, electron: { ipcRenderer: { send: vi.fn(), on: vi.fn(), removeListener: vi.fn() } } }));
  lazyContent = await import('../MaxExpandContentLazy');
});
afterAll(() => vi.unstubAllGlobals());
const tabs: MaxExpandTab[] = ['aiChat','todo','urlFavorites','localFileSearch','clipboardHistory','album','mail','settings','countdown','memo','alarm','toolbox','miniGame','stock','cli','calculator','worldClock','calendar'];
it.each(tabs)('loads the real %s module through React Suspense', async (tab) => {
  const shell = lazyContent.MaxExpandContentLazy() as React.ReactElement<MaxExpandContentShellProps>;
  expect(shell.props.performanceModeEnabled).toBe(true);
  const fallback = <span>native-module-loading</span>;
  expect(shell.props.renderActiveTab(tab, fallback, false)).toBe(fallback);
  const actualTree = shell.props.renderActiveTab(tab, fallback, true);
  expect(renderToString(actualTree)).toContain('native-module-loading');
  await vi.dynamicImportSettled();
  expect(renderToString(actualTree)).not.toContain('native-module-loading');
}, 20_000);
