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
 * @file settings.types.test.ts
 * @description settings 的跨进程类型契约、合法配置与非法字段约束测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { SetWallpaperPayload } from '../settings';
describe('settings contracts', () => {
  it('fixes SetWallpaperPayload fields and accepts its explicit legal fixture', () => {
    expectTypeOf<SetWallpaperPayload>().toEqualTypeOf<{
      sourcePath?: string | null;
      previewUrl?: string | null;
      clear?: boolean;
    }>();
    const fixture: SetWallpaperPayload = { sourcePath: null, previewUrl: null, clear: false };
    expect(fixture).toBeDefined();
    // @ts-expect-error SetWallpaperPayload.sourcePath 禁止使用契约外字段值。
    const invalid: SetWallpaperPayload['sourcePath'] = 123;
    expect(invalid).toBeDefined();
  });
});
