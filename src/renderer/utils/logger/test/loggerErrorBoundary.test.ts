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
 * @file loggerErrorBoundary.test.ts
 * @description 日志格式化对缺失 Error.stack 的真实回退及桥接输出测试。
 * @author 鸡哥
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../index';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('logger missing error stack', () => {
  it('preserves the message when an Error has no optional stack', () => {
    const error = new Error('message');
    error.stack = undefined;
    const write = vi.fn();
    vi.stubGlobal('window', { api: { logWrite: write } });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error(error);
    expect(consoleError).toHaveBeenCalledExactlyOnceWith(error);
    expect(write).toHaveBeenCalledExactlyOnceWith('error', `message${  String.fromCharCode(10)}`);
  });
  it('falls back to string formatting for a circular value rejected by JSON.stringify', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const write = vi.fn();
    vi.stubGlobal('window', { api: { logWrite: write } });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    logger.warn(circular);
    expect(write).toHaveBeenCalledExactlyOnceWith('warn', '[object Object]');
  });
});
