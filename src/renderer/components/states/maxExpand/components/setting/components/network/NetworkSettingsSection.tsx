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
 * @file NetworkSettingsSection.tsx
 * @description 设置页面 - 网络配置区块
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { StaticAssetNode } from '../../../../../../../store/utils/storage';
import { SvgIcon } from '../../../../../../../utils/SvgIcon';

interface NetworkSettingsSectionProps {
  isProUser: boolean;
  networkTimeoutMs: number;
  customTimeoutInput: string;
  staticAssetNode: StaticAssetNode;
  networkTimeoutOptions: Array<{ label: string; value: number }>;
  staticAssetNodeOptions: Array<{ label: string; value: StaticAssetNode; proOnly?: boolean }>;
  setNetworkTimeoutMs: (v: number) => void;
  setCustomTimeoutInput: (v: string) => void;
  setStaticAssetNode: (v: StaticAssetNode) => void;
  saveNetworkConfig: (config: { timeoutMs: number; staticAssetNode?: StaticAssetNode }) => void;
}

/**
 * 渲染网络设置区块
 * @param props - 网络配置参数
 * @returns 网络设置区域
 */
export function NetworkSettingsSection({
  isProUser,
  networkTimeoutMs,
  customTimeoutInput,
  staticAssetNode,
  networkTimeoutOptions,
  staticAssetNodeOptions,
  setNetworkTimeoutMs,
  setCustomTimeoutInput,
  setStaticAssetNode,
  saveNetworkConfig,
}: NetworkSettingsSectionProps): ReactElement {
  const { t } = useTranslation();
  const timeoutOptionKeyMap: Record<number, string> = {
    5000: 'settings.network.timeout.options.ms5000',
    10000: 'settings.network.timeout.options.ms10000',
    15000: 'settings.network.timeout.options.ms15000',
    20000: 'settings.network.timeout.options.ms20000',
    30000: 'settings.network.timeout.options.ms30000',
  };

  const isCustomTimeout = networkTimeoutOptions.every((o) => o.value !== networkTimeoutMs);

  return (
    <div className="max-expand-settings-section">
      <div className="max-expand-settings-title">{t('settings.labels.network', { defaultValue: '网络配置' })}</div>
      <div className="settings-cards">

        {/* 卡片：请求超时 */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.network.timeout.title', { defaultValue: '请求超时时间' })}</div>
            <div className="settings-card-subtitle">{t('settings.network.timeout.hint', { defaultValue: '设置网络请求的最长等待时间，网络较差时可适当增大' })}</div>
          </div>

          <div className="settings-card-subgroup">
            <div className="settings-card-subgroup-title">{t('settings.network.timeout.presetTitle', { defaultValue: '常用预设' })}</div>
            <div className="settings-lyrics-source-options">
              {networkTimeoutOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={`settings-lyrics-source-btn ${networkTimeoutMs === opt.value ? 'active' : ''}`}
                  type="button"
                  onClick={() => {
                    setNetworkTimeoutMs(opt.value);
                    setCustomTimeoutInput(String(opt.value / 1000));
                    saveNetworkConfig({ timeoutMs: opt.value, staticAssetNode });
                  }}
                >
                  {t(timeoutOptionKeyMap[opt.value] || '', { defaultValue: opt.label })}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-card-subgroup">
            <div className="settings-card-subgroup-title">{t('settings.network.timeout.customTitle', { defaultValue: '自定义秒数' })}</div>
            <div className="settings-music-hint">{t('settings.network.timeout.customHint', { defaultValue: '输入 1 - 120 之间的秒数，回车或失去焦点后应用。' })}</div>
            <div className={`settings-network-custom${isCustomTimeout ? ' active' : ''}`}>
              <input
                className="settings-network-custom-input"
                type="number"
                min="1"
                max="120"
                value={customTimeoutInput}
                onChange={(e) => setCustomTimeoutInput(e.target.value)}
                onBlur={() => {
                  const sec = parseFloat(customTimeoutInput);
                  if (!isNaN(sec) && sec >= 1) {
                    const ms = Math.round(sec * 1000);
                    setNetworkTimeoutMs(ms);
                    saveNetworkConfig({ timeoutMs: ms, staticAssetNode });
                  } else {
                    setCustomTimeoutInput(String(networkTimeoutMs / 1000));
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                }}
              />
              <span className="settings-network-custom-unit">{t('settings.network.timeout.unitSecond', { defaultValue: '秒' })}</span>
            </div>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.network.staticAssetNode.title', { defaultValue: '静态资源节点' })}</div>
            <div className="settings-card-subtitle">{t('settings.network.staticAssetNode.hint', { defaultValue: '所有用户默认使用 R2，PRO 用户可选择 R2/COS/OSS。' })}</div>
          </div>
          <div className="settings-card-subgroup">
            <div className="settings-lyrics-source-options">
              {staticAssetNodeOptions.map((opt) => {
                const disabled = Boolean(opt.proOnly && !isProUser);
                return (
                  <button
                    key={opt.value}
                    className={`settings-lyrics-source-btn ${staticAssetNode === opt.value ? 'active' : ''}`}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (disabled) return;
                      setStaticAssetNode(opt.value);
                      saveNetworkConfig({ timeoutMs: networkTimeoutMs, staticAssetNode: opt.value });
                    }}
                  >
                    {opt.proOnly && (
                      <span
                        className="settings-weather-provider-pro-badge"
                        title={t('settings.network.staticAssetNode.proOnlyHint', { defaultValue: '当前账户不可用' })}
                      >
                        <img
                          src={SvgIcon.PRO}
                          alt="PRO"
                          width={14}
                          height={14}
                        />
                      </span>
                    )}
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {!isProUser && (
              <div className="settings-music-hint">{t('settings.network.staticAssetNode.proHint', { defaultValue: '升级 PRO 可切换 COS/OSS 节点（也可继续使用 R2）。' })}</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
