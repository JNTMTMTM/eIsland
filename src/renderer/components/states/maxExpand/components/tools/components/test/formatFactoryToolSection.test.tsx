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
 * @file formatFactoryToolSection.test.tsx
 * @description 验证图片格式转换、元数据、进度及音视频轨道提取分支。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nodes, render, text, value } from '../../../../test/componentHarness';
import { FormatFactoryToolSection } from '../FormatFactoryToolSection';
import { fire, fireAsync } from './toolTestEvents';
import type { ExtractVideoTrackOptions, ExtractVideoTrackResult, PickVideoForExtractResult } from '../../../../../../../../preload/types';
import type { convertImageInRenderer, ConvertImageInRendererResult } from '../../utils/imageConverter';

const mocks = vi.hoisted(() => ({
  pick: vi.fn<() => Promise<string | null>>(), preview: vi.fn<() => Promise<string | null>>(),
  stat: vi.fn<() => Promise<{ size: number } | null>>(), convert: vi.fn<typeof convertImageInRenderer>(),
  pickVideo: vi.fn<() => Promise<PickVideoForExtractResult | null>>(),
  extract: vi.fn<(input: ExtractVideoTrackOptions) => Promise<ExtractVideoTrackResult>>(),
}));
vi.mock('../../utils/imageConverter', () => ({ convertImageInRenderer: mocks.convert }));

