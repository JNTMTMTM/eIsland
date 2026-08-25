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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, PointerEvent as ReactPointerEvent, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
  closeUserPaymentOrder,
  deleteImageTranslationHistory,
  deleteOcrHistory,
  fetchUserPaymentOrders,
  fetchProMonthPricing,
  fetchAgentBalance,
  fetchImageTranslationHistory,
  fetchOcrHistory,
  fetchOAuthBindings,
  fetchUserProfile,
  logoutUser,
  refreshUserToken,
  sendUserEmailCode,
  unbindOAuth,
  unregisterUser,
  updateUserPassword,
  updateUserProfile,
  uploadUserAvatar,
  type ImageTranslationHistoryItem,
  type OAuthBindingItem,
  type OcrHistoryItem,
  type UserPaymentOrderData,
  PAYMENT_ORDERS_DEFAULT_PAGE_SIZE,
} from '../../../../../../../api/user/userAccountApi';
import { runSliderCaptcha } from '../../../../../../../utils/sliderCaptcha';
import {
  fetchQuestionnaireHistory,
  deleteQuestionnaireHistory,
  type QuestionnaireHistoryItem,
} from '../../../../../../../api/questionnaire/questionnaireApi';
import { QuestionnaireQuestion } from '../../../../../questionnaire/components/QuestionnaireQuestion';
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
import { resolveCountryIcon } from '../../../../../../../utils/SvgIcon/country-icon';
import { EMAIL_PATTERN } from '../../../../../../../components/config/dynamicIslandPatterns';
import { LoginHeatmap } from './components/LoginHeatmap';
import { QuestionnaireBanner, useAnnouncementQuestionnaire } from '../../../../../../components/DynamicIslandQuestionnaireBanner';
import '../../../../../../../styles/announcement/announcement.css';
import { readLoginDays, recordLoginDay } from './utils/loginHeatmapStorage';
import { SettingsPageNavigation, SettingsPageNavigationToggle } from '../SettingsPageNavigation';
import '../../../../../../../styles/settings/modules/cli.css';
import '../../../../../../../styles/questionnaire/questionnaire.css';

type FeedbackType = 'success' | 'error' | 'info';
type UserProfilePage = 'info' | 'edit' | 'password' | 'pro' | 'recharge' | 'orders' | 'account' | 'oauth' | 'image-translation' | 'ocr-history' | 'questionnaire';

interface Feedback {
  type: FeedbackType;
  text: string;
}

interface ImageTranslationPreview {
  taskId: string;
  url: string;
  alt: string;
}

interface ImageTranslationPreviewDrag {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  moved: boolean;
}

type ProfileFeedbackScope = 'profile' | 'password' | 'account';

interface UserSettingsSectionProps {
  initialProfilePage?: UserProfilePage;
}

const GENDER_VALUES: UserAccountGender[] = ['male', 'female', 'custom', 'undisclosed'];
const USER_PROFILE_PAGES: UserProfilePage[] = ['info', 'edit', 'password', 'pro', 'recharge', 'orders', 'account', 'oauth', 'image-translation', 'ocr-history', 'questionnaire'];
const IMAGE_TRANSLATION_PREVIEW_MIN_SCALE = 0.5;
const IMAGE_TRANSLATION_PREVIEW_MAX_SCALE = 4;

const clampImageTranslationPreviewScale = (value: number): number => {
  return Math.min(IMAGE_TRANSLATION_PREVIEW_MAX_SCALE, Math.max(IMAGE_TRANSLATION_PREVIEW_MIN_SCALE, value));
};

const buildImageTranslationDownloadName = (taskId: string, kind: 'source' | 'result', imageUrl: string): string => {
  let extension = '.jpg';
  try {
    const matchedExtension = new URL(imageUrl).pathname.match(/\.(jpe?g|png|webp)$/i)?.[0];
    if (matchedExtension) extension = matchedExtension.toLowerCase();
  } catch {
    // 使用默认扩展名。
  }
  return `image-translation-${taskId.slice(0, 8)}-${kind}${extension}`;
};
const IMAGE_TRANSLATION_HISTORY_PAGE_SIZE = 5;
const OCR_HISTORY_PAGE_SIZE = 5;

const buildOcrDownloadName = (id: number, imageUrl: string): string => {
  let extension = '.jpg';
  try {
    const matchedExtension = new URL(imageUrl).pathname.match(/\.(jpe?g|png|webp)$/i)?.[0];
    if (matchedExtension) extension = matchedExtension.toLowerCase();
  } catch {
    // 使用默认扩展名。
  }
  return `ocr-${id}-source${extension}`;
};

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

