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
 * @file useIslandBackgroundMediaController.test.ts
 * @description 背景媒体控制 Hook 的真实图片/视频状态、样式限值、DOM缺失与媒体事件测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, resetLifecycle, unmountHooks } from '../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../test/elementHarness';
import { useIslandBackgroundMediaController } from '../useIslandBackgroundMediaController';
import { createVideo, videoEvent } from './backgroundVideoHarness';
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
const style = { backgroundImage: '', opacity: '', filter: '' };
const element = { style };
const getElementById = vi.fn((): typeof element | null => element);
beforeEach(() => {
  resetLifecycle(); vi.clearAllMocks(); getElementById.mockReturnValue(element);
  Object.assign(style, { backgroundImage: '', opacity: '', filter: '' });
  vi.stubGlobal('document', { getElementById });
});
afterEach(() => { unmountHooks(); vi.unstubAllGlobals(); });
describe('背景媒体控制实际状态与 DOM 叶边界', () => {
  it('初始化默认值，所有公开 setter 保留父组件更新和稳定引用', () => {
    const initial = renderWithHooks(useIslandBackgroundMediaController);
    expect(initial).toMatchObject({ bgVideoFit: 'cover', bgVideoMuted: true, bgVideoLoop: true, bgVideoVolume: 0.6, bgVideoRate: 1, bgVideoHwDecode: true, bgMedia: null });
    expect(initial.bgOpacityRef.current).toBe(30); expect(initial.bgBlurRef.current).toBe(0);
    initial.setBgVideoFit('contain'); initial.setBgVideoMuted(false); initial.setBgVideoLoop(false);
    initial.setBgVideoVolume((previous) => previous / 2); initial.setBgVideoRate(2); initial.setBgVideoHwDecode(false);
    const updated = renderWithHooks(useIslandBackgroundMediaController);
    expect(updated).toMatchObject({ bgVideoFit: 'contain', bgVideoMuted: false, bgVideoLoop: false, bgVideoVolume: 0.3, bgVideoRate: 2, bgVideoHwDecode: false });
    expect(updated.bgOpacityRef).toBe(initial.bgOpacityRef); expect(updated.applyBgMedia).toBe(initial.applyBgMedia);
  });
  it('背景层不存在时保留当前视频状态，也不尝试写入样式', () => {
    const state = renderWithHooks(useIslandBackgroundMediaController);
    state.applyBgMedia({ type: 'video', source: 'video.mp4' }, 'file:///video.mp4');
    const current = renderWithHooks(useIslandBackgroundMediaController);
    getElementById.mockReturnValue(null); current.applyBgMedia(null, null);
    expect(renderWithHooks(useIslandBackgroundMediaController).bgMedia).toEqual({ type: 'video', previewUrl: 'file:///video.mp4' });
    expect(getElementById).toHaveBeenCalledWith('island-bg-layer'); expect(style.opacity).toBe('0.3');
  });
  it.each([[-20, -2, '0', 'none'], [150, 40, '1', 'blur(20px)'], [42, 1.6, '0.42', 'blur(2px)']])('图片使用最新引用值 opacity%s/blur%s 并替换视频', (opacity, blur, expectedOpacity, expectedFilter) => {
    const state = renderWithHooks(useIslandBackgroundMediaController);
    state.applyBgMedia({ type: 'video', source: 'video.mp4' }, 'video.mp4');
    state.bgOpacityRef.current = opacity; state.bgBlurRef.current = blur;
    state.applyBgMedia({ type: 'image', source: 'source.png' }, 'data:image/png;base64,image');
    expect(style).toEqual({ backgroundImage: 'url(data:image/png;base64,image)', opacity: expectedOpacity, filter: expectedFilter });
    expect(renderWithHooks(useIslandBackgroundMediaController).bgMedia).toBeNull();
  });
  it('视频清除先前图片样式并发布可渲染媒体，空配置清空可见层', () => {
    const state = renderWithHooks(useIslandBackgroundMediaController);
    state.applyBgMedia({ type: 'image', source: 'image.png' }, 'image.png');
    state.applyBgMedia({ type: 'video', source: 'video.mp4' }, 'video.mp4');
    expect(style.backgroundImage).toBe('');
    expect(renderWithHooks(useIslandBackgroundMediaController).bgMedia).toEqual({ type: 'video', previewUrl: 'video.mp4' });
    state.applyBgMedia(null, null);
    expect(style).toEqual({ backgroundImage: '', opacity: '0', filter: 'none' });
    expect(renderWithHooks(useIslandBackgroundMediaController).bgMedia).toBeNull();
  });
  it.each(['image', 'video'] as const)('配置%s缺少可用预览时隐藏背景且不发布媒体', (type) => {
    const state = renderWithHooks(useIslandBackgroundMediaController);
    state.applyBgMedia({ type, source: 'missing' }, '');
    expect(style.opacity).toBe('0'); expect(style.filter).toBe('none');
    expect(renderWithHooks(useIslandBackgroundMediaController).bgMedia).toBeNull();
  });
  it.each([[-1, 0, 0, 0.25], [2, 4, 1, 3], [0.4, 1.5, 0.4, 1.5]])('元数据和播放回调限制音量%s/速度%s并处理浏览器播放拒绝', async (volume, rate, expectedVolume, expectedRate) => {
    const state = renderWithHooks(useIslandBackgroundMediaController);
    state.setBgVideoVolume(volume); state.setBgVideoRate(rate);
    const updated = renderWithHooks(useIslandBackgroundMediaController); const video = createVideo();
    updated.handleVideoLoadedMetadata(videoEvent(video.element));
    expect(video.target.volume).toBe(expectedVolume); expect(video.target.playbackRate).toBe(expectedRate); expect(video.target.loop).toBe(false);
    video.play.mockRejectedValue(new Error('autoplay-blocked'));
    updated.handleVideoCanPlay(videoEvent(video.element)); await Promise.resolve();
    expect(video.play).toHaveBeenCalledOnce();
  });
});
