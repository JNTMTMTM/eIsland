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
 * @file useUpdateSettingsState.ts
 * @description 设置页更新模块状态 Hook，负责更新源、自动更新提示与更新流程控制
 * @author 鸡哥
 */

import { useEffect, useState } from 'react';
import { DEFAULT_UPDATE_SOURCE, normalizeUpdateSource } from '../../../../../config/dynamicIslandUpdateSource';
import { fetchUpdateSourceUrl } from '../../../../../../api/user/userAccountApi';
import {
  readAnnouncementShowMode,
  writeAnnouncementShowMode,
  type AnnouncementShowMode,
} from '../../../../../../api/announcement/announcementApi';
import {
  UPDATE_SOURCE_STORE_KEY,
  UPDATE_AUTO_PROMPT_STORE_KEY,
  UPDATE_SOURCES,
  isProOnlyUpdateSource,
  type UpdateDownloadProgress,
  type UpdateSourceKey,
  type UpdateStatus,
} from '../config/settingsTabConfig';
import type { TFunction } from 'i18next';

const UPDATE_ERROR_KEYS = new Map<string, string>([
  ['NATIVE_UPDATE_SIGNING_KEY_NOT_CONFIGURED', 'settings.update.errors.signingUnavailable'],
  ['NATIVE_UPDATE_NETWORK_FAILED', 'settings.update.errors.networkFailed'],
  ['NATIVE_UPDATE_VERIFICATION_FAILED', 'settings.update.errors.verificationFailed'],
  ['NATIVE_UPDATE_MANIFEST_INVALID', 'settings.update.errors.manifestInvalid'],
  ['NATIVE_UPDATE_URL_CREDENTIALS_NOT_ALLOWED', 'settings.update.errors.manifestInvalid'],
  ['NATIVE_UPDATE_REQUIRES_HTTPS', 'settings.update.errors.manifestInvalid'],
  ['NATIVE_UPDATE_INSTALLER_NAME_INVALID', 'settings.update.errors.manifestInvalid'],
  ['NATIVE_UPDATE_URL_INVALID', 'settings.update.errors.manifestInvalid'],
  ['NATIVE_UPDATE_SIGNED_DIRECTORY_URL_UNSUPPORTED', 'settings.update.errors.manifestInvalid'],
  ['ELECTRON_UPDATE_MANIFEST_REJECTED: configure the native JSON feed', 'settings.update.errors.manifestInvalid'],
  ['PRO update source requires a server-issued URL', 'settings.update.errors.manifestInvalid'],
  ['NATIVE_UPDATE_PLATFORM_UNSUPPORTED', 'settings.update.errors.platformUnsupported'],
  ['NATIVE_UPDATE_OPERATION_FAILED', 'settings.update.errors.operationFailed'],
]);

/**
 * 本地化原生更新错误码，保留旧业务错误内容与操作上下文。
 * @param t - 当前语言翻译函数。
 * @param error - 原生错误码或旧业务异常。
 * @param fallbackKey - 未识别错误的操作上下文翻译键。
 * @returns 用户可读的更新失败原因。
 */
function updateErrorMessage(t: TFunction, error: unknown, fallbackKey?: string): string {
  const message = error instanceof Error ? error.message : String(error);
  const key = UPDATE_ERROR_KEYS.get(message.trim());
  if (key) return t(key);
  return fallbackKey ? t(fallbackKey, { error: message }) : message;
}

interface UseUpdateSettingsStateArgs {
  t: TFunction;
  isProUser: boolean;
  sessionToken: string | null;
}

/**
 * 管理设置页更新相关状态与行为。
 * @param args - 更新状态 Hook 初始化参数
 * @param args.t - i18n 翻译函数
 * @param args.isProUser - 当前用户是否为 PRO
 * @param args.sessionToken - 当前登录会话 Token
 * @returns 更新模块状态与操作方法集合
 */
