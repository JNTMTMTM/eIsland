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
 * @file contributionMediaHarness.ts
 * @description 壁纸贡献测试的浏览器媒体叶边界，触发实际图片、画布及视频处理回调。
 * @author 鸡哥
 */

import { vi } from 'vitest';
export type FrameMode = 'frames' | 'wall' | 'same' | 'tiny' | 'manual' | 'unsupported';
export const browser = {
  imageCount: 0,
  imageFailure: 0,
  imageWidth: 1920,
  imageHeight: 1080,
  canvasCount: 0,
  contextFailure: 0,
  encodeFailure: 0,
  drawFailure: null as unknown,
  videoFailure: false,
  seekFailure: false,
  videoWidth: 1920,
  videoHeight: 1080,
  duration: 2,
  frameMode: 'unsupported' as FrameMode,
  playPending: null as Promise<void> | null,
  playMode: 'ok' as 'ok' | 'reject' | 'throw',
  pauseThrows: false,
  frameCount: 0,
  pendingFrame: null as ((now: number, metadata: {
    mediaTime: number;
  }) => void) | null,
  draw: vi.fn<(image: unknown, x: number, y: number, width: number, height: number) => void>(),
  revoke: vi.fn<(url: string) => void>(),
  create: vi.fn<(source: Blob | MediaSource) => string>(),
  pause: vi.fn<() => void>()
};
/** 模拟浏览器图片元素并发送真实加载事件。 */
class TestImage {
  width = browser.imageWidth;

  height = browser.imageHeight;

  onload: (() => void) | null = null;

  onerror: (() => void) | null = null;

  /**
   * 按浏览器加载顺序发送图片事件。
   * @param source - Blob 地址
   */
  set src(source: string) {
    void source;
    const number = ++browser.imageCount;
    queueMicrotask(() => {
      if (number === browser.imageFailure) this.onerror?.();else this.onload?.();
    });
  }
}
/** 安装局部媒体叶边界，不执行浏览器或网络操作。 */
export function installMedia(): void {
  browser.imageCount = 0;
  browser.imageFailure = 0;
  browser.imageWidth = 1920;
  browser.imageHeight = 1080;
  browser.canvasCount = 0;
  browser.contextFailure = 0;
  browser.encodeFailure = 0;
  browser.drawFailure = null;
  browser.videoFailure = false;
  browser.seekFailure = false;
  browser.videoWidth = 1920;
  browser.videoHeight = 1080;
  browser.duration = 2;
  browser.frameMode = 'unsupported';
  browser.playPending = null;
  browser.playMode = 'ok';
  browser.pauseThrows = false;
  browser.frameCount = 0;
  browser.pendingFrame = null;
  browser.draw.mockReset();
  browser.revoke.mockReset();
  browser.create.mockReset();
  browser.create.mockImplementation(() => `blob:${browser.create.mock.calls.length}`);
  browser.pause.mockReset();
  vi.spyOn(URL, 'createObjectURL').mockImplementation(browser.create);
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(browser.revoke);
  vi.stubGlobal('Image', TestImage);
  vi.stubGlobal('window', {
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout
  });
  vi.stubGlobal('document', {
    createElement: (tag: string) => {
      if (tag === 'canvas') {
        const number = ++browser.canvasCount;
        return {
          width: 0,
          height: 0,
          getContext: () => number === browser.contextFailure ? null : {
            drawImage: (...args: Parameters<typeof browser.draw>) => {
              // eslint-disable-next-line @typescript-eslint/only-throw-error -- 测试未知叶异常被组件边界捕获，不假定所有运行时异常都来自 Error。
              if (browser.drawFailure) throw browser.drawFailure;
              browser.draw(...args);
            }
          },
          toBlob: (callback: (blob: Blob | null) => void) => callback(number === browser.encodeFailure ? null : new Blob(['jpeg'], {
            type: 'image/jpeg'
          }))
        };
      }
      if (tag !== 'video') throw new Error(`Unexpected media element ${tag}`);
      const listeners = new Map<string, () => void>();
      const video = {
        videoWidth: browser.videoWidth,
        videoHeight: browser.videoHeight,
        duration: browser.duration,
        muted: false,
        addEventListener: (name: string, callback: () => void) => listeners.set(name, callback),
        set src(value: string) {
          void value;
          queueMicrotask(() => listeners.get(browser.videoFailure ? 'error' : 'loadedmetadata')?.());
        },
        set currentTime(value: number) {
          void value;
          if (browser.seekFailure) throw new Error('seek failed');
          queueMicrotask(() => listeners.get('seeked')?.());
        },
        play: () => {
          if (browser.playMode === 'throw') throw new Error('play failed');
          if (browser.playPending) return browser.playPending;
          return browser.playMode === 'reject' ? Promise.reject(new Error('autoplay blocked')) : Promise.resolve();
        },
        pause: () => {
          browser.pause();
          if (browser.pauseThrows) throw new Error('pause failed');
        },
        requestVideoFrameCallback: browser.frameMode === 'unsupported' ? undefined : (callback: (now: number, metadata: {
          mediaTime: number;
        }) => void) => {
          browser.pendingFrame = callback;
          const number = browser.frameCount++;
          let mediaTime = number / 30;
          if (browser.frameMode === 'same') mediaTime = 0;
          if (browser.frameMode === 'tiny') mediaTime = number * Number.MIN_VALUE;
          if (browser.frameMode !== 'manual') {queueMicrotask(() => callback(browser.frameMode === 'wall' ? number * 1600 : number * 33, {
            mediaTime
          }));}
          return number;
        }
      };
      return video;
    }
  });
}
