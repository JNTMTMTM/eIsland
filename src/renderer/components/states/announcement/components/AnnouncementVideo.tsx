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
 * @file AnnouncementVideo.tsx
 * @description 公告 B站视频嵌入组件
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { BILIBILI_PLAYER_URL, VIDEO_DEFAULTS } from '../config/announcementVideoDefaults';
import type { AnnouncementVideoProps } from '../types/AnnouncementVideo.types';

/**
 * 嵌入 B站播放器 iframe。
 * @param props - 视频播放参数。
 * @returns B站播放器节点。
 */
export function AnnouncementVideo({
  bvid,
  cid,
  page = VIDEO_DEFAULTS.PAGE,
  className = '',
  autoplay = VIDEO_DEFAULTS.AUTOPLAY,
  showDanmaku = VIDEO_DEFAULTS.SHOW_DANMAKU,
  startTime = VIDEO_DEFAULTS.START_TIME,
  aspectRatio = VIDEO_DEFAULTS.ASPECT_RATIO,
}: AnnouncementVideoProps): ReactElement {
  const params = new URLSearchParams({
    bvid,
    page: page.toString(),
    high_quality: '1',
    danmaku: showDanmaku ? '1' : '0',
    autoplay: autoplay ? '1' : '0',
    as_wide: '1',
    ...(cid && { cid }),
    ...(startTime > 0 && { t: startTime.toString() }),
  });

  const src = `${BILIBILI_PLAYER_URL}?${params.toString()}`;

  return (
    <div className={`announcement-video-wrapper ${className}`.trim()}>
      <div
        className="announcement-video-container"
        style={{
          position: 'relative',
          paddingTop: `${aspectRatio * 100}%`,
          overflow: 'hidden',
          borderRadius: 10,
          backgroundColor: '#000',
        }}
      >
        <iframe
          className="announcement-video-iframe"
          src={src}
          allowFullScreen
          scrolling="no"
          frameBorder={0}
          title="announcement-video"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
    </div>
  );
}