describe('FormatFactoryToolSection', () => {
  const setFormatFactoryPage = vi.fn();
  const imageInput = { setFormatFactoryPage, formatFactoryPage: 'image' };
  const videoInput = { setFormatFactoryPage, formatFactoryPage: 'video' };
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.pick.mockResolvedValue('C:\\input\\photo.PNG');
    mocks.preview.mockResolvedValue('data:image/png;base64,AAAA');
    mocks.stat.mockResolvedValue({ size: 2048 });
    mocks.convert.mockResolvedValue({ success: true, outputPath: '/output/photo.jpg', fileSize: 1024 });
    mocks.pickVideo.mockResolvedValue({ filePath: '/input/movie.MP4', fileSize: 4096 });
    mocks.extract.mockResolvedValue({ success: true, outputPath: '/output/track.mp3' });
    vi.stubGlobal('window', { api: { pickFileForHash: mocks.pick, loadWallpaperFile: mocks.preview,
      getFileStat: mocks.stat, pickVideoForExtract: mocks.pickVideo, extractVideoTrack: mocks.extract },
    setInterval: globalThis.setInterval, clearInterval: globalThis.clearInterval, setTimeout: globalThis.setTimeout });
  });
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('没有文件时禁用转换，选取PNG时自动切换目标格式并展示图片信息', async () => {
    let tree = render(FormatFactoryToolSection, imageInput);
    expect(value(tree, '.ff-convert-btn', 'disabled')).toBe(true);
    await fireAsync(tree, '.ff-convert-btn', 'onClick');
    expect(mocks.convert).not.toHaveBeenCalled();
    await fireAsync(tree, '.file-hash-pick-btn', 'onClick');
    tree = render(FormatFactoryToolSection, imageInput);
    expect(text(tree)).toContain('photo.PNG');
    expect(text(tree)).toContain('image/png');
    expect(text(tree)).toContain('2.0 KB');
    expect(value(tree, '.file-hash-algo-btn', 'disabled', 0)).toBe(true);
    expect(value(tree, '.file-hash-algo-btn', 'className', 1)).toContain('active');
    fire(tree, 'img', 'onLoad', 0, { currentTarget: { naturalWidth: 400, naturalHeight: 200 } });
    tree = render(FormatFactoryToolSection, imageInput);
    expect(text(tree)).toContain('400 × 200');
    expect(text(tree)).toContain('2:1');
    expect(text(tree)).toContain('80,000 px');
  });

  it('ICO目标显示可选尺寸并传递选中尺寸，成功结果显示大小', async () => {
    await fireAsync(render(FormatFactoryToolSection, imageInput), '.file-hash-pick-btn', 'onClick');
    fire(render(FormatFactoryToolSection, imageInput), '.file-hash-algo-btn', 'onClick', 4);
    let tree = render(FormatFactoryToolSection, imageInput);
    expect(nodes(tree, '.file-hash-algo-btn')).toHaveLength(10);
    fire(tree, '.file-hash-algo-btn', 'onClick', 8);
    await fireAsync(render(FormatFactoryToolSection, imageInput), '.ff-convert-btn', 'onClick');
    expect(mocks.convert).toHaveBeenCalledWith({ filePath: 'C:\\input\\photo.PNG', targetFormat: 'ico', icoSize: 128, quality: 1 });
    tree = render(FormatFactoryToolSection, imageInput);
    expect(text(tree)).toContain('image.success');
    expect(text(tree)).toContain('1.0 KB');
    expect(value(tree, '.ff-convert-progress-fill', 'style')).toEqual({ width: '100%' });
    await vi.advanceTimersByTimeAsync(700);
    expect(nodes(render(FormatFactoryToolSection, imageInput), '.ff-convert-progress')).toHaveLength(0);
  });

  it('预览统计失败时使用Base64估算大小，取消或异常选取保留原图', async () => {
    mocks.stat.mockRejectedValue(new Error('no stat'));
    await fireAsync(render(FormatFactoryToolSection, imageInput), '.file-hash-pick-btn', 'onClick');
    expect(text(render(FormatFactoryToolSection, imageInput))).toContain('3 B');
    mocks.pick.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('dialog failed'));
    await fireAsync(render(FormatFactoryToolSection, imageInput), '.file-hash-pick-btn', 'onClick');
    await fireAsync(render(FormatFactoryToolSection, imageInput), '.file-hash-pick-btn', 'onClick');
    expect(value(render(FormatFactoryToolSection, imageInput), 'img', 'alt')).toBe('photo.PNG');
  });

  it('图片转换挂起时呈现加载状态和进度，重复操作不启动第二次任务', async () => {
    await fireAsync(render(FormatFactoryToolSection, imageInput), '.file-hash-pick-btn', 'onClick');
    const deferred = Promise.withResolvers<ConvertImageInRendererResult>();
    mocks.convert.mockReturnValue(deferred.promise);
    const pending = fireAsync(render(FormatFactoryToolSection, imageInput), '.ff-convert-btn', 'onClick');
    let tree = render(FormatFactoryToolSection, imageInput);
    expect(nodes(tree, '.ff-convert-spinner')).toHaveLength(1);
    expect(value(tree, '.ff-convert-btn', 'disabled')).toBe(true);
    await fireAsync(tree, '.ff-convert-btn', 'onClick');
    expect(mocks.convert).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(10000);
    expect(value(render(FormatFactoryToolSection, imageInput), '.ff-convert-progress-fill', 'style')).toEqual({ width: '92%' });
    deferred.reject(new Error('offline'));
    await pending;
    tree = render(FormatFactoryToolSection, imageInput);
    expect(text(tree)).toContain('image.failed');
    expect(nodes(tree, '.mismatch')).toHaveLength(1);
    expect(value(tree, '.ff-convert-btn', 'disabled')).toBe(false);
  });

  it('转换服务返回具体错误时保留该错误，选择新文件清空结果与预览', async () => {
    await fireAsync(render(FormatFactoryToolSection, imageInput), '.file-hash-pick-btn', 'onClick');
    mocks.convert.mockResolvedValue({ success: false, error: 'unsupported' });
    await fireAsync(render(FormatFactoryToolSection, imageInput), '.ff-convert-btn', 'onClick');
    expect(text(render(FormatFactoryToolSection, imageInput))).toContain('unsupported');
    mocks.pick.mockResolvedValue('/input/new');
    mocks.preview.mockResolvedValue(null);
    await fireAsync(render(FormatFactoryToolSection, imageInput), '.file-hash-pick-btn', 'onClick');
    expect(nodes(render(FormatFactoryToolSection, imageInput), '.file-hash-verify')).toHaveLength(0);
    expect(nodes(render(FormatFactoryToolSection, imageInput), '.ff-preview-area')).toHaveLength(0);
  });

  it.each(['audio', 'video'] as const)('视频提取 $track传递选中的轨道及输出格式', async (track) => {
    await fireAsync(render(FormatFactoryToolSection, videoInput), '.file-hash-pick-btn', 'onClick');
    let tree = render(FormatFactoryToolSection, videoInput);
    expect(text(tree)).toContain('movie.MP4');
    expect(text(tree)).toContain('4.0 KB');
    if (track === 'video') fire(tree, '.file-hash-algo-btn', 'onClick', 1);
    tree = render(FormatFactoryToolSection, videoInput);
    fire(tree, '.file-hash-algo-btn', 'onClick', 3);
    await fireAsync(render(FormatFactoryToolSection, videoInput), '.ff-convert-btn', 'onClick');
    expect(mocks.extract).toHaveBeenCalledWith({ filePath: '/input/movie.MP4', trackType: track, outputFormat: track === 'audio' ? 'aac' : 'mkv' });
    expect(text(render(FormatFactoryToolSection, videoInput))).toContain('video.success');
  });

  it('取消视频保存不显示失败，服务异常显示失败并恢复按钮', async () => {
    const empty = render(FormatFactoryToolSection, videoInput);
    expect(value(empty, '.ff-convert-btn', 'disabled')).toBe(true);
    await fireAsync(empty, '.ff-convert-btn', 'onClick');
    expect(mocks.extract).not.toHaveBeenCalled();
    await fireAsync(empty, '.file-hash-pick-btn', 'onClick');
    mocks.extract.mockResolvedValue({ success: false, error: 'canceled' });
    await fireAsync(render(FormatFactoryToolSection, videoInput), '.ff-convert-btn', 'onClick');
    expect(nodes(render(FormatFactoryToolSection, videoInput), '.file-hash-verify')).toHaveLength(0);
    mocks.extract.mockRejectedValue(new Error('offline'));
    await fireAsync(render(FormatFactoryToolSection, videoInput), '.ff-convert-btn', 'onClick');
    expect(text(render(FormatFactoryToolSection, videoInput))).toContain('video.failed');
    expect(value(render(FormatFactoryToolSection, videoInput), '.ff-convert-btn', 'disabled')).toBe(false);
    fire(render(FormatFactoryToolSection, videoInput), '.settings-app-page-dot', 'onClick');
    expect(setFormatFactoryPage).toHaveBeenCalledWith('image');
  });
});
