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
 * @file mergePartFilesSupplement.test.ts
 * @description 下载分片合并的顺序、流失败与标准 URL 及 DOMException 边界测试。
 * @author 鸡哥
 */

import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { inferFileNameFromUrl, isAbortError, mergePartFiles } from '..';

const io = vi.hoisted(() => ({
  rm: vi.fn<(path: string, options: { force: boolean }) => Promise<void>>(),
  read: vi.fn<(path: string) => unknown>(),
  write: vi.fn<(path: string, options: { flags: string }) => unknown>(),
  pipeline: vi.fn<(...arguments_: unknown[]) => Promise<void>>(),
}));
vi.mock('fs', () => ({ createReadStream: io.read, createWriteStream: io.write }));
vi.mock('fs/promises', () => ({ rm: io.rm }));
vi.mock('stream/promises', () => ({ pipeline: io.pipeline }));

/**
 * 在独立事件流上安装可控 end 行为。
 * @param error - 结束写入失败。
 * @returns 写入流。
 */
function createOutput(error?: Error): EventEmitter & { end: (callback: () => void) => void } {
  const stream = new EventEmitter();
  return Object.assign(stream, {
    end(callback: () => void): void {
      queueMicrotask(() => {
        if (error) stream.emit('error', error);
        else callback();
      });
    },
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  io.rm.mockResolvedValue();
  io.pipeline.mockResolvedValue();
  io.read.mockImplementation((path) => ({ fixturePath: path }));
  io.write.mockReturnValue(createOutput());
});
afterEach(() => vi.restoreAllMocks());

describe('下载合并与标准 URL/错误工具边界', () => {
  it('按分片顺序写入同一输出且每次保留流开放', async () => {
    await mergePartFiles(['fixture-part-0', 'fixture-part-1'], 'fixture-result');
    expect(io.rm).toHaveBeenCalledWith('fixture-result', { force: true });
    expect(io.write).toHaveBeenCalledWith('fixture-result', { flags: 'w' });
    expect(io.pipeline.mock.calls).toEqual([
      [{ fixturePath: 'fixture-part-0' }, io.write.mock.results[0]?.value, { end: false }],
      [{ fixturePath: 'fixture-part-1' }, io.write.mock.results[0]?.value, { end: false }],
    ]);
  });
  it('不存在分片时也结束输出流', async () => {
    await expect(mergePartFiles([], 'fixture-result')).resolves.toBeUndefined();
    expect(io.pipeline).not.toHaveBeenCalled();
    expect(io.write).toHaveBeenCalledOnce();
  });
  it('忽略旧输出清理失败后仍合并', async () => {
    io.rm.mockRejectedValue(new Error('locked'));
    await expect(mergePartFiles(['fixture-part'], 'fixture-result')).resolves.toBeUndefined();
    expect(io.pipeline).toHaveBeenCalledOnce();
  });
  it('写入流结束错误传递给调用者', async () => {
    io.write.mockReturnValue(createOutput(new Error('flush failed')));
    await expect(mergePartFiles(['fixture-part'], 'fixture-result')).rejects.toThrow('flush failed');
  });
  it('管道失败不继续后续分片', async () => {
    io.pipeline.mockRejectedValueOnce(new Error('read failed'));
    await expect(mergePartFiles(['fixture-part-0', 'fixture-part-1'], 'fixture-result')).rejects.toThrow('read failed');
    expect(io.read).toHaveBeenCalledTimes(1);
  });
  it('真实空 pathname URL 使用默认文件名', () => {
    expect(new URL('data:').pathname).toBe('');
    expect(inferFileNameFromUrl(new URL('data:'))).toMatch(/^download-\d+\.bin$/);
  });
  it.each(['AbortError', 'NetworkError'])('DOMException %s 按名称判断中止', (name) => {
    expect(isAbortError(new DOMException('fixture', name))).toBe(name === 'AbortError');
  });
});
