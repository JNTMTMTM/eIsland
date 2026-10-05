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
 * @file settingsTab.test.tsx
 * @description SettingsTab 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, nodes, value, trigger, text } from '../../test/componentHarness';
import { SettingsTab as Component } from '../SettingsTab';
import { IndexSettingsSection } from '../setting/components/index/IndexSettingsSection';
import { AppSettingsSection } from '../setting/components/app/AppSettingsSection';
import { NetworkSettingsSection } from '../setting/components/network/NetworkSettingsSection';
import { MailSettingsSection } from '../setting/components/mail/MailSettingsSection';
import { WeatherSettingsSection } from '../setting/components/weather/WeatherSettingsSection';
import { MusicSettingsSection } from '../setting/components/music/MusicSettingsSection';
import { AiSettingsSection } from '../setting/components/ai/AiSettingsSection';
import { ShortcutSettingsSection } from '../setting/components/shortcut/ShortcutSettingsSection';
import { UserSettingsSection } from '../setting/components/user/UserSettingsSection';
import { AboutSettingsSection } from '../setting/components/about/AboutSettingsSection';
import { UpdateSettingsSection } from '../setting/components/update/UpdateSettingsSection';
import { WallpaperMarketSection } from '../setting/components/pluginMarket/WallpaperMarketSection';

