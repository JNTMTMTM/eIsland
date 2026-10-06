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
 * @file miniGameTypes.ts
 * @description 小游戏目录、导航卡片、五子棋设置和排行榜缓存类型。
 * @author 鸡哥
 */

import type { MiniGameScoreData, MiniGameLeaderboardEntry } from '../../../../../../api/miniGame/miniGameScoreApi';
import type { GomokuAIDifficulty } from '../../games/GameGomoku';

/** 游戏选择项及其可用状态。 */
export interface GameEntry {
  id: string;
  labelKey: string;
  available: boolean;
}

/** 首页导航卡片标识。 */
export type MiniGameIndexCardId = 'game-2048' | 'game-gomoku';

/** 五子棋人机或双人对战模式。 */
export type GomokuMatchMode = 'pve' | 'pvp';

/** 首页游戏卡片的导航与翻译信息。 */
export interface MiniGameNavCard {
  id: MiniGameIndexCardId;
  labelKey: string;
  descKey: string;
  gameId: string;
}

/** 持久化的五子棋模式与难度设置。 */
export interface GomokuSettingsStoredState {
  mode?: GomokuMatchMode;
  difficulty?: GomokuAIDifficulty;
}

/** 单个账号与游戏对应的排行榜缓存快照。 */
export interface RuntimeLeaderboardSnapshot {
  myScore: MiniGameScoreData | null;
  leaderboard: MiniGameLeaderboardEntry[];
}
