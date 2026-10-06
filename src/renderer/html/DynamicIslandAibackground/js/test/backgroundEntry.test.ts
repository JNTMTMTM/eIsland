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
 * @file backgroundEntry.test.ts
 * @description 边缘光效页面真实模块入口的画布初始化、自动启动与主进程公开淡出接口测试。
 * @author 鸡哥
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { canvasBoundary, frame, frames, resetGlow } from '../utils/test/glowCanvasHarness';

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe('光效页面真实模块入口', () => {
  it('装载画布并启动实际动画，暴露fadeOut给主进程调用', async () => {
    const browser = resetGlow();
    const fixture = canvasBoundary();
    const getElementById = vi.fn((id: string) => id === 'lightCanvas' ? fixture.element : null);
    vi.stubGlobal('document', { getElementById });
    vi.resetModules();
    // eslint-disable-next-line import-x/extensions -- 浏览器页面入口要求真实JS扩展名，测试保留原模块装载路径。
    await import('../index.js');
    expect(getElementById).toHaveBeenCalledWith('lightCanvas');
    expect(fixture.canvas.width).toBe(640);
    expect(frames.size).toBe(1);
    frame(0); frame(600);
    expect(fixture.canvas.style.opacity).toBe('1');
    const host = browser as typeof browser & { startFadeOut?: () => void };
    expect(typeof host.startFadeOut).toBe('function');
    host.startFadeOut?.();
    frame(1000); frame(1400);
    expect(fixture.canvas.style.opacity).toBe('0');
    expect(fixture.context.stroke).toHaveBeenCalledTimes(24);
  });
});
