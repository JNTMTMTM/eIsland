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
 * @file useSessionPagination.ts
 * @description CLI 会话列表分页 Hook
 * @author 鸡哥
 */

import { useEffect, useState } from 'react';
import type { CliProvider } from '../../../../../../store/types';
import { SESSIONS_PER_PAGE } from '../config/cliConstants';
import type { CliSessionSnapshot } from '../types/types';

/**
 * 截取指定页的会话
 * @param sessions - 完整会话列表
 * @param page - 从零开始的页码
 * @returns 当前页会话、有效页码和总页数
 */
export function paginateSessions<T>(sessions: T[], page: number) {
  const totalPages = Math.max(1, Math.ceil(sessions.length / SESSIONS_PER_PAGE));
  const currentPage = Math.max(0, Math.min(page, totalPages - 1));
  const pagedSessions = sessions.slice(
    currentPage * SESSIONS_PER_PAGE,
    currentPage * SESSIONS_PER_PAGE + SESSIONS_PER_PAGE,
  );

  return { totalPages, currentPage, pagedSessions };
}

/**
 * 管理当前 CLI 来源的会话列表分页
 * @param sessions - 当前来源按最近活动时间排序的会话
 * @param provider - 当前 CLI 来源
 * @returns 当前页会话和分页状态
 */
export function useSessionPagination(sessions: CliSessionSnapshot[], provider: CliProvider) {
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [provider]);

  const { totalPages, currentPage, pagedSessions } = paginateSessions(sessions, page);

  return { setPage, totalPages, currentPage, pagedSessions };
}