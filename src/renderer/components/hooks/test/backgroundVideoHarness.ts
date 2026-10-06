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
 * @file backgroundVideoHarness.ts
 * @description 背景视频 Hook 私有测试工具，通过原生事件叶边界验证循环、参数更新与卸载清理。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { renderWithHooks, runEffects, unmountHooks } from '../../components/test/contentLifecycleHarness';
import type { MutableRefObject, SyntheticEvent } from 'react';
import type { IslandBgMediaType } from '../../config/dynamicIslandConfig';

export interface VideoOptions {
  bgMedia: { type: IslandBgMediaType; previewUrl: string } | null;
  bgVideoElementRef: MutableRefObject<HTMLVideoElement | null>;
  bgVideoVolume: number;
  bgVideoRate: number;
  bgVideoLoop: boolean;
  bgVideoHwDecode: boolean;
}

/**
 * 建立只模拟浏览器媒体接口的事件目标，真实 Hook 负责订阅与重播。
 * @returns 视频叶边界及播放调用记录。
 */
export function createVideo() {
  const play = vi.fn(() => Promise.resolve());
  const target = Object.assign(new EventTarget(), {
    play, currentTime: 9, duration: 10, ended: false, loop: true,
    volume: 1, playbackRate: 1,
  });
  return { play, target, element: target as unknown as HTMLVideoElement };
}

/**
 * 创建已绑定视频元素的默认 Hook 参数。
 * @param element - 视频 DOM 叶边界。
 * @returns 可由父组件更新的参数。
 */
export function videoOptions(element: HTMLVideoElement | null): VideoOptions {
  return {
    bgMedia: { type: 'video', previewUrl: 'file:///background.mp4' },
    bgVideoElementRef: { current: element }, bgVideoVolume: 0.6,
    bgVideoRate: 1, bgVideoLoop: true, bgVideoHwDecode: true,
  };
}

/**
 * 提供浏览器媒体事件的必要 currentTarget。
 * @param element - 事件来源视频。
 * @returns 仅在 DOM 叶边界转换的 React 事件。
 */
export function videoEvent(element: HTMLVideoElement): SyntheticEvent<HTMLVideoElement> {
  return { currentTarget: element } as SyntheticEvent<HTMLVideoElement>;
}

/**
 * 对两种窗口的真实视频 Hook 运行相同播放行为契约。
 * @param name - 被测 Hook 名称。
 * @param hook - 实际 Hook 函数。
 */