export default function useUpdateSettingsState({ t, isProUser, sessionToken }: UseUpdateSettingsStateArgs) {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle');
  const [updateVersion, setUpdateVersion] = useState<string>('');
  const [updateError, setUpdateError] = useState<string>('');
  const [downloadProgress, setDownloadProgress] = useState<UpdateDownloadProgress | null>(null);
  const [updateAutoPromptEnabled, setUpdateAutoPromptEnabled] = useState<boolean>(true);
  const [announcementShowMode, setAnnouncementShowMode] = useState<AnnouncementShowMode>('version-update-only');
  const [updateSource, setUpdateSource] = useState<UpdateSourceKey>(DEFAULT_UPDATE_SOURCE);
  const [guideResetStatus, setGuideResetStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const currentSourceLabel = UPDATE_SOURCES.find((s) => s.key === updateSource)?.label ?? updateSource;

  const handleUpdateSourceChange = (value: string): void => {
    const nextSource = normalizeUpdateSource(value);

    if (isProOnlyUpdateSource(nextSource) && !isProUser) {
      setUpdateStatus('error');
      setUpdateError(t('settings.update.proOnlyError', { defaultValue: '该更新源仅 PRO 用户可用' }));
      return;
    }

    setUpdateSource(nextSource);
    setUpdateError('');
    window.api.storeWrite(UPDATE_SOURCE_STORE_KEY, nextSource).catch(() => {});
  };

  useEffect(() => {
    if (isProUser) return;
    if (!isProOnlyUpdateSource(updateSource)) return;
    setUpdateSource(DEFAULT_UPDATE_SOURCE);
    window.api.storeWrite(UPDATE_SOURCE_STORE_KEY, DEFAULT_UPDATE_SOURCE).catch(() => {});
  }, [isProUser, updateSource]);

  const resolveUpdateSourceUrl = async (source: UpdateSourceKey): Promise<string | undefined> => {
    if (!isProOnlyUpdateSource(source)) {
      return undefined;
    }
    if (!isProUser) {
      throw new Error(t('settings.update.proOnlyError', { defaultValue: '该更新源仅 PRO 用户可用' }));
    }
    if (!sessionToken) {
      throw new Error(t('settings.update.proOnlyNeedLogin', { defaultValue: '请先登录 PRO 账号后再使用该更新源' }));
    }

    const result = await fetchUpdateSourceUrl(sessionToken, source);
    if (!result.ok || !result.data?.url) {
      throw new Error(result.message || t('settings.update.sourceResolveFailed', { defaultValue: '获取更新源地址失败' }));
    }
    return result.data.url;
  };

  const handleUpdateAutoPromptEnabledChange = (enabled: boolean): void => {
    setUpdateAutoPromptEnabled(enabled);
    window.api.storeWrite(UPDATE_AUTO_PROMPT_STORE_KEY, enabled).catch(() => {});
  };

  const handleAnnouncementShowModeChange = (mode: AnnouncementShowMode): void => {
    setAnnouncementShowMode(mode);
    void writeAnnouncementShowMode(mode);
  };

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(UPDATE_SOURCE_STORE_KEY).then((value) => {
      if (cancelled) return;
      setUpdateSource(normalizeUpdateSource(value));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(UPDATE_AUTO_PROMPT_STORE_KEY).then((value) => {
      if (cancelled) return;
      setUpdateAutoPromptEnabled(typeof value === 'boolean' ? value : true);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    readAnnouncementShowMode().then((mode) => {
      if (cancelled) return;
      setAnnouncementShowMode(mode);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const unsub = window.api.onUpdaterProgress?.((progress) => {
      setDownloadProgress(progress);
      setUpdateStatus((prev) => (prev === 'downloading' ? prev : 'downloading'));
    });
    return () => { unsub?.(); };
  }, []);

  useEffect(() => {
    const unsub = window.api.onUpdaterAvailable?.((data) => {
      if (!updateAutoPromptEnabled) return;
      setUpdateVersion(data.version);
      setUpdateStatus((prev) => {
        if (prev === 'downloading' || prev === 'ready') return prev;
        return 'available';
      });
      setUpdateError('');
    });
    return () => { unsub?.(); };
  }, [updateAutoPromptEnabled]);

  const handleCheckUpdate = async (): Promise<void> => {
    setUpdateStatus('checking');
    setUpdateError('');
    setDownloadProgress(null);
    try {
      const resolvedUrl = await resolveUpdateSourceUrl(updateSource);
      const result = await window.api.updaterCheck(updateSource, resolvedUrl);
      if (result.error) {
        setUpdateStatus('error');
        setUpdateError(updateErrorMessage(t, result.error));
      } else if (result.available && result.version) {
        setUpdateStatus('available');
        setUpdateVersion(result.version);
      } else {
        setUpdateStatus('latest');
      }
    } catch (err) {
      setUpdateStatus('error');
      setUpdateError(updateErrorMessage(t, err, 'settings.update.checkFailedMessage'));
    }
  };

  const handleDownloadUpdate = async (): Promise<void> => {
    setUpdateStatus('downloading');
    setDownloadProgress(null);
    try {
      const resolvedUrl = await resolveUpdateSourceUrl(updateSource);
      const ok = await window.api.updaterDownload(updateSource, resolvedUrl);
      if (ok) {
        setUpdateStatus('ready');
      } else {
        setUpdateStatus('error');
        setUpdateError(t('settings.update.downloadFailed'));
      }
    } catch (err) {
      setUpdateStatus('error');
      setUpdateError(updateErrorMessage(t, err, 'settings.update.downloadFailedMessage'));
    }
  };

  const handleInstallUpdate = (): void => {
    window.api.updaterInstall().catch((error: unknown) => {
      setUpdateStatus('error');
      setUpdateError(updateErrorMessage(t, error, 'settings.update.installFailedMessage'));
    });
  };

  const handleResetGuide = async (): Promise<void> => {
    try {
      const ok = await window.api.guideReset();
      setGuideResetStatus(ok ? 'success' : 'error');
    } catch {
      setGuideResetStatus('error');
    }
  };

  return {
    updateStatus,
    setUpdateStatus,
    updateVersion,
    setUpdateVersion,
    updateError,
    setUpdateError,
    downloadProgress,
    setDownloadProgress,
    updateAutoPromptEnabled,
    setUpdateAutoPromptEnabled,
    announcementShowMode,
    setAnnouncementShowMode,
    updateSource,
    setUpdateSource,
    currentSourceLabel,
    handleUpdateSourceChange,
    handleUpdateAutoPromptEnabledChange,
    handleAnnouncementShowModeChange,
    handleCheckUpdate,
    handleDownloadUpdate,
    handleInstallUpdate,
    handleResetGuide,
    guideResetStatus,
    resolveUpdateSourceUrl,
  };
}
