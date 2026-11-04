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
 * @file updaterHelpers.test.ts
 * @description updater.ts 纯辅助函数单元测试 (normalizeUpdateSource, applyUpdateSource)
 * @description 通过 registerUpdaterIpcHandlers IPC handler 间接测试模块内部的纯函数
 * @author 鸡哥
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── hoisted mocks ──

const { handleMock } = vi.hoisted(() => ({
  handleMock: vi.fn(),
}));

const { setFeedURLMock, checkForUpdatesMock, downloadUpdateMock, quitAndInstallMock } =
  vi.hoisted(() => ({
    setFeedURLMock: vi.fn(),
    checkForUpdatesMock: vi.fn(),
    downloadUpdateMock: vi.fn(),
    quitAndInstallMock: vi.fn(),
  }));

// ── module mocks ──

vi.mock('electron', () => ({
  ipcMain: { handle: handleMock },
}));

// ── imports under test ──

import { registerUpdaterIpcHandlers } from '../updater';

// ── test helpers ──

const R2_UPDATE_URL = 'https://pub-4c1e73c3c2004901aecd6ca014cb16bd.r2.dev';
const ESA_CDN_URL = 'https://eisland-server-download-cdn.pyisland.com/eisland-update';
const GITHUB_OWNER = 'JNTMTMTM';
const GITHUB_REPO = 'eIsland';

function createMockUpdater() {
  return {
    setFeedURL: setFeedURLMock,
    checkForUpdates: checkForUpdatesMock,
    downloadUpdate: downloadUpdateMock,
    quitAndInstall: quitAndInstallMock,
    // AppUpdater has many other properties; we only need the ones the code calls
  } as unknown as import('electron-updater').AppUpdater;
}

// ── tests ──

