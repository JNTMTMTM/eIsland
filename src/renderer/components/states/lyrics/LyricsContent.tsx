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
 * @file LyricsContent.tsx
 * @description 歌词状态内容组件 — 左侧专辑封面 + 光晕，右侧实时歌词
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../store/slices';
import { SvgIcon } from '../../../utils/SvgIcon';
import { useLyricsSettings } from './hooks/useLyricsSettings';
import { useBeijingClock } from './hooks/useBeijingClock';
import { useAutoIdle } from './hooks/useAutoIdle';
import { useCurrentLyric } from './hooks/useCurrentLyric';
import { useKaraokeScrollProgress } from './hooks/useKaraokeScrollProgress';
import { KaraokeSyllableLine } from './components/KaraokeSyllableLine';
import { ScrollingText } from './components/ScrollingText';
import '../../../styles/lyrics/lyrics.css';

/**
 * 歌词状态内容组件
 * @description 鼠标离开 hover 且正在播放音乐时显示，左侧专辑封面+光晕，右侧歌词
 */
export function LyricsContent(): ReactElement {
  const { t } = useTranslation();
  const isMusicPlaying = useIslandStore((s) => s.isMusicPlaying);
  const isPlaying = useIslandStore((s) => s.isPlaying);
  const coverImage = useIslandStore((s) => s.coverImage);
  const dominantColor = useIslandStore((s) => s.dominantColor);
  const syncedLyrics = useIslandStore((s) => s.syncedLyrics);
  const lyricsLoading = useIslandStore((s) => s.lyricsLoading);
  const currentPositionMs = useIslandStore((s) => s.currentPositionMs);
  const mediaInfo = useIslandStore((s) => s.mediaInfo);
  const setIdle = useIslandStore((s) => s.setIdle);

  const { karaokeEnabled, clockEnabled, musicOuterGlowEffectEnabled } = useLyricsSettings();
  const clockText = useBeijingClock(clockEnabled);
  useAutoIdle(isMusicPlaying, lyricsLoading, syncedLyrics, setIdle);
  const { currentIdx, hasLyrics, isIntro, currentLine, currentText, hasSyllables } = useCurrentLyric(syncedLyrics, lyricsLoading, currentPositionMs);
  const karaokeScrollProgress = useKaraokeScrollProgress(karaokeEnabled, currentLine, hasSyllables, isIntro, currentPositionMs);

  const [r, g, b] = dominantColor;

  return (
    <div className="lyrics-content">
      {/* 背景光晕 — 与 IdleContent 一致 */}
      <div
        className={`idle-glow${isMusicPlaying && coverImage && musicOuterGlowEffectEnabled ? ' active' : ''}${isMusicPlaying && coverImage && !isPlaying && musicOuterGlowEffectEnabled ? ' paused' : ''}`}
        style={isMusicPlaying && coverImage && musicOuterGlowEffectEnabled
          ? { background: `radial-gradient(ellipse at 10% 50%, rgba(${r}, ${g}, ${b}, 0.35) 0%, transparent 60%)` }
          : undefined}
      />

      {/* 左侧：专辑封面 */}
      <div className="lyrics-left">
        <div
          className={`idle-album-cover${!isPlaying ? ' paused' : ''}${isMusicPlaying && coverImage && musicOuterGlowEffectEnabled ? ' glowing' : ''}`}
          style={{
            backgroundImage: coverImage ? `url(${coverImage})` : undefined,
            ...(isMusicPlaying && coverImage && musicOuterGlowEffectEnabled ? { boxShadow: `0 0 12px 4px rgba(${r}, ${g}, ${b}, 0.5)` } : {}),
          }}
        />
      </div>

      {/* 中间：当前北京时间 */}
      {clockEnabled && clockText && (
        <span className="lyrics-time">{clockText}</span>
      )}

      {/* 右侧：歌词 / 前奏居中 */}
      <div className="lyrics-right">
        {lyricsLoading ? (
          <div className="lyrics-loading">
            <span className="lyrics-loading-dot" />
            <span className="lyrics-loading-dot" />
            <span className="lyrics-loading-dot" />
            <span className="lyrics-loading-label">{t('songTab.lyrics.loading')}</span>
          </div>
        ) : isIntro ? (
          <>
            <span className="lyrics-intro-title-center">{mediaInfo.title}</span>
            <img src={SvgIcon.MUSIC} alt="" className="lyrics-intro-icon" />
          </>
        ) : currentText ? (
          <ScrollingText
            key={currentIdx}
            className={`lyrics-current-line${karaokeEnabled && hasSyllables ? ' lyrics-karaoke' : ''}`}
            scrollProgress={karaokeScrollProgress}
          >
            {karaokeEnabled && hasSyllables && currentLine ? (
              <KaraokeSyllableLine
                syllables={currentLine.syllables!}
                lineStartMs={currentLine.time_ms}
                posMs={currentPositionMs}
              />
            ) : (
              currentText
            )}
          </ScrollingText>
        ) : (
          <span className="lyrics-empty">{t('songTab.lyrics.empty')} {t('songTab.lyrics.enjoyMusic', { defaultValue: '享受音乐' })}</span>
        )}
      </div>
    </div>
  );
}
