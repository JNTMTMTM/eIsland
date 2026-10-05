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
 * @file standaloneWindowViewport.test.ts
 * @description StandaloneWindowViewport 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StandaloneWindowViewport } from '../StandaloneWindowViewport';
import { elements, findElement, resetState } from '../../test/elementHarness';
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
vi.mock('../../states/maxExpand/components/todo/components/TodoTab', () => ({ TodoTab: Object.assign(vi.fn(), { displayName: 'TodoTab' }) }));
vi.mock('../../states/maxExpand/components/countdown', () => ({ CountdownTab: Object.assign(vi.fn(), { displayName: 'CountdownTab' }) }));
vi.mock('../../states/maxExpand/components/urlFavorites', () => ({ UrlFavoritesTab: Object.assign(vi.fn(), { displayName: 'UrlFavoritesTab' }) }));
vi.mock('../../states/maxExpand/components/album/components/AlbumTab', () => ({ AlbumTab: Object.assign(vi.fn(), { displayName: 'AlbumTab' }) }));
vi.mock('../../states/maxExpand/components/mail', () => ({ MailTab: Object.assign(vi.fn(), { displayName: 'MailTab' }) }));
vi.mock('../../states/maxExpand/components/localFileSearch/components/LocalFileSearchTab', () => ({ LocalFileSearchTab: Object.assign(vi.fn(), { displayName: 'LocalFileSearchTab' }) }));
vi.mock('../../states/maxExpand/components/clipBoardHistory', () => ({ ClipboardHistoryTab: Object.assign(vi.fn(), { displayName: 'ClipboardHistoryTab' }) }));
vi.mock('../../states/maxExpand/components/SettingsTab', () => ({ SettingsTab: Object.assign(vi.fn(), { displayName: 'SettingsTab' }) }));
vi.mock('../../states/maxExpand/components/memo/components/MemoTab', () => ({ MemoTab: Object.assign(vi.fn(), { displayName: 'MemoTab' }) }));
vi.mock('../../states/maxExpand/components/alarm/components/AlarmTab', () => ({ AlarmTab: Object.assign(vi.fn(), { displayName: 'AlarmTab' }) }));
vi.mock('../../states/maxExpand/components/ToolboxTab', () => ({ ToolboxTab: Object.assign(vi.fn(), { displayName: 'ToolboxTab' }) }));
vi.mock('../../states/login', () => ({ LoginContent: Object.assign(vi.fn(), { displayName: 'LoginContent' }) }));
vi.mock('../../states/register/RegisterContent', () => ({ RegisterContent: Object.assign(vi.fn(), { displayName: 'RegisterContent' }) }));
vi.mock('../../states/resetPassword', () => ({ ResetPasswordContent: Object.assign(vi.fn(), { displayName: 'ResetPasswordContent' }) }));
vi.mock('../../states/payment/PaymentContent', () => ({ PaymentContent: Object.assign(vi.fn(), { displayName: 'PaymentContent' }) }));
vi.mock('../../states/musicProvidersLogin', () => ({ MusicProvidersLoginContent: Object.assign(vi.fn(), { displayName: 'MusicProvidersLoginContent' }) }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('StandaloneWindowViewport', () => {
  it.each([['todo', 'TodoTab'], ['countdown', 'CountdownTab'], ['urlFavorites', 'UrlFavoritesTab'], ['album', 'AlbumTab'], ['mail', 'MailTab'], ['localFileSearch', 'LocalFileSearchTab'], ['clipboardHistory', 'ClipboardHistoryTab'], ['memo', 'MemoTab'], ['alarm', 'AlarmTab'], ['toolbox', 'ToolboxTab']] as const)('routes %s to %s only', (activeTab, expected) => {
    const tree = StandaloneWindowViewport({ activeTab, state: 'idle' });
    const children = elements(tree).filter((node) => typeof node.type === 'function');
    expect(children).toHaveLength(1);
    expect((children[0].type as unknown as {
      displayName: string;
    }).displayName).toBe(expected);
  });
  it.each([['login', 'LoginContent'], ['register', 'RegisterContent'], ['resetPassword', 'ResetPasswordContent'], ['payment', 'PaymentContent'], ['musicProvidersLogin', 'MusicProvidersLoginContent'], ['idle', 'SettingsTab']] as const)('routes settings authentication state %s to %s', (state, expected) => {
    const tree = StandaloneWindowViewport({ state, activeTab: 'settings' });
    const child = findElement(tree, (node) => typeof node.type === 'function');
    expect((child.type as unknown as {
      displayName: string;
    }).displayName).toBe(expected);
  });
});
