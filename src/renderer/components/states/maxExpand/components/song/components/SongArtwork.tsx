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
 * @file songArtwork.tsx
 * @description 歌曲封面、长标题轮播与元数据的展示。
 * @author 鸡哥
 */

import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../../../../utils/SvgIcon';
import { ScrollingText } from '../../../../lyrics/components/ScrollingText';
import type { ReactElement } from 'react';
import type { SongArtworkProps } from '../types/songTypes';

/**
 * 展示当前歌曲，不参与播放时间线和滚动生命周期。
 * @param props - 当前歌曲的封面与元数据。
 * @param props.song - 当前歌曲的封面、元数据与播放状态。
 * @returns 封面与歌曲信息区域。
 */
export default function SongArtwork({ song }: SongArtworkProps): ReactElement {
  const { t } = useTranslation();
  const { mediaInfo, coverImage, trackKey } = song;
  const title = mediaInfo.title || t('songTab.meta.notPlaying');
  const artist = mediaInfo.artist || t('hover.music.unknownArtist');
  /* eslint-disable better-tailwindcss/no-unknown-classes -- 沿用歌曲模块 song.css 和共享组件样式。 */
  return (
    <div className="song-artwork-column">
      <div className="song-cover">
        {coverImage ? <img src={coverImage} alt={title} draggable={false} /> : <img className="song-placeholder-icon-img" src={SvgIcon.MUSIC} alt="" />}
      </div>
      <div className="song-meta">
        <div className="song-title" role="heading" aria-level={2} title={title}>
          <ScrollingText key={trackKey} className="song-title-text">{title}</ScrollingText>
        </div>
        <p className="song-artist" title={artist}>{artist}</p>
        {mediaInfo.album && <p className="song-album" title={mediaInfo.album}>{mediaInfo.album}</p>}
      </div>

    </div>
  );
  /* eslint-enable better-tailwindcss/no-unknown-classes -- 歌曲展示样式例外结束。 */
}
