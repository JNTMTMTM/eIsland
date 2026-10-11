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
 * @file backgroundVideoPlayback.ts
 * @description 在页面隐藏或背景全透明时停止视频解码。
 * @author 鸡哥
 */

/** 检查视频是否有可见的背景层。 */
export function canPlayBackgroundVideo(video: HTMLVideoElement): boolean {
  if (typeof document !== 'undefined' && document.hidden) return false;
  const opacity = video.parentElement?.style.opacity;
  return opacity === undefined || opacity === '' || Number(opacity) > 0;
}

/**
 * 监听可见性及背景透明度，保留播放位置并释放监听器。
 * @param video - 背景视频元素。
 * @param shouldLoop - 返回最新循环设置，恢复可见时决定是否重播已结束的视频。
 * @returns 取消监听及暂停方法。
 */
export function watchBackgroundVideo(video: HTMLVideoElement, shouldLoop: () => boolean = () => false): () => void {
  const reconcile = (): void => {
    if (!canPlayBackgroundVideo(video)) video.pause();
    else if (video.paused) {
      if (video.ended) {
        if (!shouldLoop()) return;
        try { video.currentTime = 0; } catch { /* 未就绪媒体由后续 canplay 重试。 */ }
      }
      void video.play().catch(() => {});
    }
  };
  const observer = typeof MutationObserver !== 'undefined' ? new MutationObserver(reconcile) : null;
  if (video.parentElement) observer?.observe(video.parentElement, { attributes: true, attributeFilter: ['style', 'class'] });
  if (typeof document !== 'undefined') document.addEventListener?.('visibilitychange', reconcile);
  reconcile();
  return () => {
    observer?.disconnect();
    if (typeof document !== 'undefined') document.removeEventListener?.('visibilitychange', reconcile);
    video.pause();
  };
}
