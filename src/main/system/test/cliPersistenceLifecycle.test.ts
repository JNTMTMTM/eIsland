/* eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM, pyisland.com. GPL-3.0-or-later.
 */
/** @file cliPersistenceLifecycle.test.ts
 * @description 覆盖写泵微任务尾窗与迁移 Worker 的超时/取消归属。
 * @author 鸡哥
 */
import { EventEmitter } from 'events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const io = vi.hoisted(() => ({ write: vi.fn(), rename: vi.fn(), workers: [] as Array<EventEmitter & { terminate: ReturnType<typeof vi.fn> }> }));
vi.mock('fs/promises', () => ({ mkdir: async () => {}, writeFile: io.write, rename: io.rename }));
vi.mock('worker_threads', async () => {
  const { EventEmitter: Emitter } = await import('events');
  return { Worker: class extends Emitter {
    terminate = vi.fn(async () => 0);
    /** 保存仅供测试触发消息的模拟 Worker，不执行真实进程。 */
    constructor() { super(); io.workers.push(this); }
  } };
});
import { createCliSnapshotWriter } from '../cliEventDetails';
import { loadCliState } from '../cliStateLoader';
beforeEach(() => { vi.resetAllMocks(); io.workers.length = 0; io.write.mockResolvedValue(undefined); io.rename.mockResolvedValue(undefined); });
afterEach(() => vi.useRealTimers());
describe('CLI persistence lifecycle', () => {
  it('drains a value queued between the final rename continuation and promise settlement', async () => {
    const write = createCliSnapshotWriter('fixture-index');
    let late: Promise<boolean> | undefined;
    io.rename.mockImplementationOnce(async () => {
      // 第一层让 rename 恢复，第二层命中旧实现 .catch/.finally 尚未清空 writing 的窗口。
      queueMicrotask(() => queueMicrotask(() => { late = write({ version: 'last' }); }));
    });
    await write({ version: 'first' }); await late;
    expect(JSON.parse(io.write.mock.lastCall![1])).toEqual({ version: 'last' });
  });
  it('terminates a stalled migration after a hard deadline and ignores a later message', async () => {
    vi.useFakeTimers(); const request = loadCliState('fixture', 'details');
    const rejected = expect(request).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(30000); await rejected;
    expect(io.workers[0].terminate).toHaveBeenCalledOnce(); io.workers[0].emit('message', { version: 2 });
  });
  it('aborting migration terminates its worker and success clears its deadline', async () => {
    vi.useFakeTimers(); const controller = new AbortController();
    const request = loadCliState('fixture', 'details', controller.signal);
    const rejected = expect(request).rejects.toThrow('cancelled'); controller.abort(); await rejected;
    expect(io.workers[0].terminate).toHaveBeenCalledOnce();
    const success = loadCliState('fixture', 'details'); io.workers[1].emit('message', { version: 2 });
    await expect(success).resolves.toEqual({ version: 2 });
    await vi.advanceTimersByTimeAsync(30000); expect(io.workers[1].terminate).not.toHaveBeenCalled();
  });
});
