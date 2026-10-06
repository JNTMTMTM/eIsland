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
 * @file useDownloadTasksRuntime.test.ts
 * @description 下载任务 Hook 真实排序、任务事件合并、默认目录、时钟和清理边界测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../calendar/hooks/test/calendarHookHarness';
import { useDownloadTasks } from '../useDownloadTasks';
import type { DownloadTaskSnapshot } from '../../config/downloadToolConfig';
const directory = vi.fn<() => Promise<string>>();
const list = vi.fn<() => Promise<DownloadTaskSnapshot[]>>();
const off = vi.fn();
let update: ((task: DownloadTaskSnapshot) => void) | undefined;
/** 创建原生下载任务快照。
 * @param id - 任务标识
 * @param createdAt - 创建时间
 * @param status - 任务状态
 * @returns 下载任务
 */
function task(id: string, createdAt: number, status: DownloadTaskSnapshot['status'] = 'downloading'): DownloadTaskSnapshot {
  return {
    id,
    createdAt,
    status,
    updatedAt: createdAt,
    url: `https://downloads.test/${  id}`,
    savePath: `C:/Downloads/${  id}`,
    fileName: id,
    totalBytes: 100,
    downloadedBytes: 0,
    progress: 0,
    speedBytesPerSecond: 0,
    estimatedFinishAt: null,
    threads: 1
  };
}
/** 挂载实际 Hook 并完成原生读取。
 */
async function mount(): Promise<void> {
  renderHook(useDownloadTasks);
  flushHookEffects();
  await settleHook();
}
beforeEach(() => {
  unmountHook();
  resetHook();
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(10000);
  directory.mockResolvedValue('C:/Downloads');
  list.mockResolvedValue([]);
  update = undefined;
  vi.stubGlobal('window', {
    setInterval,
    clearInterval,
    api: {
      downloadGetDefaultDir: directory,
      downloadList: list,
      onDownloadTaskUpdated: (listener: typeof update) => {
        update = listener;
        return off;
      }
    }
  });
});
afterEach(() => {
  unmountHook();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('useDownloadTasks runtime', () => {
  it('loads and sorts newest task first, selects first downloading and updates native clock', async () => {
    list.mockResolvedValue([task('old', 1), task('new', 3, 'paused'), task('middle', 2)]);
    await mount();
    expect(renderHook(useDownloadTasks)).toMatchObject({
      defaultDir: 'C:/Downloads',
      nowMs: 10000,
      activeTask: {
        id: 'middle'
      }
    });
    expect(renderHook(useDownloadTasks).tasks.map(({
      id
    }) => id)).toEqual(['new', 'middle', 'old']);
    vi.advanceTimersByTime(1000);
    expect(renderHook(useDownloadTasks).nowMs).toBe(11000);
    unmountHook();
    expect(off).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('native updates replace matching task or prepend unknown task and always maintain creation sort', async () => {
    list.mockResolvedValue([task('first', 1), task('second', 2, 'completed')]);
    await mount();
    update?.(task('first', 4, 'paused'));
    expect(renderHook(useDownloadTasks).tasks.map(({
      id
    }) => id)).toEqual(['first', 'second']);
    expect(renderHook(useDownloadTasks).activeTask).toBeNull();
    update?.(task('third', 3));
    expect(renderHook(useDownloadTasks).tasks.map(({
      id
    }) => id)).toEqual(['first', 'third', 'second']);
    expect(renderHook(useDownloadTasks).activeTask?.id).toBe('third');
    renderHook(useDownloadTasks).setTasks([]);
    expect(renderHook(useDownloadTasks).activeTask).toBeNull();
  });
  it('empty native directory has safe fallback and two native read failures preserve initial state', async () => {
    directory.mockResolvedValue('');
    await mount();
    expect(renderHook(useDownloadTasks).defaultDir).toBe('');
    unmountHook();
    resetHook();
    directory.mockRejectedValue(new Error('directory'));
    list.mockRejectedValue(new Error('list'));
    await mount();
    expect(renderHook(useDownloadTasks)).toMatchObject({
      defaultDir: '',
      tasks: [],
      activeTask: null
    });
  });
  it('native null list payload uses guarded empty fallback', async () => {
    list.mockImplementation(() => Promise.resolve(null as unknown as DownloadTaskSnapshot[]));
    await mount();
    expect(renderHook(useDownloadTasks).tasks).toEqual([]);
  });
  it('late directory/list replies after cleanup do not mutate disposed state or create timers', async () => {
    const path = deferred<string>();
    const tasks = deferred<DownloadTaskSnapshot[]>();
    directory.mockReturnValue(path.promise);
    list.mockReturnValue(tasks.promise);
    renderHook(useDownloadTasks);
    flushHookEffects();
    unmountHook();
    path.resolve('late');
    tasks.resolve([task('late', 4)]);
    await settleHook();
    expect(renderHook(useDownloadTasks)).toMatchObject({
      defaultDir: '',
      tasks: []
    });
    expect(off).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
