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
 * @file SongPlayerBar.tsx
 * @description 底部播放器，展示细进度条、播放时间和居中的播放控制。
 * @author 鸡哥
 */

// eslint-disable-next-line project/filename -- 歌曲模块的展示组件沿用 PascalCase 命名。
import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../../../../utils/SvgIcon';
import { formatProgressTime } from '../../../../hover/pages/lyric/utils/lyricUtils';
import useSongProgress from '../hooks/useSongProgress';
import type { CSSProperties, ReactElement } from 'react';
import type { SongPlayerBarProps } from '../types/songTypes';

/**
 * 展示底部播放控制，时间线不可用时禁用滑块，按钮随播放源状态更新。
 * @param props - 当前歌曲的播放状态与控制句柄。
 * @param props.song - 播放进度、时长、歌曲标识与跳转能力。
 * @param props.controls - 上一曲、播放暂停和下一曲句柄。
 * @returns 底部播放器区域。
 */
export default function SongPlayerBar({ song, controls }: SongPlayerBarProps): ReactElement {
  const { t } = useTranslation();
  const { trackKey, canSeek, isMusicPlaying, isPlaying } = song;
  const { handlePrev, handlePlayPause, handleNext } = controls;
  const { sliderRef, handlePreview, durationMs, displayPositionMs, progressPercent } = useSongProgress(song);
  const positionText = formatProgressTime(displayPositionMs);
  const durationText = formatProgressTime(durationMs);
  /* eslint-disable better-tailwindcss/no-unknown-classes -- 底部播放器样式由歌曲模块的 song.css 定义。 */
  return (
    <footer className="song-player-bar">
      <input key={trackKey} ref={sliderRef} className="song-progress-slider" type="range" min={0} max={durationMs || 1} step="any"
        value={displayPositionMs} disabled={!canSeek} onChange={handlePreview}
        aria-label={t('hover.music.seek')}
        aria-valuetext={t('hover.music.seekValue', { position: positionText, duration: durationText })}
        style={{ '--song-progress': `${progressPercent}%` } as CSSProperties} />
      <span className="song-player-times">
        <span>{positionText}</span>
        <span className="song-player-duration"> / {durationText}</span>
      </span>
      <div className="song-controls">
        <button type="button" onClick={handlePrev} disabled={!isMusicPlaying} aria-label={t('songTab.controls.prev')} title={t('songTab.controls.prev')}>
          <img className="song-control-icon-img" src={SvgIcon.PREVIOUS_SONG} alt="" />
        </button>
        <button className="song-play" data-playing={isPlaying} type="button" onClick={handlePlayPause} disabled={!isMusicPlaying} aria-label={t(isPlaying ? 'songTab.controls.pause' : 'songTab.controls.play')} title={t(isPlaying ? 'songTab.controls.pause' : 'songTab.controls.play')}>
          <img className="song-control-icon-img" src={isPlaying ? SvgIcon.PAUSE : SvgIcon.CONTINUE} alt="" />
        </button>
        <button type="button" onClick={handleNext} disabled={!isMusicPlaying} aria-label={t('songTab.controls.next')} title={t('songTab.controls.next')}>
          <img className="song-control-icon-img" src={SvgIcon.NEXT_SONG} alt="" />
        </button>
      </div>
    </footer>
  );
  /* eslint-enable better-tailwindcss/no-unknown-classes -- 底部播放器样式例外结束。 */
}
