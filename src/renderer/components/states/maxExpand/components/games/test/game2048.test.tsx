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
 * @file game2048.test.tsx
 * @description 验证 2048 稳定门面导出真实游戏组件。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { Game2048 } from '../Game2048';
import { Game2048 as Implementation } from '../2048/components/Game2048';

describe('2048 facade', () => {
  it('门面保留真实模块组件引用', () => {
    expect(Game2048).toBe(Implementation);
  });
});