export function registerVideoLoopTests(name: string, hook: (options: VideoOptions) => unknown): void {
  describe(`${name  } 实际视频循环与清理`, () => {
    it('没有元素时安全挂载，后续绑定新 ref 才写入参数和订阅', () => {
      const options = videoOptions(null);
      renderWithHooks(() => hook(options)); runEffects();
      const video = createVideo();
      const next = { ...options, bgVideoElementRef: { current: video.element } };
      renderWithHooks(() => hook(next)); runEffects();
      expect(video.target.volume).toBe(0.6); expect(video.target.loop).toBe(false);
      video.target.dispatchEvent(new Event('ended'));
      expect(video.play).toHaveBeenCalledOnce();
    });
    it.each([null, { type: 'image' as const, previewUrl: 'image.png' }])('非视频背景不订阅循环事件：%j', (media) => {
      const video = createVideo(); const options = videoOptions(video.element); options.bgMedia = media;
      renderWithHooks(() => hook(options)); runEffects();
      video.target.dispatchEvent(new Event('ended'));
      expect(video.play).not.toHaveBeenCalled();
      expect(video.target.loop).toBe(true);
    });
    it.each([[-5, 0, 0, 0.25], [5, 9, 1, 3], [0.4, 1.5, 0.4, 1.5]])('音量%s和速度%s在元素上限制到合法区间', (volume, rate, expectedVolume, expectedRate) => {
      const video = createVideo(); const options = videoOptions(video.element);
      options.bgVideoVolume = volume; options.bgVideoRate = rate;
      renderWithHooks(() => hook(options)); runEffects();
      expect(video.target.volume).toBe(expectedVolume); expect(video.target.playbackRate).toBe(expectedRate);
      options.bgVideoVolume = 0.2; options.bgVideoRate = 2;
      renderWithHooks(() => hook(options)); runEffects();
      expect(video.target.volume).toBe(0.2); expect(video.target.playbackRate).toBe(2);
    });
    it('播放结束重置时间并重播，未接近末尾时不抢先重播', () => {
      const video = createVideo(); const options = videoOptions(video.element);
      renderWithHooks(() => hook(options)); runEffects();
      video.target.dispatchEvent(new Event('timeupdate')); expect(video.play).not.toHaveBeenCalled();
      video.target.currentTime = 9.9; video.target.dispatchEvent(new Event('timeupdate'));
      expect(video.target.currentTime).toBe(0); expect(video.play).toHaveBeenCalledOnce();
      video.target.currentTime = 10; video.target.dispatchEvent(new Event('ended'));
      expect(video.target.currentTime).toBe(0); expect(video.play).toHaveBeenCalledTimes(2);
    });
    it.each([Number.NaN, Number.POSITIVE_INFINITY, 0, -1])('无效时长%s不使用近尾重播', (duration) => {
      const video = createVideo(); video.target.duration = duration;
      renderWithHooks(() => hook(videoOptions(video.element))); runEffects();
      video.target.dispatchEvent(new Event('timeupdate'));
      expect(video.play).not.toHaveBeenCalled();
    });
    it('关闭循环阻止两个事件重播，开启时恢复同一订阅并重启已结束视频', () => {
      const video = createVideo(); const options = videoOptions(video.element); options.bgVideoLoop = false;
      renderWithHooks(() => hook(options)); runEffects();
      video.target.dispatchEvent(new Event('ended')); video.target.dispatchEvent(new Event('timeupdate'));
      expect(video.play).not.toHaveBeenCalled();
      video.target.ended = true; options.bgVideoLoop = true;
      renderWithHooks(() => hook(options)); runEffects();
      expect(video.target.currentTime).toBe(0); expect(video.play).toHaveBeenCalledOnce();
      video.target.dispatchEvent(new Event('ended')); expect(video.play).toHaveBeenCalledTimes(2);
    });
    it('浏览器拒绝设置时间及播放时，结束事件和启用循环均安全处理', async () => {
      const video = createVideo(); const options = videoOptions(video.element); options.bgVideoLoop = false;
      Object.defineProperty(video.target, 'currentTime', { get: () => 10, set: () => { throw new Error('not-seekable'); } });
      video.play.mockRejectedValue(new Error('autoplay-blocked'));
      renderWithHooks(() => hook(options)); runEffects();
      video.target.ended = true; options.bgVideoLoop = true;
      expect(() => { renderWithHooks(() => hook(options)); runEffects(); }).not.toThrow();
      expect(() => video.target.dispatchEvent(new Event('ended'))).not.toThrow();
      await Promise.resolve(); expect(video.play).toHaveBeenCalledTimes(2);
    });
    it('媒体或解码依赖变化移除旧监听，卸载后事件不再播放', () => {
      const video = createVideo(); const remove = vi.spyOn(video.target, 'removeEventListener');
      const options = videoOptions(video.element);
      renderWithHooks(() => hook(options)); runEffects();
      options.bgVideoHwDecode = false;
      renderWithHooks(() => hook(options)); runEffects();
      expect(remove).toHaveBeenCalledTimes(2);
      options.bgMedia = { type: 'image', previewUrl: 'new.png' };
      renderWithHooks(() => hook(options)); runEffects();
      expect(remove).toHaveBeenCalledTimes(4);
      video.target.dispatchEvent(new Event('ended')); expect(video.play).not.toHaveBeenCalled();
      options.bgMedia = { type: 'video', previewUrl: 'new.mp4' };
      renderWithHooks(() => hook(options)); runEffects(); unmountHooks();
      expect(remove).toHaveBeenCalledTimes(6);
      video.target.dispatchEvent(new Event('ended')); video.target.dispatchEvent(new Event('timeupdate'));
      expect(video.play).not.toHaveBeenCalled();
    });
  });
}
