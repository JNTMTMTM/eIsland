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
  labelKey: string;
  labelDefault: string;
  domain: string;
  imapHost: string;
  imapPort: string;
  imapSecure: boolean;
}

const MAIL_PROVIDER_PRESETS: MailProviderPreset[] = [
  { labelKey: 'qq', labelDefault: 'QQ Mail', domain: 'qq.com', imapHost: 'imap.qq.com', imapPort: '993', imapSecure: true },
  { labelKey: 'netease163', labelDefault: 'NetEase 163', domain: '163.com', imapHost: 'imap.163.com', imapPort: '993', imapSecure: true },
  { labelKey: 'netease126', labelDefault: 'NetEase 126', domain: '126.com', imapHost: 'imap.126.com', imapPort: '993', imapSecure: true },
  { labelKey: 'neteaseYeah', labelDefault: 'NetEase yeah', domain: 'yeah.net', imapHost: 'imap.yeah.net', imapPort: '993', imapSecure: true },
  { labelKey: 'sina', labelDefault: 'Sina Mail', domain: 'sina.com', imapHost: 'imap.sina.com', imapPort: '993', imapSecure: true },
  { labelKey: 'sohu', labelDefault: 'Sohu Mail', domain: 'sohu.com', imapHost: 'imap.sohu.com', imapPort: '993', imapSecure: true },
  { labelKey: 'aliyun', labelDefault: 'Aliyun Mail', domain: 'aliyun.com', imapHost: 'imap.aliyun.com', imapPort: '993', imapSecure: true },
  { labelKey: 'foxmail', labelDefault: 'Foxmail', domain: 'foxmail.com', imapHost: 'imap.qq.com', imapPort: '993', imapSecure: true },
  { labelKey: 'outlook', labelDefault: 'Outlook / Hotmail', domain: 'outlook.com', imapHost: 'outlook.office365.com', imapPort: '993', imapSecure: true },
  { labelKey: 'gmail', labelDefault: 'Gmail', domain: 'gmail.com', imapHost: 'imap.gmail.com', imapPort: '993', imapSecure: true },
];

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

