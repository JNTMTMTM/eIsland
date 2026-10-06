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
 * @file useSettingsNavigation.test.ts
 * @description 设置导航真实会话角色、翻译映射和会员入口切换回归。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsNavigation } from '../useSettingsNavigation';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from './settingsCoverageHarness';
const session = vi.hoisted(() => ({
  token: vi.fn<() => string | null>(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn()
}));
vi.mock('../../../../../../../utils/userAccount', () => ({
  readLocalToken: session.token,
  subscribeUserAccountSessionChanged: session.subscribe
}));
vi.mock('../../../../../../../i18n', () => ({
  default: {},
  setLanguage: vi.fn()
}));
vi.mock('../../../../../../../store/slices', () => ({
  default: {
    getState: () => ({
      pomodoroRunning: false
    }),
    subscribe: vi.fn()
  }
}));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../test/elementHarness')).hookMocks,
  ...(await import('./settingsCoverageHarness')).lifecycleHooks
}));
const t = vi.fn<(key: string, values?: Record<string, unknown>) => string>((key) => key);
/**
 * 执行真实导航 Hook，保留子页状态和会话 effect。
 * @returns 实际标签、页面及导航动作。
 */
function render() {
  return renderWithHooks(() => useSettingsNavigation({
    t: t as unknown as Parameters<typeof useSettingsNavigation>[0]['t']
  }));
}
beforeEach(() => {
  resetLifecycle();
  vi.resetAllMocks();
  t.mockImplementation((key) => key);
  session.token.mockReturnValue(null);
  session.subscribe.mockReturnValue(session.unsubscribe);
});
afterEach(unmountHooks);
describe('真实页面标签、会话和入口', () => {
  it('公开页面setter接收损坏运行时页名时使用对应标签兜底', () => {
    type State = ReturnType<typeof useSettingsNavigation>;
    const damagedPage = 'unknown-page';
    render().setWeatherSettingsPage(damagedPage as State['weatherSettingsPage']);
    render().setMailSettingsPage(damagedPage as State['mailSettingsPage']);
    render().setMusicSettingsPage(damagedPage as State['musicSettingsPage']);
    render().setAiSettingsPage(damagedPage as State['aiSettingsPage']);
    render().setNetworkSettingsPage(damagedPage as State['networkSettingsPage']);
    render().setUpdateSettingsPage(damagedPage as State['updateSettingsPage']);
    render();
    [['weatherPages', '定位配置'], ['mailPages', '账户'], ['musicPages', '白名单'], ['aiPages', '通用配置'], ['networkPages', '请求超时'], ['updatePages', '检查更新']].forEach(([namespace, defaultValue]) => {
      expect(t).toHaveBeenCalledWith(`settings.${namespace}.unknown-page`, {
        defaultValue
      });
    });
  });
  it('完整标签映射和Overview选项包含实际翻译键', () => {
    const state = render();
    runEffects();
    expect(state.translatedOverviewWidgetOptions.find(({
      value
    }) => value === 'song')?.label).toBe('settings.app.layout.widgetNames.song');
    expect(state.translatedOverviewClockStyleOptions).toHaveLength(3);
    expect(state.translatedSettingsTabLabels.user).toBe('settings.labels.user');
    expect(state.translatedWeatherSettingsPageLabels.provider).toBe('settings.weatherPages.provider');
    expect(state.translatedNetworkSettingsPageLabels['data-center']).toBe('settings.networkPages.data-center');
    expect(state.translatedUpdateSettingsPageLabels['info-sync']).toBe('settings.updatePages.info-sync');
    expect(state.translatedMailSettingsPageLabels.preferences).toBe('settings.mailPages.preferences');
    expect(state.translatedMusicSettingsPageLabels.providers).toBe('settings.musicPages.providers');
    expect(state.currentPluginMarketPageLabel).toBe('settings.pluginMarket.pages.wallpaper');
    expect(state.getSettingsLabel('animation')).toBe('settings.labels.animation');
  });
  it('合法子页切换更新相应标签', () => {
    render().setWeatherSettingsPage('provider');
    render().setMailSettingsPage('imap');
    render().setMusicSettingsPage('providers');
    render().setAiSettingsPage('ollama');
    render().setNetworkSettingsPage('data-center');
    render().setUpdateSettingsPage('info-sync');
    render().setAppSettingsPage('animation');
    render().setPluginMarketPage('contribution');
    const state = render();
    expect(state.currentWeatherSettingsPageLabel).toBe('settings.weatherPages.provider');
    expect(state.currentMailSettingsPageLabel).toBe('settings.mailPages.imap');
    expect(state.currentMusicSettingsPageLabel).toBe('settings.musicPages.providers');
    expect(state.currentAiSettingsPageLabel).toBe('settings.aiPages.ollama');
    expect(state.currentNetworkSettingsPageLabel).toBe('settings.networkPages.data-center');
    expect(state.currentUpdateSettingsPageLabel).toBe('settings.updatePages.info-sync');
    expect(state.currentAppSettingsPageLabel).toBe('settings.labels.animation');
    expect(state.currentPluginMarketPageLabel).toBe('settings.pluginMarket.pages.contribution');
  });
  it.each(['pro', 'user', 'invalid'])('角色%s切换实际会员标记', (role) => {
    session.token.mockReturnValue(role === 'invalid' ? 'bad-token' : `h.${Buffer.from(JSON.stringify({
      role
    })).toString('base64url')}.s`);
    const state = render();
    runEffects();
    expect(state.isProUser).toBe(role === 'pro');
    expect(state.hasLoginSession).toBe(true);
    unmountHooks();
    expect(session.unsubscribe).toHaveBeenCalledOnce();
  });
  it.each([{
    action: 'user-pro',
    page: 'pro'
  }, {
    action: 'user-recharge',
    page: 'recharge'
  }, {
    action: 'user-questionnaire',
    page: 'questionnaire'
  }])('$action真实导航到$page', ({
    action,
    page
  }) => {
    render().handleNavAction(action);
    expect(render().activeTab).toBe('user');
    expect(render().userInitialProfilePage).toBe(page);
  });
  it('未知导航动作保留当前页', () => {
    render().handleNavAction('unknown');
    expect(render().activeTab).toBe('index');
    expect(render().userInitialProfilePage).toBe('info');
  });
});
