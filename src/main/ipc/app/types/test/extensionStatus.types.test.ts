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
 * @file extensionStatus.types.test.ts
 * @description ExtensionStatus.ts 的完整公开形状、合法样例、必需可选字段及非法状态契约测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { ExtensionStatus, ExtensionProgressData } from "../ExtensionStatus";

/** 固定 ExtensionStatus 的完整公开形状，独立于源类型展开。 */
interface ExpectedExtensionStatus {
  id: string;
  name: string;
  description: string;
  availableVersion: string;
  installedVersion: string | null;
  isInstalled: boolean;
  requiredRestart: boolean;
}

/** 固定 ExtensionProgressData 的完整公开形状，独立于源类型展开。 */
interface ExpectedExtensionProgressData {
  id: string;
  progress: number;
  transferred: number;
  total: number;
}

describe("ExtensionStatus.ts 完整类型契约", () => {
  it("ExtensionStatus 完整字段、合法样例与非法状态", () => {
    expectTypeOf<ExtensionStatus>().toEqualTypeOf<ExpectedExtensionStatus>();
    const legal: ExtensionStatus = { id: 'fixture', name: 'fixture', description: 'fixture', availableVersion: 'fixture', installedVersion: null, isInstalled: false, requiredRestart: false };
    expectTypeOf(legal).toMatchTypeOf<ExpectedExtensionStatus>();
    expect(legal).toBeDefined();
    expectTypeOf<Omit<ExpectedExtensionStatus, "id">>().not.toMatchTypeOf<ExtensionStatus>();
    expectTypeOf<null>().toMatchTypeOf<ExtensionStatus["installedVersion"]>();
    // @ts-expect-error ExtensionStatus.id 拒绝契约外字段类型或状态。
    const invalid: ExtensionStatus["id"] = 123;
    expect(invalid).toBeDefined();
    expectTypeOf<null>().not.toMatchTypeOf<ExtensionStatus>();
  });
  it("ExtensionProgressData 完整字段、合法样例与非法状态", () => {
    expectTypeOf<ExtensionProgressData>().toEqualTypeOf<ExpectedExtensionProgressData>();
    const legal: ExtensionProgressData = { id: 'fixture', progress: 1, transferred: 1, total: 1 };
    expectTypeOf(legal).toMatchTypeOf<ExpectedExtensionProgressData>();
    expect(legal).toBeDefined();
    expectTypeOf<Omit<ExpectedExtensionProgressData, "id">>().not.toMatchTypeOf<ExtensionProgressData>();
    // @ts-expect-error ExtensionProgressData.id 拒绝契约外字段类型或状态。
    const invalid: ExtensionProgressData["id"] = 123;
    expect(invalid).toBeDefined();
    expectTypeOf<null>().not.toMatchTypeOf<ExtensionProgressData>();
  });
});
