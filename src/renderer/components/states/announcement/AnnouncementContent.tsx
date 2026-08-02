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
 * @file AnnouncementContent.tsx
 * @description 公告状态界面
 * @author 鸡哥
 */

import { useState, type ReactElement } from 'react';
import useIslandStore from '../../../store/slices';
import { AnnouncementHeader } from './components/AnnouncementHeader';
import { AnnouncementBody } from './components/AnnouncementBody';
import { useAnnouncementData } from './hooks/useAnnouncementData';
import '../../../styles/announcement/announcement.css';

/**
 * 公告页内容组件
 * @returns 公告状态视图
 */
export function AnnouncementContent(): ReactElement {
  const { setHover } = useIslandStore();
  const { loading, announcement } = useAnnouncementData();
  const [showVideo, setShowVideo] = useState(false);

  return (
    <div className="announcement-state-content" onClick={(event) => event.stopPropagation()}>
      <div className="announcement-panel">
        <AnnouncementHeader
          announcement={announcement}
          showVideo={showVideo}
          onToggleVideo={() => setShowVideo((v) => !v)}
          onClose={() => setHover()}
        />

        <div className="announcement-divider" />

        <AnnouncementBody loading={loading} announcement={announcement} showVideo={showVideo} />
      </div>
    </div>
  );
}
