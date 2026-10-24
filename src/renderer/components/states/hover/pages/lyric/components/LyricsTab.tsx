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
 * @file LyricsTab.tsx
 * @description 歌词 Tab 内容组件
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import useIslandStore from '../../../../../../store/slices';
import { SvgIcon } from '../../../../../../utils/SvgIcon';
import { truncateByVisualWidth } from '../utils/lyricUtils';
import { SilkyWave } from './SilkyWave';
import { MusicBgWavePreview } from '../../../../maxExpand/components/setting/components/app/preview/MusicBgWavePreview';
import { HOVER_MUSIC_BG_STYLE_STORE_KEY } from '../../../../maxExpand/components/setting/config/settingsTabConfig';
import { LyricsProgress } from './LyricsProgress';

type HoverMusicBgStyle = 'silky' | 'wave';

/** 悬停歌曲信息满该时长才切换为进度条，指针只是划过时保持歌曲信息，避免误触 */
const SEEK_HOVER_DELAY_MS = 300;

/** 进度条离开过渡时长，与 lrc.css 中 .lrc-progress 的过渡时长一致，过渡播完后再卸载 */
const SEEK_EXIT_MS = 200;

/**
 * 取消尚未执行的计时
 * @param timerId - 计时 ID，为 null 时表示没有待执行的计时
 * @returns 始终为 null，供调用方清空保存的计时 ID
 */
function cancelTimer(timerId: number | null): null {
  if (timerId !== null) window.clearTimeout(timerId);
  return null;
}

/**
 * 歌词 Tab 内容
 * @description 显示当前播放歌词、唱片封面和播放控制，悬停歌曲信息片刻后切换为播放进度条
 * @returns 歌词 Tab 元素
 */
