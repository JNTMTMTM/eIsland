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
 * @file wallpaperContributionLifecycle.test.tsx
 * @description 壁纸贡献真实表单、媒体预览、帧率采样、上传和资源清理的生命周期测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deferred, elements, find, flushEffects, render, resetLifecycle, settle, text, trigger, unmount } from '../../about/test/settingsLifecycleHarness';
import { browser, installMedia } from './contributionMediaHarness';
import type { ReactElement } from 'react';
import type * as UserApi from '../../../../../../../../api/user/userAccountApi';
const {
  WallpaperContributionSection
} = await import('../WallpaperContributionSection');
const io = vi.hoisted(() => ({
  token: ((): string | null => 'token')(),
  upload: vi.fn<typeof UserApi.uploadUserWallpaper>()
}));
vi.mock('../../../../../../../../api/user/userAccountApi', () => ({
  uploadUserWallpaper: io.upload
}));
vi.mock('../../../../../../../../utils/userAccount', () => ({
  readLocalToken: () => io.token
}));
/** 渲染当前真实贡献组件。
 * @returns 真实元素树
 */
function view(): ReactElement {
  return render(WallpaperContributionSection, {});
}
/** 查找真实按钮。
 * @param name - 翻译动作结尾
 * @returns 真实按钮
 */
function button(name: string): ReactElement<Record<string, unknown>> {
  return find(view(), (node) => node.type === 'button' && text(node).endsWith(`.${name}`));
}
/** 调用文件输入的真实变更回调。
 * @param file - 用户选择的文件或取消
 */
async function pick(file: File | null): Promise<void> {
  trigger(find(view(), (node) => node.type === 'input' && node.props.type === 'file'), 'onChange', {
    target: {
      files: file ? [file] : null
    }
  });
  await settle();
  await settle();
  await settle();
  view();
  flushEffects();
}
/** 输入真实表单字段。
 * @param field - 字段占位符结尾
 * @param value - 新值
 */
function fill(field: string, value: string): void {
  trigger(find(view(), (node) => typeof node.props.placeholder === 'string' && node.props.placeholder.endsWith(`.${field}Placeholder`)), 'onChange', {
    target: {
      value
    }
  });
}
/** 填入上传必需的真实版权字段。 */
function validFields(): void {
  fill('title', ' Ocean ');
  fill('description', ' Calm ');
  trigger(find(view(), (node) => typeof node.type === 'function' && node.props.value === '' && 'disabled' in node.props), 'onChange', ' blue ');
  trigger(find(view(), (node) => node.type === 'input' && node.props.type === 'checkbox'), 'onChange', {
    target: {
      checked: true
    }
  });
  fill('copyrightInfo', ' Original ');
}
/** 获取真实文件输入的 ref。
 * @returns 文件输入引用
 */
