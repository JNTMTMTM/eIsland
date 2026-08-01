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

import { useMemo, useRef, useState, useCallback, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';
import type { AnnouncementData } from '../../../../api/announcement/announcementApi';
import { ANNOUNCEMENT_KEYS, ANNOUNCEMENT_DEFAULTS } from '../config/announcementDefaults';
import { AnnouncementVideo } from './AnnouncementVideo';

/** 从 HTML 内容中提取章节标题 */
function extractHeadings(html: string): { level: number; text: string }[] {
  const container = document.createElement('div');
  container.innerHTML = html;
  const headings = container.querySelectorAll('h1, h2, h3');
  return Array.from(headings).map((el) => ({
    level: Number(el.tagName[1]),
    text: el.textContent?.trim() || '',
  })).filter((h) => h.text);
}

interface AnnouncementBodyProps {
  loading: boolean;
  announcement: AnnouncementData | null;
  showVideo: boolean;
}

/**
 * 渲染公告面板正文内容。
 * @param props - 公告正文渲染参数。
 * @returns 公告正文区域。
 */
export function AnnouncementBody({ loading, announcement, showVideo }: AnnouncementBodyProps): ReactElement {
  const { t } = useTranslation();
  const bodyRef = useRef<HTMLDivElement>(null);
  const tocRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [indicatorTop, setIndicatorTop] = useState(0);

  const headings = useMemo(() => {
    if (!announcement?.contentHtml) return [];
    return extractHeadings(announcement.contentHtml);
  }, [announcement?.contentHtml]);

  /** 更新指示器位置 */
  const updateIndicator = useCallback((index: number) => {
    const item = itemRefs.current[index];
    const toc = tocRef.current;
    if (!item || !toc) return;
    const tocRect = toc.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const itemTop = itemRect.top - tocRect.top + toc.scrollTop;
    setIndicatorTop(itemTop + (itemRect.height - 12) / 2);
  }, []);

  /** 点击章节标题滚动到对应位置 */
  const handleTocClick = (text: string, index: number) => {
    setActiveIndex(index);
    updateIndicator(index);
    const body = bodyRef.current;
    if (!body) return;
    const els = body.querySelectorAll('h1, h2, h3');
    for (const el of els) {
      if (el.textContent?.trim() === text) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      }
    }
  };

  if (loading) {
    return <div className="announcement-empty">{t(ANNOUNCEMENT_KEYS.LOADING, { defaultValue: ANNOUNCEMENT_DEFAULTS.LOADING })}</div>;
  }

  if (!announcement) {
    return <div className="announcement-empty">{t(ANNOUNCEMENT_KEYS.EMPTY, { defaultValue: ANNOUNCEMENT_DEFAULTS.EMPTY })}</div>;
  }

  const contentNode = announcement.contentHtml
    ? <div ref={bodyRef} className="announcement-body" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(announcement.contentHtml) }} />
    : <div ref={bodyRef} className="announcement-body"><pre>{announcement.content || ''}</pre></div>;

  if (announcement.bvid) {
    return (
      <div className={`announcement-content-row${showVideo ? ' video-visible' : ''}`}>
        <AnnouncementVideo bvid={announcement.bvid} autoplay={false} showDanmaku={false} aspectRatio={9 / 16} />
        {contentNode}
        {!showVideo && headings.length > 0 && (
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

  return contentNode;
}
