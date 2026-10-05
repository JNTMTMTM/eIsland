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
 * @file downloadTaskSnapshot.types.test.ts
 * @description DownloadTaskSnapshot.ts 的完整公开形状、合法样例、必需可选字段及非法状态契约测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { DownloadTaskStatus, DownloadTaskSnapshot } from "../DownloadTaskSnapshot";

/** 固定 DownloadTaskStatus 的完整公开形状，独立于源类型展开。 */
type ExpectedDownloadTaskStatus = 'downloading' | 'paused' | 'completed' | 'failed' | 'canceled';

/** 固定 DownloadTaskSnapshot 的完整公开形状，独立于源类型展开。 */
interface ExpectedDownloadTaskSnapshot {
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
  status: ExpectedDownloadTaskStatus;
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
}

describe("DownloadTaskSnapshot.ts 完整类型契约", () => {
  it("DownloadTaskStatus 完整字段、合法样例与非法状态", () => {
    expectTypeOf<DownloadTaskStatus>().toEqualTypeOf<ExpectedDownloadTaskStatus>();
    const legal: DownloadTaskStatus = 'downloading';
    expectTypeOf(legal).toMatchTypeOf<ExpectedDownloadTaskStatus>();
    expect(legal).toBeDefined();
    // @ts-expect-error DownloadTaskStatus 拒绝联合以外值或错误的公开结构。
    const invalid: DownloadTaskStatus = 'invalid';
    expect(invalid).toBeDefined();
  });
  it("DownloadTaskSnapshot 完整字段、合法样例与非法状态", () => {
    expectTypeOf<DownloadTaskSnapshot>().toEqualTypeOf<ExpectedDownloadTaskSnapshot>();
    const legal: DownloadTaskSnapshot = { id: 'fixture', url: 'fixture', savePath: 'fixture', fileName: 'fixture', totalBytes: 1, downloadedBytes: 1, progress: 1, speedBytesPerSecond: 1, estimatedFinishAt: null, threads: 1, status: 'downloading', errorMessage: 'fixture', createdAt: 1, updatedAt: 1 };
    expectTypeOf(legal).toMatchTypeOf<ExpectedDownloadTaskSnapshot>();
    expect(legal).toBeDefined();
    const minimal: DownloadTaskSnapshot = { id: 'fixture', url: 'fixture', savePath: 'fixture', fileName: 'fixture', totalBytes: 1, downloadedBytes: 1, progress: 1, speedBytesPerSecond: 1, estimatedFinishAt: null, threads: 1, status: 'downloading', createdAt: 1, updatedAt: 1 };
    expectTypeOf(minimal).toMatchTypeOf<ExpectedDownloadTaskSnapshot>();
    expect(minimal).toBeDefined();
    expectTypeOf<Omit<ExpectedDownloadTaskSnapshot, "id">>().not.toMatchTypeOf<DownloadTaskSnapshot>();
    expectTypeOf<null>().toMatchTypeOf<DownloadTaskSnapshot["estimatedFinishAt"]>();
    // @ts-expect-error DownloadTaskSnapshot.status 拒绝契约外字段类型或状态。
    const invalid: DownloadTaskSnapshot["status"] = 'invalid';
    expect(invalid).toBeDefined();
    expectTypeOf<null>().not.toMatchTypeOf<DownloadTaskSnapshot>();
  });
});
