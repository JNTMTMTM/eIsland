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
 * @file useSettingsWeather.ts
 * @description 天气定位、提供商测试和预警配置操作
 * @author 鸡哥
 */

import { useState } from 'react';
import type { useTranslation } from 'react-i18next';
import { request as requestUserAccountApi } from '../../../../../../api/user/userAccountApi.client';
import { resolveDistrictLocationByKeyword } from '../../../../../../api/weather/adcodeApi';
import {
  type WeatherLocationPriority,
  type WeatherProvider,
  DEFAULT_WEATHER_LOCATION_PRIORITY,
  DEFAULT_WEATHER_PRIMARY_PROVIDER,
  loadWeatherLocationConfig,
  saveWeatherLocationConfig,
} from '../../../../../../store/utils/storage';
import { readLocalToken } from '../../../../../../utils/userAccount';
import { WEATHER_ALERT_ENABLED_STORE_KEY } from '../config/settingsTabConfig';
import type { useSettingsNetwork } from './useSettingsNetwork';
import type { useSettingsStore } from './useSettingsStore';

interface SettingsWeatherOptions {
  t: ReturnType<typeof useTranslation>['t'];
  fetchWeatherData: ReturnType<typeof useSettingsStore>['fetchWeatherData'];
  networkTimeoutMs: ReturnType<typeof useSettingsNetwork>['networkTimeoutMs'];
}

/**
 * 天气定位、提供商测试和预警配置操作。
 * @param options - 当前设置上下文
 * @returns 供设置视图组合使用的状态与操作
 */
