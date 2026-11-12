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
 * @file useIslandStateBridges.ts
 * @description 灵动岛状态桥接逻辑 Hook。
 * @author 鸡哥
 */

import { useEffect, useState } from 'react';
import { subscribeLyricsEnabled, useLyricsDisplayStore } from '../../store/lyricsDisplayStore';
import type { SyncedLyricLine, TimerState } from '../../store/types';
import type { TranslationLyricsResult } from '../../api/lyrics/lrcApi';
import type { IslandState } from './useDynamicIslandShell';
import useIslandStore from '../../store/isLandStore';
import { isCurrentLyricIdenticalToTranslation } from '../states/lyrics/utils/isCurrentLyricIdenticalToTranslation';

interface UseIslandStateBridgesOptions {
  state: IslandState;
  timerState: TimerState;
  isPlaying: boolean;
  syncedLyrics: SyncedLyricLine[] | null;
  lyricsLoading: boolean;
  translationLyrics: TranslationLyricsResult | null;
  setLyrics: () => void;
  setLyricsTranslation: () => void;
  setAgentVoiceInput: () => void;
  setIdle: (force?: boolean) => void;
}

/**
 * @description 处理语音输入状态与歌词状态桥接。
 * @param options - 状态桥接配置。
 */
export function useIslandStateBridges(options: UseIslandStateBridgesOptions): void {
  const {
    state,
    timerState,
    isPlaying,
    syncedLyrics,
    lyricsLoading,
    translationLyrics,
    setLyrics,
    setLyricsTranslation,
    setAgentVoiceInput,
    setIdle,
  } = options;

  // 桥接只关心是否需要切换歌词页面，不应让每个进度 tick 重渲染整岛。
  const isCurrentTranslationIdentical = useIslandStore((store) => (
    (store.state === 'idle' || store.state === 'lyrics')
      && isCurrentLyricIdenticalToTranslation(store.syncedLyrics, store.translationLyrics, store.currentPositionMs)
  ));

  // 歌词功能关闭时不显示歌词，改为显示「歌名 - 歌手」。
  const songTitleMode = useLyricsDisplayStore((store) => store.lyricsEnabled === false);
  const hasSongTitle = useIslandStore((store) => Boolean(store.mediaInfo.title));
  const uiStateLocked = useIslandStore((store) => store.uiStateLocked);
  useEffect(() => subscribeLyricsEnabled(), []);

  const [lyricsTranslationEnabled, setLyricsTranslationEnabled] = useState<boolean>(true);
  useEffect(() => {
    window.api.musicLyricsTranslationEnabledGet().then(setLyricsTranslationEnabled).catch(() => {});
    const unsub = window.api.onSettingsChanged((channel, value) => {
      if (channel === 'music:lyrics-translation-enabled') setLyricsTranslationEnabled(value as boolean);
    });
    const onLocal = (e: Event) => {
      const { channel, value } = (e as CustomEvent).detail;
      if (channel === 'music:lyrics-translation-enabled') setLyricsTranslationEnabled(value);
    };
    window.addEventListener('island:setting-changed', onLocal);
    return () => { unsub(); window.removeEventListener('island:setting-changed', onLocal); };
  }, []);

  useEffect(() => {
    const unsub = window.api?.onAgentVoiceInputState?.((active: boolean) => {
      const currentState = state;
      if (active) {
        if (currentState === 'expanded' || currentState === 'maxExpand') return;
        setAgentVoiceInput();
      } else {
        if (currentState === 'agentVoiceInput') {
          setIdle(true);
        }
      }
    });
    return () => { unsub?.(); };
  }, [state, setAgentVoiceInput, setIdle]);

  useEffect(() => {
    if (state !== 'idle') return;
    if (timerState !== 'idle') return;
    if (!isPlaying) return;
    // 只显示歌名或未获取到歌词时，以前奏样式展示歌名；有歌词（或加载中）时才考虑翻译歌词。
    const hasLyricLine = !songTitleMode && ((syncedLyrics?.length ?? 0) > 0 || lyricsLoading);
    if (!hasLyricLine) {
      if (hasSongTitle) setLyrics();
      return;
    }
    const hasTranslation = translationLyrics?.status === 'available'
      && Boolean(translationLyrics.lines && translationLyrics.lines.length > 0);
    if (hasTranslation && lyricsTranslationEnabled) {
      /** 原文与翻译完全一致时显示普通歌词 */
      if (isCurrentTranslationIdentical) {
        setLyrics();
      } else {
        setLyricsTranslation();
      }
    } else {
      setLyrics();
    }
  }, [state, timerState, isPlaying, syncedLyrics, lyricsLoading, translationLyrics, lyricsTranslationEnabled, isCurrentTranslationIdentical, songTitleMode, hasSongTitle, setLyrics, setLyricsTranslation]);

  /** 歌词状态下翻译歌词加载完成 → 升级到 lyricsTranslation（原文与翻译一致时保持 lyrics） */
  useEffect(() => {
    if (state !== 'lyrics') return;
    if (!lyricsTranslationEnabled || songTitleMode) return;
    const hasTranslation = translationLyrics?.status === 'available'
      && Boolean(translationLyrics.lines && translationLyrics.lines.length > 0);
    if (hasTranslation) {
      if (isCurrentTranslationIdentical) return;
      setLyricsTranslation();
    }
  }, [state, translationLyrics, lyricsTranslationEnabled, isCurrentTranslationIdentical, songTitleMode, setLyricsTranslation]);

  /** 翻译歌词关闭或只显示歌名时，从 lyricsTranslation 回退到 lyrics；UI 锁定期间无法切换，解锁后重试 */
  useEffect(() => {
    if (uiStateLocked) return;
    if (state === 'lyricsTranslation' && (!lyricsTranslationEnabled || songTitleMode)) {
      setLyrics();
    }
  }, [state, lyricsTranslationEnabled, songTitleMode, uiStateLocked, setLyrics]);
}
