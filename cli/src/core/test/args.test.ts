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
 * @file args.test.ts
 * @description 验证 CLI 参数解析与 `--` 透传
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';

import parseCliArgs from '../args';

describe('parseCliArgs', () => {
  it('解析分段与全局选项', () => {
    expect(parseCliArgs(['plugin', 'build', 'smtc', '-y', '--lang', 'ja-JP'])).toEqual({
      positionals: ['plugin', 'build', 'smtc'],
      passthrough: [],
      yes: true,
      lang: 'ja-JP',
      help: false,
      version: false,
    });
  });

  it('-- 之后的参数原样透传，包括同名选项', () => {
    const args = parseCliArgs(['run', 'test:main', '--', '--watch', '-y', 'name with space']);
    expect(args.positionals).toEqual(['run', 'test:main']);
    expect(args.passthrough).toEqual(['--watch', '-y', 'name with space']);
    expect(args.yes).toBe(false);
  });

  it('未知选项抛出错误', () => {
    expect(() => parseCliArgs(['test', '--watch'])).toThrow(TypeError);
  });
});
