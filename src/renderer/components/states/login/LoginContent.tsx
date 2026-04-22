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

import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../store/slices';
import { loginUserByAccount, loginUserByEmailWithCode, sendUserEmailCode } from '../../../api/user/userAccountApi';
import { updateSessionToken } from '../../../utils/authSession';
import { runSliderCaptcha } from '../../../utils/sliderCaptcha';
import '../../../styles/settings/settings.css';
import '../../../styles/auth/auth.css';

const STANDALONE_WINDOW_MODE_STORE_KEY = 'standalone-window-mode';
const LEGACY_COUNTDOWN_WINDOW_MODE_STORE_KEY = 'countdown-window-mode';

type FeedbackType = 'success' | 'error' | 'info';

interface Feedback {
  type: FeedbackType;
  text: string;
}

interface LoginStepUpData {
  requireEmailVerification?: boolean;
  maskedEmail?: string;
  verificationEmail?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

/** 独立登录状态内容 */
export function LoginContent(): ReactElement {
  const { t } = useTranslation();
  const { setRegister, setMaxExpand, setMaxExpandTab, returnFromAuth } = useIslandStore();
  const [account, setAccount] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [maskedVerificationEmail, setMaskedVerificationEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [sendCooldownSeconds, setSendCooldownSeconds] = useState(0);
  const [forceEmailVerification, setForceEmailVerification] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    if (sendCooldownSeconds <= 0) return;
    const timer = window.setTimeout(() => {
      setSendCooldownSeconds((v) => (v > 0 ? v - 1 : 0));
    }, 1000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [sendCooldownSeconds]);

  const isEmailAccount = account.includes('@');
  const needsEmailVerification = isEmailAccount || forceEmailVerification;
  const loginVerificationEmail = isEmailAccount
    ? account.trim().toLowerCase()
    : verificationEmail.trim().toLowerCase();

  useEffect(() => {
    if (!isEmailAccount) {
      return;
    }
    const normalized = account.trim().toLowerCase();
    setVerificationEmail(normalized);
    setMaskedVerificationEmail(normalized);
  }, [account, isEmailAccount]);

  const handleSendCode = async (): Promise<void> => {
    if (sendingCode || sendCooldownSeconds > 0) return;
    const email = loginVerificationEmail;
    if (!EMAIL_PATTERN.test(email)) {
      setFeedback({ type: 'error', text: t('settings.user.feedback.emailInvalid', { defaultValue: '请输入有效邮箱地址' }) });
      return;
    }
    setSendingCode(true);
    let captchaTicket = '';
    let captchaRandstr = '';
    let captchaSign = '';
    try {
      const captcha = await runSliderCaptcha(email);
      if (!captcha) {
        setSendingCode(false);
        setFeedback({ type: 'error', text: t('settings.user.feedback.captchaCancelled', { defaultValue: '请完成滑块验证后再发送验证码' }) });
        return;
      }
      captchaTicket = captcha.ticket;
      captchaRandstr = captcha.randstr;
      captchaSign = captcha.sign;
    } catch (err) {
      setSendingCode(false);
      const msg = err instanceof Error ? err.message : t('settings.user.feedback.emailCodeSendFailed', { defaultValue: '验证码发送失败' });
      setFeedback({ type: 'error', text: msg });
      return;
    }
    const result = await sendUserEmailCode(email, 'LOGIN', { ticket: captchaTicket, randstr: captchaRandstr, sign: captchaSign });
    setSendingCode(false);
    if (!result.ok) {
      setFeedback({ type: 'error', text: result.message || t('settings.user.feedback.emailCodeSendFailed', { defaultValue: '验证码发送失败' }) });
      return;
    }
    const cooldown = Math.max(0, Number(result.data?.retryAfterSeconds || 60));
    if (cooldown > 0) {
      setSendCooldownSeconds(cooldown);
    }
    setFeedback({ type: 'success', text: t('settings.user.feedback.emailCodeSent', { defaultValue: '验证码已发送，请查收邮箱' }) });
  };

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
    const cleanAccount = account.trim();
    if (!cleanAccount) {
      setFeedback({ type: 'error', text: t('settings.user.feedback.accountRequired', { defaultValue: '请输入用户名或邮箱' }) });
      return;
    }
    if (!password) {
      setFeedback({ type: 'error', text: t('settings.user.feedback.passwordRequired', { defaultValue: '请输入密码' }) });
      return;
    }
    if (needsEmailVerification && !emailCode.trim()) {
      setFeedback({ type: 'error', text: t('settings.user.feedback.emailCodeRequired', { defaultValue: '请输入邮箱验证码' }) });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    const result = isEmailAccount
      ? await loginUserByEmailWithCode(cleanAccount.toLowerCase(), password, emailCode.trim())
      : await loginUserByAccount(cleanAccount, password, needsEmailVerification ? emailCode.trim() : undefined);
    setSubmitting(false);
    if (!result.ok && result.code === 428) {
      const stepUpData = (result.data ?? {}) as LoginStepUpData;
      const normalizedVerificationEmail = typeof stepUpData.verificationEmail === 'string'
        ? stepUpData.verificationEmail.trim().toLowerCase()
        : '';
      const maskedEmail = typeof stepUpData.maskedEmail === 'string' && stepUpData.maskedEmail.trim().length > 0
        ? stepUpData.maskedEmail.trim()
        : normalizedVerificationEmail;
      setVerificationEmail(normalizedVerificationEmail);
      setMaskedVerificationEmail(maskedEmail);
      setForceEmailVerification(true);
      setFeedback({ type: 'error', text: result.message || '当前登录风险较高，请先完成邮箱验证' });
      return;
    }
    if (!result.ok || !result.data) {
      setFeedback({ type: 'error', text: result.message || t('settings.user.feedback.operationFailed', { defaultValue: '操作失败' }) });
      return;
    }

    setForceEmailVerification(false);
    setMaskedVerificationEmail('');
    updateSessionToken(result.data.token);
    setFeedback({ type: 'success', text: t('settings.user.feedback.loginSuccess', { defaultValue: '登录成功' }) });
    await navigateToUserCenter();
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

        {needsEmailVerification && (
          <>
            {!isEmailAccount && (
              <label className="settings-field">
                <span className="settings-field-label">{t('settings.user.fields.boundEmail', { defaultValue: '绑定邮箱' })}</span>
                <input
                  className="settings-field-input"
                  value={maskedVerificationEmail}
                  readOnly
                  disabled
                />
              </label>
            )}
            <label className="settings-field">
              <span className="settings-field-label">{t('settings.user.fields.emailCode', { defaultValue: '邮箱验证码' })}</span>
              <div className="auth-password-input-wrap">
                <input
                  className="settings-field-input"
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value)}
                  placeholder={t('settings.user.fields.emailCodePlaceholder', { defaultValue: '请输入邮箱验证码' })}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => void handleSendCode()}
                  disabled={sendingCode || sendCooldownSeconds > 0}
                >
                  {sendingCode
                    ? t('settings.user.feedback.emailCodeSending', { defaultValue: '发送中…' })
                    : sendCooldownSeconds > 0
                      ? t('settings.user.actions.sendCodeCooldown', { defaultValue: '{{seconds}}s后重试', seconds: sendCooldownSeconds })
                      : t('settings.user.actions.sendCode', { defaultValue: '发送验证码' })}
                </button>
              </div>
            </label>
          </>
        )}

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
