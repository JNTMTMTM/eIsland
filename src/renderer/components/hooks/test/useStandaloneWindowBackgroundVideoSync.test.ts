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
 * @file useStandaloneWindowBackgroundVideoSync.test.ts
 * @description 独立窗口视频同步 Hook 的循环生命周期与媒体回调限值、自动播放失败测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../test/elementHarness';
import { useStandaloneWindowBackgroundVideoSync } from '../useStandaloneWindowBackgroundVideoSync';
import { createVideo, registerVideoLoopTests, videoEvent, videoOptions } from './backgroundVideoHarness';
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
beforeEach(() => { resetLifecycle(); vi.clearAllMocks(); });
afterEach(() => { unmountHooks(); });
registerVideoLoopTests('useStandaloneWindowBackgroundVideoSync', useStandaloneWindowBackgroundVideoSync);
describe('独立视频元数据和播放事件', () => {
  it.each([[-1, 0, 0, 0.25], [2, 4, 1, 3], [0.5, 2, 0.5, 2]])('回调使用最新音量%s/速度%s并关闭浏览器原生循环', async (volume, rate, expectedVolume, expectedRate) => {
    const video = createVideo(); const options = videoOptions(null);
    options.bgVideoVolume = volume; options.bgVideoRate = rate;
    const callbacks = renderWithHooks(() => useStandaloneWindowBackgroundVideoSync(options)); runEffects();
    callbacks.handleVideoLoadedMetadata(videoEvent(video.element));
    expect(video.target.volume).toBe(expectedVolume); expect(video.target.playbackRate).toBe(expectedRate); expect(video.target.loop).toBe(false);
    video.play.mockRejectedValue(new Error('autoplay-blocked'));
    callbacks.handleVideoCanPlay(videoEvent(video.element)); await Promise.resolve();
    expect(video.play).toHaveBeenCalledOnce();
    options.bgVideoVolume = 0.8;
    const updated = renderWithHooks(() => useStandaloneWindowBackgroundVideoSync(options)); runEffects();
    expect(updated.handleVideoCanPlay).not.toBe(callbacks.handleVideoCanPlay);
    video.play.mockResolvedValue(); updated.handleVideoCanPlay(videoEvent(video.element)); await Promise.resolve();
    expect(video.target.volume).toBe(0.8); expect(video.play).toHaveBeenCalledTimes(2);
  });
});
