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
 * @file useAlbumViewerRuntime.test.ts
 * @description 真实相册查看器的导航、快捷键、缩放平移及视频播放/音量/进度完整交互测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from './albumHookHarness';
import type { AlbumItem, AlbumMeta, UseAlbumViewerReturn } from '../../types/albumTypes';
import type { ChangeEvent, MouseEvent, WheelEvent } from 'react';
const {
  useAlbumViewer
} = await import('../useAlbumViewer');
let items: AlbumItem[];
let filtered: AlbumItem[];
let meta: Record<number, AlbumMeta>;
const exif = vi.fn();
const full = vi.fn();
const listeners = new Set<(event: KeyboardEvent) => void>();
const add = vi.fn<(name: string, handler: (event: KeyboardEvent) => void) => void>();
const remove = vi.fn<(name: string, handler: (event: KeyboardEvent) => void) => void>();
/** 执行真实查看器 Hook。
 * @returns 当前查看器
 */
function view() {
  return renderHook(useAlbumViewer, items, filtered, meta, exif, full);
}
/** 提交查看器状态同步。
 * @returns 最新查看器
 */
function commit() {
  view();
  flushHookEffects();
  return view();
}
/** 构造最小浏览器输入叶事件。
 * @param value - 用户输入
 * @returns 输入事件
 */
function input(value: string): ChangeEvent<HTMLInputElement> {
  return {
    target: {
      value
    }
  } as ChangeEvent<HTMLInputElement>;
}
/** 构造拖动叶事件。
 * @param x - 横坐标
 * @param y - 纵坐标
 * @returns 鼠标事件
 */
function mouse(x: number, y: number): MouseEvent<HTMLDivElement> {
  return {
    clientX: x,
    clientY: y
  } as MouseEvent<HTMLDivElement>;
}
/** 构造滚动叶事件。
 * @param deltaY - 滚动方向
 * @returns 滚动事件
 */
function wheel(deltaY: number) {
  const event = { deltaY, preventDefault: vi.fn<() => void>(), stopPropagation: vi.fn<() => void>() };
  return event;
}
/** 将最小滚轮叶事件传给真实事件回调。
 * @param event - 滚轮叶事件
 */
function scroll(event: ReturnType<typeof wheel>): void {
  view().handleViewerWheel(event as unknown as WheelEvent<HTMLDivElement>);
}
/** 安装不播放用户媒体的视频叶元素。
 * @param viewer - 查看器
 * @returns 视频叶元素
 */
