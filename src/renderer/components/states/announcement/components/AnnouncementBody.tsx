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
 * @file AnnouncementBody.tsx
 * @description 公告面板正文组件
 * @author 鸡哥
 */

import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';
import { ANNOUNCEMENT_KEYS, ANNOUNCEMENT_DEFAULTS } from '../config/announcementDefaults';
import { useAnnouncementToc } from '../hooks/useAnnouncementToc';
import type { AnnouncementBodyProps } from '../types/AnnouncementBody.types';
import { AnnouncementVideo } from './AnnouncementVideo';

/**
 * 渲染公告面板正文内容。
 * @param props - 公告正文渲染参数。
 * @returns 公告正文区域。
 */
export function AnnouncementBody({
  loading,
  announcement,
  showVideo,
  showQr,
  qrImageUrl,
  announcementList,
}: AnnouncementBodyProps): ReactElement {
  const { t } = useTranslation();
  const { bodyRef, tocRef, itemRefs, headings, activeIndex, indicatorTop, handleTocClick } =
    useAnnouncementToc({ contentHtml: announcement?.contentHtml, showVideo });

  if (loading) {
    return <div className="announcement-empty">{t(ANNOUNCEMENT_KEYS.LOADING, { defaultValue: ANNOUNCEMENT_DEFAULTS.LOADING })}</div>;
  }

  if (!announcement) {
    return <div className="announcement-empty">{t(ANNOUNCEMENT_KEYS.EMPTY, { defaultValue: ANNOUNCEMENT_DEFAULTS.EMPTY })}</div>;
  }

  /** 点击链接时在外部浏览器打开 */
  const handleBodyClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const link = target.closest('a');
    if (link?.href) {
      e.preventDefault();
      void window.api.clipboardOpenUrl(link.href);
    }
  };

  const contentNode = announcement.contentHtml
    ? <div ref={bodyRef} className="announcement-body" onClick={handleBodyClick} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(announcement.contentHtml) }} />
    : <div ref={bodyRef} className="announcement-body"><pre>{announcement.content || ''}</pre></div>;

  return (
    <div className={`announcement-content-row${showVideo ? ' video-visible' : ''}${showQr ? ' qr-visible' : ''}`}>
      {announcementList}
      <div className="announcement-qr-wrapper">
        <img className="announcement-qr-image" src={qrImageUrl} alt={t(ANNOUNCEMENT_KEYS.QQ_QR_ALT, { defaultValue: ANNOUNCEMENT_DEFAULTS.QQ_QR_ALT })} draggable={false} />
      </div>
      {announcement.bvid && (
        <AnnouncementVideo bvid={announcement.bvid} autoplay={false} showDanmaku={false} aspectRatio={9 / 16} />
      )}
      {contentNode}
      {!showVideo && !showQr && headings.length > 0 && (
        <div ref={tocRef} className="announcement-toc">
          <div
            className="announcement-toc-indicator"
            style={{ top: `${indicatorTop}px`, opacity: activeIndex >= 0 ? 1 : 0 }}
          />
          {headings.map((h, i) => (
            <div
              key={i}
              ref={(el) => { itemRefs.current[i] = el; }}
              className={`announcement-toc-item level-${h.level}${i === activeIndex ? ' active' : ''}`}
              onClick={() => handleTocClick(h.text, i)}
            >{h.text}</div>
          ))}
        </div>
      )}
    </div>
  );
}
