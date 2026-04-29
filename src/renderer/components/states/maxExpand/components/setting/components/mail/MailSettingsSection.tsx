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
 * @file MailSettingsSection.tsx
 * @description 设置页面 - 邮箱 IMAP/SMTP 配置区块
 * @author 鸡哥
 */

import type { ReactElement, WheelEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { MailSettingsPageKey } from '../../utils/settingsConfig';

interface MailSettingsSectionProps {
  currentMailSettingsPageLabel: string;
  mailSettingsPage: MailSettingsPageKey;
  emailAddress: string;
  imapHost: string;
  imapPort: string;
  imapSecure: boolean;
  smtpHost: string;
  smtpPort: string;
  smtpSecure: boolean;
  authUser: string;
  authSecret: string;
  setEmailAddress: (value: string) => void;
  setImapHost: (value: string) => void;
  setImapPort: (value: string) => void;
  setImapSecure: (value: boolean) => void;
  setSmtpHost: (value: string) => void;
  setSmtpPort: (value: string) => void;
  setSmtpSecure: (value: boolean) => void;
  setAuthUser: (value: string) => void;
  setAuthSecret: (value: string) => void;
  mailSettingsPages: MailSettingsPageKey[];
  mailSettingsPageLabels: Record<MailSettingsPageKey, string>;
  setMailSettingsPage: (page: MailSettingsPageKey) => void;
}

export function MailSettingsSection({
  currentMailSettingsPageLabel,
  mailSettingsPage,
  emailAddress,
  imapHost,
  imapPort,
  imapSecure,
  smtpHost,
  smtpPort,
  smtpSecure,
  authUser,
  authSecret,
  setEmailAddress,
  setImapHost,
  setImapPort,
  setImapSecure,
  setSmtpHost,
  setSmtpPort,
  setSmtpSecure,
  setAuthUser,
  setAuthSecret,
  mailSettingsPages,
  mailSettingsPageLabels,
  setMailSettingsPage,
}: MailSettingsSectionProps): ReactElement {
  const { t } = useTranslation();

  const handleDotsWheel = (e: WheelEvent<HTMLDivElement>): void => {
    e.stopPropagation();
    const currentIndex = mailSettingsPages.indexOf(mailSettingsPage);
    if (currentIndex < 0) return;
    const nextIndex = e.deltaY > 0
      ? Math.min(currentIndex + 1, mailSettingsPages.length - 1)
      : Math.max(currentIndex - 1, 0);
    if (nextIndex === currentIndex) return;
    e.preventDefault();
    setMailSettingsPage(mailSettingsPages[nextIndex]);
  };

  return (
    <div className="max-expand-settings-section">
      <div className="max-expand-settings-title settings-app-title-line">
        <span>{t('settings.labels.mail', { defaultValue: '邮箱配置' })}</span>
        <span className="settings-app-title-sub">- {currentMailSettingsPageLabel}</span>
      </div>
      <div className="settings-app-pages-layout settings-mail-pages-layout">
        <div className="settings-app-page-main">
          {mailSettingsPage === 'account' && (
            <div className="settings-cards">
              <div className="settings-card">
                <div className="settings-card-header">
                  <div className="settings-card-title">{t('settings.mail.account.title', { defaultValue: '账户信息' })}</div>
                  <div className="settings-card-subtitle">{t('settings.mail.account.hint', { defaultValue: '邮箱地址用于展示与默认发件人信息。' })}</div>
                </div>
                <div className="settings-card-subgroup">
                  <label className="settings-field">
                    <span className="settings-field-label">{t('settings.mail.account.emailAddress', { defaultValue: '邮箱地址' })}</span>
                    <input className="settings-field-input" value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} placeholder="name@example.com" />
                  </label>
                  <label className="settings-field">
                    <span className="settings-field-label">{t('settings.mail.account.authUser', { defaultValue: '认证用户名' })}</span>
                    <input className="settings-field-input" value={authUser} onChange={(e) => setAuthUser(e.target.value)} placeholder="name@example.com" />
                  </label>
                  <label className="settings-field">
                    <span className="settings-field-label">{t('settings.mail.account.authSecret', { defaultValue: '认证密钥 / 应用专用密码' })}</span>
                    <input className="settings-field-input" type="password" value={authSecret} onChange={(e) => setAuthSecret(e.target.value)} placeholder="••••••••" />
                  </label>
                </div>
              </div>
            </div>
          )}

          {mailSettingsPage === 'imap' && (
            <div className="settings-cards">
              <div className="settings-card">
                <div className="settings-card-header">
                  <div className="settings-card-title">IMAP</div>
                  <div className="settings-card-subtitle">{t('settings.mail.imap.hint', { defaultValue: '用于收信、同步收件箱和文件夹状态。' })}</div>
                </div>
                <div className="settings-card-subgroup">
                  <label className="settings-field">
                    <span className="settings-field-label">{t('settings.mail.imap.host', { defaultValue: 'IMAP 服务器' })}</span>
                    <input className="settings-field-input" value={imapHost} onChange={(e) => setImapHost(e.target.value)} placeholder="imap.example.com" />
                  </label>
                  <label className="settings-field">
                    <span className="settings-field-label">{t('settings.mail.imap.port', { defaultValue: 'IMAP 端口' })}</span>
                    <input className="settings-field-input" value={imapPort} onChange={(e) => setImapPort(e.target.value)} placeholder="993" />
                  </label>
                  <div className="settings-card-inline-row" style={{ marginTop: 8 }}>
                    <label className="settings-card-check">
                      <input type="checkbox" checked={imapSecure} onChange={(e) => setImapSecure(e.target.checked)} />
                      <span>{t('settings.mail.imap.secure', { defaultValue: '启用 TLS / SSL' })}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {mailSettingsPage === 'smtp' && (
            <div className="settings-cards">
              <div className="settings-card">
                <div className="settings-card-header">
                  <div className="settings-card-title">SMTP</div>
                  <div className="settings-card-subtitle">{t('settings.mail.smtp.hint', { defaultValue: '用于发信。建议使用服务商推荐端口和加密方式。' })}</div>
                </div>
                <div className="settings-card-subgroup">
                  <label className="settings-field">
                    <span className="settings-field-label">{t('settings.mail.smtp.host', { defaultValue: 'SMTP 服务器' })}</span>
                    <input className="settings-field-input" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.example.com" />
                  </label>
                  <label className="settings-field">
                    <span className="settings-field-label">{t('settings.mail.smtp.port', { defaultValue: 'SMTP 端口' })}</span>
                    <input className="settings-field-input" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} placeholder="465" />
                  </label>
                  <div className="settings-card-inline-row" style={{ marginTop: 8 }}>
                    <label className="settings-card-check">
                      <input type="checkbox" checked={smtpSecure} onChange={(e) => setSmtpSecure(e.target.checked)} />
                      <span>{t('settings.mail.smtp.secure', { defaultValue: '启用 TLS / SSL' })}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div
          className="settings-app-page-dots"
          aria-label={t('settings.mail.pagination', { defaultValue: '邮箱配置分页' })}
          onWheel={handleDotsWheel}
        >
          {mailSettingsPages.map((page) => (
            <button
              key={page}
              className={`settings-app-page-dot ${mailSettingsPage === page ? 'active' : ''}`}
              data-label={mailSettingsPageLabels[page]}
              type="button"
              onClick={() => setMailSettingsPage(page)}
              title={mailSettingsPageLabels[page]}
              aria-label={mailSettingsPageLabels[page]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
