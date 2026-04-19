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
 * @file LanguageSettingsPage.tsx
 * @description 设置页面 - 软件设置语言切换子界面
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppSettingsSectionProps } from './types';

type LanguageSettingsPageProps = Pick<AppSettingsSectionProps, 'appLanguage' | 'applyAppLanguage'>;

/**
 * 渲染软件显示语言设置页面
 * @param appLanguage - 当前应用语言
 * @param applyAppLanguage - 应用语言的方法
 * @returns 语言设置页面
 */
export function LanguageSettingsPage({ appLanguage, applyAppLanguage }: LanguageSettingsPageProps): ReactElement {
  const { t } = useTranslation();

  return (
    <div className="max-expand-settings-section">
      <div className="settings-cards">
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.language.title', { defaultValue: '显示语言' })}</div>
            <div className="settings-card-subtitle">{t('settings.language.hint', { defaultValue: '切换后将立即应用到支持多语言的界面文案' })}</div>
          </div>
          <div className="settings-lyrics-source-options">
            {([
              { value: 'zh-CN', label: t('settings.language.options.zh-CN', { defaultValue: '简体中文' }) },
              { value: 'en-US', label: t('settings.language.options.en-US', { defaultValue: 'English' }) },
            ] as Array<{ value: 'zh-CN' | 'en-US'; label: string }>).map((opt) => (
              <button
                key={opt.value}
                className={`settings-lyrics-source-btn ${appLanguage === opt.value ? 'active' : ''}`}
                type="button"
                onClick={() => applyAppLanguage(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="settings-music-hint">
            {appLanguage === 'zh-CN'
              ? t('settings.language.current.zh-CN', { defaultValue: '当前语言：简体中文' })
              : t('settings.language.current.en-US', { defaultValue: 'Current language: English' })}
          </div>
        </div>
      </div>
    </div>
  );
}
