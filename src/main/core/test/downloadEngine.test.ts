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
 * @file downloadEngine.test.ts
 * @description MultiThreadDownloadEngine 单元测试。
 * @author 鸡哥
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const {
  mockRandomUUID,
  mockExistsSync,
  mockMkdir,
  mockOpen,
  mockRename,
  mockRm,
  mockStat,
  mockUnlink,
  mockBasename,
  mockDirname,
  mockExtname,
  mockJoin,
  mockBuildChunks,
  mockInferFileNameFromUrl,
  mockIsAbortError,
  mockMergePartFiles,
  mockNormalizeThreads,
  mockParseContentDispositionFileName,
  mockSafeFileName,
} = vi.hoisted(() => ({
  mockRandomUUID: vi.fn(),
  mockExistsSync: vi.fn(),
  mockMkdir: vi.fn(),
  mockOpen: vi.fn(),
  mockRename: vi.fn(),
  mockRm: vi.fn(),
  mockStat: vi.fn(),
  mockUnlink: vi.fn(),
  mockBasename: vi.fn(),
  mockDirname: vi.fn(),
  mockExtname: vi.fn(),
  mockJoin: vi.fn(),
  mockBuildChunks: vi.fn(),
  mockInferFileNameFromUrl: vi.fn(),
  mockIsAbortError: vi.fn(),
  mockMergePartFiles: vi.fn(),
  mockNormalizeThreads: vi.fn(),
  mockParseContentDispositionFileName: vi.fn(),
  mockSafeFileName: vi.fn(),
}));

