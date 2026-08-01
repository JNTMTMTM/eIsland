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
 * @file AnnouncementHeader.tsx
 * @description 公告面板头部组件
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { AnnouncementData } from '../../../../api/announcement/announcementApi';
import { formatDatetime } from '../utils/formatDatetime';
import { ANNOUNCEMENT_KEYS, ANNOUNCEMENT_DEFAULTS } from '../config/announcementDefaults';
import { SvgIcon } from '../../../../utils/SvgIcon';

interface AnnouncementHeaderProps {
  announcement: AnnouncementData | null;
  onClose: () => void;
}

/**
 * 渲染公告面板头部信息与关闭按钮。
 * @param props - 公告头部渲染参数。
 * @returns 公告头部区域。
 */
export function AnnouncementHeader({ announcement, onClose }: AnnouncementHeaderProps): ReactElement {
  const { t } = useTranslation();

  const titleText = announcement?.title || t(ANNOUNCEMENT_KEYS.DEFAULT_TITLE, { defaultValue: ANNOUNCEMENT_DEFAULTS.DEFAULT_TITLE });
  const subtitleText = announcement?.updatedAt
    ? t(ANNOUNCEMENT_KEYS.UPDATED_AT, { defaultValue: ANNOUNCEMENT_DEFAULTS.UPDATED_AT, time: formatDatetime(announcement.updatedAt) })
    : t(ANNOUNCEMENT_KEYS.SUBTITLE, { defaultValue: ANNOUNCEMENT_DEFAULTS.SUBTITLE });

  return (
    <div className="announcement-panel-header">
      <div>
        <div className="announcement-title">{titleText}</div>
        <div className="announcement-subtitle">{subtitleText}</div>
      </div>
      <div className="announcement-header-actions">
        <button type="button" className="announcement-close-btn" onClick={onClose}>
          <img src={SvgIcon.CANCEL} alt="" draggable={false} />
        </button>
      </div>
    </div>
  );
}
