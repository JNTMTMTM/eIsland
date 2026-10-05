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
 * @file updateSourceKey.types.test.ts
 * @description UpdateSourceKey.ts 的完整公开形状、合法样例、必需可选字段及非法状态契约测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { UpdateSourceKey } from "../UpdateSourceKey";

/** 固定 UpdateSourceKey 的完整公开形状，独立于源类型展开。 */
type ExpectedUpdateSourceKey = 'cloudflare-r2' | 'esa-cdn' | 'tencent-cos' | 'aliyun-oss' | 'github';

describe("UpdateSourceKey.ts 完整类型契约", () => {
  it("UpdateSourceKey 完整字段、合法样例与非法状态", () => {
    expectTypeOf<UpdateSourceKey>().toEqualTypeOf<ExpectedUpdateSourceKey>();
    const legal: UpdateSourceKey = 'cloudflare-r2';
    expectTypeOf(legal).toMatchTypeOf<ExpectedUpdateSourceKey>();
    expect(legal).toBeDefined();
    // @ts-expect-error UpdateSourceKey 拒绝联合以外值或错误的公开结构。
    const invalid: UpdateSourceKey = 'invalid';
    expect(invalid).toBeDefined();
  });
});
