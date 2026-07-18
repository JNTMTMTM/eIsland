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
 * @file MailHeaderActions.tsx
 * @description 邮箱页标题栏操作按钮（设置、刷新）。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { SvgIcon } from '../../../../../../utils/SvgIcon';
import type { MailHeaderActionsProps } from '../types/mailTypes';

/**
 * 邮箱页标题栏操作区
 * @param props - MailHeaderActionsProps
 * @returns JSX.Element
 */
export function MailHeaderActions({
  loadingInbox,
  onGoSettings,
  onRefresh,
  t,
}: MailHeaderActionsProps): ReactElement {
  return (
    <div
      className="max-expand-settings-title settings-mail-tab-title-line"
    >
      <span>{t('mailTab.title', { defaultValue: '邮箱' })}</span>
      <div className="settings-mail-tab-title-actions">
        <button
          type="button"
          className="settings-mail-tab-icon-btn"
          onClick={onGoSettings}
          title={t('mailTab.goSettings', { defaultValue: '前往邮箱设置' })}
          aria-label={t('mailTab.goSettings', { defaultValue: '前往邮箱设置' })}
        >
          <img src={SvgIcon.SETTING} alt="" className="settings-mail-tab-icon" />
        </button>
        <button
          type="button"
          className={`settings-mail-tab-icon-btn ${loadingInbox ? 'is-loading' : ''}`}
          onClick={onRefresh}
          disabled={loadingInbox}
          title={t('mailTab.actions.refresh', { defaultValue: '刷新收件箱' })}
          aria-label={t('mailTab.actions.refresh', { defaultValue: '刷新收件箱' })}
        >
          <img src={SvgIcon.REVERT} alt="" className="settings-mail-tab-icon" />
        </button>
      </div>
    </div>
  );
}
