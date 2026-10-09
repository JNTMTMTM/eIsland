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
 * @file screenshotHelper.test.ts
 * @description 验证截图插件加载缓存、候选回退、PNG 校验及枚举失败；原生调用全部隔离。
 * @author 鸡哥
 */

import Module from 'node:module';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ load: vi.fn<(request: string) => unknown>(), primary: vi.fn<() => unknown>(), all: vi.fn<() => unknown>(), windows: vi.fn<() => unknown>(), lastError: vi.fn<() => string>(() => '') }));
const failures: Record<string, unknown> = { local: 'local unavailable' };
const helper = { capturePrimaryDisplayPng: mocks.primary, captureAllDisplaysPng: mocks.all, getVisibleWindows: mocks.windows, getLastError: mocks.lastError };
const nativeModule = Module as unknown as { _load: (request: string, ...args: unknown[]) => unknown };
function platform(value: string) { const double = Object.create(process) as NodeJS.Process; Object.defineProperty(double, 'platform', { value }); vi.stubGlobal('process', double); }
beforeEach(() => {
  vi.resetModules(); vi.resetAllMocks(); platform('win32');
  mocks.load.mockReturnValue(helper); mocks.lastError.mockReturnValue(''); mocks.primary.mockReturnValue({ data: Buffer.from('png'), size: 3, format: 'png' }); mocks.all.mockReturnValue({ data: Buffer.from('all'), size: 3, format: 'png' }); mocks.windows.mockReturnValue([]);
  vi.stubGlobal('require', mocks.load);
  const original = nativeModule._load;
  vi.spyOn(nativeModule, '_load').mockImplementation((request, ...args) => request.includes('windows-screenshot-helper') ? mocks.load(request) : original(request, ...args));
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('screenshotHelper', () => {
  it.each(['linux', 'darwin'])('does not load native plugins on %s', async (value) => { platform(value); const service = await import('../screenshotHelper'); expect(service.capturePrimaryDisplayPng()).toBeNull(); expect(service.captureAllDisplaysPng()).toBeNull(); expect(service.getVisibleWindows()).toEqual([]); expect(mocks.load).not.toHaveBeenCalled(); });
  it('loads the package once and shares its cached helper across all exports', async () => { const service = await import('../screenshotHelper'); const windows = [{ hwnd: 'A', title: 'Title', processId: 1, x: -1, y: 2, width: 3, height: 4 }]; mocks.windows.mockReturnValue(windows); expect(service.capturePrimaryDisplayPng()).toEqual(Buffer.from('png')); expect(service.captureAllDisplaysPng()).toEqual(Buffer.from('all')); expect(service.getVisibleWindows()).toBe(windows); expect(mocks.load).toHaveBeenCalledOnce(); expect(mocks.load).toHaveBeenCalledWith('@eisland/windows-screenshot-helper'); });
  it('tries the local plugin when package loading throws', async () => { mocks.load.mockImplementation((request) => { if (request.startsWith('@')) throw new Error('missing package'); return helper; }); const service = await import('../screenshotHelper'); expect(service.capturePrimaryDisplayPng()).toEqual(Buffer.from('png')); expect(mocks.load).toHaveBeenCalledTimes(2); expect(mocks.load.mock.calls[1][0]).toBe(join(process.cwd(), 'plugins', 'windows', 'eisland-windows-screenshot-helper')); expect(console.warn).not.toHaveBeenCalled(); });
  it('caches unavailable plugins and warns once with Error and non-Error details', async () => { mocks.load.mockImplementationOnce(() => { throw new Error('package unavailable'); }).mockImplementationOnce(() => { throw failures.local; }); const service = await import('../screenshotHelper'); expect(service.capturePrimaryDisplayPng()).toBeNull(); expect(service.captureAllDisplaysPng()).toBeNull(); expect(service.getVisibleWindows()).toEqual([]); expect(service.capturePrimaryDisplayPng()).toBeNull(); expect(mocks.load).toHaveBeenCalledTimes(2); expect(console.warn).toHaveBeenCalledOnce(); expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('package unavailable')); expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('local unavailable')); });
  it.each(['primary', 'all'] as const)('rejects malformed %s screenshots and reports plugin detail', async (method) => { const service = await import('../screenshotHelper'); const target = method === 'primary' ? mocks.primary : mocks.all; const capture = method === 'primary' ? service.capturePrimaryDisplayPng : service.captureAllDisplaysPng; mocks.lastError.mockReturnValue('native capture failed'); [null, { data: 'png', format: 'png' }, { data: Buffer.alloc(0), format: 'png' }, { data: Buffer.from('png'), format: 'jpeg' }].forEach((result) => { target.mockReturnValue(result); expect(capture()).toBeNull(); }); expect(console.warn).toHaveBeenCalledTimes(4); expect(console.warn).toHaveBeenCalledWith(expect.any(String), 'native capture failed'); });
  it.each(['primary', 'all'] as const)('returns null on %s native invocation error', async (method) => { const service = await import('../screenshotHelper'); const failure = new Error('native crash'); (method === 'primary' ? mocks.primary : mocks.all).mockImplementation(() => { throw failure; }); expect((method === 'primary' ? service.capturePrimaryDisplayPng : service.captureAllDisplaysPng)()).toBeNull(); expect(console.warn).toHaveBeenCalledWith(expect.any(String), failure); });
  it('supports legacy helpers without optional enumeration/all-screen/last-error functions', async () => { mocks.load.mockReturnValue({ capturePrimaryDisplayPng: mocks.primary }); mocks.primary.mockReturnValue(null); const service = await import('../screenshotHelper'); expect(service.captureAllDisplaysPng()).toBeNull(); expect(service.getVisibleWindows()).toEqual([]); expect(service.capturePrimaryDisplayPng()).toBeNull(); expect(console.warn).not.toHaveBeenCalled(); });
  it('rejects non-array visible windows and catches enumeration errors', async () => { const service = await import('../screenshotHelper'); mocks.windows.mockReturnValue({ windows: [] }); expect(service.getVisibleWindows()).toEqual([]); mocks.windows.mockImplementation(() => { throw new Error('enumeration failed'); }); expect(service.getVisibleWindows()).toEqual([]); expect(console.warn).toHaveBeenCalledWith('[ScreenshotHelper] window bounds unavailable:', expect.any(Error)); });
});

describe('screenshotHelper missing native detail', () => {
  it('returns an all-screen fallback signal silently when no plugin error detail exists', async () => { mocks.all.mockReturnValue(null); const service = await import('../screenshotHelper'); expect(service.captureAllDisplaysPng()).toBeNull(); expect(console.warn).not.toHaveBeenCalled(); });
});
