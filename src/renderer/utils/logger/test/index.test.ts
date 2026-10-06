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
 * @description 渲染进程日志级别与输出测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '../index';

describe('logger', () => {
  const logWriteMock = vi.fn();

  beforeEach(() => {
    logWriteMock.mockClear();
    Object.defineProperty(globalThis, 'window', {
      value: { api: { logWrite: logWriteMock } },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logger.info calls console.log and window.api.logWrite("info", message)', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.info('hello');
    expect(spy).toHaveBeenCalledWith('hello');
    expect(logWriteMock).toHaveBeenCalledWith('info', 'hello');
  });

  it('logger.warn calls console.warn and window.api.logWrite("warn", message)', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logger.warn('watch out');
    expect(spy).toHaveBeenCalledWith('watch out');
    expect(logWriteMock).toHaveBeenCalledWith('warn', 'watch out');
  });

  it('logger.error calls console.error and window.api.logWrite("error", message)', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('something broke');
    expect(spy).toHaveBeenCalledWith('something broke');
    expect(logWriteMock).toHaveBeenCalledWith('error', 'something broke');
  });

  it('formats Error objects with message and stack', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('boom');
    logger.error(err);
    expect(spy).toHaveBeenCalledWith(err);
    expect(logWriteMock).toHaveBeenCalledOnce();
    const [, message] = logWriteMock.mock.calls[0];
    expect(message).toContain('boom');
    expect(message).toContain(err.stack!);
  });

  it('serializes non-string args as JSON', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const obj = { key: 'value', num: 42 };
    logger.info(obj);
    expect(spy).toHaveBeenCalledWith(obj);
    expect(logWriteMock).toHaveBeenCalledWith('info', JSON.stringify(obj));
  });

  it('silently catches logWrite errors when window.api is unavailable', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logWriteMock.mockImplementation(() => { throw new Error('not ready'); });
    expect(() => logger.info('test')).not.toThrow();
    expect(spy).toHaveBeenCalledWith('test');
  });
});
