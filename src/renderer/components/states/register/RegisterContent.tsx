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
 * @file RegisterContent.tsx
 * @description 独立注册状态界面
 * @author 鸡哥
 */

import { useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../store/slices';
import { registerUser } from '../../../api/userAccountApi';
import { updateSessionToken } from '../../../utils/authSession';
import '../../../styles/settings/settings.css';
import '../../../styles/auth/auth.css';

const STANDALONE_WINDOW_MODE_STORE_KEY = 'standalone-window-mode';
const LEGACY_COUNTDOWN_WINDOW_MODE_STORE_KEY = 'countdown-window-mode';

type FeedbackType = 'success' | 'error' | 'info';

interface Feedback {
  type: FeedbackType;
  text: string;
}

const USERNAME_ALLOWED_PATTERN = /^[A-Za-z0-9\u4E00-\u9FFF]+$/;

async function readStandaloneWindowMode(): Promise<'integrated' | 'standalone'> {
  try {
    const mode = await window.api.storeRead(STANDALONE_WINDOW_MODE_STORE_KEY);
    if (mode === 'standalone') return 'standalone';
    if (mode === 'integrated') return 'integrated';
  } catch {
    // ignore
  }
  try {
    const legacyMode = await window.api.storeRead(LEGACY_COUNTDOWN_WINDOW_MODE_STORE_KEY);
    if (legacyMode === 'standalone') return 'standalone';
  } catch {
    // ignore
  }
  return 'integrated';
}

/** 独立注册状态内容 */
export function RegisterContent(): ReactElement {
  const { t } = useTranslation();
  const { setLogin, setMaxExpand, setMaxExpandTab, returnFromAuth } = useIslandStore();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const renderFeedback = (): ReactElement | null => {
    if (!feedback) return null;
    return <div className={`settings-user-feedback settings-user-feedback--${feedback.type}`}>{feedback.text}</div>;
  };

  const navigateToUserCenter = async (): Promise<void> => {
    const mode = await readStandaloneWindowMode();
    if (mode === 'standalone') {
      setMaxExpandTab('settings');
      useIslandStore.setState({ state: 'maxExpand', authReturnState: null });
      return;
    }
    setMaxExpand();
    setMaxExpandTab('settings');
  };

  const handleSubmit = async (): Promise<void> => {
    if (submitting) return;
    const cleanUsername = username.trim();
    const cleanEmail = email.trim();
    if (!cleanUsername) {
      setFeedback({ type: 'error', text: t('settings.user.feedback.usernameRequired', { defaultValue: '请输入用户名' }) });
      return;
    }
    if (!USERNAME_ALLOWED_PATTERN.test(cleanUsername)) {
      setFeedback({ type: 'error', text: t('settings.user.feedback.usernameFormatInvalid', { defaultValue: '用户名仅支持中文、英文和数字' }) });
      return;
    }
    if (!cleanEmail) {
      setFeedback({ type: 'error', text: t('settings.user.feedback.emailRequired', { defaultValue: '请输入邮箱' }) });
      return;
    }
    if (!password) {
      setFeedback({ type: 'error', text: t('settings.user.feedback.passwordRequired', { defaultValue: '请输入密码' }) });
      return;
    }
    if (!confirmPassword) {
      setFeedback({ type: 'error', text: t('settings.user.feedback.confirmPasswordRequired', { defaultValue: '请再次输入密码' }) });
      return;
    }
    if (password !== confirmPassword) {
      setFeedback({ type: 'error', text: t('settings.user.feedback.passwordNotMatch', { defaultValue: '两次输入的密码不一致' }) });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    const result = await registerUser(cleanUsername, cleanEmail, password);
    setSubmitting(false);
    if (!result.ok || !result.data) {
      setFeedback({ type: 'error', text: result.message || t('settings.user.feedback.operationFailed', { defaultValue: '操作失败' }) });
      return;
    }

    updateSessionToken(result.data.token);
    setFeedback({ type: 'success', text: t('settings.user.feedback.registerSuccess', { defaultValue: '注册成功，已自动登录' }) });
    await navigateToUserCenter();
  };

  return (
    <div className="auth-state-content" onClick={(e) => e.stopPropagation()}>
      <div className="auth-panel">
        <div className="auth-panel-title">{t('settings.user.auth.register', { defaultValue: '注册' })}</div>
        <div className="auth-panel-subtitle">
          {t('settings.user.auth.hint', { defaultValue: '登录注册服务由 eIsland server 提供' })}
        </div>

        <label className="settings-field">
          <span className="settings-field-label">{t('settings.user.fields.username', { defaultValue: '用户名' })}</span>
          <input
            className="settings-field-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t('settings.user.fields.usernamePlaceholder', { defaultValue: '2-32 位，仅支持中文 / 英文 / 数字' })}
          />
        </label>

        <label className="settings-field">
          <span className="settings-field-label">{t('settings.user.fields.email', { defaultValue: '邮箱' })}</span>
          <input
            className="settings-field-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
          />
        </label>

        <label className="settings-field">
          <span className="settings-field-label">{t('settings.user.fields.password', { defaultValue: '密码' })}</span>
          <div className="auth-password-input-wrap">
            <input
              className="settings-field-input"
              type={passwordVisible ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('settings.user.fields.passwordPlaceholder', { defaultValue: '至少 8 位，含字母与数字' })}
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setPasswordVisible((v) => !v)}
              aria-label={passwordVisible
                ? t('settings.user.actions.hidePassword', { defaultValue: '隐藏密码' })
                : t('settings.user.actions.showPassword', { defaultValue: '显示密码' })}
            >
              {passwordVisible
                ? t('settings.user.actions.hide', { defaultValue: '隐藏' })
                : t('settings.user.actions.show', { defaultValue: '显示' })}
            </button>
          </div>
        </label>

        <label className="settings-field">
          <span className="settings-field-label">{t('settings.user.fields.confirmPassword', { defaultValue: '确认密码' })}</span>
          <div className="auth-password-input-wrap">
            <input
              className="settings-field-input"
              type={confirmPasswordVisible ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('settings.user.fields.confirmPasswordPlaceholder', { defaultValue: '请再次输入密码' })}
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setConfirmPasswordVisible((v) => !v)}
              aria-label={confirmPasswordVisible
                ? t('settings.user.actions.hidePassword', { defaultValue: '隐藏密码' })
                : t('settings.user.actions.showPassword', { defaultValue: '显示密码' })}
            >
              {confirmPasswordVisible
                ? t('settings.user.actions.hide', { defaultValue: '隐藏' })
                : t('settings.user.actions.show', { defaultValue: '显示' })}
            </button>
          </div>
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
              : t('settings.user.auth.registerBtn', { defaultValue: '注册并登录' })}
          </button>
          <button
            type="button"
            className="settings-user-secondary-btn"
            onClick={() => setLogin()}
            disabled={submitting}
          >
            {t('settings.user.auth.login', { defaultValue: '登录' })}
          </button>
          <button
            type="button"
            className="settings-user-secondary-btn"
            onClick={returnFromAuth}
            disabled={submitting}
          >
            {t('settings.user.actions.backToCenter', { defaultValue: '返回用户中心' })}
          </button>
        </div>
      </div>
    </div>
  );
}
