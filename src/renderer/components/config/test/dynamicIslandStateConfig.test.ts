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
 * @file dynamicIslandStateConfig.test.ts
 * @description 灵动岛状态样式与交互配置契约测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { getStateClassName, STATE_CONFIGS } from '../dynamicIslandStateConfig';

describe('island state presentation', () => {
  it('omits the idle class and preserves each active state class', () => {
    expect(getStateClassName('idle')).toBe('');
    expect(getStateClassName('hover')).toBe('hover');
    expect(getStateClassName('maxExpand')).toBe('maxExpand');
    expect(getStateClassName('lyricsTranslation')).toBe('lyricsTranslation');
  });
  it('uses passthrough for idle/minimal and the configured delayed lyric and hover transitions', () => {
    expect(STATE_CONFIGS.idle).toEqual({ name: 'idle', mousePassthrough: true, expanded: false, enterDelay: 0, leaveDelay: 0 });
    expect(STATE_CONFIGS.hover).toEqual({ name: 'hover', mousePassthrough: false, expanded: true, enterDelay: 60, leaveDelay: 80 });
    expect(STATE_CONFIGS.lyrics.enterDelay).toBe(50);
    expect(STATE_CONFIGS.lyricsTranslation.enterDelay).toBe(50);
    expect(STATE_CONFIGS.maxExpand.expanded).toBe(true);
    expect(STATE_CONFIGS.maxExpand.mousePassthrough).toBe(false);
  });
});
