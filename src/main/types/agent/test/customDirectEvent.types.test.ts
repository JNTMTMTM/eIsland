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
 * @file customDirectEvent.types.test.ts
 * @description CustomDirectEvent.ts 的完整公开形状、合法样例、必需可选字段及非法状态契约测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { CustomDirectEventType, CustomDirectEvent } from "../CustomDirectEvent";

/** 固定 CustomDirectEventType 的完整公开形状，独立于源类型展开。 */
type ExpectedCustomDirectEventType = 'meta' | 'status' | 'think' | 'chunk' | 'tool_call_request' | 'tool_call_result' | 'stream_rollback' | 'final' | 'error';

/** 固定 CustomDirectEvent 的完整公开形状，独立于源类型展开。 */
interface ExpectedCustomDirectEvent {
  type: ExpectedCustomDirectEventType;
  payload: Record<string, unknown>;
}

describe("CustomDirectEvent.ts 完整类型契约", () => {
  it("CustomDirectEventType 完整字段、合法样例与非法状态", () => {
    expectTypeOf<CustomDirectEventType>().toEqualTypeOf<ExpectedCustomDirectEventType>();
    const legal: CustomDirectEventType = 'meta';
    expectTypeOf(legal).toMatchTypeOf<ExpectedCustomDirectEventType>();
    expect(legal).toBeDefined();
    // @ts-expect-error CustomDirectEventType 拒绝联合以外值或错误的公开结构。
    const invalid: CustomDirectEventType = 'invalid';
    expect(invalid).toBeDefined();
  });
  it("CustomDirectEvent 完整字段、合法样例与非法状态", () => {
    expectTypeOf<CustomDirectEvent>().toEqualTypeOf<ExpectedCustomDirectEvent>();
    const legal: CustomDirectEvent = { type: 'meta', payload: {} };
    expectTypeOf(legal).toMatchTypeOf<ExpectedCustomDirectEvent>();
    expect(legal).toBeDefined();
    expectTypeOf<Omit<ExpectedCustomDirectEvent, "type">>().not.toMatchTypeOf<CustomDirectEvent>();
    // @ts-expect-error CustomDirectEvent.type 拒绝契约外字段类型或状态。
    const invalid: CustomDirectEvent["type"] = 'invalid';
    expect(invalid).toBeDefined();
    expectTypeOf<null>().not.toMatchTypeOf<CustomDirectEvent>();
  });
});
