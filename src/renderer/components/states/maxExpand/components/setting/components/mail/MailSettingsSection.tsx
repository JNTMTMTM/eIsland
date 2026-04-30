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
 * @description 设置页面 - 邮箱 IMAP 配置区块
 * @author 鸡哥
 */

import { useState } from 'react';
import type { ReactElement, WheelEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { MailSettingsPageKey } from '../../utils/settingsConfig';

interface MailProviderPreset {
  label: string;
  domain: string;
  imapHost: string;
  imapPort: string;
  imapSecure: boolean;
}

const MAIL_PROVIDER_PRESETS: MailProviderPreset[] = [
  { label: 'QQ 邮箱', domain: 'qq.com', imapHost: 'imap.qq.com', imapPort: '993', imapSecure: true },
  { label: '网易 163', domain: '163.com', imapHost: 'imap.163.com', imapPort: '993', imapSecure: true },
  { label: '网易 126', domain: '126.com', imapHost: 'imap.126.com', imapPort: '993', imapSecure: true },
  { label: '网易 yeah', domain: 'yeah.net', imapHost: 'imap.yeah.net', imapPort: '993', imapSecure: true },
  { label: '新浪邮箱', domain: 'sina.com', imapHost: 'imap.sina.com', imapPort: '993', imapSecure: true },
  { label: '搜狐邮箱', domain: 'sohu.com', imapHost: 'imap.sohu.com', imapPort: '993', imapSecure: true },
  { label: '阿里邮箱', domain: 'aliyun.com', imapHost: 'imap.aliyun.com', imapPort: '993', imapSecure: true },
  { label: 'Foxmail', domain: 'foxmail.com', imapHost: 'imap.qq.com', imapPort: '993', imapSecure: true },
  { label: 'Outlook / Hotmail', domain: 'outlook.com', imapHost: 'outlook.office365.com', imapPort: '993', imapSecure: true },
  { label: 'Gmail', domain: 'gmail.com', imapHost: 'imap.gmail.com', imapPort: '993', imapSecure: true },
];

interface MailSettingsSectionProps {
  currentMailSettingsPageLabel: string;
  mailSettingsPage: MailSettingsPageKey;
  emailAddress: string;
  imapHost: string;
  imapPort: string;
  imapSecure: boolean;
  authUser: string;
  authSecret: string;
  setEmailAddress: (value: string) => void;
  setImapHost: (value: string) => void;
  setImapPort: (value: string) => void;
  setImapSecure: (value: boolean) => void;
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
  authUser,
  authSecret,
  setEmailAddress,
  setImapHost,
  setImapPort,
  setImapSecure,
  setAuthUser,
  setAuthSecret,
  mailSettingsPages,
  mailSettingsPageLabels,
  setMailSettingsPage,
}: MailSettingsSectionProps): ReactElement {
  const { t } = useTranslation();
  const [presetOpen, setPresetOpen] = useState(false);

  const applyPreset = (preset: MailProviderPreset): void => {
    setImapHost(preset.imapHost);
    setImapPort(preset.imapPort);
    setImapSecure(preset.imapSecure);
    const currentUser = emailAddress.trim();
    const atIdx = currentUser.indexOf('@');
    const localPart = atIdx > 0 ? currentUser.slice(0, atIdx) : currentUser;
    if (localPart) {
      const fullAddr = `${localPart}@${preset.domain}`;
      setEmailAddress(fullAddr);
      setAuthUser(fullAddr);
    }
    setPresetOpen(false);
  };

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
                    <span className="settings-field-hint">{t('settings.mail.account.emailAddressHint', { defaultValue: '你的完整邮箱地址，例如 name@qq.com' })}</span>
                    <input className="settings-field-input" value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} placeholder="name@example.com" />
                  </label>
                  <label className="settings-field">
                    <span className="settings-field-label">{t('settings.mail.account.authUser', { defaultValue: '认证用户名' })}</span>
                    <span className="settings-field-hint">{t('settings.mail.account.authUserHint', { defaultValue: '通常与邮箱地址相同' })}</span>
                    <input className="settings-field-input" value={authUser} onChange={(e) => setAuthUser(e.target.value)} placeholder="name@example.com" />
                  </label>
                  <label className="settings-field">
                    <span className="settings-field-label">{t('settings.mail.account.authSecret', { defaultValue: '认证密钥 / 应用专用密码' })}</span>
                    <span className="settings-field-hint">{t('settings.mail.account.authSecretHint', { defaultValue: '邮箱授权码或应用专用密码，非登录密码' })}</span>
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
                  <div className="settings-mail-preset-row">
                    <span className="settings-field-label">{t('settings.mail.imap.quickFill', { defaultValue: '快速填充' })}</span>
                    <div className="settings-mail-preset-wrap">
                      <button
                        type="button"
                        className="settings-mail-preset-trigger"
                        onClick={() => setPresetOpen((v) => !v)}
                      >
                        {t('settings.mail.imap.selectProvider', { defaultValue: '选择邮箱服务商自动填充' })}
                      </button>
                      {presetOpen && (
                        <div className="settings-mail-preset-dropdown">
                          {MAIL_PROVIDER_PRESETS.map((preset) => (
                            <button
                              key={preset.domain}
                              type="button"
                              className="settings-mail-preset-option"
                              onClick={() => applyPreset(preset)}
                            >
                              <span className="settings-mail-preset-option-label">{preset.label}</span>
                              <span className="settings-mail-preset-option-host">{preset.imapHost}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
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
