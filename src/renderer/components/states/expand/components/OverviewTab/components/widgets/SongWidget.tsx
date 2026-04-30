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
 * @file SongWidget.tsx
 * @description Overview 正在播放小组件，展示当前播放歌曲信息与媒体控制。
 * @author 鸡哥
 */

import type { CSSProperties, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../../../../../store/slices';
import { SvgIcon } from '../../../../../../../utils/SvgIcon';

/** 正在播放小组件，展示当前播放歌曲与媒体控制。 */
export function SongWidget(): ReactElement {
  const { t } = useTranslation();
  const { mediaInfo, coverImage, isPlaying, isMusicPlaying, dominantColor, setExpandTab } = useIslandStore();
  const [r, g, b] = dominantColor;

  return (
    <div className="ov-dash-widget ov-dash-song-widget">
      <div className="ov-dash-widget-header">
        <span className="ov-dash-widget-title ov-dash-widget-title--link" onClick={() => setExpandTab('song')}>{t('overview.song.nowPlaying', { defaultValue: '正在播放' })}</span>
      </div>
      {isMusicPlaying ? (
        <div
          className="ov-dash-song-content"
          style={{ '--song-glow': `rgba(${r}, ${g}, ${b}, 0.35)` } as CSSProperties}
        >
          {coverImage && (
            <div
              className="ov-dash-song-bg"
              style={{ backgroundImage: `url(${coverImage})` }}
            />
          )}
          <div className="ov-dash-song-body">
            <div
              className="ov-dash-song-cover"
              style={coverImage ? { backgroundImage: `url(${coverImage})` } : undefined}
            />
            <div className="ov-dash-song-info">
              <div className="ov-dash-song-title">{mediaInfo.title || t('overview.song.unknownTitle', { defaultValue: '未知歌曲' })}</div>
              <div className="ov-dash-song-artist">{mediaInfo.artist || t('overview.song.unknownArtist', { defaultValue: '未知艺术家' })}</div>
              {mediaInfo.album && <div className="ov-dash-song-album">{mediaInfo.album}</div>}
            </div>
          </div>
          <div className="ov-dash-song-controls">
            <button className="ov-dash-song-btn" onClick={() => window.api.mediaPrev()} type="button" title={t('overview.song.prev', { defaultValue: '上一首' })}>
              <img src={SvgIcon.PREVIOUS_SONG} alt={t('overview.song.prev', { defaultValue: '上一首' })} className="ov-dash-song-btn-icon ov-dash-song-btn-icon--sm" />
            </button>
            <button className="ov-dash-song-btn ov-dash-song-btn-play" onClick={() => window.api.mediaPlayPause()} type="button" title={isPlaying ? t('overview.song.pause', { defaultValue: '暂停' }) : t('overview.song.play', { defaultValue: '播放' })}>
              {isPlaying ? (
                <img src={SvgIcon.PAUSE} alt={t('overview.song.pause', { defaultValue: '暂停' })} className="ov-dash-song-btn-icon" />
              ) : (
                <img src={SvgIcon.CONTINUE} alt={t('overview.song.play', { defaultValue: '播放' })} className="ov-dash-song-btn-icon" />
              )}
            </button>
            <button className="ov-dash-song-btn" onClick={() => window.api.mediaNext()} type="button" title={t('overview.song.next', { defaultValue: '下一首' })}>
              <img src={SvgIcon.NEXT_SONG} alt={t('overview.song.next', { defaultValue: '下一首' })} className="ov-dash-song-btn-icon ov-dash-song-btn-icon--sm" />
            </button>
          </div>
        </div>
      ) : (
        <div className="ov-dash-song-empty">{t('overview.song.empty', { defaultValue: '暂无播放中的歌曲' })}</div>
      )}
    </div>
  );
}
