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
 * @file DynamicIslandBackground.tsx
 * @description 灵动岛背景渲染组件（图片/视频）。
 * @author 鸡哥
 */

import type { JSX, MutableRefObject, ReactEventHandler } from 'react';

type IslandBgMediaType = 'image' | 'video';

interface DynamicIslandBackgroundProps {
  bgMedia: { type: IslandBgMediaType; previewUrl: string } | null;
  bgVideoElementRef: MutableRefObject<HTMLVideoElement | null>;
  bgVideoHwDecode: boolean;
  bgVideoMuted: boolean;
  bgVideoVolume: number;
  bgVideoFit: 'cover' | 'contain';
  onVideoLoadedMetadata: ReactEventHandler<HTMLVideoElement>;
  onVideoCanPlay: ReactEventHandler<HTMLVideoElement>;
}

/**
 * @description 渲染灵动岛背景层。
 * @param props - 灵动岛背景渲染参数。
 * @returns 灵动岛背景层节点。
 */
export function DynamicIslandBackground({
  bgMedia,
  bgVideoElementRef,
  bgVideoHwDecode,
  bgVideoMuted,
  bgVideoVolume,
  bgVideoFit,
  onVideoLoadedMetadata,
  onVideoCanPlay,
}: DynamicIslandBackgroundProps): JSX.Element {
  return (
    <div className="island-bg-layer" id="island-bg-layer">
      {bgMedia?.type === 'video' && (
        <video
          key={`${bgMedia.previewUrl}-${bgVideoHwDecode ? 'hw' : 'sw'}`}
          ref={bgVideoElementRef}
          className="island-bg-video"
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
