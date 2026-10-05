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
 * @file formatFactory.types.test.ts
 * @description formatFactory 的跨进程类型契约、合法配置与非法字段约束测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { ExtractVideoTrackOptions, ExtractVideoTrackResult, PickVideoForExtractResult } from '../formatFactory';
describe('formatFactory contracts', () => {
  it('fixes ExtractVideoTrackOptions fields and accepts its explicit legal fixture', () => {
    expectTypeOf<ExtractVideoTrackOptions>().toEqualTypeOf<{
      filePath: string;
      trackType: string;
      outputFormat: string;
    }>();
    const fixture: ExtractVideoTrackOptions = { filePath: 'sample', trackType: 'sample', outputFormat: 'sample' };
    expect(fixture).toBeDefined();
    // @ts-expect-error ExtractVideoTrackOptions.filePath 禁止使用契约外字段值。
    const invalid: ExtractVideoTrackOptions['filePath'] = 123;
    expect(invalid).toBeDefined();
  });
  it('fixes ExtractVideoTrackResult fields and accepts its explicit legal fixture', () => {
    expectTypeOf<ExtractVideoTrackResult>().toEqualTypeOf<{
      success: boolean;
      outputPath?: string;
      error?: string;
      fileSize?: number;
    }>();
    const fixture: ExtractVideoTrackResult = { success: false, outputPath: 'sample', error: 'sample', fileSize: 0 };
    expect(fixture).toBeDefined();
    // @ts-expect-error ExtractVideoTrackResult.success 禁止使用契约外字段值。
    const invalid: ExtractVideoTrackResult['success'] = 'invalid';
    expect(invalid).toBeDefined();
  });
  it('fixes PickVideoForExtractResult fields and accepts its explicit legal fixture', () => {
    expectTypeOf<PickVideoForExtractResult>().toEqualTypeOf<{
      filePath: string;
      fileSize: number | null;
    }>();
    const fixture: PickVideoForExtractResult = { filePath: 'sample', fileSize: null };
    expect(fixture).toBeDefined();
    // @ts-expect-error PickVideoForExtractResult.filePath 禁止使用契约外字段值。
    const invalid: PickVideoForExtractResult['filePath'] = 123;
    expect(invalid).toBeDefined();
  });
});
