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
 * @file ResetPasswordForm.tsx
 * @description 重置密码表单组件
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import type { useResetPassword } from '../hooks/useResetPassword';
import { renderFeedback } from '../utils/renderFeedback';

type ResetPasswordFormProps = ReturnType<typeof useResetPassword>;

/** 重置密码表单组件 */
export function ResetPasswordForm(props: ResetPasswordFormProps): ReactElement {
  const {
    email,
    setEmail,
    emailCode,
    setEmailCode,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    newPasswordVisible,
    setNewPasswordVisible,
    confirmPasswordVisible,
    setConfirmPasswordVisible,
    sendingCode,
    sendCooldownSeconds,
    submitting,
    feedback,
    handleSendCode,
    handleSubmit,
    setLogin,
    setRegister,
    t,
  } = props;

  return (
    <div className="auth-state-content" onClick={(e) => e.stopPropagation()}>
      <div className="auth-panel settings-scrollbar-thin">
        <div className="auth-panel-title">{t('settings.user.auth.resetPassword', { defaultValue: '重置密码' })}</div>
        <div className="auth-panel-subtitle">
          {t('settings.user.auth.resetPasswordHint', { defaultValue: '通过邮箱验证码校验身份后，可继续修改登录密码' })}
        </div>

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

        <label className="settings-field">
          <span className="settings-field-label">{t('settings.user.fields.newPassword', { defaultValue: '新密码' })}</span>
          <div className="auth-password-input-wrap">
            <input
              className="settings-field-input"
              type={newPasswordVisible ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('settings.user.fields.newPasswordPlaceholder', { defaultValue: '留空则不修改，至少 8 位含字母数字' })}
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setNewPasswordVisible((v) => !v)}
              aria-label={newPasswordVisible
                ? t('settings.user.actions.hidePassword', { defaultValue: '隐藏密码' })
                : t('settings.user.actions.showPassword', { defaultValue: '显示密码' })}
            >
              {newPasswordVisible
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

        {renderFeedback(feedback)}

        <div className="auth-panel-actions">
          <button
            type="button"
            className="settings-user-primary-btn"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? t('settings.user.feedback.submitting', { defaultValue: '处理中…' })
              : t('settings.user.auth.resetPasswordBtn', { defaultValue: '重置密码' })}
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
            onClick={() => setRegister()}
            disabled={submitting}
          >
            {t('settings.user.auth.register', { defaultValue: '注册' })}
          </button>
          <button
            type="button"
            className="settings-user-secondary-btn"
            onClick={() => setLogin()}
            disabled={submitting}
          >
            {t('settings.user.actions.backToCenter', { defaultValue: '返回用户中心' })}
          </button>
        </div>
      </div>
    </div>
  );
}
