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
 * @description 最大展开歌曲页的薄组合入口，数据、交互与展示由模块内部各层负责。
 * @author 鸡哥
 */

// eslint-disable-next-line project/filename -- 模块拆分规范要求组件文件名使用 PascalCase。
import { useTranslation } from 'react-i18next';
import useSongData from '../hooks/useSongData';
import useSongLyricsScroll from '../hooks/useSongLyricsScroll';
import useSongMediaControls from '../hooks/useSongMediaControls';
import SongArtwork from './SongArtwork';
import SongLyricsPanel from './SongLyricsPanel';
import SongPlayerBar from './SongPlayerBar';
import type { CSSProperties, ReactElement } from 'react';
import '../../../../../../styles/lyrics/lyrics.css';
import '../../../../../../styles/settings/modules/settings-skeleton.css';
import '../styles/song.css';

/**
 * 组合歌曲数据、滚动句柄与展示区域，保持公共入口稳定。
 * @returns 最大展开歌曲面板。
 */
export default function SongTab(): ReactElement {
  const { t } = useTranslation();
  const song = useSongData();
  const scroll = useSongLyricsScroll(song);
  const controls = useSongMediaControls();
  /* eslint-disable better-tailwindcss/no-unknown-classes -- 沿用歌曲模块 song.css 和共享组件样式。 */
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- 在容器接收子按钮冒泡事件，防止外层导航截获；交互由原生按钮完成。
    <section className="max-expand-tab-panel song-panel" onKeyDown={scroll.handleKeyDown}
      aria-label={t('maxExpand.nav.song')}
      style={{ '--song-accent': song.dominantColor.join(', ') } as CSSProperties}>
      <div className="song-layout">
        <SongArtwork song={song} />
        <SongLyricsPanel song={song} scroll={scroll} />
      </div>
      <SongPlayerBar song={song} controls={controls} />
    </section>
  );
  /* eslint-enable better-tailwindcss/no-unknown-classes -- 歌曲展示样式例外结束。 */
}
