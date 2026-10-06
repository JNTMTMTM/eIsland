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
 * @file net.types.test.ts
 * @description net 的跨进程类型契约、合法配置与非法字段约束测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { NetFetchOptions, NetFetchResult } from '../net';
describe('net contracts', () => {
  it('fixes NetFetchOptions fields and accepts its explicit legal fixture', () => {
    expectTypeOf<NetFetchOptions>().toEqualTypeOf<{
      method?: string;
      headers?: Record<string, string>;
      body?: string;
      timeoutMs?: number;
    }>();
    const fixture: NetFetchOptions = { method: 'sample', headers: {}, body: 'sample', timeoutMs: 0 };
    expect(fixture).toBeDefined();
    // @ts-expect-error NetFetchOptions.method 禁止使用契约外字段值。
    const invalid: NetFetchOptions['method'] = 123;
    expect(invalid).toBeDefined();
  });
  it('fixes NetFetchResult fields and accepts its explicit legal fixture', () => {
    expectTypeOf<NetFetchResult>().toEqualTypeOf<{
      ok: boolean;
      status: number;
      body: string;
    }>();
    const fixture: NetFetchResult = { ok: false, status: 0, body: 'sample' };
    expect(fixture).toBeDefined();
    // @ts-expect-error NetFetchResult.ok 禁止使用契约外字段值。
    const invalid: NetFetchResult['ok'] = 'invalid';
    expect(invalid).toBeDefined();
  });
});
