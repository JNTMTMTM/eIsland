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
 * @file LyricsTranslationContent.tsx
 * @description 带翻译歌词的状态内容组件 — 左侧专辑封面 + 光晕，右侧原文歌词 + 翻译歌词
 * @author 鸡哥
 */

import { useEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import useIslandStore from '../../../store/slices';
import { useLyricsSettings } from '../lyrics/hooks/useLyricsSettings';
import { useBeijingClock } from '../lyrics/hooks/useBeijingClock';
import { useAutoIdle } from '../lyrics/hooks/useAutoIdle';
import { useCurrentLyric } from '../lyrics/hooks/useCurrentLyric';
import { useTranslationLyric } from './hooks/useTranslationLyric';
import { useTranslationFallback } from './hooks/useTranslationFallback';
import { LyricsTranslationContentView } from './components/LyricsTranslationContentView';
import '../../../styles/lyrics/lyrics.css';

/**
 * 带翻译歌词的状态内容组件
 * @description 当翻译歌词可用时显示，左侧专辑封面+光晕，右侧原文+翻译双行歌词
 */
export function LyricsTranslationContent(): ReactElement {
  const isMusicPlaying = useIslandStore((s) => s.isMusicPlaying);
  const isPlaying = useIslandStore((s) => s.isPlaying);
  const coverImage = useIslandStore((s) => s.coverImage);
  const dominantColor = useIslandStore((s) => s.dominantColor);
  const syncedLyrics = useIslandStore((s) => s.syncedLyrics);
  const lyricsLoading = useIslandStore((s) => s.lyricsLoading);
  const currentPositionMs = useIslandStore((s) => s.currentPositionMs);
  const mediaInfo = useIslandStore((s) => s.mediaInfo);
  const setIdle = useIslandStore((s) => s.setIdle);
  const translationLyrics = useIslandStore((s) => s.translationLyrics);

  const translationLines = translationLyrics?.status === 'available' ? translationLyrics.lines : null;

  const { karaokeEnabled, clockEnabled, musicOuterGlowEffectEnabled } = useLyricsSettings();
  const clockText = useBeijingClock(clockEnabled);
  useAutoIdle(isMusicPlaying, lyricsLoading, syncedLyrics, setIdle);
  const { currentIdx, isIntro, currentLine, currentText, hasSyllables } = useCurrentLyric(syncedLyrics, lyricsLoading, currentPositionMs);

  const translationText = useTranslationLyric(translationLines, currentIdx, currentPositionMs);
  useTranslationFallback(translationLines);

  /** 歌词行切换时，若原文与翻译完全一致则回退到普通歌词状态 */
  const lastIdxRef = useRef(currentIdx);
  useEffect(() => {
    if (currentIdx === lastIdxRef.current) return;
    lastIdxRef.current = currentIdx;
    if (currentText && translationText && currentText === translationText) {
      useIslandStore.getState().setLyrics();
    }
  }, [currentIdx, currentText, translationText]);

  return (
    <LyricsTranslationContentView
      currentPositionMs={currentPositionMs}
      lyricsLoading={lyricsLoading}
      isMusicPlaying={isMusicPlaying}
      isPlaying={isPlaying}
      coverImage={coverImage}
      dominantColor={dominantColor}
      glowEnabled={musicOuterGlowEffectEnabled}
      clockText={clockText}
      clockEnabled={clockEnabled}
      isIntro={isIntro}
      mediaTitle={mediaInfo.title}
      currentIdx={currentIdx}
      currentText={currentText}
      currentLine={currentLine}
      hasSyllables={hasSyllables}
      karaokeEnabled={karaokeEnabled}
      translationText={translationText}
    />
  );
}
