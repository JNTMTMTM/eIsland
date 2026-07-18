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
 * @file EmptyMailGuide.tsx
 * @description 未配置邮箱时的引导页面。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { MAIL_HELP_URL } from '../config/mailConfig';
import type { EmptyMailGuideProps } from '../types/mailTypes';

/**
 * 未配置邮箱引导页
 * @param props - EmptyMailGuideProps
 * @returns JSX.Element
 */
export function EmptyMailGuide({ onGoSettings, t }: EmptyMailGuideProps): ReactElement {
  return (
    <div className="max-expand-settings-section settings-mail-tab-section">
      <div className="settings-user-auth">
        <div className="settings-user-auth-entry-title">
          {t('mailTab.emptyGuide.title', { defaultValue: '配置邮箱 IMAP 账户后即可在此收取和查看邮件' })}
        </div>
        <div className="settings-user-auth-hint">
          {t('mailTab.emptyGuide.hint', { defaultValue: '需要填写 IMAP 服务器地址、认证用户名和密钥。' })}
        </div>
        <div className="settings-user-auth-entry-actions">
          <button
            type="button"
            className="settings-user-primary-btn"
            onClick={onGoSettings}
          >
            {t('mailTab.emptyGuide.action', { defaultValue: '前往设置' })}
          </button>
          <button
            type="button"
            className="settings-user-secondary-btn"
            onClick={() => window.api.clipboardOpenUrl(MAIL_HELP_URL).catch(() => {})}
          >
            {t('mailTab.emptyGuide.imapHelp', { defaultValue: '如何获取 IMAP 信息' })}
          </button>
        </div>
      </div>
    </div>
  );
}
