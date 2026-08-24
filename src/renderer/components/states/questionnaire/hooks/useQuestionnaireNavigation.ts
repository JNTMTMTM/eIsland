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
 */

/**
 * @file useQuestionnaireNavigation.ts
 * @description 问卷题号导航与正文滚动同步 Hook。
 * @author 鸡哥
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 管理题目滚动定位和当前题号。
 * @param questionCount - 当前问卷题目数量。
 * @param questionnaireId - 当前问卷 ID，用于切换问卷时重置滚动位置。
 * @returns 题目节点引用、当前题号和点击跳转方法。
 */
export function useQuestionnaireNavigation(questionCount: number, questionnaireId: number | null) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const questionRefs = useRef<(HTMLElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const programmaticScrollRef = useRef(false);

  const scrollToQuestion = useCallback((index: number): void => {
    const target = questionRefs.current[index];
    if (!target) return;
    programmaticScrollRef.current = true;
    setActiveIndex(index);
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 600);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [questionnaireId]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || questionCount === 0) return;

    observerRef.current?.disconnect();

    const observer = new IntersectionObserver(
      (entries) => {
        if (programmaticScrollRef.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const index = questionRefs.current.findIndex((ref) => ref === entry.target);
            if (index !== -1) {
              setActiveIndex(index);
            }
          }
        }
      },
      {
        root: container,
        rootMargin: '-10% 0px -80% 0px',
        threshold: 0,
      },
    );

    observerRef.current = observer;

    questionRefs.current.forEach((question) => {
      if (question) observer.observe(question);
    });

    const handleScroll = (): void => {
      if (programmaticScrollRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollTop + clientHeight >= scrollHeight - 2) {
        setActiveIndex(questionCount - 1);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      observerRef.current = null;
      container.removeEventListener('scroll', handleScroll);
    };
  }, [questionCount]);

  return { scrollRef, questionRefs, activeIndex, scrollToQuestion };
}