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
 * @file useThinkingReasoning.ts
 * @description ThinkingReasoning 组件的状态管理 hook
 * @author 鸡哥
 */

import { useEffect, useRef, useState } from 'react';
import type { UseThinkingReasoningOptions, UseThinkingReasoningReturn } from '../types/thinkingTypes';

/**
 * 管理思考过程的展开状态、计时和自动滚动。
 * @param isThinking - 是否仍在接收思考内容。
 * @param content - 当前思考过程文本（用于触发自动滚动）。
 * @param options - 可选配置：持久化耗时、结束回调。
 * @returns 展开状态、耗时、ref 和切换函数。
 */
export function useThinkingReasoning(
  isThinking: boolean,
  content: string,
  options?: UseThinkingReasoningOptions,
): UseThinkingReasoningReturn {
  const { persistedDuration, onDurationComputed } = options ?? {};
  const [open, setOpen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number | null>(persistedDuration ?? null);
  const startedAtRef = useRef<number | null>(isThinking ? Date.now() : null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const onDurationComputedRef = useRef(onDurationComputed);
  onDurationComputedRef.current = onDurationComputed;

  // 计时逻辑：thinking 期间每秒更新，结束时记录最终耗时
  useEffect(() => {
    if (!isThinking) {
      setOpen(false);
      if (startedAtRef.current !== null) {
        const seconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
        setElapsedSeconds(seconds);
        onDurationComputedRef.current?.(seconds);
      }
      return undefined;
    }

    if (startedAtRef.current === null) startedAtRef.current = Date.now();
    const updateElapsed = (): void => {
      if (startedAtRef.current === null) return;
      setElapsedSeconds(Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)));
    };
    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(timer);
  }, [isThinking]);

  // thinking 期间内容变化时自动滚动到底部
  useEffect(() => {
    if (!isThinking || !viewportRef.current) return;
    viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
  }, [content, isThinking]);

  const expanded = isThinking || open;
  const toggle = (): void => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && viewportRef.current) viewportRef.current.scrollTop = 0;
  };

  return { expanded, open, elapsedSeconds, viewportRef, toggle };
}
