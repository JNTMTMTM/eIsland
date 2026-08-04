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
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../store/slices';
import { AnnouncementHeader } from './components/AnnouncementHeader';
import { AnnouncementBody } from './components/AnnouncementBody';
import { ANNOUNCEMENT_DEFAULTS, ANNOUNCEMENT_KEYS } from './config/announcementDefaults';
import { useAnnouncementData } from './hooks/useAnnouncementData';
import '../../../styles/announcement/announcement.css';

/**
 * 公告页内容组件
 * @returns 公告状态视图
 */
export function AnnouncementContent(): ReactElement {
  const { t } = useTranslation();
  const { setHover } = useIslandStore();
  const { loading, announcements, selectedAnnouncement, socialConfig, selectAnnouncement } = useAnnouncementData();
  const [showVideo, setShowVideo] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [listExpanded, setListExpanded] = useState(true);

  /** 切换公告时关闭视频和二维码，避免沿用上一条公告的媒体状态。 */
  const handleSelectAnnouncement = (announcement: (typeof announcements)[number]): void => {
    selectAnnouncement(announcement);
    setShowVideo(false);
    setShowQr(false);
  };

  const announcementList = !loading && announcements.length > 0 ? (
    <div className={`announcement-list-container${listExpanded ? '' : ' collapsed'}`}>
      <nav
        className={`announcement-list${listExpanded ? '' : ' collapsed'}`}
        aria-hidden={!listExpanded}
      >
        {announcements.map((announcement, index) => {
          const selected = announcement === selectedAnnouncement;
          return (
            <button
              key={announcement.id ?? `${announcement.updatedAt ?? 'announcement'}-${index}`}
              type="button"
              className={`announcement-list-item${selected ? ' active' : ''}`}
              aria-current={selected ? 'true' : undefined}
              tabIndex={listExpanded ? 0 : -1}
              onClick={() => handleSelectAnnouncement(announcement)}
            >
              <span className="announcement-list-title">
                {announcement.title || t(ANNOUNCEMENT_KEYS.DEFAULT_TITLE, ANNOUNCEMENT_DEFAULTS.DEFAULT_TITLE)}
              </span>
            </button>
          );
        })}
      </nav>
      <div className="announcement-ad-space" onClick={() => void window.api.clipboardOpenUrl('https://www.bilibili.com/video/BV1GJ411x7h7')}>
        <img
          className="announcement-ad-image"
          src="https://eisland-server-download-cdn.pyisland.com/eisland-update/t1.jpg"
          alt={t(ANNOUNCEMENT_KEYS.AD_SPACE, { defaultValue: ANNOUNCEMENT_DEFAULTS.AD_SPACE })}
          draggable={false}
        />
        <span className="announcement-ad-text">租借女友 (日结)</span>
      </div>
    </div>
  ) : undefined;

  return (
    <div className="announcement-state-content" onClick={(event) => event.stopPropagation()}>
      <div className="announcement-panel">
        <section className="announcement-detail">
          <AnnouncementHeader
            announcement={selectedAnnouncement}
            socialConfig={socialConfig}
            showVideo={showVideo}
            showQr={showQr}
            canToggleList={!loading && announcements.length > 0}
            listExpanded={listExpanded}
            onToggleList={() => {
              setListExpanded((expanded) => {
                if (!expanded) {
                  setShowVideo(false);
                  setShowQr(false);
                }
                return !expanded;
              });
            }}
            onToggleVideo={() => {
              if (!showVideo) {
                setListExpanded(false);
                setShowQr(false);
              }
              setShowVideo((visible) => !visible);
            }}
            onToggleQr={() => {
              if (!showQr) {
                setListExpanded(false);
                setShowVideo(false);
              }
              setShowQr((visible) => !visible);
            }}
            onClose={() => setHover()}
          />

          <div className="announcement-divider" />

          <AnnouncementBody
            loading={loading}
            announcement={selectedAnnouncement}
            showVideo={showVideo}
            showQr={showQr}
            qrImageUrl={socialConfig.qqQrImageUrl}
            announcementList={announcementList}
          />
        </section>
      </div>
    </div>
  );
}
