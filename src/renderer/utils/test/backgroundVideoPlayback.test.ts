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
 * @file backgroundVideoPlayback.test.ts
 * @description 在页面隐藏或背景全透明时停止视频解码。
 * @author 鸡哥
 */

import { afterEach, expect, it, vi } from 'vitest';
import { canPlayBackgroundVideo, watchBackgroundVideo } from '../backgroundVideoPlayback';
afterEach(() => vi.unstubAllGlobals());
it('pauses hidden and transparent video, restores its position, and removes observers', () => {
  const page = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal('document', page);
  let mutated: () => void = () => {};
  const disconnect = vi.fn();
  vi.stubGlobal('MutationObserver', class {
    constructor(callback: () => void) { mutated = callback; }
    observe = vi.fn(); disconnect = disconnect;
  });
  const video = { parentElement: { style: { opacity: '0.3' } }, currentTime: 12, paused: true, ended: false,
    play: vi.fn(() => { video.paused = false; return Promise.resolve(); }), pause: vi.fn(() => { video.paused = true; }) };
  const element = video as unknown as HTMLVideoElement;
  const cleanup = watchBackgroundVideo(element);
  expect(video.play).toHaveBeenCalledOnce();
  page.hidden = true; page.dispatchEvent(new Event('visibilitychange'));
  expect(video.paused).toBe(true); expect(canPlayBackgroundVideo(element)).toBe(false);
  page.hidden = false; page.dispatchEvent(new Event('visibilitychange'));
  expect(video.play).toHaveBeenCalledTimes(2); expect(video.currentTime).toBe(12);
  video.parentElement.style.opacity = '0'; mutated(); expect(video.paused).toBe(true);
  video.parentElement.style.opacity = '0.5'; mutated(); expect(video.play).toHaveBeenCalledTimes(3);
  cleanup(); expect(disconnect).toHaveBeenCalledOnce();
  page.dispatchEvent(new Event('visibilitychange')); expect(video.play).toHaveBeenCalledTimes(3);
});
it('does not restart an ended non-looping video when it becomes visible', () => {
  vi.stubGlobal('document', { hidden: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
  const video = { paused: true, ended: true, pause: vi.fn(), play: vi.fn() };
  watchBackgroundVideo(video as unknown as HTMLVideoElement)();
  expect(video.play).not.toHaveBeenCalled();
});
