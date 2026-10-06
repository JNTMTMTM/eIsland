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
 * @file weatherSettingsSection.test.ts
 * @description WeatherSettingsSection 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WeatherSettingsSection } from '../WeatherSettingsSection';
import { elementProps, findElement, invoke, resetState, textContent } from '../../../../../../../test/elementHarness';
import type { ComponentProps } from 'react';
/**
 * 构造隔离设置状态和可观察回调的完整配置。
 * @returns 配置状态及可观察回调。
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
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('WeatherSettingsSection', () => {
  it('switches location priority, edits city and reports rejected testing and saving', async () => {
    const props = makeProps();
    props.testWeatherCustomLocation = vi.fn(() => Promise.reject(new Error('offline')));
    props.saveWeatherLocationSettings = vi.fn(() => Promise.reject(new Error('save')));
    const tree = WeatherSettingsSection(props);
    invoke(findElement(tree, (n) => n.type === 'button' && textContent(n) === 'settings.weather.options.locationPriority.custom'), 'onClick');
    expect(props.applyWeatherLocationPriority).toHaveBeenCalledWith('custom');
    invoke(findElement(tree, (n) => n.type === 'input'), 'onChange', { target: { value: 'Tokyo' } });
    expect(props.setWeatherCustomCityInput).toHaveBeenCalledWith('Tokyo');
    invoke(findElement(tree, (n) => textContent(n) === 'settings.weather.testCustomLocation' && n.type === 'button'), 'onClick');
    invoke(findElement(tree, (n) => textContent(n) === 'settings.weather.saveLocation' && n.type === 'button'), 'onClick');
    await Promise.resolve();
    expect(props.setWeatherCustomLocationTesting).toHaveBeenCalledWith(false);
    expect(props.setWeatherCustomLocationTestMessage).toHaveBeenCalledWith({ type: 'error', text: 'settings.weather.messages.testFailed' });
    expect(props.setWeatherLocationConfigMessage).toHaveBeenCalledWith({ type: 'error', text: 'settings.common.saveFailed' });
  });
  it.each([false, true])('gates Pro provider and alerts for Pro=%s', (isProUser) => {
    const props = { ...makeProps(), weatherSettingsPage: 'provider' as const };
    props.isProUser = isProUser;
    const tree = WeatherSettingsSection(props);
    const provider = findElement(tree, (n) => n.type === 'button' && textContent(n).includes('settings.weather.options.providerPriority.qweatherPro'));
    expect(elementProps(provider).disabled).toBe(!isProUser);
    invoke(provider, 'onClick');
    expect(props.setWeatherPrimaryProvider).toHaveBeenCalledTimes(isProUser ? 1 : 0);
    const alert = findElement(tree, (n) => n.type === 'input' && elementProps(n).type === 'checkbox');
    invoke(alert, 'onChange', { target: { checked: true } });
    expect(props.setWeatherAlertEnabled).toHaveBeenCalledTimes(isProUser ? 1 : 0);
  });
  it('shows testing disabled state and both error and success messages', () => {
    const tree = WeatherSettingsSection({ ...makeProps(), weatherCustomLocationTesting: true, weatherLocationConfigMessage: { type: 'error', text: 'failure' }, weatherCustomLocationTestMessage: { type: 'success', text: 'success' } });
    expect(textContent(tree)).toContain('failure');
    expect(textContent(tree)).toContain('success');
    expect(elementProps(findElement(tree, (n) => n.type === 'button' && textContent(n) === 'settings.weather.testing')).disabled).toBe(true);
  });
});
