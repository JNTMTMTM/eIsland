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
 * @file SongVolumeControl.tsx
 * @description 歌曲播放器右侧的系统音量滑块，复用 volume 插件 IPC。
 * @author 鸡哥
 */

// eslint-disable-next-line project/filename -- 歌曲模块的展示组件沿用 PascalCase 命名。
import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../../../../utils/SvgIcon';
import useSongVolume from '../hooks/useSongVolume';
import type { CSSProperties, ReactElement } from 'react';

/**
 * 展示可键盘调节的系统音量，设备不可用时禁用输入。
 * @returns 底栏右侧音量编辑区域。
 */
export default function SongVolumeControl(): ReactElement {
  const { t } = useTranslation();
  const { volume, isAvailable, handleVolumeChange } = useSongVolume();
  const valueText = isAvailable ? `${volume}%` : t('hover.volume.unavailable');
  /* eslint-disable better-tailwindcss/no-unknown-classes -- 音量控件沿用歌曲模块 song.css 样式。 */
  return (
    <div className="song-volume" title={t('hover.volume.title')}>
      <img className="song-volume-icon-img" src={volume === 0 ? SvgIcon.MUTE : SvgIcon.VOLUME} alt="" />
      <input className="song-volume-slider" type="range" min={0} max={100} step={1}
        value={volume} disabled={!isAvailable} onChange={handleVolumeChange}
        aria-label={t('hover.volume.sliderLabel')} aria-valuetext={valueText}
        style={{ '--song-volume': `${volume}%` } as CSSProperties} />
      <span className="song-volume-value" aria-hidden="true">{valueText}</span>
    </div>
  );
  /* eslint-enable better-tailwindcss/no-unknown-classes -- 音量样式例外结束。 */
}
