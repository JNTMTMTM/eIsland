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
 * @file useAnnouncementToc.ts
 * @description 公告正文目录导航 Hook
 * @author 鸡哥
 */

import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import DOMPurify from 'dompurify';
import type { TocHeading } from '../types/AnnouncementBody.types';
import type { UseAnnouncementTocOptions } from '../types/useAnnouncementToc.types';

/** 从已净化的 HTML 内容中提取章节标题，确保与实际渲染内容一致 */
function extractHeadings(html: string): TocHeading[] {
  const container = document.createElement('div');
  container.innerHTML = DOMPurify.sanitize(html);
  const headings = container.querySelectorAll('h1, h2, h3');
  return Array.from(headings).map((el) => ({
    level: Number(el.tagName[1]),
    text: el.textContent?.trim() || '',
  })).filter((h) => h.text);
}

/**
 * 管理公告正文目录导航状态，包括章节提取、滚动高亮与点击跳转。
 * @param options - contentHtml 与 showVideo 标志。
 * @returns 目录渲染所需的 ref、状态与事件处理器。
 */
export function useAnnouncementToc({ contentHtml, showVideo }: UseAnnouncementTocOptions) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const tocRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const programmaticScrollTargetRef = useRef<number | null>(null);
  const programmaticScrollIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [indicatorTop, setIndicatorTop] = useState(0);

  const headings = useMemo(() => {
    if (!contentHtml) return [];
    return extractHeadings(contentHtml);
  }, [contentHtml]);

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

  /** 在平滑滚动空闲后恢复按正文位置同步目录 */
  const scheduleProgrammaticScrollRelease = useCallback((delay: number) => {
    if (programmaticScrollIdleTimerRef.current) {
      clearTimeout(programmaticScrollIdleTimerRef.current);
    }
    programmaticScrollIdleTimerRef.current = setTimeout(() => {
      programmaticScrollTargetRef.current = null;
      programmaticScrollIdleTimerRef.current = null;
    }, delay);
  }, []);

  /** 点击章节标题滚动到对应位置 */
  const handleTocClick = (text: string, index: number) => {
    programmaticScrollTargetRef.current = index;
    scheduleProgrammaticScrollRelease(1000);
    setActiveIndex(index);
    updateIndicator(index);
    const body = bodyRef.current;
    if (!body) return;
    const els = body.querySelectorAll('h1, h2, h3');
    Array.from(els).find((el) => {
      if (el.textContent?.trim() === text) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return true;
      }
      return false;
    });
  };

  /** 滚动时更新选中章节 */
  useEffect(() => {
    const body = bodyRef.current;
    if (!body || !contentHtml || showVideo) return;

    const handleScroll = () => {
      if (programmaticScrollTargetRef.current !== null) {
        scheduleProgrammaticScrollRelease(120);
        return;
      }

      const els = body.querySelectorAll('h1, h2, h3');
      if (!els.length) return;

      let closestIndex = 0;
      let closestDistance = Infinity;
      const bodyRect = body.getBoundingClientRect();

      els.forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        const distance = Math.abs(rect.top - bodyRect.top);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = i;
        }
      });

      setActiveIndex(closestIndex);
      updateIndicator(closestIndex);
    };

    body.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      body.removeEventListener('scroll', handleScroll);
      if (programmaticScrollIdleTimerRef.current) {
        clearTimeout(programmaticScrollIdleTimerRef.current);
        programmaticScrollIdleTimerRef.current = null;
      }
      programmaticScrollTargetRef.current = null;
    };
  }, [contentHtml, showVideo, updateIndicator, scheduleProgrammaticScrollRelease]);

  return {
    bodyRef,
    tocRef,
    itemRefs,
    headings,
    activeIndex,
    indicatorTop,
    handleTocClick,
  };
}
