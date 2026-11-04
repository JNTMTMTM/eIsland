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
 * @file useSplashVideo.ts
 * @description 启动画面视频播放控制 Hook，监听主进程播放指令并通知播放完成
 * @author 鸡哥
 */

import { useCallback, useEffect, useRef } from 'react';

/** 启动画面视频播放控制 Hook */
export function useSplashVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  /** 视频播放完成，通知主进程 */
  const handleVideoEnded = useCallback(() => {
    window.desktop.send('splash:video-ended');
  }, []);

  /** 监听主进程指令：开始播放视频 */
  useEffect(() => {
    const removeListener = window.desktop.on('splash:play-video', () => {
      videoRef.current?.play().catch(() => {});
    });
    window.desktop.send('splash:renderer-ready');
    return removeListener;
  }, []);

  return { videoRef, handleVideoEnded };
}
