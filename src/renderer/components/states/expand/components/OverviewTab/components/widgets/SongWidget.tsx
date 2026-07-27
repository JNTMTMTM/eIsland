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
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../../../../../store/slices';
import { SvgIcon } from '../../../../../../../utils/SvgIcon';
import { KaraokeSyllableLine } from '../../../../../lyrics/components/KaraokeSyllableLine';
import { useCurrentLyric } from '../../../../../lyrics/hooks/useCurrentLyric';
import { useLyricsSettings } from '../../../../../lyrics/hooks/useLyricsSettings';

/** 正在播放小组件，展示当前播放歌曲与媒体控制。 */
export function SongWidget(): ReactElement {
  const { t } = useTranslation();
  const [showLyrics, setShowLyrics] = useState(false);
  const {
    mediaInfo,
    coverImage,
    isPlaying,
    isMusicPlaying,
    dominantColor,
    syncedLyrics,
    lyricsLoading,
    currentPositionMs,
    setExpandTab,
  } = useIslandStore();
  const { lyricsEnabled, karaokeEnabled } = useLyricsSettings();
  const { currentIdx, hasLyrics, isIntro, currentLine, currentText, hasSyllables } = useCurrentLyric(
    syncedLyrics,
    lyricsLoading,
    currentPositionMs,
  );
  const lyricText = isIntro ? syncedLyrics?.[0]?.text ?? '' : currentText;
  const nextLyricText = syncedLyrics?.[isIntro ? 1 : currentIdx + 1]?.text ?? '';
  const lyricsVisible = showLyrics && lyricsEnabled;
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
            {lyricsVisible ? (
              <div className="ov-dash-song-lyrics">
                {lyricsLoading ? (
                  <span className="ov-dash-song-lyric-status">{t('songTab.lyrics.loading')}</span>
                ) : hasLyrics && lyricText ? (
                  <>
                    <div
                      key={currentIdx}
                      className={`ov-dash-song-lyric-current${karaokeEnabled && hasSyllables && !isIntro ? ' karaoke' : ''}`}
                    >
                      {karaokeEnabled && hasSyllables && currentLine && !isIntro ? (
                        <KaraokeSyllableLine
                          syllables={currentLine.syllables!}
                          lineStartMs={currentLine.time_ms}
                          posMs={currentPositionMs}
                        />
                      ) : (
                        lyricText
                      )}
                    </div>
                    {nextLyricText && <div className="ov-dash-song-lyric-next">{nextLyricText}</div>}
                  </>
                ) : (
                  <span className="ov-dash-song-lyric-status">{t('songTab.lyrics.empty')}</span>
                )}
              </div>
            ) : (
              <div className="ov-dash-song-info">
                <div className="ov-dash-song-title">{mediaInfo.title || t('overview.song.unknownTitle', { defaultValue: '未知歌曲' })}</div>
                <div className="ov-dash-song-artist">{mediaInfo.artist || t('overview.song.unknownArtist', { defaultValue: '未知艺术家' })}</div>
                {mediaInfo.album && <div className="ov-dash-song-album">{mediaInfo.album}</div>}
              </div>
            )}
          </div>
          <div className="ov-dash-song-controls">
            <button
              className="ov-dash-song-btn"
              onClick={() => setShowLyrics((visible) => !visible)}
              type="button"
              title={lyricsVisible ? t('overview.song.information') : t('overview.song.lyric')}
              aria-pressed={lyricsVisible}
              disabled={!lyricsEnabled}
            >
              <img
                src={lyricsVisible ? SvgIcon.INFORMATION : SvgIcon.LYRIC}
                alt={lyricsVisible ? t('overview.song.information') : t('overview.song.lyric')}
                className="ov-dash-song-btn-icon ov-dash-song-btn-icon--lg"
              />
            </button>
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
            <button className="ov-dash-song-btn" onClick={() => {}} type="button" title={t('overview.song.mute', { defaultValue: '静音' })}>
              <img src={SvgIcon.MUTE} alt={t('overview.song.mute', { defaultValue: '静音' })} className="ov-dash-song-btn-icon ov-dash-song-btn-icon--lg" />
            </button>
          </div>
        </div>
      ) : (
        <div className="ov-dash-song-empty">{t('overview.song.empty', { defaultValue: '暂无播放中的歌曲' })}</div>
      )}
    </div>
  );
}