interface MailSettingsSectionProps {
  currentMailSettingsPageLabel: string;
  mailSettingsPage: MailSettingsPageKey;
  mailAccounts: MailAccountConfig[];
  activeMailAccountId: string;
  setMailAccounts: (accounts: MailAccountConfig[]) => void;
  setActiveMailAccountId: (id: string) => void;
  mailSettingsPages: MailSettingsPageKey[];
  mailSettingsPageLabels: Record<MailSettingsPageKey, string>;
  setMailSettingsPage: (page: MailSettingsPageKey) => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const MAX_MAIL_ACCOUNTS = 5;

export function MailSettingsSection({
  currentMailSettingsPageLabel,
  mailSettingsPage,
  mailAccounts,
  activeMailAccountId,
  setMailAccounts,
  setActiveMailAccountId,
  mailSettingsPages,
  mailSettingsPageLabels,
  setMailSettingsPage,
}: MailSettingsSectionProps): ReactElement {
  const { t } = useTranslation();
  const [presetOpen, setPresetOpen] = useState(false);

  const activeAccount = mailAccounts.find((a) => a.id === activeMailAccountId) || mailAccounts[0] || null;

  const updateField = <K extends keyof MailAccountConfig>(field: K, value: MailAccountConfig[K]): void => {
    if (!activeAccount) return;
    setMailAccounts(mailAccounts.map((a) => (a.id === activeAccount.id ? { ...a, [field]: value } : a)));
  };

  const addAccount = (): void => {
    if (mailAccounts.length >= MAX_MAIL_ACCOUNTS) return;
    const acc: MailAccountConfig = { id: generateId(), label: '', emailAddress: '', imapHost: '', imapPort: '993', imapSecure: true, authUser: '', authSecret: '' };
    setMailAccounts([...mailAccounts, acc]);
    setActiveMailAccountId(acc.id);
  };

  const removeAccount = (id: string): void => {
    const next = mailAccounts.filter((a) => a.id !== id);
    setMailAccounts(next);
    if (activeMailAccountId === id) setActiveMailAccountId(next[0]?.id ?? '');
  };

  const applyPreset = (preset: MailProviderPreset): void => {
    if (!activeAccount) return;
    const local = activeAccount.emailAddress.split('@')[0]?.trim() || '';
    const fullAddr = local ? `${local}@${preset.domain}` : '';
    setMailAccounts(mailAccounts.map((a) => {
      if (a.id !== activeAccount.id) return a;
      return { ...a, imapHost: preset.imapHost, imapPort: preset.imapPort, imapSecure: preset.imapSecure, ...(fullAddr ? { emailAddress: fullAddr, authUser: fullAddr } : {}) };
    }));
    setPresetOpen(false);
  };

  const handleDotsWheel = (e: WheelEvent<HTMLDivElement>): void => {
    e.stopPropagation();
    const currentIndex = mailSettingsPages.indexOf(mailSettingsPage);
    if (currentIndex < 0) return;
    const nextIndex = e.deltaY > 0 ? Math.min(currentIndex + 1, mailSettingsPages.length - 1) : Math.max(currentIndex - 1, 0);
    if (nextIndex === currentIndex) return;
    e.preventDefault();
    setMailSettingsPage(mailSettingsPages[nextIndex]);
  };

  const displayName = (a: MailAccountConfig): string => a.label || a.emailAddress || t('settings.mail.accounts.unnamed', { defaultValue: '未命名账户' });

  return (
    <div className="max-expand-settings-section">
      <div className="max-expand-settings-title settings-app-title-line">
        <span>{t('settings.labels.mail', { defaultValue: '邮箱配置' })}</span>
        <span className="settings-app-title-sub">- {currentMailSettingsPageLabel}</span>
      </div>

      {/* 账户标签页 */}
      <div className="settings-mail-account-tabs">
        {mailAccounts.map((account) => (
          <div key={account.id} className={`settings-mail-account-tab ${account.id === (activeAccount?.id ?? '') ? 'active' : ''}`}>
            <button type="button" className="settings-mail-account-tab-btn" onClick={() => setActiveMailAccountId(account.id)} title={displayName(account)}>
              {displayName(account)}
            </button>
            {mailAccounts.length > 1 && (
              <button type="button" className="settings-mail-account-tab-remove" onClick={() => removeAccount(account.id)} title={t('settings.mail.accounts.remove', { defaultValue: '移除' })} aria-label={t('settings.mail.accounts.remove', { defaultValue: '移除' })}>×</button>
            )}
          </div>
        ))}
        {mailAccounts.length < MAX_MAIL_ACCOUNTS && (
          <button type="button" className="settings-mail-account-tab-add" onClick={addAccount} title={t('settings.mail.accounts.add', { defaultValue: '添加账户' })} aria-label={t('settings.mail.accounts.add', { defaultValue: '添加账户' })}>+</button>
        )}
      </div>

      {activeAccount ? (
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
                      <span className="settings-field-label">{t('settings.mail.accounts.label', { defaultValue: '账户备注' })}</span>
                      <span className="settings-field-hint">{t('settings.mail.accounts.labelHint', { defaultValue: '自定义名称，方便区分多个邮箱' })}</span>
                      <input className="settings-field-input" value={activeAccount.label} onChange={(e) => updateField('label', e.target.value)} placeholder={t('settings.mail.accounts.labelPlaceholder', { defaultValue: '工作邮箱 / 个人邮箱' })} />
                    </label>
                    <label className="settings-field">
                      <span className="settings-field-label">{t('settings.mail.account.emailAddress', { defaultValue: '邮箱地址' })}</span>
                      <span className="settings-field-hint">{t('settings.mail.account.emailAddressHint', { defaultValue: '你的完整邮箱地址，例如 name@qq.com' })}</span>
                      <input className="settings-field-input" value={activeAccount.emailAddress} onChange={(e) => updateField('emailAddress', e.target.value)} placeholder="name@example.com" />
                    </label>
                    <label className="settings-field">
                      <span className="settings-field-label">{t('settings.mail.account.authUser', { defaultValue: '认证用户名' })}</span>
                      <span className="settings-field-hint">{t('settings.mail.account.authUserHint', { defaultValue: '通常与邮箱地址相同' })}</span>
                      <input className="settings-field-input" value={activeAccount.authUser} onChange={(e) => updateField('authUser', e.target.value)} placeholder="name@example.com" />
                    </label>
                    <label className="settings-field">
                      <span className="settings-field-label">{t('settings.mail.account.authSecret', { defaultValue: '认证密钥 / 应用专用密码' })}</span>
                      <span className="settings-field-hint">{t('settings.mail.account.authSecretHint', { defaultValue: '邮箱授权码或应用专用密码，非登录密码' })}</span>
                      <input className="settings-field-input" type="password" value={activeAccount.authSecret} onChange={(e) => updateField('authSecret', e.target.value)} placeholder="••••••••" />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {mailSettingsPage === 'imap' && (
              <div className="settings-cards">
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div className="settings-card-title">{t('settings.mail.imap.title', { defaultValue: 'IMAP' })}</div>
                    <div className="settings-card-subtitle">{t('settings.mail.imap.hint', { defaultValue: '用于收信、同步收件箱和文件夹状态。' })}</div>
                  </div>
                  <div className="settings-card-subgroup">
                    <div className="settings-mail-preset-row">
                      <span className="settings-field-label">{t('settings.mail.imap.quickFill', { defaultValue: '快速填充' })}</span>
                      <div className="settings-mail-preset-wrap">
                        <button type="button" className="settings-mail-preset-trigger" onClick={() => setPresetOpen((v) => !v)}>
                          {t('settings.mail.imap.selectProvider', { defaultValue: '选择邮箱服务商自动填充' })}
                        </button>
                        {presetOpen && (
                          <div className="settings-mail-preset-dropdown">
                            {MAIL_PROVIDER_PRESETS.map((preset) => (
                              <button key={preset.domain} type="button" className="settings-mail-preset-option" onClick={() => applyPreset(preset)}>
                                <span className="settings-mail-preset-option-label">{t(`settings.mail.imap.providers.${preset.labelKey}`, { defaultValue: preset.labelDefault })}</span>
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
                      <input className="settings-field-input" value={activeAccount.imapHost} onChange={(e) => updateField('imapHost', e.target.value)} placeholder="imap.example.com" />
                    </label>
                    <label className="settings-field">
                      <span className="settings-field-label">{t('settings.mail.imap.port', { defaultValue: 'IMAP 端口' })}</span>
                      <input className="settings-field-input" value={activeAccount.imapPort} onChange={(e) => updateField('imapPort', e.target.value)} placeholder="993" />
                    </label>
                    <div className="settings-card-inline-row" style={{ marginTop: 8 }}>
                      <label className="settings-card-check">
                        <input type="checkbox" checked={activeAccount.imapSecure} onChange={(e) => updateField('imapSecure', e.target.checked)} />
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
      ) : (
        <div className="settings-mail-empty-accounts">
          <span>{t('settings.mail.accounts.empty', { defaultValue: '暂无账户，请点击上方 + 添加邮箱账户' })}</span>
        </div>
      )}
    </div>
  );
}
