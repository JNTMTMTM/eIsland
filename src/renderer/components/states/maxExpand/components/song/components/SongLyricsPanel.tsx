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
 * @file songLyricsPanel.tsx
 * @description 歌词、译文、逐字扫光、加载骨架与空状态的纯展示组合。
 * @author 鸡哥
 */

import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../../../../utils/SvgIcon';
import { KaraokeSyllableLine } from '../../../../lyrics/components/KaraokeSyllableLine';
import SongLyricsSkeleton from './songLyricsSkeleton';
import type { ReactElement } from 'react';
import type { SongLyricsPanelProps } from '../types/songTypes';

/**
 * 根据数据状态展示原有歌词分支，交互统一转发到滚动 Hook。
 * @param props - 歌词派生数据与滚动句柄。
 * @param props.song - 完整歌词、当前播放行和显示状态。
 * @param props.scroll - 滚动容器及浏览、跳转事件句柄。
 * @returns 完整歌词展示区域。
 */
export default function SongLyricsPanel({ song, scroll }: SongLyricsPanelProps): ReactElement {
  const { t } = useTranslation();
  const { blocks, currentIndex, karaokeEnabled, positionMs, canSeek, hasLyrics, showSkeleton, isMusicPlaying } = song;
  const { lyricsRef, handleBrowse, handleSeek } = scroll;
  const statusText = isMusicPlaying ? t('songTab.lyrics.empty') : t('songTab.onboarding.hint');
  /* eslint-disable better-tailwindcss/no-unknown-classes -- 沿用歌曲模块 song.css 和共享组件样式。 */
  return (
    <div className="song-lyrics-viewport">
      {showSkeleton && <SongLyricsSkeleton />}
      {hasLyrics && (
        <div className="song-lyrics" ref={lyricsRef} onWheel={handleBrowse} onTouchMove={handleBrowse} onPointerDown={handleBrowse}
          role="region" aria-label={t('songTab.lyrics.all')}>
          {blocks.map((block, index) => (
            <button className="song-lyric-block" key={block.time_ms} type="button" data-time={block.time_ms}
              aria-current={index === currentIndex ? 'true' : undefined} disabled={!canSeek} onClick={handleSeek}>
              <span className="song-lyric-original">
                {index === currentIndex && karaokeEnabled && block.syllables?.length ? (
                  <KaraokeSyllableLine syllables={block.syllables} lineStartMs={block.time_ms} posMs={positionMs} />
                ) : block.text}
              </span>
              {block.translation && <span className="song-lyric-translation">{block.translation}</span>}
            </button>
          ))}
        </div>
      )}
      {!hasLyrics && !showSkeleton && (
        <div className="song-empty" role="status">
          <img className="song-placeholder-icon-img" src={SvgIcon.MUSIC} alt="" />
          <p>{statusText}</p>
        </div>
      )}
    </div>
  );
  /* eslint-enable better-tailwindcss/no-unknown-classes -- 歌曲展示样式例外结束。 */
}
