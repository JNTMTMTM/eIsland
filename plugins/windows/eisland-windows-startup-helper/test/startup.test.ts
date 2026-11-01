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

import fs from 'node:fs';
import { describe, it, expect, vi, afterEach } from 'vitest';
import * as api from '../index';

const isWin = process.platform === 'win32';
const describeWin = isWin ? describe : describe.skip;

describeWin('@eisland/windows-startup-helper', () => {
  afterEach(() => {
    api.__resetHelperCache();
  });

  it('exports all expected functions', () => {
    expect(typeof api.getStartupItems).toBe('function');
    expect(typeof api.getScheduledTasks).toBe('function');
    expect(typeof api.getServices).toBe('function');
  });

  it('rejects with StartupHelperError when the helper is missing', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    api.__resetHelperCache();
    await expect(api.getStartupItems()).rejects.toBeInstanceOf(api.StartupHelperError);
  });

  it('getStartupItems items have expected shape', async () => {
    const { items, errors } = await api.getStartupItems();
    expect(Array.isArray(items)).toBe(true);
    expect(Array.isArray(errors)).toBe(true);
    items.forEach((item) => {
      expect(typeof item.name).toBe('string');
      expect(['registry', 'startupFolder']).toContain(item.location);
      expect(['user', 'machine']).toContain(item.scope);
      expect(typeof item.enabled).toBe('boolean');
    });
  });

  it('getScheduledTasks items have expected shape', async () => {
    const { items } = await api.getScheduledTasks();
    expect(items.length).toBeGreaterThan(0);
    items.forEach((task) => {
      expect(typeof task.name).toBe('string');
      expect(task.path.startsWith('\\')).toBe(true);
      expect(typeof task.enabled).toBe('boolean');
      expect(Array.isArray(task.actions)).toBe(true);
      [task.lastRunTime, task.nextRunTime].forEach((time) => {
        expect(time === null || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(time)).toBe(true);
      });
    });
  });

  it('getServices items have expected shape', async () => {
    const { items, errors } = await api.getServices();
    expect(items.length).toBeGreaterThan(0);
    items.forEach((svc) => {
      expect(svc.name === null || typeof svc.name === 'string').toBe(true);
      expect(svc.processId === null || typeof svc.processId === 'number').toBe(true);
    });
    errors.forEach((error) => {
      expect(error.source.startsWith('service:')).toBe(true);
      expect(typeof error.message).toBe('string');
    });
  });
});