function inputRef(): {
  current: {
    click: () => void;
    value: string;
  } | null;
} {
  return find(view(), (node) => node.type === 'input' && node.props.type === 'file').props.ref as {
    current: {
      click: () => void;
      value: string;
    } | null;
  };
}
/** 执行真实上传按钮并等待叶请求。 */
async function submit(): Promise<void> {
  trigger(button('upload'), 'onClick');
  await settle();
}
beforeEach(() => {
  resetLifecycle();
  installMedia();
  io.token = 'token';
  io.upload.mockReset();
  io.upload.mockResolvedValue({
    ok: true,
    code: 200,
    message: ''
  });
  view();
  flushEffects();
});
afterEach(() => {
  unmount();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe('Wallpaper contribution media and lifecycle', () => {
  it('opens the attached file input, handles cancellation and resets file input across type changes', async () => {
    trigger(button('typeImage'), 'onClick');
    const click = vi.fn<() => void>();
    inputRef().current = {
      click,
      value: 'chosen'
    };
    trigger(button('chooseFile'), 'onClick');
    expect(click).toHaveBeenCalledOnce();
    await pick(null);
    trigger(button('typeVideo'), 'onClick');
    expect(inputRef().current?.value).toBe('');
    trigger(button('typeImage'), 'onClick');
    inputRef().current = null;
    trigger(button('chooseFile'), 'onClick');
    expect(click).toHaveBeenCalledOnce();
  });
  it('builds all image thumbnail sizes from real media helpers and revokes previews on replacement and unmount', async () => {
    const file = new File(['image'], 'ocean.png', {
      type: 'image/png'
    });
    await pick(file);
    expect(browser.draw.mock.calls.map((args) => args.slice(3))).toEqual([[320, 180], [720, 405], [1280, 720]]);
    expect(elements(view()).filter((node) => node.type === 'img')).toHaveLength(4);
    const previews = elements(view()).filter((node) => node.type === 'img').map((node) => node.props.src);
    await pick(file);
    previews.forEach((url) => expect(browser.revoke).toHaveBeenCalledWith(url));
    unmount();
    expect(browser.revoke).toHaveBeenCalledWith(elements(view()).find((node) => node.type === 'img')?.props.src);
  });
  it.each([{
    width: 80,
    height: 40
  }, {
    width: 80,
    height: 0
  }])('clamps thumbnail dimensions for $width x $height images', async ({
    width,
    height
  }) => {
    browser.imageWidth = width;
    browser.imageHeight = height;
    await pick(new File(['image'], 'ocean.png'));
    expect(browser.draw.mock.calls[0][3]).toBe(80);
    expect(browser.draw.mock.calls[0][4]).toBe(Math.max(1, height));
  });
  it.each([1, 2])('handles image load failure at step %s and revokes the temporary URL', async (number) => {
    browser.imageFailure = number;
    await pick(new File(['image'], 'ocean.png'));
    expect(text(view())).toContain(number === 1 ? '无法读取图片尺寸' : 'image load failed');
    expect(browser.revoke).toHaveBeenCalled();
    expect(button('chooseFile').props.disabled).toBe(false);
  });
  it.each(['context', 'encoding', 'exception'] as const)('handles image thumbnail %s failure', async (kind) => {
    if (kind === 'context') browser.contextFailure = 1;else if (kind === 'encoding') browser.encodeFailure = 1;else browser.drawFailure = 'native failure';
    await pick(new File(['image'], 'ocean.png'));
    expect(text(view())).toContain({
      context: 'canvas context unavailable',
      encoding: 'thumbnail encode failed',
      exception: '.uploadFailed'
    }[kind]);
    expect(browser.revoke).toHaveBeenCalled();
  });
  it.each(['unsupported', 'frames', 'wall', 'same', 'tiny'] as const)('generates video poster and thumbnails with frame sampling mode %s', async (mode) => {
    browser.frameMode = mode;
    trigger(button('typeVideo'), 'onClick');
    await pick(new File(['video'], 'MOVIE.MP4', {
      type: 'video/mp4'
    }));
    expect(elements(view()).filter((node) => node.type === 'img')).toHaveLength(4);
    validFields();
    await submit();
    expect(io.upload.mock.calls[0][1]).toMatchObject({
      type: 'video',
      durationMs: 2000,
      width: 1920,
      height: 1080,
      frameRate: mode === 'frames' || mode === 'wall' ? 30 : undefined
    });
    expect(browser.revoke).toHaveBeenCalled();
  });
  it('ignores play rejection after frame sampling already completed', async () => {
    const task = deferred<void>();
    browser.playPending = task.promise;
    browser.frameMode = 'frames';
    trigger(button('typeVideo'), 'onClick');
    await pick(new File(['video'], 'movie.mp4'));
    expect(browser.pause).toHaveBeenCalledOnce();
    task.reject(new Error('play failed late'));
    await settle();
    expect(browser.pause).toHaveBeenCalledOnce();
    expect(elements(view()).filter((node) => node.type === 'img')).toHaveLength(4);
  });
  it.each(['reject', 'throw'] as const)('falls back when video play %s fails', async (mode) => {
    browser.frameMode = 'manual';
    browser.playMode = mode;
    trigger(button('typeVideo'), 'onClick');
    await pick(new File(['video'], 'movie.mp4'));
    expect(elements(view()).filter((node) => node.type === 'img')).toHaveLength(4);
  });
  it('times out incomplete frame sampling, ignores late callbacks and tolerates pause failures', async () => {
    vi.useFakeTimers();
    installMedia();
    browser.frameMode = 'manual';
    browser.pauseThrows = true;
    trigger(button('typeVideo'), 'onClick');
    const task = pick(new File(['video'], 'movie.mp4'));
    await settle();
    const callback = browser.pendingFrame;
    expect(callback).not.toBeNull();
    await vi.advanceTimersByTimeAsync(1700);
    callback?.(1800, {
      mediaTime: 1
    });
    await task;
    expect(browser.pause).toHaveBeenCalledOnce();
    expect(elements(view()).filter((node) => node.type === 'img')).toHaveLength(4);
  });
  it.each(['load', 'seek', 'posterContext', 'posterEncoding', 'posterImage', 'thumbContext', 'thumbEncoding'] as const)('handles video processing boundary %s', async (kind) => {
    trigger(button('typeVideo'), 'onClick');
    if (kind === 'load') browser.videoFailure = true;
    if (kind === 'seek') browser.seekFailure = true;
    if (kind === 'posterContext') browser.contextFailure = 1;
    if (kind === 'posterEncoding') browser.encodeFailure = 1;
    if (kind === 'posterImage') browser.imageFailure = 1;
    if (kind === 'thumbContext') browser.contextFailure = 2;
    if (kind === 'thumbEncoding') browser.encodeFailure = 2;
    await pick(new File(['video'], 'movie.mp4'));
    if (kind === 'seek') expect(elements(view()).filter((node) => node.type === 'img')).toHaveLength(4);else {expect(text(view())).toContain({
      load: 'video load failed',
      seek: '',
      posterContext: 'canvas context unavailable',
      thumbContext: 'canvas context unavailable',
      posterEncoding: 'poster encode failed',
      posterImage: 'poster load failed',
      thumbEncoding: 'thumbnail encode failed'
    }[kind]);}
    expect(browser.revoke).toHaveBeenCalled();
  });
  it.each([0, Number.NaN])('normalizes unavailable video dimensions and duration %s', async (duration) => {
    trigger(button('typeVideo'), 'onClick');
    browser.videoWidth = 0;
    browser.videoHeight = 0;
    browser.duration = duration;
    await pick(new File(['video'], 'movie.mp4'));
    validFields();
    await submit();
    expect(io.upload.mock.calls[0][1]).toMatchObject({
      durationMs: 1,
      width: 1,
      height: 1
    });
  });
  it('blocks type changes and file picker while generating previews', async () => {
    browser.frameMode = 'manual';
    trigger(button('typeVideo'), 'onClick');
    const task = pick(new File(['video'], 'movie.mp4'));
    await settle();
    expect(text(view())).toContain('.previewGenerating');
    const click = vi.fn();
    inputRef().current = {
      click,
      value: 'chosen'
    };
    trigger(button('chooseVideoFile'), 'onClick');
    trigger(button('typeVideo'), 'onClick');
    trigger(button('typeImage'), 'onClick');
    expect(click).not.toHaveBeenCalled();
    expect(inputRef().current?.value).toBe('chosen');
    browser.pendingFrame?.(0, {
      mediaTime: 0
    });
    browser.pendingFrame?.(1500, {
      mediaTime: 1
    });
    await task;
  });
});
describe('Wallpaper contribution upload validation and cleanup', () => {
  it('requires token, title, file, copyright declaration and copyright text via real form changes', async () => {
    io.token = null;
    await submit();
    expect(io.upload).not.toHaveBeenCalled();
    io.token = 'token';
    await submit();
    expect(text(view())).toContain('.titleRequired');
    fill('title', 'Title');
    await submit();
    expect(text(view())).toContain('.fileRequired');
    await pick(new File(['image'], 'photo.png'));
    await submit();
    expect(text(view())).toContain('.copyrightRequired');
    trigger(find(view(), (node) => node.props.type === 'checkbox'), 'onChange', {
      target: {
        checked: true
      }
    });
    await submit();
    expect(text(view())).toContain('.copyrightInfoRequired');
    fill('copyrightInfo', 'Original');
    trigger(find(view(), (node) => node.props.type === 'checkbox'), 'onChange', {
      target: {
        checked: false
      }
    });
    expect(elements(view()).filter((node) => node.type === 'textarea')).toHaveLength(1);
  });
  it.each(['image', 'video'] as const)('rejects oversized %s files at selection and submission', async (kind) => {
    if (kind === 'video') trigger(button('typeVideo'), 'onClick');
    const file = new File([new Uint8Array((kind === 'image' ? 20 : 100) * 1024 * 1024 + 1)], kind === 'image' ? 'photo.png' : 'movie.mp4');
    await pick(file);
    validFields();
    await submit();
    expect(text(view())).toContain(kind === 'image' ? '.fileTooLarge' : '.videoTooLarge');
    expect(io.upload).not.toHaveBeenCalled();
  });
  it('rejects unsupported videos and missing generated previews without calling upload', async () => {
    trigger(button('typeVideo'), 'onClick');
    await pick(new File(['video'], 'movie.webm'));
    expect(text(view())).toContain('.videoTypeInvalid');
    validFields();
    await submit();
    expect(text(view())).toContain('.uploadFailed');
    expect(io.upload).not.toHaveBeenCalled();
  });
  it('sends trimmed fields, real thumbnail files and progress, disables controls and resets the attached input on success', async () => {
    await pick(new File(['image'], 'photo.png'));
    validFields();
    const click = vi.fn();
    inputRef().current = {
      click,
      value: 'chosen'
    };
    const task = deferred<Awaited<ReturnType<typeof UserApi.uploadUserWallpaper>>>();
    io.upload.mockImplementation((token, payload, options) => {
      void token;
      void payload;
      options?.onUploadProgress?.(120);
      return task.promise;
    });
    trigger(button('upload'), 'onClick');
    await settle();
    expect(text(view())).toContain('100%');
    expect(button('uploading').props.disabled).toBe(true);
    trigger(button('typeImage'), 'onClick');
    trigger(button('typeVideo'), 'onClick');
    trigger(button('chooseFile'), 'onClick');
    expect(click).not.toHaveBeenCalled();
    const [[, payload]] = io.upload.mock.calls;
    expect(payload).toMatchObject({
      title: 'Ocean',
      description: 'Calm',
      tags: 'blue',
      copyrightInfo: 'Original',
      copyrightDeclared: true,
      type: 'image'
    });
    expect(payload.thumb320.name).toBe('thumb-320.jpg');
    expect(payload.thumb720.name).toBe('thumb-720.jpg');
    expect(payload.thumb1280.name).toBe('thumb-1280.jpg');
    task.resolve({
      ok: true,
      code: 200,
      message: ''
    });
    await settle();
    expect(text(view())).toContain('.uploadSuccess');
    expect(inputRef().current?.value).toBe('');
    expect(elements(view()).filter((node) => node.type === 'img')).toHaveLength(0);
    expect(browser.revoke).toHaveBeenCalled();
  });
  it.each(['server failed', ''])('renders failed API response %s and preserves form and previews', async (message) => {
    await pick(new File(['image'], 'photo.png'));
    validFields();
    io.upload.mockResolvedValue({
      message,
      ok: false,
      code: 400
    });
    await submit();
    expect(text(view())).toContain(message || '.uploadFailed');
    expect(elements(view()).filter((node) => node.type === 'img')).toHaveLength(4);
    expect(button('upload').props.disabled).toBe(false);
  });
  it.each([new Error('offline'), 'offline'])('reports thrown upload failure %s and clears busy state', async (failure) => {
    await pick(new File(['image'], 'photo.png'));
    validFields();
    io.upload.mockRejectedValue(failure);
    await submit();
    expect(text(view())).toContain(failure instanceof Error ? failure.message : '.uploadFailed');
    expect(button('upload').props.disabled).toBe(false);
  });
});

describe('Wallpaper contribution event rejection boundary', () => {
  it('keeps the current selection when native preview disposal rejects a replacement', async () => {
    await pick(new File(['image'], 'ocean.png', { type: 'image/png' }));
    const previews = elements(view()).filter((node) => node.type === 'img');
    browser.revoke.mockImplementationOnce(() => {
      throw new Error('native preview disposal failed');
    });

    await pick(new File(['replacement'], 'forest.png', { type: 'image/png' }));

    expect(browser.revoke).toHaveBeenCalledWith(previews[0].props.src);
    expect(elements(view()).filter((node) => node.type === 'img').map((node) => node.props.src))
      .toEqual(previews.map((node) => node.props.src));
    expect(io.upload).not.toHaveBeenCalled();
    expect(text(view())).toContain('ocean.png');
  });
});
