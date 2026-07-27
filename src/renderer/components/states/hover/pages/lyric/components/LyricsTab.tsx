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
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../../../../store/slices';
import { SvgIcon } from '../../../../../../utils/SvgIcon';
import { truncateByVisualWidth } from '../utils/lyricUtils';
import { SilkyWave } from './SilkyWave';
import { MusicBgWavePreview } from '../../../../maxExpand/components/setting/components/app/preview/MusicBgWavePreview';
import { HOVER_MUSIC_BG_STYLE_STORE_KEY } from '../../../../maxExpand/components/setting/config/settingsTabConfig';

type HoverMusicBgStyle = 'silky' | 'wave';

/**
 * 歌词 Tab 内容
 * @description 显示当前播放歌词、唱片封面和播放控制
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
  } = useIslandStore();

  const [bgStyle, setBgStyle] = useState<HoverMusicBgStyle>('silky');

  useEffect(() => {
    window.api.storeRead(HOVER_MUSIC_BG_STYLE_STORE_KEY).then((v) => {
      if (v === 'silky' || v === 'wave') setBgStyle(v);
    }).catch(() => {});
  }, []);

  const handlePlayPause = () => window.api?.mediaPlayPause();
  const handlePrev = () => window.api?.mediaPrev();
  const handleNext = () => window.api?.mediaNext();

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

      <div className="lrc-info-section">
        <div className={`lrc-title ${!isMusicPlaying ? 'inactive' : ''}`}>
          {albumText}
        </div>

        <div className="lrc-artist">{artistText}</div>
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
