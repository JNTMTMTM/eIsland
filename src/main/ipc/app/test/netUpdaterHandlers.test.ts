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
 * @file netUpdaterHandlers.test.ts
 * @description net / updater IPC handlers 单元测试。
 * @author 鸡哥
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

type RequestScenario =
  | { type: 'response'; statusCode: number; body: string }
  | { type: 'request-error'; message: string }
  | { type: 'hang' };

interface NetRequestMock {
  setHeader: ReturnType<typeof vi.fn>;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  write: ReturnType<typeof vi.fn>;
  end: () => void;
  abort: ReturnType<typeof vi.fn>;
}

const { handleMock, netRequestMock } = vi.hoisted(() => ({
  handleMock: vi.fn(),
  netRequestMock: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: handleMock,
  },
  net: {
    request: netRequestMock,
  },
}));

import { registerNetIpcHandlers } from '../net';
import { registerUpdaterIpcHandlers } from '../updater';

describe('app net/updater ipc handlers', () => {
  const handleHandlers = new Map<string, (...args: unknown[]) => unknown>();
  let scenarios: RequestScenario[] = [];
  const createdRequests: NetRequestMock[] = [];

  beforeEach(() => {
    handleHandlers.clear();
    scenarios = [];
    createdRequests.length = 0;

    handleMock.mockReset();
    netRequestMock.mockReset();

    handleMock.mockImplementation((channel: string, handler: (...args: unknown[]) => unknown) => {
      handleHandlers.set(channel, handler);
    });

    netRequestMock.mockImplementation(() => {
      const listeners = new Map<string, (...args: unknown[]) => void>();
      const request: NetRequestMock = {
        setHeader: vi.fn(),
        on: (event: string, listener: (...args: unknown[]) => void) => {
          listeners.set(event, listener);
        },
        write: vi.fn(),
        end: () => {
          const scenario = scenarios.shift() ?? { type: 'response', statusCode: 200, body: '' };
          if (scenario.type === 'hang') {
            return;
          }
          if (scenario.type === 'request-error') {
            listeners.get('error')?.(new Error(scenario.message));
            return;
          }

          const responseListeners = new Map<string, (...args: unknown[]) => void>();
          const response = {
            statusCode: scenario.statusCode,
            on: (event: string, listener: (...args: unknown[]) => void) => {
              responseListeners.set(event, listener);
            },
          };
          listeners.get('response')?.(response);
          Promise.resolve().then(() => {
            responseListeners.get('data')?.(Buffer.from(scenario.body));
            responseListeners.get('end')?.();
          });
        },
        abort: vi.fn(),
      };
      createdRequests.push(request);
      return request;
    });
  });

  it('blocks untrusted sender and invalid url in net fetch', async () => {
    const writeMainLog = vi.fn();
    registerNetIpcHandlers({ writeMainLog });

    const handler = handleHandlers.get('net:fetch');

    await expect(handler?.({ senderFrame: { url: 'https://evil.example.com' } }, 'https://api.example.com')).resolves.toEqual({
      ok: false,
      status: 403,
      body: '',
    });

    await expect(handler?.({ senderFrame: { url: 'app://index.html' } }, 'file:///tmp/a.txt')).resolves.toEqual({
      ok: false,
      status: 400,
      body: '',
    });

    expect(writeMainLog).toHaveBeenCalledWith('warn', expect.stringContaining('blocked request from untrusted sender'));
    expect(writeMainLog).toHaveBeenCalledWith('warn', expect.stringContaining('blocked non-http(s) url'));
    expect(netRequestMock).not.toHaveBeenCalled();
  });

  it('returns net fetch response and handles timeout/request error', async () => {
    const writeMainLog = vi.fn();
    registerNetIpcHandlers({ writeMainLog });
    const handler = handleHandlers.get('net:fetch');

    scenarios.push({ type: 'response', statusCode: 200, body: 'ok-body' });
    await expect(
      handler?.(
        { senderFrame: { url: 'app://index.html' } },
        'https://api.example.com/path',
        {
          method: 'POST',
          headers: { Authorization: 'secret', 'X-Test': 'v' },
          body: JSON.stringify({ token: 'abc', name: 'u' }),
          timeoutMs: 1000,
        },
      ),
    ).resolves.toEqual({ ok: true, status: 200, body: 'ok-body' });

    expect(createdRequests[0]?.write).toHaveBeenCalled();

    vi.useFakeTimers();
    try {
      scenarios.push({ type: 'hang' });
      const timeoutPromise = handler?.(
        { senderFrame: { url: 'app://index.html' } },
        'https://api.example.com/path',
        {
          method: 'GET',
          timeoutMs: 1,
        },
      );

      await vi.advanceTimersByTimeAsync(5);
      await expect(timeoutPromise).resolves.toEqual({ ok: false, status: 408, body: 'timeout' });
      expect(createdRequests[1]?.abort).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }

    scenarios.push({ type: 'request-error', message: 'network down' });
    await expect(
      handler?.(
        { senderFrame: { url: 'app://index.html' } },
        'https://api.example.com/path',
      ),
    ).resolves.toEqual({ ok: false, status: 0, body: '' });

    expect(writeMainLog).toHaveBeenCalledWith('error', expect.stringContaining('request error'));
  });

  it('handles updater check and download branches', async () => {
    const updater = {
      setFeedURL: vi.fn(),
      checkForUpdates: vi.fn(),
      downloadUpdate: vi.fn(),
      quitAndInstall: vi.fn(),
    };

    registerUpdaterIpcHandlers({
      updater: updater as never,
      getVersion: () => '1.0.0',
      isPackaged: () => false,
    });

    const checkHandler = handleHandlers.get('updater:check');
    const downloadHandler = handleHandlers.get('updater:download');

    updater.checkForUpdates.mockResolvedValueOnce({ updateInfo: { version: '1.0.1', releaseNotes: 'notes' } });
    await expect(checkHandler?.({}, 'github')).resolves.toEqual({
      available: true,
      version: '1.0.1',
      releaseNotes: 'notes',
      currentVersion: '1.0.0',
    });
    expect(updater.setFeedURL).toHaveBeenCalledWith(expect.objectContaining({ provider: 'github' }));

    await expect(checkHandler?.({}, 'tencent-cos')).resolves.toEqual({
      available: false,
      error: 'PRO update source requires a server-issued URL',
    });

    updater.checkForUpdates.mockResolvedValueOnce(null);
    await expect(downloadHandler?.({}, 'cloudflare-r2')).resolves.toBe(false);

    updater.checkForUpdates.mockResolvedValueOnce({ updateInfo: { version: '1.0.2' } });
    updater.downloadUpdate.mockResolvedValueOnce(undefined);
    await expect(downloadHandler?.({}, 'cloudflare-r2')).resolves.toBe(true);
  });

  it('handles updater install and version', () => {
    const updater = {
      setFeedURL: vi.fn(),
      checkForUpdates: vi.fn(),
      downloadUpdate: vi.fn(),
      quitAndInstall: vi.fn(),
    };

    registerUpdaterIpcHandlers({
      updater: updater as never,
      getVersion: () => '2.3.4',
      isPackaged: () => true,
    });

    const installHandler = handleHandlers.get('updater:install');
    const versionHandler = handleHandlers.get('updater:version');

    expect(installHandler?.({})).toBe(true);
    expect(updater.quitAndInstall).toHaveBeenCalledWith(false, true);
    expect(versionHandler?.({})).toBe('2.3.4');
  });
});
