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
 * @file mailTypes.ts
 * @description Mail 模块类型定义：账户配置、邮件数据、子组件入参、hook 返回值。
 * @author 鸡哥
 */

import type { TFunction } from 'i18next';

/** 邮箱 IMAP 账户配置 */
export interface MailAccountConfig {
  id: string;
  label: string;
  emailAddress: string;
  imapHost: string;
  imapPort: string;
  imapSecure: boolean;
  authUser: string;
  authSecret: string;
}

/** 收件箱单条邮件 */
export interface MailInboxItem {
  uid: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  size: number;
  preview: string;
  body: string;
}

/** 邮箱账户加载状态 */
export interface MailAccountState {
  configured: boolean;
  accounts: MailAccountConfig[];
  activeAccount: MailAccountConfig | null;
}

/** useMail hook 返回值类型 */
export interface UseMailReturn {
  inbox: MailInboxItem[];
  loadingInbox: boolean;
  expandedUid: string | null;
  mailConfigured: boolean | null;
  configuredAccounts: MailAccountConfig[];
  activeAccount: MailAccountConfig | null;
  selectedItem: MailInboxItem | null;
  hasSplit: boolean;
  goMailSettings: () => void;
  refreshInbox: (account?: MailAccountConfig, limit?: number) => void;
  switchAccount: (account: MailAccountConfig) => void;
  toggleInboxItem: (uid: string) => void;
  t: TFunction;
}

/** EmptyMailGuide 组件入参 */
export interface EmptyMailGuideProps {
  onGoSettings: () => void;
  t: TFunction;
}

/** MailHeaderActions 组件入参 */
export interface MailHeaderActionsProps {
  loadingInbox: boolean;
  onGoSettings: () => void;
  onRefresh: () => void;
  t: TFunction;
}

/** MailAccountTabs 组件入参 */
export interface MailAccountTabsProps {
  accounts: MailAccountConfig[];
  activeAccount: MailAccountConfig | null;
  collapsed: boolean;
  onSwitchAccount: (account: MailAccountConfig) => void;
  t: TFunction;
}

/** MailInboxList 组件入参 */
export interface MailInboxListProps {
  inbox: MailInboxItem[];
  expandedUid: string | null;
  hasSplit: boolean;
  loadingInbox: boolean;
  onToggleItem: (uid: string) => void;
  t: TFunction;
}

/** MailReader 组件入参 */
export interface MailReaderProps {
  item: MailInboxItem;
  t: TFunction;
}
