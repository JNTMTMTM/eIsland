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
 * @file useResetPassword.ts
 * @description 重置密码状态交互逻辑 Hook
 * @author 鸡哥
 */

import { useShallow } from 'zustand/react/shallow';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../../store/slices';
import { getIslandMorphDuration } from '../../../../store/constants/islandTransition';
import { beginIslandWindowTransition } from '../../../../utils/islandWindowTransition';
import { resetUserPassword, sendUserEmailCode } from '../../../../api/user/userAccountApi';
import { runSliderCaptcha } from '../../../../utils/sliderCaptcha';
import { EMAIL_PATTERN, type Feedback } from '../config/resetPasswordConfig';

/** 重置密码状态交互逻辑 Hook */
export function useResetPassword() {
  const { t } = useTranslation();
  const { returnFromAuth } = useIslandStore(useShallow((store) => ({
    returnFromAuth: store.returnFromAuth,
  })));
  const setLogin = (): void => {
    useIslandStore.setState((prev) => {
      const standalone = (() => {
        try {
          return (window.location?.pathname ?? '').includes('DynamicIslandStandalone.html');
        } catch {
          return false;
        }
      })();
      if (!standalone) {
        beginIslandWindowTransition(prev.state, 'login');
        window.api?.expandWindowSettings(getIslandMorphDuration(prev.animationSpeed, prev.springAnimation));
        window.api?.disableMousePassthrough();
      }
      return { state: 'login' as never, authReturnState: prev.authReturnState };
    });
  };
  const setRegister = (): void => {
    useIslandStore.setState((prev) => {
      const standalone = (() => {
        try {
          return (window.location?.pathname ?? '').includes('DynamicIslandStandalone.html');
        } catch {
          return false;
        }
      })();
      if (!standalone) {
        beginIslandWindowTransition(prev.state, 'register');
        window.api?.expandWindowSettings(getIslandMorphDuration(prev.animationSpeed, prev.springAnimation));
        window.api?.disableMousePassthrough();
      }
      return { state: 'register' as never, authReturnState: prev.authReturnState };
    });
  };
  const [email, setEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
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
    const cleanEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(cleanEmail)) {
      setFeedback({ type: 'error', text: t('settings.user.feedback.emailInvalid', { defaultValue: '请输入有效邮箱地址' }) });
      return;
    }
    setSendingCode(true);
    let captchaTicket = '';
    let captchaRandstr = '';
    let captchaSign = '';
    try {
      const captcha = await runSliderCaptcha(cleanEmail);
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
    const result = await sendUserEmailCode(cleanEmail, 'RESET_PASSWORD', { ticket: captchaTicket, randstr: captchaRandstr, sign: captchaSign });
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

  const handleSubmit = async (): Promise<void> => {
    if (submitting) return;
    const cleanEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(cleanEmail)) {
      setFeedback({ type: 'error', text: t('settings.user.feedback.emailInvalid', { defaultValue: '请输入有效邮箱地址' }) });
      return;
    }
    const cleanEmailCode = emailCode.trim();
    if (!cleanEmailCode) {
      setFeedback({ type: 'error', text: t('settings.user.feedback.emailCodeRequired', { defaultValue: '请输入邮箱验证码' }) });
      return;
    }
    if (!newPassword) {
      setFeedback({ type: 'error', text: t('settings.user.feedback.passwordRequired', { defaultValue: '请输入密码' }) });
      return;
    }
    if (newPassword.length < 8) {
      setFeedback({ type: 'error', text: t('settings.user.feedback.passwordTooShort', { defaultValue: '密码至少 8 位且包含字母与数字' }) });
      return;
    }
    if (!confirmPassword) {
      setFeedback({ type: 'error', text: t('settings.user.feedback.confirmPasswordRequired', { defaultValue: '请再次输入密码' }) });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', text: t('settings.user.feedback.passwordNotMatch', { defaultValue: '两次输入的密码不一致' }) });
      return;
    }
    setSubmitting(true);
    const result = await resetUserPassword(cleanEmail, cleanEmailCode, newPassword);
    if (!result.ok) {
      setSubmitting(false);
      setFeedback({
        type: 'error',
        text: result.message || t('settings.user.feedback.resetPasswordFailed', { defaultValue: '重置密码失败' }),
      });
      return;
    }
    setFeedback({
      type: 'success',
      text: t('settings.user.feedback.resetPasswordSuccess', { defaultValue: '密码重置成功，请使用新密码登录' }),
    });
    setSubmitting(false);
    window.setTimeout(() => {
      setLogin();
    }, 800);
  };

  return {
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
    returnFromAuth,
    t,
  };
}
