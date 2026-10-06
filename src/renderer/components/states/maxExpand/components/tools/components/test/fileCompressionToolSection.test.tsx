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
 * @file fileCompressionToolSection.test.tsx
 * @description 验证图片压缩的输入、任务状态、历史操作和异步清理。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushEffects, nodes, render, text, value } from '../../../../test/componentHarness';
import { FileCompressionToolSection } from '../FileCompressionToolSection';
import { fire } from './toolTestEvents';
import type { ImageCompressionStartPayload, ImageCompressionStartResult, ImageCompressionTask as CompressionTask } from '../../../../../../../../preload/types';

const mocks = vi.hoisted(() => ({
  pick: vi.fn<() => Promise<string[]>>(),
  output: vi.fn<() => Promise<string | null>>(),
  start: vi.fn<(payload: ImageCompressionStartPayload) => Promise<ImageCompressionStartResult>>(),
  list: vi.fn<() => Promise<CompressionTask[]>>(),
  subscribe: vi.fn<(callback: (task: CompressionTask) => void) => () => void>(),
  remove: vi.fn<(id: string) => Promise<boolean>>(),
  open: vi.fn<(path: string) => Promise<boolean>>(), unsubscribe: vi.fn(),
}));

/**
 * 构造压缩结果。
 * @param id - 唯一任务标识。
 * @param success - 是否压缩成功。
 * @param createdAt - 任务创建时间。
 * @returns 完整的压缩状态快照。
 */
function task(id: string, success: boolean, createdAt = 10): CompressionTask {
  return { id, success, createdAt, fileName: '', inputPath: '/input/a.png', outputPath: success ? '/output/a.png' : '',
    quality: 80, status: success ? 'completed' : 'failed', originalBytes: 2048, compressedBytes: 1024,
    ratio: 0.5, error: success ? undefined : 'unsupported', updatedAt: 20 };
}

