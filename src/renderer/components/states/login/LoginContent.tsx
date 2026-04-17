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
 * @file LoginContent.tsx
 * @description 独立登录状态界面
 * @author 鸡哥
 */

import { useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../store/slices';
import { loginUser } from '../../../api/userAccountApi';
import { writeLocalToken } from '../../../utils/userAccount';
import '../../../styles/settings/settings.css';
import '../../../styles/auth/auth.css';

type FeedbackType = 'success' | 'error' | 'info';

interface Feedback {
  type: FeedbackType;
  text: string;
}

/** 独立登录状态内容 */
export function LoginContent(): ReactElement {
  const { t } = useTranslation();
  const { setRegister, setMaxExpand, setMaxExpandTab } = useIslandStore();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const renderFeedback = (): ReactElement | null => {
    if (!feedback) return null;
    return <div className={`settings-user-feedback settings-user-feedback--${feedback.type}`}>{feedback.text}</div>;
  };

  const navigateToUserCenter = (): void => {
    setMaxExpand();
    setMaxExpandTab('settings');
  };

  const handleSubmit = async (): Promise<void> => {
    if (submitting) return;
    const cleanAccount = account.trim();
    if (!cleanAccount) {
      setFeedback({ type: 'error', text: t('settings.user.feedback.accountRequired', { defaultValue: '请输入用户名或邮箱' }) });
      return;
    }
    if (!password) {
      setFeedback({ type: 'error', text: t('settings.user.feedback.passwordRequired', { defaultValue: '请输入密码' }) });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    const result = await loginUser(cleanAccount, password);
    setSubmitting(false);
    if (!result.ok || !result.data) {
      setFeedback({ type: 'error', text: result.message || t('settings.user.feedback.operationFailed', { defaultValue: '操作失败' }) });
      return;
    }

    writeLocalToken(result.data.token);
    setFeedback({ type: 'success', text: t('settings.user.feedback.loginSuccess', { defaultValue: '登录成功' }) });
    navigateToUserCenter();
  };

  return (
    <div className="auth-state-content" onClick={(e) => e.stopPropagation()}>
      <div className="auth-panel">
        <div className="auth-panel-title">{t('settings.user.auth.login', { defaultValue: '登录' })}</div>
        <div className="auth-panel-subtitle">
          {t('settings.user.auth.hint', { defaultValue: '登录注册服务由 eIsland server 提供' })}
        </div>

        <label className="settings-field">
          <span className="settings-field-label">{t('settings.user.fields.account', { defaultValue: '用户名或邮箱' })}</span>
          <input
            className="settings-field-input"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder={t('settings.user.fields.accountPlaceholder', { defaultValue: '请输入用户名或邮箱' })}
          />
        </label>

        <label className="settings-field">
          <span className="settings-field-label">{t('settings.user.fields.password', { defaultValue: '密码' })}</span>
          <input
            className="settings-field-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('settings.user.fields.passwordPlaceholder', { defaultValue: '至少 8 位，含字母与数字' })}
          />
        </label>

        {renderFeedback()}

        <div className="auth-panel-actions">
          <button
            type="button"
            className="settings-user-primary-btn"
            onClick={() => void handleSubmit()}
            disabled={submitting}
          >
            {submitting
              ? t('settings.user.feedback.submitting', { defaultValue: '处理中…' })
              : t('settings.user.auth.loginBtn', { defaultValue: '登录' })}
          </button>
          <button
            type="button"
            className="settings-user-secondary-btn"
            onClick={() => setRegister()}
            disabled={submitting}
          >
            {t('settings.user.auth.register', { defaultValue: '注册' })}
          </button>
          <button
            type="button"
            className="settings-user-secondary-btn"
            onClick={navigateToUserCenter}
            disabled={submitting}
          >
            {t('settings.user.actions.backToCenter', { defaultValue: '返回用户中心' })}
          </button>
        </div>
      </div>
    </div>
  );
}
