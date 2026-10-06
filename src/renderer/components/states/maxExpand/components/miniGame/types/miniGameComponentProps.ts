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
 * @file miniGameComponentProps.ts
 * @description 小游戏展示组件输入参数，与 Hook 实现保持独立。
 * @author 鸡哥
 */

import type { TFunction } from 'i18next';
import type { MiniGameNavigationState, MiniGameGomokuState, MiniGameLeaderboardState } from './miniGameHookTypes';

/** Game2048Information 展示组件的输入参数。 */
export interface Game2048InformationProps {
  t: TFunction;
  ranking: MiniGameLeaderboardState;
}

/** GomokuInformation 展示组件的输入参数。 */
export interface GomokuInformationProps {
  t: TFunction;
  gomoku: MiniGameGomokuState;
}

/** MiniGameGamePanel 展示组件的输入参数。 */
export interface MiniGameGamePanelProps {
  t: TFunction;
  navigation: MiniGameNavigationState;
  gomoku: MiniGameGomokuState;
  ranking: MiniGameLeaderboardState;
  setLogin: () => void;
  setRegister: () => void;
}

/** MiniGameIndex 展示组件的输入参数。 */
export interface MiniGameIndexProps {
  t: TFunction;
  navigation: MiniGameNavigationState;
}

/** MiniGameLeaderboard 展示组件的输入参数。 */
export interface MiniGameLeaderboardProps {
  showRankedPanel: boolean;
  t: TFunction;
  ranking: MiniGameLeaderboardState;
  setLogin: () => void;
  setRegister: () => void;
}

/** MiniGameSidebar 展示组件的输入参数。 */
export interface MiniGameSidebarProps {
  t: TFunction;
  navigation: MiniGameNavigationState;
}
