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
 * @file useBindEmail.ts
 * @description 绑定邮箱状态交互逻辑 Hook（OAuth 新用户绑定邮箱）
 * @author 鸡哥
 */

import { useShallow } from 'zustand/react/shallow';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../../store/slices';
import { sendUserEmailCode } from '../../../../api/user/userAccountApi';
import { oauthBindEmail } from '../../../../api/user/userAccountApi.oauth';
import { runSliderCaptcha } from '../../../../utils/sliderCaptcha';
import { EMAIL_PATTERN } from '../config/bindEmailConfig';
import type { Feedback } from '../../login/config/loginConfig';

/** 绑定邮箱状态交互逻辑 Hook */
export function useBindEmail() {
  const { t } = useTranslation();
  const { bindEmailContext, setSetPassword, setBindOAuth, setLogin } = useIslandStore(useShallow((store) => ({
    bindEmailContext: store.bindEmailContext,
    setSetPassword: store.setSetPassword,
    setBindOAuth: store.setBindOAuth,
    setLogin: store.setLogin,
  })));
  const [email, setEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [sendCooldownSeconds, setSendCooldownSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);
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

  const handleSendCode = async (): Promise<void> => {
    if (sendingCode || sendCooldownSeconds > 0) return;
    const trimmedEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setFeedback({ type: 'error', text: t('settings.user.feedback.emailInvalid', { defaultValue: '请输入有效邮箱地址' }) });
      return;
    }
    setSendingCode(true);
    setFeedback(null);
    try {
      const captcha = await runSliderCaptcha(trimmedEmail);
      if (!captcha) {
        setSendingCode(false);
        setFeedback({ type: 'error', text: t('settings.user.feedback.captchaCancelled', { defaultValue: '请完成滑块验证后再发送验证码' }) });
        return;
      }
      const result = await sendUserEmailCode(trimmedEmail, 'BIND_EMAIL', captcha);
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
    } catch (err) {
      setSendingCode(false);
      const msg = err instanceof Error ? err.message : t('settings.user.feedback.emailCodeSendFailed', { defaultValue: '验证码发送失败' });
      setFeedback({ type: 'error', text: msg });
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (submitting) return;
    const trimmedEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setFeedback({ type: 'error', text: t('settings.user.feedback.emailInvalid', { defaultValue: '请输入有效邮箱地址' }) });
      return;
    }
    if (!emailCode.trim()) {
      setFeedback({ type: 'error', text: t('settings.user.feedback.emailCodeRequired', { defaultValue: '请输入邮箱验证码' }) });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      // 调用后端验证验证码 + 检查邮箱是否已注册
      const revalResult = await oauthBindEmail(bindEmailContext.tempToken, trimmedEmail, emailCode.trim());
      setSubmitting(false);
      if (!revalResult.ok || !revalResult.data) {
        setFeedback({ type: 'error', text: revalResult.message || t('settings.user.feedback.operationFailed', { defaultValue: '操作失败' }) });
        return;
      }
      const { status, tempToken, username, email: revalEmail } = revalResult.data;
      if (status === 'BIND_OAUTH' && tempToken) {
        // 邮箱已注册 → 绑定已有账号
        setBindOAuth({
          tempToken,
          username: username || '',
          email: revalEmail || trimmedEmail,
        });
      } else {
        // 邮箱未注册 → 设置密码
        setSetPassword({
          tempToken: tempToken || bindEmailContext.tempToken,
          suggestedUsername: username || bindEmailContext.suggestedUsername,
          email: revalEmail || trimmedEmail,
        });
      }
    } catch (err) {
      setSubmitting(false);
      const msg = err instanceof Error ? err.message : t('settings.user.feedback.operationFailed', { defaultValue: '操作失败' });
      setFeedback({ type: 'error', text: msg });
    }
  };

  return {
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
  };
}
