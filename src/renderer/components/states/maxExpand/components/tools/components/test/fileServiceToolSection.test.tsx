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
 * @file fileServiceToolSection.test.tsx
 * @description 验证文件选择、哈希算法、比较结果、文件大小和复制交互。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nodes, render, text, value } from '../../../../test/componentHarness';
import { FileServiceToolSection } from '../FileServiceToolSection';
import { fire, fireAsync } from './toolTestEvents';

interface HashResult { hash: string; fileSize: number; }
const pick = vi.fn<() => Promise<string | null>>();
const compute = vi.fn<(file: string, algorithm: string) => Promise<HashResult | null>>();
const copy = vi.fn<(hash: string) => Promise<void>>();

describe('FileServiceToolSection', () => {
  beforeEach(() => {
    pick.mockResolvedValue('C:\\files\\sample.bin');
    compute.mockResolvedValue({ hash: 'ABCDEF', fileSize: 2048 });
    copy.mockResolvedValue(undefined);
    vi.stubGlobal('window', { api: { pickFileForHash: pick, computeFileHash: compute } });
    vi.stubGlobal('navigator', { clipboard: { writeText: copy } });
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('没有文件时禁用计算，选择文件后可以切换算法', async () => {
    let tree = render(FileServiceToolSection);
    expect(value(tree, '.download-start-btn-full', 'disabled')).toBe(true);
    await fireAsync(tree, '.download-start-btn-full', 'onClick');
    expect(compute).not.toHaveBeenCalled();
    await fireAsync(tree, '.file-hash-pick-btn', 'onClick');
    tree = render(FileServiceToolSection);
    expect(text(tree)).toContain('sample.bin');
    expect(value(tree, '.file-hash-filename', 'title')).toBe('C:\\files\\sample.bin');
    fire(tree, '.file-hash-algo-btn', 'onClick', 0);
    await fireAsync(render(FileServiceToolSection), '.download-start-btn-full', 'onClick');
    expect(compute).toHaveBeenCalledWith('C:\\files\\sample.bin', 'md5');
  });

  it.each([
    { expected: ' abcdef ', matches: true },
    { expected: 'different', matches: false },
    { expected: '  ', matches: null },
  ])('预期哈希 $expected采用不区分大小写和空白的比较', async ({ expected, matches }) => {
    await fireAsync(render(FileServiceToolSection), '.file-hash-pick-btn', 'onClick');
    fire(render(FileServiceToolSection), 'input', 'onChange', 0, { target: { value: expected } });
    await fireAsync(render(FileServiceToolSection), '.download-start-btn-full', 'onClick');
    let tree = render(FileServiceToolSection);
    expect(value(tree, '.file-hash-result-value', 'children')).toBe('ABCDEF');
    expect(value(tree, '.file-hash-result-size', 'children')).toBe('2.0 KB');
    expect(nodes(tree, '.file-hash-verify')).toHaveLength(matches === null ? 0 : 1);
    if (matches !== null) expect(value(tree, '.file-hash-verify', 'className')).toContain(matches ? 'match' : 'mismatch');
    fire(tree, '.file-hash-copy-btn', 'onClick');
    expect(copy).toHaveBeenCalledWith('ABCDEF');
    fire(tree, 'input', 'onChange', 0, { target: { value: 'new expected' } });
    tree = render(FileServiceToolSection);
    expect(nodes(tree, '.file-hash-verify')).toHaveLength(0);
  });

  it.each([
    { fileSize: 100, label: '100 B' },
    { fileSize: 1024 * 1024, label: '1.00 MB' },
    { fileSize: 1024 * 1024 * 1024, label: '1.00 GB' },
  ])('文件大小 $label按单位展示', async ({ fileSize, label }) => {
    compute.mockResolvedValue({ fileSize, hash: 'hash' });
    await fireAsync(render(FileServiceToolSection), '.file-hash-pick-btn', 'onClick');
    await fireAsync(render(FileServiceToolSection), '.download-start-btn-full', 'onClick');
    expect(value(render(FileServiceToolSection), '.file-hash-result-size', 'children')).toBe(label);
  });

  it('挂起计算禁用按钮且拒绝重复调用，失败后清理加载状态', async () => {
    await fireAsync(render(FileServiceToolSection), '.file-hash-pick-btn', 'onClick');
    const pendingHash = Promise.withResolvers<HashResult>();
    compute.mockReturnValue(pendingHash.promise);
    const pending = fireAsync(render(FileServiceToolSection), '.download-start-btn-full', 'onClick');
    expect(text(render(FileServiceToolSection))).toContain('hash.computing');
    await fireAsync(render(FileServiceToolSection), '.download-start-btn-full', 'onClick');
    expect(compute).toHaveBeenCalledOnce();
    pendingHash.reject(new Error('offline'));
    await pending;
    expect(value(render(FileServiceToolSection), '.download-start-btn-full', 'disabled')).toBe(false);
    expect(nodes(render(FileServiceToolSection), '.file-hash-result')).toHaveLength(0);
  });

  it('选文件取消或异常保持原文件，选新文件清空旧哈希', async () => {
    await fireAsync(render(FileServiceToolSection), '.file-hash-pick-btn', 'onClick');
    await fireAsync(render(FileServiceToolSection), '.download-start-btn-full', 'onClick');
    pick.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('canceled'));
    await fireAsync(render(FileServiceToolSection), '.file-hash-pick-btn', 'onClick');
    await fireAsync(render(FileServiceToolSection), '.file-hash-pick-btn', 'onClick');
    expect(nodes(render(FileServiceToolSection), '.file-hash-result')).toHaveLength(1);
    pick.mockResolvedValue('/next/new.bin');
    await fireAsync(render(FileServiceToolSection), '.file-hash-pick-btn', 'onClick');
    expect(nodes(render(FileServiceToolSection), '.file-hash-result')).toHaveLength(0);
    expect(text(render(FileServiceToolSection))).toContain('new.bin');
  });

  it.each(['file', 'algorithm'])('计算中更换%s后不把旧请求结果显示在新选择下', async (changed) => {
    await fireAsync(render(FileServiceToolSection), '.file-hash-pick-btn', 'onClick');
    const result = Promise.withResolvers<HashResult>();
    compute.mockReturnValueOnce(result.promise);
    const pending = fireAsync(render(FileServiceToolSection), '.download-start-btn-full', 'onClick');
    if (changed === 'file') {
      pick.mockResolvedValueOnce('C:/files/next.bin');
      await fireAsync(render(FileServiceToolSection), '.file-hash-pick-btn', 'onClick');
    } else fire(render(FileServiceToolSection), '.file-hash-algo-btn', 'onClick', 0);
    result.resolve({ hash: 'old-sha256', fileSize: 10 });
    await pending;
    expect(nodes(render(FileServiceToolSection), '.file-hash-result')).toHaveLength(0);
    await fireAsync(render(FileServiceToolSection), '.download-start-btn-full', 'onClick');
    expect(compute).toHaveBeenLastCalledWith(changed === 'file' ? 'C:/files/next.bin' : 'C:\\files\\sample.bin', changed === 'algorithm' ? 'md5' : 'sha256');
    expect(text(render(FileServiceToolSection))).toContain('ABCDEF');
  });

  it('计算结果按完成时的预期值校验，不复用提交时的旧输入', async () => {
    await fireAsync(render(FileServiceToolSection), '.file-hash-pick-btn', 'onClick');
    fire(render(FileServiceToolSection), 'input', 'onChange', 0, { target: { value: 'outdated' } });
    const result = Promise.withResolvers<HashResult>();
    compute.mockReturnValueOnce(result.promise);
    const pending = fireAsync(render(FileServiceToolSection), '.download-start-btn-full', 'onClick');
    fire(render(FileServiceToolSection), 'input', 'onChange', 0, { target: { value: ' abcdef ' } });
    await render(FileServiceToolSection);
    result.resolve({ hash: 'ABCDEF', fileSize: 10 });
    await pending;
    expect(value(render(FileServiceToolSection), '.file-hash-verify', 'className')).toContain('match');
  });

  it('缺少文件名的原生返回仍保留可识别的完整路径', async () => {
    pick.mockResolvedValueOnce('C:/');
    await fireAsync(render(FileServiceToolSection), '.file-hash-pick-btn', 'onClick');
    expect(text(render(FileServiceToolSection))).toContain('C:/');
  });
});
