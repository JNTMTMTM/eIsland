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
 * @file trayMenu.test.ts
 * @description 托盘菜单共享协议的动作校验与通道唯一性测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { TRAY_MENU_ACTIONS, TRAY_MENU_CHANNELS, isTrayMenuAction } from '../trayMenu';

describe('trayMenu shared protocol', () => {
  it.each([...TRAY_MENU_ACTIONS])('accepts the declared action %s', (action) => {
    expect(isTrayMenuAction(action)).toBe(true);
  });

  it.each([undefined, null, 1, '', 'QUIT', 'quit ', 'format-disk', {}, ['quit']])('rejects %j', (value) => {
    expect(isTrayMenuAction(value)).toBe(false);
  });

  it('uses distinct namespaced IPC channels', () => {
    const channels = Object.values(TRAY_MENU_CHANNELS);
    expect(new Set(channels).size).toBe(channels.length);
    channels.forEach((channel) => expect(channel).toMatch(/^tray-menu:/));
  });
});