export function useSettingsWeather(options: SettingsWeatherOptions) {
  const { t, fetchWeatherData, networkTimeoutMs } = options;
  const [weatherPrimaryProvider, setWeatherPrimaryProvider] = useState<WeatherProvider>(DEFAULT_WEATHER_PRIMARY_PROVIDER);
  const [weatherLocationPriority, setWeatherLocationPriority] = useState<WeatherLocationPriority>(DEFAULT_WEATHER_LOCATION_PRIORITY);
  const [weatherCustomCityInput, setWeatherCustomCityInput] = useState<string>('');
  const [weatherAlertEnabled, setWeatherAlertEnabled] = useState<boolean>(true);
  const [weatherLocationConfigMessage, setWeatherLocationConfigMessage] = useState<{ type: 'success' | 'error'; text: string; } | null>(null);
  const [weatherCustomLocationTesting, setWeatherCustomLocationTesting] = useState(false);
  const [weatherCustomLocationTestMessage, setWeatherCustomLocationTestMessage] = useState<{ type: 'success' | 'error'; text: string; } | null>(null);

  const applyWeatherLocationPriority = async (nextPriority: WeatherLocationPriority): Promise<void> => {
    setWeatherLocationPriority(nextPriority);

    const unknownError = t('settings.common.unknownError', { defaultValue: '未知错误' });
    try {
      const city = weatherCustomCityInput.trim();
      const existing = loadWeatherLocationConfig().customLocation;
      let customLocation = existing;

      if (city) {
        const resolved = await resolveDistrictLocationByKeyword(city);
        customLocation = {
          latitude: resolved.latitude,
          longitude: resolved.longitude,
          city: resolved.city,
        };
      }

      saveWeatherLocationConfig({
        priority: nextPriority,
        customLocation: customLocation || null,
      });

      setWeatherLocationConfigMessage({
        type: nextPriority === 'custom' && !customLocation ? 'error' : 'success',
        text: nextPriority === 'custom' && !customLocation
          ? t('settings.weather.messages.customMissingFallback', {
            defaultValue: '已切换为自定义位置优先，但未配置城市，将自动回退到 IP 定位',
          })
          : t('settings.weather.messages.priorityApplied', {
            defaultValue: '定位来源优先级已立即生效',
          }),
      });
      setWeatherCustomLocationTestMessage(null);
      fetchWeatherData(undefined, true).catch(() => { });
    } catch (error) {
      setWeatherLocationConfigMessage({
        type: 'error',
        text: t('settings.weather.messages.switchPriorityFailed', {
          defaultValue: '切换优先级失败：{{error}}',
          error: error instanceof Error ? error.message : unknownError,
        }),
      });
    }
  };

  const saveWeatherLocationSettings = async (): Promise<void> => {
    const city = weatherCustomCityInput.trim();
    const unknownError = t('settings.common.unknownError', { defaultValue: '未知错误' });
    if (weatherLocationPriority === 'custom' && !city) {
      setWeatherLocationConfigMessage({
        type: 'error',
        text: t('settings.weather.messages.customNeedsCity', { defaultValue: '选择“自定义位置优先”时请先输入城市名称' }),
      });
      return;
    }

    try {
      let customLocation: { latitude: number; longitude: number; city: string; } | null = null;
      if (city) {
        const resolved = await resolveDistrictLocationByKeyword(city);
        customLocation = {
          latitude: resolved.latitude,
          longitude: resolved.longitude,
          city: resolved.city,
        };
      }

      saveWeatherLocationConfig({
        priority: weatherLocationPriority,
        customLocation,
      });
      setWeatherLocationConfigMessage({
        type: 'success',
        text: customLocation
          ? t('settings.weather.messages.configSavedWithCity', {
            defaultValue: '天气定位配置已保存（{{city}} {{lat}}, {{lng}}）',
            city: customLocation.city,
            lat: customLocation.latitude.toFixed(4),
            lng: customLocation.longitude.toFixed(4),
          })
          : t('settings.weather.messages.configSaved', { defaultValue: '天气定位配置已保存' }),
      });
      setWeatherCustomLocationTestMessage(null);
      fetchWeatherData(undefined, true).catch(() => { });
    } catch (error) {
      setWeatherLocationConfigMessage({
        type: 'error',
        text: t('settings.weather.messages.cityResolveFailed', {
          defaultValue: '城市解析失败：{{error}}',
          error: error instanceof Error ? error.message : unknownError,
        }),
      });
    }
  };

  const testWeatherCustomLocation = async (): Promise<void> => {
    const city = weatherCustomCityInput.trim();
    const unknownError = t('settings.common.unknownError', { defaultValue: '未知错误' });
    if (!city) {
      setWeatherCustomLocationTestMessage({
        type: 'error',
        text: t('settings.weather.messages.cityRequired', { defaultValue: '请先输入城市名称后再测试' }),
      });
      return;
    }

    setWeatherCustomLocationTesting(true);
    setWeatherCustomLocationTestMessage(null);

    let custom: { latitude: number; longitude: number; city: string; };
    try {
      custom = await resolveDistrictLocationByKeyword(city);
    } catch (error) {
      setWeatherCustomLocationTesting(false);
      setWeatherCustomLocationTestMessage({
        type: 'error',
        text: t('settings.weather.messages.cityResolveFailed', {
          defaultValue: '城市解析失败：{{error}}',
          error: error instanceof Error ? error.message : unknownError,
        }),
      });
      return;
    }

    const openMeteoParams = new URLSearchParams({
      latitude: String(custom.latitude),
      longitude: String(custom.longitude),
      current: 'temperature_2m',
      timezone: 'auto',
    });
    const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?${openMeteoParams.toString()}`;

    const uapiParams = new URLSearchParams({
      forecast: 'true',
      extended: 'true',
      lang: 'zh',
    });
    if (custom.city) uapiParams.set('city', custom.city);
    const uapiUrl = `https://uapis.cn/api/v1/misc/weather?${uapiParams.toString()}`;

    const testProvider = async (name: string, url: string): Promise<string> => {
      const resp = await window.api.netFetch(url, { timeoutMs: networkTimeoutMs });
      if (!resp.ok) {
        throw new Error(`${name} HTTP ${resp.status}`);
      }
      if (resp.body.trimStart().startsWith('<')) {
        throw new Error(t('settings.weather.messages.providerNonJson', { defaultValue: '{{name}} 返回了非 JSON', name }));
      }
      JSON.parse(resp.body);
      return t('settings.weather.messages.providerAvailable', { defaultValue: '{{name}} 可用', name });
    };
    const testQWeatherPro = async (): Promise<string> => {
      const token = readLocalToken();
      const name = 'QWeather Pro';
      if (!token) {
        throw new Error(t('settings.weather.messages.proLoginRequired', { defaultValue: '请先登录 PRO 账号' }));
      }
      const qweatherParams = new URLSearchParams({
        location: `${custom.longitude},${custom.latitude}`,
        lang: 'zh',
        unit: 'm',
      });
      const result = await requestUserAccountApi(`/v1/user/weather/daily-3d?${qweatherParams.toString()}`, {
        method: 'GET',
        auth: token,
        timeoutMs: networkTimeoutMs,
      });
      if (!result.ok) {
        throw new Error(`${name} ${result.code}: ${result.message}`);
      }
      return t('settings.weather.messages.providerAvailable', { defaultValue: '{{name}} 可用', name });
    };

    try {
      const [openMeteoResult, uapiResult, qweatherResult] = await Promise.allSettled([
        testProvider('Open-Meteo', openMeteoUrl),
        testProvider('UAPI', uapiUrl),
        testQWeatherPro(),
      ]);

      const messages: string[] = [];
      let hasFailure = false;

      if (openMeteoResult.status === 'fulfilled') {
        messages.push(openMeteoResult.value);
      } else {
        hasFailure = true;
        messages.push(t('settings.weather.messages.providerUnavailable', {
          defaultValue: '{{name}} 不可用：{{error}}',
          name: 'Open-Meteo',
          error: openMeteoResult.reason instanceof Error ? openMeteoResult.reason.message : unknownError,
        }));
      }

      if (uapiResult.status === 'fulfilled') {
        messages.push(uapiResult.value);
      } else {
        hasFailure = true;
        messages.push(t('settings.weather.messages.providerUnavailable', {
          defaultValue: '{{name}} 不可用：{{error}}',
          name: 'UAPI',
          error: uapiResult.reason instanceof Error ? uapiResult.reason.message : unknownError,
        }));
      }

      if (qweatherResult.status === 'fulfilled') {
        messages.push(qweatherResult.value);
      } else {
        hasFailure = true;
        messages.push(t('settings.weather.messages.providerUnavailable', {
          defaultValue: '{{name}} 不可用：{{error}}',
          name: 'QWeather Pro',
          error: qweatherResult.reason instanceof Error ? qweatherResult.reason.message : unknownError,
        }));
      }

      const separator = t('settings.weather.messages.detailSeparator', { defaultValue: '；' });
      setWeatherCustomLocationTestMessage({
        type: hasFailure ? 'error' : 'success',
        text: t('settings.weather.messages.testResult', {
          defaultValue: '{{city}}（{{lat}}, {{lng}}） - {{details}}',
          city: custom.city,
          lat: custom.latitude.toFixed(4),
          lng: custom.longitude.toFixed(4),
          details: messages.join(separator),
        }),
      });
    } finally {
      setWeatherCustomLocationTesting(false);
    }
  };

  const applyWeatherAlertEnabled = (enabled: boolean): void => {
    setWeatherAlertEnabled(enabled);
    window.api.storeWrite(WEATHER_ALERT_ENABLED_STORE_KEY, enabled).catch(() => { });
  };

  return {
    weatherPrimaryProvider,
    setWeatherPrimaryProvider,
    weatherLocationPriority,
    setWeatherLocationPriority,
    weatherCustomCityInput,
    setWeatherCustomCityInput,
    weatherAlertEnabled,
    setWeatherAlertEnabled,
    weatherLocationConfigMessage,
    setWeatherLocationConfigMessage,
    weatherCustomLocationTesting,
    setWeatherCustomLocationTesting,
    weatherCustomLocationTestMessage,
    setWeatherCustomLocationTestMessage,
    applyWeatherLocationPriority,
    saveWeatherLocationSettings,
    testWeatherCustomLocation,
    applyWeatherAlertEnabled,
  };
}
