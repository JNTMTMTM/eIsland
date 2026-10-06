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
 * @file imageCompression.types.test.ts
 * @description imageCompression 的跨进程类型契约、合法配置与非法字段约束测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { ImageCompressionTask, ImageCompressionStartPayload, ImageCompressionStartResult } from '../imageCompression';
describe('imageCompression contracts', () => {
  it('fixes ImageCompressionTask fields and accepts its explicit legal fixture', () => {
    expectTypeOf<ImageCompressionTask>().toEqualTypeOf<{
      id: string;
      fileName: string;
      inputPath: string;
      outputPath: string;
      quality: number;
      status: 'completed' | 'failed';
      success: boolean;
      originalBytes: number;
      compressedBytes: number;
      ratio: number;
      error?: string;
      createdAt: number;
      updatedAt: number;
    }>();
    const fixture: ImageCompressionTask = { id: 'sample', fileName: 'sample', inputPath: 'sample', outputPath: 'sample', quality: 0, status: 'completed', success: false, originalBytes: 0, compressedBytes: 0, ratio: 0, error: 'sample', createdAt: 0, updatedAt: 0 };
    expect(fixture).toBeDefined();
    // @ts-expect-error ImageCompressionTask.id 禁止使用契约外字段值。
    const invalid: ImageCompressionTask['id'] = 123;
    expect(invalid).toBeDefined();
  });
  it('fixes ImageCompressionStartPayload fields and accepts its explicit legal fixture', () => {
    expectTypeOf<ImageCompressionStartPayload>().toEqualTypeOf<{
      inputPaths: string[];
      outputDir?: string;
      quality?: number;
    }>();
    const fixture: ImageCompressionStartPayload = { inputPaths: [], outputDir: 'sample', quality: 0 };
    expect(fixture).toBeDefined();
    // @ts-expect-error ImageCompressionStartPayload.outputDir 禁止使用契约外字段值。
    const invalid: ImageCompressionStartPayload['outputDir'] = 123;
    expect(invalid).toBeDefined();
  });
  it('fixes ImageCompressionStartResult fields and accepts its explicit legal fixture', () => {
    expectTypeOf<ImageCompressionStartResult>().toEqualTypeOf<{
      ok: boolean;
      results?: ImageCompressionTask[];
      message?: string;
    }>();
    const fixture: ImageCompressionStartResult = { ok: false, results: [], message: 'sample' };
    expect(fixture).toBeDefined();
    // @ts-expect-error ImageCompressionStartResult.ok 禁止使用契约外字段值。
    const invalid: ImageCompressionStartResult['ok'] = 'invalid';
    expect(invalid).toBeDefined();
  });
});
