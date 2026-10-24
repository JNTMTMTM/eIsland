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
 * @file TrayMusicCard.tsx
 * @description 托盘音乐控制卡片：展示当前播放歌曲，支持暂停、恢复、上一首、下一首；播放源提供时间线时下方显示进度条可调整播放进度；读取中显示骨架屏
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../../utils/SvgIcon';
import { hasPlaybackTimeline } from '../utils/trayPlayback';
import { TrayMusicSeekBar } from './TrayMusicSeekBar';
import type { TrayNowPlaying } from '../types';
import '../styles/tray-menu-skeleton.css';

interface TrayMusicCardProps {
  /** 当前播放信息，无媒体时为 null */
  nowPlaying: TrayNowPlaying | null;
  /** 播放信息读取中 */
  loading: boolean;
  /** 菜单打开次数，变化时重建进度条，使其从打开时刻的进度开始显示并丢弃上次未完成的拖动 */
  openCount: number;
  /** 菜单是否正在显示，收起后进度条停止计时 */
  menuVisible: boolean;
  /** 暂停或恢复播放 */
  onTogglePlayback: () => void;
  /** 上一首 */
  onPrevious: () => void;
  /** 下一首 */
  onNext: () => void;
  /** 跳转到指定进度（毫秒） */
  onSeek: (positionMs: number) => void;
}

/**
 * 托盘音乐控制卡片
 * @description 无媒体时保留卡片并禁用按钮；播放源未提供有效时间线（含无媒体）时隐藏进度条，卡片恢复单行高度
 * @param props - 组件属性
 * @param props.nowPlaying - 当前播放信息
 * @param props.loading - 播放信息读取中
 * @param props.openCount - 菜单打开次数
 * @param props.menuVisible - 菜单是否正在显示
 * @param props.onTogglePlayback - 暂停或恢复播放
 * @param props.onPrevious - 上一首
 * @param props.onNext - 下一首
 * @param props.onSeek - 跳转到指定进度（毫秒）
 * @returns 卡片元素
 */
export function TrayMusicCard({ nowPlaying, loading, openCount, menuVisible, onTogglePlayback, onPrevious, onNext, onSeek }: TrayMusicCardProps): ReactElement {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="tray-music-card tray-music-card-with-seek" aria-busy="true" aria-label={t('tray.music.label')}>
        <div className="tray-music-card-main">
          <span className="tray-skeleton-block tray-skeleton-cover" />
          <span className="tray-skeleton-lines">
            <span className="tray-skeleton-block tray-skeleton-line" />
            <span className="tray-skeleton-block tray-skeleton-line tray-skeleton-line-short" />
          </span>
          <span className="tray-skeleton-controls">
            <span className="tray-skeleton-block tray-skeleton-button" />
            <span className="tray-skeleton-block tray-skeleton-button" />
            <span className="tray-skeleton-block tray-skeleton-button" />
          </span>
        </div>
        <span className="tray-skeleton-block tray-skeleton-seek" />
      </div>
    );
  }

  const idle = !nowPlaying;
  const seekable = hasPlaybackTimeline(nowPlaying);
  const playLabel = nowPlaying?.isPlaying ? t('tray.music.pause') : t('tray.music.play');

  return (
    <div className={`tray-music-card${idle ? ' tray-music-card-idle' : ''}${seekable ? ' tray-music-card-with-seek' : ''}`} aria-label={t('tray.music.label')}>
      <div className="tray-music-card-main">
        <div className="tray-music-card-cover">
          {nowPlaying?.thumbnail
            ? <img src={nowPlaying.thumbnail} alt={nowPlaying.title} />
            : <img className="tray-music-card-cover-icon" src={SvgIcon.MUSIC} alt="" />}
        </div>
        <div className="tray-music-card-info">
          <div className="tray-music-card-title">{nowPlaying?.title ?? t('tray.music.idle')}</div>
          <div className="tray-music-card-artist">
            {idle ? t('tray.music.idleHint') : nowPlaying.artist || t('tray.music.unknownArtist')}
          </div>
        </div>
        <div className="tray-music-card-controls">
          <button type="button" className="tray-music-card-btn" disabled={idle} title={t('tray.music.previous')} aria-label={t('tray.music.previous')} onClick={onPrevious}>
            <img className="tray-music-card-btn-icon tray-music-card-btn-icon-sm" src={SvgIcon.PREVIOUS_SONG} alt="" />
          </button>
          <button type="button" className="tray-music-card-btn tray-music-card-btn-play" disabled={idle} title={playLabel} aria-label={playLabel} onClick={onTogglePlayback}>
            <img className="tray-music-card-btn-icon" src={nowPlaying?.isPlaying ? SvgIcon.PAUSE : SvgIcon.CONTINUE} alt="" />
          </button>
          <button type="button" className="tray-music-card-btn" disabled={idle} title={t('tray.music.next')} aria-label={t('tray.music.next')} onClick={onNext}>
            <img className="tray-music-card-btn-icon tray-music-card-btn-icon-sm" src={SvgIcon.NEXT_SONG} alt="" />
          </button>
        </div>
      </div>
      {/* 换歌时同样重建：丢弃上一首的拖动预览，并结束未松手的拖动，避免松手后把新歌跳到旧位置。 */}
      {seekable && <TrayMusicSeekBar key={`${openCount}\n${nowPlaying.title}\n${nowPlaying.artist}`} nowPlaying={nowPlaying} active={menuVisible} onSeek={onSeek} />}
    </div>
  );
}
