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
 * @file useLogin.ts
 * @description 登录状态交互逻辑 Hook
 * @author 鸡哥
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../../store/slices';
import { loginUserByAccount, loginUserByEmailWithCode, sendUserEmailCode, fetchOAuthProviders } from '../../../../api/user/userAccountApi';
import { updateSessionToken } from '../../../../utils/authSession';
import { runSliderCaptcha } from '../../../../utils/sliderCaptcha';
import { openGitHubOAuth, openMicrosoftOAuth, openWechatOAuth, openGiteeOAuth, openKookOAuth } from '../../../../utils/oauthWindow';
import type { OAuthCallbackData } from '../../../../api/user/userAccountApi.oauth';
import { EMAIL_PATTERN, type Feedback, type LoginStepUpData } from '../config/loginConfig';
import { readStandaloneWindowMode } from '../utils/readStandaloneWindowMode';

/** 登录状态交互逻辑 Hook */
export function useLogin() {
  const { t } = useTranslation();
  const { setRegister, setSetPassword, setBindOAuth, setBindEmail, setMaxExpand, setMaxExpandTab, returnFromAuth } = useIslandStore();
  const setResetPassword = (): void => {
    useIslandStore.setState((prev) => {
      const prevState = prev.state as string;
      const standalone = (() => {
        try {
          return (window.location?.pathname ?? '').includes('DynamicIslandStandalone.html');
        } catch {
          return false;
        }
      })();
      if (!standalone) {
        window.api?.expandWindowSettings();
        window.api?.disableMousePassthrough();
      }
      const inAuthFlow = prevState === 'login' || prevState === 'register' || prevState === 'payment' || prevState === 'resetPassword';
      const nextAuthReturnState = inAuthFlow ? prev.authReturnState : (standalone ? 'maxExpand' : prev.state);
      return { state: 'resetPassword' as never, authReturnState: nextAuthReturnState };
    });
  };
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

  const navigateToUserCenter = async (): Promise<void> => {
    const { authReturnState } = useIslandStore.getState();
    if (authReturnState && authReturnState !== 'login' && authReturnState !== 'register') {
      returnFromAuth();
      return;
    }
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
    if (isEmailAccount && !EMAIL_PATTERN.test(cleanAccount.toLowerCase())) {
      setFeedback({ type: 'error', text: t('settings.user.feedback.emailInvalid', { defaultValue: '请输入有效邮箱地址' }) });
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
      setFeedback({ type: 'error', text: result.message || t('settings.user.feedback.emailVerificationRequired', { defaultValue: '当前登录风险较高，请先完成邮箱验证' }) });
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

  const [githubLoading, setGithubLoading] = useState(false);
  const [microsoftLoading, setMicrosoftLoading] = useState(false);
  const [wechatLoading, setWechatLoading] = useState(false);
  const [giteeLoading, setGiteeLoading] = useState(false);
  const [kookLoading, setKookLoading] = useState(false);
  const [disabledProviders, setDisabledProviders] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    void fetchOAuthProviders().then((res) => {
      if (cancelled || !res.ok || !Array.isArray(res.data)) return;
      const enabled = new Set(res.data.map((p) => p.provider.toLowerCase()));
      const allProviders = ['github', 'microsoft', 'wechat', 'gitee', 'kook'] as const;
      setDisabledProviders(new Set(allProviders.filter((name) => !enabled.has(name))));
    });
    return () => { cancelled = true; };
  }, []);

  /**
   * 通用 OAuth 登录处理流程。
   * @param loading - 当前加载状态。
   * @param setLoading - 设置加载状态。
   * @param openOAuth - 打开 OAuth 授权窗口的函数。
   * @param mayReturnEmail - OAuth 提供商可能不返回邮箱，缺失时走绑定邮箱流程。
   */
  /**
   * 通用 OAuth 登录处理流程。
   * @param loading - 当前加载状态。
   * @param setLoading - 设置加载状态。
   * @param openOAuth - 打开 OAuth 授权窗口的函数。
   * @param mayReturnEmail - OAuth 提供商可能不返回邮箱，缺失时走绑定邮箱流程（仅 WeChat/KOOK）。
   */
  const handleOAuthLogin = async (
    loading: boolean,
    setLoading: (v: boolean) => void,
    openOAuth: () => Promise<OAuthCallbackData | null>,
    mayReturnEmail = false,
  ): Promise<void> => {
    if (loading) return;
    setLoading(true);
    setFeedback(null);

    try {
      const data = await openOAuth();

      if (!data) {
        setFeedback({ type: 'error', text: t('oauth.feedback.loginCancelled', { defaultValue: '登录已取消或超时' }) });
        return;
      }

      const { status, token, tempToken, username, email } = data;

      if (status === 'LOGIN' && token) {
        updateSessionToken(token);
        setFeedback({ type: 'success', text: t('settings.user.feedback.loginSuccess', { defaultValue: '登录成功' }) });
        await navigateToUserCenter();
      } else if (status === 'SET_PASSWORD' && tempToken) {
        if (mayReturnEmail && !email) {
          setBindEmail({ tempToken, suggestedUsername: username || '' });
        } else {
          setSetPassword({ tempToken, suggestedUsername: username || '', email: email || '' });
        }
      } else if (status === 'BIND_OAUTH' && tempToken) {
        setBindOAuth({ tempToken, username: username || '', email: email || '' });
      } else {
        setFeedback({ type: 'error', text: data.message || t('settings.user.feedback.operationFailed', { defaultValue: '操作失败' }) });
      }
    } catch {
      setFeedback({ type: 'error', text: t('settings.user.feedback.operationFailed', { defaultValue: '操作失败' }) });
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubLogin = (): Promise<void> =>
    handleOAuthLogin(githubLoading, setGithubLoading, openGitHubOAuth);

  const handleMicrosoftLogin = (): Promise<void> =>
    handleOAuthLogin(microsoftLoading, setMicrosoftLoading, openMicrosoftOAuth);

  const handleWechatLogin = (): Promise<void> =>
    handleOAuthLogin(wechatLoading, setWechatLoading, openWechatOAuth, true);

  const handleGiteeLogin = (): Promise<void> =>
    handleOAuthLogin(giteeLoading, setGiteeLoading, openGiteeOAuth);

  const handleKookLogin = (): Promise<void> =>
    handleOAuthLogin(kookLoading, setKookLoading, openKookOAuth, true);

  return {
    account,
    setAccount,
    verificationEmail,
    maskedVerificationEmail,
    emailCode,
    setEmailCode,
    password,
    setPassword,
    passwordVisible,
    setPasswordVisible,
    submitting,
    sendingCode,
    sendCooldownSeconds,
    needsEmailVerification,
    isEmailAccount,
    feedback,
    handleSendCode,
    handleSubmit,
    setRegister,
    setResetPassword,
    returnFromAuth,
    githubLoading,
    handleGitHubLogin,
    microsoftLoading,
    handleMicrosoftLogin,
    wechatLoading,
    handleWechatLogin,
    giteeLoading,
    handleGiteeLogin,
    kookLoading,
    handleKookLogin,
    disabledProviders,
    t,
  };
}
