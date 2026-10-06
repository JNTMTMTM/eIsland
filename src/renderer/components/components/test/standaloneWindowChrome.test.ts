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
 * @file standaloneWindowChrome.test.ts
 * @description StandaloneWindowChrome 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StandaloneWindowChrome } from '../StandaloneWindowChrome';
import { elementProps, elements, findElement, invoke, resetState } from '../../test/elementHarness';
const api = vi.hoisted(() => ({ windowMinimize: vi.fn(), windowMaximize: vi.fn(), windowClose: vi.fn() }));
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
  vi.stubGlobal('window', { api });
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('StandaloneWindowChrome', () => {
  it.each([false, true])('renders control style mac=%s and routes all window actions', (mac) => {
    const switchTab = vi.fn();
    const tree = StandaloneWindowChrome({ switchTab, windowIcon: 'icon.svg', tabList: [{ key: 'todo', labelKey: 'todo' }, { key: 'memo', labelKey: 'memo' }], activeTab: 'todo', standaloneMacControls: mac, t: (key) => key });
    const tabs = elements(tree).filter((node) => node.type === 'button' && String(elementProps(node).className).startsWith('cw-tab'));
    expect(elementProps(tabs[0]).className).toContain('cw-tab--active');
    expect(elementProps(tabs[1]).className).not.toContain('cw-tab--active');
    invoke(tabs[1], 'onClick');
    expect(switchTab).toHaveBeenCalledWith('memo');
    ['minimize', 'maximize', 'close'].forEach((action) => invoke(findElement(tree, (node) => elementProps(node).title === `standalone.controls.${action}`), 'onClick'));
    expect(api.windowMinimize).toHaveBeenCalledOnce();
    expect(api.windowMaximize).toHaveBeenCalledOnce();
    expect(api.windowClose).toHaveBeenCalledOnce();
    expect(elements(tree).filter((node) => node.type === 'svg')).toHaveLength(mac ? 0 : 3);
  });
  it('supports an empty tab list without fabricating tab controls', () => {
    const tree = StandaloneWindowChrome({ windowIcon: '', tabList: [], activeTab: 'todo', switchTab: vi.fn(), standaloneMacControls: false, t: (key) => key });
    expect(elements(tree).filter((node) => node.type === 'button')).toHaveLength(3);
  });
});
