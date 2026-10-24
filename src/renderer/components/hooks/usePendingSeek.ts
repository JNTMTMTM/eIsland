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
 * @file usePendingSeek.ts
 * @description 跟踪已提交但尚未被播放源确认的进度跳转，使歌词页与托盘菜单的进度条松手后停在跳转目标
 * @author 鸡哥
 */

import { useCallback, useEffect, useState } from 'react';
import type { NowPlayingInfo } from '../../../preload/types/media';

/** 松手后等待播放源确认跳转的最长时间，超时仍未确认视为跳转未生效，回到真实进度 */
const SEEK_CONFIRM_TIMEOUT_MS = 1000;

/** 播放源回报的进度与跳转目标相差在此范围内，即视为已跳转到位 */
const SEEK_CONFIRM_TOLERANCE_MS = 1500;

/** 已提交、等待播放源确认的跳转 */
export interface PendingSeek {
  /** 跳转目标（毫秒） */
  targetMs: number;
  /** 提交跳转的时刻（Unix 毫秒） */
  committedAt: number;
  /** 提交时的歌曲标识，换歌后作废 */
  trackKey: string;
}

interface PendingSeekControls {
  /** 当前歌曲待确认的跳转，无跳转或已作废时为 null */
  pendingSeek: PendingSeek | null;
  /** 提交跳转并转发给播放源 */
  commitSeek: (targetMs: number) => void;
}

/**
 * 判断媒体广播是否确认了跳转
 * @description 只认提交之后采样的进度：之前采样的广播必然还是旧进度，短距离跳转时旧进度与目标相近也不能当作确认
 * @param info - 主进程下发的媒体信息
 * @param seek - 待确认的跳转
 * @returns 采样进度与目标推进到同一采样时刻的进度相差不超过容差时为 true
 */
export function confirmsSeek(info: NowPlayingInfo, seek: PendingSeek): boolean {
  const sampledAt = info.positionTimestampMs;
  if (typeof sampledAt !== 'number' || !(sampledAt >= seek.committedAt)) return false;
  const elapsedMs = info.isPlaying ? (sampledAt - seek.committedAt) * (info.playbackRate ?? 1) : 0;
  return Math.abs(info.position_ms - (seek.targetMs + elapsedMs)) <= SEEK_CONFIRM_TOLERANCE_MS;
}

/**
 * 跟踪尚未被播放源确认的进度跳转
 * @description 广播确认后结束等待；跳转请求失败、超时、播放结束或换歌时作废，进度条随即回到真实进度
 * @param trackKey - 当前歌曲标识，与提交时不同则忽略未确认的跳转
 * @returns 待确认的跳转与提交跳转的函数
 */
export function usePendingSeek(trackKey: string): PendingSeekControls {
  const [pendingSeek, setPendingSeek] = useState<PendingSeek | null>(null);

  useEffect(() => {
    if (!pendingSeek) return undefined;
    // 新跳转提交后、本 effect 清理前仍可能收到广播，只结束本次跳转。
    const settle = (): void => setPendingSeek((current) => (current === pendingSeek ? null : current));
    const timer = window.setTimeout(settle, SEEK_CONFIRM_TIMEOUT_MS);
    const unsubscribe = window.api.onNowPlayingInfo((info) => {
      if (!info?.title || confirmsSeek(info, pendingSeek)) settle();
    });
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [pendingSeek]);

  const commitSeek = useCallback((targetMs: number): void => {
    const seek: PendingSeek = { targetMs, trackKey, committedAt: Date.now() };
    const revert = (): void => setPendingSeek((current) => (current === seek ? null : current));
    // 播放源不在白名单或位置无效时主进程不执行跳转、返回 undefined，与失败结果、请求失败一样立即回到真实进度。
    const forward = async (): Promise<void> => {
      if (!(await window.api.mediaSeek(targetMs))?.success) revert();
    };
    setPendingSeek(seek);
    // eslint-disable-next-line promise/prefer-await-to-then -- 松手事件回调需同步返回，在此处理跳转请求失败。
    forward().catch(revert);
  }, [trackKey]);

  return { commitSeek, pendingSeek: pendingSeek?.trackKey === trackKey ? pendingSeek : null };
}