describe('FileCompressionToolSection', () => {
  const setFileCompressionPage = vi.fn();
  beforeEach(() => {
    mocks.pick.mockResolvedValue(['/input/a.png', '/input/b.jpg']);
    mocks.output.mockResolvedValue('/output');
    mocks.start.mockResolvedValue({ ok: true, results: [task('a', true), task('b', false, 20)] });
    mocks.list.mockResolvedValue([]);
    mocks.subscribe.mockReturnValue(mocks.unsubscribe);
    mocks.remove.mockResolvedValue(true);
    mocks.open.mockResolvedValue(true);
    vi.stubGlobal('window', { api: {
      imageCompressionPickImages: mocks.pick, imageCompressionPickOutputDir: mocks.output, imageCompressionStart: mocks.start,
      imageCompressionList: mocks.list, onImageCompressionTaskUpdated: mocks.subscribe, imageCompressionRemove: mocks.remove,
      openInExplorer: mocks.open,
    } });
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('没有图片时不能压缩，选择图片和输出目录后按质量启动', async () => {
    const input = { setFileCompressionPage, fileCompressionPage: 'imageCompression' };
    let tree = render(FileCompressionToolSection, input);
    expect(value(tree, '.download-start-btn-full', 'disabled')).toBe(true);
    fire(tree, '.download-start-btn-full', 'onClick');
    expect(mocks.start).not.toHaveBeenCalled();
    fire(tree, '.settings-lyrics-source-btn', 'onClick');
    await vi.waitFor(() => { expect(text(render(FileCompressionToolSection, input))).toContain('"count":2'); });
    tree = render(FileCompressionToolSection, input);
    fire(tree, '.settings-lyrics-source-btn', 'onClick', 1);
    await vi.waitFor(() => { expect(value(render(FileCompressionToolSection, input), '.download-save-path-input', 'value')).toBe('/output'); });
    fire(tree, '.settings-slider', 'onChange', 0, { target: { value: '100' } });
    fire(render(FileCompressionToolSection, input), '.download-start-btn-full', 'onClick');
    await vi.waitFor(() => { expect(text(render(FileCompressionToolSection, input))).toContain('messages.done'); });
    expect(mocks.start).toHaveBeenCalledWith({ inputPaths: ['/input/a.png', '/input/b.jpg'], outputDir: '/output', quality: 100 });
    expect(text(render(FileCompressionToolSection, input))).toContain('noImages');
    const history = render(FileCompressionToolSection, { setFileCompressionPage, fileCompressionPage: 'history' });
    expect(nodes(history, '.download-task-card')).toHaveLength(2);
    expect(text(nodes(history, '.download-task-card')[0])).toContain('resultFailed');
    expect(text(history)).toContain('"ratio":"50.0%"');
    expect(text(history)).toContain('"success":1');
  });

  it('执行中展示待压缩列表、禁用按钮并防止重复启动', async () => {
    const input = { setFileCompressionPage, fileCompressionPage: 'imageCompression' };
    fire(render(FileCompressionToolSection, input), '.settings-lyrics-source-btn', 'onClick');
    await vi.waitFor(() => { expect(text(render(FileCompressionToolSection, input))).toContain('"count":2'); });
    const deferred = Promise.withResolvers<ImageCompressionStartResult>();
    mocks.start.mockReturnValue(deferred.promise);
    fire(render(FileCompressionToolSection, input), '.download-start-btn-full', 'onClick');
    let tree = render(FileCompressionToolSection, input);
    expect(value(tree, '.download-start-btn-full', 'disabled')).toBe(true);
    expect(text(nodes(tree, '.file-compression-path-list')[0])).toBe('a.pngb.jpg');
    fire(tree, '.download-start-btn-full', 'onClick');
    expect(mocks.start).toHaveBeenCalledOnce();
    deferred.reject(new Error('offline'));
    await vi.waitFor(() => { expect(text(render(FileCompressionToolSection, input))).toContain('messages.startFailed'); });
    tree = render(FileCompressionToolSection, input);
    expect(value(tree, '.download-start-btn-full', 'disabled')).toBe(false);
    expect(nodes(tree, '.file-compression-path-list')).toHaveLength(0);
  });

  it('取消选择不改变图片，选择失败及服务端拒绝提供提示', async () => {
    const input = { setFileCompressionPage, fileCompressionPage: 'imageCompression' };
    mocks.pick.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('dialog failed'));
    fire(render(FileCompressionToolSection, input), '.settings-lyrics-source-btn', 'onClick');
    await vi.waitFor(() => { expect(mocks.pick).toHaveBeenCalledOnce(); });
    expect(value(render(FileCompressionToolSection, input), '.download-start-btn-full', 'disabled')).toBe(true);
    fire(render(FileCompressionToolSection, input), '.settings-lyrics-source-btn', 'onClick');
    await vi.waitFor(() => { expect(text(render(FileCompressionToolSection, input))).toContain('messages.pickFailed'); });
    fire(render(FileCompressionToolSection, input), '.settings-lyrics-source-btn', 'onClick');
    await vi.waitFor(() => { expect(text(render(FileCompressionToolSection, input))).toContain('"count":2'); });
    mocks.start.mockResolvedValue({ ok: false, message: 'server refused' });
    fire(render(FileCompressionToolSection, input), '.download-start-btn-full', 'onClick');
    await vi.waitFor(() => { expect(text(render(FileCompressionToolSection, input))).toContain('server refused'); });
  });

  it('历史加载和更新去重排序，成功记录可打开并删除，卸载清理订阅', async () => {
    const input = { setFileCompressionPage, fileCompressionPage: 'history' };
    mocks.list.mockResolvedValue([task('older', true, 10), task('newer', false, 20)]);
    const initial = render(FileCompressionToolSection, input);
    expect(text(initial)).toContain('resultsEmpty');
    const cleanups = flushEffects();
    await vi.waitFor(() => { expect(nodes(render(FileCompressionToolSection, input), '.download-task-card')).toHaveLength(2); });
    const [[update]] = mocks.subscribe.mock.calls;
    update(task('older', true, 30));
    let tree = render(FileCompressionToolSection, input);
    expect(nodes(tree, '.download-task-card')).toHaveLength(2);
    let [actions] = nodes(tree, '.download-task-actions');
    fire(actions, 'button', 'onClick', 0);
    await vi.waitFor(() => { expect(mocks.open).toHaveBeenCalledWith('/output/a.png'); });
    fire(actions, 'button', 'onClick', 1);
    await vi.waitFor(() => { expect(nodes(render(FileCompressionToolSection, input), '.download-task-card')).toHaveLength(1); });
    tree = render(FileCompressionToolSection, input);
    [actions] = nodes(tree, '.download-task-actions');
    expect(nodes(actions, 'button')).toHaveLength(1);
    mocks.remove.mockResolvedValue(false);
    fire(actions, 'button', 'onClick');
    await vi.waitFor(() => { expect(mocks.remove).toHaveBeenCalledTimes(2); });
    expect(nodes(render(FileCompressionToolSection, input), '.download-task-card')).toHaveLength(1);
    cleanups.forEach((cleanup) => { cleanup(); });
    expect(mocks.unsubscribe).toHaveBeenCalledOnce();
  });

  it('卸载后的初始读取不会再填充任务列表，导航按钮切换页面', async () => {
    const pending = Promise.withResolvers<CompressionTask[]>();
    mocks.list.mockReturnValue(pending.promise);
    const input = { setFileCompressionPage, fileCompressionPage: 'history' };
    const tree = render(FileCompressionToolSection, input);
    const cleanups = flushEffects();
    cleanups.forEach((cleanup) => { cleanup(); });
    pending.resolve([task('ignored', true)]);
    await pending.promise;
    expect(nodes(render(FileCompressionToolSection, input), '.download-task-card')).toHaveLength(0);
    fire(tree, '.settings-app-page-dot', 'onClick');
    expect(setFileCompressionPage).toHaveBeenCalledWith('imageCompression');
  });
});
