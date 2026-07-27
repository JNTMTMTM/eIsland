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
 * @file SetPasswordForm.tsx
 * @description 设置密码表单组件（OAuth 新用户注册）
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import type { SetPasswordFormProps } from '../types';
import { renderFeedback } from '../../login/utils/renderFeedback';

/** 设置密码表单组件 */
export function SetPasswordForm(props: SetPasswordFormProps): ReactElement {
  const {
    username,
    setUsername,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    passwordVisible,
    setPasswordVisible,
    confirmPasswordVisible,
    setConfirmPasswordVisible,
    submitting,
    feedback,
    handleSubmit,
    setLogin,
    email,
    t,
  } = props;

  return (
    <div className="auth-state-content" onClick={(e) => e.stopPropagation()}>
      <div className="auth-panel settings-scrollbar-thin">
        <div className="auth-panel-title">{t('oauth.setPassword.title', { defaultValue: '设置密码' })}</div>
        <div className="auth-panel-subtitle">
          {t('oauth.setPassword.hint', { defaultValue: 'OAuth 登录成功，请设置密码以完成注册' })}
        </div>

        <label className="settings-field">
          <span className="settings-field-label">{t('settings.user.fields.username', { defaultValue: '用户名' })}</span>
          <input
            className="settings-field-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t('settings.user.fields.usernamePlaceholder', { defaultValue: '2-32 位，支持中英文 / 数字 / 下划线' })}
          />
        </label>

        {email && (
          <label className="settings-field">
            <span className="settings-field-label">{t('settings.user.fields.email', { defaultValue: '邮箱' })}</span>
            <input
              className="settings-field-input"
              value={email}
              readOnly
              disabled
            />
          </label>
        )}

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

        {renderFeedback(feedback)}

        <div className="auth-panel-actions">
          <button
            type="button"
            className="settings-user-primary-btn"
            onClick={() => void handleSubmit()}
            disabled={submitting}
          >
            {submitting
              ? t('settings.user.feedback.submitting', { defaultValue: '处理中…' })
              : t('oauth.setPassword.submit', { defaultValue: '设置密码并注册' })}
          </button>
          <button
            type="button"
            className="settings-user-secondary-btn"
            onClick={() => setLogin()}
            disabled={submitting}
          >
            {t('settings.user.actions.cancelLogin', { defaultValue: '取消登录' })}
          </button>
        </div>
      </div>
    </div>
  );
}