const resolveImageTranslationLanguageIcon = (language: string): { src?: string; isAuto: boolean } => {
  const normalized = String(language || '').trim().toLowerCase();
  if (normalized === 'auto') {
    return { src: SvgIcon.AI, isAuto: true };
  }
  return { src: resolveCountryIcon(normalized), isAuto: false };
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
  const { setLogin, setRegister, setPayment, setQuestionnaire } = useIslandStore();
  const questionnaireReminder = useAnnouncementQuestionnaire();
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
  const [pageNavigationExpanded, setPageNavigationExpanded] = useState(false);
  const [proMonthPriceLabel, setProMonthPriceLabel] = useState('');
  const [proMonthPricingLoading, setProMonthPricingLoading] = useState(false);
  const [freePlanDesc, setFreePlanDesc] = useState('');
  const [proPlanDesc, setProPlanDesc] = useState('');
  const [freePlanFeatures, setFreePlanFeatures] = useState<string[]>([]);
  const [proPlanFeatures, setProPlanFeatures] = useState<string[]>([]);
  const [userOrders, setUserOrders] = useState<UserPaymentOrderData[]>([]);
  const [loadingUserOrders, setLoadingUserOrders] = useState(false);
  const [ordersFeedback, setOrdersFeedback] = useState<Feedback | null>(null);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersTotalPages, setOrdersTotalPages] = useState(0);
  const [orderActionOutTradeNo, setOrderActionOutTradeNo] = useState('');
  const [rechargeSelected, setRechargeSelected] = useState<number | null>(null);
  const [rechargeCustomValue, setRechargeCustomValue] = useState('');
  const [rechargeFeedback, setRechargeFeedback] = useState<Feedback | null>(null);
  const [userBalance, setUserBalance] = useState<string | null>(null);

  /** 第三方应用绑定列表 */
  const [oauthBindings, setOauthBindings] = useState<OAuthBindingItem[]>([]);
  const [loadingOAuthBindings, setLoadingOAuthBindings] = useState(false);
  const [oauthUnbindingId, setOauthUnbindingId] = useState<number | null>(null);
  const [oauthFeedback, setOauthFeedback] = useState<{ bindingId: number; feedback: Feedback } | null>(null);

  const [imageTranslationHistory, setImageTranslationHistory] = useState<ImageTranslationHistoryItem[]>([]);
  const [imageTranslationHistoryPage, setImageTranslationHistoryPage] = useState(1);
  const [imageTranslationHistoryTotal, setImageTranslationHistoryTotal] = useState(0);
  const [imageTranslationHistoryTotalPages, setImageTranslationHistoryTotalPages] = useState(0);
  const [loadingImageTranslationHistory, setLoadingImageTranslationHistory] = useState(false);
  const [imageTranslationHistoryError, setImageTranslationHistoryError] = useState('');
  const [imageTranslationPreview, setImageTranslationPreview] = useState<ImageTranslationPreview | null>(null);
  const [imageTranslationPreviewScale, setImageTranslationPreviewScale] = useState(1);
  const [imageTranslationPreviewOffset, setImageTranslationPreviewOffset] = useState({ x: 0, y: 0 });
  const [imageTranslationPreviewDragging, setImageTranslationPreviewDragging] = useState(false);
  const [imageTranslationDownloadingKey, setImageTranslationDownloadingKey] = useState('');
  const [imageTranslationRemovingTaskId, setImageTranslationRemovingTaskId] = useState('');
  const [imageTranslationActionFeedback, setImageTranslationActionFeedback] = useState<{ taskId: string; feedback: Feedback } | null>(null);

  const [ocrHistory, setOcrHistory] = useState<OcrHistoryItem[]>([]);
  const [ocrHistoryPage, setOcrHistoryPage] = useState(1);
  const [ocrHistoryTotal, setOcrHistoryTotal] = useState(0);
  const [ocrHistoryTotalPages, setOcrHistoryTotalPages] = useState(0);
  const [loadingOcrHistory, setLoadingOcrHistory] = useState(false);
  const [ocrHistoryError, setOcrHistoryError] = useState('');
  const [ocrHistoryDownloadingId, setOcrHistoryDownloadingId] = useState<number | null>(null);
  const [ocrHistoryCopyingId, setOcrHistoryCopyingId] = useState<number | null>(null);
  const [ocrHistoryRemovingId, setOcrHistoryRemovingId] = useState<number | null>(null);
  const [ocrHistoryActionFeedback, setOcrHistoryActionFeedback] = useState<{ id: number; feedback: Feedback } | null>(null);

  const [questionnaireHistory, setQuestionnaireHistory] = useState<QuestionnaireHistoryItem[]>([]);
  const [loadingQuestionnaireHistory, setLoadingQuestionnaireHistory] = useState(false);
  const [questionnaireHistoryError, setQuestionnaireHistoryError] = useState('');
  const [questionnaireHistoryFeedback, setQuestionnaireHistoryFeedback] = useState<Feedback | null>(null);
  const [questionnaireEraseConfirmResultId, setQuestionnaireEraseConfirmResultId] = useState<number | null>(null);
  const [questionnaireErasingResultId, setQuestionnaireErasingResultId] = useState<number | null>(null);
  const [expandedQuestionnaireResultId, setExpandedQuestionnaireResultId] = useState<number | null>(null);

  /** 用户中心登录天数热力图：记录并展示当前用户每个自然日是否登录 */
  const [loginDays, setLoginDays] = useState<Set<string>>(() => readLoginDays(profile?.username));
  /** 登录热力图是否展开（默认收起，点击右侧统计卡内的图标按钮切换） */
  const [loginHeatmapVisible, setLoginHeatmapVisible] = useState(false);

  const currentUserProfilePageLabel = t(`settings.user.pages.${userProfilePage}`, {
    defaultValue: userProfilePage === 'info'
      ? '用户信息'
      : userProfilePage === 'edit'
        ? '修改信息'
        : userProfilePage === 'password'
          ? '修改密码'
          : userProfilePage === 'pro'
            ? 'PRO功能'
            : userProfilePage === 'recharge'
              ? '余额充值'
              : userProfilePage === 'orders'
                ? '我的订单'
                : userProfilePage === 'account'
                  ? '关于账户'
                  : userProfilePage === 'oauth'
                    ? '第三方应用绑定'
                    : userProfilePage === 'image-translation'
                      ? '图片翻译'
                      : userProfilePage === 'ocr-history'
                        ? 'OCR记录'
                        : '问卷记录',
  });

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const imageTranslationPreviewRef = useRef<HTMLButtonElement | null>(null);
  const imageTranslationPreviewDragRef = useRef<ImageTranslationPreviewDrag | null>(null);
  const imageTranslationPreviewScaleRef = useRef(imageTranslationPreviewScale);

  const getImageTranslationStatusLabel = useMemo(() => {
    return (status: string): string => {
      const normalized = String(status || '').toUpperCase();
      if (normalized === 'SUCCEEDED') return t('settings.user.imageTranslation.status.succeeded', { defaultValue: '已完成' });
      if (normalized === 'FAILED') return t('settings.user.imageTranslation.status.failed', { defaultValue: '失败' });
      if (normalized === 'PROCESSING') return t('settings.user.imageTranslation.status.processing', { defaultValue: '翻译中' });
      if (normalized === 'QUEUED') return t('settings.user.imageTranslation.status.queued', { defaultValue: '排队中' });
      return status || t('settings.user.imageTranslation.status.unknown', { defaultValue: '未知' });
    };
  }, [t]);

  useEffect(() => {
    setUserProfilePage(initialProfilePage);
  }, [initialProfilePage]);

  useEffect(() => {
    setImageTranslationPreviewScale(1);
    setImageTranslationPreviewOffset({ x: 0, y: 0 });
    setImageTranslationPreviewDragging(false);
    imageTranslationPreviewDragRef.current = null;
  }, [imageTranslationPreview]);

  useEffect(() => {
    imageTranslationPreviewScaleRef.current = imageTranslationPreviewScale;
  }, [imageTranslationPreviewScale]);

  useEffect(() => {
    if (!imageTranslationPreview) return;
    const previewElement = imageTranslationPreviewRef.current;
    if (!previewElement) return;

    const handleWheel = (event: WheelEvent): void => {
      event.preventDefault();
      event.stopPropagation();
      const zoomFactor = Math.exp(-event.deltaY * 0.0015);
      const nextScale = clampImageTranslationPreviewScale(
        Number((imageTranslationPreviewScaleRef.current * zoomFactor).toFixed(3)),
      );
      const maxX = Math.max(0, previewElement.clientWidth * (nextScale - 1) / 2);
      const maxY = Math.max(0, previewElement.clientHeight * (nextScale - 1) / 2);
      setImageTranslationPreviewScale(nextScale);
      setImageTranslationPreviewOffset((current) => ({
        x: Math.min(maxX, Math.max(-maxX, current.x)),
        y: Math.min(maxY, Math.max(-maxY, current.y)),
      }));
    };

    previewElement.addEventListener('wheel', handleWheel, { passive: false });
    return () => previewElement.removeEventListener('wheel', handleWheel);
  }, [imageTranslationPreview]);

  const handleImageTranslationPreviewPointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>): void => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    imageTranslationPreviewDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: imageTranslationPreviewOffset.x,
      originY: imageTranslationPreviewOffset.y,
      moved: false,
    };
    setImageTranslationPreviewDragging(true);
  }, [imageTranslationPreviewOffset]);

  const handleImageTranslationPreviewPointerMove = useCallback((event: ReactPointerEvent<HTMLButtonElement>): void => {
    const drag = imageTranslationPreviewDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      drag.moved = true;
    }
    const maxX = Math.max(0, event.currentTarget.clientWidth * (imageTranslationPreviewScale - 1) / 2);
    const maxY = Math.max(0, event.currentTarget.clientHeight * (imageTranslationPreviewScale - 1) / 2);
    setImageTranslationPreviewOffset({
      x: Math.min(maxX, Math.max(-maxX, drag.originX + deltaX)),
      y: Math.min(maxY, Math.max(-maxY, drag.originY + deltaY)),
    });
  }, [imageTranslationPreviewScale]);

  const handleImageTranslationPreviewPointerUp = useCallback((event: ReactPointerEvent<HTMLButtonElement>): void => {
    const drag = imageTranslationPreviewDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setImageTranslationPreviewDragging(false);
  }, []);

  const handleImageTranslationPreviewPointerCancel = useCallback((event: ReactPointerEvent<HTMLButtonElement>): void => {
    if (imageTranslationPreviewDragRef.current?.pointerId !== event.pointerId) return;
    imageTranslationPreviewDragRef.current = null;
    setImageTranslationPreviewDragging(false);
  }, []);

  const handleImageTranslationPreviewClick = useCallback((event: ReactPointerEvent<HTMLButtonElement>): void => {
    const drag = imageTranslationPreviewDragRef.current;
    imageTranslationPreviewDragRef.current = null;
    if (drag?.moved) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    setImageTranslationPreview(null);
  }, []);

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

  // 登录态有效时记录今日登录，并刷新热力图数据
  useEffect(() => {
    const username = profile?.username;
    if (!token || !username) return;
    recordLoginDay(username);
    setLoginDays(readLoginDays(username));
  }, [token, profile?.username]);

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
    if (!token || userProfilePage !== 'recharge') return;
    let cancelled = false;
    const loadBalance = async (): Promise<void> => {
      const result = await fetchAgentBalance(token);
      if (cancelled) return;
      if (result.ok && result.data) {
        setUserBalance(result.data.balanceYuan);
      }
    };
    void loadBalance();
    return () => { cancelled = true; };
  }, [token, userProfilePage]);

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

  const loadUserOrders = useCallback(async (page: number): Promise<void> => {
    if (!token) {
      setUserOrders([]);
      setOrdersPage(1);
      setOrdersTotal(0);
      setOrdersTotalPages(0);
      setLoadingUserOrders(false);
      return;
    }
    setLoadingUserOrders(true);
    setOrdersFeedback(null);
    const result = await fetchUserPaymentOrders(token, page, PAYMENT_ORDERS_DEFAULT_PAGE_SIZE);
    setLoadingUserOrders(false);
    if (!result.ok || !result.data || !Array.isArray(result.data.items)) {
      if (result.code === 401 || result.code === 4011) {
        resetToLoggedOut();
        return;
      }
      setOrdersFeedback({ type: 'error', text: result.message || t('settings.user.orders.feedback.loadFailed', { defaultValue: '加载订单失败' }) });
      return;
    }
    setUserOrders(result.data.items);
    setOrdersPage(result.data.page);
    setOrdersTotal(result.data.total);
    setOrdersTotalPages(result.data.totalPages);
    const hasPaidOrder = result.data.items.some((order) => String(order?.status || '').toUpperCase() === 'SUCCESS');
    if (hasPaidOrder) {
      await loadRemoteProfile(token);
    }
  }, [loadRemoteProfile, resetToLoggedOut, t, token]);

  const loadImageTranslationHistory = useCallback(async (page: number): Promise<void> => {
    if (!token) {
      setImageTranslationHistory([]);
      setImageTranslationHistoryPage(1);
      setImageTranslationHistoryTotal(0);
      setImageTranslationHistoryTotalPages(0);
      setLoadingImageTranslationHistory(false);
      setImageTranslationHistoryError('');
      return;
    }
    setLoadingImageTranslationHistory(true);
    setImageTranslationHistoryError('');
    setImageTranslationPreview(null);
    const result = await fetchImageTranslationHistory(token, page, IMAGE_TRANSLATION_HISTORY_PAGE_SIZE);
    setLoadingImageTranslationHistory(false);
    if (!result.ok || !result.data || !Array.isArray(result.data.items)) {
      if (result.code === 401 || result.code === 4011) {
        resetToLoggedOut();
        return;
      }
      setImageTranslationHistoryError(result.message || t('settings.user.imageTranslation.loadFailed', { defaultValue: '加载图片翻译记录失败' }));
      return;
    }
    setImageTranslationHistory(result.data.items);
    setImageTranslationHistoryPage(result.data.page);
    setImageTranslationHistoryTotal(result.data.total);
    setImageTranslationHistoryTotalPages(result.data.totalPages);
  }, [resetToLoggedOut, t, token]);

  const loadOcrHistory = useCallback(async (page: number): Promise<void> => {
    if (!token) {
      setOcrHistory([]);
      setOcrHistoryPage(1);
      setOcrHistoryTotal(0);
      setOcrHistoryTotalPages(0);
      setLoadingOcrHistory(false);
      setOcrHistoryError('');
      return;
    }
    setLoadingOcrHistory(true);
    setOcrHistoryError('');
    const result = await fetchOcrHistory(token, page, OCR_HISTORY_PAGE_SIZE);
    setLoadingOcrHistory(false);
    if (!result.ok || !result.data || !Array.isArray(result.data.items)) {
      if (result.code === 401 || result.code === 4011) {
        resetToLoggedOut();
        return;
      }
      setOcrHistoryError(result.message || t('settings.user.ocrHistory.loadFailed', { defaultValue: '加载 OCR 历史记录失败' }));
      return;
    }
    setOcrHistory(result.data.items);
    setOcrHistoryPage(result.data.page);
    setOcrHistoryTotal(result.data.total);
    setOcrHistoryTotalPages(result.data.totalPages);
  }, [resetToLoggedOut, t, token]);

  const loadQuestionnaireHistory = useCallback(async (): Promise<void> => {
    if (!token) {
      setQuestionnaireHistory([]);
      setLoadingQuestionnaireHistory(false);
      setQuestionnaireHistoryError('');
      setQuestionnaireHistoryFeedback(null);
      setQuestionnaireEraseConfirmResultId(null);
      setQuestionnaireErasingResultId(null);
      setExpandedQuestionnaireResultId(null);
      return;
    }
    setLoadingQuestionnaireHistory(true);
    setQuestionnaireHistoryError('');
    setQuestionnaireHistoryFeedback(null);
    const result = await fetchQuestionnaireHistory(token);
    setLoadingQuestionnaireHistory(false);
    if (!result.ok || !Array.isArray(result.data)) {
      if (result.code === 401 || result.code === 4011) {
        resetToLoggedOut();
        return;
      }
      setQuestionnaireHistoryError(result.message || t('settings.user.questionnaire.loadFailed'));
      return;
    }
    setQuestionnaireHistory(result.data);
    setExpandedQuestionnaireResultId((current) => (
      result.data?.some((item) => item.resultId === current) ? current : null
    ));
    setQuestionnaireEraseConfirmResultId((current) => (
      result.data?.some((item) => item.resultId === current) ? current : null
    ));
  }, [resetToLoggedOut, t, token]);

  const handleEraseQuestionnaireHistory = useCallback(async (item: QuestionnaireHistoryItem): Promise<void> => {
    if (!token || questionnaireErasingResultId !== null) return;
    setQuestionnaireErasingResultId(item.resultId);
    setQuestionnaireHistoryFeedback(null);
    const result = await deleteQuestionnaireHistory(token, item.resultId, item.questionnaire.id);
    setQuestionnaireErasingResultId(null);
    if (!result.ok) {
      if (result.code === 401 || result.code === 4011) {
        resetToLoggedOut();
        return;
      }
      setQuestionnaireHistoryFeedback({
        type: 'error',
        text: result.message || t('settings.user.questionnaire.eraseFailed'),
      });
      return;
    }
    void questionnaireReminder.reload();
    setQuestionnaireHistory((current) => current.filter((record) => record.resultId !== item.resultId));
    setExpandedQuestionnaireResultId((current) => current === item.resultId ? null : current);
    setQuestionnaireEraseConfirmResultId(null);
    setQuestionnaireHistoryFeedback({
      type: 'success',
      text: t('settings.user.questionnaire.eraseSuccess'),
    });
  }, [questionnaireErasingResultId, questionnaireReminder.reload, resetToLoggedOut, t, token]);

  const handleDownloadOcrImage = useCallback(async (item: OcrHistoryItem): Promise<void> => {
    if (!item.sourceUrl || ocrHistoryDownloadingId !== null || ocrHistoryCopyingId !== null || ocrHistoryRemovingId !== null) return;
    setOcrHistoryDownloadingId(item.id);
    setOcrHistoryActionFeedback(null);
    try {
      const savePath = await window.api.downloadPickSavePath(buildOcrDownloadName(item.id, item.sourceUrl));
      if (!savePath) return;
      const result = await window.api.downloadStart({ url: item.sourceUrl, savePath, threads: 4 });
      setOcrHistoryActionFeedback({
        id: item.id,
        feedback: result.ok
          ? { type: 'success', text: t('settings.user.ocrHistory.actions.downloadStarted', { defaultValue: '已开始下载' }) }
          : { type: 'error', text: result.message || t('settings.user.ocrHistory.actions.downloadFailed', { defaultValue: '下载失败' }) },
      });
    } catch {
      setOcrHistoryActionFeedback({
        id: item.id,
        feedback: { type: 'error', text: t('settings.user.ocrHistory.actions.downloadFailed', { defaultValue: '下载失败' }) },
      });
    } finally {
      setOcrHistoryDownloadingId(null);
    }
  }, [ocrHistoryCopyingId, ocrHistoryDownloadingId, ocrHistoryRemovingId, t]);

  const handleCopyOcrText = useCallback(async (item: OcrHistoryItem): Promise<void> => {
    if (!item.recognizedText || ocrHistoryDownloadingId !== null || ocrHistoryCopyingId !== null || ocrHistoryRemovingId !== null) return;
    setOcrHistoryCopyingId(item.id);
    setOcrHistoryActionFeedback(null);
    try {
      await navigator.clipboard.writeText(item.recognizedText);
      setOcrHistoryActionFeedback({
        id: item.id,
        feedback: { type: 'success', text: t('settings.user.ocrHistory.actions.copySuccess', { defaultValue: '文本已复制' }) },
      });
    } catch {
      setOcrHistoryActionFeedback({
        id: item.id,
        feedback: { type: 'error', text: t('settings.user.ocrHistory.actions.copyFailed', { defaultValue: '复制文本失败' }) },
      });
    } finally {
      setOcrHistoryCopyingId(null);
    }
  }, [ocrHistoryCopyingId, ocrHistoryDownloadingId, ocrHistoryRemovingId, t]);

  const handleRemoveOcrHistory = useCallback(async (item: OcrHistoryItem): Promise<void> => {
    if (!token || ocrHistoryDownloadingId !== null || ocrHistoryCopyingId !== null || ocrHistoryRemovingId !== null) return;
    setOcrHistoryRemovingId(item.id);
    setOcrHistoryActionFeedback(null);
    const result = await deleteOcrHistory(token, item.id);
    setOcrHistoryRemovingId(null);
    if (!result.ok) {
      if (result.code === 401 || result.code === 4011) {
        resetToLoggedOut();
        return;
      }
      setOcrHistoryActionFeedback({
        id: item.id,
        feedback: { type: 'error', text: result.message || t('settings.user.ocrHistory.actions.removeFailed', { defaultValue: '抹掉记录失败' }) },
      });
      return;
    }
    if (ocrHistory.length === 1 && ocrHistoryPage > 1) {
      setOcrHistoryPage((current) => Math.max(1, current - 1));
      return;
    }
    await loadOcrHistory(ocrHistoryPage);
  }, [
    loadOcrHistory,
    ocrHistory.length,
    ocrHistoryCopyingId,
    ocrHistoryDownloadingId,
    ocrHistoryPage,
    ocrHistoryRemovingId,
    resetToLoggedOut,
    t,
    token,
  ]);

  const handleDownloadImageTranslationImage = useCallback(async (
    task: ImageTranslationHistoryItem,
    kind: 'source' | 'result',
    imageUrl: string | null,
  ): Promise<void> => {
    if (!imageUrl || imageTranslationDownloadingKey) return;
    const actionKey = `${task.taskId}:${kind}`;
    setImageTranslationDownloadingKey(actionKey);
    setImageTranslationActionFeedback(null);
    try {
      const savePath = await window.api.downloadPickSavePath(
        buildImageTranslationDownloadName(task.taskId, kind, imageUrl),
      );
      if (!savePath) return;
      const result = await window.api.downloadStart({ url: imageUrl, savePath, threads: 4 });
      setImageTranslationActionFeedback({
        taskId: task.taskId,
        feedback: result.ok
          ? { type: 'success', text: t('settings.user.imageTranslation.actions.downloadStarted', { defaultValue: '已开始下载' }) }
          : { type: 'error', text: result.message || t('settings.user.imageTranslation.actions.downloadFailed', { defaultValue: '下载失败' }) },
      });
    } catch {
      setImageTranslationActionFeedback({
        taskId: task.taskId,
        feedback: { type: 'error', text: t('settings.user.imageTranslation.actions.downloadFailed', { defaultValue: '下载失败' }) },
      });
    } finally {
      setImageTranslationDownloadingKey('');
    }
  }, [imageTranslationDownloadingKey, t]);

  const handleRemoveImageTranslation = useCallback(async (
    task: ImageTranslationHistoryItem,
  ): Promise<void> => {
    if (!token || imageTranslationRemovingTaskId || imageTranslationDownloadingKey) return;
    setImageTranslationRemovingTaskId(task.taskId);
    setImageTranslationActionFeedback(null);
    const result = await deleteImageTranslationHistory(token, task.taskId);
    setImageTranslationRemovingTaskId('');
    if (!result.ok) {
      if (result.code === 401 || result.code === 4011) {
        resetToLoggedOut();
        return;
      }
      setImageTranslationActionFeedback({
        taskId: task.taskId,
        feedback: {
          type: 'error',
          text: result.message || t('settings.user.imageTranslation.actions.removeFailed', { defaultValue: '抹掉图片失败' }),
        },
      });
      return;
    }

    setImageTranslationPreview((current) => current?.taskId === task.taskId ? null : current);
    setImageTranslationActionFeedback({
      taskId: task.taskId,
      feedback: {
        type: 'success',
        text: t('settings.user.imageTranslation.actions.removeSuccess', { defaultValue: '图片及翻译记录已抹掉' }),
      },
    });
    if (imageTranslationHistory.length === 1 && imageTranslationHistoryPage > 1) {
      setImageTranslationHistoryPage((current) => Math.max(1, current - 1));
      return;
    }
    await loadImageTranslationHistory(imageTranslationHistoryPage);
  }, [
    imageTranslationDownloadingKey,
    imageTranslationHistory.length,
    imageTranslationHistoryPage,
    imageTranslationRemovingTaskId,
    loadImageTranslationHistory,
    resetToLoggedOut,
    t,
    token,
  ]);

  useEffect(() => {
    if (userProfilePage !== 'orders' || !token) {
      return;
    }
    void loadUserOrders(ordersPage);
  }, [loadUserOrders, ordersPage, token, userProfilePage]);

  useEffect(() => {
    if (userProfilePage !== 'image-translation' || !token) {
      return;
    }
    void loadImageTranslationHistory(imageTranslationHistoryPage);
  }, [imageTranslationHistoryPage, loadImageTranslationHistory, token, userProfilePage]);

  useEffect(() => {
    if (userProfilePage !== 'ocr-history' || !token) {
      return;
    }
    void loadOcrHistory(ocrHistoryPage);
  }, [loadOcrHistory, ocrHistoryPage, token, userProfilePage]);

  useEffect(() => {
    if (userProfilePage !== 'questionnaire' || !token) {
      return;
    }
    void loadQuestionnaireHistory();
  }, [loadQuestionnaireHistory, token, userProfilePage]);

  useEffect(() => {
    if (userProfilePage !== 'oauth' || !token) {
      return;
    }
    let cancelled = false;
    const loadOAuthBindings = async (): Promise<void> => {
      setLoadingOAuthBindings(true);
      const result = await fetchOAuthBindings(token);
      if (cancelled) return;
      setLoadingOAuthBindings(false);
      if (result.ok && Array.isArray(result.data)) {
        setOauthBindings(result.data);
      }
    };
    void loadOAuthBindings();
    return () => { cancelled = true; };
  }, [token, userProfilePage]);

  const handleUnbindOAuth = async (bindingId: number): Promise<void> => {
    if (!token || oauthUnbindingId !== null) return;
    setOauthUnbindingId(bindingId);
    setOauthFeedback(null);
    const result = await unbindOAuth(token, bindingId);
    setOauthUnbindingId(null);
    if (!result.ok) {
      if (result.code === 401 || result.code === 4011) {
        resetToLoggedOut();
        return;
      }
      setOauthFeedback({ bindingId, feedback: { type: 'error', text: result.message || t('settings.user.oauth.feedback.unbindFailed', { defaultValue: '解除绑定失败' }) } });
      return;
    }
    setOauthBindings((prev) => prev.filter((b) => b.id !== bindingId));
    setOauthFeedback(null);
  };

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

  const getProductTypeLabel = (productCode: string): string => {
    const code = String(productCode || '').toUpperCase();
    if (code === 'PRO_MONTH') return t('settings.user.payment.productType.PRO_MONTH', { defaultValue: 'Pro 月度订阅' });
    if (code === 'AGENT_RECHARGE') return t('settings.user.payment.productType.AGENT_RECHARGE', { defaultValue: '余额充值' });
    return t('settings.user.payment.productType.unknown', { defaultValue: '未知类型' });
  };

  const getProductTypeBadgeClass = (productCode: string): string => {
    const code = String(productCode || '').toUpperCase();
    if (code === 'PRO_MONTH') return 'is-pro';
    if (code === 'AGENT_RECHARGE') return 'is-recharge';
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
    if (userOrders.length === 1 && ordersPage > 1) {
      setOrdersPage((current) => Math.max(1, current - 1));
      return;
    }
    await loadUserOrders(ordersPage);
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
              onClick={() => void loadUserOrders(ordersPage)}
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
              <div className="settings-user-order-header">
                <span className={`settings-user-order-product-badge ${getProductTypeBadgeClass(order.productCode)}`}>
                  {getProductTypeLabel(order.productCode)}
                </span>
                <span className={`settings-user-order-status-badge ${getOrderStatusClassName(status)}`}>{getOrderStatusLabel(status)}</span>
                <span className="settings-user-order-amount">{amountLabel}</span>
              </div>
              <div className="settings-user-order-detail-card">
                <div className="settings-user-order-item-row">
                  <span className="settings-user-order-item-label">{t('settings.user.payment.orderNoLabel', { defaultValue: '订单号' })}</span>
                  <span className="settings-user-order-item-value">{order.outTradeNo || '--'}</span>
                </div>
                <div className="settings-user-order-item-row">
                  <span className="settings-user-order-item-label">{t('settings.user.payment.createdAtLabel', { defaultValue: '下单时间' })}</span>
                  <span className="settings-user-order-item-value">{formatDateTime(order.createdAt)}</span>
                </div>
                {order.paidAt ? (
                  <div className="settings-user-order-item-row">
                    <span className="settings-user-order-item-label">{t('settings.user.payment.paidAtLabel', { defaultValue: '支付时间' })}</span>
                    <span className="settings-user-order-item-value">{formatDateTime(order.paidAt)}</span>
                  </div>
                ) : (
                  <div className="settings-user-order-item-row">
                    <span className="settings-user-order-item-label">{t('settings.user.payment.expireLabel', { defaultValue: '订单到期时间' })}</span>
                    <span className="settings-user-order-item-value">{formatDateTime(order.expireAt)}</span>
                  </div>
                )}
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

        {ordersTotalPages > 0 ? (
          <nav className="settings-plugin-market-pagination settings-user-orders-pagination" aria-label={t('settings.user.orders.pagination.label', { defaultValue: '订单历史分页' })}>
            <button
              type="button"
              className="settings-hotkey-btn"
              disabled={loadingUserOrders || ordersPage <= 1}
              onClick={() => setOrdersPage((current) => Math.max(1, current - 1))}
            >
              {t('settings.user.orders.pagination.previous', { defaultValue: '上一页' })}
            </button>
            <span className="settings-plugin-market-pagination-text settings-user-orders-pagination-summary">
              {t('settings.user.orders.pagination.summary', {
                defaultValue: '第 {{page}} / {{totalPages}} 页，共 {{total}} 条',
                page: ordersPage,
                totalPages: ordersTotalPages,
                total: ordersTotal,
              })}
            </span>
            <button
              type="button"
              className="settings-hotkey-btn"
              disabled={loadingUserOrders || ordersPage >= ordersTotalPages}
              onClick={() => setOrdersPage((current) => Math.min(ordersTotalPages, current + 1))}
            >
              {t('settings.user.orders.pagination.next', { defaultValue: '下一页' })}
            </button>
          </nav>
        ) : null}
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
      { id: 'recharge', label: t('settings.user.pages.recharge', { defaultValue: '余额充值' }) },
      { id: 'orders', label: t('settings.user.pages.orders', { defaultValue: '我的订单' }) },
      { id: 'account', label: t('settings.user.pages.account', { defaultValue: '关于账户' }) },
      { id: 'oauth', label: t('settings.user.pages.oauth', { defaultValue: '第三方应用绑定' }) },
      { id: 'image-translation', label: t('settings.user.pages.image-translation', { defaultValue: '图片翻译' }) },
      { id: 'ocr-history', label: t('settings.user.pages.ocr-history', { defaultValue: 'OCR记录' }) },
      { id: 'questionnaire', label: t('settings.user.pages.questionnaire', { defaultValue: '问卷记录' }) },
    ];
    const profilePageLabels = Object.fromEntries(
      profilePageItems.map((item) => [item.id, item.label]),
    ) as Record<UserProfilePage, string>;
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
            <div className="settings-user-info-summary-bottom">
              <div className="settings-user-info-summary-balance-card">
                <span className="settings-user-info-summary-balance-label">{t('settings.user.card.balance', { defaultValue: '余额' })}</span>
                <span className="settings-user-info-summary-balance-value">
                  ¥{typeof profile?.balanceFen === 'number' ? (profile.balanceFen / 100).toFixed(2) : '0.00'}
                </span>
              </div>
              <div className="settings-user-info-summary-extra-card">
                <div className="settings-user-info-summary-row">
                  <span className="settings-user-info-summary-label">{t('settings.user.fields.gender', { defaultValue: '性别' })}</span>
                  <span className="settings-user-info-summary-value">{genderLabel}</span>
                </div>
                <div className="settings-user-info-summary-row">
                  <span className="settings-user-info-summary-label">{t('settings.user.fields.birthday', { defaultValue: '生日' })}</span>
                  <span className="settings-user-info-summary-value">{profile?.birthday ?? '—'}</span>
                </div>
              </div>
              <div className="settings-user-info-summary-login-card">
                <div className="settings-user-info-summary-login-stat">
                  <span className="settings-user-info-summary-label">{t('settings.user.card.loginDays', { defaultValue: '登录天数' })}</span>
                  <span className="settings-user-info-summary-login-value">{loginDays.size}</span>
                </div>
                <button
                  type="button"
                  className={`settings-user-info-summary-login-toggle${loginHeatmapVisible ? ' settings-user-info-summary-login-toggle--active' : ''}`}
                  title={loginHeatmapVisible ? t('settings.user.card.collapseHeatmap', { defaultValue: '收起热力图' }) : t('settings.user.card.expandHeatmap', { defaultValue: '展开热力图' })}
                  aria-label={loginHeatmapVisible ? t('settings.user.card.collapseHeatmap', { defaultValue: '收起热力图' }) : t('settings.user.card.expandHeatmap', { defaultValue: '展开热力图' })}
                  onClick={() => setLoginHeatmapVisible((v) => !v)}
                >
                  <img src={SvgIcon.FIRE} alt="" width="14" height="14" draggable={false} />
                </button>
              </div>
            </div>
          </div>

          {questionnaireReminder.questionnaire && (
            <QuestionnaireBanner
              count={questionnaireReminder.count}
              onOpen={setQuestionnaire}
              onDismiss={questionnaireReminder.dismiss}
            />
          )}

          <div className={`settings-user-info-heatmap${loginHeatmapVisible ? ' settings-user-info-heatmap--open' : ''}`}>
            <LoginHeatmap loginDays={loginDays} compact visible={loginHeatmapVisible} />
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
              className="settings-index-card settings-user-recharge-nav-card--outline"
              onClick={() => setUserProfilePage('recharge')}
            >
              <span className="settings-index-card-title">{t('settings.user.pages.recharge', { defaultValue: '余额充值' })}</span>
              <span className="settings-index-card-desc">{t('settings.user.infoNav.rechargeDesc', { defaultValue: '为 AI 助手对话余额充值' })}</span>
              <img className="settings-index-card-layout-icon" src={SvgIcon.RECHARGE} alt="" aria-hidden="true" />
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
            <button type="button" className="settings-index-card" onClick={() => setUserProfilePage('oauth')}>
              <span className="settings-index-card-title">{t('settings.user.pages.oauth', { defaultValue: '第三方应用绑定' })}</span>
              <span className="settings-index-card-desc">{t('settings.user.infoNav.oauthDesc', { defaultValue: '查看已绑定的第三方登录账号' })}</span>
              <img className="settings-index-card-layout-icon" src={SvgIcon.LINK} alt="" aria-hidden="true" />
            </button>
            <button type="button" className="settings-index-card" onClick={() => setUserProfilePage('ocr-history')}>
              <span className="settings-index-card-title">{t('settings.user.pages.ocr-history', { defaultValue: 'OCR记录' })}</span>
              <span className="settings-index-card-desc">{t('settings.user.infoNav.ocrDesc', { defaultValue: '查看历史 OCR 文字识别记录' })}</span>
              <img className="settings-index-card-layout-icon" src={SvgIcon.OCR} alt="" aria-hidden="true" />
            </button>
            <button type="button" className="settings-index-card" onClick={() => setUserProfilePage('image-translation')}>
              <span className="settings-index-card-title">{t('settings.user.pages.image-translation', { defaultValue: '图片翻译' })}</span>
              <span className="settings-index-card-desc">{t('settings.user.infoNav.imageTranslationDesc', { defaultValue: '查看历史图片翻译记录' })}</span>
              <img className="settings-index-card-layout-icon" src={SvgIcon.LANGUAGE} alt="" aria-hidden="true" />
            </button>
            <button type="button" className="settings-index-card" onClick={() => setUserProfilePage('questionnaire')}>
              <span className="settings-index-card-title">{t('settings.user.pages.questionnaire', { defaultValue: '问卷记录' })}</span>
              <span className="settings-index-card-desc">{t('settings.user.infoNav.questionnaireDesc', { defaultValue: '查看历史问卷填写记录' })}</span>
              <img className="settings-index-card-layout-icon" src={SvgIcon.QUESTIONNAIRE} alt="" aria-hidden="true" />
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
          <div className="settings-user-form-title">{t('settings.user.pages.account', { defaultValue: '关于账户' })}</div>
          <div className="settings-user-card-title-hint">
            {t('settings.user.auth.hint', { defaultValue: '登录注册服务由 eIsland server 提供' })}
          </div>
          {renderProfileFeedback('account')}
          <div className="settings-user-actions-row settings-user-account-actions">
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
              <div className="settings-user-actions-row--adaptive">
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
            t('settings.user.pro.pro.feature2', { defaultValue: '高级功能与扩展' }),
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
            <button
              type="button"
              className="settings-user-primary-btn settings-user-pro-buy-link"
              onClick={() => setPayment()}
            >
              {isProUser
                ? t('settings.user.actions.renewPro', { defaultValue: '前往续费' })
                : t('settings.user.actions.buyPro', { defaultValue: '购买 Pro' })}
            </button>
          </div>
        </div>
            </>
          );
        })()}
      </div>
    );

    const RECHARGE_PRESETS = [1, 10, 30, 50, 100];

    const getProviderIcon = (provider: string): string => {
      const p = provider.toLowerCase();
      if (p === 'github') return SvgIcon.GITHUB;
      if (p === 'microsoft') return SvgIcon.MICROSOFT;
      if (p === 'wechat') return SvgIcon.WECHAT;
      if (p === 'gitee') return SvgIcon.GITEE;
      if (p === 'kook') return SvgIcon.KOOK;
      return SvgIcon.LINK;
    };

    const getProviderLabel = (provider: string): string => {
      const p = provider.toLowerCase();
      if (p === 'github') return 'GitHub';
      if (p === 'microsoft') return 'Microsoft';
      if (p === 'wechat') return t('settings.user.oauth.provider.wechat', { defaultValue: '微信' });
      if (p === 'gitee') return 'Gitee';
      if (p === 'kook') return 'KOOK';
      return provider;
    };

    const renderOAuthPage = (): ReactElement => (
      <div className="settings-user-page-panel settings-user-oauth-panel">
        <div className="settings-user-card settings-user-oauth-head-card">
          <div className="settings-user-oauth-head">
            <div>
              <div className="settings-user-form-title">{t('settings.user.pages.oauth', { defaultValue: '第三方应用绑定' })}</div>
              <div className="settings-user-card-title-hint">
                {t('settings.user.oauth.subtitle', { defaultValue: '管理已绑定的第三方登录账号' })}
              </div>
            </div>
          </div>
        </div>

        {loadingOAuthBindings && oauthBindings.length === 0 ? (
          <div className="settings-user-card settings-user-oauth-empty">
            <span className="settings-user-orders-inline-spinner" aria-hidden="true" />
            <span>{t('settings.user.oauth.loading', { defaultValue: '加载中…' })}</span>
          </div>
        ) : null}

        {!loadingOAuthBindings && oauthBindings.length === 0 ? (
          <div className="settings-user-card settings-user-oauth-empty">
            {t('settings.user.oauth.empty', { defaultValue: '暂无第三方绑定' })}
          </div>
        ) : null}

        {oauthBindings.map((binding) => (
          <div key={binding.id} className="settings-user-card settings-user-oauth-item-card">
            <div className="settings-user-oauth-item-header">
              <img
                className="settings-user-oauth-provider-icon"
                src={getProviderIcon(binding.provider)}
                alt={binding.provider}
              />
              <span className="settings-user-oauth-provider-name">{getProviderLabel(binding.provider)}</span>
            </div>
            <div className="settings-user-oauth-item-detail">
              <div className="settings-user-oauth-item-row">
                <span className="settings-user-oauth-item-label">{t('settings.user.oauth.fields.username', { defaultValue: '用户名' })}</span>
                <span className="settings-user-oauth-item-value">{binding.providerUsername ?? '—'}</span>
              </div>
              <div className="settings-user-oauth-item-row">
                <span className="settings-user-oauth-item-label">{t('settings.user.oauth.fields.providerUserId', { defaultValue: '第三方用户ID' })}</span>
                <span className="settings-user-oauth-item-value">{binding.providerUserId ?? '—'}</span>
              </div>
              <div className="settings-user-oauth-item-row">
                <span className="settings-user-oauth-item-label">{t('settings.user.oauth.fields.boundAt', { defaultValue: '绑定时间' })}</span>
                <span className="settings-user-oauth-item-value">{formatDateTime(binding.createdAt)}</span>
              </div>
            </div>
            {oauthFeedback?.bindingId === binding.id ? renderFeedback(oauthFeedback.feedback) : null}
            <div className="settings-user-oauth-item-actions">
              <button
                type="button"
                className="settings-user-danger-btn"
                disabled={oauthUnbindingId === binding.id}
                onClick={() => void handleUnbindOAuth(binding.id)}
              >
                {oauthUnbindingId === binding.id
                  ? t('settings.user.oauth.actions.unbinding', { defaultValue: '解除中…' })
                  : t('settings.user.oauth.actions.unbind', { defaultValue: '解除绑定' })}
              </button>
            </div>
          </div>
        ))}
      </div>
    );

    const renderImageTranslationPage = (): ReactElement => (
      <div className="settings-user-page-panel settings-user-image-translation-panel">
        <div className="settings-user-card settings-user-image-translation-head-card">
          <div className="settings-user-image-translation-head">
            <div>
              <div className="settings-user-form-title">{t('settings.user.pages.image-translation', { defaultValue: '图片翻译' })}</div>
              <div className="settings-user-card-title-hint">
                {t('settings.user.imageTranslation.subtitle', { defaultValue: '查看原始图片与翻译后的结果图片' })}
              </div>
            </div>
          </div>
        </div>

        {loadingImageTranslationHistory && imageTranslationHistory.length === 0 ? (
          <div className="settings-user-card settings-user-image-translation-state">
            <span className="settings-user-orders-inline-spinner" aria-hidden="true" />
            <span>{t('settings.user.imageTranslation.loading', { defaultValue: '加载图片翻译记录中…' })}</span>
          </div>
        ) : null}

        {imageTranslationHistoryError ? (
          <div className="settings-user-feedback settings-user-feedback--error">
            {imageTranslationHistoryError}
          </div>
        ) : null}

        {!loadingImageTranslationHistory && !imageTranslationHistoryError && imageTranslationHistory.length === 0 ? (
          <div className="settings-user-card settings-user-image-translation-state">
            {t('settings.user.imageTranslation.empty', { defaultValue: '暂无图片翻译记录' })}
          </div>
        ) : null}

        <div className="settings-user-image-translation-list">
          {imageTranslationHistory.map((task) => {
            const normalizedStatus = String(task.status || '').toUpperCase();
            const canRemove = normalizedStatus === 'SUCCEEDED' || normalizedStatus === 'FAILED';
            const statusClass = normalizedStatus.toLowerCase().replace(/[^a-z0-9-]/g, '') || 'unknown';
            const sourceLanguage = task.sourceLanguage || 'auto';
            const targetLanguage = task.targetLanguage || 'zh';
            const resultUrl = typeof task.resultUrl === 'string' ? task.resultUrl.trim() : '';
            const sourceLanguageIcon = resolveImageTranslationLanguageIcon(sourceLanguage);
            const targetLanguageIcon = resolveImageTranslationLanguageIcon(targetLanguage);
            return (
              <article key={task.taskId} className="settings-user-card settings-user-image-translation-item">
                {imageTranslationPreview?.taskId === task.taskId ? (
                  <button
                    ref={imageTranslationPreviewRef}
                    type="button"
                    className={`settings-user-image-translation-preview${imageTranslationPreviewDragging ? ' is-dragging' : ''}`}
                    aria-label={t('settings.user.imageTranslation.previewLabel', { defaultValue: '图片预览' })}
                    onPointerDown={handleImageTranslationPreviewPointerDown}
                    onPointerMove={handleImageTranslationPreviewPointerMove}
                    onPointerUp={handleImageTranslationPreviewPointerUp}
                    onPointerCancel={handleImageTranslationPreviewPointerCancel}
                    onClick={handleImageTranslationPreviewClick}
                  >
                    <img
                      src={imageTranslationPreview.url}
                      alt={imageTranslationPreview.alt}
                      draggable={false}
                      style={{
                        transform: `translate3d(${imageTranslationPreviewOffset.x}px, ${imageTranslationPreviewOffset.y}px, 0) scale(${imageTranslationPreviewScale})`,
                      }}
                    />
                  </button>
                ) : (
                  <>
                    <div className="settings-user-image-translation-item-head">
                      <div className="settings-user-image-translation-meta">
                        <span className="settings-user-image-translation-language-route">
                          <span className="settings-user-image-translation-language">
                            {sourceLanguageIcon.src ? (
                              <img
                                className={sourceLanguageIcon.isAuto ? 'is-auto' : ''}
                                src={sourceLanguageIcon.src}
                                alt=""
                                aria-hidden="true"
                                draggable={false}
                              />
                            ) : null}
                            <span>{sourceLanguage}</span>
                          </span>
                          <span>{t('settings.user.imageTranslation.languageConnector', { defaultValue: '到' })}</span>
                          <span className="settings-user-image-translation-language">
                            {targetLanguageIcon.src ? (
                              <img
                                className={targetLanguageIcon.isAuto ? 'is-auto' : ''}
                                src={targetLanguageIcon.src}
                                alt=""
                                aria-hidden="true"
                                draggable={false}
                              />
                            ) : null}
                            <span>{targetLanguage}</span>
                          </span>
                        </span>
                        <span>{formatDateTime(task.createdAt)}</span>
                      </div>
                      <span className={`settings-user-image-translation-status settings-user-image-translation-status--${statusClass}`}>
                        {getImageTranslationStatusLabel(task.status)}
                      </span>
                    </div>

                    <div className="settings-user-image-translation-images">
                      <figure className="settings-user-image-translation-image-card">
                        <figcaption>{t('settings.user.imageTranslation.sourceImage', { defaultValue: '翻译前' })}</figcaption>
                        <button
                          type="button"
                          className="settings-user-image-translation-image-wrap"
                          onClick={() => setImageTranslationPreview({
                            taskId: task.taskId,
                            url: task.sourceUrl,
                            alt: t('settings.user.imageTranslation.sourceImageAlt', { defaultValue: '翻译前图片' }),
                          })}
                        >
                          <img
                            src={task.sourceUrl}
                            alt={t('settings.user.imageTranslation.sourceImageAlt', { defaultValue: '翻译前图片' })}
                            loading="lazy"
                            draggable={false}
                          />
                        </button>
                      </figure>

                      <figure className="settings-user-image-translation-image-card">
                        <figcaption>{t('settings.user.imageTranslation.resultImage', { defaultValue: '翻译后' })}</figcaption>
                        {resultUrl ? (
                          <button
                            type="button"
                            className="settings-user-image-translation-image-wrap"
                            onClick={() => setImageTranslationPreview({
                              taskId: task.taskId,
                              url: resultUrl,
                              alt: t('settings.user.imageTranslation.resultImageAlt', { defaultValue: '翻译后图片' }),
                            })}
                          >
                            <img
                              src={resultUrl}
                              alt={t('settings.user.imageTranslation.resultImageAlt', { defaultValue: '翻译后图片' })}
                              loading="lazy"
                              draggable={false}
                            />
                          </button>
                        ) : (
                          <div className="settings-user-image-translation-image-wrap">
                            <span className="settings-user-image-translation-image-placeholder">
                              {normalizedStatus === 'FAILED'
                                ? t('settings.user.imageTranslation.resultUnavailable', { defaultValue: '无可用结果图片' })
                                : t('settings.user.imageTranslation.resultPending', { defaultValue: '等待翻译结果' })}
                            </span>
                          </div>
                        )}
                      </figure>
                    </div>

                    <div className="settings-user-image-translation-actions">
                      <button
                        type="button"
                        className="settings-hotkey-btn"
                        disabled={Boolean(imageTranslationDownloadingKey) || Boolean(imageTranslationRemovingTaskId)}
                        onClick={() => void handleDownloadImageTranslationImage(task, 'source', task.sourceUrl)}
                      >
                        {imageTranslationDownloadingKey === `${task.taskId}:source`
                          ? t('settings.user.imageTranslation.actions.downloading', { defaultValue: '下载中…' })
                          : t('settings.user.imageTranslation.actions.downloadSource', { defaultValue: '下载原始截图' })}
                      </button>
                      <button
                        type="button"
                        className="settings-hotkey-btn"
                        disabled={!resultUrl || Boolean(imageTranslationDownloadingKey) || Boolean(imageTranslationRemovingTaskId)}
                        onClick={() => void handleDownloadImageTranslationImage(task, 'result', resultUrl)}
                      >
                        {imageTranslationDownloadingKey === `${task.taskId}:result`
                          ? t('settings.user.imageTranslation.actions.downloading', { defaultValue: '下载中…' })
                          : t('settings.user.imageTranslation.actions.downloadResult', { defaultValue: '下载翻译截图' })}
                      </button>
                      <button
                        type="button"
                        className="settings-hotkey-btn settings-user-image-translation-remove"
                        disabled={!canRemove || Boolean(imageTranslationRemovingTaskId) || Boolean(imageTranslationDownloadingKey)}
                        onClick={() => void handleRemoveImageTranslation(task)}
                      >
                        {imageTranslationRemovingTaskId === task.taskId
                          ? t('settings.user.imageTranslation.actions.removing', { defaultValue: '抹掉中…' })
                          : t('settings.user.imageTranslation.actions.remove', { defaultValue: '抹掉此记录' })}
                      </button>
                    </div>

                    {imageTranslationActionFeedback?.taskId === task.taskId
                      ? renderFeedback(imageTranslationActionFeedback.feedback)
                      : null}

                    {task.errorMessage ? (
                      <div className="settings-user-image-translation-error">{task.errorMessage}</div>
                    ) : null}
                  </>
                )}
              </article>
            );
          })}
        </div>

        {imageTranslationHistoryTotalPages > 0 ? (
          <nav className="settings-plugin-market-pagination settings-user-image-translation-pagination" aria-label={t('settings.user.imageTranslation.pagination.label', { defaultValue: '图片翻译历史分页' })}>
            <button
              type="button"
              className="settings-hotkey-btn"
              disabled={loadingImageTranslationHistory || imageTranslationHistoryPage <= 1}
              onClick={() => setImageTranslationHistoryPage((current) => Math.max(1, current - 1))}
            >
              {t('settings.user.imageTranslation.pagination.previous', { defaultValue: '上一页' })}
            </button>
            <span className="settings-plugin-market-pagination-text settings-user-image-translation-pagination-summary">
              {t('settings.user.imageTranslation.pagination.summary', {
                defaultValue: '第 {{page}} / {{totalPages}} 页，共 {{total}} 条',
                page: imageTranslationHistoryPage,
                totalPages: imageTranslationHistoryTotalPages,
                total: imageTranslationHistoryTotal,
              })}
            </span>
            <button
              type="button"
              className="settings-hotkey-btn"
              disabled={loadingImageTranslationHistory || imageTranslationHistoryPage >= imageTranslationHistoryTotalPages}
              onClick={() => setImageTranslationHistoryPage((current) => Math.min(imageTranslationHistoryTotalPages, current + 1))}
            >
              {t('settings.user.imageTranslation.pagination.next', { defaultValue: '下一页' })}
            </button>
          </nav>
        ) : null}
      </div>
    );

    const renderOcrHistoryPage = (): ReactElement => (
      <div className="settings-user-page-panel settings-user-image-translation-panel settings-user-ocr-history-panel">
        <div className="settings-user-card settings-user-image-translation-head-card settings-user-ocr-history-head-card">
          <div className="settings-user-image-translation-head settings-user-ocr-history-head">
            <div>
              <div className="settings-user-form-title">{t('settings.user.pages.ocr-history', { defaultValue: 'OCR记录' })}</div>
              <div className="settings-user-card-title-hint">
                {t('settings.user.ocrHistory.subtitle', { defaultValue: '查看原始图片与 OCR 识别文本' })}
              </div>
            </div>
          </div>
        </div>

        {loadingOcrHistory && ocrHistory.length === 0 ? (
          <div className="settings-user-card settings-user-image-translation-state">
            <span className="settings-user-orders-inline-spinner" aria-hidden="true" />
            <span>{t('settings.user.ocrHistory.loading', { defaultValue: '加载 OCR 历史记录中…' })}</span>
          </div>
        ) : null}

        {ocrHistoryError ? (
          <div className="settings-user-feedback settings-user-feedback--error">
            {ocrHistoryError}
          </div>
        ) : null}

        {!loadingOcrHistory && !ocrHistoryError && ocrHistory.length === 0 ? (
          <div className="settings-user-card settings-user-image-translation-state">
            {t('settings.user.ocrHistory.empty', { defaultValue: '暂无 OCR 历史记录' })}
          </div>
        ) : null}

        <div className="settings-user-image-translation-list">
          {ocrHistory.map((item) => (
            <article key={item.id} className="settings-user-card settings-user-image-translation-item">
              <div className="settings-user-image-translation-item-head">
                <div className="settings-user-image-translation-meta">
                  <span>{t('settings.user.ocrHistory.record', { defaultValue: 'OCR #{{id}}', id: item.id })}</span>
                  <span>{formatDateTime(item.createdAt)}</span>
                </div>
              </div>

              <div className="settings-user-image-translation-images settings-user-ocr-history-content">
                <figure className="settings-user-image-translation-image-card">
                  <figcaption>{t('settings.user.ocrHistory.sourceImage', { defaultValue: '原始图片' })}</figcaption>
                  <div className="settings-user-image-translation-image-wrap">
                    <img
                      src={item.sourceUrl}
                      alt={t('settings.user.ocrHistory.sourceImageAlt', { defaultValue: 'OCR 原始图片' })}
                      loading="lazy"
                      draggable={false}
                    />
                  </div>
                </figure>

                <figure className="settings-user-image-translation-image-card">
                  <figcaption>{t('settings.user.ocrHistory.recognizedText', { defaultValue: '识别文本' })}</figcaption>
                  <pre className="settings-user-ocr-history-text">
                    {item.recognizedText || t('settings.user.ocrHistory.emptyText', { defaultValue: '未识别到文本' })}
                  </pre>
                </figure>
              </div>

              <div className="settings-user-image-translation-actions settings-user-ocr-history-actions">
                <button
                  type="button"
                  className="settings-hotkey-btn"
                  disabled={ocrHistoryDownloadingId !== null || ocrHistoryCopyingId !== null || ocrHistoryRemovingId !== null}
                  onClick={() => void handleDownloadOcrImage(item)}
                >
                  {ocrHistoryDownloadingId === item.id
                    ? t('settings.user.ocrHistory.actions.downloading', { defaultValue: '下载中…' })
                    : t('settings.user.ocrHistory.actions.downloadSource', { defaultValue: '下载原图' })}
                </button>
                <button
                  type="button"
                  className="settings-hotkey-btn"
                  disabled={!item.recognizedText || ocrHistoryDownloadingId !== null || ocrHistoryCopyingId !== null || ocrHistoryRemovingId !== null}
                  onClick={() => void handleCopyOcrText(item)}
                >
                  {ocrHistoryCopyingId === item.id
                    ? t('settings.user.ocrHistory.actions.copying', { defaultValue: '复制中…' })
                    : t('settings.user.ocrHistory.actions.copyText', { defaultValue: '复制所有文本' })}
                </button>
                <button
                  type="button"
                  className="settings-hotkey-btn settings-user-image-translation-remove"
                  disabled={ocrHistoryDownloadingId !== null || ocrHistoryCopyingId !== null || ocrHistoryRemovingId !== null}
                  onClick={() => void handleRemoveOcrHistory(item)}
                >
                  {ocrHistoryRemovingId === item.id
                    ? t('settings.user.ocrHistory.actions.removing', { defaultValue: '抹掉中…' })
                    : t('settings.user.ocrHistory.actions.remove', { defaultValue: '抹掉此记录' })}
                </button>
              </div>

              {ocrHistoryActionFeedback?.id === item.id
                ? renderFeedback(ocrHistoryActionFeedback.feedback)
                : null}
            </article>
          ))}
        </div>

        {ocrHistoryTotalPages > 0 ? (
          <nav className="settings-plugin-market-pagination settings-user-image-translation-pagination" aria-label={t('settings.user.ocrHistory.pagination.label', { defaultValue: 'OCR 历史分页' })}>
            <button
              type="button"
              className="settings-hotkey-btn"
              disabled={loadingOcrHistory || ocrHistoryPage <= 1}
              onClick={() => setOcrHistoryPage((current) => Math.max(1, current - 1))}
            >
              {t('settings.user.ocrHistory.pagination.previous', { defaultValue: '上一页' })}
            </button>
            <span className="settings-plugin-market-pagination-text settings-user-image-translation-pagination-summary">
              {t('settings.user.ocrHistory.pagination.summary', {
                defaultValue: '第 {{page}} / {{totalPages}} 页，共 {{total}} 条',
                page: ocrHistoryPage,
                totalPages: ocrHistoryTotalPages,
                total: ocrHistoryTotal,
              })}
            </span>
            <button
              type="button"
              className="settings-hotkey-btn"
              disabled={loadingOcrHistory || ocrHistoryPage >= ocrHistoryTotalPages}
              onClick={() => setOcrHistoryPage((current) => Math.min(ocrHistoryTotalPages, current + 1))}
            >
              {t('settings.user.ocrHistory.pagination.next', { defaultValue: '下一页' })}
            </button>
          </nav>
        ) : null}
      </div>
    );

    /** 渲染当前用户的问卷提交记录与只读答案。 */
    const renderQuestionnairePage = (): ReactElement => (
      <div className="settings-user-page-panel settings-user-questionnaire-panel">
        <div className="settings-user-card settings-user-questionnaire-head-card">
          <div className="settings-user-questionnaire-head">
            <div>
              <div className="settings-user-form-title">{t('settings.user.pages.questionnaire')}</div>
              <div className="settings-user-card-title-hint">
                {t('settings.user.questionnaire.subtitle')}
              </div>
            </div>
          </div>
        </div>

        {questionnaireReminder.questionnaire && (
          <QuestionnaireBanner
            count={questionnaireReminder.count}
            onOpen={setQuestionnaire}
            onDismiss={questionnaireReminder.dismiss}
          />
        )}

        {loadingQuestionnaireHistory && questionnaireHistory.length === 0 ? (
          <div className="settings-user-card settings-user-questionnaire-empty">
            <span className="settings-user-orders-inline-spinner" aria-hidden="true" />
            <span>{t('settings.user.questionnaire.loading')}</span>
          </div>
        ) : null}

        {questionnaireHistoryError ? (
          <div className="settings-user-feedback settings-user-feedback--error">
            {questionnaireHistoryError}
          </div>
        ) : null}

        {renderFeedback(questionnaireHistoryFeedback)}

        {!loadingQuestionnaireHistory && !questionnaireHistoryError && questionnaireHistory.length === 0 ? (
          <div className="settings-user-card settings-user-questionnaire-empty">
            {t('settings.user.questionnaire.empty')}
          </div>
        ) : null}

        <div className="settings-user-questionnaire-list">
          {questionnaireHistory.map((item) => {
            const expanded = expandedQuestionnaireResultId === item.resultId;
            return (
              <article key={item.resultId} className="settings-user-card settings-user-questionnaire-item">
                <header className="settings-user-questionnaire-item-head">
                  <div className="settings-user-questionnaire-title">
                    <strong>{item.questionnaire.title}</strong>
                    {item.questionnaire.description ? <span>{item.questionnaire.description}</span> : null}
                  </div>
                  <div className="settings-user-questionnaire-item-actions">
                    <button
                      type="button"
                      className="settings-hotkey-btn"
                      aria-expanded={expanded}
                      disabled={questionnaireErasingResultId !== null}
                      onClick={() => setExpandedQuestionnaireResultId(expanded ? null : item.resultId)}
                    >
                      {t(expanded ? 'settings.user.questionnaire.hideDetails' : 'settings.user.questionnaire.viewDetails')}
                    </button>
                    {questionnaireEraseConfirmResultId === item.resultId ? (
                      <>
                        <button
                          type="button"
                          className="settings-hotkey-btn settings-hotkey-btn-danger"
                          disabled={questionnaireErasingResultId !== null}
                          onClick={() => void handleEraseQuestionnaireHistory(item)}
                        >
                          {questionnaireErasingResultId === item.resultId
                            ? t('settings.user.questionnaire.erasing')
                            : t('settings.user.questionnaire.confirmErase')}
                        </button>
                        <button
                          type="button"
                          className="settings-hotkey-btn"
                          disabled={questionnaireErasingResultId !== null}
                          onClick={() => setQuestionnaireEraseConfirmResultId(null)}
                        >
                          {t('settings.user.questionnaire.cancelErase')}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="settings-hotkey-btn settings-hotkey-btn-danger"
                        disabled={questionnaireErasingResultId !== null}
                        onClick={() => {
                          setQuestionnaireHistoryFeedback(null);
                          setQuestionnaireEraseConfirmResultId(item.resultId);
                        }}
                      >
                        {t('settings.user.questionnaire.erase')}
                      </button>
                    )}
                  </div>
                </header>
                <div className="settings-user-questionnaire-meta">
                  <span>{t('settings.user.questionnaire.submittedAt', { time: formatDateTime(item.submittedAt) })}</span>
                  {item.rewardProDays > 0 ? (
                    <>
                      <span className="settings-user-questionnaire-reward">
                        {t('settings.user.questionnaire.rewardDays', { days: item.rewardProDays })}
                      </span>
                      {item.rewardProExpireAt ? (
                        <span>{t('settings.user.questionnaire.rewardExpireAt', { time: formatDateTime(item.rewardProExpireAt) })}</span>
                      ) : null}
                    </>
                  ) : <span>{t('settings.user.questionnaire.noReward')}</span>}
                </div>
                <div
                  className={`settings-user-questionnaire-details${expanded ? ' settings-user-questionnaire-details--expanded' : ''}`}
                  aria-hidden={!expanded}
                  inert={!expanded}
                >
                  <div className="settings-user-questionnaire-details-inner">
                    <div className="settings-user-questionnaire-answers">
                      {item.questionnaire.questions.map((question, index) => (
                        <QuestionnaireQuestion
                          key={question.id}
                          question={question}
                          index={index}
                          answer={item.answers[question.id]}
                          readOnly
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    );

    const rechargeAmountYuan = rechargeSelected !== null && rechargeSelected !== undefined
      ? rechargeSelected
      : (rechargeCustomValue.trim() !== '' ? parseFloat(rechargeCustomValue) : NaN);
    const rechargeAmountValid = !isNaN(rechargeAmountYuan) && rechargeAmountYuan > 0;

    const handleRechargeSubmit = (): void => {
      if (!rechargeAmountValid) return;
      const amountFen = Math.round(rechargeAmountYuan * 100);
      setPayment({ type: 'recharge', amountFen });
    };

    const renderRechargePage = (): ReactElement => (
      <div className="settings-user-page-panel settings-user-recharge-panel">
        <div className="settings-user-card settings-user-recharge-intro-card">
          <div className="settings-user-form-title">{t('settings.user.recharge.title', { defaultValue: '余额充值' })}</div>
          <div className="settings-user-card-title-hint">
            {t('settings.user.recharge.subtitle', { defaultValue: '充值后可用于 AI 助手对话消耗' })}
          </div>
          {userBalance !== null && userBalance !== undefined && (
            <div className="settings-user-recharge-balance">
              {t('settings.user.recharge.currentBalance', { defaultValue: '当前余额' })}：
              <span className="settings-user-recharge-balance-value">¥{userBalance}</span>
            </div>
          )}
        </div>

        <div className="settings-user-recharge-grid">
          {RECHARGE_PRESETS.map((amount) => (
            <button
              key={amount}
              type="button"
              className={`settings-user-recharge-option ${rechargeSelected === amount ? 'active' : ''}`}
              onClick={() => {
                setRechargeSelected(rechargeSelected === amount ? null : amount);
                setRechargeCustomValue('');
                setRechargeFeedback(null);
              }}
            >
              <span className="settings-user-recharge-option-amount">¥{amount}</span>
            </button>
          ))}
          <div className={`settings-user-recharge-option settings-user-recharge-option--custom ${rechargeSelected === null || rechargeSelected === undefined ? (rechargeCustomValue.trim() !== '' ? 'active' : '') : ''}`}>
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder={t('settings.user.recharge.customPlaceholder', { defaultValue: '自定义' })}
              className="settings-user-recharge-custom-input"
              value={rechargeCustomValue}
              onChange={(e) => {
                setRechargeCustomValue(e.target.value);
                setRechargeSelected(null);
                setRechargeFeedback(null);
              }}
            />
          </div>
        </div>

        {rechargeFeedback && (
          <div className={`settings-user-feedback settings-user-feedback--${rechargeFeedback.type}`}>
            {rechargeFeedback.text}
          </div>
        )}

        <div className="settings-user-recharge-actions">
          <button
            type="button"
            className="settings-user-primary-btn"
            disabled={!rechargeAmountValid}
            onClick={handleRechargeSubmit}
          >
            {rechargeAmountValid
              ? t('settings.user.recharge.confirm', { defaultValue: '确认充值 ¥{{amount}}', amount: rechargeAmountYuan.toFixed(2) })
              : t('settings.user.recharge.selectAmount', { defaultValue: '请选择充值金额' })}
          </button>
        </div>
      </div>
    );

    return (
      <div className="settings-user-profile settings-user-profile-paged">
        <div className="settings-user-profile-main">
          {userProfilePage === 'info' && renderInfoPage()}
          {userProfilePage === 'edit' && renderEditPage()}
          {userProfilePage === 'password' && renderPasswordPage()}
          {userProfilePage === 'pro' && renderProPage()}
          {userProfilePage === 'recharge' && renderRechargePage()}
          {userProfilePage === 'orders' && renderOrdersPage()}
          {userProfilePage === 'account' && renderAccountPage()}
          {userProfilePage === 'oauth' && renderOAuthPage()}
          {userProfilePage === 'image-translation' && renderImageTranslationPage()}
          {userProfilePage === 'ocr-history' && renderOcrHistoryPage()}
          {userProfilePage === 'questionnaire' && renderQuestionnairePage()}
        </div>

        <SettingsPageNavigation
          activePage={userProfilePage}
          expanded={pageNavigationExpanded}
          pages={USER_PROFILE_PAGES}
          pageLabels={profilePageLabels}
          navigationLabel={t('settings.user.pagination')}
          onSelectPage={setUserProfilePage}
        />
      </div>
    );
  };

  return (
    <div className="max-expand-settings-section settings-user">
      <div className="max-expand-settings-title settings-app-title-line">
        <span>{t('settings.labels.user', { defaultValue: '用户中心' })}</span>
        {token && profile && <span className="settings-app-title-sub">- {currentUserProfilePageLabel}</span>}
        {token && profile && (
          <SettingsPageNavigationToggle
            expanded={pageNavigationExpanded}
            label={t(pageNavigationExpanded ? 'settings.navigation.collapse' : 'settings.navigation.expand')}
            onToggle={() => setPageNavigationExpanded((current) => !current)}
          />
        )}
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
