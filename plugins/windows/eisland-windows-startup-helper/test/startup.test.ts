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
 * @file startup.test.ts
 * @description 启动项、计划任务、服务查询在真实系统上的返回结构测试。
 * @author 鸡哥
 */

import { describe, it, expect } from 'vitest';
import type * as StartupApi from '../index';

const isWin = process.platform === 'win32';
const describeWin = isWin ? describe : describe.skip;

// 非 Windows CI 上加载会失败，按条件 require
let api: typeof StartupApi;
try {
  api = require('../');
} catch {
  api = {} as typeof StartupApi;
}

describeWin('@eisland/windows-startup-helper', () => {
  it('exports all expected functions', () => {
    expect(typeof api.getStartupItems).toBe('function');
    expect(typeof api.getScheduledTasks).toBe('function');
    expect(typeof api.getServices).toBe('function');
  });

  it('getStartupItems items have expected shape', () => {
    const items = api.getStartupItems();
    expect(Array.isArray(items)).toBe(true);
    for (const item of items) {
      expect(typeof item.name).toBe('string');
      expect(['registry', 'startupFolder']).toContain(item.location);
      expect(['user', 'machine']).toContain(item.scope);
      expect(typeof item.enabled).toBe('boolean');
    }
  });

  it('getScheduledTasks items have expected shape', () => {
    const items = api.getScheduledTasks();
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
    for (const task of items) {
      expect(typeof task.name).toBe('string');
      expect(task.path.startsWith('\\')).toBe(true);
      expect(typeof task.enabled).toBe('boolean');
      expect(Array.isArray(task.actions)).toBe(true);
    }
  });

  it('getServices items have expected shape', () => {
    const items = api.getServices();
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
    for (const svc of items) {
      expect(svc.name === null || typeof svc.name === 'string').toBe(true);
      expect(svc.processId === null || typeof svc.processId === 'number').toBe(true);
    }
  });
});
