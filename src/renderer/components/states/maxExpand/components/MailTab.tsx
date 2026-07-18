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

import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactElement, SyntheticEvent } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../../store/slices';
import { SvgIcon } from '../../../../utils/SvgIcon';

const SETTINGS_OPEN_TAB_STORE_KEY = 'settings-open-tab';
const MAIL_CONFIG_STORE_KEY = 'mail-account-config';
const MAIL_ACCOUNTS_STORE_KEY = 'mail-accounts-config';
const MAIL_FETCH_LIMIT_STORE_KEY = 'mail-fetch-limit';
const MAIL_INBOX_REFRESH_TIMEOUT_MS = 20000;
const MAIL_HELP_URL = 'https://docs.pyisland.com/guide/eisland.html';
const DEFAULT_MAIL_FETCH_LIMIT = 10;
const MIN_MAIL_FETCH_LIMIT = 1;
const MAX_MAIL_FETCH_LIMIT = 30;

interface MailAccountConfig {
  id: string;
  label: string;
  emailAddress: string;
  imapHost: string;
  imapPort: string;
  imapSecure: boolean;
  authUser: string;
  authSecret: string;
}

interface MailInboxItem {
  uid: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  size: number;
  preview: string;
  body: string;
}

interface MailAccountState {
  configured: boolean;
  accounts: MailAccountConfig[];
  activeAccount: MailAccountConfig | null;
}

interface EmptyMailGuideProps {
  onGoSettings: () => void;
  t: TFunction;
}

interface MailHeaderActionsProps {
  loadingInbox: boolean;
  onGoSettings: () => void;
  onRefresh: () => void;
  t: TFunction;
}

interface MailAccountTabsProps {
  accounts: MailAccountConfig[];
  activeAccount: MailAccountConfig | null;
  collapsed: boolean;
  onSwitchAccount: (account: MailAccountConfig) => void;
  t: TFunction;
}

interface MailInboxListProps {
  inbox: MailInboxItem[];
  expandedUid: string | null;
  hasSplit: boolean;
  loadingInbox: boolean;
  onToggleItem: (uid: string) => void;
  t: TFunction;
}

interface MailReaderProps {
  item: MailInboxItem;
  t: TFunction;
}

let mailTabInboxMemoryCache: MailInboxItem[] = [];

