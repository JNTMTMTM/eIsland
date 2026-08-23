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
 * @file islandTransition.ts
 * @description 灵动岛状态尺寸与形变时序配置。
 * @author 鸡哥
 */

import type { IslandState } from '../types';
import { ISLAND_HEIGHT, ISLAND_WIDTH } from '../../../shared/islandDimensions';

export const ISLAND_STATE_AREA: Record<string, number> = {
  idle: ISLAND_WIDTH * ISLAND_HEIGHT,
  minimal: ISLAND_WIDTH * ISLAND_HEIGHT,
  lyrics: 500 * 42,
  lyricsTranslation: 500 * 60,
  hover: 500 * 60,
  notification: 500 * 88,
  expanded: 860 * 150,
  maxExpand: 860 * 400,
  guide: 860 * 400,
  login: 860 * 400,
  register: 860 * 400,
  resetPassword: 860 * 400,
  setPassword: 860 * 400,
  bindOAuth: 860 * 400,
  bindEmail: 860 * 400,
  payment: 860 * 400,
  announcement: 860 * 400,
  questionnaire: 860 * 400,
  agentVoiceInput: 500 * 42,
  agent: 500 * 88,
  stt: 500 * 88,
  cli: 500 * 88,
  musicProvidersLogin: 860 * 400,
};

const MORPH_DURATION_BY_SPEED: Record<string, number> = {
  slow: 1100,
  medium: 700,
  fast: 360,
};

/**
 * 获取指定速度档位的完整形变保护时长。
 * @param animationSpeed - 动画速度档位。
 * @returns 形变保护时长（毫秒）。
 */
export function getIslandMorphDuration(animationSpeed: string): number {
  return MORPH_DURATION_BY_SPEED[animationSpeed] ?? MORPH_DURATION_BY_SPEED.medium;
}

/**
 * 获取窗口缩小时应保留旧画布的时长。
 * @param fromState - 形变前状态。
 * @param toState - 形变后状态。
 * @param animationSpeed - 动画速度档位。
 * @returns 非缩小切换返回 0，缩小切换返回对应动画时长（毫秒）。
 */
export function getIslandWindowShrinkDelay(
  fromState: IslandState,
  toState: IslandState,
  animationSpeed: string,
): number {
  const fromArea = ISLAND_STATE_AREA[fromState] ?? 0;
  const toArea = ISLAND_STATE_AREA[toState] ?? 0;

  if (fromArea <= toArea) return 0;
  return getIslandMorphDuration(animationSpeed);
}