import { SettingsPageNavigation } from '../setting/components/SettingsPageNavigation';
import { WallpaperContributionSection } from '../setting/components/pluginMarket/WallpaperContributionSection';
import { WallpaperEditSection } from '../setting/components/pluginMarket/WallpaperEditSection';
const state = vi.hoisted(() => ({ tab: 'index', hasLoginSession: true, setLogin: vi.fn(), setRegister: vi.fn(), setActiveTab: vi.fn(), setAiConfig: vi.fn(), aiConfig: { workspaces: ['C:/known'] }, handleCheckUpdate: vi.fn() }));
vi.mock('../setting/hooks/useSettingsTabState', () => ({ useSettingsSidebarTabState: () => [state.tab, state.setActiveTab], useUserSessionState: () => ({ sessionToken: '', hasLoginSession: state.hasLoginSession }) }));
vi.mock('../setting/hooks/useUpdateSettingsState', () => ({ default: () => ({ updateStatus: 'idle', handleCheckUpdate: state.handleCheckUpdate }) }));
vi.mock('../setting/hooks/useBackgroundMediaSettingsState', () => ({ default: () => ({}) }));
vi.mock('../../../../../store/slices', () => ({ default: (selector: (store: typeof state) => unknown) => selector(state) }));
vi.mock('../../../../../utils/theme', () => ({ getThemeMode: () => 'system', setThemeMode: vi.fn() }));
vi.mock('../../../../../i18n', () => ({ getLanguage: () => 'zh-CN', setLanguage: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../../../../api/user/userAccountApi.client', () => ({ request: vi.fn() }));
vi.mock('../../../expand/components/OverviewTab', () => ({ OVERVIEW_WIDGET_OPTIONS: [{ value: 'todo' }], OVERVIEW_CLOCK_STYLE_OPTIONS: [{ value: 'classic' }], normalizeOverviewLayoutConfig: (raw: unknown) => raw }));
vi.mock('../setting/components/update/UpdateSettingsSection', () => ({ UpdateSettingsSection: () => null }));
vi.mock('../setting/components/index/IndexSettingsSection', () => ({ IndexSettingsSection: () => null }));
vi.mock('../setting/components/app/AppSettingsSection', () => ({ AppSettingsSection: () => null }));
vi.mock('../setting/components/network/NetworkSettingsSection', () => ({ NetworkSettingsSection: () => null }));
vi.mock('../setting/components/mail/MailSettingsSection', () => ({ MailSettingsSection: () => null }));
vi.mock('../setting/components/weather/WeatherSettingsSection', () => ({ WeatherSettingsSection: () => null }));
vi.mock('../setting/components/shortcut/ShortcutSettingsSection', () => ({ ShortcutSettingsSection: () => null }));
vi.mock('../setting/components/music/MusicSettingsSection', () => ({ MusicSettingsSection: () => null }));
vi.mock('../setting/components/ai/AiSettingsSection', () => ({ AiSettingsSection: () => null }));
vi.mock('../setting/components/user/UserSettingsSection', () => ({ UserSettingsSection: () => null }));
vi.mock('../setting/components/about/AboutSettingsSection', () => ({ AboutSettingsSection: () => null }));
vi.mock('../setting/components/app/preview/OverviewPreview', () => ({ OverviewPreview: () => null }));
vi.mock('../setting/components/pluginMarket/WallpaperMarketSection', () => ({ WallpaperMarketSection: () => null }));
vi.mock('../setting/components/pluginMarket/WallpaperContributionSection', () => ({ WallpaperContributionSection: () => null }));
vi.mock('../setting/components/pluginMarket/WallpaperEditSection', () => ({ WallpaperEditSection: () => null }));
vi.mock('../setting/components/SettingsPageNavigation', () => ({ SettingsPageNavigation: () => null, SettingsPageNavigationToggle: () => null }));

describe('SettingsTab', () => {
  beforeEach(() => { state.hasLoginSession = true; });
  afterEach(() => { vi.unstubAllGlobals(); });
  it.each([['index', IndexSettingsSection], ['app', AppSettingsSection], ['network', NetworkSettingsSection], ['mail', MailSettingsSection], ['weather', WeatherSettingsSection], ['music', MusicSettingsSection], ['ai', AiSettingsSection], ['shortcut', ShortcutSettingsSection], ['user', UserSettingsSection], ['update', UpdateSettingsSection], ['about', AboutSettingsSection], ['pluginMarket', WallpaperMarketSection]])('selects the %s panel and preserves all sidebar routes', (tab, panel) => {
    state.tab = tab;
    const tree = render(Component);
    expect(nodes(tree, panel)).toHaveLength(1);
    expect(nodes(tree, '.max-expand-settings-sidebar-item')).toHaveLength(12);
    expect(nodes(tree, '.active')).toHaveLength(1);
    (value(tree, '.max-expand-settings-sidebar-item', 'onClick', 7) as () => void)();
    expect(state.setActiveTab).toHaveBeenCalledWith('ai');
  });
  it('bounds auto-dim delays and changes application subpages', () => {
    state.tab = 'app';
    const storeWrite = vi.fn().mockResolvedValue(undefined); const settingsPreview = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('window', { api: { storeWrite, settingsPreview }, dispatchEvent: vi.fn() });
    vi.stubGlobal('CustomEvent', class { type: string;

      constructor(type: string) { this.type = type; } });
    const tree = render(Component);
    expect(value(tree, AppSettingsSection, 'appSettingsPage')).toBe('layout-preview');
    trigger(tree, AppSettingsSection, 'setAppSettingsPage', 'theme');
    expect(value(render(Component), AppSettingsSection, 'appSettingsPage')).toBe('theme');
    trigger(tree, AppSettingsSection, 'handleAutoDimDelayChange', 999);
    expect(storeWrite).toHaveBeenCalledWith('island-auto-dim-delay', 120);
    trigger(tree, AppSettingsSection, 'handleAutoDimDelayChange', -5);
    expect(storeWrite).toHaveBeenLastCalledWith('island-auto-dim-delay', 1);
    trigger(tree, AppSettingsSection, 'handleAutoDimEnabledChange', true);
    expect(value(render(Component), AppSettingsSection, 'autoDimEnabled')).toBe(true);
    expect(settingsPreview).toHaveBeenCalledWith('store:island-auto-dim-enabled', true);
  });
  it('handles workspace cancellation, case-insensitive duplication and removal', async () => {
    state.tab = 'ai';
    const pickLocalSearchDirectory = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce('c:/KNOWN')
      .mockResolvedValueOnce('C:/new');
    vi.stubGlobal('window', { api: { pickLocalSearchDirectory } });
    const tree = render(Component);
    await trigger(tree, AiSettingsSection, 'onAddWorkspace'); await trigger(tree, AiSettingsSection, 'onAddWorkspace');
    expect(state.setAiConfig).not.toHaveBeenCalled();
    await trigger(tree, AiSettingsSection, 'onAddWorkspace');
    expect(state.setAiConfig).toHaveBeenCalledWith({ workspaces: ['C:/known', 'C:/new'] });
    trigger(tree, AiSettingsSection, 'onRemoveWorkspace', 0);
    expect(state.setAiConfig).toHaveBeenLastCalledWith({ workspaces: [] });
    const field = value(tree, AiSettingsSection, 'SettingsFieldComponent');
    const onChange = vi.fn(); const fieldTree = render(field, {
      onChange,
      label: 'API',
      value: ''
    });
    trigger(fieldTree, 'input', 'onChange', { target: { value: 'key' } }); expect(onChange).toHaveBeenCalledWith('key');
  });
  it('passes update actions and anonymous account state through their boundaries', () => {
    state.tab = 'update';
    const tree = render(Component);
    expect(value(tree, UpdateSettingsSection, 'updateStatus')).toBe('idle');
    expect(value(tree, UpdateSettingsSection, 'onCheckUpdate')).toBe(state.handleCheckUpdate);
    state.tab = 'user';
    expect(value(render(Component), UserSettingsSection, 'initialProfilePage')).toBe('info');
  });
});

vi.mock('zustand/react/shallow', () => ({ useShallow: (selector: unknown) => selector }));

describe('SettingsTab market branches', () => {
  it('routes unauthenticated users to login and registration', () => {
    state.tab = 'pluginMarket'; state.hasLoginSession = false;
    const tree = render(Component);
    expect(nodes(tree, WallpaperMarketSection)).toHaveLength(0);
    trigger(tree, '.settings-user-primary-btn', 'onClick'); trigger(tree, '.settings-user-secondary-btn', 'onClick');
    expect(state.setLogin).toHaveBeenCalledOnce(); expect(state.setRegister).toHaveBeenCalledOnce();
  });
  it('switches market pages and refreshes the wallpaper section', () => {
    state.tab = 'pluginMarket'; state.hasLoginSession = true;
    const tree = render(Component);
    trigger(tree, '.settings-app-title-refresh-btn', 'onClick');
    expect(nodes(render(Component), WallpaperMarketSection)[0].key).not.toBe(nodes(tree, WallpaperMarketSection)[0].key);
    trigger(tree, SettingsPageNavigation, 'onSelectPage', 'contribution');
    expect(nodes(render(Component), WallpaperContributionSection)).toHaveLength(1);
    trigger(render(Component), SettingsPageNavigation, 'onSelectPage', 'edit');
    expect(nodes(render(Component), WallpaperEditSection)).toHaveLength(1);
    trigger(render(Component), WallpaperEditSection, 'onGoWallpaper');
    expect(nodes(render(Component), WallpaperMarketSection)).toHaveLength(1);
    trigger(render(Component), SettingsPageNavigation, 'onSelectPage', 'apps');
    expect(text(render(Component))).toContain('settings.pluginMarket.apps.comingSoon');
  });
});
