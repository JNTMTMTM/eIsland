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
 * @file dynamicIslandStateConfig.ts
 * @description 灵动岛状态面积与状态行为配置。
 * @author 鸡哥
 */

import type { IslandState } from '../hooks/useDynamicIslandShell';
import { ISLAND_STATE_AREA } from '../../store/constants/islandTransition';

export const STATE_AREA = ISLAND_STATE_AREA;

interface StateConfig {
  name: IslandState;
  mousePassthrough: boolean;
  expanded: boolean;
  enterDelay: number;
  leaveDelay: number;
}

export const STATE_CONFIGS: Record<IslandState, StateConfig> = {
  idle: {
    name: 'idle',
    mousePassthrough: true,
    expanded: false,
    enterDelay: 0,
    leaveDelay: 0,
  },
  hover: {
    name: 'hover',
    mousePassthrough: false,
    expanded: true,
    enterDelay: 60,
    leaveDelay: 80,
  },
  expanded: {
    name: 'expanded',
    mousePassthrough: false,
    expanded: true,
    enterDelay: 0,
    leaveDelay: 0,
  },
  notification: {
    name: 'notification',
    mousePassthrough: false,
    expanded: true,
    enterDelay: 0,
    leaveDelay: 0,
  },
  maxExpand: {
    name: 'maxExpand',
    mousePassthrough: false,
    expanded: true,
    enterDelay: 0,
    leaveDelay: 0,
  },
  minimal: {
    name: 'minimal',
    mousePassthrough: true,
    expanded: false,
    enterDelay: 0,
    leaveDelay: 0,
  },
  lyrics: {
    name: 'lyrics',
    mousePassthrough: true,
    expanded: true,
    enterDelay: 50,
    leaveDelay: 0,
  },
  lyricsTranslation: {
    name: 'lyricsTranslation',
    mousePassthrough: true,
    expanded: true,
    enterDelay: 50,
    leaveDelay: 0,
  },
  guide: {
    name: 'guide',
    mousePassthrough: false,
    expanded: true,
    enterDelay: 0,
    leaveDelay: 0,
  },
  login: {
    name: 'login',
    mousePassthrough: false,
    expanded: true,
    enterDelay: 0,
    leaveDelay: 0,
  },
  register: {
    name: 'register',
    mousePassthrough: false,
    expanded: true,
    enterDelay: 0,
    leaveDelay: 0,
  },
  resetPassword: {
    name: 'resetPassword',
    mousePassthrough: false,
    expanded: true,
    enterDelay: 0,
    leaveDelay: 0,
  },
  setPassword: {
    name: 'setPassword',
    mousePassthrough: false,
    expanded: true,
    enterDelay: 0,
    leaveDelay: 0,
  },
  bindOAuth: {
    name: 'bindOAuth',
    mousePassthrough: false,
    expanded: true,
    enterDelay: 0,
    leaveDelay: 0,
  },
  bindEmail: {
    name: 'bindEmail',
    mousePassthrough: false,
    expanded: true,
    enterDelay: 0,
    leaveDelay: 0,
  },
  payment: {
    name: 'payment',
    mousePassthrough: false,
    expanded: true,
    enterDelay: 0,
    leaveDelay: 0,
  },
  announcement: {
    name: 'announcement',
    mousePassthrough: false,
    expanded: true,
    enterDelay: 0,
    leaveDelay: 0,
  },
  agentVoiceInput: {
    name: 'agentVoiceInput',
    mousePassthrough: true,
    expanded: true,
    enterDelay: 50,
    leaveDelay: 0,
  },
  agent: {
    name: 'agent',
    mousePassthrough: false,
    expanded: true,
    enterDelay: 0,
    leaveDelay: 0,
  },
  stt: {
    name: 'stt',
    mousePassthrough: false,
    expanded: true,
    enterDelay: 0,
    leaveDelay: 0,
  },
  cli: {
    name: 'cli',
    mousePassthrough: false,
    expanded: true,
    enterDelay: 0,
    leaveDelay: 0,
  },
};

/**
 * @description 获取状态对应的 CSS 类名。
 * @param state - 灵动岛状态标识。
 * @returns 状态对应的 CSS 类名。
 */
export function getStateClassName(state: IslandState): string {
  return state === 'idle' ? '' : state;
}