function isHtmlContent(content: string): boolean {
  return /<\s*(html|head|body|div|p|table|br|span|a|img|ul|ol|li|h[1-6])\b/i.test(content);
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const MAIL_LINK_SCRIPT = [
  '<script>',
  'document.addEventListener("click",function(e){',
  'var a=e.target;while(a&&a.tagName!=="A")a=a.parentElement;',
  'if(!a||!a.href)return;',
  'var h=a.href;if(h.startsWith("mailto:")||h.startsWith("javascript:"))return;',
  'e.preventDefault();e.stopPropagation();',
  'window.parent.postMessage({type:"mail-open-url",url:h},"*");',
  '});',
  '</script>',
].join('');

const MAIL_SCROLLBAR_CSS = [
  '::-webkit-scrollbar{width:6px;}',
  '::-webkit-scrollbar-track{background:rgba(0,0,0,0.04);}',
  '::-webkit-scrollbar-thumb{border-radius:999px;background:rgba(0,0,0,0.18);}',
  'html{scrollbar-width:thin;scrollbar-color:rgba(0,0,0,0.18) rgba(0,0,0,0.04);}',
].join('');

const MAIL_INJECT_HEAD = [
  '<base target="_blank">',
  '<meta charset="utf-8">',
  '<style>',
  'img{max-width:100%;height:auto;}',
  'a{color:#58a6ff;text-decoration:underline;cursor:pointer;}',
  MAIL_SCROLLBAR_CSS,
  '</style>',
  MAIL_LINK_SCRIPT,
].join('');

const MAIL_WRAP_STYLE = [
  '<!DOCTYPE html><html><head>',
  '<base target="_blank">',
  '<meta charset="utf-8">',
  '<style>',
  'body{margin:0;padding:8px;font-size:13px;line-height:1.6;',
  'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;',
  'color:#222;background:#fff;word-break:break-word;overflow-wrap:break-word;}',
  'a{color:#1a73e8;text-decoration:underline;}',
  'img{max-width:100%;height:auto;}',
  'table{border-collapse:collapse;max-width:100%;}',
  MAIL_SCROLLBAR_CSS,
  'a{cursor:pointer;}',
  '</style>',
  MAIL_LINK_SCRIPT,
  '</head><body>',
].join('');

function buildMailSrcDoc(content: string): string {
  if (/<html[\s>]/i.test(content)) {
    if (/<head[\s>]/i.test(content)) {
      return content.replace(/(<head[^>]*>)/i, `$1${MAIL_INJECT_HEAD}`);
    }
    return content.replace(/(<html[^>]*>)/i, `$1<head>${MAIL_INJECT_HEAD}</head>`);
  }

  const bodyContent = isHtmlContent(content)
    ? content
    : `<pre style="white-space:pre-wrap;word-break:break-word;margin:0;font-family:inherit;">${escapeHtml(content)}</pre>`;

  return MAIL_WRAP_STYLE + bodyContent + '</body></html>';
}

function isAccountConfigured(account: MailAccountConfig): boolean {
  return Boolean(account.imapHost?.trim() && account.authUser?.trim() && account.authSecret);
}

function getStoredFetchLimit(value: unknown): number {
  if (typeof value === 'number' && value >= MIN_MAIL_FETCH_LIMIT && value <= MAX_MAIL_FETCH_LIMIT) {
    return value;
  }
  return DEFAULT_MAIL_FETCH_LIMIT;
}

async function readStoredFetchLimit(): Promise<number> {
  const value = await window.api.storeRead(MAIL_FETCH_LIMIT_STORE_KEY).catch(() => DEFAULT_MAIL_FETCH_LIMIT);
  return getStoredFetchLimit(value);
}

function normalizeLegacyAccount(raw: unknown): MailAccountConfig | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const cfg = raw as Record<string, unknown>;
  const hasConfig = Boolean(
    typeof cfg.imapHost === 'string' && cfg.imapHost.trim()
    && typeof cfg.authUser === 'string' && cfg.authUser.trim()
    && typeof cfg.authSecret === 'string' && cfg.authSecret,
  );

  if (!hasConfig) {
    return null;
  }

  return {
    id: 'legacy',
    label: typeof cfg.emailAddress === 'string' ? cfg.emailAddress : '',
    emailAddress: typeof cfg.emailAddress === 'string' ? cfg.emailAddress : '',
    imapHost: typeof cfg.imapHost === 'string' ? cfg.imapHost : '',
    imapPort: typeof cfg.imapPort === 'string' ? cfg.imapPort : '993',
    imapSecure: typeof cfg.imapSecure === 'boolean' ? cfg.imapSecure : true,
    authUser: typeof cfg.authUser === 'string' ? cfg.authUser : '',
    authSecret: typeof cfg.authSecret === 'string' ? cfg.authSecret : '',
  };
}

async function readMailAccountState(): Promise<MailAccountState> {
  try {
    const accountsRaw = await window.api.storeRead(MAIL_ACCOUNTS_STORE_KEY);
    if (Array.isArray(accountsRaw) && accountsRaw.length > 0) {
      const accounts = accountsRaw as MailAccountConfig[];
      const activeAccount = accounts.find(isAccountConfigured) || null;

      return {
        configured: Boolean(activeAccount),
        accounts,
        activeAccount,
      };
    }

    const legacyAccount = normalizeLegacyAccount(await window.api.storeRead(MAIL_CONFIG_STORE_KEY));
    if (legacyAccount) {
      return {
        configured: true,
        accounts: [legacyAccount],
        activeAccount: legacyAccount,
      };
    }
  } catch {
    return {
      configured: false,
      accounts: [],
      activeAccount: null,
    };
  }

  return {
    configured: false,
    accounts: [],
    activeAccount: null,
  };
}

async function fetchInbox(
  account: MailAccountConfig,
  fetchLimit: number,
  timeoutMessage: string,
): Promise<MailInboxItem[] | null> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, MAIL_INBOX_REFRESH_TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([
      window.api.mailInboxList({
        emailAddress: account.emailAddress,
        imapHost: account.imapHost,
        imapPort: account.imapPort,
        imapSecure: account.imapSecure,
        authUser: account.authUser,
        authSecret: account.authSecret,
      }, fetchLimit),
      timeoutPromise,
    ]);

    if (!result.ok) {
      return null;
    }

    return result.items || [];
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }
}

function clearInboxMemoryCache(): void {
  mailTabInboxMemoryCache = [];
}

function updateInboxMemoryCache(inbox: MailInboxItem[]): void {
  mailTabInboxMemoryCache = inbox;
}

function stopEventPropagation(event: SyntheticEvent): void {
  event.stopPropagation();
}

