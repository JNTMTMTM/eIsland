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
 * @file useSplashVideo.test.ts
 * @description 启动画面视频 Hook 的原生订阅就绪顺序、播放器缺失/拒绝及完成握手清理测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, runEffects, unmountHooks } from '../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../test/elementHarness';
import { useSplashVideo } from '../useSplashVideo';
import { createVideo } from './backgroundVideoHarness';
import { ipc, removals, resetSplashBoundary, splashEvent } from './splashHookHarness';
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
beforeEach(resetSplashBoundary);
afterEach(() => { unmountHooks(); vi.unstubAllGlobals(); });
describe('启动视频实际握手与播放器叶', () => {
  it('先订阅播放再发送就绪，重复渲染保持同一个ref和完成回调且不重复握手', () => {
    const initial = renderWithHooks(useSplashVideo); const video = createVideo();
    Object.assign(initial.videoRef, { current: video.element }); runEffects();
    expect(ipc.on).toHaveBeenCalledWith('splash:play-video', expect.any(Function));
    expect(ipc.on.mock.invocationCallOrder[0]).toBeLessThan(ipc.send.mock.invocationCallOrder[0]);
    expect(ipc.send).toHaveBeenCalledExactlyOnceWith('splash:renderer-ready');
    splashEvent('splash:play-video'); expect(video.play).toHaveBeenCalledOnce();
    const next = renderWithHooks(useSplashVideo); runEffects();
    expect(next.videoRef).toBe(initial.videoRef); expect(next.handleVideoEnded).toBe(initial.handleVideoEnded);
    expect(ipc.on).toHaveBeenCalledOnce(); expect(ipc.send).toHaveBeenCalledOnce();
  });
  it('视频元素尚未绑定不播放，随后绑定播放失败安全处理并可再次播放', async () => {
    const state = renderWithHooks(useSplashVideo); runEffects(); splashEvent('splash:play-video');
    expect(state.videoRef.current).toBeNull();
    const video = createVideo(); Object.assign(state.videoRef, { current: video.element });
    video.play.mockRejectedValueOnce(new Error('autoplay-blocked'));
    splashEvent('splash:play-video'); await Promise.resolve(); expect(video.play).toHaveBeenCalledOnce();
    splashEvent('splash:play-video'); await Promise.resolve(); expect(video.play).toHaveBeenCalledTimes(2);
  });
  it('完成事件发送主进程握手，卸载移除播放监听器', () => {
    const state = renderWithHooks(useSplashVideo); const video = createVideo();
    Object.assign(state.videoRef, { current: video.element }); runEffects(); state.handleVideoEnded();
    expect(ipc.send).toHaveBeenLastCalledWith('splash:video-ended');
    unmountHooks(); expect(removals.get('splash:play-video')).toHaveBeenCalledOnce();
    splashEvent('splash:play-video'); expect(video.play).not.toHaveBeenCalled();
  });
});
