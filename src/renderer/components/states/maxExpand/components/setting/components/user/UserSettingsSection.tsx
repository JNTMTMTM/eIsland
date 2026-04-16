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
  loginUser,
  logoutUser,
  readLocalProfile,
  readLocalToken,
  registerUser,
  unregisterUser,
  updateUserProfile,
  uploadUserAvatar,
  writeLocalProfile,
  writeLocalToken,
  type UserAccountGender,
  type UserAccountProfile,
} from '../../../../../../../api/userAccountApi';

type Mode = 'login' | 'register';
type FeedbackType = 'success' | 'error' | 'info';

interface Feedback {
  type: FeedbackType;
  text: string;
}

const GENDER_VALUES: UserAccountGender[] = ['male', 'female', 'custom', 'undisclosed'];

/**
 * 用户中心设置区块。未登录时显示登录/注册；登录后显示资料修改、登出、注销操作。
 * @returns 用户中心设置面板。
 */
export function UserSettingsSection(): ReactElement {
  const { t } = useTranslation();
  const [token, setToken] = useState<string | null>(() => readLocalToken());
  const [profile, setProfile] = useState<UserAccountProfile | null>(() => readLocalProfile());
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string>('');

  const [mode, setMode] = useState<Mode>('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authFeedback, setAuthFeedback] = useState<Feedback | null>(null);

  const [editAvatar, setEditAvatar] = useState<string | null>(null);
  const [editGender, setEditGender] = useState<UserAccountGender>('undisclosed');
  const [editGenderCustom, setEditGenderCustom] = useState('');
  const [editBirthday, setEditBirthday] = useState('');
  const [editNewPassword, setEditNewPassword] = useState('');
  const [profileFeedback, setProfileFeedback] = useState<Feedback | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [unregisterPassword, setUnregisterPassword] = useState('');
  const [unregisterConfirmVisible, setUnregisterConfirmVisible] = useState(false);
  const [unregisterSubmitting, setUnregisterSubmitting] = useState(false);
  const [unregisterFeedback, setUnregisterFeedback] = useState<Feedback | null>(null);

  const [logoutSubmitting, setLogoutSubmitting] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const applyProfileToEditor = useCallback((p: UserAccountProfile): void => {
    setEditAvatar(p.avatar ?? null);
    setEditGender(p.gender ?? 'undisclosed');
    setEditGenderCustom(p.genderCustom ?? '');
    setEditBirthday(p.birthday ?? '');
    setEditNewPassword('');
  }, []);

  const loadRemoteProfile = useCallback(async (currentToken: string): Promise<void> => {
    setLoadingProfile(true);
    setProfileError('');
    const result = await fetchUserProfile(currentToken);
    setLoadingProfile(false);
    if (!result.ok || !result.data) {
      if (result.code === 401 || result.code === 4011) {
        writeLocalToken(null);
        writeLocalProfile(null);
        setToken(null);
        setProfile(null);
        setProfileError(t('settings.user.feedback.sessionExpired', { defaultValue: '登录已过期，请重新登录' }));
        return;
      }
      setProfileError(result.message || t('settings.user.feedback.loadFailed', { defaultValue: '加载资料失败' }));
      return;
    }
    setProfile(result.data);
    writeLocalProfile(result.data);
    applyProfileToEditor(result.data);
  }, [applyProfileToEditor, t]);

  useEffect(() => {
    if (!token) return;
    if (profile) {
      applyProfileToEditor(profile);
    }
    void loadRemoteProfile(token);
  }, [token, loadRemoteProfile, applyProfileToEditor]);

  const switchMode = (next: Mode): void => {
    setMode(next);
    setAuthFeedback(null);
  };

  const resetAuthForm = (): void => {
    setAuthUsername('');
    setAuthEmail('');
    setAuthPassword('');
  };

  const handleAuthSubmit = async (): Promise<void> => {
    if (authSubmitting) return;
    const username = authUsername.trim();
    const email = authEmail.trim();
    const password = authPassword;
    if (!username) {
      setAuthFeedback({ type: 'error', text: t('settings.user.feedback.usernameRequired', { defaultValue: '请输入用户名' }) });
      return;
    }
    if (!password) {
      setAuthFeedback({ type: 'error', text: t('settings.user.feedback.passwordRequired', { defaultValue: '请输入密码' }) });
      return;
    }
    if (mode === 'register' && !email) {
      setAuthFeedback({ type: 'error', text: t('settings.user.feedback.emailRequired', { defaultValue: '请输入邮箱' }) });
      return;
    }
    setAuthSubmitting(true);
    setAuthFeedback(null);
    const result = mode === 'login'
      ? await loginUser(username, password)
      : await registerUser(username, email, password);
    setAuthSubmitting(false);
    if (!result.ok || !result.data) {
      setAuthFeedback({ type: 'error', text: result.message || t('settings.user.feedback.operationFailed', { defaultValue: '操作失败' }) });
      return;
    }
    writeLocalToken(result.data.token);
    setToken(result.data.token);
    setAuthFeedback({
      type: 'success',
      text: mode === 'login'
        ? t('settings.user.feedback.loginSuccess', { defaultValue: '登录成功' })
        : t('settings.user.feedback.registerSuccess', { defaultValue: '注册成功，已自动登录' }),
    });
    resetAuthForm();
  };

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
      const url = await uploadUserAvatar(file);
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
    if (!token || savingProfile) return;
    if (editNewPassword && editNewPassword.length < 8) {
      setProfileFeedback({ type: 'error', text: t('settings.user.feedback.passwordTooShort', { defaultValue: '密码至少 8 位且包含字母与数字' }) });
      return;
    }
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
    if (editNewPassword) payload.password = editNewPassword;
    const result = await updateUserProfile(token, payload);
    if (!result.ok) {
      setSavingProfile(false);
      if (result.code === 401 || result.code === 4011) {
        writeLocalToken(null);
        writeLocalProfile(null);
        setToken(null);
        setProfile(null);
        setProfileFeedback({ type: 'error', text: t('settings.user.feedback.sessionExpired', { defaultValue: '登录已过期，请重新登录' }) });
        return;
      }
      setProfileFeedback({ type: 'error', text: result.message || t('settings.user.feedback.saveFailed', { defaultValue: '保存失败' }) });
      return;
    }
    await loadRemoteProfile(token);
    setEditNewPassword('');
    setSavingProfile(false);
    setProfileFeedback({ type: 'success', text: t('settings.user.feedback.saveSuccess', { defaultValue: '资料已更新' }) });
  };

  const handleLogout = async (): Promise<void> => {
    if (!token || logoutSubmitting) return;
    setLogoutSubmitting(true);
    const result = await logoutUser(token);
    writeLocalToken(null);
    writeLocalProfile(null);
    setToken(null);
    setProfile(null);
    setAuthFeedback({
      type: result.ok ? 'success' : 'info',
      text: result.ok
        ? t('settings.user.feedback.logoutSuccess', { defaultValue: '已退出登录' })
        : t('settings.user.feedback.logoutLocalOnly', { defaultValue: '服务端响应异常，已在本地清除登录态' }),
    });
    setLogoutSubmitting(false);
  };

  const requestUnregister = (): void => {
    setUnregisterFeedback(null);
    setUnregisterPassword('');
    setUnregisterConfirmVisible(true);
  };

  const cancelUnregister = (): void => {
    setUnregisterConfirmVisible(false);
    setUnregisterPassword('');
    setUnregisterFeedback(null);
  };

  const handleUnregister = async (): Promise<void> => {
    if (!token || unregisterSubmitting) return;
    if (!unregisterPassword) {
      setUnregisterFeedback({ type: 'error', text: t('settings.user.feedback.unregisterPasswordRequired', { defaultValue: '请输入当前密码以确认注销' }) });
      return;
    }
    setUnregisterSubmitting(true);
    setUnregisterFeedback(null);
    const result = await unregisterUser(token, unregisterPassword);
    setUnregisterSubmitting(false);
    if (!result.ok) {
      setUnregisterFeedback({ type: 'error', text: result.message || t('settings.user.feedback.unregisterFailed', { defaultValue: '注销失败' }) });
      return;
    }
    writeLocalToken(null);
    writeLocalProfile(null);
    setToken(null);
    setProfile(null);
    setUnregisterConfirmVisible(false);
    setUnregisterPassword('');
    setAuthFeedback({ type: 'success', text: t('settings.user.feedback.unregisterSuccess', { defaultValue: '账号已注销' }) });
  };

  const renderFeedback = (feedback: Feedback | null): ReactElement | null => {
    if (!feedback) return null;
    return (
      <div className={`settings-user-feedback settings-user-feedback--${feedback.type}`}>{feedback.text}</div>
    );
  };

  const renderAuth = (): ReactElement => {
    return (
      <div className="settings-user-auth">
        <div className="settings-user-auth-tabs">
          <button
            type="button"
            className={`settings-user-auth-tab${mode === 'login' ? ' active' : ''}`}
            onClick={() => switchMode('login')}
          >
            {t('settings.user.auth.login', { defaultValue: '登录' })}
          </button>
          <button
            type="button"
            className={`settings-user-auth-tab${mode === 'register' ? ' active' : ''}`}
            onClick={() => switchMode('register')}
          >
            {t('settings.user.auth.register', { defaultValue: '注册' })}
          </button>
        </div>
        <div className="settings-user-form">
          <label className="settings-field">
            <span className="settings-field-label">{t('settings.user.fields.username', { defaultValue: '用户名' })}</span>
            <input
              className="settings-field-input"
              value={authUsername}
              onChange={(e) => setAuthUsername(e.target.value)}
              placeholder={t('settings.user.fields.usernamePlaceholder', { defaultValue: '2-32 位，支持中英文 / 数字 / 下划线' })}
            />
          </label>
          {mode === 'register' && (
            <label className="settings-field">
              <span className="settings-field-label">{t('settings.user.fields.email', { defaultValue: '邮箱' })}</span>
              <input
                className="settings-field-input"
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </label>
          )}
          <label className="settings-field">
            <span className="settings-field-label">{t('settings.user.fields.password', { defaultValue: '密码' })}</span>
            <input
              className="settings-field-input"
              type="password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              placeholder={t('settings.user.fields.passwordPlaceholder', { defaultValue: '至少 8 位，含字母与数字' })}
            />
          </label>
          <button
            type="button"
            className="settings-user-primary-btn"
            onClick={() => void handleAuthSubmit()}
            disabled={authSubmitting}
          >
            {authSubmitting
              ? t('settings.user.feedback.submitting', { defaultValue: '处理中…' })
              : mode === 'login'
                ? t('settings.user.auth.loginBtn', { defaultValue: '登录' })
                : t('settings.user.auth.registerBtn', { defaultValue: '注册并登录' })}
          </button>
          {renderFeedback(authFeedback)}
          <div className="settings-user-auth-hint">
            {t('settings.user.auth.hint', { defaultValue: '账号体系由 pyisland-admin 提供，登录状态仅存储在本机。' })}
          </div>
        </div>
      </div>
    );
  };

  const renderProfileEditor = (): ReactElement => {
    const displayAvatar = editAvatar || profile?.avatar || '';
    return (
      <div className="settings-user-profile">
        <div className="settings-user-card">
          <div className="settings-user-card-head">
            <div className="settings-user-card-avatar">
              {displayAvatar
                ? <img src={displayAvatar} alt={profile?.username ?? ''} />
                : <span className="settings-user-card-avatar-placeholder">{(profile?.username || '?').slice(0, 1)}</span>}
            </div>
            <div className="settings-user-card-meta">
              <div className="settings-user-card-name">{profile?.username ?? authUsername}</div>
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

        <div className="settings-user-form">
          <div className="settings-user-form-title">{t('settings.user.sections.avatar', { defaultValue: '头像' })}</div>
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
              <input
                className="settings-field-input"
                type="text"
                value={editAvatar ?? ''}
                onChange={(e) => setEditAvatar(e.target.value)}
                placeholder={t('settings.user.fields.avatarUrlPlaceholder', { defaultValue: '或直接粘贴头像 URL' })}
              />
            </div>
          </div>

          <div className="settings-user-form-title">{t('settings.user.sections.profile', { defaultValue: '基本资料' })}</div>
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
              value={editBirthday}
              onChange={(e) => setEditBirthday(e.target.value)}
            />
          </label>

          <div className="settings-user-form-title">{t('settings.user.sections.password', { defaultValue: '修改密码（可选）' })}</div>
          <label className="settings-field">
            <span className="settings-field-label">{t('settings.user.fields.newPassword', { defaultValue: '新密码' })}</span>
            <input
              className="settings-field-input"
              type="password"
              value={editNewPassword}
              onChange={(e) => setEditNewPassword(e.target.value)}
              placeholder={t('settings.user.fields.newPasswordPlaceholder', { defaultValue: '留空则不修改，至少 8 位含字母数字' })}
            />
          </label>

          {renderFeedback(profileFeedback)}
          <div className="settings-user-actions-row">
            <button
              type="button"
              className="settings-user-primary-btn"
              onClick={() => void handleSaveProfile()}
              disabled={savingProfile || loadingProfile}
            >
              {savingProfile ? t('settings.user.actions.saving', { defaultValue: '保存中…' }) : t('settings.user.actions.saveProfile', { defaultValue: '保存资料' })}
            </button>
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
                <input
                  className="settings-field-input"
                  type="password"
                  value={unregisterPassword}
                  onChange={(e) => setUnregisterPassword(e.target.value)}
                  placeholder={t('settings.user.fields.currentPasswordPlaceholder', { defaultValue: '输入当前密码进行确认' })}
                />
              </label>
              {renderFeedback(unregisterFeedback)}
              <div className="settings-user-actions-row">
                <button
                  type="button"
                  className="settings-user-danger-btn"
                  onClick={() => void handleUnregister()}
                  disabled={unregisterSubmitting}
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
  };

  return (
    <div className="max-expand-settings-section settings-user">
      <div className="max-expand-settings-title">{t('settings.labels.user', { defaultValue: '用户中心' })}</div>
      {token && profile ? renderProfileEditor() : token ? (
        <div className="settings-user-loading">
          {loadingProfile
            ? t('settings.user.feedback.loadingProfile', { defaultValue: '加载账号资料中…' })
            : t('settings.user.feedback.loadFailed', { defaultValue: '加载资料失败' })}
          {profileError && <div className="settings-user-feedback settings-user-feedback--error">{profileError}</div>}
        </div>
      ) : renderAuth()}
    </div>
  );
}
