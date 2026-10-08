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
 * @file nativeEntryRuntime.test.ts
 * @description 原生插件入口的平台限制、Release 与 Debug 回退及导出身份测试。
 * @author 鸡哥
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNativeRuntimeFixture } from '../../../test/nativeRuntimeHarness';
import type { NativeRuntimeFixture } from '../../../test/nativeRuntimeHarness';
const file = fileURLToPath(new URL('../index.js', import.meta.url));
const leaves = new Map<string, unknown>();
const binding = { fixtureNativeExport: true };
const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
let fixture: NativeRuntimeFixture;
beforeEach(() => { vi.resetAllMocks(); leaves.clear(); Object.defineProperty(process, 'platform', { configurable: true, value: 'win32' });
  fixture = createNativeRuntimeFixture(file, leaves);
  leaves.set(join(dirname(file), 'build', 'Release', 'eisland_windows_toast_listener.node'), binding);
});
afterEach(() => { fixture.dispose(); vi.restoreAllMocks(); if (originalPlatform) Object.defineProperty(process, 'platform', originalPlatform); });
describe('真实 native 入口加载协议', () => {
  it('Release 导出保持原生对象身份', () => { expect(fixture.read()).toBe(binding); });
  it('Release 失败后尝试 Debug，两个都失败时透传最后异常', () => {
    leaves.set(join(dirname(file), 'build', 'Release', 'eisland_windows_toast_listener.node'), new Error('release absent'));
    leaves.set(join(dirname(file), 'build', 'Debug', 'eisland_windows_toast_listener.node'), binding); expect(fixture.read()).toBe(binding);
    const failure = new Error('debug absent'); leaves.set(join(dirname(file), 'build', 'Debug', 'eisland_windows_toast_listener.node'), failure);
    expect(fixture.read).toThrow(failure);
  });
  it('非 Windows 入口拒绝原生加载', () => {
    Object.defineProperty(process, 'platform', { configurable: true, value: 'darwin' }); expect(fixture.read).toThrow('only supports Windows');
  });
});
