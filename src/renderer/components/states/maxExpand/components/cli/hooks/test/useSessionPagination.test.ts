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
 * @file useSessionPagination.test.ts
 * @description CLI 会话分页计算测试
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { SESSIONS_PER_PAGE } from '../../config/cliConstants';
import { paginateSessions } from '../useSessionPagination';

describe('paginateSessions', () => {
  const sessions = Array.from({ length: SESSIONS_PER_PAGE + 2 }, (_, id) => ({ id }));

  it('按固定数量返回指定页会话', () => {
    const result = paginateSessions(sessions, 1);

    expect(result.totalPages).toBe(2);
    expect(result.currentPage).toBe(1);
    expect(result.pagedSessions.map((session) => session.id)).toEqual([SESSIONS_PER_PAGE, SESSIONS_PER_PAGE + 1]);
  });

  it('会话减少后将页码约束到有效范围', () => {
    const result = paginateSessions(sessions.slice(0, 1), 3);

    expect(result.totalPages).toBe(1);
    expect(result.currentPage).toBe(0);
    expect(result.pagedSessions).toEqual([{ id: 0 }]);
  });
});