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
 * @description 歌词 Tab 播放进度条：点击歌曲信息后替换歌曲信息显示当前进度与总时长，拖动时只预览，松手或键盘调整完成后才跳转
 * @author 鸡哥
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import useIslandStore from '../../../../../../store/slices';
import { formatPlaybackTime } from '../../../../../components/DynamicIslandTrayMenu/utils/trayPlayback';
import type { ChangeEvent, CSSProperties, ReactElement } from 'react';

/** 松手后等待播放器回报新进度的最长时间，超时仍未回报视为跳转未生效，回到真实进度 */
const SEEK_SETTLE_TIMEOUT_MS = 1000;

/** 真实进度与跳转目标相差在此范围内，即视为播放器已跳转到位 */
const SEEK_SETTLE_TOLERANCE_MS = 1500;

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
  const { currentPositionMs, currentDurationMs } = useIslandStore(useShallow((store) => ({
    currentPositionMs: store.currentPositionMs,
    currentDurationMs: store.currentDurationMs,
  })));
  const [dragPositionMs, setDragPositionMs] = useState<number | null>(null);
  const [seekTargetMs, setSeekTargetMs] = useState<number | null>(null);
  const sliderRef = useRef<HTMLInputElement | null>(null);

  // React 的 onChange 对应拖动过程中的 input 事件；原生 change 只在松手或键盘调整完成时触发，此时才真正跳转。
  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return undefined;
    const handleCommit = (): void => {
      const targetMs = Math.round(Number(slider.value));
      setSeekTargetMs(targetMs);
      setDragPositionMs(null);
      window.api?.mediaSeek(targetMs).catch(() => undefined);
    };
    slider.addEventListener('change', handleCommit);
    return () => slider.removeEventListener('change', handleCommit);
  }, []);

  useEffect(() => {
    if (seekTargetMs === null) return undefined;
    const timer = window.setTimeout(() => setSeekTargetMs(null), SEEK_SETTLE_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [seekTargetMs]);

  const handleDrag = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setDragPositionMs(Number(event.currentTarget.value));
  }, []);

  // 本地播放时钟要等播放器推送新时间线后才会改变，期间先停在跳转目标，避免松手后滑块跳回旧进度。
  const awaitingSeek = seekTargetMs !== null && Math.abs(currentPositionMs - seekTargetMs) > SEEK_SETTLE_TOLERANCE_MS;
  const positionMs = Math.min(currentDurationMs, dragPositionMs ?? (awaitingSeek ? seekTargetMs : currentPositionMs));
  const positionText = formatPlaybackTime(positionMs);
  const durationText = formatPlaybackTime(currentDurationMs);
  const showInfoLabel = t('hover.music.showInfo', { defaultValue: '显示歌曲信息' });

  // step="any" 让滑块随时间连续移动；键盘方向键按浏览器默认每次调整总时长的 1%。
  return (
    <div className="lrc-progress">
      <input ref={sliderRef} className="lrc-progress-slider" type="range" min={0} max={currentDurationMs} step="any" value={positionMs}
        aria-label={t('hover.music.seek', { defaultValue: '播放进度' })}
        aria-valuetext={t('hover.music.seekValue', { defaultValue: '{{position}} / {{duration}}', position: positionText, duration: durationText })}
        style={{ '--lrc-progress': `${(positionMs / currentDurationMs) * 100}%` } as CSSProperties} onChange={handleDrag} />
      {/* 滑块只负责跳转；时间行作为切换按钮与滑块并列，拖动或点击滑块不会切换回歌曲信息。 */}
      <button type="button" className="lrc-progress-times" onClick={onShowInfo} aria-label={showInfoLabel} title={showInfoLabel}>
        <span>{positionText}</span>
        <span>{durationText}</span>
      </button>
    </div>
  );
}