function video(viewer: UseAlbumViewerReturn) {
  const el = {
    duration: 30,
    currentTime: 4,
    paused: true,
    muted: false,
    volume: 0,
    play: vi.fn<() => Promise<void>>().mockResolvedValue(),
    pause: vi.fn()
  };
  const { viewerVideoRef } = viewer;
  viewerVideoRef.current = el as unknown as HTMLVideoElement;
  return el;
}
beforeEach(() => {
  resetHook();
  items = [{
    id: 1,
    path: 'C:/a.jpg',
    name: 'a.jpg',
    ext: 'jpg',
    mediaType: 'image',
    addedAt: 1
  }, {
    id: 2,
    path: 'C:/b.mp4',
    name: 'b.mp4',
    ext: 'mp4',
    mediaType: 'video',
    addedAt: 2
  }];
  filtered = items;
  meta = {};
  exif.mockReset();
  full.mockReset();
  listeners.clear();
  add.mockReset();
  remove.mockReset();
  add.mockImplementation((name, handler) => {
    void name;
    listeners.add(handler);
  });
  remove.mockImplementation((name, handler) => {
    void name;
    listeners.delete(handler);
  });
  vi.stubGlobal('window', {
    addEventListener: add,
    removeEventListener: remove
  });
});
afterEach(() => {
  unmountHook();
  vi.unstubAllGlobals();
});
describe('album viewer image navigation', () => {
  it('guards inactive and missing filtered items and requests resources for a real active item', () => {
    commit();
    view().navigateInViewer(1);
    expect(view().activeId).toBeNull();
    view().setActiveId(99);
    commit();
    expect(view().activeItem).toBeNull();
    expect(full).not.toHaveBeenCalled();
    view().navigateInViewer(1);
    expect(view().activeId).toBe(99);
    filtered = [];
    view().navigateInViewer(1);
    expect(view().activeId).toBe(99);
    view().handleOpenItem(items[0]);
    commit();
    expect(full).toHaveBeenCalledWith(items[0]);
    expect(exif).toHaveBeenCalledWith(items[0]);
    expect(view().activeMeta).toBeUndefined();
  });
  it('wraps navigation both ways and keyboard handlers ignore other keys, exit and clean up', () => {
    view().handleOpenItem(items[0]);
    commit();
    view().navigateInViewer(-1);
    commit();
    expect(view()).toMatchObject({
      activeId: 2,
      viewerSlideDir: 'prev',
      zoom: 1,
      pan: {
        x: 0,
        y: 0
      }
    });
    view().navigateInViewer(1);
    commit();
    expect(view().activeId).toBe(1);
    listeners.forEach((handler) => handler({
      key: 'ArrowRight'
    } as KeyboardEvent));
    commit();
    expect(view().activeId).toBe(2);
    listeners.forEach((handler) => handler({
      key: 'ArrowLeft'
    } as KeyboardEvent));
    commit();
    expect(view().activeId).toBe(1);
    listeners.forEach((handler) => handler({
      key: 'Enter'
    } as KeyboardEvent));
    expect(view().activeId).toBe(1);
    listeners.forEach((handler) => handler({
      key: 'Escape'
    } as KeyboardEvent));
    commit();
    expect(view().activeId).toBeNull();
    expect(listeners.size).toBe(0);
    expect(remove).toHaveBeenCalled();
  });
  it('guards inactive/video wheel and pan gestures, and ignores panning at original scale', () => {
    const event = wheel(-1);
    scroll(event);
    view().handleViewerMouseDown(mouse(0, 0));
    view().handleViewerMouseMove(mouse(2, 2));
    expect(event.preventDefault).not.toHaveBeenCalled();
    view().handleOpenItem(items[1]);
    commit();
    scroll(event);
    view().handleViewerMouseDown(mouse(0, 0));
    expect(view().isPanning).toBe(false);
    view().handleOpenItem(items[0]);
    commit();
    view().handleViewerMouseDown(mouse(0, 0));
    expect(view().isPanning).toBe(false);
  });
  it('zooms image within both limits, pans from prior position and resets controls', () => {
    view().handleOpenItem(items[0]);
    commit();
    const up = wheel(-1);
    const down = wheel(1);
    scroll(up);
    expect(view().zoom).toBe(1.15);
    scroll(down);
    expect(view().zoom).toBe(1);
    expect(up.stopPropagation).toHaveBeenCalledOnce();
    expect(up.preventDefault).toHaveBeenCalledOnce();
    view().handleZoom(100);
    expect(view().zoom).toBe(6);
    view().setPan({
      x: 2,
      y: 3
    });
    view().handleViewerMouseDown(mouse(10, 20));
    expect(view().isPanning).toBe(true);
    view().handleViewerMouseMove(mouse(14, 26));
    expect(view().pan).toEqual({
      x: 6,
      y: 9
    });
    view().handleViewerMouseUp();
    view().handleViewerMouseMove(mouse(100, 100));
    expect(view().pan).toEqual({
      x: 6,
      y: 9
    });
    view().handleZoom(-100);
    expect(view().zoom).toBe(0.2);
    scroll(down);
    expect(view().zoom).toBe(0.2);
    view().setZoom(6);
    scroll(up);
    expect(view().zoom).toBe(6);
    view().handleResetZoom();
    expect(view()).toMatchObject({
      zoom: 1,
      pan: {
        x: 0,
        y: 0
      }
    });
  });
});
describe('album viewer media controls', () => {
  it('guards all operations until a video is mounted', () => {
    const viewer = commit();
    viewer.handleVideoLoadedMetadata();
    viewer.handleVideoTimeUpdate();
    viewer.handleToggleVideoPlay();
    viewer.handleVideoSeek(input('3'));
    expect(view().videoCurrentTime).toBe(0);
  });
  it('resolves video URLs, resets state on active video changes and syncs mute/volume effects', () => {
    meta = {
      2: {
        videoUrl: 'media://video'
      }
    };
    view().handleOpenItem(items[1]);
    commit();
    expect(view().activeVideoUrl).toBe('media://video');
    meta = {};
    expect(view().activeVideoUrl).toBeNull();
    const el = video(view());
    view().handleToggleVideoMute();
    commit();
    expect(el.muted).toBe(false);
    view().handleVideoVolumeChange(input('0.4'));
    commit();
    expect(el.volume).toBe(0.4);
    view().handleToggleVideoControls();
    expect(view().videoControlsCollapsed).toBe(true);
    items = [...items];
    commit();
    expect(view()).toMatchObject({
      videoPlaying: true,
      videoMuted: true,
      videoVolume: 0.6,
      videoCurrentTime: 0,
      videoDuration: 0,
      videoControlsCollapsed: false
    });
  });
  it.each([true, false])('loads metadata and handles playback success %s', async (success) => {
    const el = video(commit());
    if (!success) el.play.mockRejectedValue(new Error('blocked'));
    view().handleVideoLoadedMetadata();
    await settleHook();
    expect(view()).toMatchObject({
      videoDuration: 30,
      videoCurrentTime: 4,
      videoPlaying: success
    });
    expect(el).toMatchObject({
      muted: true,
      volume: 0.6
    });
  });
  it('normalizes non-finite duration/time and time update, validates seek values', async () => {
    const el = video(commit());
    el.duration = NaN;
    el.currentTime = Infinity;
    view().handleVideoLoadedMetadata();
    await settleHook();
    expect(view()).toMatchObject({
      videoDuration: 0,
      videoCurrentTime: 0
    });
    view().handleVideoTimeUpdate();
    expect(view().videoCurrentTime).toBe(0);
    el.currentTime = 9;
    view().handleVideoTimeUpdate();
    expect(view().videoCurrentTime).toBe(9);
    view().handleVideoSeek(input('invalid'));
    expect(el.currentTime).toBe(9);
    view().handleVideoSeek(input('12'));
    expect(el.currentTime).toBe(12);
    expect(view().videoCurrentTime).toBe(12);
  });
  it.each([true, false])('resumes paused media and handles playback success %s', async (success) => {
    const el = video(commit());
    if (!success) el.play.mockRejectedValue(new Error('blocked'));
    view().handleToggleVideoPlay();
    await settleHook();
    expect(view().videoPlaying).toBe(success);
    el.paused = false;
    view().handleToggleVideoPlay();
    expect(el.pause).toHaveBeenCalledOnce();
    expect(view().videoPlaying).toBe(false);
    view().handleVideoEnded();
    expect(view().videoPlaying).toBe(false);
  });
  it('validates volume, clamps it, unmutes positive volume and respects zero and existing unmute', () => {
    video(commit());
    view().handleVideoVolumeChange(input('invalid'));
    expect(view().videoVolume).toBe(0.6);
    view().handleVideoVolumeChange(input('-2'));
    commit();
    expect(view()).toMatchObject({
      videoVolume: 0,
      videoMuted: true
    });
    view().handleVideoVolumeChange(input('2'));
    commit();
    expect(view()).toMatchObject({
      videoVolume: 1,
      videoMuted: false
    });
    view().handleVideoVolumeChange(input('0.4'));
    commit();
    expect(view()).toMatchObject({
      videoVolume: 0.4,
      videoMuted: false
    });
  });
});
