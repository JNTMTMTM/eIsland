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
 * @file smtc-helper.next.test.ts
 * @description SMTC next 命令单元测试
 * @author 鸡哥
 */

import { describe, it, expect } from 'vitest';
import type { CommandResult } from '../index';

const smtc = require('../') as { next(): CommandResult };

describe('next', () => {
  it('is exported as a function', () => {
    expect(typeof smtc.next).toBe('function');
  });

  it('returns a CommandResult object', () => {
    const result = smtc.next();
    expect(typeof result).toBe('object');
    expect(typeof result.success).toBe('boolean');
  });

  it('returns error string on failure', () => {
    const result = smtc.next();
    if (!result.success) {
      expect(typeof result.error).toBe('string');
    } else {
      expect(result.error).toBeNull();
    }
  });

  it('never throws', () => {
    expect(() => smtc.next()).not.toThrow();
  });
});
