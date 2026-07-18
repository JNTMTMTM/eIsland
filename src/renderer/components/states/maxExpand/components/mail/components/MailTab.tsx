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
 * @description 最大展开模式 - 邮箱功能入口页（组合层）。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useMail } from '../hooks/useMail';
import { EmptyMailGuide } from './EmptyMailGuide';
import { MailAccountTabs } from './MailAccountTabs';
import { MailHeaderActions } from './MailHeaderActions';
import { MailInboxList } from './MailInboxList';
import { MailReader } from './MailReader';

/**
 * 最大展开模式 — 邮件 Tab 组件，展示收件箱列表并支持多账户切换。
 * @returns JSX.Element
 */
export function MailTab(): ReactElement {
  const {
    inbox,
    loadingInbox,
    expandedUid,
    mailConfigured,
    configuredAccounts,
    activeAccount,
    selectedItem,
    hasSplit,
    goMailSettings,
    refreshInbox,
    switchAccount,
    toggleInboxItem,
    t,
  } = useMail();

  if (mailConfigured === false) {
    return (
      <EmptyMailGuide
        onGoSettings={goMailSettings}
        t={t}
      />
    );
  }

  return (
    <div className={`max-expand-settings-section settings-mail-tab-section ${hasSplit ? 'has-split' : ''}`}>
      <div className="settings-mail-tab-split-container">
        <div className="settings-mail-tab-sidebar">
          <MailHeaderActions
            loadingInbox={loadingInbox}
            onGoSettings={goMailSettings}
            onRefresh={() => refreshInbox()}
            t={t}
          />
          <MailAccountTabs
            accounts={configuredAccounts}
            activeAccount={activeAccount}
            collapsed={hasSplit}
            onSwitchAccount={switchAccount}
            t={t}
          />
          <MailInboxList
            inbox={inbox}
            expandedUid={expandedUid}
            hasSplit={hasSplit}
            loadingInbox={loadingInbox}
            onToggleItem={toggleInboxItem}
            t={t}
          />
        </div>

        {selectedItem ? (
          <MailReader
            item={selectedItem}
            t={t}
          />
        ) : null}
      </div>
    </div>
  );
}
