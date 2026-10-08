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
 * @file ffiLoader.test.ts
 * @description 真实FFI加载器的候选DLL回退、原生资源绑定及字符串解码契约测试。
 * @author 鸡哥
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFfiFixture } from '../../../test/ffiLoaderHarness';
import type { FfiFixture } from '../../../test/ffiLoaderHarness';

interface NativeLoader {
  dllPath: string;
  callJson: (name: string, ...args: unknown[]) => unknown;
  getLastError: () => string;
  callIcon: (name: string, ...args: unknown[]) => { data: Buffer; size: number; format: 'png' } | null;
  callPng: (name: string) => { data: Buffer; size: number; format: 'png' } | null;
}

const file = fileURLToPath(new URL('../ffi-loader.js', import.meta.url));
const base = join(dirname(file), 'src', 'bin', 'Release', 'net10.0-windows10.0.19041.0', 'win-x64');
let fixture: FfiFixture;
beforeEach(() => { fixture = createFfiFixture(file); });
afterEach(() => { vi.restoreAllMocks(); });

describe('smtc FFI loader boundary', () => {
  it('优先加载native目录，并绑定由DLL释放的字符串', () => {
    const addon = fixture.read<NativeLoader>();
    const expected = join(base, 'native', 'eIslandSmtcHelper.dll');
    expect(fixture.access).toHaveBeenCalledExactlyOnceWith(expected);
    expect(addon.dllPath).toBe(expected);
    expect(fixture.load).toHaveBeenCalledExactlyOnceWith(expected);
    expect(fixture.disposable).toHaveBeenCalledWith('str', fixture.native('smtc_free_string'));
  });
  it('第一个候选不可访问时回退普通DLL目录', () => {
    fixture.access.mockImplementationOnce(() => { throw new Error('missing'); });
    const addon = fixture.read<NativeLoader>();
    expect(fixture.access).toHaveBeenCalledTimes(2);
    expect(addon.dllPath).toBe(join(base, 'eIslandSmtcHelper.dll'));
    expect(fixture.load).toHaveBeenCalledExactlyOnceWith(addon.dllPath);
  });
  it('全部候选缺失时拒绝初始化，不加载DLL', () => {
    fixture.access.mockImplementation(() => { throw new Error('missing'); });
    expect(() => fixture.read<NativeLoader>()).toThrow('Unable to find eIslandSmtcHelper.dll');
    expect(fixture.access).toHaveBeenCalledTimes(2);
    expect(fixture.load).not.toHaveBeenCalled();
  });
  it('DLL加载失败时透传错误', () => {
    fixture.load.mockImplementationOnce(() => { throw new Error('load-failed'); });
    expect(() => fixture.read<NativeLoader>()).toThrow('load-failed');
  });
  it('JSON函数转发参数并解析原生载荷', () => {
    const addon = fixture.read<NativeLoader>();
    const native = fixture.native('smtc_get_session');
    native.mockReturnValue('{"device":"one","count":2}');
    expect(addon.callJson('smtc_get_session', ...['session-one'])).toEqual({ device: 'one', count: 2 });
    expect(native).toHaveBeenCalledWith(...['session-one']);
  });
  it.each(['', null])('原生空JSON载荷%j返回null', (value) => {
    const addon = fixture.read<NativeLoader>();
    fixture.native('smtc_get_session').mockReturnValue(value);
    expect(addon.callJson('smtc_get_session', ...['session-one'])).toBeNull();
  });
  it('非法JSON返回null', () => {
    const addon = fixture.read<NativeLoader>();
    fixture.native('smtc_get_session').mockReturnValue('{broken');
    expect(addon.callJson('smtc_get_session', ...['session-one'])).toBeNull();
  });
  it.each(['last error', ''])('错误查询返回原生文本或空串%j', (value) => {
    const addon = fixture.read<NativeLoader>();
    fixture.native('smtc_get_last_error').mockReturnValue(value);
    expect(addon.getLastError()).toBe(value);
  });
});
