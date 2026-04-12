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
 * @file WeatherSettingsSection.tsx
 * @description 设置页面 - 天气设置区块
 * @author 鸡哥
 */

import type { ReactElement } from 'react';

/**
 * 渲染天气设置区块
 * @param props - 天气设置区域所需参数
 * @returns 天气设置区域
 */
export function WeatherSettingsSection(props: any): ReactElement {
  const {
    currentWeatherSettingsPageLabel,
    weatherSettingsPage,
    weatherLocationPriorityOptions,
    weatherLocationPriority,
    applyWeatherLocationPriority,
    setWeatherLocationConfigMessage,
    weatherCustomCityInput,
    setWeatherCustomCityInput,
    testWeatherCustomLocation,
    setWeatherCustomLocationTesting,
    setWeatherCustomLocationTestMessage,
    weatherCustomLocationTesting,
    saveWeatherLocationSettings,
    weatherLocationConfigMessage,
    weatherCustomLocationTestMessage,
    weatherProviderOptions,
    weatherPrimaryProvider,
    setWeatherPrimaryProvider,
    saveWeatherProviderConfig,
    weatherSettingsPages,
    weatherSettingsPageLabels,
    setWeatherSettingsPage,
  } = props;

  return (
    <div className="max-expand-settings-section">
      <div className="max-expand-settings-title settings-app-title-line">
        <span>天气配置</span>
        <span className="settings-app-title-sub">- {currentWeatherSettingsPageLabel}</span>
      </div>

      <div className="settings-app-pages-layout settings-weather-pages-layout">
        <div className="settings-app-page-main">
          {weatherSettingsPage === 'location' && (
            <div className="settings-music-section">
              <div className="settings-music-label">定位来源优先级</div>
              <div className="settings-music-hint">选择天气定位优先使用 IP 自动定位或自定义位置</div>
              <div className="settings-lyrics-source-options">
                {weatherLocationPriorityOptions.map((opt: any) => (
                  <button
                    key={opt.value}
                    className={`settings-lyrics-source-btn ${weatherLocationPriority === opt.value ? 'active' : ''}`}
                    type="button"
                    onClick={() => {
                      applyWeatherLocationPriority(opt.value).catch((error: any) => {
                        setWeatherLocationConfigMessage({
                          type: 'error',
                          text: `切换优先级失败：${error instanceof Error ? error.message : '未知错误'}`,
                        });
                      });
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="settings-hotkey-row">
                <label className="settings-field" style={{ flex: 1 }}>
                  <span className="settings-field-label">城市名称</span>
                  <input
                    className="settings-field-input"
                    type="text"
                    placeholder="例如：杭州 / Tokyo / New York"
                    value={weatherCustomCityInput}
                    onChange={(e) => {
                      setWeatherCustomCityInput(e.target.value);
                    }}
                  />
                </label>
              </div>

              <div className="settings-hotkey-row">
                <button
                  className="settings-hotkey-btn"
                  type="button"
                  onClick={() => {
                    testWeatherCustomLocation().catch((error: any) => {
                      setWeatherCustomLocationTesting(false);
                      setWeatherCustomLocationTestMessage({
                        type: 'error',
                        text: `测试失败：${error instanceof Error ? error.message : '未知错误'}`,
                      });
                    });
                  }}
                  disabled={weatherCustomLocationTesting}
                >
                  {weatherCustomLocationTesting ? '测试中...' : '测试自定义位置（双接口）'}
                </button>
                <button
                  className="settings-hotkey-btn"
                  type="button"
                  onClick={() => {
                    saveWeatherLocationSettings().catch((error: any) => {
                      setWeatherLocationConfigMessage({
                        type: 'error',
                        text: `保存失败：${error instanceof Error ? error.message : '未知错误'}`,
                      });
                    });
                  }}
                >
                  保存定位配置
                </button>
              </div>

              {weatherLocationConfigMessage && (
                <div className="settings-music-hint" style={{ color: weatherLocationConfigMessage.type === 'error' ? '#ff7f7f' : '#7be495' }}>
                  {weatherLocationConfigMessage.text}
                </div>
              )}
              {weatherCustomLocationTestMessage && (
                <div className="settings-music-hint" style={{ color: weatherCustomLocationTestMessage.type === 'error' ? '#ff7f7f' : '#7be495' }}>
                  {weatherCustomLocationTestMessage.text}
                </div>
              )}
            </div>
          )}

          {weatherSettingsPage === 'provider' && (
            <div className="settings-music-section">
              <div className="settings-music-label">天气接口优先级</div>
              <div className="settings-music-hint">可选择优先使用 Open-Meteo 或 UAPI，失败时自动切换到另一源</div>
              <div className="settings-lyrics-source-options">
                {weatherProviderOptions.map((opt: any) => (
                  <button
                    key={opt.value}
                    className={`settings-lyrics-source-btn ${weatherPrimaryProvider === opt.value ? 'active' : ''}`}
                    type="button"
                    onClick={() => {
                      setWeatherPrimaryProvider(opt.value);
                      saveWeatherProviderConfig({ primaryProvider: opt.value });
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="settings-app-page-dots" aria-label="天气配置分页">
          {weatherSettingsPages.map((page: any) => (
            <button
              key={page}
              className={`settings-app-page-dot ${weatherSettingsPage === page ? 'active' : ''}`}
              data-label={weatherSettingsPageLabels[page]}
              type="button"
              onClick={() => setWeatherSettingsPage(page)}
              title={weatherSettingsPageLabels[page]}
              aria-label={weatherSettingsPageLabels[page]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
