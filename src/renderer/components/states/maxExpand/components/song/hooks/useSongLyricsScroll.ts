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
 * @file useSongLyricsScroll.ts
 * @description 封装进入页面回中、歌词切换归顶、自动跟随、手动浏览与点击跳转。
 * @author 鸡哥
 */

import { useCallback, useEffect, useRef, type KeyboardEvent, type MouseEvent } from 'react';
import { useIslandContentActive } from '../../../../../hooks/islandContentActivity';
import { SONG_LYRICS_BROWSE_DELAY_MS, SONG_LYRICS_BROWSE_KEYS } from '../config/songConstants';
import useSongLyricsWheel from './useSongLyricsWheel';
import type { SongLyricsScrollOptions, SongLyricsScrollResult, SongScrollContext } from '../types/songTypes';

/**
 * 将滚动生命周期与展示分离，保留原有 effect 依赖和定时器清理语义。
 * @param options - 当前歌曲、歌词时间线与跳转能力。
 * @returns 滚动容器及浏览、键盘和跳转事件句柄。
 */
export default function useSongLyricsScroll(options: SongLyricsScrollOptions): SongLyricsScrollResult {
  const { trackKey, syncedLyrics, currentIndex, blocks, hasLyrics, canSeek, currentDurationMs, commitSeek } = options;
  const lyricsRef = useRef<HTMLDivElement>(null);
  const browsingUntilRef = useRef(0);
  const followTimerRef = useRef<number | null>(null);
  const initialLineRef = useRef<number | null>(null);
  const scrollContextRef = useRef<SongScrollContext | null>(null);
  const entryPendingRef = useRef(true);
  const centerOnEntryRef = useRef(false);
  const contentActive = useIslandContentActive();
  useSongLyricsWheel(lyricsRef, blocks, currentIndex, hasLyrics && contentActive);

  useEffect(() => {
    if (!contentActive) {
      entryPendingRef.current = true;
      browsingUntilRef.current = 0;
      if (followTimerRef.current !== null) window.clearTimeout(followTimerRef.current);
      return;
    }
    const previous = scrollContextRef.current;
    if (entryPendingRef.current || !previous || previous.trackKey !== trackKey || previous.lyrics !== syncedLyrics || previous.visible !== hasLyrics) {
      scrollContextRef.current = { trackKey, lyrics: syncedLyrics, visible: hasLyrics };
      browsingUntilRef.current = 0;
      if (followTimerRef.current !== null) window.clearTimeout(followTimerRef.current);
      // 进入页面优先显示当前句；等待异步歌词挂载后再完成首次定位。
      if (entryPendingRef.current && hasLyrics) {
        entryPendingRef.current = false;
        centerOnEntryRef.current = true;
        initialLineRef.current = null;
      } else {
        // 页面内换歌或切换歌词仍先归顶，下一次播放切行恢复跟随。
        initialLineRef.current = currentIndex;
        lyricsRef.current?.scrollTo({ top: 0, behavior: 'instant' });
      }
    } else if (initialLineRef.current !== currentIndex) {
      initialLineRef.current = null;
    }
  }, [trackKey, syncedLyrics, hasLyrics, currentIndex, contentActive]);

  const followLyrics = useCallback((): void => {
    if (!contentActive || initialLineRef.current !== null) return;
    const container = lyricsRef.current;
    const active = container?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!container) return;
    if (!active) {
      if (centerOnEntryRef.current) container.scrollTo({ top: 0, behavior: 'instant' });
      centerOnEntryRef.current = false;
      return;
    }
    const top = active.offsetTop - (container.clientHeight - active.offsetHeight) / 2;
    container.scrollTo({ top: Math.max(0, top), behavior: centerOnEntryRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    centerOnEntryRef.current = false;
  }, [contentActive]);

  useEffect(() => {
    const scheduleFollow = (): void => {
      if (followTimerRef.current !== null) window.clearTimeout(followTimerRef.current);
      followTimerRef.current = window.setTimeout(followLyrics, Math.max(0, browsingUntilRef.current - Date.now()));
    };
    const container = lyricsRef.current;
    const observer = new ResizeObserver(scheduleFollow);
    if (contentActive && hasLyrics && container) {
      scheduleFollow();
      observer.observe(container);
    }
    return () => {
      if (followTimerRef.current !== null) window.clearTimeout(followTimerRef.current);
      observer.disconnect();
    };
  }, [currentIndex, blocks, hasLyrics, followLyrics, contentActive]);

  const handleBrowse = useCallback((): void => {
    // 手动浏览时暂缓跟随；停下后回到当前句，避免歌词变化打断滚动。
    browsingUntilRef.current = Date.now() + SONG_LYRICS_BROWSE_DELAY_MS;
    initialLineRef.current = null;
    centerOnEntryRef.current = false;
    if (followTimerRef.current !== null) window.clearTimeout(followTimerRef.current);
    followTimerRef.current = window.setTimeout(followLyrics, SONG_LYRICS_BROWSE_DELAY_MS);
  }, [followLyrics]);
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLElement>): void => {
    // Tab 在歌曲面板内用于访问歌词按钮，不能被外层导航截获；Escape 等其余按键仍交给窗口级层级返回。
    if (event.key === 'Tab') event.stopPropagation();
    if (SONG_LYRICS_BROWSE_KEYS.includes(event.key)) handleBrowse();
  }, [handleBrowse]);
  const handleSeek = useCallback((event: MouseEvent<HTMLButtonElement>): void => {
    if (!canSeek) return;
    browsingUntilRef.current = 0;
    initialLineRef.current = null;
    centerOnEntryRef.current = false;
    commitSeek(Math.min(currentDurationMs, Math.max(0, Number(event.currentTarget.dataset.time))));
    if (followTimerRef.current !== null) window.clearTimeout(followTimerRef.current);
    followTimerRef.current = window.setTimeout(followLyrics, 0);
  }, [canSeek, commitSeek, currentDurationMs, followLyrics]);
  return { lyricsRef, handleBrowse, handleKeyDown, handleSeek };
}
