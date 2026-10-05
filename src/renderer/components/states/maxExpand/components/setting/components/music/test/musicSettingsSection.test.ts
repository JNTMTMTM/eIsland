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
 * @file musicSettingsSection.test.ts
 * @description MusicSettingsSection 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MusicSettingsSection } from '../MusicSettingsSection';
import { elementProps, findElement, invoke, resetState, textContent } from '../../../../../../../test/elementHarness';
import type { ComponentProps } from 'react';
const api = vi.hoisted(() => ({ musicWhitelistSet: vi.fn(() => Promise.resolve()), musicLyricsCalibrateDelaySet: vi.fn(() => Promise.resolve()), musicProviderModeSet: vi.fn(() => Promise.resolve()) }));
const store = vi.hoisted(() => ({ setMusicProvidersLogin: vi.fn() }));
/**
 * 构造隔离设置状态和可观察回调的完整配置。
 * @returns 配置状态及可观察回调。
 */
function makeProps(): ComponentProps<typeof MusicSettingsSection> {
  return {
    currentMusicSettingsPageLabel: '',
    musicSettingsPage: 'whitelist',
    whitelist: [],
    setWhitelist: vi.fn(),
    whitelistInputError: '',
    setWhitelistInputError: vi.fn(),
    whitelistDraft: '',
    setWhitelistDraft: vi.fn(),
    handleAddWhitelist: vi.fn(),
    handleDetectSourceAppId: vi.fn(() => Promise.resolve()),
    detectingSourceAppId: false,
    detectedSources: [],
    lyricsSourceOptions: [],
    lyricsSource: '',
    setLyricsSource: vi.fn(),
    lyricsKaraoke: false,
    setLyricsKaraoke: vi.fn(),
    lyricsEnabled: false,
    setLyricsEnabled: vi.fn(),
    lyricsTranslationEnabled: false,
    setLyricsTranslationEnabled: vi.fn(),
    lyricsClock: false,
    setLyricsClock: vi.fn(),
    lyricsCalibrateEnabled: false,
    setLyricsCalibrateEnabled: vi.fn(),
    lyricsCalibrateDelay: 10,
    setLyricsCalibrateDelay: vi.fn(),
    musicSmtcUnsubscribeInput: '',
    setMusicSmtcUnsubscribeInput: vi.fn(),
    musicSmtcNeverUnsubscribe: false,
    setMusicSmtcNeverUnsubscribe: vi.fn(),
    saveMusicSmtcUnsubscribeConfig: vi.fn(() => Promise.resolve()),
    setMusicSmtcConfigMessage: vi.fn(),
    musicSmtcConfigMessage: null,
    musicSettingsPages: [],
    musicSettingsPageLabels: { whitelist: 'Apps', lyrics: 'Lyrics', smtc: 'SMTC', providers: 'Providers' },
    setMusicSettingsPage: vi.fn(),
  };
}
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
vi.mock('../../../../../../../../store/slices', () => ({ default: () => store }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
  vi.stubGlobal('window', { api });
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('MusicSettingsSection', () => {
  it('handles empty whitelist, keyboard add and removal without changing other entries', () => {
    const props = makeProps();
    const empty = MusicSettingsSection(props);
    expect(textContent(empty)).toContain('settings.music.whitelist.empty');
    invoke(findElement(empty, (n) => n.type === 'input'), 'onKeyDown', { key: 'Enter' });
    expect(props.handleAddWhitelist).toHaveBeenCalledOnce();
    resetState();
    const tree = MusicSettingsSection({ ...props, whitelist: ['QQMusic.exe', 'Other.exe'] });
    invoke(findElement(tree, (n) => elementProps(n).className === 'settings-whitelist-remove'), 'onClick');
    expect(props.setWhitelist).toHaveBeenCalledWith(['Other.exe']);
    expect(api.musicWhitelistSet).toHaveBeenCalledWith(['Other.exe']);
  });
  it.each([{ input: '-5', expected: 0 }, { input: '125', expected: 120 }, { input: '3.9', expected: 3 }, { input: 'invalid', expected: 0 }])('clamps lyric delay $input', ({ input, expected }) => {
    const props = { ...makeProps(), musicSettingsPage: 'lyrics' as const, lyricsEnabled: true, lyricsCalibrateEnabled: true };
    const tree = MusicSettingsSection(props);
    invoke(findElement(tree, (n) => n.type === 'input' && elementProps(n).type === 'number'), 'onChange', { target: { value: input } });
    expect(props.setLyricsCalibrateDelay).toHaveBeenCalledWith(expected);
    expect(api.musicLyricsCalibrateDelaySet).toHaveBeenCalledWith(expected);
  });
  it('disables unsubscribe delay and reports failed saving', async () => {
    const props = { ...makeProps(), musicSettingsPage: 'smtc' as const, musicSmtcNeverUnsubscribe: true, saveMusicSmtcUnsubscribeConfig: vi.fn(() => Promise.reject(new Error('offline'))) };
    const tree = MusicSettingsSection(props);
    expect(elementProps(findElement(tree, (n) => n.type === 'input' && n.props.type === 'number')).disabled).toBe(true);
    invoke(findElement(tree, (n) => n.type === 'button' && textContent(n) === 'settings.common.save'), 'onClick');
    await Promise.resolve();
    expect(props.setMusicSmtcConfigMessage).toHaveBeenCalledWith({ type: 'error', text: 'settings.common.saveFailed' });
  });
  it('gates logged-in provider mode and opens login for an unauthenticated provider', () => {
    resetState([false, false, false, 'guest']);
    const tree = MusicSettingsSection({ ...makeProps(), musicSettingsPage: 'providers' });
    const login = findElement(tree, (n) => n.type === 'button' && textContent(n) === 'settings.music.providers.sodaMusic.login');
    expect(elementProps(login).disabled).toBe(false);
    invoke(login, 'onClick');
    expect(store.setMusicProvidersLogin).toHaveBeenCalledWith('qishui');
    expect(elementProps(findElement(tree, (n) => n.type === 'button' && textContent(n) === 'settings.music.providers.mode.logged-in')).disabled).toBe(true);
  });
});
