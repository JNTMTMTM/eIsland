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
 * @file file.types.test.ts
 * @description file 的跨进程类型契约、合法配置与非法字段约束测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { SearchLocalFilesOptions, SearchLocalFileResult, ComputeFileHashResult, SaveTextFilePayload, SaveTextFileResult, SaveImageAsResult, ResolveShortcutResult } from '../file';
describe('file contracts', () => {
  it('fixes SearchLocalFilesOptions fields and accepts its explicit legal fixture', () => {
    expectTypeOf<SearchLocalFilesOptions>().toEqualTypeOf<{
      limit?: number;
      maxDepth?: number;
      includeDirectories?: boolean;
      includeFiles?: boolean;
      includeHidden?: boolean;
      caseSensitive?: boolean;
      matchMode?: 'contains' | 'startsWith' | 'endsWith' | 'exact';
      matchScope?: 'name' | 'path';
      extensions?: string[];
      excludeDirs?: string[];
    }>();
    const fixture: SearchLocalFilesOptions = { limit: 0, maxDepth: 0, includeDirectories: false, includeFiles: false, includeHidden: false, caseSensitive: false, matchMode: 'contains', matchScope: 'name', extensions: [], excludeDirs: [] };
    expect(fixture).toBeDefined();
    // @ts-expect-error SearchLocalFilesOptions.limit 禁止使用契约外字段值。
    const invalid: SearchLocalFilesOptions['limit'] = 'invalid';
    expect(invalid).toBeDefined();
  });
  it('fixes SearchLocalFileResult fields and accepts its explicit legal fixture', () => {
    expectTypeOf<SearchLocalFileResult>().toEqualTypeOf<{
      name: string;
      path: string;
      isDirectory: boolean;
    }>();
    const fixture: SearchLocalFileResult = { name: 'sample', path: 'sample', isDirectory: false };
    expect(fixture).toBeDefined();
    // @ts-expect-error SearchLocalFileResult.name 禁止使用契约外字段值。
    const invalid: SearchLocalFileResult['name'] = 123;
    expect(invalid).toBeDefined();
  });
  it('fixes ComputeFileHashResult fields and accepts its explicit legal fixture', () => {
    expectTypeOf<ComputeFileHashResult>().toEqualTypeOf<{
      hash: string;
      algorithm: string;
      fileName: string;
      fileSize: number;
    }>();
    const fixture: ComputeFileHashResult = { hash: 'sample', algorithm: 'sample', fileName: 'sample', fileSize: 0 };
    expect(fixture).toBeDefined();
    // @ts-expect-error ComputeFileHashResult.hash 禁止使用契约外字段值。
    const invalid: ComputeFileHashResult['hash'] = 123;
    expect(invalid).toBeDefined();
  });
  it('fixes SaveTextFilePayload fields and accepts its explicit legal fixture', () => {
    expectTypeOf<SaveTextFilePayload>().toEqualTypeOf<{
      defaultPath: string;
      content: string;
      filters?: Array<{
        name: string;
        extensions: string[];
      }>;
    }>();
    const fixture: SaveTextFilePayload = { defaultPath: 'sample', content: 'sample', filters: [] };
    expect(fixture).toBeDefined();
    // @ts-expect-error SaveTextFilePayload.defaultPath 禁止使用契约外字段值。
    const invalid: SaveTextFilePayload['defaultPath'] = 123;
    expect(invalid).toBeDefined();
  });
  it('fixes SaveTextFileResult fields and accepts its explicit legal fixture', () => {
    expectTypeOf<SaveTextFileResult>().toEqualTypeOf<{
      ok: boolean;
      canceled: boolean;
      filePath: string | null;
    }>();
    const fixture: SaveTextFileResult = { ok: false, canceled: false, filePath: null };
    expect(fixture).toBeDefined();
    // @ts-expect-error SaveTextFileResult.ok 禁止使用契约外字段值。
    const invalid: SaveTextFileResult['ok'] = 'invalid';
    expect(invalid).toBeDefined();
  });
  it('fixes SaveImageAsResult fields and accepts its explicit legal fixture', () => {
    expectTypeOf<SaveImageAsResult>().toEqualTypeOf<{
      ok: boolean;
      canceled: boolean;
      filePath: string | null;
    }>();
    const fixture: SaveImageAsResult = { ok: false, canceled: false, filePath: null };
    expect(fixture).toBeDefined();
    // @ts-expect-error SaveImageAsResult.ok 禁止使用契约外字段值。
    const invalid: SaveImageAsResult['ok'] = 'invalid';
    expect(invalid).toBeDefined();
  });
  it('fixes ResolveShortcutResult fields and accepts its explicit legal fixture', () => {
    expectTypeOf<ResolveShortcutResult>().toEqualTypeOf<{
      target: string;
      name: string;
    }>();
    const fixture: ResolveShortcutResult = { target: 'sample', name: 'sample' };
    expect(fixture).toBeDefined();
    // @ts-expect-error ResolveShortcutResult.target 禁止使用契约外字段值。
    const invalid: ResolveShortcutResult['target'] = 123;
    expect(invalid).toBeDefined();
  });
});
