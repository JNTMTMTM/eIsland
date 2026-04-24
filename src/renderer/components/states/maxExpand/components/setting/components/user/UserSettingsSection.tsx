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
 * @file UserSettingsSection.tsx
 * @description 设置页面 - 用户中心区块（登录/注册/资料/登出/注销）
 * @author 鸡哥
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
  closeUserPaymentOrder,
  fetchUserPaymentOrders,
  fetchProMonthPricing,
  fetchUserProfile,
  logoutUser,
  refreshUserToken,
  sendUserEmailCode,
  unregisterUser,
  updateUserPassword,
  updateUserProfile,
  uploadUserAvatar,
  type UserPaymentOrderData,
} from '../../../../../../../api/user/userAccountApi';
import { runSliderCaptcha } from '../../../../../../../utils/sliderCaptcha';
import useIslandStore from '../../../../../../../store/slices';
import {
  clearLocalAccount,
  readLocalProfile,
  readLocalToken,
  subscribeUserAccountSessionChanged,
  writeLocalProfile,
  writeLocalToken,
  type UserAccountGender,
  type UserAccountProfile,
} from '../../../../../../../utils/userAccount';
import { SvgIcon } from '../../../../../../../utils/SvgIcon';

type FeedbackType = 'success' | 'error' | 'info';
type UserProfilePage = 'info' | 'edit' | 'password' | 'pro' | 'orders' | 'account';

interface Feedback {
  type: FeedbackType;
  text: string;
}

type ProfileFeedbackScope = 'profile' | 'password' | 'account';

interface UserSettingsSectionProps {
  initialProfilePage?: UserProfilePage;
}

const GENDER_VALUES: UserAccountGender[] = ['male', 'female', 'custom', 'undisclosed'];
const USER_PROFILE_PAGES: UserProfilePage[] = ['info', 'edit', 'password', 'pro', 'orders', 'account'];
const EMAIL_PATTERN = /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

const getGenderIcon = (gender: UserAccountGender | null | undefined): string => {
  if (gender === 'male') return SvgIcon.BOY;
  if (gender === 'female') return SvgIcon.GIRL;
  if (gender === 'custom') return SvgIcon.DIY;
  return SvgIcon.UNKNOWN;
};

const shouldKeepGenderIconOriginalColor = (gender: UserAccountGender | null | undefined): boolean => {
  return gender === 'male' || gender === 'female';
};

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return '—';
  return value.replace('T', ' ');
};

const normalizeRoleValue = (value: string): string => {
  return value.trim().toLowerCase().replace(/^role_/, '');
};

