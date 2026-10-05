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
 * @file player-icon.test.ts
 * @description unit test
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { PlayerIcon } from '../player-icon';
import { PLAYER_ICON_MAP } from '../../../components/components/DynamicIslandGuidePages/smtc-test/utils/smtcUtils';

describe('PlayerIcon', () => {
  it('should contain expected keys', () => {
    expect(PlayerIcon).toHaveProperty('SODAMUSIC');
    expect(PlayerIcon).toHaveProperty('QQMUSIC');
    expect(PlayerIcon).toHaveProperty('NETEASE');
    expect(PlayerIcon).toHaveProperty('KUGOU');
    expect(PlayerIcon).toHaveProperty('APPLE_MUSIC');
    expect(PlayerIcon).toHaveProperty('SPOTIFY');
  });

  it('all values should be strings starting with ../svg/player/ and ending with .svg', () => {
    Object.entries(PlayerIcon).forEach(([, value]) => {
      expect(typeof value).toBe('string');
      expect(value).toMatch(/^\.\.\/svg\/player\/.+\.svg$/);
    });
  });

  it('should contain exactly 6 keys', () => {
    expect(Object.keys(PlayerIcon)).toHaveLength(6);
  });

  it('PLAYER_ICON_MAP should only reference valid PlayerIcon keys', () => {
    const playerIconKeys = new Set(Object.keys(PlayerIcon));
    Object.values(PLAYER_ICON_MAP).forEach((iconKey) => {
      expect(playerIconKeys.has(iconKey)).toBe(true);
    });
  });
});