describe('updater.ts helpers (via registerUpdaterIpcHandlers)', () => {
  const handleHandlers = new Map<string, (...args: unknown[]) => unknown>();
  const getVersionMock = vi.fn().mockReturnValue('1.0.0');
  const isPackagedMock = vi.fn().mockReturnValue(true);

  beforeEach(() => {
    handleHandlers.clear();
    handleMock.mockReset();
    setFeedURLMock.mockReset();
    checkForUpdatesMock.mockReset();
    downloadUpdateMock.mockReset();
    quitAndInstallMock.mockReset();
    getVersionMock.mockReset().mockReturnValue('1.0.0');
    isPackagedMock.mockReset().mockReturnValue(true);

    handleMock.mockImplementation((channel: string, handler: (...args: unknown[]) => unknown) => {
      handleHandlers.set(channel, handler);
    });

    registerUpdaterIpcHandlers({
      updater: createMockUpdater(),
      getVersion: getVersionMock,
      isPackaged: isPackagedMock,
    });
  });

  // ──────────────────────────────────────────────
  // IPC handler registration
  // ──────────────────────────────────────────────

  describe('registerUpdaterIpcHandlers', () => {
    it('registers all four IPC channels', () => {
      expect(handleHandlers.has('updater:check')).toBe(true);
      expect(handleHandlers.has('updater:download')).toBe(true);
      expect(handleHandlers.has('updater:install')).toBe(true);
      expect(handleHandlers.has('updater:version')).toBe(true);
    });
  });

  // ──────────────────────────────────────────────
  // normalizeUpdateSource (via updater:check handler)
  // ──────────────────────────────────────────────

  describe('normalizeUpdateSource', () => {
    it("'github' configures correct GitHub feed URL", async () => {
      checkForUpdatesMock.mockResolvedValue(null);
      const handler = handleHandlers.get('updater:check')!;
      await handler({}, 'github');
      expect(setFeedURLMock).toHaveBeenCalledWith({
        provider: 'github',
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        private: false,
      });
    });

    it("'cloudflare-r2' configures correct R2 feed URL", async () => {
      checkForUpdatesMock.mockResolvedValue(null);
      const handler = handleHandlers.get('updater:check')!;
      await handler({}, 'cloudflare-r2');
      expect(setFeedURLMock).toHaveBeenCalledWith({
        provider: 'generic',
        url: R2_UPDATE_URL,
      });
    });

    it("'esa-cdn' configures correct ESA CDN feed URL", async () => {
      checkForUpdatesMock.mockResolvedValue(null);
      const handler = handleHandlers.get('updater:check')!;
      await handler({}, 'esa-cdn');
      expect(setFeedURLMock).toHaveBeenCalledWith({
        provider: 'generic',
        url: ESA_CDN_URL,
      });
    });

    it("'tencent-cos' configures correct generic feed URL with resolvedUrl", async () => {
      checkForUpdatesMock.mockResolvedValue(null);
      const handler = handleHandlers.get('updater:check')!;
      const url = 'https://cdn.example.com/releases';
      await handler({}, 'tencent-cos', url);
      expect(setFeedURLMock).toHaveBeenCalledWith({
        provider: 'generic',
        url,
      });
    });

    it("'aliyun-oss' configures correct generic feed URL with resolvedUrl", async () => {
      checkForUpdatesMock.mockResolvedValue(null);
      const handler = handleHandlers.get('updater:check')!;
      const url = 'https://oss.example.com/releases';
      await handler({}, 'aliyun-oss', url);
      expect(setFeedURLMock).toHaveBeenCalledWith({
        provider: 'generic',
        url,
      });
    });

    it('unknown source falls back to cloudflare-r2 (R2 URL)', async () => {
      checkForUpdatesMock.mockResolvedValue(null);
      const handler = handleHandlers.get('updater:check')!;
      await handler({}, 'some-unknown-source');
      expect(setFeedURLMock).toHaveBeenCalledWith({
        provider: 'generic',
        url: R2_UPDATE_URL,
      });
    });

    it('empty string falls back to cloudflare-r2 (R2 URL)', async () => {
      checkForUpdatesMock.mockResolvedValue(null);
      const handler = handleHandlers.get('updater:check')!;
      await handler({}, '');
      expect(setFeedURLMock).toHaveBeenCalledWith({
        provider: 'generic',
        url: R2_UPDATE_URL,
      });
    });

    it('undefined source falls back to cloudflare-r2 (R2 URL)', async () => {
      checkForUpdatesMock.mockResolvedValue(null);
      const handler = handleHandlers.get('updater:check')!;
      await handler({});
      expect(setFeedURLMock).toHaveBeenCalledWith({
        provider: 'generic',
        url: R2_UPDATE_URL,
      });
    });

    it('numeric source falls back to cloudflare-r2 (R2 URL)', async () => {
      checkForUpdatesMock.mockResolvedValue(null);
      const handler = handleHandlers.get('updater:check')!;
      await handler({}, 42 as unknown as string);
      expect(setFeedURLMock).toHaveBeenCalledWith({
        provider: 'generic',
        url: R2_UPDATE_URL,
      });
    });

    it('null source falls back to cloudflare-r2 (R2 URL)', async () => {
      checkForUpdatesMock.mockResolvedValue(null);
      const handler = handleHandlers.get('updater:check')!;
      await handler({}, null as unknown as string);
      expect(setFeedURLMock).toHaveBeenCalledWith({
        provider: 'generic',
        url: R2_UPDATE_URL,
      });
    });
  });

  // ──────────────────────────────────────────────
  // applyUpdateSource (via updater:check handler)
  // ──────────────────────────────────────────────

  describe('applyUpdateSource', () => {
    it('github source sets GitHub feed without resolvedUrl', async () => {
      checkForUpdatesMock.mockResolvedValue(null);
      const handler = handleHandlers.get('updater:check')!;
      await handler({}, 'github');
      expect(setFeedURLMock).toHaveBeenCalledWith({
        provider: 'github',
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        private: false,
      });
    });

    it('tencent-cos source uses generic provider with resolvedUrl', async () => {
      checkForUpdatesMock.mockResolvedValue(null);
      const handler = handleHandlers.get('updater:check')!;
      const url = 'https://cos.example.com/releases';
      await handler({}, 'tencent-cos', url);
      expect(setFeedURLMock).toHaveBeenCalledWith({
        provider: 'generic',
        url,
      });
    });

    it('aliyun-oss source uses generic provider with resolvedUrl', async () => {
      checkForUpdatesMock.mockResolvedValue(null);
      const handler = handleHandlers.get('updater:check')!;
      const url = 'https://oss.example.com/releases';
      await handler({}, 'aliyun-oss', url);
      expect(setFeedURLMock).toHaveBeenCalledWith({
        provider: 'generic',
        url,
      });
    });

    it('tencent-cos without resolvedUrl returns error', async () => {
      checkForUpdatesMock.mockResolvedValue(null);
      const handler = handleHandlers.get('updater:check')!;
      const result = (await handler({}, 'tencent-cos')) as { available: boolean; error: string };
      expect(result.available).toBe(false);
      expect(result.error).toContain('PRO update source requires a server-issued URL');
    });

    it('aliyun-oss without resolvedUrl returns error', async () => {
      checkForUpdatesMock.mockResolvedValue(null);
      const handler = handleHandlers.get('updater:check')!;
      const result = (await handler({}, 'aliyun-oss')) as { available: boolean; error: string };
      expect(result.available).toBe(false);
      expect(result.error).toContain('PRO update source requires a server-issued URL');
    });

    it('cloudflare-r2 source uses R2 URL regardless of resolvedUrl', async () => {
      checkForUpdatesMock.mockResolvedValue(null);
      const handler = handleHandlers.get('updater:check')!;
      await handler({}, 'cloudflare-r2', 'https://ignored.example.com');
      expect(setFeedURLMock).toHaveBeenCalledWith({
        provider: 'generic',
        url: R2_UPDATE_URL,
      });
    });

    it('esa-cdn source uses ESA CDN URL regardless of resolvedUrl', async () => {
      checkForUpdatesMock.mockResolvedValue(null);
      const handler = handleHandlers.get('updater:check')!;
      await handler({}, 'esa-cdn', 'https://ignored.example.com');
      expect(setFeedURLMock).toHaveBeenCalledWith({
        provider: 'generic',
        url: ESA_CDN_URL,
      });
    });
  });

  // ──────────────────────────────────────────────
  // updater:check handler
  // ──────────────────────────────────────────────

  describe('updater:check', () => {
    it('returns available:false when checkForUpdates returns null', async () => {
      checkForUpdatesMock.mockResolvedValue(null);
      const handler = handleHandlers.get('updater:check')!;
      const result = (await handler({}, 'github')) as { available: boolean };
      expect(result.available).toBe(false);
    });

    it('returns available:false when updateInfo is missing', async () => {
      checkForUpdatesMock.mockResolvedValue({});
      const handler = handleHandlers.get('updater:check')!;
      const result = (await handler({}, 'github')) as { available: boolean };
      expect(result.available).toBe(false);
    });

    it('returns available:true when latest version differs from current', async () => {
      getVersionMock.mockReturnValue('1.0.0');
      checkForUpdatesMock.mockResolvedValue({
        updateInfo: { version: '2.0.0', releaseNotes: 'New stuff' },
      });
      const handler = handleHandlers.get('updater:check')!;
      const result = (await handler({}, 'github')) as {
        available: boolean;
        version: string;
        releaseNotes: string;
        currentVersion: string;
      };
      expect(result.available).toBe(true);
      expect(result.version).toBe('2.0.0');
      expect(result.releaseNotes).toBe('New stuff');
      expect(result.currentVersion).toBe('1.0.0');
    });

    it('returns available:false when latest version equals current', async () => {
      getVersionMock.mockReturnValue('2.0.0');
      checkForUpdatesMock.mockResolvedValue({
        updateInfo: { version: '2.0.0', releaseNotes: '' },
      });
      const handler = handleHandlers.get('updater:check')!;
      const result = (await handler({}, 'github')) as { available: boolean };
      expect(result.available).toBe(false);
    });

    it('returns available:false with error when checkForUpdates throws', async () => {
      checkForUpdatesMock.mockRejectedValue(new Error('Network failure'));
      const handler = handleHandlers.get('updater:check')!;
      const result = (await handler({}, 'github')) as {
        available: boolean;
        error: string;
      };
      expect(result.available).toBe(false);
      expect(result.error).toBe('Network failure');
    });

    it('handles non-Error thrown values', async () => {
      checkForUpdatesMock.mockRejectedValue('string error');
      const handler = handleHandlers.get('updater:check')!;
      const result = (await handler({}, 'github')) as {
        available: boolean;
        error: string;
      };
      expect(result.available).toBe(false);
      expect(result.error).toBe('string error');
    });

    it('defaults releaseNotes to empty string when missing', async () => {
      getVersionMock.mockReturnValue('1.0.0');
      checkForUpdatesMock.mockResolvedValue({
        updateInfo: { version: '2.0.0' },
      });
      const handler = handleHandlers.get('updater:check')!;
      const result = (await handler({}, 'github')) as { releaseNotes: string };
      expect(result.releaseNotes).toBe('');
    });
  });

  // ──────────────────────────────────────────────
  // updater:download handler
  // ──────────────────────────────────────────────

  describe('updater:download', () => {
    it('returns true on successful download', async () => {
      checkForUpdatesMock.mockResolvedValue({
        updateInfo: { version: '2.0.0' },
      });
      downloadUpdateMock.mockResolvedValue(undefined);
      const handler = handleHandlers.get('updater:download')!;
      const result = await handler({}, 'github');
      expect(result).toBe(true);
      expect(downloadUpdateMock).toHaveBeenCalledTimes(1);
    });

    it('returns false when checkForUpdates returns null', async () => {
      checkForUpdatesMock.mockResolvedValue(null);
      const handler = handleHandlers.get('updater:download')!;
      const result = await handler({}, 'github');
      expect(result).toBe(false);
    });

    it('returns false when checkForUpdates returns no updateInfo', async () => {
      checkForUpdatesMock.mockResolvedValue({});
      const handler = handleHandlers.get('updater:download')!;
      const result = await handler({}, 'github');
      expect(result).toBe(false);
    });

    it('returns false when checkForUpdates throws', async () => {
      checkForUpdatesMock.mockRejectedValue(new Error('timeout'));
      const handler = handleHandlers.get('updater:download')!;
      const result = await handler({}, 'github');
      expect(result).toBe(false);
    });

    it('returns false when downloadUpdate throws', async () => {
      checkForUpdatesMock.mockResolvedValue({
        updateInfo: { version: '2.0.0' },
      });
      downloadUpdateMock.mockRejectedValue(new Error('disk full'));
      const handler = handleHandlers.get('updater:download')!;
      const result = await handler({}, 'github');
      expect(result).toBe(false);
    });
  });

  // ──────────────────────────────────────────────
  // updater:install handler
  // ──────────────────────────────────────────────

  describe('updater:install', () => {
    it('calls quitAndInstall(false, true) and returns true', () => {
      const handler = handleHandlers.get('updater:install')!;
      const result = handler();
      expect(result).toBe(true);
      expect(quitAndInstallMock).toHaveBeenCalledWith(false, true);
    });
  });

  // ──────────────────────────────────────────────
  // updater:version handler
  // ──────────────────────────────────────────────

  describe('updater:version', () => {
    it('returns the current version from getVersion', () => {
      getVersionMock.mockReturnValue('3.2.1');
      const handler = handleHandlers.get('updater:version')!;
      const result = handler();
      expect(result).toBe('3.2.1');
    });
  });
});
