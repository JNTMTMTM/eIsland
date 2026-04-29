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

const SETTINGS_OPEN_TAB_STORE_KEY = 'settings-open-tab';
const MAIL_INBOX_REFRESH_TIMEOUT_MS = 20000;

interface MailInboxItem {
  uid: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  size: number;
}

/**
 * 邮箱 Tab
 * @description 展示邮箱功能介绍，并引导前往设置完成 IMAP 配置
 */
export function MailTab(): ReactElement {
  const { t } = useTranslation();
  const { setMaxExpandTab } = useIslandStore();
  const [inbox, setInbox] = useState<MailInboxItem[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [mailMessage, setMailMessage] = useState('');

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
        setMailMessage(result.message || t('mailTab.messages.inboxFetchFailed', { defaultValue: '收件箱读取失败' }));
        setInbox([]);
        return;
      }

      setMailMessage('');
      setInbox(result.items || []);
    } catch (error) {
      setMailMessage(error instanceof Error
        ? error.message
        : t('mailTab.messages.inboxFetchFailed', { defaultValue: '收件箱读取失败' }));
      setInbox([]);
    } finally {
      setLoadingInbox(false);
    }
  };

  useEffect(() => {
    void refreshInbox();
  }, []);

  return (
    <div className="max-expand-settings-section">
      <div className="max-expand-settings-title">{t('mailTab.title', { defaultValue: '邮箱' })}</div>
      <div className="settings-cards">
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('mailTab.introTitle', { defaultValue: '客户端直连邮箱（无服务器）' })}</div>
            <div className="settings-card-subtitle">
              {t('mailTab.introDesc', { defaultValue: '仅支持 IMAP 收信。请先在设置中填写服务器参数与账号认证信息。' })}
            </div>
          </div>
          <div className="settings-card-subgroup">
            <button
              type="button"
              className="settings-user-primary-btn"
              onClick={() => {
                window.api.storeWrite(SETTINGS_OPEN_TAB_STORE_KEY, 'mail').catch(() => {});
                setMaxExpandTab('settings');
              }}
            >
              {t('mailTab.goSettings', { defaultValue: '前往邮箱设置' })}
            </button>
            <button
              type="button"
              className="settings-user-secondary-btn"
              onClick={() => { void refreshInbox(); }}
              disabled={loadingInbox}
            >
              {loadingInbox
                ? t('mailTab.actions.refreshing', { defaultValue: '刷新中…' })
                : t('mailTab.actions.refresh', { defaultValue: '刷新收件箱' })}
            </button>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('mailTab.inboxTitle', { defaultValue: '收件箱（最近 10 封）' })}</div>
          </div>
          <div className="settings-card-subgroup">
            {inbox.length === 0 ? (
              <div className="settings-music-hint">{t('mailTab.emptyInbox', { defaultValue: '暂无邮件或读取失败' })}</div>
            ) : (
              <div className="settings-whitelist-list" style={{ maxHeight: 180, overflow: 'auto' }}>
                {inbox.map((item) => (
                  <div className="settings-whitelist-item" key={item.uid}>
                    <span className="settings-whitelist-name" title={item.subject}>{item.subject || '(无主题)'}</span>
                    <span className="settings-music-hint" style={{ marginLeft: 8 }}>{item.from || '-'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {!!mailMessage && (
          <div className="settings-music-hint">{mailMessage}</div>
        )}
      </div>
    </div>
  );
}
