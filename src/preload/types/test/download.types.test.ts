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
 * @file download.types.test.ts
 * @description download 的跨进程类型契约、合法配置与非法字段约束测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { DownloadTask, DownloadStartPayload, DownloadStartResult } from '../download';
describe('download contracts', () => {
  it('fixes DownloadTask fields and accepts its explicit legal fixture', () => {
    expectTypeOf<DownloadTask>().toEqualTypeOf<{
      id: string;
      url: string;
      savePath: string;
      fileName: string;
      totalBytes: number;
      downloadedBytes: number;
      progress: number;
      speedBytesPerSecond: number;
      estimatedFinishAt: number | null;
      threads: number;
      status: 'downloading' | 'paused' | 'completed' | 'failed' | 'canceled';
      errorMessage?: string;
      createdAt: number;
      updatedAt: number;
    }>();
    const fixture: DownloadTask = { id: 'sample', url: 'sample', savePath: 'sample', fileName: 'sample', totalBytes: 0, downloadedBytes: 0, progress: 0, speedBytesPerSecond: 0, estimatedFinishAt: null, threads: 0, status: 'downloading', errorMessage: 'sample', createdAt: 0, updatedAt: 0 };
    expect(fixture).toBeDefined();
    // @ts-expect-error DownloadTask.id 禁止使用契约外字段值。
    const invalid: DownloadTask['id'] = 123;
    expect(invalid).toBeDefined();
  });
  it('fixes DownloadStartPayload fields and accepts its explicit legal fixture', () => {
    expectTypeOf<DownloadStartPayload>().toEqualTypeOf<{
      url: string;
      savePath?: string;
      threads?: number;
    }>();
    const fixture: DownloadStartPayload = { url: 'sample', savePath: 'sample', threads: 0 };
    expect(fixture).toBeDefined();
    // @ts-expect-error DownloadStartPayload.url 禁止使用契约外字段值。
    const invalid: DownloadStartPayload['url'] = 123;
    expect(invalid).toBeDefined();
  });
  it('fixes DownloadStartResult fields and accepts its explicit legal fixture', () => {
    expectTypeOf<DownloadStartResult>().toEqualTypeOf<{
      ok: boolean;
      task?: DownloadTask;
      message?: string;
    }>();
    const fixture: DownloadStartResult = { ok: false, task: { id: 'sample', url: 'sample', savePath: 'sample', fileName: 'sample', totalBytes: 0, downloadedBytes: 0, progress: 0, speedBytesPerSecond: 0, estimatedFinishAt: null, threads: 0, status: 'downloading', errorMessage: 'sample', createdAt: 0, updatedAt: 0 }, message: 'sample' };
    expect(fixture).toBeDefined();
    // @ts-expect-error DownloadStartResult.ok 禁止使用契约外字段值。
    const invalid: DownloadStartResult['ok'] = 'invalid';
    expect(invalid).toBeDefined();
  });
});
