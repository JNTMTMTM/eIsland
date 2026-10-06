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
 * @file runningWindowInfo.types.test.ts
 * @description RunningWindowInfo.ts 的完整公开形状、合法样例、必需可选字段及非法状态契约测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { RunningWindowInfo } from "../RunningWindowInfo";

/** 固定 RunningWindowInfo 的完整公开形状，独立于源类型展开。 */
interface ExpectedRunningWindowInfo {
  id: string;
  title: string;
  processName: string;
  processPath: string | null;
  processId: number | null;
  iconDataUrl: string | null;
}

describe("RunningWindowInfo.ts 完整类型契约", () => {
  it("RunningWindowInfo 完整字段、合法样例与非法状态", () => {
    expectTypeOf<RunningWindowInfo>().toEqualTypeOf<ExpectedRunningWindowInfo>();
    const legal: RunningWindowInfo = { id: 'fixture', title: 'fixture', processName: 'fixture', processPath: null, processId: null, iconDataUrl: null };
    expectTypeOf(legal).toMatchTypeOf<ExpectedRunningWindowInfo>();
    expect(legal).toBeDefined();
    expectTypeOf<Omit<ExpectedRunningWindowInfo, "id">>().not.toMatchTypeOf<RunningWindowInfo>();
    expectTypeOf<null>().toMatchTypeOf<RunningWindowInfo["processPath"]>();
    expectTypeOf<null>().toMatchTypeOf<RunningWindowInfo["processId"]>();
    expectTypeOf<null>().toMatchTypeOf<RunningWindowInfo["iconDataUrl"]>();
    // @ts-expect-error RunningWindowInfo.id 拒绝契约外字段类型或状态。
    const invalid: RunningWindowInfo["id"] = 123;
    expect(invalid).toBeDefined();
    expectTypeOf<null>().not.toMatchTypeOf<RunningWindowInfo>();
  });
});
