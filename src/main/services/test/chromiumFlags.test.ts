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
 * @file chromiumFlags.test.ts
 * @description 单元测试文件
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('../../config/storeConfig', () => ({
  readDisableFrameRateLimitConfig: () => false,
}));

import { applyChromiumPerformanceFlags } from '../chromiumFlags';

describe('applyChromiumPerformanceFlags', () => {
  it('appends expected chromium switches', () => {
    const appendSwitch = vi.fn();

    applyChromiumPerformanceFlags({
      commandLine: { appendSwitch },
    } as unknown as Parameters<typeof applyChromiumPerformanceFlags>[0]);

    expect(appendSwitch).toHaveBeenCalledWith('disable-software-rasterizer');
    expect(appendSwitch).toHaveBeenCalledWith('disable-gpu-shader-disk-cache');
    expect(appendSwitch).toHaveBeenCalledWith('disable-backgrounding-occluded-windows');
    expect(appendSwitch).toHaveBeenCalledWith('disable-renderer-backgrounding');
    expect(appendSwitch).toHaveBeenCalledWith('disable-background-timer-throttling');
    expect(appendSwitch).toHaveBeenCalledWith('enable-features', 'BackForwardCache');
    expect(appendSwitch).toHaveBeenCalledWith('autoplay-policy', 'no-user-gesture-required');
    expect(appendSwitch).toHaveBeenCalledWith('disable-dev-shm-usage');
    expect(appendSwitch).not.toHaveBeenCalledWith('js-flags', expect.stringContaining('max-old-space-size'));

    const disableFeaturesCall = appendSwitch.mock.calls.find(([name]) => name === 'disable-features');
    expect(disableFeaturesCall?.[1]).toContain('HardwareMediaKeyHandling');
    expect(disableFeaturesCall?.[1]).toContain('CalculateNativeWinOcclusion');
  });
});
