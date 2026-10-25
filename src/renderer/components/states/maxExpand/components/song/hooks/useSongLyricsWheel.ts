/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * Licensed under the GNU General Public License, version 3 or later.
 */

/**
 * @file useSongLyricsWheel.ts
 * @description 按歌词在可视区域中的实际位置绘制三维轮盘，支持自动跟随和手动滚动。
 * @author 鸡哥
 */

import { useEffect, type RefObject } from 'react';
import type { SyncedLyricLine } from '../../../../../../store/types';

/**
 * 在滚动帧内更新歌词的倾角、景深与透明度，不触发 React 高频重渲染。
 * @param containerRef - 原生歌词滚动容器。
 * @param lyrics - 当前歌词块，内容变化时重新测量。
 * @param currentIndex - 当前行，切行后重新测量放大的文字。
 * @param enabled - 有歌词且正在显示面板时启用。
 * @returns 无返回值。
 */
export default function useSongLyricsWheel(
  containerRef: RefObject<HTMLDivElement | null>,
  lyrics: SyncedLyricLine[],
  currentIndex: number,
  enabled: boolean,
): void {
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return undefined;
    const rows = Array.from(container.querySelectorAll<HTMLElement>('.song-lyric-block'));
    let frame: number | null = null;

    const paint = (): void => {
      frame = null;
      const center = container.scrollTop + container.clientHeight / 2;
      const radius = Math.max(180, container.clientHeight * .75);
      // 先统一测量再写入样式，避免在每一行上反复交错布局读取和写入。
      const positions = rows.map((row) => Math.max(-1, Math.min(1, (row.offsetTop + row.offsetHeight / 2 - center) / radius)));
      rows.forEach((row, index) => {
        const distance = positions[index];
        const depth = Math.abs(distance);
        row.style.setProperty('--song-wheel-angle', `${(-distance * 44).toFixed(2)}deg`);
        row.style.setProperty('--song-wheel-depth', `${(-depth * 54).toFixed(2)}px`);
        row.style.setProperty('--song-wheel-scale', (1 - depth * .12).toFixed(3));
        row.style.setProperty('--song-wheel-opacity', (1 - depth * .55).toFixed(3));
      });
    };
    const schedulePaint = (): void => {
      if (frame === null) frame = requestAnimationFrame(paint);
    };

    const observer = new ResizeObserver(schedulePaint);
    observer.observe(container);
    const active = rows.find((row) => row.getAttribute('aria-current') === 'true');
    if (active) observer.observe(active);
    container.addEventListener('scroll', schedulePaint, { passive: true });
    schedulePaint();

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      observer.disconnect();
      container.removeEventListener('scroll', schedulePaint);
    };
  }, [containerRef, lyrics, currentIndex, enabled]);
}
