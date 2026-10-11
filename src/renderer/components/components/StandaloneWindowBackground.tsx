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
 * @file StandaloneWindowBackground.tsx
 * @description 独立窗口背景渲染组件（图片/视频）。
 * @author 鸡哥
 */

import type { JSX, MutableRefObject, ReactEventHandler } from 'react';
import type { IslandBgMediaType } from '../config/dynamicIslandConfig';

interface StandaloneWindowBackgroundProps {
  bgMedia: { type: IslandBgMediaType; previewUrl: string } | null;
  bgImageOpacity: number;
  bgImageBlur: number;
  bgVideoHwDecode: boolean;
  bgVideoElementRef: MutableRefObject<HTMLVideoElement | null>;
  bgVideoMuted: boolean;
  bgVideoVolume: number;
  bgVideoFit: 'cover' | 'contain';
  onVideoLoadedMetadata: ReactEventHandler<HTMLVideoElement>;
  onVideoCanPlay: ReactEventHandler<HTMLVideoElement>;
}

/**
 * @description 渲染独立窗口背景层。
 * @param props - 独立窗口背景渲染参数。
 * @returns 独立窗口背景层节点。
 */
export function StandaloneWindowBackground(props: StandaloneWindowBackgroundProps): JSX.Element {
  const {
    bgMedia,
    bgImageOpacity,
    bgImageBlur,
    bgVideoHwDecode,
    bgVideoElementRef,
    bgVideoMuted,
    bgVideoVolume,
    bgVideoFit,
    onVideoLoadedMetadata,
    onVideoCanPlay,
  } = props;

  return (
    <div
      className="cw-bg-layer"
      style={{
        backgroundImage: bgMedia?.type === 'image' && bgMedia.previewUrl ? `url(${bgMedia.previewUrl})` : 'none',
        opacity: bgMedia?.previewUrl ? bgImageOpacity / 100 : 0,
        filter: bgMedia?.previewUrl && bgImageBlur > 0 ? `blur(${bgImageBlur}px)` : 'none',
      }}
    >
      {bgMedia?.type === 'video' && (
        <video
          key={`${bgMedia.previewUrl}-${bgVideoHwDecode ? 'hw' : 'sw'}`}
          ref={bgVideoElementRef}
          className="cw-bg-video"
          src={bgMedia.previewUrl}
          muted={bgVideoMuted || bgVideoVolume <= 0}
          playsInline
          preload="metadata"
          disableRemotePlayback
          style={{ objectFit: bgVideoFit, imageRendering: bgVideoHwDecode ? undefined : 'auto' }}
          onLoadedMetadata={onVideoLoadedMetadata}
          onCanPlay={onVideoCanPlay}
        />
      )}
    </div>
  );
}
