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
 * @file sessionLimits.ts
 * @description CLI 会话读取与内存保留上限
 * @author 鸡哥
 */

/** 主进程最多读取并保留的单类 CLI 会话数量 */
export const MAX_CLI_SESSIONS = 40;

/**
 * 按最近活动时间截取会话，避免持久化数据无限增长
 * @param sessions - 待限制的会话集合
 * @returns 最近活动的有限会话列表
 */
export function limitRecentSessions<T extends { lastEventAt: number }>(sessions: Iterable<T>): T[] {
  return Array.from(sessions)
    .sort((a, b) => b.lastEventAt - a.lastEventAt)
    .slice(0, MAX_CLI_SESSIONS);
}