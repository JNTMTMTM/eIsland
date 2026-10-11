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
 * @file useSetPassword.ts
 * @description 设置密码状态交互逻辑 Hook（OAuth 新用户注册）
 * @author 鸡哥
 */

import { useShallow } from 'zustand/react/shallow';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../../store/slices';
import { oauthSetPassword } from '../../../../api/user/userAccountApi.oauth';
import { updateSessionToken } from '../../../../utils/authSession';
import { PASSWORD_PATTERN, USERNAME_PATTERN } from '../config/setPasswordConfig';
import type { Feedback } from '../../login/config/loginConfig';

/** 设置密码状态交互逻辑 Hook */
export function useSetPassword() {
  const { t } = useTranslation();
  const { setPasswordContext, setMaxExpand, setMaxExpandTab, setLogin } = useIslandStore(useShallow((store) => ({
    setPasswordContext: store.setPasswordContext,
    setMaxExpand: store.setMaxExpand,
    setMaxExpandTab: store.setMaxExpandTab,
    setLogin: store.setLogin,
  })));
  const [username, setUsername] = useState(setPasswordContext.suggestedUsername || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const navigateToUserCenter = async (): Promise<void> => {
    setMaxExpandTab('settings');
    useIslandStore.setState({ state: 'maxExpand', authReturnState: null });
  };

  const handleSubmit = async (): Promise<void> => {
    if (submitting) return;

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setFeedback({ type: 'error', text: t('settings.user.feedback.usernameRequired', { defaultValue: '请输入用户名' }) });
      return;
    }
    if (!USERNAME_PATTERN.test(cleanUsername)) {
      setFeedback({ type: 'error', text: t('settings.user.feedback.usernameInvalid', { defaultValue: '用户名格式不正确' }) });
      return;
    }
    if (!password) {
      setFeedback({ type: 'error', text: t('settings.user.feedback.passwordRequired', { defaultValue: '请输入密码' }) });
      return;
    }
    if (!PASSWORD_PATTERN.test(password)) {
      setFeedback({ type: 'error', text: t('settings.user.feedback.passwordTooShort', { defaultValue: '密码至少 8 位' }) });
      return;
    }
    if (password !== confirmPassword) {
      setFeedback({ type: 'error', text: t('settings.user.feedback.passwordMismatch', { defaultValue: '两次密码不一致' }) });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    const result = await oauthSetPassword(
      setPasswordContext.tempToken,
      cleanUsername,
      password,
      setPasswordContext.email || undefined,
    );
    setSubmitting(false);

    if (!result.ok || !result.data) {
      setFeedback({ type: 'error', text: result.message || t('settings.user.feedback.operationFailed', { defaultValue: '操作失败' }) });
      return;
    }

    updateSessionToken(result.data.token);
    setFeedback({ type: 'success', text: t('settings.user.feedback.registerSuccess', { defaultValue: '注册成功' }) });
    await navigateToUserCenter();
  };

  return {
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
    email: setPasswordContext.email,
    t,
  };
}
