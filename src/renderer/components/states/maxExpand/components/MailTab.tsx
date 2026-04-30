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

import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../../store/slices';
import { SvgIcon } from '../../../../utils/SvgIcon';

const SETTINGS_OPEN_TAB_STORE_KEY = 'settings-open-tab';
const MAIL_INBOX_REFRESH_TIMEOUT_MS = 20000;

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

let mailTabInboxMemoryCache: MailInboxItem[] = [];

/**
 * 邮箱 Tab
 * @description 展示邮箱功能介绍，并引导前往设置完成 IMAP 配置
 */
export function MailTab(): ReactElement {
  const { t } = useTranslation();
  const { setMaxExpandTab } = useIslandStore();
  const [inbox, setInbox] = useState<MailInboxItem[]>(() => mailTabInboxMemoryCache);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [expandedUid, setExpandedUid] = useState<string | null>(null);

  const refreshInbox = async (): Promise<void> => {
    setLoadingInbox(true);
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(t('mailTab.messages.inboxFetchTimeout', { defaultValue: '收件箱读取超时，请检查网络或邮箱配置' })));
        }, MAIL_INBOX_REFRESH_TIMEOUT_MS);
      });

      const result = await Promise.race([
        window.api.mailInboxList(10),
        timeoutPromise,
      ]);

      if (!result.ok) {
        return;
      }

      const nextInbox = result.items || [];
      setInbox(nextInbox);
      mailTabInboxMemoryCache = nextInbox;
      setExpandedUid((current) => (current && nextInbox.some((item) => item.uid === current) ? current : null));
    } catch {
      // keep last inbox data to avoid blank list while retrying
    } finally {
      setLoadingInbox(false);
    }
  };

  useEffect(() => {
    void refreshInbox();
  }, []);

  return (
    <div className="max-expand-settings-section settings-mail-tab-section">
      <div
        className="max-expand-settings-title settings-mail-tab-title-line"
      >
        <span>{t('mailTab.title', { defaultValue: '邮箱' })}</span>
        <div className="settings-mail-tab-title-actions">
          <button
            type="button"
            className="settings-mail-tab-icon-btn"
            onClick={() => {
              window.api.storeWrite(SETTINGS_OPEN_TAB_STORE_KEY, 'mail').catch(() => {});
              setMaxExpandTab('settings');
            }}
            title={t('mailTab.goSettings', { defaultValue: '前往邮箱设置' })}
            aria-label={t('mailTab.goSettings', { defaultValue: '前往邮箱设置' })}
          >
            <img src={SvgIcon.SETTING} alt="" className="settings-mail-tab-icon" />
          </button>
          <button
            type="button"
            className={`settings-mail-tab-icon-btn ${loadingInbox ? 'is-loading' : ''}`}
            onClick={() => { void refreshInbox(); }}
            disabled={loadingInbox}
            title={t('mailTab.actions.refresh', { defaultValue: '刷新收件箱' })}
            aria-label={t('mailTab.actions.refresh', { defaultValue: '刷新收件箱' })}
          >
            <img src={SvgIcon.REVERT} alt="" className="settings-mail-tab-icon" />
          </button>
        </div>
      </div>
      <div
        className="settings-mail-tab-inbox-list"
        onWheel={(event) => {
          event.stopPropagation();
        }}
      >
        {inbox.map((item) => (
          <div
            className={`settings-mail-tab-mail-item ${expandedUid === item.uid ? 'is-expanded' : ''}`}
            key={item.uid}
            onClick={() => {
              setExpandedUid((current) => (current === item.uid ? null : item.uid));
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setExpandedUid((current) => (current === item.uid ? null : item.uid));
              }
            }}
          >
            <div className="settings-mail-tab-mail-header">
              <span className="settings-mail-tab-mail-subject" title={item.subject}>{item.subject || '(无主题)'}</span>
              <span className="settings-mail-tab-mail-from" title={item.from}>{item.from || '-'}</span>
            </div>
            <div className="settings-mail-tab-mail-preview" title={item.preview || item.body || ''}>
              {item.preview || item.body || '-'}
            </div>
            {expandedUid === item.uid ? (
              <pre className="settings-mail-tab-mail-body">{item.body || item.preview || '-'}</pre>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