function formatMailDate(date: string): string {
  return new Date(date).toLocaleString();
}

function EmptyMailGuide({ onGoSettings, t }: EmptyMailGuideProps): ReactElement {
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

function MailHeaderActions({
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

function MailAccountTabs({
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

function MailInboxList({
  inbox,
  expandedUid,
  hasSplit,
  loadingInbox,
  onToggleItem,
  t,
}: MailInboxListProps): ReactElement {
  const handleItemKeyDown = (event: KeyboardEvent<HTMLDivElement>, uid: string): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggleItem(uid);
    }
  };

  return (
    <div
      className="settings-mail-tab-inbox-list"
      onWheel={stopEventPropagation}
    >
      {loadingInbox && inbox.length === 0 && (
        <div className="settings-mail-tab-loading">
          <div className="settings-mail-tab-loading-spinner" />
          <span>{t('mailTab.messages.loading', { defaultValue: '正在获取邮件…' })}</span>
        </div>
      )}
      {inbox.map((item) => (
        <div
          className={`settings-mail-tab-mail-item ${expandedUid === item.uid ? 'is-expanded' : ''}`}
          key={item.uid}
          onClick={() => onToggleItem(item.uid)}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => handleItemKeyDown(event, item.uid)}
        >
          <div className="settings-mail-tab-mail-header">
            <span className="settings-mail-tab-mail-subject" title={item.subject}>
              {item.subject || t('mailTab.fallbacks.noSubject', { defaultValue: '(无主题)' })}
            </span>
            {!hasSplit && (
              <span className="settings-mail-tab-mail-from" title={item.from}>
                {item.from || t('mailTab.fallbacks.noSender', { defaultValue: '-' })}
              </span>
            )}
          </div>
          <div className="settings-mail-tab-mail-preview" title={item.preview || item.body || ''}>
            {item.preview || item.body || '-'}
          </div>
          {hasSplit && item.date && (
            <span className="settings-mail-tab-mail-date">{formatMailDate(item.date)}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function MailReader({ item, t }: MailReaderProps): ReactElement {
  return (
    <div
      className="settings-mail-tab-reader"
      onClick={stopEventPropagation}
      onKeyDown={stopEventPropagation}
      onWheel={stopEventPropagation}
      role="presentation"
    >
      <div className="settings-mail-tab-reader-header">
        <span className="settings-mail-tab-reader-subject">
          {item.subject || t('mailTab.fallbacks.noSubject', { defaultValue: '(无主题)' })}
        </span>
        <span className="settings-mail-tab-reader-meta">
          {item.from || t('mailTab.fallbacks.noSender', { defaultValue: '-' })}
        </span>
      </div>
      <iframe
        className="settings-mail-tab-mail-body"
        sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox"
        srcDoc={buildMailSrcDoc(item.body || item.preview || '-')}
        title={item.subject || ''}
      />
    </div>
  );
}

/** 最大展开模式 — 邮件 Tab 组件，展示收件箱列表并支持多账户切换。 */
export function MailTab(): ReactElement {
  const { t } = useTranslation();
  const { setMaxExpandTab } = useIslandStore();
  const [inbox, setInbox] = useState<MailInboxItem[]>(() => mailTabInboxMemoryCache);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const [mailConfigured, setMailConfigured] = useState<boolean | null>(null);
  const [accounts, setAccounts] = useState<MailAccountConfig[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string>('');
  const [fetchLimit, setFetchLimit] = useState<number>(DEFAULT_MAIL_FETCH_LIMIT);
  const inboxRequestIdRef = useRef(0);

  const configuredAccounts = accounts.filter(isAccountConfigured);
  const activeAccount = accounts.find((account) => account.id === activeAccountId) || configuredAccounts[0] || null;
  const selectedItem = expandedUid ? inbox.find((item) => item.uid === expandedUid) : null;
  const hasSplit = Boolean(selectedItem);

  const goMailSettings = useCallback((): void => {
    window.api.storeWrite(SETTINGS_OPEN_TAB_STORE_KEY, 'mail').catch(() => {});
    setMaxExpandTab('settings');
  }, [setMaxExpandTab]);

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

  const switchAccount = useCallback((account: MailAccountConfig): void => {
    setActiveAccountId(account.id);
    setExpandedUid(null);
    setInbox([]);
    clearInboxMemoryCache();
    refreshInbox(account);
  }, [refreshInbox]);

  const toggleInboxItem = useCallback((uid: string): void => {
    setExpandedUid((current) => (current === uid ? null : uid));
  }, []);

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
