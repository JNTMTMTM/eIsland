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
import { render, nodes, value, trigger, text } from '../../../../test/componentHarness';
import { SettingsTab as Component } from '../SettingsTab';
import { IndexSettingsSection } from '../index/IndexSettingsSection';
import { AppSettingsSection } from '../app/AppSettingsSection';
import { NetworkSettingsSection } from '../network/NetworkSettingsSection';
import { MailSettingsSection } from '../mail/MailSettingsSection';
import { WeatherSettingsSection } from '../weather/WeatherSettingsSection';
import { MusicSettingsSection } from '../music/MusicSettingsSection';
import { AiSettingsSection } from '../ai/AiSettingsSection';
import { ShortcutSettingsSection } from '../shortcut/ShortcutSettingsSection';
import { UserSettingsSection } from '../user/UserSettingsSection';
import { AboutSettingsSection } from '../about/AboutSettingsSection';
import { UpdateSettingsSection } from '../update/UpdateSettingsSection';
import { WallpaperMarketSection } from '../pluginMarket/WallpaperMarketSection';

import { SettingsPageNavigation, SettingsPageNavigationToggle } from '../SettingsPageNavigation';
import { WallpaperContributionSection } from '../pluginMarket/WallpaperContributionSection';
import { WallpaperEditSection } from '../pluginMarket/WallpaperEditSection';
const state = vi.hoisted(() => ({ tab: 'index', hasLoginSession: true, setLogin: vi.fn(), setRegister: vi.fn(), setActiveTab: vi.fn(), setAiConfig: vi.fn(), aiConfig: { workspaces: ['C:/known'] }, handleCheckUpdate: vi.fn() }));
vi.mock('../../hooks/useSettingsTabState', () => ({ useSettingsSidebarTabState: () => [state.tab, state.setActiveTab], useUserSessionState: () => ({ sessionToken: '', hasLoginSession: state.hasLoginSession }) }));
vi.mock('../../hooks/useUpdateSettingsState', () => ({ default: () => ({ updateStatus: 'idle', handleCheckUpdate: state.handleCheckUpdate }) }));
vi.mock('../../hooks/useBackgroundMediaSettingsState', () => ({ default: () => ({}) }));
vi.mock('../../../../../../../store/slices', () => ({ default: (selector: (store: typeof state) => unknown) => selector(state) }));
vi.mock('../../../../../../../utils/theme', () => ({ getThemeMode: () => 'system', setThemeMode: vi.fn() }));
vi.mock('../../../../../../../i18n', () => ({ getLanguage: () => 'zh-CN', setLanguage: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../../../../../../api/user/userAccountApi.client', () => ({ request: vi.fn() }));
vi.mock('../../../../../expand/components/OverviewTab', () => ({ OVERVIEW_WIDGET_OPTIONS: [{ value: 'todo' }], OVERVIEW_CLOCK_STYLE_OPTIONS: [{ value: 'classic' }], normalizeOverviewLayoutConfig: (raw: unknown) => raw }));
vi.mock('../update/UpdateSettingsSection', () => ({ UpdateSettingsSection: () => null }));
vi.mock('../index/IndexSettingsSection', () => ({ IndexSettingsSection: () => null }));
vi.mock('../app/AppSettingsSection', () => ({ AppSettingsSection: () => null }));
vi.mock('../network/NetworkSettingsSection', () => ({ NetworkSettingsSection: () => null }));
vi.mock('../mail/MailSettingsSection', () => ({ MailSettingsSection: () => null }));
vi.mock('../weather/WeatherSettingsSection', () => ({ WeatherSettingsSection: () => null }));
vi.mock('../shortcut/ShortcutSettingsSection', () => ({ ShortcutSettingsSection: () => null }));
vi.mock('../music/MusicSettingsSection', () => ({ MusicSettingsSection: () => null }));
vi.mock('../ai/AiSettingsSection', () => ({ AiSettingsSection: () => null }));
vi.mock('../user/UserSettingsSection', () => ({ UserSettingsSection: () => null }));
vi.mock('../about/AboutSettingsSection', () => ({ AboutSettingsSection: () => null }));
vi.mock('../app/preview/OverviewPreview', () => ({ OverviewPreview: () => null }));
vi.mock('../pluginMarket/WallpaperMarketSection', () => ({ WallpaperMarketSection: () => null }));
vi.mock('../pluginMarket/WallpaperContributionSection', () => ({ WallpaperContributionSection: () => null }));
vi.mock('../pluginMarket/WallpaperEditSection', () => ({ WallpaperEditSection: () => null }));
vi.mock('../SettingsPageNavigation', () => ({ SettingsPageNavigation: () => null, SettingsPageNavigationToggle: () => null }));

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

describe('SettingsTab 实际侧栏与市场视图剩余回调', () => {
  it('全部侧栏按钮转交自己的目标分类', () => {
    state.tab = 'index';
    const tree = render(Component);
    const routes = ['index', 'app', 'pluginMarket', 'network', 'mail', 'weather', 'music', 'ai', 'shortcut', 'user', 'update', 'about'];
    nodes(tree, '.max-expand-settings-sidebar-item').forEach((node, index) => {
      const callback = node.props.onClick as () => void; callback();
      expect(state.setActiveTab).toHaveBeenLastCalledWith(routes[index]);
    });
  });
  it('市场搜索、详情与导航展开真实 updater 控制按钮高亮和禁用', () => {
    state.tab = 'pluginMarket'; state.hasLoginSession = true;
    let tree = render(Component);
    const titleButtons = nodes(tree, '.settings-app-title-refresh-btn');
    expect(titleButtons).toHaveLength(2);
    const toggleSearch = value(tree, '.settings-app-title-refresh-btn', 'onClick', 1) as () => void; toggleSearch();
    tree = render(Component); expect(value(tree, WallpaperMarketSection, 'searchExpanded')).toBe(true);
    expect(nodes(tree, '.settings-app-title-refresh-btn')[1].props.className).toContain('active');
    trigger(tree, SettingsPageNavigationToggle, 'onToggle');
    tree = render(Component); expect(value(tree, SettingsPageNavigationToggle, 'label')).toContain('settings.navigation.collapse');
    trigger(tree, WallpaperMarketSection, 'onDetailOpenChange', true);
    tree = render(Component); expect(nodes(tree, '.settings-app-title-refresh-btn').every((node) => node.props.disabled === true)).toBe(true);
    trigger(tree, SettingsPageNavigationToggle, 'onToggle');
    tree = render(Component); expect(nodes(tree, '.settings-app-title-refresh-btn').every((node) => node.props.disabled === false)).toBe(true);
    trigger(tree, WallpaperMarketSection, 'onDetailOpenChange', false);
    expect(value(render(Component), SettingsPageNavigationToggle, 'expanded')).toBe(false);
  });
});
