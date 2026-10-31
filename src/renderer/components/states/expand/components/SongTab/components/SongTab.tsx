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
 * @file SongTab.tsx
 * @description Expanded 歌曲 Tab — 三栏布局：左(封面+信息+控制) | 中(歌词) | 右(待办/时间/天气/倒计时)
 * @author 鸡哥
 */

import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../../../../utils/SvgIcon';
import { formatTime } from '../../../../../../utils/timeUtils';
import { abbreviateWeatherDescription } from '../../../../../../utils/weatherText';
import { useSongTab } from '../hooks/useSongTab';
import { formatCountdownRemaining } from '../utils/songUtils';
import { KaraokeSyllableLine } from './KaraokeSyllableLine';
import { MarqueeLyricText } from './MarqueeLyricText';
import { WaveCanvas } from './WaveCanvas';
import type { CSSProperties, ReactElement } from 'react';

/**
 * 歌曲 Tab
 * @description 展开状态下三栏布局歌曲面板
 * @returns 歌曲面板
 */
export function SongTab(): ReactElement {
  const { t } = useTranslation();
  const {
    isMusicPlaying,
    isPlaying,
    mediaInfo,
    syncedLyrics,
    lyricsLoading,
    coverImage,
    dominantColor,
    weather,
    countdown,
    currentPositionMs,
    now,
    karaokeEnabled,
    timerRunning,
    timerMM,
    timerSS,
    dayName,
    hasLyrics,
    isIntro,
    lines,
    currentLine,
    hasSyllables,
    handlePlayPause,
    handlePrev,
    handleNext,
  } = useSongTab();

  return (
    <div className="expand-tab-panel ov-panel">
      <WaveCanvas color={dominantColor} playing={isPlaying} />
      {/* ========== 左栏：封面 + 信息 + 控制 ========== */}
      <div className="ov-left">
        <div
          className={`ov-disc ${isPlaying ? 'spinning' : ''}`}
          style={{ '--disc-glow': `rgba(${dominantColor[0]}, ${dominantColor[1]}, ${dominantColor[2]}, 0.45)` } as CSSProperties}
        >
          <div
            className="ov-disc-cover"
            style={coverImage ? { backgroundImage: `url(${coverImage})` } : undefined}
          />
        </div>
        <div className="ov-meta">
          <span className="ov-meta-title">{mediaInfo.title || t('songTab.meta.notPlaying', { defaultValue: '未在播放' })}</span>
          <span className="ov-meta-artist">{mediaInfo.artist || ''}</span>
          {mediaInfo.album && <span className="ov-meta-album">{mediaInfo.album}</span>}
          <div className="ov-controls">
            <button className="ov-ctrl-btn" onClick={(e) => { e.stopPropagation(); handlePrev(); }} disabled={!isMusicPlaying} title={t('songTab.controls.prev', { defaultValue: '上一曲' })}>
              <img src={SvgIcon.PREVIOUS_SONG} alt={t('songTab.controls.prev', { defaultValue: '上一曲' })} className="ov-ctrl-icon ov-ctrl-icon--sm" />
            </button>
            <button className="ov-ctrl-btn ov-ctrl-play" onClick={(e) => { e.stopPropagation(); handlePlayPause(); }} disabled={!isMusicPlaying} title={isPlaying ? t('songTab.controls.pause', { defaultValue: '暂停' }) : t('songTab.controls.play', { defaultValue: '播放' })}>
              <img src={isPlaying ? SvgIcon.PAUSE : SvgIcon.CONTINUE} alt={isPlaying ? t('songTab.controls.pause', { defaultValue: '暂停' }) : t('songTab.controls.play', { defaultValue: '播放' })} className="ov-ctrl-icon" />
            </button>
            <button className="ov-ctrl-btn" onClick={(e) => { e.stopPropagation(); handleNext(); }} disabled={!isMusicPlaying} title={t('songTab.controls.next', { defaultValue: '下一曲' })}>
              <img src={SvgIcon.NEXT_SONG} alt={t('songTab.controls.next', { defaultValue: '下一曲' })} className="ov-ctrl-icon ov-ctrl-icon--sm" />
            </button>
          </div>
        </div>
      </div>

      {/* ========== 中栏：歌词 ========== */}
      <div className="ov-center">
        {lyricsLoading && (
          <div className="ov-lrc-loading">
            <span className="ov-lrc-loading-dot" />
            <span className="ov-lrc-loading-dot" />
            <span className="ov-lrc-loading-dot" />
            <span className="ov-lrc-loading-label">{t('songTab.lyrics.loading', { defaultValue: '正在加载歌词' })}</span>
          </div>
        )}
        {!lyricsLoading && !hasLyrics && isMusicPlaying && <span className="ov-lrc-hint">{t('songTab.lyrics.empty', { defaultValue: '暂无歌词' })}</span>}
        {!isMusicPlaying && (
          <div className="ov-onboarding">
            <div className="ov-onboarding-title">{t('songTab.onboarding.title', { defaultValue: '音乐总览' })}</div>
            <div className="ov-onboarding-desc">{t('songTab.onboarding.desc', { defaultValue: '播放音乐后，这里将展示实时信息' })}</div>
            <div className="ov-onboarding-features">
              <div className="ov-onboarding-feat"><span className="ov-onboarding-dot" /><span>{t('songTab.onboarding.feature1', { defaultValue: '封面碟片、实时歌词与频谱动画' })}</span></div>
              <div className="ov-onboarding-feat"><span className="ov-onboarding-dot" /><span>{t('songTab.onboarding.feature2', { defaultValue: '时间、天气与倒计时一览' })}</span></div>
            </div>
            <div className="ov-onboarding-hint">{t('songTab.onboarding.hint', { defaultValue: '播放任意歌曲即可开始' })}</div>
          </div>
        )}
        {isIntro && (
          <div className="ov-lrc-container">
            <img src={SvgIcon.MUSIC} alt="" className="ov-lrc-intro-icon" />
            {syncedLyrics!.slice(0, 2).map((line, i) => (
              <div key={`intro-${i}`} className="ov-lrc-line">
                {line.text}
              </div>
            ))}
          </div>
        )}
        {hasLyrics && !isIntro && (
          <div className="ov-lrc-container">
            {lines.map((line) => (
              <div
                key={line.key}
                className={`ov-lrc-line ${line.isCurrent ? 'current' : ''}`}
              >
                <MarqueeLyricText>
                  {line.isCurrent && karaokeEnabled && hasSyllables && currentLine ? (
                    <KaraokeSyllableLine
                      syllables={currentLine.syllables!}
                      lineStartMs={currentLine.time_ms}
                      posMs={currentPositionMs}
                    />
                  ) : (
                    line.text
                  )}
                </MarqueeLyricText>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========== 右栏：时间/天气/倒计时/待办 ========== */}
      <div className="ov-right">
        <div className="ov-time">
          <span className="ov-time-clock">{formatTime(now)}</span>
          <span className="ov-time-day">{dayName}</span>
        </div>
        {weather && (
          <div className="ov-weather">
            <span className="ov-weather-temp">{Math.round(weather.temperature)}°</span>
            <span className="ov-weather-desc">{abbreviateWeatherDescription(weather.description, t)}</span>
          </div>
        )}
        {countdown.enabled && (
          <div className="ov-countdown">
            <span className="ov-countdown-label">{countdown.label}</span>
            <span className="ov-countdown-value">{formatCountdownRemaining(countdown.targetDate, t)}</span>
          </div>
        )}
        {timerRunning && (
          <div className="ov-timer">
            <span className="ov-timer-value">{timerMM}:{timerSS}</span>
          </div>
        )}
      </div>
    </div>
  );
}