export function LyricsTab(): ReactElement {
  const { t } = useTranslation();
  const {
    isMusicPlaying,
    isPlaying,
    mediaInfo,
    coverImage,
    dominantColor,
    currentDurationMs,
  } = useIslandStore(useShallow((store) => ({
    isMusicPlaying: store.isMusicPlaying,
    isPlaying: store.isPlaying,
    mediaInfo: store.mediaInfo,
    coverImage: store.coverImage,
    dominantColor: store.dominantColor,
    currentDurationMs: store.currentDurationMs,
  })));

  const [bgStyle, setBgStyle] = useState<HoverMusicBgStyle>('silky');
  const [seekHovered, setSeekHovered] = useState(false);
  const [progressExiting, setProgressExiting] = useState(false);
  const seekHoverTimerRef = useRef<number | null>(null);
  const progressExitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    window.api.storeRead(HOVER_MUSIC_BG_STYLE_STORE_KEY).then((v) => {
      if (v === 'silky' || v === 'wave') setBgStyle(v);
    }).catch(() => {});
  }, []);

  useEffect(() => () => {
    seekHoverTimerRef.current = cancelTimer(seekHoverTimerRef.current);
    progressExitTimerRef.current = cancelTimer(progressExitTimerRef.current);
  }, []);

  // 拖动滑块时 Chromium 捕获鼠标，指针移出区域也不会触发离开，松手后才离开并恢复歌曲信息。
  const handleInfoEnter = useCallback((): void => {
    cancelTimer(seekHoverTimerRef.current);
    seekHoverTimerRef.current = window.setTimeout(() => {
      seekHoverTimerRef.current = null;
      progressExitTimerRef.current = cancelTimer(progressExitTimerRef.current);
      setProgressExiting(false);
      setSeekHovered(true);
    }, SEEK_HOVER_DELAY_MS);
  }, []);

  const handleInfoLeave = useCallback((): void => {
    seekHoverTimerRef.current = cancelTimer(seekHoverTimerRef.current);
    if (!seekHovered) return;
    setSeekHovered(false);
    setProgressExiting(true);
    progressExitTimerRef.current = window.setTimeout(() => {
      progressExitTimerRef.current = null;
      setProgressExiting(false);
    }, SEEK_EXIT_MS);
  }, [seekHovered]);

  const handlePlayPause = () => window.api?.mediaPlayPause();
  const handlePrev = () => window.api?.mediaPrev();
  const handleNext = () => window.api?.mediaNext();

  // 播放源未提供有效时长时无法定位进度，此时不渲染进度条，悬停也保持显示歌曲信息。
  const hasTimeline = isMusicPlaying && Number.isFinite(currentDurationMs) && currentDurationMs > 0;
  const seekVisible = hasTimeline && seekHovered;
  const progressMounted = hasTimeline && (seekHovered || progressExiting);

  const artistText = truncateByVisualWidth(mediaInfo.artist || t('hover.music.unknownArtist', { defaultValue: '未知艺术家' }), 50);
  const albumText = truncateByVisualWidth(mediaInfo.title || t('hover.music.unknownTitle', { defaultValue: '未知歌曲' }), 45);

  // dominantColor 范围 0-255，SilkyWave 和 MusicBgWavePreview 都使用 0-255 范围
  const waveColor = dominantColor ?? [0, 0, 0];

  return (
    <div className={`lrc-tab-wrapper ${isPlaying ? 'playing' : ''}`}>
      <div className="lrc-vinyl-disc">
        <div
          className="lrc-vinyl-cover"
          style={coverImage ? { backgroundImage: `url(${coverImage})` } : undefined}
        />
      </div>

      {/* 进度条叠放在歌曲信息上方，由 seeking 驱动两者交叉过渡；离开后进度条保留到淡出播完再卸载。 */}
      <div className={`lrc-info-section ${seekVisible ? 'seeking' : ''}`} onMouseEnter={handleInfoEnter} onMouseLeave={handleInfoLeave}>
        <div className={`lrc-title ${!isMusicPlaying ? 'inactive' : ''}`}>
          {albumText}
        </div>

        <div className="lrc-artist">{artistText}</div>

        {progressMounted && <LyricsProgress />}
      </div>

      <div className="lrc-media-controls">
        <button
          className="lrc-media-btn"
          onClick={(e) => { e.stopPropagation(); handlePrev(); }}
          title={t('hover.music.prev', { defaultValue: '上一曲' })}
          disabled={!isMusicPlaying}
        >
          <img src={SvgIcon.PREVIOUS_SONG} alt={t('hover.music.prev', { defaultValue: '上一曲' })} className="lrc-media-btn-icon lrc-media-btn-icon--sm" />
        </button>
        <button
          className="lrc-media-btn lrc-play-btn"
          onClick={(e) => { e.stopPropagation(); handlePlayPause(); }}
          title={isPlaying ? t('hover.music.pause', { defaultValue: '暂停' }) : t('hover.music.play', { defaultValue: '播放' })}
          disabled={!isMusicPlaying}
        >
          {isPlaying ? (
            <img src={SvgIcon.PAUSE} alt={t('hover.music.pause', { defaultValue: '暂停' })} className="lrc-media-btn-icon" />
          ) : (
            <img src={SvgIcon.CONTINUE} alt={t('hover.music.play', { defaultValue: '播放' })} className="lrc-media-btn-icon" />
          )}
        </button>
        <button
          className="lrc-media-btn"
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
          title={t('hover.music.next', { defaultValue: '下一曲' })}
          disabled={!isMusicPlaying}
        >
          <img src={SvgIcon.NEXT_SONG} alt={t('hover.music.next', { defaultValue: '下一曲' })} className="lrc-media-btn-icon lrc-media-btn-icon--sm" />
        </button>
      </div>

      <div className="lrc-wave-container">
        {bgStyle === 'wave' ? (
          <MusicBgWavePreview color={waveColor} playing={isPlaying} />
        ) : (
          <SilkyWave color={waveColor} playing={isPlaying} />
        )}
      </div>
    </div>
  );
}
