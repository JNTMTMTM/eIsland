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
 * @file leaderboardIdentity.ts
 * @description 按当前账号区分排行榜缓存并判断游戏是否支持排名。
 * @author 鸡哥
 */

import { readLocalProfile, readLocalToken } from '../../../../../../utils/userAccount';
import { RANKED_GAME_IDS } from '../config/miniGameConfig';

/**
 * 按当前账号和游戏生成缓存键。
 * @param gameId - 游戏标识。
 * @returns 当前账号对应的排行榜缓存键。
 */
export function resolveLeaderboardCacheKey(gameId: string): string {
  const profile = readLocalProfile();
  const userKey = profile?.username?.trim()
    ? profile.username.trim()
    : (readLocalToken() ? 'token-user' : 'guest');
  return `${userKey}:${gameId}`;
}

/**
 * 判断游戏是否支持服务器排名。
 * @param gameId - 游戏标识。
 * @returns 是否展示排名面板。
 */
export function isRankedGame(gameId: string): boolean {
  return RANKED_GAME_IDS.has(gameId);
}
