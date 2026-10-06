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
 * @file weatherSettingsInteractions.test.ts
 * @description 天气设置真实异常反馈、提供商与导航交互回归。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WeatherSettingsSection } from '../WeatherSettingsSection';
import { elementProps, findElement, invoke, textContent } from '../../../../../../../test/elementHarness';
import { renderWithHooks, resetLifecycle } from '../../app/components/test/themeHookHarness';
import type { ComponentProps } from 'react';
vi.mock('react', async (original) => ({ ...(await original<typeof import('react')>()), ...(await import('../../../../../../../test/elementHarness')).hookMocks, ...(await import('../../app/components/test/themeHookHarness')).lifecycleHooks }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
/**
 * 创建符合组件公开契约的独立输入。
 * @returns 完整设置状态与可观察回调。
 */
function makeProps(): ComponentProps<typeof WeatherSettingsSection> {
  return {
    currentWeatherSettingsPageLabel: '',
    weatherSettingsPage: 'location',
    weatherLocationPriorityOptions: [{ value: 'ip', label: 'IP' }, { value: 'custom', label: 'Custom' }],
    weatherLocationPriority: 'ip',
    applyWeatherLocationPriority: vi.fn(() => Promise.resolve()),
    setWeatherLocationConfigMessage: vi.fn(),
    weatherCustomCityInput: '',
    setWeatherCustomCityInput: vi.fn(),
    testWeatherCustomLocation: vi.fn(() => Promise.resolve()),
    setWeatherCustomLocationTesting: vi.fn(),
    setWeatherCustomLocationTestMessage: vi.fn(),
    weatherCustomLocationTesting: false,
    saveWeatherLocationSettings: vi.fn(() => Promise.resolve()),
    weatherLocationConfigMessage: null,
    weatherCustomLocationTestMessage: null,
    weatherProviderOptions: [{ value: 'open-meteo', label: 'Open' }, { value: 'qweather-pro', label: 'Pro' }],
    weatherPrimaryProvider: 'open-meteo',
    isProUser: false,
    setWeatherPrimaryProvider: vi.fn(),
    saveWeatherProviderConfig: vi.fn(),
    weatherAlertEnabled: false,
    setWeatherAlertEnabled: vi.fn(),
    weatherSettingsPages: [],
    weatherSettingsPageLabels: { location: 'Location', provider: 'Provider' },
    setWeatherSettingsPage: vi.fn(),
  };
}

beforeEach(() => { resetLifecycle(); vi.clearAllMocks(); });
/**
 * 执行真实天气配置并保留导航生命周期。
 * @param props - 公开天气输入。
 * @returns 实际元素树。
 */
function render(props: ComponentProps<typeof WeatherSettingsSection>) { return renderWithHooks(() => WeatherSettingsSection(props)); }
describe('实际天气错误与操作', () => {
  it.each([new Error('offline'), 'damaged-service-error'])('切换、测试和保存拒绝%o时捕获并给出实际反馈', async (error) => {
    const props = makeProps(); props.applyWeatherLocationPriority = vi.fn().mockRejectedValue(error); props.testWeatherCustomLocation = vi.fn().mockRejectedValue(error); props.saveWeatherLocationSettings = vi.fn().mockRejectedValue(error);
    const tree = render(props); invoke(findElement(tree, (node) => node.type === 'button' && textContent(node) === 'settings.weather.options.locationPriority.custom'), 'onClick');
    invoke(findElement(tree, (node) => node.type === 'button' && textContent(node) === 'settings.weather.testCustomLocation'), 'onClick');
    invoke(findElement(tree, (node) => node.type === 'button' && textContent(node) === 'settings.weather.saveLocation'), 'onClick');
    await Promise.resolve(); await Promise.resolve();
    expect(props.setWeatherLocationConfigMessage).toHaveBeenNthCalledWith(1, { type: 'error', text: 'settings.weather.messages.switchPriorityFailed' });
    expect(props.setWeatherLocationConfigMessage).toHaveBeenNthCalledWith(2, { type: 'error', text: 'settings.common.saveFailed' });
    expect(props.setWeatherCustomLocationTesting).toHaveBeenCalledWith(false);
    expect(props.setWeatherCustomLocationTestMessage).toHaveBeenCalledWith({ type: 'error', text: 'settings.weather.messages.testFailed' });
  });
  it.each(['success', 'error'] as const)('两项提示状态%s显示匹配颜色', (status) => {
    const props = makeProps(); props.weatherLocationConfigMessage = { type: status, text: 'Saved result' }; props.weatherCustomLocationTestMessage = { type: status, text: 'Test result' };
    const tree = render(props); ['Saved result', 'Test result'].forEach((text) => expect(elementProps(findElement(tree, (node) => node.type === 'div' && textContent(node) === text)).style).toEqual({ color: status === 'error' ? '#ff7f7f' : '#7be495' }));
  });
  it('导航实际函数式切换并保留页面选择契约', () => {
    const props = makeProps(); invoke(findElement(render(props), (node) => typeof elementProps(node).onToggle === 'function'), 'onToggle');
    let toggle = findElement(render(props), (node) => typeof elementProps(node).onToggle === 'function'); expect(elementProps(toggle).label).toBe('settings.navigation.collapse');
    invoke(toggle, 'onToggle'); toggle = findElement(render(props), (node) => typeof elementProps(node).onToggle === 'function'); expect(elementProps(toggle).expanded).toBe(false);
  });
});