vi.mock('crypto', () => ({ randomUUID: mockRandomUUID }));
vi.mock('fs', () => ({ existsSync: mockExistsSync }));
vi.mock('fs/promises', () => ({
  mkdir: mockMkdir,
  open: mockOpen,
  rename: mockRename,
  rm: mockRm,
  stat: mockStat,
  unlink: mockUnlink,
}));
vi.mock('path', () => ({
  basename: mockBasename,
  dirname: mockDirname,
  extname: mockExtname,
  join: mockJoin,
}));
vi.mock('../downloadEngine/config', () => ({ EMIT_INTERVAL_MS: 160 }));
vi.mock('../downloadEngine/utils', () => ({
  buildChunks: mockBuildChunks,
  inferFileNameFromUrl: mockInferFileNameFromUrl,
  isAbortError: mockIsAbortError,
  mergePartFiles: mockMergePartFiles,
  normalizeThreads: mockNormalizeThreads,
  parseContentDispositionFileName: mockParseContentDispositionFileName,
  safeFileName: mockSafeFileName,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const originalFetch = globalThis.fetch;

/** Wait for all pending microtasks (Promise callbacks) to settle. */
const flush = () => new Promise<void>((r) => setTimeout(r, 0));

/** Run pending microtasks N times to let chained async operations complete. */
const flushN = async (n = 3) => {
  for (let i = 0; i < n; i++) await flush();
};

const BASE_URL = 'https://example.com';
const FILE_NAME = 'file.zip';
const FULL_URL = `${BASE_URL}/${FILE_NAME}`;
const SAVE_DIR = '/downloads';
const SAVE_PATH = `${SAVE_DIR}/${FILE_NAME}`;
const TEMP_DIR = `${SAVE_DIR}/.eisland-download-uuid-1`;
const TEMP_OUTPUT = `${TEMP_DIR}/target.zip`;
const FILE_SIZE = 4_000_000;

function makeHeaders(entries: Record<string, string>) {
  const map = new Map(Object.entries(entries));
  return { get: (k: string) => map.get(k.toLowerCase()) ?? null };
}

function makeFetchResult(
  overrides: {
    ok?: boolean;
    status?: number;
    headers?: Record<string, string>;
    bodyChunks?: Uint8Array[];
  } = {},
) {
  const {
    ok = true,
    status = 200,
    headers = {},
    bodyChunks = [new Uint8Array([1, 2, 3])],
  } = overrides;

  let idx = 0;
  const mockBody = {
    getReader: () => ({
      read: vi.fn().mockImplementation(async () => {
        if (idx < bodyChunks.length) {
          return { value: bodyChunks[idx++], done: false };
        }
        return { value: undefined, done: true };
      }),
      cancel: vi.fn(),
      releaseLock: vi.fn(),
    }),
  };

  return { ok, status, headers: makeHeaders(headers), body: mockBody };
}

function makeFileHandle() {
  return { write: vi.fn(), close: vi.fn() };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MultiThreadDownloadEngine', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let MultiThreadDownloadEngine: typeof import('../downloadEngine').MultiThreadDownloadEngine;

  beforeEach(async () => {
    // Reset module registry so the module re-evaluates cleanly
    vi.resetModules();

    // Re-import after reset
    const mod = await import('../downloadEngine');
    MultiThreadDownloadEngine = mod.MultiThreadDownloadEngine;

    // Global fetch mock
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    // Default mock return values
    mockRandomUUID.mockReturnValue('uuid-1');
    mockExistsSync.mockReturnValue(false);
    mockMkdir.mockResolvedValue(undefined);
    mockRename.mockResolvedValue(undefined);
    mockRm.mockResolvedValue(undefined);
    mockUnlink.mockResolvedValue(undefined);
    mockStat.mockResolvedValue({ size: 0 });
    mockOpen.mockResolvedValue(makeFileHandle());

    mockBasename.mockImplementation((p: string) => p.split('/').pop() ?? '');
    mockDirname.mockImplementation((p: string) => p.split('/').slice(0, -1).join('/') || '/');
    mockExtname.mockImplementation((p: string) => {
      const dot = p.lastIndexOf('.');
      return dot > 0 ? p.slice(dot) : '';
    });
    mockJoin.mockImplementation((...parts: string[]) => parts.join('/'));

    mockNormalizeThreads.mockImplementation((v: unknown) =>
      typeof v === 'number' && Number.isFinite(v) ? Math.max(1, Math.min(16, Math.floor(v))) : 8,
    );
    mockInferFileNameFromUrl.mockReturnValue(FILE_NAME);
    mockSafeFileName.mockImplementation((s: string) => s.trim());
    mockBuildChunks.mockReturnValue([]);
    mockMergePartFiles.mockResolvedValue(undefined);
    mockIsAbortError.mockReturnValue(false);
    mockParseContentDispositionFileName.mockReturnValue('');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // =========================================================================
  // Constructor
  // =========================================================================

  describe('constructor', () => {
    it('works with no options', () => {
      expect(() => new MultiThreadDownloadEngine()).not.toThrow();
    });

    it('accepts onTaskUpdated callback', async () => {
      const cb = vi.fn();
      const engine = new MultiThreadDownloadEngine({ onTaskUpdated: cb });
      await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR });
      expect(cb).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // listTasks / getTask
  // =========================================================================

  describe('listTasks', () => {
    it('returns empty array when no tasks exist', () => {
      const engine = new MultiThreadDownloadEngine();
      expect(engine.listTasks()).toEqual([]);
    });

    it('returns snapshots of active tasks', async () => {
      const engine = new MultiThreadDownloadEngine();
      fetchMock.mockResolvedValueOnce(makeFetchResult({ headers: { 'content-length': '1000' } }));
      await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR });
      const list = engine.listTasks();
      expect(list).toHaveLength(1);
      expect(list[0].url).toBe(FULL_URL);
    });
  });

  describe('getTask', () => {
    it('returns null for unknown id', () => {
      const engine = new MultiThreadDownloadEngine();
      expect(engine.getTask('nope')).toBeNull();
    });

    it('returns snapshot for known id', async () => {
      const engine = new MultiThreadDownloadEngine();
      fetchMock.mockResolvedValueOnce(makeFetchResult({ headers: { 'content-length': '1000' } }));
      const snap = await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR });
      expect(engine.getTask(snap.id)).not.toBeNull();
      expect(engine.getTask(snap.id)!.url).toBe(FULL_URL);
    });
  });

  // =========================================================================
  // startDownload
  // =========================================================================

  describe('startDownload', () => {
    it('throws on empty url', async () => {
      const engine = new MultiThreadDownloadEngine();
      await expect(engine.startDownload({ url: '', defaultDir: SAVE_DIR })).rejects.toThrow('下载地址不能为空');
      await expect(engine.startDownload({ url: '   ', defaultDir: SAVE_DIR })).rejects.toThrow('下载地址不能为空');
    });

    it('throws on non-HTTP protocol', async () => {
      const engine = new MultiThreadDownloadEngine();
      await expect(engine.startDownload({ url: 'ftp://example.com/file.zip', defaultDir: SAVE_DIR })).rejects.toThrow(
        '仅支持 HTTP/HTTPS',
      );
    });

    it('starts a single-thread download for small files', async () => {
      const smallSize = 500;
      fetchMock
        .mockResolvedValueOnce(makeFetchResult({ headers: { 'content-length': String(smallSize) } }))
        .mockResolvedValueOnce(
          makeFetchResult({
            headers: { 'content-length': String(smallSize) },
            bodyChunks: [new Uint8Array(500)],
          }),
        );

      const engine = new MultiThreadDownloadEngine();
      const snap = await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR });

      expect(snap.status).toBe('downloading');
      expect(snap.url).toBe(FULL_URL);
      expect(snap.totalBytes).toBe(smallSize);

      await flushN(5);

      const tasks = engine.listTasks();
      expect(tasks[0].status).toBe('completed');
      expect(tasks[0].progress).toBe(1);
    });

    it('starts a multi-thread download for large files', async () => {
      const chunkSize = FILE_SIZE / 4;
      mockBuildChunks.mockReturnValue([
        { index: 0, start: 0, end: chunkSize - 1, partPath: `${TEMP_DIR}/chunk-0.part` },
        { index: 1, start: chunkSize, end: chunkSize * 2 - 1, partPath: `${TEMP_DIR}/chunk-1.part` },
        { index: 2, start: chunkSize * 2, end: chunkSize * 3 - 1, partPath: `${TEMP_DIR}/chunk-2.part` },
        { index: 3, start: chunkSize * 3, end: FILE_SIZE - 1, partPath: `${TEMP_DIR}/chunk-3.part` },
      ]);

      fetchMock
        .mockResolvedValueOnce(
          makeFetchResult({
            headers: { 'content-length': String(FILE_SIZE), 'accept-ranges': 'bytes' },
          }),
        )
        .mockResolvedValue(makeFetchResult({ bodyChunks: [new Uint8Array(chunkSize)] }));

      const engine = new MultiThreadDownloadEngine();
      const snap = await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR, threads: 4 });
      expect(snap.threads).toBe(4);

      await flushN(5);

      expect(mockBuildChunks).toHaveBeenCalledWith(FILE_SIZE, expect.any(Number), expect.any(String));
      expect(mockMergePartFiles).toHaveBeenCalled();

      const tasks = engine.listTasks();
      expect(tasks[0].status).toBe('completed');
    });

    it('calls onTaskUpdated callback', async () => {
      const cb = vi.fn();
      fetchMock.mockResolvedValueOnce(makeFetchResult({ headers: { 'content-length': '100' } }));
      const engine = new MultiThreadDownloadEngine({ onTaskUpdated: cb });
      await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR });
      expect(cb).toHaveBeenCalled();
      expect(cb.mock.calls[0][0]).toMatchObject({ url: FULL_URL, status: 'downloading' });
    });

    it('uses fileName from probe when savePath not given', async () => {
      mockInferFileNameFromUrl.mockReturnValue('probed.zip');
      mockSafeFileName.mockReturnValue('probed.zip');
      fetchMock.mockResolvedValueOnce(makeFetchResult({ headers: { 'content-length': '100' } }));

      const engine = new MultiThreadDownloadEngine();
      const snap = await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR });
      expect(snap.fileName).toBe('probed.zip');
    });

    it('uses explicit savePath over probed name', async () => {
      const explicit = '/custom/dir/myfile.bin';
      fetchMock.mockResolvedValueOnce(makeFetchResult({ headers: { 'content-length': '100' } }));

      const engine = new MultiThreadDownloadEngine();
      const snap = await engine.startDownload({ url: FULL_URL, savePath: explicit, defaultDir: SAVE_DIR });
      expect(snap.savePath).toBe(explicit);
      expect(snap.fileName).toBe('myfile.bin');
    });

    it('falls back when HEAD probe fails', async () => {
      fetchMock
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce(makeFetchResult({ bodyChunks: [new Uint8Array(10)] }));

      const engine = new MultiThreadDownloadEngine();
      const snap = await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR });
      expect(snap.status).toBe('downloading');
    });

    it('handles download failure', async () => {
      fetchMock
        .mockResolvedValueOnce(makeFetchResult({ headers: { 'content-length': '100' } }))
        .mockResolvedValueOnce(makeFetchResult({ ok: false, status: 500, bodyChunks: [] }));

      const engine = new MultiThreadDownloadEngine();
      await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR });

      await flushN(5);

      const tasks = engine.listTasks();
      expect(tasks[0].status).toBe('failed');
      expect(tasks[0].errorMessage).toContain('500');
    });

    it('skips savePath when it is whitespace-only', async () => {
      fetchMock.mockResolvedValueOnce(makeFetchResult({ headers: { 'content-length': '100' } }));
      const engine = new MultiThreadDownloadEngine();
      const snap = await engine.startDownload({ url: FULL_URL, savePath: '   ', defaultDir: SAVE_DIR });
      // Should use defaultDir + probed fileName instead of whitespace savePath
      expect(snap.savePath).not.toBe('   ');
    });

    it('creates savePath parent dir', async () => {
      fetchMock.mockResolvedValueOnce(makeFetchResult({ headers: { 'content-length': '100' } }));
      const engine = new MultiThreadDownloadEngine();
      await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR });
      expect(mockMkdir).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // cancelDownload
  // =========================================================================

  describe('cancelDownload', () => {
    it('returns false for unknown taskId', () => {
      const engine = new MultiThreadDownloadEngine();
      expect(engine.cancelDownload('nonexistent')).toBe(false);
    });

    it('returns false when task is not downloading', async () => {
      fetchMock.mockResolvedValueOnce(makeFetchResult({ headers: { 'content-length': '100' } }));
      const engine = new MultiThreadDownloadEngine();
      const snap = await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR });
      engine.pauseDownload(snap.id);
      expect(engine.cancelDownload(snap.id)).toBe(false);
    });

    it('cancels a downloading task', async () => {
      const cb = vi.fn();
      fetchMock
        .mockResolvedValueOnce(makeFetchResult({ headers: { 'content-length': '100' } }))
        .mockReturnValue(new Promise(() => {})); // Never resolves

      const engine = new MultiThreadDownloadEngine({ onTaskUpdated: cb });
      const snap = await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR });

      cb.mockClear();
      const result = engine.cancelDownload(snap.id);
      expect(result).toBe(true);

      const updated = engine.getTask(snap.id);
      expect(updated!.status).toBe('canceled');
    });
  });

  // =========================================================================
  // pauseDownload
  // =========================================================================

  describe('pauseDownload', () => {
    it('returns false for unknown taskId', () => {
      const engine = new MultiThreadDownloadEngine();
      expect(engine.pauseDownload('nonexistent')).toBe(false);
    });

    it('returns false when task is not downloading', async () => {
      fetchMock.mockResolvedValueOnce(makeFetchResult({ headers: { 'content-length': '100' } }));
      const engine = new MultiThreadDownloadEngine();
      const snap = await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR });
      // Wait for download to complete
      await flushN(5);
      expect(engine.pauseDownload(snap.id)).toBe(false);
    });

    it('pauses a downloading task', async () => {
      const cb = vi.fn();
      fetchMock
        .mockResolvedValueOnce(makeFetchResult({ headers: { 'content-length': '100' } }))
        .mockReturnValue(new Promise(() => {})); // never resolves

      const engine = new MultiThreadDownloadEngine({ onTaskUpdated: cb });
      const snap = await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR });

      cb.mockClear();
      const result = engine.pauseDownload(snap.id);
      expect(result).toBe(true);

      const updated = engine.getTask(snap.id);
      expect(updated!.status).toBe('paused');
      expect(updated!.speedBytesPerSecond).toBe(0);
      expect(updated!.estimatedFinishAt).toBeNull();
    });
  });

  // =========================================================================
  // resumeDownload
  // =========================================================================

  describe('resumeDownload', () => {
    it('throws for unknown taskId', async () => {
      const engine = new MultiThreadDownloadEngine();
      await expect(engine.resumeDownload('nonexistent')).rejects.toThrow('下载任务不存在');
    });

    it('throws when task is not paused', async () => {
      fetchMock.mockResolvedValueOnce(makeFetchResult({ headers: { 'content-length': '100' } }));
      const engine = new MultiThreadDownloadEngine();
      const snap = await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR });
      await expect(engine.resumeDownload(snap.id)).rejects.toThrow('仅可继续已暂停的任务');
    });

    it('resumes a paused task when range is supported', async () => {
      // Start download
      fetchMock
        .mockResolvedValueOnce(
          makeFetchResult({
            headers: { 'content-length': String(FILE_SIZE), 'accept-ranges': 'bytes' },
          }),
        )
        .mockReturnValue(new Promise(() => {})); // Hanging GET for initial download

      const engine = new MultiThreadDownloadEngine();
      const snap = await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR });
      engine.pauseDownload(snap.id);

      // Resume: probe returns same size with range support
      fetchMock
        .mockResolvedValueOnce(
          makeFetchResult({
            headers: { 'content-length': String(FILE_SIZE), 'accept-ranges': 'bytes' },
          }),
        )
        .mockResolvedValue(
          makeFetchResult({
            headers: { 'content-length': String(FILE_SIZE) },
            bodyChunks: [new Uint8Array(FILE_SIZE)],
          }),
        );

      const resumed = await engine.resumeDownload(snap.id);
      expect(resumed.status).toBe('downloading');

      await flushN(5);

      expect(engine.getTask(snap.id)!.status).toBe('completed');
    });

    it('resets downloadedBytes when range is not supported', async () => {
      fetchMock
        .mockResolvedValueOnce(
          makeFetchResult({
            headers: { 'content-length': String(FILE_SIZE), 'accept-ranges': 'bytes' },
          }),
        )
        .mockReturnValue(new Promise(() => {}));

      const engine = new MultiThreadDownloadEngine();
      const snap = await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR });
      engine.pauseDownload(snap.id);

      // Resume: no range support
      fetchMock
        .mockResolvedValueOnce(
          makeFetchResult({
            headers: { 'content-length': String(FILE_SIZE) },
          }),
        )
        .mockResolvedValue(
          makeFetchResult({
            headers: { 'content-length': String(FILE_SIZE) },
            bodyChunks: [new Uint8Array(FILE_SIZE)],
          }),
        );

      const resumed = await engine.resumeDownload(snap.id);
      expect(resumed.status).toBe('downloading');
      expect(resumed.downloadedBytes).toBe(0);
    });

    it('resets downloadedBytes when totalBytes changed', async () => {
      fetchMock
        .mockResolvedValueOnce(
          makeFetchResult({
            headers: { 'content-length': String(FILE_SIZE), 'accept-ranges': 'bytes' },
          }),
        )
        .mockReturnValue(new Promise(() => {}));

      const engine = new MultiThreadDownloadEngine();
      const snap = await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR });
      engine.pauseDownload(snap.id);

      // Resume: different file size
      fetchMock
        .mockResolvedValueOnce(
          makeFetchResult({
            headers: { 'content-length': String(FILE_SIZE + 1000), 'accept-ranges': 'bytes' },
          }),
        )
        .mockResolvedValue(
          makeFetchResult({
            headers: { 'content-length': String(FILE_SIZE + 1000) },
            bodyChunks: [new Uint8Array(FILE_SIZE + 1000)],
          }),
        );

      const resumed = await engine.resumeDownload(snap.id);
      expect(resumed.downloadedBytes).toBe(0);
    });

    it('resets downloadedBytes when totalBytes is zero', async () => {
      fetchMock
        .mockResolvedValueOnce(
          makeFetchResult({
            headers: { 'content-length': String(FILE_SIZE), 'accept-ranges': 'bytes' },
          }),
        )
        .mockReturnValue(new Promise(() => {}));

      const engine = new MultiThreadDownloadEngine();
      const snap = await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR });
      engine.pauseDownload(snap.id);

      // Resume: totalBytes is 0
      fetchMock
        .mockResolvedValueOnce(
          makeFetchResult({
            headers: { 'content-length': '0', 'accept-ranges': 'bytes' },
          }),
        )
        .mockResolvedValue(
          makeFetchResult({
            headers: { 'content-length': '0' },
            bodyChunks: [],
          }),
        );

      const resumed = await engine.resumeDownload(snap.id);
      expect(resumed.downloadedBytes).toBe(0);
    });
  });

  // =========================================================================
  // removeTask
  // =========================================================================

  describe('removeTask', () => {
    it('returns false for unknown taskId', () => {
      const engine = new MultiThreadDownloadEngine();
      expect(engine.removeTask('nonexistent')).toBe(false);
    });

    it('returns false when task is still downloading', async () => {
      fetchMock
        .mockResolvedValueOnce(makeFetchResult({ headers: { 'content-length': '100' } }))
        .mockReturnValue(new Promise(() => {}));

      const engine = new MultiThreadDownloadEngine();
      const snap = await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR });
      expect(engine.removeTask(snap.id)).toBe(false);
    });

    it('removes a completed task', async () => {
      fetchMock
        .mockResolvedValueOnce(makeFetchResult({ headers: { 'content-length': '100' } }))
        .mockResolvedValueOnce(makeFetchResult({ bodyChunks: [new Uint8Array(100)] }));

      const engine = new MultiThreadDownloadEngine();
      const snap = await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR });
      await flushN(5);

      expect(engine.removeTask(snap.id)).toBe(true);
      expect(engine.getTask(snap.id)).toBeNull();
      expect(engine.listTasks()).toHaveLength(0);
    });

    it('removes a failed task', async () => {
      fetchMock
        .mockResolvedValueOnce(makeFetchResult({ headers: { 'content-length': '100' } }))
        .mockResolvedValueOnce(makeFetchResult({ ok: false, status: 500, bodyChunks: [] }));

      const engine = new MultiThreadDownloadEngine();
      const snap = await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR });
      await flushN(5);

      expect(engine.listTasks()[0].status).toBe('failed');
      expect(engine.removeTask(snap.id)).toBe(true);
      expect(engine.listTasks()).toHaveLength(0);
    });

    it('removes a canceled task', async () => {
      fetchMock
        .mockResolvedValueOnce(makeFetchResult({ headers: { 'content-length': '100' } }))
        .mockReturnValue(new Promise(() => {}));

      const engine = new MultiThreadDownloadEngine();
      const snap = await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR });
      engine.cancelDownload(snap.id);

      expect(engine.removeTask(snap.id)).toBe(true);
      expect(engine.listTasks()).toHaveLength(0);
    });
  });

  // =========================================================================
  // Error handling
  // =========================================================================

  describe('error handling', () => {
    it('marks task as failed on HTTP error during GET', async () => {
      fetchMock
        .mockResolvedValueOnce(makeFetchResult({ headers: { 'content-length': '100' } }))
        .mockResolvedValueOnce(makeFetchResult({ ok: false, status: 500, bodyChunks: [] }));

      const engine = new MultiThreadDownloadEngine();
      await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR });
      await flushN(5);

      const task = engine.listTasks()[0];
      expect(task.status).toBe('failed');
      expect(task.errorMessage).toBeDefined();
      expect(task.speedBytesPerSecond).toBe(0);
      expect(task.estimatedFinishAt).toBeNull();
    });

    it('handles pause-during-download gracefully (handleTaskFailure with paused status)', async () => {
      const cb = vi.fn();
      let rejectSecondFetch: (e: unknown) => void;
      const hangPromise = new Promise((_r, rej) => { rejectSecondFetch = rej; });

      fetchMock
        .mockResolvedValueOnce(makeFetchResult({ headers: { 'content-length': '100' } }))
        .mockReturnValueOnce(hangPromise);

      const engine = new MultiThreadDownloadEngine({ onTaskUpdated: cb });
      const snap = await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR });

      // Pause task before the download completes (aborts controllers)
      engine.pauseDownload(snap.id);
      cb.mockClear();

      // Simulate the fetch rejecting due to abort (what real fetch does on signal abort)
      const abortErr = new Error('The operation was aborted');
      abortErr.name = 'AbortError';
      mockIsAbortError.mockReturnValue(false); // isAbortError returns false so handleTaskFailure sees 'paused' first
      rejectSecondFetch!(abortErr);
      await flushN(5);

      // Task should remain paused (handleTaskFailure bails out when status is 'paused')
      const task = engine.getTask(snap.id);
      expect(task!.status).toBe('paused');
    });

    it('cleans up on abort error', async () => {
      const abortErr = new Error('The operation was aborted');
      abortErr.name = 'AbortError';
      mockIsAbortError.mockReturnValue(true);

      let rejectSecondFetch: (e: unknown) => void;
      const hangPromise = new Promise((_r, rej) => { rejectSecondFetch = rej; });

      fetchMock
        .mockResolvedValueOnce(makeFetchResult({ headers: { 'content-length': '100' } }))
        .mockReturnValueOnce(hangPromise);

      const engine = new MultiThreadDownloadEngine();
      await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR });

      rejectSecondFetch!(abortErr);
      await flushN(5);

      const task = engine.listTasks()[0];
      expect(task.status).toBe('canceled');
    });

    it('marks task as failed on fetch exception', async () => {
      fetchMock
        .mockResolvedValueOnce(makeFetchResult({ headers: { 'content-length': '100' } }))
        .mockRejectedValueOnce(new Error('Connection refused'));

      const engine = new MultiThreadDownloadEngine();
      await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR });
      await flushN(5);

      const task = engine.listTasks()[0];
      expect(task.status).toBe('failed');
      expect(task.errorMessage).toBe('Connection refused');
    });
  });

  // =========================================================================
  // Edge cases
  // =========================================================================

  describe('edge cases', () => {
    it('sets totalBytes to downloadedBytes when content-length is unknown', async () => {
      fetchMock
        .mockResolvedValueOnce(makeFetchResult({ headers: {} }))
        .mockResolvedValueOnce(makeFetchResult({ headers: {}, bodyChunks: [new Uint8Array(42)] }));

      const engine = new MultiThreadDownloadEngine();
      await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR });
      await flushN(5);

      const task = engine.listTasks()[0];
      expect(task.totalBytes).toBe(42);
      expect(task.progress).toBe(1);
    });

    it('sets totalBytes from content-length when initially unknown', async () => {
      // Probe returns no content-length, but GET returns it
      fetchMock
        .mockResolvedValueOnce(makeFetchResult({ headers: {} }))
        .mockResolvedValueOnce(
          makeFetchResult({ headers: { 'content-length': '500' }, bodyChunks: [new Uint8Array(500)] }),
        );

      const engine = new MultiThreadDownloadEngine();
      await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR });
      await flushN(5);

      const task = engine.listTasks()[0];
      expect(task.totalBytes).toBe(500);
      expect(task.status).toBe('completed');
    });

    it('uses content-disposition filename when available', async () => {
      mockParseContentDispositionFileName.mockReturnValue('custom-name.tar.gz');
      mockSafeFileName.mockReturnValue('custom-name.tar.gz');
      fetchMock.mockResolvedValueOnce(
        makeFetchResult({
          headers: { 'content-length': '100', 'content-disposition': 'attachment; filename="custom-name.tar.gz"' },
        }),
      );

      const engine = new MultiThreadDownloadEngine();
      const snap = await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR });
      expect(snap.fileName).toBe('custom-name.tar.gz');
    });

    it('detects range support from accept-ranges header', async () => {
      const chunkSize = FILE_SIZE / 2;
      mockBuildChunks.mockReturnValue([
        { index: 0, start: 0, end: chunkSize - 1, partPath: `${TEMP_DIR}/chunk-0.part` },
        { index: 1, start: chunkSize, end: FILE_SIZE - 1, partPath: `${TEMP_DIR}/chunk-1.part` },
      ]);

      fetchMock
        .mockResolvedValueOnce(
          makeFetchResult({
            headers: { 'content-length': String(FILE_SIZE), 'accept-ranges': 'bytes' },
          }),
        )
        .mockResolvedValue(makeFetchResult({ bodyChunks: [new Uint8Array(chunkSize)] }));

      const engine = new MultiThreadDownloadEngine();
      await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR, threads: 2 });
      await flushN(5);

      // buildChunks was called, meaning multi-thread path was taken
      expect(mockBuildChunks).toHaveBeenCalled();
      expect(mockMergePartFiles).toHaveBeenCalled();
    });

    it('sends Range header for single-thread resume', async () => {
      // Simulate existing partial file on disk
      mockStat.mockResolvedValue({ size: 500 });

      fetchMock
        .mockResolvedValueOnce(
          makeFetchResult({
            headers: { 'content-length': '1000', 'accept-ranges': 'bytes' },
          }),
        )
        .mockResolvedValueOnce(
          makeFetchResult({
            status: 206,
            headers: { 'content-length': '500' },
            bodyChunks: [new Uint8Array(500)],
          }),
        );

      const engine = new MultiThreadDownloadEngine();
      // Force single-thread path to test Range header behavior
      await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR, threads: 1 });
      await flushN(5);

      // Find the GET call (non-HEAD call) and verify Range header was set
      const getCalls = (fetchMock.mock.calls as unknown[][]).filter(
        (c) => (c[1] as Record<string, unknown>)?.method !== 'HEAD',
      );
      expect(getCalls.length).toBeGreaterThanOrEqual(1);
      expect(getCalls[0]![1].headers.Range).toBe('bytes=500-');
    });

    it('progress callback receives correct snapshot shape', async () => {
      const cb = vi.fn();
      fetchMock
        .mockResolvedValueOnce(makeFetchResult({ headers: { 'content-length': '100' } }))
        .mockResolvedValueOnce(makeFetchResult({ bodyChunks: [new Uint8Array(100)] }));

      const engine = new MultiThreadDownloadEngine({ onTaskUpdated: cb });
      await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR });
      await flushN(5);

      // Check the completed snapshot shape
      const lastCall = cb.mock.calls[cb.mock.calls.length - 1][0];
      expect(lastCall).toMatchObject({
        id: expect.any(String),
        url: expect.any(String),
        savePath: expect.any(String),
        fileName: expect.any(String),
        totalBytes: expect.any(Number),
        downloadedBytes: expect.any(Number),
        progress: expect.any(Number),
        speedBytesPerSecond: expect.any(Number),
        threads: expect.any(Number),
        status: 'completed',
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
      });
    });

    it('snapshot does not expose internal fields', async () => {
      fetchMock.mockResolvedValueOnce(makeFetchResult({ headers: { 'content-length': '100' } }));
      const engine = new MultiThreadDownloadEngine();
      const snap = await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR });

      const internal = snap as Record<string, unknown>;
      expect(internal.tempDir).toBeUndefined();
      expect(internal.tempOutputPath).toBeUndefined();
      expect(internal.partPaths).toBeUndefined();
      expect(internal.supportsRange).toBeUndefined();
      expect(internal.abortControllers).toBeUndefined();
      expect(internal.lastSampleTime).toBeUndefined();
      expect(internal.lastSampleBytes).toBeUndefined();
      expect(internal.lastEmitTime).toBeUndefined();
    });

    it('chunk download skips already-completed chunk files', async () => {
      const chunkSize = FILE_SIZE / 2;
      mockBuildChunks.mockReturnValue([
        { index: 0, start: 0, end: chunkSize - 1, partPath: `${TEMP_DIR}/chunk-0.part` },
        { index: 1, start: chunkSize, end: FILE_SIZE - 1, partPath: `${TEMP_DIR}/chunk-1.part` },
      ]);

      // stat calls in order:
      // 1. executeDownload sync: chunk 0 -> fully downloaded
      // 2. executeDownload sync: chunk 1 -> not downloaded
      // 3. downloadChunk: chunk 0 -> still fully downloaded (skipped)
      // 4. downloadChunk: chunk 1 -> not downloaded (downloaded)
      mockStat
        .mockResolvedValueOnce({ size: chunkSize }) // sync: chunk 0
        .mockResolvedValueOnce({ size: 0 })          // sync: chunk 1
        .mockResolvedValueOnce({ size: chunkSize })  // downloadChunk: chunk 0 (skip)
        .mockResolvedValue({ size: 0 });             // downloadChunk: chunk 1 and others

      fetchMock
        .mockResolvedValueOnce(
          makeFetchResult({
            headers: { 'content-length': String(FILE_SIZE), 'accept-ranges': 'bytes' },
          }),
        )
        .mockResolvedValue(makeFetchResult({ bodyChunks: [new Uint8Array(chunkSize)] }));

      const engine = new MultiThreadDownloadEngine();
      await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR, threads: 2 });
      await flushN(5);

      // Only chunk-1 should be fetched (chunk-0 was already complete)
      // fetch calls: 1 HEAD + 1 GET for chunk-1
      const getCalls = (fetchMock.mock.calls as unknown[][]).filter(
        (c) => c[0] === FULL_URL && (c[1] as Record<string, Record<string, unknown>>)?.headers?.Range,
      );
      expect(getCalls.length).toBe(1);
    });

    it('existing single-thread file triggers range request restart when server returns 200', async () => {
      mockStat.mockResolvedValue({ size: 500 });

      // Probe says range is supported
      fetchMock
        .mockResolvedValueOnce(
          makeFetchResult({
            headers: { 'content-length': '1000', 'accept-ranges': 'bytes' },
          }),
        )
        // GET returns 200 instead of 206 (server doesn't support range for this request)
        .mockResolvedValueOnce(
          makeFetchResult({
            status: 200,
            headers: { 'content-length': '1000' },
            bodyChunks: [new Uint8Array(1000)],
          }),
        );

      const engine = new MultiThreadDownloadEngine();
      await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR });
      await flushN(5);

      const task = engine.listTasks()[0];
      expect(task.status).toBe('completed');
    });

    it('handles empty body response', async () => {
      fetchMock
        .mockResolvedValueOnce(makeFetchResult({ headers: { 'content-length': '100' } }))
        .mockResolvedValueOnce({ ok: true, status: 200, headers: makeHeaders({}), body: null });

      const engine = new MultiThreadDownloadEngine();
      await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR });
      await flushN(5);

      const task = engine.listTasks()[0];
      expect(task.status).toBe('failed');
    });

    it('chunk download fails on non-200/206 status', async () => {
      mockBuildChunks.mockReturnValue([
        { index: 0, start: 0, end: 99, partPath: `${TEMP_DIR}/chunk-0.part` },
      ]);

      fetchMock
        .mockResolvedValueOnce(
          makeFetchResult({
            headers: { 'content-length': '100', 'accept-ranges': 'bytes' },
          }),
        )
        .mockResolvedValueOnce(
          makeFetchResult({ ok: false, status: 403, bodyChunks: [] }),
        );

      const engine = new MultiThreadDownloadEngine();
      await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR, threads: 2 });
      await flushN(5);

      const task = engine.listTasks()[0];
      expect(task.status).toBe('failed');
    });

    it('cleanupTaskFiles removes part paths on cancellation', async () => {
      mockBuildChunks.mockReturnValue([
        { index: 0, start: 0, end: 99, partPath: `${TEMP_DIR}/chunk-0.part` },
      ]);

      let rejectFetch: (e: unknown) => void;
      const hangPromise = new Promise((_r, rej) => { rejectFetch = rej; });

      fetchMock
        .mockResolvedValueOnce(
          makeFetchResult({
            headers: { 'content-length': '100', 'accept-ranges': 'bytes' },
          }),
        )
        .mockReturnValueOnce(hangPromise);

      const engine = new MultiThreadDownloadEngine();
      const snap = await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR, threads: 2 });

      // Cancel the download (sets status to 'canceled' and aborts controllers)
      await flushN();
      engine.cancelDownload(snap.id);

      // Simulate fetch rejecting due to abort signal
      rejectFetch!(new Error('aborted'));
      await flushN(5);

      // rm should have been called for cleanup (temp dir removal)
      expect(mockRm).toHaveBeenCalled();
    });

    it('completed download removes existing savePath file first', async () => {
      mockExistsSync.mockReturnValue(true);

      fetchMock
        .mockResolvedValueOnce(makeFetchResult({ headers: { 'content-length': '100' } }))
        .mockResolvedValueOnce(makeFetchResult({ bodyChunks: [new Uint8Array(100)] }));

      const engine = new MultiThreadDownloadEngine();
      await engine.startDownload({ url: FULL_URL, defaultDir: SAVE_DIR });
      await flushN(5);

      // unlink should be called because existsSync returned true
      expect(mockUnlink).toHaveBeenCalledWith(SAVE_PATH);
      // rename should move temp output to final path
      expect(mockRename).toHaveBeenCalledWith(TEMP_OUTPUT, SAVE_PATH);
    });
  });
});
