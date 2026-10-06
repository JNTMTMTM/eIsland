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
 * @file registerStoreIpcHandlersOptions.types.test.ts
 * @description RegisterStoreIpcHandlersOptions.ts 的完整公开形状、合法样例、必需可选字段及非法状态契约测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { RegisterStoreIpcHandlersOptions } from "../RegisterStoreIpcHandlersOptions";

/** 固定 RegisterStoreIpcHandlersOptions 的完整公开形状，独立于源类型展开。 */
interface ExpectedRegisterStoreIpcHandlersOptions {
  storeDir: string;
}

describe("RegisterStoreIpcHandlersOptions.ts 完整类型契约", () => {
  it("RegisterStoreIpcHandlersOptions 完整字段、合法样例与非法状态", () => {
    expectTypeOf<RegisterStoreIpcHandlersOptions>().toEqualTypeOf<ExpectedRegisterStoreIpcHandlersOptions>();
    const legal: RegisterStoreIpcHandlersOptions = { storeDir: 'fixture' };
    expectTypeOf(legal).toMatchTypeOf<ExpectedRegisterStoreIpcHandlersOptions>();
    expect(legal).toBeDefined();
    expectTypeOf<Omit<ExpectedRegisterStoreIpcHandlersOptions, "storeDir">>().not.toMatchTypeOf<RegisterStoreIpcHandlersOptions>();
    // @ts-expect-error RegisterStoreIpcHandlersOptions.storeDir 拒绝契约外字段类型或状态。
    const invalid: RegisterStoreIpcHandlersOptions["storeDir"] = 123;
    expect(invalid).toBeDefined();
    expectTypeOf<null>().not.toMatchTypeOf<RegisterStoreIpcHandlersOptions>();
  });
});
