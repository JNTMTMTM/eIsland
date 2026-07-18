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
 * @file MailAccountTabs.tsx
 * @description 多账户切换标签栏。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import type { MailAccountTabsProps } from '../types/mailTypes';

/**
 * 邮箱账户切换标签栏（仅多账户时显示）
 * @param props - MailAccountTabsProps
 * @returns JSX.Element | null
 */
export function MailAccountTabs({
  accounts,
  activeAccount,
  collapsed,
  onSwitchAccount,
  t,
}: MailAccountTabsProps): ReactElement | null {
  if (accounts.length <= 1) {
    return null;
  }

  return (
    <div className={`settings-mail-tab-account-tabs ${collapsed ? 'is-collapsed' : ''}`}>
      {accounts.map((account) => (
        <button
          key={account.id}
          type="button"
          className={`settings-mail-tab-account-tab ${account.id === activeAccount?.id ? 'active' : ''}`}
          onClick={() => onSwitchAccount(account)}
          title={account.label || account.emailAddress}
        >
          {account.label || account.emailAddress || t('mailTab.accounts.unnamed', { defaultValue: '未命名' })}
        </button>
      ))}
    </div>
  );
}
