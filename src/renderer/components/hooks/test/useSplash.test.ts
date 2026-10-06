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
 * @file useSplash.test.ts
 * @description 启动窗口聚合 Hook 保留真实淡出和视频子Hook的播放、结束、淡出及卸载集成测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, runEffects, unmountHooks } from '../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../test/elementHarness';
import { useSplash } from '../useSplash';
import { createVideo } from './backgroundVideoHarness';
import { ipc, removals, resetSplashBoundary, splashEvent } from './splashHookHarness';
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
beforeEach(resetSplashBoundary);
afterEach(() => { unmountHooks(); vi.unstubAllGlobals(); });
describe('启动聚合真实子Hook协议', () => {
  it('从就绪、播放、结束到淡出保留真实子Hook状态和原生通道', async () => {
    const initial = renderWithHooks(useSplash); const video = createVideo();
    Object.assign(initial.videoRef, { current: video.element }); runEffects();
    expect(initial.fadeOut).toBe(false); expect(ipc.send).toHaveBeenCalledWith('splash:renderer-ready');
    expect(ipc.on.mock.calls.map(([channel]) => channel)).toEqual(['splash:fade-out', 'splash:play-video']);
    splashEvent('splash:play-video'); await Promise.resolve(); expect(video.play).toHaveBeenCalledOnce();
    initial.handleVideoEnded(); expect(ipc.send).toHaveBeenLastCalledWith('splash:video-ended');
    splashEvent('splash:fade-out');
    const ending = renderWithHooks(useSplash); runEffects(); expect(ending.fadeOut).toBe(true);
    expect(ending.videoRef).toBe(initial.videoRef); expect(ipc.on).toHaveBeenCalledTimes(2);
    unmountHooks(); expect(removals.get('splash:fade-out')).toHaveBeenCalledOnce(); expect(removals.get('splash:play-video')).toHaveBeenCalledOnce();
    splashEvent('splash:play-video'); expect(video.play).toHaveBeenCalledOnce();
  });
});
