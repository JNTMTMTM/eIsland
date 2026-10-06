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
 * @file useSettingsMusic.ts
 * @description 音乐白名单、歌词和 SMTC 配置状态与操作
 * @author 鸡哥
 */

import { useState } from 'react';

import type { useTranslation } from 'react-i18next';

interface SettingsMusicOptions {
  t: ReturnType<typeof useTranslation>['t'];
}

/**
 * 音乐白名单、歌词和 SMTC 配置状态与操作。
 * @param options - 当前设置上下文
 * @returns 供设置视图组合使用的状态与操作
 */
export function useSettingsMusic(options: SettingsMusicOptions) {
  const { t } = options;

  /** 歌曲设置相关状态 */
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [whitelistDraft, setWhitelistDraft] = useState<string>('');
  const [whitelistInputError, setWhitelistInputError] = useState<string>('');
  const [lyricsSource, setLyricsSource] = useState<string>('auto');
  const [lyricsEnabled, setLyricsEnabled] = useState<boolean>(true);
  const [lyricsTranslationEnabled, setLyricsTranslationEnabled] = useState<boolean>(true);
  const [lyricsKaraoke, setLyricsKaraoke] = useState<boolean>(false);
  const [lyricsClock, setLyricsClock] = useState<boolean>(true);
  const [lyricsCalibrateEnabled, setLyricsCalibrateEnabled] = useState<boolean>(true);
  const [lyricsCalibrateDelay, setLyricsCalibrateDelay] = useState<number>(20);
  const [detectingSourceAppId, setDetectingSourceAppId] = useState(false);
  const [detectedSources, setDetectedSources] = useState<Array<{ sourceAppId: string; isPlaying: boolean; hasTitle: boolean; thumbnail: string | null; }>>([]);
  const [musicSmtcUnsubscribeInput, setMusicSmtcUnsubscribeInput] = useState<string>('5000');
  const [musicSmtcNeverUnsubscribe, setMusicSmtcNeverUnsubscribe] = useState(true);
  const [musicSmtcConfigMessage, setMusicSmtcConfigMessage] = useState<{ type: 'success' | 'error'; text: string; } | null>(null);

  const handleDetectSourceAppId = async (): Promise<void> => {
    if (detectingSourceAppId) return;
    setDetectingSourceAppId(true);
    setDetectedSources([]);
    try {
      const result = await window.api.musicDetectSourceAppId();
      if (result.ok && result.sources.length > 0) {
        setDetectedSources(result.sources);
      }
    } catch { /* ignore */ }
    setDetectingSourceAppId(false);
  };

  const handleAddWhitelist = (): void => {
    const nextItem = whitelistDraft.trim();
    if (!nextItem) return;

    const exists = whitelist.some((item) => item.toLowerCase() === nextItem.toLowerCase());
    if (exists) {
      setWhitelistDraft('');
      setWhitelistInputError(t('settings.music.whitelist.alreadyExists', { defaultValue: '已在白名单中' }));
      return;
    }

    const next = [...whitelist, nextItem];
    setWhitelist(next);
    setWhitelistDraft('');
    setWhitelistInputError('');
    window.api.musicWhitelistSet(next).catch(() => { });
  };

  const saveMusicSmtcUnsubscribeConfig = async (): Promise<void> => {
    const valueMs = musicSmtcNeverUnsubscribe ? 0 : Number(musicSmtcUnsubscribeInput.trim());

    if (!musicSmtcNeverUnsubscribe) {
      if (!Number.isFinite(valueMs) || valueMs < 1000) {
        setMusicSmtcConfigMessage({ type: 'error', text: t('settings.music.smtc.invalidMsValue', { defaultValue: '请输入有效毫秒值（>= 1000）或开启「永不取消订阅」' }) });
        return;
      }
    }

    const ok = await window.api.musicSmtcUnsubscribeMsSet(valueMs);
    if (!ok) {
      setMusicSmtcConfigMessage({ type: 'error', text: t('settings.music.smtc.saveFailed', { defaultValue: '保存失败，请稍后重试' }) });
      return;
    }

    if (musicSmtcNeverUnsubscribe) {
      setMusicSmtcConfigMessage({ type: 'success', text: t('settings.music.smtc.savedNeverUnsubscribe', { defaultValue: '已保存：永不自动取消订阅' }) });
      return;
    }

    setMusicSmtcConfigMessage({ type: 'success', text: t('settings.music.smtc.savedAutoUnsubscribe', { defaultValue: '已保存：{{ms}} ms 自动取消订阅', ms: Math.round(valueMs) }) });
  };

  return {
    whitelist,
    setWhitelist,
    whitelistDraft,
    setWhitelistDraft,
    whitelistInputError,
    setWhitelistInputError,
    lyricsSource,
    setLyricsSource,
    lyricsEnabled,
    setLyricsEnabled,
    lyricsTranslationEnabled,
    setLyricsTranslationEnabled,
    lyricsKaraoke,
    setLyricsKaraoke,
    lyricsClock,
    setLyricsClock,
    lyricsCalibrateEnabled,
    setLyricsCalibrateEnabled,
    lyricsCalibrateDelay,
    setLyricsCalibrateDelay,
    detectingSourceAppId,
    setDetectingSourceAppId,
    detectedSources,
    setDetectedSources,
    musicSmtcUnsubscribeInput,
    setMusicSmtcUnsubscribeInput,
    musicSmtcNeverUnsubscribe,
    setMusicSmtcNeverUnsubscribe,
    musicSmtcConfigMessage,
    setMusicSmtcConfigMessage,
    handleDetectSourceAppId,
    handleAddWhitelist,
    saveMusicSmtcUnsubscribeConfig,
  };
}
