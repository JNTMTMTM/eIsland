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
 * @file BindEmailForm.tsx
 * @description 绑定邮箱表单组件（OAuth 新用户绑定邮箱）
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import type { BindEmailFormProps } from '../types';
import { renderFeedback } from '../../login/utils/renderFeedback';

/** 绑定邮箱表单组件 */
export function BindEmailForm(props: BindEmailFormProps): ReactElement {
  const {
    email,
    setEmail,
    emailCode,
    setEmailCode,
    sendingCode,
    sendCooldownSeconds,
    submitting,
    feedback,
    handleSendCode,
    handleSubmit,
    setLogin,
    t,
  } = props;

  return (
    <div className="auth-state-content" onClick={(e) => e.stopPropagation()}>
      <div className="auth-panel settings-scrollbar-thin">
        <div className="auth-panel-title">{t('oauth.bindEmail.title', { defaultValue: '绑定邮箱' })}</div>
        <div className="auth-panel-subtitle">
          {t('oauth.bindEmail.hint', { defaultValue: '请绑定邮箱以完成注册' })}
        </div>

        <label className="settings-field">
          <span className="settings-field-label">{t('settings.user.fields.email', { defaultValue: '邮箱' })}</span>
          <input
            className="settings-field-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('settings.user.fields.emailPlaceholder', { defaultValue: '请输入邮箱地址' })}
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
              : t('oauth.bindEmail.submit', { defaultValue: '验证并继续' })}
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
