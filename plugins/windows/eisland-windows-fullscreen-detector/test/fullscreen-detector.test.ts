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
 * @file fullscreen-detector.test.ts
 * @description 全屏检测器单元测试
 * @description 使用 Vitest 对全屏检测原生模块进行全面的功能测试
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';

const detector = require('../') as {
  getForegroundFullscreenWindow: () => {
    title: string;
    processId: number;
    isForeground: boolean;
    bounds: {
      left: number;
      top: number;
      right: number;
      bottom: number;
      width: number;
      height: number;
    };
    monitor: {
      left: number;
      top: number;
      right: number;
      bottom: number;
      width: number;
      height: number;
      isPrimary: boolean;
    };
  } | null;
  getFullscreenWindows: () => Array<{
    hwnd: string;
    title: string;
    processId: number;
    isForeground: boolean;
    bounds: {
      left: number;
      top: number;
      right: number;
      bottom: number;
      width: number;
      height: number;
    };
    monitor: {
      left: number;
      top: number;
      right: number;
      bottom: number;
      width: number;
      height: number;
      isPrimary: boolean;
    };
  }>;
  isAnyFullscreenWindow: () => boolean;
};

describe('windows-fullscreen-detector', () => {
  it('exports detector methods and result shape', () => {
    expect(typeof detector.getForegroundFullscreenWindow).toBe('function');
    expect(typeof detector.getFullscreenWindows).toBe('function');
    expect(typeof detector.isAnyFullscreenWindow).toBe('function');

    const foreground = detector.getForegroundFullscreenWindow();
    const list = detector.getFullscreenWindows();

    expect(foreground === null || typeof foreground === 'object').toBe(true);
    expect(Array.isArray(list)).toBe(true);
    expect(detector.isAnyFullscreenWindow()).toBeTypeOf('boolean');

    for (const item of list) {
      expect(item.hwnd).toBeTypeOf('string');
      expect(item.title).toBeTypeOf('string');
      expect(item.processId).toBeTypeOf('number');
      expect(item.isForeground).toBeTypeOf('boolean');
      expect(item.bounds.left).toBeTypeOf('number');
      expect(item.bounds.top).toBeTypeOf('number');
      expect(item.bounds.right).toBeTypeOf('number');
      expect(item.bounds.bottom).toBeTypeOf('number');
      expect(item.bounds.width).toBeTypeOf('number');
      expect(item.bounds.height).toBeTypeOf('number');
      expect(item.monitor.isPrimary).toBeTypeOf('boolean');
    }
  });
});