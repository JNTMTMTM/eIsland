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
 * @file index.test.ts
 * @description 下载引擎配置常量单元测试。
 * @author 鸡哥
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_THREADS,
  MAX_THREADS,
  MIN_THREADS,
  EMIT_INTERVAL_MS,
  MIN_CHUNK_BYTES,
} from '..';

describe('downloadEngine config constants', () => {
  it('DEFAULT_THREADS is 8', () => {
    expect(DEFAULT_THREADS).toBe(8);
  });

  it('MAX_THREADS is 16', () => {
    expect(MAX_THREADS).toBe(16);
  });

  it('MIN_THREADS is 1', () => {
    expect(MIN_THREADS).toBe(1);
  });

  it('EMIT_INTERVAL_MS is 160', () => {
    expect(EMIT_INTERVAL_MS).toBe(160);
  });

  it('MIN_CHUNK_BYTES is 1 MB (1048576)', () => {
    expect(MIN_CHUNK_BYTES).toBe(1048576);
  });

  it('MIN_THREADS <= DEFAULT_THREADS <= MAX_THREADS', () => {
    expect(MIN_THREADS).toBeLessThanOrEqual(DEFAULT_THREADS);
    expect(DEFAULT_THREADS).toBeLessThanOrEqual(MAX_THREADS);
  });

  it('all values are positive numbers', () => {
    const values = [
      DEFAULT_THREADS,
      MAX_THREADS,
      MIN_THREADS,
      EMIT_INTERVAL_MS,
      MIN_CHUNK_BYTES,
    ];
    values.forEach((v) => {
      expect(typeof v).toBe('number');
      expect(v).toBeGreaterThan(0);
    });
  });
});
