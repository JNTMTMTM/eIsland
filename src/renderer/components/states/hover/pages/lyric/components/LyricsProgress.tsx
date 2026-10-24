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
 * @file LyricsProgress.tsx
 * @description 歌词 Tab 播放进度条：点击歌曲信息后替换歌曲信息，显示当前进度、总时长与当前歌词，拖动时只预览，松手或键盘调整完成后才跳转
 * @author 鸡哥
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import useIslandStore from '../../../../../../store/slices';
import { usePendingSeek } from '../../../../../hooks/usePendingSeek';
import { useCurrentLyric } from '../../../../lyrics/hooks/useCurrentLyric';
import { formatProgressTime } from '../utils/lyricUtils';
import type { ChangeEvent, CSSProperties, ReactElement } from 'react';

interface LyricsProgressProps {
  /** 点击时间行时切换回歌曲信息 */
  onShowInfo: () => void;
}

/**
 * 歌词 Tab 播放进度条
 * @description 播放源提供有效时长且点击歌曲信息后由歌词 Tab 挂载；进度订阅放在本组件内，避免整个歌词 Tab 随进度高频重渲染
 * @param props - 组件属性
 * @param props.onShowInfo - 点击时间行时切换回歌曲信息
 * @returns 进度条元素
 */
export function LyricsProgress({ onShowInfo }: LyricsProgressProps): ReactElement {
  const { t } = useTranslation();
  const { currentPositionMs, currentDurationMs, syncedLyrics, lyricsLoading, title, artist } = useIslandStore(useShallow((store) => ({
    currentPositionMs: store.currentPositionMs,
    currentDurationMs: store.currentDurationMs,
    syncedLyrics: store.syncedLyrics,
    lyricsLoading: store.lyricsLoading,
    title: store.mediaInfo.title,
    artist: store.mediaInfo.artist,
  })));
  const trackKey = `${title}\n${artist}`;
  const { pendingSeek, commitSeek } = usePendingSeek(trackKey);
  const [dragPositionMs, setDragPositionMs] = useState<number | null>(null);
  const sliderRef = useRef<HTMLInputElement | null>(null);

  // 换歌时滑块随 key 重建，未松手的拖动随之结束；绘制前丢弃上一首的拖动预览，切回该歌曲时也不会重现。
  useLayoutEffect(() => {
    setDragPositionMs(null);
  }, [trackKey]);

  // React 的 onChange 对应拖动过程中的 input 事件；原生 change 只在松手或键盘调整完成时触发，此时才真正跳转。
  // 换歌重建滑块后 commitSeek 随之变化，监听重新绑定到新滑块。
  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return undefined;
    const handleCommit = (): void => {
      commitSeek(Math.round(Number(slider.value)));
      setDragPositionMs(null);
    };
    slider.addEventListener('change', handleCommit);
    return () => slider.removeEventListener('change', handleCommit);
  }, [commitSeek]);

  const handleDrag = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setDragPositionMs(Number(event.currentTarget.value));
  }, []);

  // 本地播放时钟要等播放器推送新时间线后才会改变，跳转待确认期间先停在目标位置，避免松手后滑块跳回旧进度。
  const positionMs = Math.min(currentDurationMs, dragPositionMs ?? pendingSeek?.targetMs ?? currentPositionMs);
  const positionText = formatProgressTime(positionMs);
  const durationText = formatProgressTime(currentDurationMs);
  // 歌词与左侧时间同步取显示进度，拖动预览时一并显示目标位置的歌词；前奏、加载中或无歌词时为空。
  const { currentText: lyricText } = useCurrentLyric(syncedLyrics, lyricsLoading, positionMs);
  const showInfoLabel = t('hover.music.showInfo', { defaultValue: '显示歌曲信息' });

  // step="any" 让滑块随时间连续移动；键盘方向键按浏览器默认每次调整总时长的 1%。
  // 换歌时只重建滑块（重建整个进度条会重播出现过渡），避免松手后把新歌跳到上一首的拖动位置。
  return (
    <div className="lrc-progress">
      <input key={trackKey} ref={sliderRef} className="lrc-progress-slider" type="range" min={0} max={currentDurationMs} step="any" value={positionMs}
        aria-label={t('hover.music.seek', { defaultValue: '播放进度' })}
        aria-valuetext={t('hover.music.seekValue', { defaultValue: '{{position}} / {{duration}}', position: positionText, duration: durationText })}
        style={{ '--lrc-progress': `${(positionMs / currentDurationMs) * 100}%` } as CSSProperties} onChange={handleDrag} />
      {/* 滑块只负责跳转；时间行作为切换按钮与滑块并列，拖动或点击滑块不会切换回歌曲信息。 */}
      <button type="button" className="lrc-progress-times" onClick={onShowInfo} aria-label={showInfoLabel} title={showInfoLabel}>
        <span className="lrc-progress-time">{`${positionText} - ${durationText}`}</span>
        <span className="lrc-progress-lyric">{lyricText}</span>
      </button>
    </div>
  );
}
