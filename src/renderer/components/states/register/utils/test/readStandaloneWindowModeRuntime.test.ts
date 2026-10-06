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
 * @file readStandaloneWindowModeRuntime.test.ts
 * @description 验证注册窗口模式读取的当前配置、旧键回退及原生存储失败。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readStandaloneWindowMode } from '../readStandaloneWindowMode';

const storeRead = vi.fn<(key: string) => Promise<unknown>>();

describe('独立窗口模式真实配置回退', () => {
  beforeEach(() => { storeRead.mockReset(); vi.stubGlobal('window', { api: { storeRead } }); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it.each(['standalone', 'integrated'] as const)('当前有效模式 %s 直接返回、不读取旧键', async (mode) => {
    storeRead.mockResolvedValue(mode);
    expect(await readStandaloneWindowMode()).toBe(mode);
    expect(storeRead).toHaveBeenCalledExactlyOnceWith('standalone-window-mode');
  });

  it('当前值不识别时读取真实旧键并恢复独立模式', async () => {
    storeRead.mockResolvedValueOnce('obsolete').mockResolvedValueOnce('standalone');
    expect(await readStandaloneWindowMode()).toBe('standalone');
    expect(storeRead.mock.calls).toEqual([['standalone-window-mode'], ['countdown-window-mode']]);
  });

  it('当前读取拒绝后仍按旧配置恢复', async () => {
    storeRead.mockRejectedValueOnce(new Error('new setting unavailable')).mockResolvedValueOnce('standalone');
    expect(await readStandaloneWindowMode()).toBe('standalone');
    expect(storeRead).toHaveBeenCalledTimes(2);
  });

  it('旧值不识别时返回集成模式', async () => {
    storeRead.mockResolvedValueOnce(null).mockResolvedValueOnce('obsolete');
    expect(await readStandaloneWindowMode()).toBe('integrated');
    expect(storeRead).toHaveBeenCalledTimes(2);
  });

  it('两个原生读取均拒绝时返回集成模式', async () => {
    storeRead.mockRejectedValue(new Error('settings unavailable'));
    expect(await readStandaloneWindowMode()).toBe('integrated');
    expect(storeRead).toHaveBeenCalledTimes(2);
  });
});
