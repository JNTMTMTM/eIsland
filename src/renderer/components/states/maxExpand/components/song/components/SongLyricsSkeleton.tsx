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
 * @file SongLyricsSkeleton.tsx
 * @description 加载中的双行歌词骨架，复用共享扫光并提供读屏状态。
 * @author 鸡哥
 */

// eslint-disable-next-line project/filename -- 模块拆分规范要求组件文件名使用 PascalCase。
import { useTranslation } from 'react-i18next';
import { SONG_SKELETON_ROWS } from '../config/songConstants';
import type { ReactElement } from 'react';

/**
 * 将装饰骨架与读屏加载提示保持在同一状态容器内。
 * @returns 带扫光的双行歌词加载占位。
 */
export default function SongLyricsSkeleton(): ReactElement {
  const { t } = useTranslation();
  /* eslint-disable better-tailwindcss/no-unknown-classes -- 沿用歌曲模块 song.css 和共享组件样式。 */
  return (
    <div className="song-lyrics-skeleton" role="status" aria-busy="true" aria-label={t('songTab.lyrics.loading')}>
      <div className="song-skeleton-lines" aria-hidden="true">
        {SONG_SKELETON_ROWS.map((key) => (
          <div className="song-skeleton-row" key={key}>
            <span className="settings-skeleton-block settings-skeleton-sweep song-skeleton-original" />
            <span className="settings-skeleton-block settings-skeleton-sweep song-skeleton-translation" />
          </div>
        ))}
      </div>
    </div>
  );
  /* eslint-enable better-tailwindcss/no-unknown-classes -- 歌曲展示样式例外结束。 */
}
