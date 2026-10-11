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
 * @file wallpaperHelpers.test.ts
 * @description 壁纸辅助函数单元测试 — inferImageExtFromContentType / decodeDataUrl / createSolidBlackBmpBuffer
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { handleMock } = vi.hoisted(() => ({
  handleMock: vi.fn(),
}));

const {
  appGetPathMock,
  browserWindowFromWebContentsMock,
  browserWindowGetFocusedWindowMock,
  showOpenDialogMock,
  netFetchMock,
} = vi.hoisted(() => ({
  appGetPathMock: vi.fn(),
  browserWindowFromWebContentsMock: vi.fn(),
  browserWindowGetFocusedWindowMock: vi.fn(),
  showOpenDialogMock: vi.fn(),
  netFetchMock: vi.fn(),
}));

const {
  writeFileSyncMock,
  existsSyncMock,
  readFileSyncMock,
  readdirSyncMock,
  unlinkSyncMock,
  mkdirSyncMock,
  copyFileSyncMock,
} = vi.hoisted(() => ({
  writeFileSyncMock: vi.fn(),
  existsSyncMock: vi.fn(),
  readFileSyncMock: vi.fn(),
  readdirSyncMock: vi.fn(),
  unlinkSyncMock: vi.fn(),
  mkdirSyncMock: vi.fn(),
  copyFileSyncMock: vi.fn(),
}));

const { execFileMock } = vi.hoisted(() => ({
  execFileMock: vi.fn(),
}));

vi.mock('electron', () => ({
  app: { getPath: appGetPathMock },
  BrowserWindow: {
    fromWebContents: browserWindowFromWebContentsMock,
    getFocusedWindow: browserWindowGetFocusedWindowMock,
  },
  dialog: { showOpenDialog: showOpenDialogMock },
  ipcMain: { handle: handleMock },
  net: { fetch: netFetchMock },
}));

vi.mock('fs', () => ({
  writeFileSync: writeFileSyncMock,
  existsSync: existsSyncMock,
  readFileSync: readFileSyncMock,
  readdirSync: readdirSyncMock,
  unlinkSync: unlinkSyncMock,
  mkdirSync: mkdirSyncMock,
  copyFileSync: copyFileSyncMock,
}));


vi.mock('node:fs/promises', () => ({
  stat: async () => ({ isFile: () => true, size: 7 }),
  mkdir: async (...args: unknown[]) => mkdirSyncMock(...args),
  copyFile: async (...args: unknown[]) => copyFileSyncMock(...args),
  rename: async () => {},
  writeFile: async (path: string, data: Buffer) => writeFileSyncMock(path, data),
  readdir: async () => readdirSyncMock() ?? [],
  unlink: async (...args: unknown[]) => unlinkSyncMock(...args),
  open: async (path: string) => {
    const data = readFileSyncMock(path);
    return { stat: async () => ({ isFile: () => true, size: data.length }),
      read: async (bytes: Uint8Array) => { bytes.set(data); return { bytesRead: data.length }; }, close: async () => {} };
  },
}));
vi.mock('../../../media/localAssets', () => ({ createLocalAssetUrl: async (path: string) => {
  readFileSyncMock(path);
  return 'eisland-media://asset/fixture';
} }));
vi.mock('../../../media/downloadWallpaper', () => ({ default: async (url: string, destination: (response: Response) => string) => {
  const response = await netFetchMock(url);
  if (!response.ok) throw new Error('HTTP failure');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) throw new Error('Empty response');
  const path = destination(response); writeFileSyncMock(path, bytes); return path;
} }));

vi.mock('child_process', () => ({
  execFile: execFileMock,
}));

import { registerWallpaperIpcHandlers } from '../wallpaper';

