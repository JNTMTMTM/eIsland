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
 * @file useStandaloneWindowShell.test.ts
 * @description 独立窗口壳层 Hook 真实标签/认证、背景配置与视频子 Hook 集成及参数边界测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, runEffects, unmountHooks } from '../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../test/elementHarness';
import useIslandStore from '../../../store/slices';
import { LOCAL_ISLAND_BG_SYNC_EVENT } from '../../config/dynamicIslandConfig';
import { ACTIVE_TAB_STORE_KEY, AUTH_INTENT_STORE_KEY } from '../../config/standaloneWindowConfig';
import { useStandaloneWindowShell } from '../useStandaloneWindowShell';
import { createVideo, videoEvent } from './backgroundVideoHarness';
import { broadcast, ipc, resetStandalone, settleBackground, surface, values } from './standaloneIpcHarness';
vi.hoisted(() => { vi.stubGlobal('window', Object.assign(new EventTarget(), { location: { hostname: 'localhost' } })); });
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
beforeEach(() => { resetStandalone(); useIslandStore.setState({ state: 'maxExpand' }); });
afterEach(() => { unmountHooks(); vi.unstubAllGlobals(); });
/**
 * 求值真实壳层及三个子 Hook，随后提交注册的 effect。
 * @returns 壳层的当前公开状态。
 */
function commit(): ReturnType<typeof useStandaloneWindowShell> {
  const state = renderWithHooks(useStandaloneWindowShell); runEffects(); return state;
}
/**
 * 完成真实 IPC 初始化及媒体解析后读取当前状态。
 * @returns 初始化后的壳层状态。
 */
async function mount(): Promise<ReturnType<typeof useStandaloneWindowShell>> {
  commit(); await settleBackground(); return commit();
}
/**
 * 通过真实 EventTarget 发布背景设置更新。
 * @param detail - 窗口设置页传递的背景配置。
 */
function local(detail: unknown): void {
  surface.dispatchEvent(new CustomEvent(LOCAL_ISLAND_BG_SYNC_EVENT, { detail }));
}
describe('独立窗口壳层真实子 Hook 集成', () => {
  it('无存储配置时暴露默认状态，切换标签持久化且处理写入失败', async () => {
    const initial = await mount();
    expect(initial).toMatchObject({ activeTab: 'todo', bgMedia: null, bgVideoFit: 'cover', bgVideoMuted: true,
      bgVideoLoop: true, bgVideoVolume: 0.6, bgVideoRate: 1, bgVideoHwDecode: true, bgImageOpacity: 30,
      bgImageBlur: 0, standaloneMacControls: false });
    expect(initial.bgVideoElementRef.current).toBeNull();
    ipc.storeWrite.mockRejectedValue(new Error('write-failed')); initial.switchTab('album'); await settleBackground();
    expect(commit().activeTab).toBe('album'); expect(ipc.storeWrite).toHaveBeenCalledWith(ACTIVE_TAB_STORE_KEY, 'album');
  });
  it('真实存储恢复背景及视频参数，同时执行认证状态转换', async () => {
    values.set(ACTIVE_TAB_STORE_KEY, 'mail'); values.set(AUTH_INTENT_STORE_KEY, 'register');
    values.set('island-bg-media', { type: 'video', source: 'https://example.test/background.mp4' });
    values.set('island-bg-video-fit', 'contain'); values.set('island-bg-video-muted', false);
    values.set('island-bg-video-loop', false); values.set('island-bg-video-volume', 0.2);
    values.set('island-bg-video-rate', 1.5); values.set('island-bg-video-hw-decode', false);
    values.set('island-bg-opacity', 43.7); values.set('island-bg-blur', 2.4); values.set('standalone-window-mac-controls', true);
    const state = await mount();
    expect(state).toMatchObject({ activeTab: 'settings', bgMedia: { type: 'video', previewUrl: 'https://example.test/background.mp4' },
      bgVideoFit: 'contain', bgVideoMuted: false, bgVideoLoop: false, bgVideoVolume: 0.2,
      bgVideoRate: 1.5, bgVideoHwDecode: false, bgImageOpacity: 44, bgImageBlur: 2, standaloneMacControls: true });
    expect(useIslandStore.getState().state).toBe('register');
  });
  it('本地媒体和预览缺失分别清空媒体，有效预览更新类型和地址', async () => {
    await mount(); local({ media: { type: 'image', source: 'image.png' }, previewUrl: 'blob:image' });
    expect(commit().bgMedia).toEqual({ type: 'image', previewUrl: 'blob:image' });
    local({ media: null, previewUrl: 'blob:image' }); expect(commit().bgMedia).toBeNull();
    local({ media: { type: 'image', source: 'image.png' }, previewUrl: null }); expect(commit().bgMedia).toBeNull();
    local({ media: { type: 'video', source: 'video.mp4' }, previewUrl: 'file:///video.mp4' });
    expect(commit().bgMedia).toEqual({ type: 'video', previewUrl: 'file:///video.mp4' });
  });
  it.each([
    { value: -3, opacity: 0, blur: 0 }, { value: 130, opacity: 100, blur: 20 }, { value: 4.6, opacity: 5, blur: 5 },
    { value: '4', opacity: 30, blur: 0 }, { value: NaN, opacity: 30, blur: 0 }, { value: Infinity, opacity: 30, blur: 0 },
    { value: null, opacity: 30, blur: 0 },
  ])('真实设置广播归一化透明度和模糊：$value', async ({ value, opacity, blur }) => {
    await mount(); broadcast('store:island-bg-opacity', value); broadcast('store:island-bg-blur', value);
    expect(commit()).toMatchObject({ bgImageOpacity: opacity, bgImageBlur: blur });
  });
  it('本地磁盘图片走真实预览工具，加载失败及空媒体广播保持清空', async () => {
    await mount(); broadcast('store:island-bg-media', { type: 'image', source: 'C:\\background.png' }); await settleBackground();
    expect(ipc.loadWallpaperFile).toHaveBeenCalledWith('C:\\background.png');
    expect(commit().bgMedia).toEqual({ type: 'image', previewUrl: 'data:image/png;base64,local' });
    ipc.loadWallpaperFile.mockResolvedValue(null);
    broadcast('store:island-bg-media', { type: 'image', source: 'C:\\missing.png' }); await settleBackground();
    expect(commit().bgMedia).toBeNull();
    broadcast('store:island-bg-media', null); expect(commit().bgMedia).toBeNull();
  });
  it('真实视频子 Hook 使用壳层配置设置事件并清理循环监听', async () => {
    const state = await mount(); const video = createVideo(); state.bgVideoElementRef.current = video.element;
    local({ media: { type: 'video', source: 'video.mp4' }, previewUrl: 'video.mp4', videoVolume: 0.7, videoRate: 2 });
    const updated = commit(); updated.handleVideoLoadedMetadata(videoEvent(video.element));
    expect(video.target.volume).toBe(0.7); expect(video.target.playbackRate).toBe(2); expect(video.target.loop).toBe(false);
    updated.handleVideoCanPlay(videoEvent(video.element)); await settleBackground();
    expect(video.play).toHaveBeenCalledOnce(); video.target.dispatchEvent(new Event('ended'));
    expect(video.play).toHaveBeenCalledTimes(2); unmountHooks();
    video.target.dispatchEvent(new Event('ended')); expect(video.play).toHaveBeenCalledTimes(2);
  });
});
