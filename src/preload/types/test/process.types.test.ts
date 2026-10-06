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
 * @file process.types.test.ts
 * @description process 的跨进程类型契约、合法配置与非法字段约束测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { RunningProcessInfo, RunningWindowInfo } from '../process';
describe('process contracts', () => {
  it('fixes RunningProcessInfo fields and accepts its explicit legal fixture', () => {
    expectTypeOf<RunningProcessInfo>().toEqualTypeOf<{
      name: string;
      iconDataUrl: string | null;
    }>();
    const fixture: RunningProcessInfo = { name: 'sample', iconDataUrl: null };
    expect(fixture).toBeDefined();
    // @ts-expect-error RunningProcessInfo.name 禁止使用契约外字段值。
    const invalid: RunningProcessInfo['name'] = 123;
    expect(invalid).toBeDefined();
  });
  it('fixes RunningWindowInfo fields and accepts its explicit legal fixture', () => {
    expectTypeOf<RunningWindowInfo>().toEqualTypeOf<{
      id: string;
      title: string;
      processName: string;
      processPath: string | null;
      processId: number | null;
      iconDataUrl: string | null;
    }>();
    const fixture: RunningWindowInfo = { id: 'sample', title: 'sample', processName: 'sample', processPath: null, processId: null, iconDataUrl: null };
    expect(fixture).toBeDefined();
    // @ts-expect-error RunningWindowInfo.id 禁止使用契约外字段值。
    const invalid: RunningWindowInfo['id'] = 123;
    expect(invalid).toBeDefined();
  });
});