const getRoleFromToken = (token: string | null | undefined): string | null => {
  if (!token) return null;
  const rawToken = token.trim().replace(/^bearer\s+/i, '');
  const parts = rawToken.split('.');
  if (parts.length < 2 || !parts[1]) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const normalized = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(window.atob(normalized)) as {
      role?: unknown;
      authorities?: unknown;
      authority?: unknown;
    };
    if (typeof payload.role === 'string' && payload.role.trim()) {
      return normalizeRoleValue(payload.role);
    }
    const authorityList = Array.isArray(payload.authorities)
      ? payload.authorities
      : [payload.authority];
    const validAuthority = authorityList.find((authority) => typeof authority === 'string' && authority.trim());
    if (typeof validAuthority === 'string') {
      return normalizeRoleValue(validAuthority);
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * 用户中心设置区块。未登录时显示登录/注册；登录后显示资料修改、登出、注销操作。
 * @returns 用户中心设置面板。
 */
export function UserSettingsSection({ initialProfilePage = 'info' }: UserSettingsSectionProps): ReactElement {
  const { t, i18n } = useTranslation();
  const { setLogin, setRegister, setPayment } = useIslandStore();
  const [token, setToken] = useState<string | null>(() => readLocalToken());
  const [profile, setProfile] = useState<UserAccountProfile | null>(() => readLocalProfile());
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string>('');

  const [editAvatar, setEditAvatar] = useState<string | null>(null);
  const [editGender, setEditGender] = useState<UserAccountGender>('undisclosed');
  const [editGenderCustom, setEditGenderCustom] = useState('');
  const [editBirthday, setEditBirthday] = useState('');
  const [editNewPassword, setEditNewPassword] = useState('');
  const [editConfirmPassword, setEditConfirmPassword] = useState('');
  const [editPasswordEmailCode, setEditPasswordEmailCode] = useState('');
  const [sendingPasswordCode, setSendingPasswordCode] = useState(false);
  const [passwordCodeCooldownSeconds, setPasswordCodeCooldownSeconds] = useState(0);
  const [editNewPasswordVisible, setEditNewPasswordVisible] = useState(false);
  const [editConfirmPasswordVisible, setEditConfirmPasswordVisible] = useState(false);
  const [avatarUploadFeedback, setAvatarUploadFeedback] = useState<Feedback | null>(null);
  const [profileFeedback, setProfileFeedback] = useState<Feedback | null>(null);
  const [profileFeedbackScope, setProfileFeedbackScope] = useState<ProfileFeedbackScope>('profile');
  const [passwordCodeFeedback, setPasswordCodeFeedback] = useState<Feedback | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [unregisterPassword, setUnregisterPassword] = useState('');
  const [unregisterEmailCode, setUnregisterEmailCode] = useState('');
  const [unregisterPasswordVisible, setUnregisterPasswordVisible] = useState(false);
  const [unregisterConfirmVisible, setUnregisterConfirmVisible] = useState(false);
  const [sendingUnregisterCode, setSendingUnregisterCode] = useState(false);
  const [unregisterCodeCooldownSeconds, setUnregisterCodeCooldownSeconds] = useState(0);
  const [unregisterCodeFeedback, setUnregisterCodeFeedback] = useState<Feedback | null>(null);
  const [unregisterSubmitting, setUnregisterSubmitting] = useState(false);

  const [logoutSubmitting, setLogoutSubmitting] = useState(false);
  const [userProfilePage, setUserProfilePage] = useState<UserProfilePage>(initialProfilePage);
  const [proMonthPriceLabel, setProMonthPriceLabel] = useState('');
  const [proMonthPricingLoading, setProMonthPricingLoading] = useState(false);
  const [freePlanDesc, setFreePlanDesc] = useState('');
  const [proPlanDesc, setProPlanDesc] = useState('');
  const [freePlanFeatures, setFreePlanFeatures] = useState<string[]>([]);
  const [proPlanFeatures, setProPlanFeatures] = useState<string[]>([]);
  const [userOrders, setUserOrders] = useState<UserPaymentOrderData[]>([]);
  const [loadingUserOrders, setLoadingUserOrders] = useState(false);
  const [ordersFeedback, setOrdersFeedback] = useState<Feedback | null>(null);
  const [orderActionOutTradeNo, setOrderActionOutTradeNo] = useState('');

  const currentUserProfilePageLabel = t(`settings.user.pages.${userProfilePage}`, {
    defaultValue: userProfilePage === 'info'
      ? '用户信息'
      : userProfilePage === 'edit'
        ? '修改信息'
        : userProfilePage === 'password'
          ? '修改密码'
          : userProfilePage === 'pro'
            ? 'PRO功能'
            : userProfilePage === 'orders'
              ? '我的订单'
            : '关于账户',
  });

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const userProfilePageRef = useRef<UserProfilePage>('info');
  const profilePagesLayoutRef = useRef<HTMLDivElement | null>(null);
  userProfilePageRef.current = userProfilePage;

  useEffect(() => {
    setUserProfilePage(initialProfilePage);
  }, [initialProfilePage]);

  const resetToLoggedOut = useCallback((): void => {
    clearLocalAccount();
    setToken(null);
    setProfile(null);
    setProfileError('');
    setAvatarUploadFeedback(null);
    setProfileFeedback(null);
    setProfileFeedbackScope('profile');
    setPasswordCodeFeedback(null);
    setUnregisterConfirmVisible(false);
    setUnregisterPassword('');
    setUnregisterEmailCode('');
    setUnregisterPasswordVisible(false);
    setSendingUnregisterCode(false);
    setUnregisterCodeCooldownSeconds(0);
    setUnregisterCodeFeedback(null);
  }, []);

  const resetPasswordEditor = useCallback((): void => {
    setEditNewPassword('');
    setEditConfirmPassword('');
    setEditPasswordEmailCode('');
    setPasswordCodeCooldownSeconds(0);
    setPasswordCodeFeedback(null);
    setEditNewPasswordVisible(false);
    setEditConfirmPasswordVisible(false);
  }, []);

  const applyProfileToEditor = useCallback((p: UserAccountProfile): void => {
    setEditAvatar(p.avatar ?? null);
    setEditGender(p.gender ?? 'undisclosed');
    setEditGenderCustom(p.genderCustom ?? '');
    setEditBirthday(p.birthday ?? '');
    resetPasswordEditor();
  }, [resetPasswordEditor]);

  useEffect(() => {
    if (passwordCodeCooldownSeconds <= 0) return;
    const timer = window.setTimeout(() => {
      setPasswordCodeCooldownSeconds((v) => (v > 0 ? v - 1 : 0));
    }, 1000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [passwordCodeCooldownSeconds]);

  useEffect(() => {
    if (unregisterCodeCooldownSeconds <= 0) return;
    const timer = window.setTimeout(() => {
      setUnregisterCodeCooldownSeconds((v) => (v > 0 ? v - 1 : 0));
    }, 1000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [unregisterCodeCooldownSeconds]);

  const loadRemoteProfile = useCallback(async (currentToken: string): Promise<boolean> => {
    setLoadingProfile(true);
    setProfileError('');
    const result = await fetchUserProfile(currentToken);
    setLoadingProfile(false);
    if (!result.ok || !result.data) {
      if (result.code === 401 || result.code === 4011) {
        resetToLoggedOut();
        return false;
      }
      setProfileError(result.message || t('settings.user.feedback.loadFailed', { defaultValue: '加载资料失败' }));
      return false;
    }
    setProfile(result.data);
    writeLocalProfile(result.data);
    applyProfileToEditor(result.data);
    return true;
  }, [applyProfileToEditor, resetToLoggedOut, t]);

  const handleRefreshProfile = useCallback(async (): Promise<void> => {
    if (!token || loadingProfile) return;
    setProfileFeedbackScope('profile');
    setProfileFeedback(null);
    const refreshed = await refreshUserToken(token);
    if (!refreshed.ok || !refreshed.data?.token) {
      if (refreshed.code === 401 || refreshed.code === 4011) {
        resetToLoggedOut();
        return;
      }
      const ok = await loadRemoteProfile(token);
      setProfileFeedbackScope('profile');
      setProfileFeedback(ok
        ? { type: 'success', text: t('settings.user.feedback.refreshSuccess', { defaultValue: '资料已刷新' }) }
        : { type: 'error', text: t('settings.user.feedback.refreshFailed', { defaultValue: '刷新资料失败' }) });
      return;
    }
    const nextToken = refreshed.data.token;
    writeLocalToken(nextToken);
    setToken(nextToken);
    const ok = await loadRemoteProfile(nextToken);
    setProfileFeedbackScope('profile');
    setProfileFeedback(ok
      ? { type: 'success', text: t('settings.user.feedback.refreshSuccess', { defaultValue: '资料已刷新' }) }
      : { type: 'error', text: t('settings.user.feedback.refreshFailed', { defaultValue: '刷新资料失败' }) });
  }, [token, loadingProfile, loadRemoteProfile, resetToLoggedOut, t]);

  useEffect(() => {
    const syncSession = (): void => {
      setToken(readLocalToken());
      setProfile(readLocalProfile());
    };
    syncSession();
    return subscribeUserAccountSessionChanged(syncSession);
  }, []);

  useEffect(() => {
    if (!token) return;
    if (profile) {
      applyProfileToEditor(profile);
    }
    void loadRemoteProfile(token);
  }, [token, loadRemoteProfile, applyProfileToEditor]);

  useEffect(() => {
    if (!token) {
      setProMonthPriceLabel('');
      setProMonthPricingLoading(false);
      setFreePlanDesc('');
      setProPlanDesc('');
      setFreePlanFeatures([]);
      setProPlanFeatures([]);
      return;
    }

    let cancelled = false;
    const loadProMonthPricing = async (): Promise<void> => {
      setProMonthPricingLoading(true);
      const result = await fetchProMonthPricing(token);
      if (cancelled) return;
      if (!result.ok || !result.data) {
        setProMonthPriceLabel('');
        setProMonthPricingLoading(false);
        setFreePlanDesc('');
        setProPlanDesc('');
        setFreePlanFeatures([]);
        setProPlanFeatures([]);
        return;
      }
      const amountYuanRaw = typeof result.data.amountYuan === 'string' ? result.data.amountYuan.trim() : '';
      const amountYuan = amountYuanRaw || (typeof result.data.amountFen === 'number'
        ? (result.data.amountFen / 100).toFixed(2)
        : '');
      const cycle = String(result.data.billingCycle || '').toUpperCase() === 'MONTH'
        ? t('settings.user.pro.billingCycle.month', { defaultValue: '月' })
        : String(result.data.billingCycle || '').trim();
      if (!amountYuan) {
        setProMonthPriceLabel('');
      } else if (!cycle) {
        setProMonthPriceLabel(`¥${amountYuan}`);
      } else {
        setProMonthPriceLabel(`¥${amountYuan} / ${cycle}`);
      }
      setFreePlanDesc(typeof result.data.freeDesc === 'string' ? result.data.freeDesc.trim() : '');
      setProPlanDesc(typeof result.data.proDesc === 'string' ? result.data.proDesc.trim() : '');
      setFreePlanFeatures(Array.isArray(result.data.freeFeatures)
        ? result.data.freeFeatures.map((item) => String(item).trim()).filter((item) => !!item)
        : []);
      setProPlanFeatures(Array.isArray(result.data.proFeatures)
        ? result.data.proFeatures.map((item) => String(item).trim()).filter((item) => !!item)
        : []);
      setProMonthPricingLoading(false);
    };

    void loadProMonthPricing();
    return () => {
      cancelled = true;
    };
  }, [token, t]);

  useEffect(() => {
    const el = profilePagesLayoutRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent): void => {
      e.stopPropagation();
      const target = e.target as HTMLElement | null;
      const inDotNav = Boolean(target?.closest('.settings-user-page-dots'));
      if (inDotNav) {
        const currentIndex = USER_PROFILE_PAGES.indexOf(userProfilePageRef.current);
        if (currentIndex < 0) return;
        const nextIndex = e.deltaY > 0
          ? Math.min(currentIndex + 1, USER_PROFILE_PAGES.length - 1)
          : Math.max(currentIndex - 1, 0);
        if (nextIndex !== currentIndex) {
          e.preventDefault();
          setUserProfilePage(USER_PROFILE_PAGES[nextIndex]);
        }
        return;
      }
      if (target?.closest('input, textarea, select, button')) {
        return;
      }
      const mainEl = el.querySelector('.settings-user-profile-main') as HTMLElement | null;
      if (!mainEl) return;
      if (mainEl.scrollHeight > mainEl.clientHeight) {
        return;
      }
      const currentIndex = USER_PROFILE_PAGES.indexOf(userProfilePageRef.current);
      if (currentIndex < 0) return;
      const nextIndex = e.deltaY > 0
        ? Math.min(currentIndex + 1, USER_PROFILE_PAGES.length - 1)
        : Math.max(currentIndex - 1, 0);
      if (nextIndex !== currentIndex) {
        e.preventDefault();
        setUserProfilePage(USER_PROFILE_PAGES[nextIndex]);
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [token, profile]);

  const handleAvatarSelect = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setAvatarUploadFeedback({ type: 'error', text: t('settings.user.feedback.avatarTooLarge', { defaultValue: '头像文件不能超过 5MB' }) });
      return;
    }
    if (!file.type.startsWith('image/')) {
      setAvatarUploadFeedback({ type: 'error', text: t('settings.user.feedback.avatarNotImage', { defaultValue: '仅支持上传图片文件' }) });
      return;
    }
    setAvatarUploading(true);
    setAvatarUploadFeedback(null);
    try {
      const currentToken = readLocalToken();
      if (!currentToken) {
        throw new Error(t('settings.user.feedback.needLogin', { defaultValue: '请先登录后再上传头像' }));
      }
      const captchaAccount = (profile?.email || profile?.username || '').trim();
      if (!captchaAccount) {
        throw new Error(t('settings.user.feedback.needLogin', { defaultValue: '请先登录后再上传头像' }));
      }
      const captcha = await runSliderCaptcha(captchaAccount);
      if (!captcha) {
        return;
      }
      const url = await uploadUserAvatar(file, currentToken, captcha);
      const profileResult = await updateUserProfile(currentToken, { avatar: url });
      if (!profileResult.ok) {
        if (profileResult.code === 401 || profileResult.code === 4011) {
          resetToLoggedOut();
          return;
        }
        throw new Error(profileResult.message || t('settings.user.feedback.saveFailed', { defaultValue: '保存失败' }));
      }
      setProfile((prev) => {
        if (!prev) {
          return prev;
        }
        const nextProfile = { ...prev, avatar: url };
        writeLocalProfile(nextProfile);
        return nextProfile;
      });
      setEditAvatar(url);
      setAvatarUploadFeedback({ type: 'success', text: t('settings.user.feedback.avatarUploaded', { defaultValue: '头像已更新' }) });
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('settings.user.feedback.avatarUploadFailed', { defaultValue: '头像上传失败' });
      const isRateLimited = /\b429\b/.test(msg) || msg.includes('上传过于频繁') || msg.includes('too frequent');
      setAvatarUploadFeedback({
        type: 'error',
        text: isRateLimited
          ? t('settings.user.feedback.avatarUploadTooFrequent', { defaultValue: '头像上传过于频繁，请稍后再试' })
          : msg,
      });
    } finally {
      setAvatarUploading(false);
    }
  };

  const loadUserOrders = useCallback(async (): Promise<void> => {
    if (!token) {
      setUserOrders([]);
      setLoadingUserOrders(false);
      return;
    }
    setLoadingUserOrders(true);
    const result = await fetchUserPaymentOrders(token, 20);
    setLoadingUserOrders(false);
    if (!result.ok || !Array.isArray(result.data)) {
      if (result.code === 401 || result.code === 4011) {
        resetToLoggedOut();
        return;
      }
      setOrdersFeedback({ type: 'error', text: result.message || t('settings.user.orders.feedback.loadFailed', { defaultValue: '加载订单失败' }) });
      return;
    }
    setUserOrders(result.data);
    const hasPaidOrder = result.data.some((order) => String(order?.status || '').toUpperCase() === 'SUCCESS');
    if (hasPaidOrder) {
      await loadRemoteProfile(token);
    }
  }, [loadRemoteProfile, resetToLoggedOut, t, token]);

  useEffect(() => {
    if (userProfilePage !== 'orders' || !token) {
      return;
    }
    void loadUserOrders();
  }, [loadUserOrders, token, userProfilePage]);

  const handleSaveProfile = async (): Promise<void> => {
    if (!token || savingProfile || savingPassword) return;
    if (editBirthday && !/^\d{4}-\d{2}-\d{2}$/.test(editBirthday)) {
      setProfileFeedbackScope('profile');
      setProfileFeedback({ type: 'error', text: t('settings.user.feedback.birthdayInvalid', { defaultValue: '生日格式应为 yyyy-MM-dd' }) });
      return;
    }
    setSavingProfile(true);
    setProfileFeedbackScope('profile');
    setProfileFeedback(null);
    const payload: Parameters<typeof updateUserProfile>[1] = {
      avatar: editAvatar ?? null,
      gender: editGender,
      genderCustom: editGender === 'custom' ? editGenderCustom.trim() : null,
      birthday: editBirthday || null,
    };
    const profileResult = await updateUserProfile(token, payload);
    if (!profileResult.ok) {
      setSavingProfile(false);
      if (profileResult.code === 401 || profileResult.code === 4011) {
        resetToLoggedOut();
        return;
      }
      setProfileFeedbackScope('profile');
      setProfileFeedback({ type: 'error', text: profileResult.message || t('settings.user.feedback.saveFailed', { defaultValue: '保存失败' }) });
      return;
    }
    await loadRemoteProfile(token);
    setEditNewPassword('');
    setEditConfirmPassword('');
    setEditNewPasswordVisible(false);
    setEditConfirmPasswordVisible(false);
    setSavingProfile(false);
    setProfileFeedbackScope('profile');
    setProfileFeedback({ type: 'success', text: t('settings.user.feedback.saveSuccess', { defaultValue: '资料已更新' }) });
  };

  const handleChangePassword = async (): Promise<void> => {
    if (!token || savingPassword || savingProfile) return;
    if (!editPasswordEmailCode.trim()) {
      setProfileFeedbackScope('password');
      setProfileFeedback({ type: 'error', text: t('settings.user.feedback.emailCodeRequired', { defaultValue: '请输入邮箱验证码' }) });
      return;
    }
    if (!editNewPassword) {
      setProfileFeedbackScope('password');
      setProfileFeedback({ type: 'error', text: t('settings.user.feedback.passwordRequired', { defaultValue: '请输入密码' }) });
      return;
    }
    if (editNewPassword.length < 8) {
      setProfileFeedbackScope('password');
      setProfileFeedback({ type: 'error', text: t('settings.user.feedback.passwordTooShort', { defaultValue: '密码至少 8 位且包含字母与数字' }) });
      return;
    }
    if (!editConfirmPassword) {
      setProfileFeedbackScope('password');
      setProfileFeedback({ type: 'error', text: t('settings.user.feedback.passwordConfirmRequired', { defaultValue: '请再次输入新密码进行确认' }) });
      return;
    }
    if (editNewPassword !== editConfirmPassword) {
      setProfileFeedbackScope('password');
      setProfileFeedback({ type: 'error', text: t('settings.user.feedback.passwordConfirmMismatch', { defaultValue: '两次输入的新密码不一致' }) });
      return;
    }
    setSavingPassword(true);
    setProfileFeedbackScope('password');
    setProfileFeedback(null);
    setPasswordCodeFeedback(null);
    const passwordResult = await updateUserPassword(token, {
      password: editNewPassword,
      emailCode: editPasswordEmailCode.trim(),
    });
    if (!passwordResult.ok) {
      setSavingPassword(false);
      if (passwordResult.code === 401 || passwordResult.code === 4011) {
        resetToLoggedOut();
        return;
      }
      setProfileFeedbackScope('password');
      setProfileFeedback({ type: 'error', text: passwordResult.message || t('settings.user.feedback.saveFailed', { defaultValue: '保存失败' }) });
      return;
    }
    setEditNewPassword('');
    setEditConfirmPassword('');
    setEditPasswordEmailCode('');
    setPasswordCodeCooldownSeconds(0);
    setEditNewPasswordVisible(false);
    setEditConfirmPasswordVisible(false);
    setSavingPassword(false);
    setProfileFeedbackScope('password');
    setProfileFeedback({ type: 'success', text: t('settings.user.feedback.passwordChangeSuccess', { defaultValue: '密码已更新' }) });
  };

  const handleSendPasswordCode = async (): Promise<void> => {
    if (sendingPasswordCode || passwordCodeCooldownSeconds > 0 || savingPassword || savingProfile) {
      return;
    }
    setPasswordCodeFeedback(null);
    const email = (profile?.email || '').trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
      setPasswordCodeFeedback({ type: 'error', text: t('settings.user.feedback.emailInvalid', { defaultValue: '请输入有效邮箱地址' }) });
      return;
    }
    setSendingPasswordCode(true);
    let captchaTicket = '';
    let captchaRandstr = '';
    let captchaSign = '';
    try {
      const captcha = await runSliderCaptcha(email);
      if (!captcha) {
        setSendingPasswordCode(false);
        setPasswordCodeFeedback({ type: 'error', text: t('settings.user.feedback.captchaCancelled', { defaultValue: '请完成滑块验证后再发送验证码' }) });
        return;
      }
      captchaTicket = captcha.ticket;
      captchaRandstr = captcha.randstr;
      captchaSign = captcha.sign;
    } catch (err) {
      setSendingPasswordCode(false);
      const msg = err instanceof Error ? err.message : t('settings.user.feedback.emailCodeSendFailed', { defaultValue: '验证码发送失败' });
      setPasswordCodeFeedback({ type: 'error', text: msg });
      return;
    }

    const result = await sendUserEmailCode(email, 'RESET_PASSWORD', { ticket: captchaTicket, randstr: captchaRandstr, sign: captchaSign });
    setSendingPasswordCode(false);
    if (!result.ok) {
      setPasswordCodeFeedback({ type: 'error', text: result.message || t('settings.user.feedback.emailCodeSendFailed', { defaultValue: '验证码发送失败' }) });
      return;
    }
    const cooldown = Math.max(0, Number(result.data?.retryAfterSeconds || 60));
    if (cooldown > 0) {
      setPasswordCodeCooldownSeconds(cooldown);
    }
    setPasswordCodeFeedback({ type: 'success', text: t('settings.user.feedback.emailCodeSent', { defaultValue: '验证码已发送，请查收邮箱' }) });
  };

  const handleCancelProfileChanges = (): void => {
    if (!profile) return;
    setEditAvatar(profile.avatar ?? null);
    setEditGender(profile.gender ?? 'undisclosed');
    setEditGenderCustom(profile.genderCustom ?? '');
    setEditBirthday(profile.birthday ?? '');
    if (profileFeedbackScope === 'profile') {
      setProfileFeedback(null);
    }
    setProfileFeedbackScope('profile');
  };

  const handleCancelPasswordChanges = (): void => {
    resetPasswordEditor();
    if (profileFeedbackScope === 'password') {
      setProfileFeedback(null);
    }
    setProfileFeedbackScope('password');
  };

  const handleLogout = async (): Promise<void> => {
    if (!token || logoutSubmitting) return;
    const currentToken = token;
    setLogoutSubmitting(true);
    clearLocalAccount();
    setToken(null);
    setProfile(null);
    setProfileError('');
    setProfileFeedback(null);
    try {
      await logoutUser(currentToken);
    } catch {
      // ignore network errors, local cleanup already applied
    } finally {
      setLogoutSubmitting(false);
    }
  };

  const requestUnregister = (): void => {
    setUnregisterPassword('');
    setUnregisterEmailCode('');
    setUnregisterPasswordVisible(false);
    setUnregisterCodeCooldownSeconds(0);
    setUnregisterCodeFeedback(null);
    setUnregisterConfirmVisible(true);
  };

  const cancelUnregister = (): void => {
    setUnregisterConfirmVisible(false);
    setUnregisterPassword('');
    setUnregisterEmailCode('');
    setUnregisterPasswordVisible(false);
    setUnregisterCodeCooldownSeconds(0);
    setUnregisterCodeFeedback(null);
  };

  const handleSendUnregisterCode = async (): Promise<void> => {
    if (sendingUnregisterCode || unregisterCodeCooldownSeconds > 0 || unregisterSubmitting || savingProfile || savingPassword) {
      return;
    }
    setUnregisterCodeFeedback(null);
    const email = (profile?.email || '').trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
      setUnregisterCodeFeedback({ type: 'error', text: t('settings.user.feedback.emailInvalid', { defaultValue: '请输入有效邮箱地址' }) });
      return;
    }
    setSendingUnregisterCode(true);
    let captchaTicket = '';
    let captchaRandstr = '';
    let captchaSign = '';
    try {
      const captcha = await runSliderCaptcha(email);
      if (!captcha) {
        setSendingUnregisterCode(false);
        setUnregisterCodeFeedback({ type: 'error', text: t('settings.user.feedback.captchaCancelled', { defaultValue: '请完成滑块验证后再发送验证码' }) });
        return;
      }
      captchaTicket = captcha.ticket;
      captchaRandstr = captcha.randstr;
      captchaSign = captcha.sign;
    } catch (err) {
      setSendingUnregisterCode(false);
      const msg = err instanceof Error ? err.message : t('settings.user.feedback.emailCodeSendFailed', { defaultValue: '验证码发送失败' });
      setUnregisterCodeFeedback({ type: 'error', text: msg });
      return;
    }

    const result = await sendUserEmailCode(email, 'UNREGISTER', { ticket: captchaTicket, randstr: captchaRandstr, sign: captchaSign });
    setSendingUnregisterCode(false);
    if (!result.ok) {
      setUnregisterCodeFeedback({ type: 'error', text: result.message || t('settings.user.feedback.emailCodeSendFailed', { defaultValue: '验证码发送失败' }) });
      return;
    }
    const cooldown = Math.max(0, Number(result.data?.retryAfterSeconds || 60));
    if (cooldown > 0) {
      setUnregisterCodeCooldownSeconds(cooldown);
    }
    setUnregisterCodeFeedback({ type: 'success', text: t('settings.user.feedback.emailCodeSent', { defaultValue: '验证码已发送，请查收邮箱' }) });
  };

  const handleUnregister = async (): Promise<void> => {
    if (!token || unregisterSubmitting) return;
    if (!unregisterPassword.trim()) {
      return;
    }
    if (!unregisterEmailCode.trim()) {
      setProfileFeedbackScope('account');
      setProfileFeedback({ type: 'error', text: t('settings.user.feedback.emailCodeRequired', { defaultValue: '请输入邮箱验证码' }) });
      return;
    }
    setUnregisterSubmitting(true);
    const result = await unregisterUser(token, unregisterPassword, unregisterEmailCode.trim());
    setUnregisterSubmitting(false);
    if (!result.ok) {
      if (result.code === 401 || result.code === 4011) {
        resetToLoggedOut();
        return;
      }
      setProfileFeedbackScope('account');
      setProfileFeedback({ type: 'error', text: result.message || t('settings.user.feedback.operationFailed', { defaultValue: '操作失败' }) });
      return;
    }
    clearLocalAccount();
    setToken(null);
    setProfile(null);
    setUnregisterConfirmVisible(false);
    setUnregisterPassword('');
    setUnregisterEmailCode('');
    setUnregisterPasswordVisible(false);
    setUnregisterCodeCooldownSeconds(0);
    setUnregisterCodeFeedback(null);
  };

  const renderFeedback = (feedback: Feedback | null): ReactElement | null => {
    if (!feedback) return null;
    return (
      <div className={`settings-user-feedback settings-user-feedback--${feedback.type}`}>{feedback.text}</div>
    );
  };

  const getOrderStatusLabel = (status: string): string => {
    const normalized = String(status || '').toUpperCase();
    if (normalized === 'PAYING') return t('settings.user.payment.status.paying', { defaultValue: '待支付' });
    if (normalized === 'SUCCESS') return t('settings.user.payment.status.success', { defaultValue: '已支付' });
    if (normalized === 'CLOSED') return t('settings.user.payment.status.closed', { defaultValue: '已关闭' });
    if (normalized === 'FAILED') return t('settings.user.payment.status.failed', { defaultValue: '支付失败' });
    return t('settings.user.payment.status.unknown', { defaultValue: '未知' });
  };

  const getOrderStatusClassName = (status: string): string => {
    const normalized = String(status || '').toUpperCase();
    if (normalized === 'SUCCESS') return 'is-success';
    if (normalized === 'FAILED') return 'is-failed';
    if (normalized === 'CLOSED') return 'is-closed';
    if (normalized === 'PAYING') return 'is-paying';
    return 'is-unknown';
  };

  const handleOpenOrderPayment = (order: UserPaymentOrderData): void => {
    const payUrl = (order.payUrl || order.qrCodeUrl || '').trim();
    if (!payUrl) {
      setOrdersFeedback({
        type: 'error',
        text: t('settings.user.payment.payUrlMissing', { defaultValue: '订单创建成功但未返回支付链接，请稍后重试。' }),
      });
      return;
    }
    window.api.clipboardOpenUrl(payUrl).catch(() => {
      setOrdersFeedback({
        type: 'error',
        text: t('settings.user.payment.openPayFailed', { defaultValue: '无法打开支付页面，请稍后重试。' }),
      });
    });
  };

  const handleCloseOrder = async (order: UserPaymentOrderData): Promise<void> => {
    if (!token || !order.outTradeNo || orderActionOutTradeNo) return;
    setOrderActionOutTradeNo(order.outTradeNo);
    setOrdersFeedback(null);
    const result = await closeUserPaymentOrder(token, order.outTradeNo);
    setOrderActionOutTradeNo('');
    if (!result.ok) {
      if (result.code === 401 || result.code === 4011) {
        resetToLoggedOut();
        return;
      }
      setOrdersFeedback({
        type: 'error',
        text: result.message || t('settings.user.orders.feedback.closeFailed', { defaultValue: '关闭订单失败，请稍后重试' }),
      });
      return;
    }
    setOrdersFeedback({ type: 'success', text: t('settings.user.orders.feedback.closeSuccess', { defaultValue: '订单已关闭' }) });
    await loadUserOrders();
  };

  const renderOrdersPage = (): ReactElement => (
    <div className="settings-user-page-panel settings-user-orders-panel">
        <div className="settings-user-card settings-user-orders-head-card">
          <div className="settings-user-card-title-row settings-user-orders-title-row">
            <div className="settings-user-form-title">{t('settings.user.orders.title', { defaultValue: '我的订单' })}</div>
            <div className="settings-user-card-title-hint">
              {t('settings.user.orders.subtitle', { defaultValue: '查询当前账号订单，并可继续支付或关闭待支付订单' })}
            </div>
            <button
              type="button"
              className="settings-user-secondary-btn settings-user-orders-refresh-btn"
              disabled={loadingUserOrders || !!orderActionOutTradeNo}
              onClick={() => void loadUserOrders()}
            >
              {loadingUserOrders
                ? (
                  <>
                    <span className="settings-user-orders-inline-spinner" aria-hidden="true" />
                    {t('settings.user.orders.actions.refreshing', { defaultValue: '刷新中…' })}
                  </>
                )
                : t('settings.user.orders.actions.refresh', { defaultValue: '刷新订单' })}
            </button>
          </div>
        </div>

        {ordersFeedback ? renderFeedback(ordersFeedback) : null}

        {loadingUserOrders && userOrders.length === 0 ? (
          <div className="settings-user-card settings-user-orders-empty">
            <div className="settings-user-orders-loading-wrap">
              <span className="settings-user-orders-spinner" aria-hidden="true" />
              <span>{t('settings.user.orders.loading', { defaultValue: '订单加载中…' })}</span>
            </div>
          </div>
        ) : null}

        {!loadingUserOrders && userOrders.length === 0 ? (
          <div className="settings-user-card settings-user-orders-empty">
            {t('settings.user.orders.empty', { defaultValue: '暂无订单记录' })}
          </div>
        ) : null}

        {userOrders.map((order) => {
          const status = String(order.status || '').toUpperCase();
          const isPaying = status === 'PAYING';
          const amountLabel = typeof order.amountFen === 'number' ? `¥${(order.amountFen / 100).toFixed(2)}` : '--';
          return (
            <div key={order.outTradeNo} className="settings-user-card settings-user-order-item-card">
              <div className="settings-user-order-item-row">
                <span className="settings-user-order-item-label">{t('settings.user.payment.orderNoLabel', { defaultValue: '订单号' })}</span>
                <span className="settings-user-order-item-value">{order.outTradeNo || '--'}</span>
              </div>
              <div className="settings-user-order-item-row">
                <span className="settings-user-order-item-label">{t('settings.user.payment.payAmountLabel', { defaultValue: '付款金额' })}</span>
                <span className="settings-user-order-item-value">{amountLabel}</span>
              </div>
              <div className="settings-user-order-item-row">
                <span className="settings-user-order-item-label">{t('settings.user.payment.payStatusLabel', { defaultValue: '支付状态' })}</span>
                <span className={`settings-user-order-status-badge ${getOrderStatusClassName(status)}`}>{getOrderStatusLabel(status)}</span>
              </div>
              <div className="settings-user-order-item-row">
                <span className="settings-user-order-item-label">{t('settings.user.payment.expireLabel', { defaultValue: '订单到期时间' })}</span>
                <span className="settings-user-order-item-value">{formatDateTime(order.expireAt)}</span>
              </div>
              {isPaying ? (
                <div className="settings-user-order-actions">
                  <button
                    type="button"
                    className="settings-user-primary-btn"
                    disabled={!!orderActionOutTradeNo}
                    onClick={() => handleOpenOrderPayment(order)}
                  >
                    {t('settings.user.orders.actions.continuePay', { defaultValue: '继续支付' })}
                  </button>
                  <button
                    type="button"
                    className="settings-user-secondary-btn"
                    disabled={!!orderActionOutTradeNo}
                    onClick={() => void handleCloseOrder(order)}
                  >
                    {orderActionOutTradeNo === order.outTradeNo
                      ? t('settings.user.orders.actions.closing', { defaultValue: '关闭中…' })
                      : t('settings.user.orders.actions.closeOrder', { defaultValue: '关闭订单' })}
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
    </div>
  );

  const renderProfileFeedback = (scope: ProfileFeedbackScope): ReactElement | null => {
    if (profileFeedbackScope !== scope) return null;
    return renderFeedback(profileFeedback);
  };

  const renderAuthEntry = (): ReactElement => {
    return (
      <div className="settings-user-auth">
        <div className="settings-user-auth-entry-title">
          {t('settings.user.auth.entryTitle', { defaultValue: '登录后可管理头像、资料与账号安全设置' })}
        </div>
        <div className="settings-user-auth-entry-actions">
          <button
            type="button"
            className="settings-user-primary-btn"
            onClick={() => setLogin()}
          >
            {t('settings.user.auth.gotoLogin', { defaultValue: '前往登录' })}
          </button>
          <button
            type="button"
            className="settings-user-secondary-btn"
            onClick={() => setRegister()}
          >
            {t('settings.user.auth.gotoRegister', { defaultValue: '前往注册' })}
          </button>
        </div>
        <div className="settings-user-auth-hint">
          {t('settings.user.auth.hint', { defaultValue: '账号体系由 pyisland-admin 提供，登录状态仅存储在本机。' })}
        </div>
      </div>
    );
  };

  const renderProfileEditor = (): ReactElement => {
    const displayAvatar = editAvatar || profile?.avatar || '';
    const avatarUploadSuccessFeedback = avatarUploadFeedback?.type === 'success'
      ? avatarUploadFeedback
      : null;
    const profilePageItems: Array<{ id: UserProfilePage; label: string }> = [
      { id: 'info', label: t('settings.user.pages.info', { defaultValue: '用户信息' }) },
      { id: 'edit', label: t('settings.user.pages.edit', { defaultValue: '修改信息' }) },
      { id: 'password', label: t('settings.user.pages.password', { defaultValue: '修改密码' }) },
      { id: 'pro', label: t('settings.user.pages.pro', { defaultValue: 'PRO功能' }) },
      { id: 'orders', label: t('settings.user.pages.orders', { defaultValue: '我的订单' }) },
      { id: 'account', label: t('settings.user.pages.account', { defaultValue: '关于账户' }) },
    ];
    const profileRole = (profile as { role?: unknown } | null)?.role;
    const normalizedProfileRole = typeof profileRole === 'string' ? normalizeRoleValue(profileRole) : null;
    const isProUser = normalizedProfileRole === 'pro' || getRoleFromToken(token) === 'pro';

    const renderInfoPage = (): ReactElement => {
      const genderValue: UserAccountGender = profile?.gender ?? 'undisclosed';
      const genderLabel = t(`settings.user.gender.${genderValue}`, { defaultValue: genderValue });

      return (
        <div className="settings-user-page-panel settings-user-info-panel">
          {profileError && <div className="settings-user-feedback settings-user-feedback--error">{profileError}</div>}
          {renderProfileFeedback('profile')}

          <div className={`settings-user-info-summary-card${isProUser ? ' settings-user-info-summary-card--pro' : ''}`}>
            <div className="settings-user-info-summary-header">
              <div className="settings-user-info-summary-avatar">
                {displayAvatar
                  ? <img src={displayAvatar} alt={profile?.username ?? ''} />
                  : <span className="settings-user-card-avatar-placeholder">{(profile?.username || '?').slice(0, 1)}</span>}
              </div>
              <div className="settings-user-info-summary-identity">
                <div className="settings-user-info-summary-name">
                  {isProUser && (
                    <img
                      className="settings-user-info-pro-icon"
                      src={SvgIcon.PRO}
                      alt="PRO"
                    />
                  )}
                  {profile?.username ?? '—'}
                  <img
                    className={`settings-user-info-gender-icon${shouldKeepGenderIconOriginalColor(genderValue) ? ' settings-user-info-gender-icon--original' : ''}`}
                    src={getGenderIcon(genderValue)}
                    alt={genderLabel}
                  />
                </div>
                <div className="settings-user-info-summary-email">{profile?.email ?? '—'}</div>
              </div>
              <div className="settings-user-info-summary-meta">
                <div className="settings-user-info-summary-meta-row">
                  <span className="settings-user-info-summary-label">{t('settings.user.card.memberSince', { defaultValue: '加入时间' })}</span>
                  <span className="settings-user-info-summary-value">{formatDateTime(profile?.createdAt)}</span>
                </div>
                <div className="settings-user-info-summary-meta-row">
                  <span className="settings-user-info-summary-label">{t('settings.user.card.proExpireAt', { defaultValue: 'Pro到期时间' })}</span>
                  <span className="settings-user-info-summary-value">{formatDateTime(profile?.proExpireAt)}</span>
                </div>
              </div>
            </div>
            <div className="settings-user-info-summary-divider" />
            <div className="settings-user-info-summary-row">
              <span className="settings-user-info-summary-label">{t('settings.user.fields.gender', { defaultValue: '性别' })}</span>
              <span className="settings-user-info-summary-value">{genderLabel}</span>
            </div>
            <div className="settings-user-info-summary-row">
              <span className="settings-user-info-summary-label">{t('settings.user.fields.birthday', { defaultValue: '生日' })}</span>
              <span className="settings-user-info-summary-value">{profile?.birthday ?? '—'}</span>
            </div>
          </div>

          <div className="settings-user-info-nav-cards">
            <button
              type="button"
              className="settings-index-card settings-user-pro-nav-card--outline"
              onClick={() => setUserProfilePage('pro')}
            >
              <span className="settings-index-card-title">{t('settings.user.pages.pro', { defaultValue: 'PRO功能' })}</span>
              <span className="settings-index-card-desc">{t('settings.user.infoNav.proDesc', { defaultValue: '查看 Free 与 Pro 计划权益及当前订阅价格' })}</span>
              <img className="settings-index-card-layout-icon" src={SvgIcon.PRO} alt="" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="settings-index-card"
              onClick={() => {
                setOrdersFeedback(null);
                setUserProfilePage('orders');
              }}
            >
              <span className="settings-index-card-title">{t('settings.user.pages.orders', { defaultValue: '我的订单' })}</span>
              <span className="settings-index-card-desc">{t('settings.user.infoNav.ordersDesc', { defaultValue: '查看订单状态、继续支付或主动关闭待支付订单' })}</span>
              <img className="settings-index-card-layout-icon" src={SvgIcon.UPDATE} alt="" aria-hidden="true" />
            </button>
            <button type="button" className="settings-index-card" onClick={() => setUserProfilePage('edit')}>
              <span className="settings-index-card-title">{t('settings.user.pages.edit', { defaultValue: '修改信息' })}</span>
              <span className="settings-index-card-desc">{t('settings.user.infoNav.editDesc', { defaultValue: '修改性别、生日等基本资料' })}</span>
              <img className="settings-index-card-layout-icon" src={SvgIcon.USER} alt="" aria-hidden="true" />
            </button>
            <button type="button" className="settings-index-card" onClick={() => setUserProfilePage('edit')}>
              <span className="settings-index-card-title">{t('settings.user.sections.avatar', { defaultValue: '修改头像' })}</span>
              <span className="settings-index-card-desc">{t('settings.user.infoNav.avatarDesc', { defaultValue: '上传或更换账号头像' })}</span>
              <img className="settings-index-card-layout-icon" src={SvgIcon.DIY} alt="" aria-hidden="true" />
            </button>
            <button type="button" className="settings-index-card" onClick={() => setUserProfilePage('password')}>
              <span className="settings-index-card-title">{t('settings.user.pages.password', { defaultValue: '修改密码' })}</span>
              <span className="settings-index-card-desc">{t('settings.user.infoNav.passwordDesc', { defaultValue: '通过邮箱验证码修改登录密码' })}</span>
              <img className="settings-index-card-layout-icon" src={SvgIcon.SHORTCUT_KEY} alt="" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="settings-index-card"
              onClick={() => void handleRefreshProfile()}
              disabled={loadingProfile}
            >
              <span className="settings-index-card-title">{t('settings.user.actions.refresh', { defaultValue: '刷新资料' })}</span>
              <span className="settings-index-card-desc">{t('settings.user.actions.refreshingHint', { defaultValue: '同步服务器中的最新个人信息' })}</span>
              <img className="settings-index-card-layout-icon" src={SvgIcon.UPDATE} alt="" aria-hidden="true" />
            </button>
            <button type="button" className="settings-index-card" onClick={() => setUserProfilePage('account')}>
              <span className="settings-index-card-title">{t('settings.user.actions.logout', { defaultValue: '退出登录' })}</span>
              <span className="settings-index-card-desc">{t('settings.user.infoNav.logoutDesc', { defaultValue: '退出当前账号或注销' })}</span>
              <img className="settings-index-card-layout-icon" src={SvgIcon.POWER_OFF} alt="" aria-hidden="true" />
            </button>
          </div>
        </div>
      );
    };

    const renderEditPage = (): ReactElement => (
      <div className="settings-user-page-panel settings-user-edit-scroll">
        {profileError && <div className="settings-user-feedback settings-user-feedback--error">{profileError}</div>}
        <div className="settings-user-form settings-user-edit-cards">
          <div className="settings-user-edit-card settings-user-avatar-edit-card">
            <div className="settings-user-edit-card-head">
              {avatarUploadSuccessFeedback ? null : <div className="settings-user-form-title">{t('settings.user.sections.avatar', { defaultValue: '头像' })}</div>}
            </div>
            <div className="settings-user-avatar-row">
              <div className="settings-user-avatar-preview-shell">
                <div className="settings-user-avatar-preview">
                  {displayAvatar
                    ? <img src={displayAvatar} alt="avatar preview" />
                    : <span className="settings-user-card-avatar-placeholder">?</span>}
                </div>
              </div>
              <div className="settings-user-avatar-actions">
                <div className="settings-user-avatar-action-main">
                  <button
                    type="button"
                    className="settings-user-secondary-btn"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarUploading}
                  >
                    {avatarUploading ? t('settings.user.actions.uploading', { defaultValue: '上传中…' }) : t('settings.user.actions.chooseAvatar', { defaultValue: '选择图片上传' })}
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => void handleAvatarSelect(e)}
                  />
                </div>
                {renderFeedback(avatarUploadFeedback)}
              </div>
            </div>
          </div>

          <div className="settings-user-edit-card">
            <div className="settings-user-edit-card-head">
              <div className="settings-user-form-title">{t('settings.user.sections.profile', { defaultValue: '基本资料' })}</div>
              <div className="settings-user-edit-card-subtitle">{t('settings.user.sections.profileHint', { defaultValue: '完善公开资料信息，便于账号识别' })}</div>
            </div>
            <label className="settings-field">
              <span className="settings-field-label">{t('settings.user.fields.gender', { defaultValue: '性别' })}</span>
              <div className="settings-user-gender-options">
                {GENDER_VALUES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`settings-user-gender-btn${editGender === value ? ' active' : ''}`}
                    onClick={() => setEditGender(value)}
                  >
                    {t(`settings.user.gender.${value}`, { defaultValue: value })}
                  </button>
                ))}
              </div>
            </label>
            {editGender === 'custom' && (
              <label className="settings-field">
                <span className="settings-field-label">{t('settings.user.fields.genderCustom', { defaultValue: '自定义性别' })}</span>
                <input
                  className="settings-field-input"
                  value={editGenderCustom}
                  onChange={(e) => setEditGenderCustom(e.target.value)}
                  placeholder={t('settings.user.fields.genderCustomPlaceholder', { defaultValue: '最长 64 个字符' })}
                  maxLength={64}
                />
              </label>
            )}
            <label className="settings-field">
              <span className="settings-field-label">{t('settings.user.fields.birthday', { defaultValue: '生日' })}</span>
              <input
                className="settings-field-input"
                type="date"
                lang={i18n.resolvedLanguage || i18n.language}
                value={editBirthday}
                onChange={(e) => setEditBirthday(e.target.value)}
              />
            </label>
            {renderProfileFeedback('profile')}
            <div className="settings-user-edit-action-stack">
              <button
                type="button"
                className="settings-user-primary-btn"
                onClick={() => void handleSaveProfile()}
                disabled={savingProfile || savingPassword || loadingProfile}
              >
                {savingProfile ? t('settings.user.actions.saving', { defaultValue: '保存中…' }) : t('settings.user.actions.saveProfile', { defaultValue: '保存资料' })}
              </button>
              <button
                type="button"
                className="settings-user-secondary-btn settings-user-cancel-mark"
                onClick={handleCancelProfileChanges}
                disabled={savingProfile || savingPassword || loadingProfile}
              >
                {t('settings.user.actions.cancelChanges', { defaultValue: '取消更改' })}
              </button>
            </div>
          </div>

        </div>
      </div>
    );

    const renderPasswordPage = (): ReactElement => (
      <div className="settings-user-page-panel settings-user-edit-scroll">
        {profileError && <div className="settings-user-feedback settings-user-feedback--error">{profileError}</div>}
        <div className="settings-user-form settings-user-edit-cards">
          <div className="settings-user-edit-card">
            <div className="settings-user-edit-card-head">
              <div className="settings-user-form-title">{t('settings.user.sections.password', { defaultValue: '修改密码' })}</div>
              <div className="settings-user-edit-card-subtitle">{t('settings.user.sections.passwordHint', { defaultValue: '留空则保持当前密码不变' })}</div>
            </div>
            <label className="settings-field">
              <span className="settings-field-label">{t('settings.user.fields.emailCode', { defaultValue: '邮箱验证码' })}</span>
              <div className="settings-user-password-input-wrap">
                <input
                  className="settings-field-input"
                  type="text"
                  value={editPasswordEmailCode}
                  onChange={(e) => setEditPasswordEmailCode(e.target.value)}
                  placeholder={t('settings.user.fields.emailCodePlaceholder', { defaultValue: '请输入邮箱验证码' })}
                />
                <button
                  type="button"
                  className="settings-user-password-toggle"
                  onClick={() => void handleSendPasswordCode()}
                  disabled={sendingPasswordCode || passwordCodeCooldownSeconds > 0 || savingPassword || savingProfile}
                >
                  {sendingPasswordCode
                    ? t('settings.user.feedback.emailCodeSending', { defaultValue: '发送中…' })
                    : passwordCodeCooldownSeconds > 0
                      ? t('settings.user.actions.sendCodeCooldown', { defaultValue: '{{seconds}}s后重试', seconds: passwordCodeCooldownSeconds })
                      : t('settings.user.actions.sendCode', { defaultValue: '发送验证码' })}
                </button>
              </div>
            </label>
            {renderFeedback(passwordCodeFeedback)}
            <label className="settings-field">
              <span className="settings-field-label">{t('settings.user.fields.newPassword', { defaultValue: '新密码' })}</span>
              <div className="settings-user-password-input-wrap">
                <input
                  className="settings-field-input"
                  type={editNewPasswordVisible ? 'text' : 'password'}
                  value={editNewPassword}
                  onChange={(e) => setEditNewPassword(e.target.value)}
                  placeholder={t('settings.user.fields.newPasswordPlaceholder', { defaultValue: '留空则不修改，至少 8 位含字母数字' })}
                />
                <button
                  type="button"
                  className="settings-user-password-toggle"
                  onClick={() => setEditNewPasswordVisible((v) => !v)}
                  aria-label={editNewPasswordVisible
                    ? t('settings.user.actions.hidePassword', { defaultValue: '隐藏密码' })
                    : t('settings.user.actions.showPassword', { defaultValue: '显示密码' })}
                >
                  {editNewPasswordVisible
                    ? t('settings.user.actions.hide', { defaultValue: '隐藏' })
                    : t('settings.user.actions.show', { defaultValue: '显示' })}
                </button>
              </div>
            </label>
            <label className="settings-field">
              <span className="settings-field-label">{t('settings.user.fields.confirmPassword', { defaultValue: '确认新密码' })}</span>
              <div className="settings-user-password-input-wrap">
                <input
                  className="settings-field-input"
                  type={editConfirmPasswordVisible ? 'text' : 'password'}
                  value={editConfirmPassword}
                  onChange={(e) => setEditConfirmPassword(e.target.value)}
                  placeholder={t('settings.user.fields.confirmPasswordPlaceholder', { defaultValue: '请再次输入新密码' })}
                />
                <button
                  type="button"
                  className="settings-user-password-toggle"
                  onClick={() => setEditConfirmPasswordVisible((v) => !v)}
                  aria-label={editConfirmPasswordVisible
                    ? t('settings.user.actions.hidePassword', { defaultValue: '隐藏密码' })
                    : t('settings.user.actions.showPassword', { defaultValue: '显示密码' })}
                >
                  {editConfirmPasswordVisible
                    ? t('settings.user.actions.hide', { defaultValue: '隐藏' })
                    : t('settings.user.actions.show', { defaultValue: '显示' })}
                </button>
              </div>
            </label>
            {renderProfileFeedback('password')}
            <div className="settings-user-edit-action-stack">
              <button
                type="button"
                className="settings-user-primary-btn"
                onClick={() => void handleChangePassword()}
                disabled={savingPassword || savingProfile || loadingProfile}
              >
                {savingPassword
                  ? t('settings.user.actions.changingPassword', { defaultValue: '修改中…' })
                  : t('settings.user.actions.changePassword', { defaultValue: '修改密码' })}
              </button>
              <button
                type="button"
                className="settings-user-secondary-btn settings-user-cancel-mark"
                onClick={handleCancelPasswordChanges}
                disabled={savingProfile || savingPassword || loadingProfile}
              >
                {t('settings.user.actions.cancelChanges', { defaultValue: '取消更改' })}
              </button>
            </div>
          </div>
        </div>
      </div>
    );

    const renderAccountPage = (): ReactElement => (
      <div className="settings-user-page-panel">
        <div className="settings-user-card">
          <div className="settings-user-card-title-row">
            <div className="settings-user-form-title">{t('settings.user.pages.account', { defaultValue: '关于账户' })}</div>
            <div className="settings-user-card-title-hint">
              {t('settings.user.auth.hint', { defaultValue: '登录注册服务由 eIsland server 提供' })}
            </div>
          </div>
          {renderProfileFeedback('account')}
          <div className="settings-user-actions-row">
            <button
              type="button"
              className="settings-user-secondary-btn"
              onClick={() => void handleLogout()}
              disabled={logoutSubmitting}
            >
              {logoutSubmitting ? t('settings.user.actions.loggingOut', { defaultValue: '登出中…' }) : t('settings.user.actions.logout', { defaultValue: '退出登录' })}
            </button>
          </div>
        </div>

        <div className="settings-user-danger-zone">
          <div className="settings-user-form-title danger">{t('settings.user.sections.danger', { defaultValue: '危险操作' })}</div>
          <div className="settings-user-danger-hint">
            {t('settings.user.danger.hint', { defaultValue: '注销后账号与关联资料将被立即删除，无法恢复，请谨慎操作。' })}
          </div>
          {!unregisterConfirmVisible ? (
            <button
              type="button"
              className="settings-user-danger-btn"
              onClick={requestUnregister}
            >
              {t('settings.user.actions.unregister', { defaultValue: '注销账号' })}
            </button>
          ) : (
            <div className="settings-user-unregister-confirm">
              <label className="settings-field">
                <span className="settings-field-label">{t('settings.user.fields.emailCode', { defaultValue: '邮箱验证码' })}</span>
                <div className="settings-user-password-input-wrap">
                  <input
                    className="settings-field-input"
                    type="text"
                    value={unregisterEmailCode}
                    onChange={(e) => setUnregisterEmailCode(e.target.value)}
                    placeholder={t('settings.user.fields.emailCodePlaceholder', { defaultValue: '请输入邮箱验证码' })}
                  />
                  <button
                    type="button"
                    className="settings-user-password-toggle"
                    onClick={() => void handleSendUnregisterCode()}
                    disabled={sendingUnregisterCode || unregisterCodeCooldownSeconds > 0 || unregisterSubmitting}
                  >
                    {sendingUnregisterCode
                      ? t('settings.user.feedback.emailCodeSending', { defaultValue: '发送中…' })
                      : unregisterCodeCooldownSeconds > 0
                        ? t('settings.user.actions.sendCodeCooldown', { defaultValue: '{{seconds}}s后重试', seconds: unregisterCodeCooldownSeconds })
                        : t('settings.user.actions.sendCode', { defaultValue: '发送验证码' })}
                  </button>
                </div>
              </label>
              {renderFeedback(unregisterCodeFeedback)}
              <label className="settings-field">
                <span className="settings-field-label">{t('settings.user.fields.currentPassword', { defaultValue: '当前密码' })}</span>
                <div className="settings-user-password-input-wrap">
                  <input
                    className="settings-field-input"
                    type={unregisterPasswordVisible ? 'text' : 'password'}
                    value={unregisterPassword}
                    onChange={(e) => setUnregisterPassword(e.target.value)}
                    placeholder={t('settings.user.fields.currentPasswordPlaceholder', { defaultValue: '输入当前密码进行确认' })}
                  />
                  <button
                    type="button"
                    className="settings-user-password-toggle"
                    onClick={() => setUnregisterPasswordVisible((v) => !v)}
                    aria-label={unregisterPasswordVisible
                      ? t('settings.user.actions.hidePassword', { defaultValue: '隐藏密码' })
                      : t('settings.user.actions.showPassword', { defaultValue: '显示密码' })}
                  >
                    {unregisterPasswordVisible
                      ? t('settings.user.actions.hide', { defaultValue: '隐藏' })
                      : t('settings.user.actions.show', { defaultValue: '显示' })}
                  </button>
                </div>
              </label>
              <div className="settings-user-actions-row">
                <button
                  type="button"
                  className="settings-user-danger-btn"
                  onClick={() => void handleUnregister()}
                  disabled={unregisterSubmitting || !unregisterPassword.trim() || !unregisterEmailCode.trim()}
                >
                  {unregisterSubmitting ? t('settings.user.actions.unregistering', { defaultValue: '注销中…' }) : t('settings.user.actions.confirmUnregister', { defaultValue: '确认注销' })}
                </button>
                <button
                  type="button"
                  className="settings-user-secondary-btn"
                  onClick={cancelUnregister}
                  disabled={unregisterSubmitting}
                >
                  {t('settings.user.actions.cancel', { defaultValue: '取消' })}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );

    const renderProPage = (): ReactElement => (
      <div className="settings-user-page-panel settings-user-pro-panel">
        {(() => {
          const freeDescText = freePlanDesc || t('settings.user.pro.free.desc', { defaultValue: '基础功能可用，适合轻度日常使用。' });
          const proDescText = proPlanDesc || t('settings.user.pro.pro.desc', { defaultValue: '完整高级能力与持续更新支持。' });
          const fallbackFreeFeatures = [
            t('settings.user.pro.free.feature1', { defaultValue: '基础灵动岛组件' }),
            t('settings.user.pro.free.feature2', { defaultValue: '常规设置与个性化' }),
            t('settings.user.pro.free.feature3', { defaultValue: '社区公开内容浏览' }),
          ];
          const fallbackProFeatures = [
            t('settings.user.pro.pro.feature1', { defaultValue: '全部 Free 权益' }),
            t('settings.user.pro.pro.feature2', { defaultValue: 'Pro 专属功能与扩展' }),
            t('settings.user.pro.pro.feature3', { defaultValue: '优先体验新功能' }),
          ];
          const freeFeatures = freePlanFeatures.length > 0 ? freePlanFeatures : fallbackFreeFeatures;
          const proFeatures = proPlanFeatures.length > 0 ? proPlanFeatures : fallbackProFeatures;

          return (
            <>
        <div className="settings-user-card settings-user-pro-intro-card">
          <div className="settings-user-form-title">{t('settings.user.pro.title', { defaultValue: '产品类型' })}</div>
          <div className="settings-user-card-title-hint">
            {t('settings.user.pro.subtitle', { defaultValue: '根据你的使用场景选择 Free 或 Pro 版本' })}
          </div>
        </div>

        <div className="settings-user-pro-grid">
          <div className="settings-user-card settings-user-pro-plan-card settings-user-pro-plan-card--free">
            <div className="settings-user-pro-plan-head">
              <div className="settings-user-pro-plan-name">{t('settings.user.pro.free.name', { defaultValue: 'Free' })}</div>
              <div className="settings-user-pro-plan-price">{t('settings.user.pro.free.price', { defaultValue: '¥0 / 月' })}</div>
            </div>
            <div className="settings-user-pro-plan-scroll">
              <div className="settings-user-pro-plan-desc">
                {freeDescText}
              </div>
              <ul className="settings-user-pro-plan-features">
                {freeFeatures.map((feature, index) => (
                  <li key={`free-feature-${index}`}>{feature}</li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              className="settings-user-secondary-btn"
              disabled
            >
              {t('settings.user.actions.currentPlan', { defaultValue: '当前可用' })}
            </button>
          </div>

          <div className="settings-user-card settings-user-pro-plan-card settings-user-pro-plan-card--pro">
            <div className="settings-user-pro-plan-head">
              <div className="settings-user-pro-plan-name">
                <img className="settings-user-info-pro-icon" src={SvgIcon.PRO} alt="PRO" />
                {t('settings.user.pro.pro.name', { defaultValue: 'Pro' })}
              </div>
              <div className="settings-user-pro-plan-price">
                {proMonthPricingLoading
                  ? t('settings.user.pro.pro.priceLoading', { defaultValue: '价格加载中…' })
                  : (proMonthPriceLabel || t('settings.user.pro.pro.priceUnavailable', { defaultValue: '价格待定' }))}
              </div>
            </div>
            <div className="settings-user-pro-plan-scroll">
              <div className="settings-user-pro-plan-desc">
                {proDescText}
              </div>
              <ul className="settings-user-pro-plan-features">
                {proFeatures.map((feature, index) => (
                  <li key={`pro-feature-${index}`}>{feature}</li>
                ))}
              </ul>
            </div>
            {isProUser ? (
              <button type="button" className="settings-user-primary-btn" disabled>
                {t('settings.user.actions.proActivated', { defaultValue: '已开通 Pro' })}
              </button>
            ) : (
              <button
                type="button"
                className="settings-user-primary-btn settings-user-pro-buy-link"
                onClick={() => setPayment()}
              >
                {t('settings.user.actions.buyPro', { defaultValue: '购买 Pro' })}
              </button>
            )}
          </div>
        </div>
            </>
          );
        })()}
      </div>
    );

    return (
      <div className="settings-user-profile settings-user-profile-paged" ref={profilePagesLayoutRef}>
        <div className="settings-user-profile-main">
          {userProfilePage === 'info' && renderInfoPage()}
          {userProfilePage === 'edit' && renderEditPage()}
          {userProfilePage === 'password' && renderPasswordPage()}
          {userProfilePage === 'pro' && renderProPage()}
          {userProfilePage === 'orders' && renderOrdersPage()}
          {userProfilePage === 'account' && renderAccountPage()}
        </div>

        <div className="settings-user-page-dots">
          {profilePageItems.map((item) => (
            <button
              key={item.id}
              className={`settings-user-page-dot ${userProfilePage === item.id ? 'active' : ''}`}
              data-label={item.label}
              onClick={() => setUserProfilePage(item.id)}
              title={item.label}
              aria-label={t('settings.user.pages.switchTo', { defaultValue: '切换到{{label}}', label: item.label })}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-expand-settings-section settings-user">
      <div className="max-expand-settings-title settings-app-title-line">
        <span>{t('settings.labels.user', { defaultValue: '用户中心' })}</span>
        {token && profile && <span className="settings-app-title-sub">- {currentUserProfilePageLabel}</span>}
      </div>
      {token && profile ? renderProfileEditor() : token ? (
        <div className="settings-user-loading">
          {loadingProfile
            ? t('settings.user.feedback.loadingProfile', { defaultValue: '加载账号资料中…' })
            : t('settings.user.feedback.loadFailed', { defaultValue: '加载资料失败' })}
          {profileError && <div className="settings-user-feedback settings-user-feedback--error">{profileError}</div>}
          {!loadingProfile && (
            <div className="settings-user-actions-row settings-user-actions-row--adaptive">
              <button
                type="button"
                className="settings-user-primary-btn"
                onClick={() => void handleRefreshProfile()}
              >
                {t('settings.user.actions.refresh', { defaultValue: '刷新资料' })}
              </button>
              <button
                type="button"
                className="settings-user-secondary-btn"
                onClick={resetToLoggedOut}
              >
                {t('settings.user.actions.logout', { defaultValue: '退出登录' })}
              </button>
            </div>
          )}
        </div>
      ) : renderAuthEntry()}
    </div>
  );
}
