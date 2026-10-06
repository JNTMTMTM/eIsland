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
 * @file formatFactoryLifecycleRuntime.test.tsx
 * @description 格式工厂真实图片转换、画布编码及视频提取交互与定时清理测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { byClass, elements, find, invoke, text } from '../../../../../test/tree';
import { createHookReactMock, deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../../../hooks/test/startupHookHarness';
import type { RefObject } from 'react';
import type { ExtractVideoTrackOptions, ExtractVideoTrackResult, PickVideoForExtractResult } from '../../../../../../../../preload/types';
import type { FormatFactoryPageKey } from '../../config/formatFactoryToolConfig';
let Component: typeof import('../FormatFactoryToolSection').FormatFactoryToolSection;
let page: FormatFactoryPageKey;
let browser: EventTarget;
let imageFailure: boolean;
const leaves = {
  pick: vi.fn<() => Promise<string | null>>(),
  load: vi.fn<(path: string) => Promise<string | null>>(),
  stat: vi.fn<(path: string) => Promise<{
    size: number;
  } | null>>(),
  video: vi.fn<() => Promise<PickVideoForExtractResult | null>>(),
  extract: vi.fn<(input: ExtractVideoTrackOptions) => Promise<ExtractVideoTrackResult>>(),
  context: vi.fn<() => {
    clearRect: typeof clear;
    drawImage: typeof draw;
  } | null>(),
  encode: vi.fn<(callback: (blob: Blob | null) => void, mime: string, quality: number) => void>(),
  createUrl: vi.fn<(blob: Blob | MediaSource) => string>(),
  revoke: vi.fn<(url: string) => void>()
};
const clear = vi.fn();
const draw = vi.fn();
const anchor = {
  href: '',
  download: '',
  style: {
    display: ''
  },
  click: vi.fn()
};
const append = vi.fn();
const remove = vi.fn();

/** 提供实际图片加载回调。
 * @returns 原生图片边界
 */
function createImage() {
  return {
    width: 800,
    height: 600,
    onload: () => {},
    onerror: () => {},
    set src(value: string) {
      void value;
      queueMicrotask(() => {
        if (imageFailure) this.onerror();else this.onload();
      });
    }
  };
}
/** 读取真实组件。
 * @returns 元素树
 */
function run() {
  return renderHook(Component, {
    formatFactoryPage: page,
    setFormatFactoryPage: (next: FormatFactoryPageKey) => {
      page = next;
    }
  });
}
/** 查找真实按钮。
 * @param label - 可见文字后缀
 * @returns 按钮
 */
function button(label: string) {
  return find(run(), (node) => node.type === 'button' && text(node).endsWith(label));
}
/** 完成原生挂载。
 * @returns 最新树
 */
async function mount() {
  const tree = run();
  (byClass(tree, 'settings-app-pages-layout').props.ref as RefObject<unknown>).current = browser;
  flushHookEffects();
  await settleHook();
  return run();
}
/** 选择实际文件并完成异步预览。
 * @returns 完成状态
 */
async function pick() {
  invoke(button('image.pickFile'), 'onClick');
  await settleHook();
}
beforeEach(async () => {
  unmountHook();
  resetHook();
  vi.resetModules();
  vi.resetAllMocks();
  vi.useFakeTimers();
  page = 'image';
  browser = new EventTarget();
  imageFailure = false;
  leaves.pick.mockResolvedValue('C:/photo.png');
  leaves.load.mockResolvedValue('data:image/png;base64,AAAAAA==');
  leaves.stat.mockResolvedValue(null);
  leaves.video.mockResolvedValue({
    filePath: 'C:/movie.mp4',
    fileSize: 1024
  });
  leaves.extract.mockResolvedValue({
    success: true,
    outputPath: 'C:/audio.mp3'
  });
  leaves.context.mockReturnValue({
    clearRect: clear,
    drawImage: draw
  });
  leaves.encode.mockImplementation((callback) => {
    callback(new Blob(['image']));
  });
  leaves.createUrl.mockReturnValue('blob:test');
  vi.stubGlobal('Image', createImage);
  vi.spyOn(URL, 'createObjectURL').mockImplementation(leaves.createUrl);
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(leaves.revoke);
  vi.stubGlobal('document', {
    body: {
      appendChild: append,
      removeChild: remove
    },
    createElement: (tag: string) => tag === 'a' ? anchor : {
      width: 0,
      height: 0,
      getContext: leaves.context,
      toBlob: leaves.encode
    }
  });
  vi.stubGlobal('window', {
    setInterval,
    clearInterval,
    setTimeout,
    api: {
      pickFileForHash: leaves.pick,
      loadWallpaperFile: leaves.load,
      getFileStat: leaves.stat,
      pickVideoForExtract: leaves.video,
      extractVideoTrack: leaves.extract
    }
  });
  vi.doMock('react', async (original) => createHookReactMock(await original<typeof import('react')>()));
  Component = (await import('../FormatFactoryToolSection')).FormatFactoryToolSection;
});
afterEach(() => {
  unmountHook();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe('FormatFactoryToolSection actual conversion lifecycle', () => {
  it('native wheel clamps public page navigation and removes listener', async () => {
    await mount();
    const wheel = (deltaY: number, dots: boolean) => {
      const event = new Event('wheel', {
        cancelable: true
      });
      Object.defineProperties(event, {
        deltaY: {
          value: deltaY
        },
        target: {
          value: {
            closest: () => dots
          }
        }
      });
      browser.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(wheel(1, false)).toBe(false);
    expect(wheel(-1, true)).toBe(false);
    expect(wheel(1, true)).toBe(true);
    expect(page).toBe('video');
    run();
    expect(wheel(1, true)).toBe(false);
    expect(wheel(-1, true)).toBe(true);
    invoke(elements(run()).filter((node) => String(node.props.className ?? '').split(' ').includes('settings-app-page-dot'))[1], 'onClick');
    expect(page).toBe('video');
    unmountHook();
    expect(wheel(-1, true)).toBe(false);
  });
  it('actual preview dimensions and encoding generate a downloaded JPEG with cleanup', async () => {
    await mount();
    invoke(byClass(run(), 'ff-convert-btn'), 'onClick');
    expect(leaves.load).not.toHaveBeenCalled();
    await pick();
    invoke(find(run(), (node) => node.type === 'img'), 'onLoad', {
      currentTarget: {
        naturalWidth: 800,
        naturalHeight: 600
      }
    });
    expect(text(run())).toContain('4:3');
    expect(text(run())).toContain('480,000');
    expect(button('PNG').props.disabled).toBe(true);
    invoke(byClass(run(), 'ff-convert-btn'), 'onClick');
    await settleHook();
    expect(anchor.download).toBe('photo.jpg');
    expect(leaves.encode).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 1);
    expect(draw).toHaveBeenCalled();
    expect(text(run())).toContain('image.success');
    vi.advanceTimersByTime(1000);
    expect(leaves.revoke).toHaveBeenCalledWith('blob:test');
    expect(elements(run()).some((node) => String(node.props.className ?? '') === 'ff-convert-progress')).toBe(false);
  });
  it.each(['WEBP', 'BMP', 'PNG', 'ICO'] as const)('actual %s format selection uses native encoder and ICO size controls', async (format) => {
    leaves.pick.mockResolvedValue('C:/photo.jpg');
    await mount();
    await pick();
    invoke(button(format), 'onClick');
    if (format === 'ICO') invoke(button('256x256'), 'onClick');
    invoke(byClass(run(), 'ff-convert-btn'), 'onClick');
    await settleHook();
    expect(anchor.download).toBe(format === 'ICO' ? 'photo-256x256.ico' : `photo.${format.toLowerCase()}`);
    expect(append).toHaveBeenCalledWith(anchor);
    expect(remove).toHaveBeenCalledWith(anchor);
    if (format === 'ICO') expect((leaves.createUrl.mock.calls[0][0] as Blob).size).toBe(27);
  });
  it('public conversion waits through all progress tiers and suppresses repeated submission', async () => {
    await mount();
    await pick();
    const pending = deferred<string | null>();
    leaves.load.mockReturnValue(pending.promise);
    invoke(byClass(run(), 'ff-convert-btn'), 'onClick');
    run();
    invoke(byClass(run(), 'ff-convert-btn'), 'onClick');
    expect(leaves.load).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(15000);
    expect(text(run())).toContain('92%');
    pending.resolve('data:image/png;base64,AA==');
    await settleHook();
    expect(text(run())).toContain('100%');
    vi.advanceTimersByTime(700);
    expect(elements(run()).some((node) => String(node.props.className ?? '') === 'ff-convert-progress')).toBe(false);
  });
  it.each(['load-empty', 'image-failed', 'canvas-missing', 'encode-failed', 'load-rejected'] as const)('real image conversion %s exposes its returned failure', async (kind) => {
    await mount();
    await pick();
    if (kind === 'load-empty') leaves.load.mockResolvedValue(null);
    if (kind === 'image-failed') imageFailure = true;
    if (kind === 'canvas-missing') leaves.context.mockReturnValue(null);
    if (kind === 'encode-failed') {
      leaves.encode.mockImplementation((callback) => {
        callback(null);
      });
    }
    if (kind === 'load-rejected') leaves.load.mockRejectedValue(new Error('disk'));
    invoke(byClass(run(), 'ff-convert-btn'), 'onClick');
    await settleHook();
    expect(text(run())).toContain(({
      'load-empty': 'load source image failed',
      'image-failed': 'image load failed',
      'canvas-missing': 'canvas context unavailable',
      'encode-failed': 'canvas encode failed',
      'load-rejected': 'disk'
    } as const)[kind]);
  });
  it.each(['cancel', 'pick-reject', 'preview-empty', 'preview-reject', 'stat-reject', 'empty-file', 'unknown-ext'] as const)('image picking %s keeps real preview and selection state', async (kind) => {
    if (kind === 'cancel') leaves.pick.mockResolvedValue(null);
    if (kind === 'pick-reject') leaves.pick.mockRejectedValue(new Error('dialog'));
    if (kind === 'preview-empty') leaves.load.mockResolvedValue(null);
    if (kind === 'preview-reject') leaves.load.mockRejectedValue(new Error('read'));
    if (kind === 'stat-reject') leaves.stat.mockRejectedValue(new Error('stat'));
    if (kind === 'empty-file') leaves.load.mockResolvedValue('data:image/png;base64,');
    if (kind === 'unknown-ext') leaves.pick.mockResolvedValue('C:/photo');
    await mount();
    await pick();
    expect(byClass(run(), 'ff-convert-btn').props.disabled).toBe(kind === 'cancel' || kind === 'pick-reject');
  });
  it.each([0, 2048, 1048576, 1073741824])('video file metadata formats native %i bytes and absent extension', async (size) => {
    page = 'video';
    leaves.video.mockResolvedValue({
      filePath: 'C:/movie',
      fileSize: size
    });
    await mount();
    invoke(button('video.pickFile'), 'onClick');
    await settleHook();
    expect(text(run())).toContain(({
      0: '0 B',
      2048: '2.0 KB',
      1048576: '1.00 MB',
      1073741824: '1.00 GB'
    } as Record<number, string>)[size]);
  });
  it('real video selection, audio/video format controls and long extraction progress settle correctly', async () => {
    page = 'video';
    await mount();
    invoke(byClass(run(), 'ff-convert-btn'), 'onClick');
    expect(leaves.extract).not.toHaveBeenCalled();
    invoke(button('video.pickFile'), 'onClick');
    await settleHook();
    invoke(button('WAV'), 'onClick');
    invoke(button('video.trackVideo'), 'onClick');
    invoke(button('MKV'), 'onClick');
    const pending = deferred<ExtractVideoTrackResult>();
    leaves.extract.mockReturnValue(pending.promise);
    invoke(byClass(run(), 'ff-convert-btn'), 'onClick');
    run();
    invoke(byClass(run(), 'ff-convert-btn'), 'onClick');
    expect(leaves.extract).toHaveBeenCalledOnce();
    expect(leaves.extract).toHaveBeenCalledWith({
      filePath: 'C:/movie.mp4',
      trackType: 'video',
      outputFormat: 'mkv'
    });
    vi.advanceTimersByTime(20000);
    expect(text(run())).toContain('92%');
    pending.resolve({
      success: true,
      outputPath: 'C:/movie.mkv'
    });
    await settleHook();
    expect(text(run())).toContain('video.success');
    vi.advanceTimersByTime(700);
    expect(elements(run()).some((node) => String(node.props.className ?? '') === 'ff-convert-progress')).toBe(false);
  });
  it.each(['cancel', 'failure', 'fallback', 'rejected', 'success-no-path'] as const)('native video extraction %s keeps final status contract', async (kind) => {
    page = 'video';
    await mount();
    invoke(button('video.pickFile'), 'onClick');
    await settleHook();
    if (kind === 'rejected') leaves.extract.mockRejectedValue(new Error('native'));else {
      leaves.extract.mockResolvedValue({
        success: kind === 'success-no-path',
        error: ({
          cancel: 'canceled',
          failure: 'codec failed',
          fallback: '',
          rejected: '',
          'success-no-path': ''
        } as const)[kind]
      });
    }
    invoke(byClass(run(), 'ff-convert-btn'), 'onClick');
    await settleHook();
    expect(text(run()).includes('video.failed')).toBe(kind === 'fallback' || kind === 'rejected');
    expect(text(run()).includes('codec failed')).toBe(kind === 'failure');
    expect(text(run()).includes('video.success')).toBe(kind === 'success-no-path');
    vi.advanceTimersByTime(700);
  });
  it.each(['canceled', 'rejected', 'unknown-size'] as const)('native video picker %s preserves metadata guards', async (kind) => {
    page = 'video';
    if (kind === 'canceled') leaves.video.mockResolvedValue(null);
    if (kind === 'rejected') leaves.video.mockRejectedValue(new Error('dialog'));
    if (kind === 'unknown-size') {
      leaves.video.mockResolvedValue({
        filePath: 'C:/movie.mp4',
        fileSize: null
      });
    }
    await mount();
    invoke(button('video.pickFile'), 'onClick');
    await settleHook();
    expect(byClass(run(), 'ff-convert-btn').props.disabled).toBe(kind !== 'unknown-size');
  });
  it('mounted leaf without a DOM ref exits wheel setup and valid file stat replaces estimated preview bytes', async () => {
    run();
    flushHookEffects();
    leaves.stat.mockResolvedValue({
      size: 4096
    });
    await pick();
    expect(text(run())).toContain('4.0 KB');
    invoke(button('ICO'), 'onClick');
    invoke(byClass(run(), 'ff-convert-btn'), 'onClick');
    await settleHook();
    expect(anchor.download).toBe('photo-32x32.ico');
  });
  it.each(['plain rejection', ''] as const)('native load rejects non-Error %s through actual helper error normalization', async (message) => {
    await mount();
    await pick();
    leaves.load.mockRejectedValue(message);
    invoke(byClass(run(), 'ff-convert-btn'), 'onClick');
    await settleHook();
    expect(text(run())).toContain(message || 'convert failed');
  });
  it('valid native image file without an extension uses actual converter base name', async () => {
    leaves.pick.mockResolvedValue('C:/photo');
    await mount();
    await pick();
    invoke(byClass(run(), 'ff-convert-btn'), 'onClick');
    await settleHook();
    expect(anchor.download).toBe('photo.png');
  });
});
