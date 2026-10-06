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
 * @file useSettingsTabController.ts
 * @description 组合各设置领域并保留原有配置读取和订阅顺序
 * @author 鸡哥
 */

import { useTranslation } from 'react-i18next';
import { useSettingsAppearance } from './useSettingsAppearance';
import { useSettingsAppearanceEffects } from './useSettingsAppearanceEffects';
import { useSettingsBehavior } from './useSettingsBehavior';
import { useSettingsBehaviorEffects } from './useSettingsBehaviorEffects';
import { useSettingsConfigurationEffects } from './useSettingsConfigurationEffects';
import { useSettingsInitialEffects } from './useSettingsInitialEffects';
import { useSettingsMail } from './useSettingsMail';
import { useSettingsMusic } from './useSettingsMusic';
import { useSettingsNavigation } from './useSettingsNavigation';
import { useSettingsNetwork } from './useSettingsNetwork';
import { useSettingsPageEffects } from './useSettingsPageEffects';
import { useSettingsShortcuts } from './useSettingsShortcuts';
import { useSettingsStore } from './useSettingsStore';
import { useSettingsSyncEffects } from './useSettingsSyncEffects';
import { useSettingsWeather } from './useSettingsWeather';
import useUpdateSettingsState from './useUpdateSettingsState';

/**
 * 组合领域状态和同步操作，使设置视图只负责布局。
 * @returns 设置面板的渲染上下文
 */
export function useSettingsTabController() {
  const { t } = useTranslation();
  const store = useSettingsStore();
  const navigation = useSettingsNavigation({ t });
  const appearance = useSettingsAppearance({ t, setNotification: store.setNotification });
  const music = useSettingsMusic({ t });
  const behavior = useSettingsBehavior();
  const network = useSettingsNetwork();
  const mail = useSettingsMail();
  const weather = useSettingsWeather({ t, fetchWeatherData: store.fetchWeatherData, networkTimeoutMs: network.networkTimeoutMs });
  const shortcuts = useSettingsShortcuts({ t });
  const state = {
    t,
    ...store,
    ...navigation,
    ...appearance,
    ...music,
    ...behavior,
    ...network,
    ...mail,
    ...weather,
    ...shortcuts,
  };

  useSettingsPageEffects(state);
  const update = useUpdateSettingsState({ t, isProUser: navigation.isProUser, sessionToken: navigation.sessionToken });
  const settings = { ...state, ...update };
  useSettingsInitialEffects(settings);
  useSettingsAppearanceEffects(settings);
  useSettingsSyncEffects(settings);
  useSettingsConfigurationEffects(settings);
  useSettingsBehaviorEffects(settings);

  return settings;
}
