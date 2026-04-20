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
  fetchUserProfile,
  logoutUser,
  unregisterUser,
  updateUserPassword,
  updateUserProfile,
  uploadUserAvatar,
} from '../../../../../../../api/userAccountApi';
import useIslandStore from '../../../../../../../store/slices';
import {
  clearLocalAccount,
  readLocalProfile,
  readLocalToken,
  subscribeUserAccountSessionChanged,
  writeLocalProfile,
  type UserAccountGender,
  type UserAccountProfile,
} from '../../../../../../../utils/userAccount';

type FeedbackType = 'success' | 'error' | 'info';
type UserProfilePage = 'info' | 'edit' | 'account';

interface Feedback {
  type: FeedbackType;
  text: string;
}

const GENDER_VALUES: UserAccountGender[] = ['male', 'female', 'custom', 'undisclosed'];
const USER_PROFILE_PAGES: UserProfilePage[] = ['info', 'edit', 'account'];

/**
 * 用户中心设置区块。未登录时显示登录/注册；登录后显示资料修改、登出、注销操作。
 * @returns 用户中心设置面板。
 */
export function UserSettingsSection(): ReactElement {
  const { t, i18n } = useTranslation();
  const { setLogin, setRegister } = useIslandStore();
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
  const [editNewPasswordVisible, setEditNewPasswordVisible] = useState(false);
  const [editConfirmPasswordVisible, setEditConfirmPasswordVisible] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<Feedback | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [unregisterPassword, setUnregisterPassword] = useState('');
  const [unregisterPasswordVisible, setUnregisterPasswordVisible] = useState(false);
  const [unregisterConfirmVisible, setUnregisterConfirmVisible] = useState(false);
  const [unregisterSubmitting, setUnregisterSubmitting] = useState(false);

  const [logoutSubmitting, setLogoutSubmitting] = useState(false);
  const [userProfilePage, setUserProfilePage] = useState<UserProfilePage>('info');

  const currentUserProfilePageLabel = t(`settings.user.pages.${userProfilePage}`, {
    defaultValue: userProfilePage === 'info' ? '用户信息' : userProfilePage === 'edit' ? '修改信息' : '关于账户',
  });

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const userProfilePageRef = useRef<UserProfilePage>('info');
  const profilePagesLayoutRef = useRef<HTMLDivElement | null>(null);
  userProfilePageRef.current = userProfilePage;

  const resetToLoggedOut = useCallback((): void => {
    clearLocalAccount();
    setToken(null);
    setProfile(null);
    setProfileError('');
    setProfileFeedback(null);
    setUnregisterConfirmVisible(false);
    setUnregisterPassword('');
    setUnregisterPasswordVisible(false);
  }, []);

  const applyProfileToEditor = useCallback((p: UserAccountProfile): void => {
    setEditAvatar(p.avatar ?? null);
    setEditGender(p.gender ?? 'undisclosed');
    setEditGenderCustom(p.genderCustom ?? '');
    setEditBirthday(p.birthday ?? '');
    setEditNewPassword('');
    setEditConfirmPassword('');
    setEditNewPasswordVisible(false);
    setEditConfirmPasswordVisible(false);
  }, []);

  const loadRemoteProfile = useCallback(async (currentToken: string): Promise<void> => {
    setLoadingProfile(true);
    setProfileError('');
    const result = await fetchUserProfile(currentToken);
    setLoadingProfile(false);
    if (!result.ok || !result.data) {
      if (result.code === 401 || result.code === 4011) {
        resetToLoggedOut();
        return;
      }
      setProfileError(result.message || t('settings.user.feedback.loadFailed', { defaultValue: '加载资料失败' }));
      return;
    }
    setProfile(result.data);
    writeLocalProfile(result.data);
    applyProfileToEditor(result.data);
  }, [applyProfileToEditor, resetToLoggedOut, t]);

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
  }, []);

  const handleAvatarSelect = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setProfileFeedback({ type: 'error', text: t('settings.user.feedback.avatarTooLarge', { defaultValue: '头像文件不能超过 5MB' }) });
      return;
    }
    if (!file.type.startsWith('image/')) {
      setProfileFeedback({ type: 'error', text: t('settings.user.feedback.avatarNotImage', { defaultValue: '仅支持上传图片文件' }) });
      return;
    }
    setAvatarUploading(true);
    setProfileFeedback(null);
    try {
      const currentToken = readLocalToken();
      if (!currentToken) {
        throw new Error(t('settings.user.feedback.needLogin', { defaultValue: '请先登录后再上传头像' }));
      }
      const url = await uploadUserAvatar(file, currentToken);
      setEditAvatar(url);
      setProfileFeedback({ type: 'success', text: t('settings.user.feedback.avatarUploaded', { defaultValue: '头像已上传，保存资料生效' }) });
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('settings.user.feedback.avatarUploadFailed', { defaultValue: '头像上传失败' });
      setProfileFeedback({ type: 'error', text: msg });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSaveProfile = async (): Promise<void> => {
    if (!token || savingProfile || savingPassword) return;
    if (editBirthday && !/^\d{4}-\d{2}-\d{2}$/.test(editBirthday)) {
      setProfileFeedback({ type: 'error', text: t('settings.user.feedback.birthdayInvalid', { defaultValue: '生日格式应为 yyyy-MM-dd' }) });
      return;
    }
    setSavingProfile(true);
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
      setProfileFeedback({ type: 'error', text: profileResult.message || t('settings.user.feedback.saveFailed', { defaultValue: '保存失败' }) });
      return;
    }
    await loadRemoteProfile(token);
    setEditNewPassword('');
    setEditConfirmPassword('');
    setEditNewPasswordVisible(false);
    setEditConfirmPasswordVisible(false);
    setSavingProfile(false);
    setProfileFeedback({ type: 'success', text: t('settings.user.feedback.saveSuccess', { defaultValue: '资料已更新' }) });
  };

  const handleChangePassword = async (): Promise<void> => {
    if (!token || savingPassword || savingProfile) return;
    if (!editNewPassword) {
      setProfileFeedback({ type: 'error', text: t('settings.user.feedback.passwordRequired', { defaultValue: '请输入密码' }) });
      return;
    }
    if (editNewPassword.length < 8) {
      setProfileFeedback({ type: 'error', text: t('settings.user.feedback.passwordTooShort', { defaultValue: '密码至少 8 位且包含字母与数字' }) });
      return;
    }
    if (!editConfirmPassword) {
      setProfileFeedback({ type: 'error', text: t('settings.user.feedback.passwordConfirmRequired', { defaultValue: '请再次输入新密码进行确认' }) });
      return;
    }
    if (editNewPassword !== editConfirmPassword) {
      setProfileFeedback({ type: 'error', text: t('settings.user.feedback.passwordConfirmMismatch', { defaultValue: '两次输入的新密码不一致' }) });
      return;
    }
    setSavingPassword(true);
    setProfileFeedback(null);
    const passwordResult = await updateUserPassword(token, { password: editNewPassword });
    if (!passwordResult.ok) {
      setSavingPassword(false);
      if (passwordResult.code === 401 || passwordResult.code === 4011) {
        resetToLoggedOut();
        return;
      }
      setProfileFeedback({ type: 'error', text: passwordResult.message || t('settings.user.feedback.saveFailed', { defaultValue: '保存失败' }) });
      return;
    }
    setEditNewPassword('');
    setEditConfirmPassword('');
    setEditNewPasswordVisible(false);
    setEditConfirmPasswordVisible(false);
    setSavingPassword(false);
    setProfileFeedback({ type: 'success', text: t('settings.user.feedback.passwordChangeSuccess', { defaultValue: '密码已更新' }) });
  };

  const handleCancelProfileChanges = (): void => {
    if (!profile) return;
    applyProfileToEditor(profile);
    setProfileFeedback(null);
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
    setUnregisterPasswordVisible(false);
    setUnregisterConfirmVisible(true);
  };

  const cancelUnregister = (): void => {
    setUnregisterConfirmVisible(false);
    setUnregisterPassword('');
    setUnregisterPasswordVisible(false);
  };

  const handleUnregister = async (): Promise<void> => {
    if (!token || unregisterSubmitting) return;
    if (!unregisterPassword.trim()) {
      return;
    }
    setUnregisterSubmitting(true);
    const result = await unregisterUser(token, unregisterPassword);
    setUnregisterSubmitting(false);
    if (!result.ok) {
      if (result.code === 401 || result.code === 4011) {
        resetToLoggedOut();
        return;
      }
      setProfileFeedback({ type: 'error', text: result.message || t('settings.user.feedback.operationFailed', { defaultValue: '操作失败' }) });
      return;
    }
    clearLocalAccount();
    setToken(null);
    setProfile(null);
    setUnregisterConfirmVisible(false);
    setUnregisterPassword('');
    setUnregisterPasswordVisible(false);
  };

  const renderFeedback = (feedback: Feedback | null): ReactElement | null => {
    if (!feedback) return null;
    return (
      <div className={`settings-user-feedback settings-user-feedback--${feedback.type}`}>{feedback.text}</div>
    );
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
    const profilePageItems: Array<{ id: UserProfilePage; label: string }> = [
      { id: 'info', label: t('settings.user.pages.info', { defaultValue: '用户信息' }) },
      { id: 'edit', label: t('settings.user.pages.edit', { defaultValue: '修改信息' }) },
      { id: 'account', label: t('settings.user.pages.account', { defaultValue: '关于账户' }) },
    ];

    const renderInfoPage = (): ReactElement => (
      <div className="settings-user-page-panel">
        <div className="settings-user-card">
          <div className="settings-user-card-head">
            <div className="settings-user-card-avatar">
              {displayAvatar
                ? <img src={displayAvatar} alt={profile?.username ?? ''} />
                : <span className="settings-user-card-avatar-placeholder">{(profile?.username || '?').slice(0, 1)}</span>}
            </div>
            <div className="settings-user-card-meta">
              <div className="settings-user-card-name">{profile?.username ?? ''}</div>
              <div className="settings-user-card-sub">{profile?.email ?? ''}</div>
              <div className="settings-user-card-sub">{t('settings.user.card.memberSince', { defaultValue: '加入时间' })}：{profile?.createdAt ? profile.createdAt.replace('T', ' ') : '—'}</div>
            </div>
            <button
              type="button"
              className="settings-user-secondary-btn"
              onClick={() => token && void loadRemoteProfile(token)}
              disabled={loadingProfile}
            >
              {loadingProfile ? t('settings.user.actions.refreshing', { defaultValue: '刷新中…' }) : t('settings.user.actions.refresh', { defaultValue: '刷新资料' })}
            </button>
          </div>
          {profileError && <div className="settings-user-feedback settings-user-feedback--error">{profileError}</div>}
        </div>

        <div className="settings-user-overview-grid">
          <div className="settings-user-overview-item">
            <div className="settings-user-overview-label">{t('settings.user.fields.username', { defaultValue: '用户名' })}</div>
            <div className="settings-user-overview-value">{profile?.username ?? '—'}</div>
          </div>
          <div className="settings-user-overview-item">
            <div className="settings-user-overview-label">{t('settings.user.fields.email', { defaultValue: '邮箱' })}</div>
            <div className="settings-user-overview-value">{profile?.email ?? '—'}</div>
          </div>
          <div className="settings-user-overview-item">
            <div className="settings-user-overview-label">{t('settings.user.fields.gender', { defaultValue: '性别' })}</div>
            <div className="settings-user-overview-value">{t(`settings.user.gender.${profile?.gender ?? 'undisclosed'}`, { defaultValue: profile?.gender ?? 'undisclosed' })}</div>
          </div>
          <div className="settings-user-overview-item">
            <div className="settings-user-overview-label">{t('settings.user.fields.birthday', { defaultValue: '生日' })}</div>
            <div className="settings-user-overview-value">{profile?.birthday ?? '—'}</div>
          </div>
        </div>
      </div>
    );

    const renderEditPage = (): ReactElement => (
      <div className="settings-user-page-panel settings-user-edit-scroll">
        {profileError && <div className="settings-user-feedback settings-user-feedback--error">{profileError}</div>}
        <div className="settings-user-form settings-user-edit-cards">
          <div className="settings-user-edit-card">
            <div className="settings-user-edit-card-head">
              <div className="settings-user-form-title">{t('settings.user.sections.avatar', { defaultValue: '头像' })}</div>
              <div className="settings-user-edit-card-subtitle">{t('settings.user.sections.avatarHint', { defaultValue: '上传新头像或粘贴图片链接' })}</div>
            </div>
            <div className="settings-user-avatar-row">
              <div className="settings-user-avatar-preview">
                {displayAvatar
                  ? <img src={displayAvatar} alt="avatar preview" />
                  : <span className="settings-user-card-avatar-placeholder">?</span>}
              </div>
              <div className="settings-user-avatar-actions">
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
            <div className="settings-user-actions-row settings-user-actions-row--adaptive">
              <button
                type="button"
                className="settings-user-primary-btn"
                onClick={() => void handleSaveProfile()}
                disabled={savingProfile || savingPassword || loadingProfile}
              >
                {savingProfile ? t('settings.user.actions.saving', { defaultValue: '保存中…' }) : t('settings.user.actions.saveProfile', { defaultValue: '保存资料' })}
              </button>
            </div>
          </div>

          <div className="settings-user-edit-card">
            <div className="settings-user-edit-card-head">
              <div className="settings-user-form-title">{t('settings.user.sections.password', { defaultValue: '修改密码（可选）' })}</div>
              <div className="settings-user-edit-card-subtitle">{t('settings.user.sections.passwordHint', { defaultValue: '留空则保持当前密码不变' })}</div>
            </div>
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
            <div className="settings-user-actions-row settings-user-actions-row--adaptive">
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
            </div>
          </div>

          <div className="settings-user-edit-actions">
            {renderFeedback(profileFeedback)}
            <div className="settings-user-actions-row settings-user-actions-row--adaptive">
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

    const renderAccountPage = (): ReactElement => (
      <div className="settings-user-page-panel">
        <div className="settings-user-card">
          <div className="settings-user-card-title-row">
            <div className="settings-user-form-title">{t('settings.user.pages.account', { defaultValue: '关于账户' })}</div>
            <div className="settings-user-card-title-hint">
              {t('settings.user.auth.hint', { defaultValue: '登录注册服务由 eIsland server 提供' })}
            </div>
          </div>
          {renderFeedback(profileFeedback)}
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
                  disabled={unregisterSubmitting || !unregisterPassword.trim()}
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

    return (
      <div className="settings-user-profile settings-user-profile-paged" ref={profilePagesLayoutRef}>
        <div className="settings-user-profile-main">
          {userProfilePage === 'info' && renderInfoPage()}
          {userProfilePage === 'edit' && renderEditPage()}
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
                onClick={() => token && void loadRemoteProfile(token)}
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