describe('wallpaper helpers (private)', () => {
  const handleHandlers = new Map<string, (...args: unknown[]) => unknown>();

  beforeEach(() => {
    handleHandlers.clear();

    handleMock.mockReset();
    appGetPathMock.mockReset();
    browserWindowFromWebContentsMock.mockReset();
    browserWindowGetFocusedWindowMock.mockReset();
    showOpenDialogMock.mockReset();
    netFetchMock.mockReset();

    writeFileSyncMock.mockReset();
    existsSyncMock.mockReset();
    readFileSyncMock.mockReset();
    readdirSyncMock.mockReset();
    unlinkSyncMock.mockReset();
    mkdirSyncMock.mockReset();
    copyFileSyncMock.mockReset();

    execFileMock.mockReset();

    appGetPathMock.mockReturnValue('C:/AppData/eIsland');

    handleMock.mockImplementation((channel: string, handler: (...args: unknown[]) => unknown) => {
      handleHandlers.set(channel, handler);
    });

    existsSyncMock.mockReturnValue(false);

    registerWallpaperIpcHandlers();
  });

  // ---------------------------------------------------------------------------
  // inferImageExtFromContentType  (exercised via HTTP previewUrl)
  // ---------------------------------------------------------------------------

  describe('inferImageExtFromContentType via HTTP previewUrl', () => {
    function makeHttpResponse(contentType: string | null) {
      return {
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
        headers: { get: (name: string) => (name === 'content-type' ? contentType : null) },
      };
    }

    function setupExecFileSuccess() {
      execFileMock.mockImplementation(
        (_cmd: string, _args: string[], _opts: unknown, cb: (err: null, stdout: string) => void) => cb(null, 'True'),
      );
    }

    it('maps image/png to png', async () => {
      if (process.platform !== 'win32') return;
      netFetchMock.mockResolvedValue(makeHttpResponse('image/png'));
      setupExecFileSuccess();

      await handleHandlers.get('wallpaper:system:set')!({}, { previewUrl: 'http://example.com/img' });

      expect(writeFileSyncMock).toHaveBeenCalledWith(expect.stringContaining('.png'), expect.anything());
    });

    it('maps image/jpeg to jpg', async () => {
      if (process.platform !== 'win32') return;
      netFetchMock.mockResolvedValue(makeHttpResponse('image/jpeg'));
      setupExecFileSuccess();

      await handleHandlers.get('wallpaper:system:set')!({}, { previewUrl: 'http://example.com/img' });

      expect(writeFileSyncMock).toHaveBeenCalledWith(expect.stringContaining('.jpg'), expect.anything());
    });

    it('maps image/gif to gif', async () => {
      if (process.platform !== 'win32') return;
      netFetchMock.mockResolvedValue(makeHttpResponse('image/gif'));
      setupExecFileSuccess();

      await handleHandlers.get('wallpaper:system:set')!({}, { previewUrl: 'http://example.com/img' });

      expect(writeFileSyncMock).toHaveBeenCalledWith(expect.stringContaining('.gif'), expect.anything());
    });

    it('maps image/webp to webp', async () => {
      if (process.platform !== 'win32') return;
      netFetchMock.mockResolvedValue(makeHttpResponse('image/webp'));
      setupExecFileSuccess();

      await handleHandlers.get('wallpaper:system:set')!({}, { previewUrl: 'http://example.com/img' });

      expect(writeFileSyncMock).toHaveBeenCalledWith(expect.stringContaining('.webp'), expect.anything());
    });

    it('defaults to jpg for unknown content type', async () => {
      if (process.platform !== 'win32') return;
      netFetchMock.mockResolvedValue(makeHttpResponse('application/octet-stream'));
      setupExecFileSuccess();

      await handleHandlers.get('wallpaper:system:set')!({}, { previewUrl: 'http://example.com/img' });

      expect(writeFileSyncMock).toHaveBeenCalledWith(expect.stringContaining('.jpg'), expect.anything());
    });

    it('defaults to jpg when content-type header is null', async () => {
      if (process.platform !== 'win32') return;
      netFetchMock.mockResolvedValue(makeHttpResponse(null));
      setupExecFileSuccess();

      await handleHandlers.get('wallpaper:system:set')!({}, { previewUrl: 'http://example.com/img' });

      expect(writeFileSyncMock).toHaveBeenCalledWith(expect.stringContaining('.jpg'), expect.anything());
    });
  });

  // ---------------------------------------------------------------------------
  // decodeDataUrl  (exercised via data-URL previewUrl)
  // ---------------------------------------------------------------------------

  describe('decodeDataUrl via data-URL previewUrl', () => {
    function setupExecFileSuccess() {
      execFileMock.mockImplementation(
        (_cmd: string, _args: string[], _opts: unknown, cb: (err: null, stdout: string) => void) => cb(null, 'True'),
      );
    }

    it('decodes valid data:image/png;base64 payload', async () => {
      if (process.platform !== 'win32') return;
      setupExecFileSuccess();
      const payload = Buffer.from('hello-png').toString('base64');

      await handleHandlers.get('wallpaper:system:set')!({}, { previewUrl: `data:image/png;base64,${payload}` });

      expect(writeFileSyncMock).toHaveBeenCalledWith(
        expect.stringContaining('.png'),
        expect.objectContaining({ length: Buffer.from('hello-png').length }),
      );
    });

    it('normalizes image/jpeg to jpg extension', async () => {
      if (process.platform !== 'win32') return;
      setupExecFileSuccess();
      const payload = Buffer.from('hello-jpeg').toString('base64');

      await handleHandlers.get('wallpaper:system:set')!({}, { previewUrl: `data:image/jpeg;base64,${payload}` });

      expect(writeFileSyncMock).toHaveBeenCalledWith(expect.stringContaining('.jpg'), expect.anything());
    });

    it('returns false for invalid data URL (no match)', async () => {
      const result = await handleHandlers.get('wallpaper:system:set')!({}, { previewUrl: 'not-a-data-url' });
      expect(result).toBe(false);
    });

    it('returns false when comma is missing', async () => {
      const result = await handleHandlers.get('wallpaper:system:set')!({}, { previewUrl: 'data:image/png;base64' });
      expect(result).toBe(false);
    });

    it('returns false for empty base64 payload', async () => {
      const result = await handleHandlers.get('wallpaper:system:set')!({}, { previewUrl: 'data:image/png;base64,' });
      expect(result).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // createSolidBlackBmpBuffer  (exercised via wallpaper:system:set { clear: true })
  // ---------------------------------------------------------------------------

  describe('createSolidBlackBmpBuffer via clear:true', () => {
    it('writes a Buffer with valid BMP header signature "BM"', async () => {
      if (process.platform !== 'win32') return;
      existsSyncMock.mockReturnValue(true);
      execFileMock.mockImplementation(
        (_cmd: string, _args: string[], _opts: unknown, cb: (err: null, stdout: string) => void) => cb(null, 'True'),
      );

      await handleHandlers.get('wallpaper:system:set')!({}, { clear: true });

      const blackCall = writeFileSyncMock.mock.calls.find(
        (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('black'),
      );
      expect(blackCall).toBeDefined();

      const buf = blackCall![1] as Buffer;
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf[0]).toBe(0x42); // 'B'
      expect(buf[1]).toBe(0x4d); // 'M'
    });

    it('returns true after setting black wallpaper', async () => {
      if (process.platform !== 'win32') return;
      existsSyncMock.mockReturnValue(true);
      execFileMock.mockImplementation(
        (_cmd: string, _args: string[], _opts: unknown, cb: (err: null, stdout: string) => void) => cb(null, 'True'),
      );

      const result = await handleHandlers.get('wallpaper:system:set')!({}, { clear: true });
      expect(result).toBe(true);
    });
  });
});
