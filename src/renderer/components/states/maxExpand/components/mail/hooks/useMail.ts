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
 * @file useMail.ts
 * @description Mail 模块状态管理 hook：账户加载、收件箱拉取、账户切换、iframe 消息监听等。
 * @author 鸡哥
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../../../../store/slices';
import {
  DEFAULT_MAIL_FETCH_LIMIT,
  SETTINGS_OPEN_TAB_STORE_KEY,
} from '../config/mailConfig';
import type { MailAccountConfig, MailInboxItem, UseMailReturn } from '../types/mailTypes';
import {
  clearInboxMemoryCache,
  fetchInbox,
  getInboxMemoryCache,
  isAccountConfigured,
  readMailAccountState,
  readStoredFetchLimit,
  updateInboxMemoryCache,
} from '../utils/mailUtils';

/**
 * Mail 模块状态管理 hook
 * @description 封装 MailTab 的全部状态与操作逻辑
 * @returns UseMailReturn
 */
export function useMail(): UseMailReturn {
  const { t } = useTranslation();
  const { setMaxExpandTab } = useIslandStore();
  const [inbox, setInbox] = useState<MailInboxItem[]>(() => getInboxMemoryCache());
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const [mailConfigured, setMailConfigured] = useState<boolean | null>(null);
  const [accounts, setAccounts] = useState<MailAccountConfig[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string>('');
  const [fetchLimit, setFetchLimit] = useState<number>(DEFAULT_MAIL_FETCH_LIMIT);
  const inboxRequestIdRef = useRef(0);

  const configuredAccounts = accounts.filter(isAccountConfigured);
  const activeAccount = accounts.find((account) => account.id === activeAccountId) || configuredAccounts[0] || null;
  const selectedItem = expandedUid ? inbox.find((item) => item.uid === expandedUid) || null : null;
  const hasSplit = Boolean(selectedItem);

  /** 跳转到邮箱设置页 */
  const goMailSettings = useCallback((): void => {
    window.api.storeWrite(SETTINGS_OPEN_TAB_STORE_KEY, 'mail').catch(() => {});
    setMaxExpandTab('settings');
  }, [setMaxExpandTab]);

  /** 拉取收件箱（带竞态保护） */
  const loadInbox = useCallback(async (
    account: MailAccountConfig,
    nextFetchLimit: number,
    timeoutMessage: string,
  ): Promise<void> => {
    if (!isAccountConfigured(account)) {
      return;
    }

    const requestId = inboxRequestIdRef.current + 1;
    inboxRequestIdRef.current = requestId;
    setLoadingInbox(true);

    try {
      const nextInbox = await fetchInbox(account, nextFetchLimit, timeoutMessage);
      if (inboxRequestIdRef.current !== requestId || nextInbox === null) {
        return;
      }

      setInbox(nextInbox);
      updateInboxMemoryCache(nextInbox);
      setExpandedUid((current) => (current && nextInbox.some((item) => item.uid === current) ? current : null));
    } catch {
      // 保留上一次成功数据，避免短暂网络问题把列表清空。
    } finally {
      if (inboxRequestIdRef.current === requestId) {
        setLoadingInbox(false);
      }
    }
  }, []);

  /** 刷新收件箱 */
  const refreshInbox = useCallback((account?: MailAccountConfig, limit = fetchLimit): void => {
    const target = account || activeAccount;
    if (!target) {
      return;
    }

    void loadInbox(
      target,
      limit,
      t('mailTab.messages.inboxFetchTimeout', { defaultValue: '收件箱读取超时，请检查网络或邮箱配置' }),
    );
  }, [activeAccount, fetchLimit, loadInbox, t]);

  /** 监听 iframe 内链接点击，转发给主进程打开 */
  useEffect(() => {
    const handleMessage = (event: MessageEvent): void => {
      if (!event.data || event.data.type !== 'mail-open-url' || typeof event.data.url !== 'string') {
        return;
      }
      window.api.clipboardOpenUrl(event.data.url).catch(() => {});
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  /** 初始化：读取配置并拉取收件箱 */
  useEffect(() => {
    let cancelled = false;

    const initializeMail = async (): Promise<void> => {
      const [nextFetchLimit, accountState] = await Promise.all([
        readStoredFetchLimit(),
        readMailAccountState(),
      ]);

      if (cancelled) {
        return;
      }

      setFetchLimit(nextFetchLimit);
      setAccounts(accountState.accounts);
      setActiveAccountId(accountState.activeAccount?.id || '');
      setMailConfigured(accountState.configured);

      if (accountState.activeAccount) {
        void loadInbox(
          accountState.activeAccount,
          nextFetchLimit,
          t('mailTab.messages.inboxFetchTimeout', { defaultValue: '收件箱读取超时，请检查网络或邮箱配置' }),
        );
      }
    };

    void initializeMail();

    return () => {
      cancelled = true;
    };
  }, [loadInbox, t]);

  /** 切换账户 */
  const switchAccount = useCallback((account: MailAccountConfig): void => {
    setActiveAccountId(account.id);
    setExpandedUid(null);
    setInbox([]);
    clearInboxMemoryCache();
    refreshInbox(account);
  }, [refreshInbox]);

  /** 展开 / 收起邮件详情 */
  const toggleInboxItem = useCallback((uid: string): void => {
    setExpandedUid((current) => (current === uid ? null : uid));
  }, []);

  return {
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
  };
}
