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
 * @file MailTab.tsx
 * @description 最大展开模式 - 邮箱功能入口页
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../../store/slices';

/**
 * 邮箱 Tab
 * @description 展示邮箱功能介绍，并引导前往设置完成 IMAP/SMTP 配置
 */
export function MailTab(): ReactElement {
  const { t } = useTranslation();
  const { setMaxExpandTab } = useIslandStore();

  return (
    <div className="max-expand-settings-section">
      <div className="max-expand-settings-title">{t('mailTab.title', { defaultValue: '邮箱' })}</div>
      <div className="settings-cards">
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('mailTab.introTitle', { defaultValue: '客户端直连邮箱（无服务器）' })}</div>
            <div className="settings-card-subtitle">
              {t('mailTab.introDesc', { defaultValue: '收信用 IMAP，发信用 SMTP。请先在设置中填写服务器参数与账号认证信息。' })}
            </div>
          </div>
          <div className="settings-card-subgroup">
            <button
              type="button"
              className="settings-user-primary-btn"
              onClick={() => setMaxExpandTab('settings')}
            >
              {t('mailTab.goSettings', { defaultValue: '前往邮箱设置' })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
