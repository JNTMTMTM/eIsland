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

  const scrollToQuestion = useCallback((index: number): void => {
    const target = questionRefs.current[index];
    if (!target) return;
    setActiveIndex(index);
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    setActiveIndex(0);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [questionnaireId]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || questionCount === 0) return;
    const handleScroll = (): void => {
      const containerTop = container.getBoundingClientRect().top;
      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;
      questionRefs.current.forEach((question, index) => {
        if (!question) return;
        const distance = Math.abs(question.getBoundingClientRect().top - containerTop - 8);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });
      setActiveIndex(closestIndex);
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => container.removeEventListener('scroll', handleScroll);
  }, [questionCount]);

  return { scrollRef, questionRefs, activeIndex, scrollToQuestion };
}