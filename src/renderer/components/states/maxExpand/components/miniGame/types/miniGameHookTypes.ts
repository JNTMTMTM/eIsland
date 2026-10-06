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
 * @file miniGameHookTypes.ts
 * @description 小游戏导航、五子棋和 2048 排行榜 Hook 的独立状态接口。
 * @author 鸡哥
 */

import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { MiniGameScoreData, MiniGameLeaderboardEntry } from '../../../../../../api/miniGame/miniGameScoreApi';
import type { Game2048EndPayload, Game2048Handle, Game2048Session, Game2048State } from '../../games/Game2048';
import type { GomokuAIDifficulty, GameGomokuHandle, GameGomokuState } from '../../games/GameGomoku';
import type { MiniGameIndexCardId, MiniGameNavCard, GomokuMatchMode } from './miniGameTypes';

/** 带当前语言标题和描述的游戏搜索结果。 */
export interface MiniGameSearchResult extends MiniGameNavCard {
  localizedLabel: string;
  localizedDesc: string;
}

/** 页面导航展示数据、持久化与编辑事件的输入输出契约。 */
export interface MiniGameNavigationState {
  selectedGame: string;
  setSelectedGame: Dispatch<SetStateAction<string>>;
  activeSidebar: string;
  setActiveSidebar: Dispatch<SetStateAction<string>>;
  navOrder: MiniGameIndexCardId[];
  setNavOrder: Dispatch<SetStateAction<MiniGameIndexCardId[]>>;
  hiddenNavOrder: MiniGameIndexCardId[];
  setHiddenNavOrder: Dispatch<SetStateAction<MiniGameIndexCardId[]>>;
  navEditMode: boolean;
  setNavEditMode: Dispatch<SetStateAction<boolean>>;
  dragOverIdx: number | null;
  setDragOverIdx: Dispatch<SetStateAction<number | null>>;
  dragIdxRef: RefObject<number | null>;
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  visibleCards: MiniGameNavCard[];
  hiddenCards: MiniGameNavCard[];
  searchResults: MiniGameSearchResult[] | null;
  persistMiniGameNavConfig: (visibleOrder: MiniGameIndexCardId[], hiddenOrder: MiniGameIndexCardId[]) => void;
  resetMiniGameNavConfig: () => void;
  navigateByCard: (cardId: MiniGameIndexCardId) => void;
}

/** 五子棋展示快照、对战设置和游戏控制句柄。 */
export interface MiniGameGomokuState {
  gomokuRef: RefObject<GameGomokuHandle | null>;
  gomokuState: GameGomokuState;
  gomokuMode: GomokuMatchMode;
  setGomokuMode: Dispatch<SetStateAction<GomokuMatchMode>>;
  gomokuDifficulty: GomokuAIDifficulty;
  setGomokuDifficulty: Dispatch<SetStateAction<GomokuAIDifficulty>>;
  gomokuHighlightPulse: number;
  handleGomokuStateChange: (state: GameGomokuState) => void;
  handleStartGomoku: () => void;
  handleHighlightLastGomokuMove: () => void;
  gomokuDraw: boolean;
  gomokuSettingsLocked: boolean;
}

/** 2048 对局控制、账号排行数据和原有异步操作入口。 */
export interface MiniGameLeaderboardState {
  loggedIn: boolean;
  myScore: MiniGameScoreData | null;
  leaderboard: MiniGameLeaderboardEntry[];
  loading: boolean;
  error: string | null;
  gameState: Game2048State;
  activeSession: Game2048Session | null;
  gameRef: RefObject<Game2048Handle | null>;
  myRank: number | null;
  resolveEntryName: (entry: MiniGameLeaderboardEntry) => string;
  resolveEntryAvatar: (entry: MiniGameLeaderboardEntry) => string | null;
  handleRefresh: () => void;
  handleGameEnd: (payload: Game2048EndPayload) => void;
  handleStartNewGame: () => void;
  handleGameState: (state: Game2048State) => void;
}
