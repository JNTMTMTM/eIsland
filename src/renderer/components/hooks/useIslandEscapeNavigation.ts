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
 * @file useIslandEscapeNavigation.ts
 * @description 灵动岛 Escape 键层级返回控制 Hook。
 * @author 鸡哥
 */

import { useEffect } from 'react';
import type { IslandState } from './useDynamicIslandShell';

interface UseIslandEscapeNavigationOptions {
  state: IslandState;
  setIdle: (force?: boolean) => void;
  setHover: () => void;
  setExpanded: () => void;
}

/**
 * @description 获取 Escape 键对应的上一级岛屿状态。
 * @param state - 当前岛屿状态。
 * @returns 上一级岛屿状态；不支持键盘返回时返回 null。
 */
export function getEscapeNavigationTarget(state: IslandState): IslandState | null {
  if (state === 'maxExpand') return 'expanded';
  if (state === 'expanded') return 'hover';
  if (state === 'hover') return 'idle';
  return null;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return target.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select';
}

function hasLocalEscapeOwner(): boolean {
  return document.querySelector('.album-viewer, .slider-captcha-overlay') !== null;
}

/**
 * @description 监听 Escape 键，并按 maxExpand → expanded → hover → idle 逐级返回。
 * @param options - 层级返回所需的当前状态与状态切换入口。
 * @returns 无返回值。
 */
export function useIslandEscapeNavigation(options: UseIslandEscapeNavigationOptions): void {
  const {
    state,
    setIdle,
    setHover,
    setExpanded,
  } = options;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || event.repeat || event.defaultPrevented) return;
      if (isEditableTarget(event.target) || hasLocalEscapeOwner()) return;

      const target = getEscapeNavigationTarget(state);
      if (target === null) return;

      event.preventDefault();
      if (target === 'expanded') {
        setExpanded();
        return;
      }

      if (target === 'hover') {
        setHover();
        return;
      }

      setIdle();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, setExpanded, setHover, setIdle]);
}