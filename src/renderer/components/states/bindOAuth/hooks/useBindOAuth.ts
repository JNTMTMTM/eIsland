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
 * @file useBindOAuth.ts
 * @description 绑定 OAuth 状态交互逻辑 Hook（已有邮箱账号绑定第三方登录）
 * @author 鸡哥
 */

import { useShallow } from 'zustand/react/shallow';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../../store/slices';
import { oauthBindAccount } from '../../../../api/user/userAccountApi.oauth';
import { updateSessionToken } from '../../../../utils/authSession';
import type { Feedback } from '../../login/config/loginConfig';

/** 绑定 OAuth 状态交互逻辑 Hook */
export function useBindOAuth() {
  const { t } = useTranslation();
  const { bindOAuthContext, setMaxExpand, setMaxExpandTab, setLogin } = useIslandStore(useShallow((store) => ({
    bindOAuthContext: store.bindOAuthContext,
    setMaxExpand: store.setMaxExpand,
    setMaxExpandTab: store.setMaxExpandTab,
    setLogin: store.setLogin,
  })));
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const navigateToUserCenter = async (): Promise<void> => {
    setMaxExpandTab('settings');
    useIslandStore.setState({ state: 'maxExpand', authReturnState: null });
  };

  const handleSubmit = async (): Promise<void> => {
    if (submitting) return;

    if (!password) {
      setFeedback({ type: 'error', text: t('settings.user.feedback.passwordRequired', { defaultValue: '请输入密码' }) });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    const result = await oauthBindAccount(bindOAuthContext.tempToken, password);
    setSubmitting(false);

    if (!result.ok || !result.data) {
      setFeedback({ type: 'error', text: result.message || t('oauth.bindOAuth.bindFailed', { defaultValue: '绑定失败' }) });
      return;
    }

    updateSessionToken(result.data.token);
    setFeedback({ type: 'success', text: t('oauth.bindOAuth.bindSuccess', { defaultValue: '绑定成功' }) });
    await navigateToUserCenter();
  };

  return {
    password,
    setPassword,
    passwordVisible,
    setPasswordVisible,
    submitting,
    feedback,
    handleSubmit,
    setLogin,
    username: bindOAuthContext.username,
    email: bindOAuthContext.email,
    t,
  };
}
