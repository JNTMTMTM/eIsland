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
 * @file clipboard.types.test.ts
 * @description clipboard 的跨进程类型契约、合法配置与非法字段约束测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { ClipboardUrlsDetectedData, ExternalAgentData } from '../clipboard';
describe('clipboard contracts', () => {
  it('fixes ClipboardUrlsDetectedData fields and accepts its explicit legal fixture', () => {
    expectTypeOf<ClipboardUrlsDetectedData>().toEqualTypeOf<{
      urls: string[];
      title: string;
    }>();
    const fixture: ClipboardUrlsDetectedData = { urls: [], title: 'sample' };
    expect(fixture).toBeDefined();
    // @ts-expect-error ClipboardUrlsDetectedData.title 禁止使用契约外字段值。
    const invalid: ClipboardUrlsDetectedData['title'] = 123;
    expect(invalid).toBeDefined();
  });
  it('fixes ExternalAgentData fields and accepts its explicit legal fixture', () => {
    expectTypeOf<ExternalAgentData>().toEqualTypeOf<{
      agentNames: string[];
    }>();
    const fixture: ExternalAgentData = { agentNames: [] };
    expect(fixture).toBeDefined();
  });
});
