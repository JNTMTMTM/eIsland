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

import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../store/slices';
import {
  fetchCurrentAnnouncement,
  type AnnouncementData,
} from '../../../api/announcement/announcementApi';
import '../../../styles/announcement/announcement.css';

function formatDatetime(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function AnnouncementContent(): ReactElement {
  const { t } = useTranslation();
  const { setHover } = useIslandStore();
  const [loading, setLoading] = useState(true);
  const [announcement, setAnnouncement] = useState<AnnouncementData | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      const result = await fetchCurrentAnnouncement();
      if (cancelled) return;
      setAnnouncement(result);
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="announcement-state-content" onClick={(event) => event.stopPropagation()}>
      <div className="announcement-panel">
        <div className="announcement-panel-header">
          <div>
            <div className="announcement-title">{t('announcement.title', { defaultValue: '公告' })}</div>
            <div className="announcement-subtitle">{t('announcement.subtitle', { defaultValue: '当前已是最新版本，以下为最新公告内容。' })}</div>
          </div>
          <div className="announcement-header-actions">
            {announcement && (
              <div className="announcement-meta-vertical">
                <span className="announcement-meta-title">{announcement.title || t('announcement.defaultTitle', { defaultValue: '系统公告' })}</span>
                {announcement.updatedAt && (
                  <span className="announcement-meta-time">{t('announcement.updatedAt', { defaultValue: '更新时间：{{time}}', time: formatDatetime(announcement.updatedAt) })}</span>
                )}
              </div>
            )}
            <button type="button" className="announcement-close-btn" onClick={() => setHover()}>
              {t('announcement.close', { defaultValue: '关闭' })}
            </button>
          </div>
        </div>

        <div className="announcement-divider" />

        {loading ? (
          <div className="announcement-empty">{t('announcement.loading', { defaultValue: '正在加载公告…' })}</div>
        ) : !announcement ? (
          <div className="announcement-empty">{t('announcement.empty', { defaultValue: '暂无公告内容' })}</div>
        ) : (
          <>
            {announcement.contentHtml ? (
              <div className="announcement-body" dangerouslySetInnerHTML={{ __html: announcement.contentHtml }} />
            ) : (
              <div className="announcement-body">
                <pre>{announcement.content || ''}</pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
