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
 * @file miniGameConfig.ts
 * @description 小游戏导航及持久化键常量。
 * @author 鸡哥
 */

import type { GameEntry, MiniGameNavCard, MiniGameIndexCardId } from '../types';

export const GAME_LIST: GameEntry[] = [
  { id: '2048', labelKey: 'miniGameTab.games.2048', available: true },
  { id: 'gomoku', labelKey: 'miniGameTab.games.gomoku', available: true },
];

export const MINI_GAME_NAV_ORDER_STORE_KEY = 'mini-game-nav-order';
export const MINI_GAME_HIDDEN_NAV_ORDER_STORE_KEY = 'mini-game-hidden-nav-order';
export const MINI_GAME_GOMOKU_STATE_STORE_KEY = 'mini-game-gomoku-state';
export const MINI_GAME_GOMOKU_SETTINGS_STORE_KEY = 'mini-game-gomoku-settings';
export const MINI_GAME_NAV_CARDS: MiniGameNavCard[] = [
  {
    id: 'game-2048',
    labelKey: 'miniGameTab.nav.game-2048.label',
    descKey: 'miniGameTab.nav.game-2048.desc',
    gameId: '2048',
  },
  {
    id: 'game-gomoku',
    labelKey: 'miniGameTab.nav.game-gomoku.label',
    descKey: 'miniGameTab.nav.game-gomoku.desc',
    gameId: 'gomoku',
  },
];
export const DEFAULT_MINI_GAME_NAV_ORDER: MiniGameIndexCardId[] = MINI_GAME_NAV_CARDS.map((card) => card.id);
export const MINI_GAME_NAV_CARD_MAP = new Map(MINI_GAME_NAV_CARDS.map((card) => [card.id, card]));
export const RANKED_GAME_IDS = new Set<string>(['2048']);

