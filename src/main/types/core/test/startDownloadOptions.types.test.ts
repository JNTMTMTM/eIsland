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
 * @file startDownloadOptions.types.test.ts
 * @description StartDownloadOptions.ts 的完整公开形状、合法样例、必需可选字段及非法状态契约测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { StartDownloadOptions } from "../StartDownloadOptions";

/** 固定 StartDownloadOptions 的完整公开形状，独立于源类型展开。 */
interface ExpectedStartDownloadOptions {
  url: string;
  savePath?: string;
  threads?: number;
  defaultDir: string;
}

describe("StartDownloadOptions.ts 完整类型契约", () => {
  it("StartDownloadOptions 完整字段、合法样例与非法状态", () => {
    expectTypeOf<StartDownloadOptions>().toEqualTypeOf<ExpectedStartDownloadOptions>();
    const legal: StartDownloadOptions = { url: 'fixture', savePath: 'fixture', threads: 1, defaultDir: 'fixture' };
    expectTypeOf(legal).toMatchTypeOf<ExpectedStartDownloadOptions>();
    expect(legal).toBeDefined();
    const minimal: StartDownloadOptions = { url: 'fixture', defaultDir: 'fixture' };
    expectTypeOf(minimal).toMatchTypeOf<ExpectedStartDownloadOptions>();
    expect(minimal).toBeDefined();
    expectTypeOf<Omit<ExpectedStartDownloadOptions, "url">>().not.toMatchTypeOf<StartDownloadOptions>();
    // @ts-expect-error StartDownloadOptions.url 拒绝契约外字段类型或状态。
    const invalid: StartDownloadOptions["url"] = 123;
    expect(invalid).toBeDefined();
    expectTypeOf<null>().not.toMatchTypeOf<StartDownloadOptions>();
  });
});
