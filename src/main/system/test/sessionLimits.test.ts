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
 * @file sessionLimits.test.ts
 * @description CLI 会话数量限制测试
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { limitRecentSessions, MAX_CLI_SESSIONS } from '../sessionLimits';

describe('limitRecentSessions', () => {
  it('只保留最近活动的限定数量会话', () => {
    const sessions = Array.from({ length: MAX_CLI_SESSIONS + 5 }, (_, index) => ({
      id: `session-${index}`,
      lastEventAt: index,
    }));

    const result = limitRecentSessions(sessions);

    expect(result).toHaveLength(MAX_CLI_SESSIONS);
    expect(result[0].id).toBe(`session-${MAX_CLI_SESSIONS + 4}`);
    expect(result.at(-1)?.id).toBe('session-5');
  });

  it('不修改输入会话顺序', () => {
    const sessions = [
      { id: 'older', lastEventAt: 1 },
      { id: 'newer', lastEventAt: 2 },
    ];

    expect(limitRecentSessions(sessions).map((session) => session.id)).toEqual(['newer', 'older']);
    expect(sessions.map((session) => session.id)).toEqual(['older', 'newer']);
  });
});