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
 * @file index.test.ts
 * @description 单元测试文件
 * @author 鸡哥
 */

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

type PreloadSetup = {
  sendMock: ReturnType<typeof vi.fn>;
  invokeMock: ReturnType<typeof vi.fn>;
  onMock: ReturnType<typeof vi.fn>;
  removeListenerMock: ReturnType<typeof vi.fn>;
  exposeInMainWorldMock: ReturnType<typeof vi.fn>;
  getPathForFileMock: ReturnType<typeof vi.fn>;
  electronAPI: Record<string, unknown>;
  handlerMap: Map<string, (...args: unknown[]) => void>;
};

type TestWindow = {
  electron?: unknown;
  api?: ExposedApi;
};

type ExposedApi = {
  enableMousePassthrough: () => void;
  getMousePosition: () => Promise<unknown>;
  mediaGetMuted: () => Promise<boolean | null>;
  mediaToggleMuted: () => Promise<boolean | null>;
  onNowPlayingInfo: (callback: (payload: unknown) => void) => () => void;
  getPathForFile: (file: File) => string;
  windowClose: () => void;
};

const installTestWindow = (): TestWindow => {
  const current = (globalThis as { window?: unknown }).window;
  if (current && typeof current === 'object') return current as TestWindow;
  Object.defineProperty(globalThis, 'window', {
    value: {},
    configurable: true,
    writable: true,
  });
  return (globalThis as { window: unknown }).window as TestWindow;
};

const originalContextIsolated = Object.getOwnPropertyDescriptor(process, 'contextIsolated');

async function loadPreloadWithContextIsolation(contextIsolated: boolean): Promise<PreloadSetup> {
  vi.resetModules();

  const handlerMap = new Map<string, (...args: unknown[]) => void>();
  const sendMock = vi.fn();
  const invokeMock = vi.fn();
  const onMock = vi.fn((channel: string, handler: (...args: unknown[]) => void) => {
    handlerMap.set(channel, handler);
  });
  const removeListenerMock = vi.fn();
  const exposeInMainWorldMock = vi.fn();
  const getPathForFileMock = vi.fn(() => 'C:/mock/file.txt');
  const electronAPI = { platform: 'mock' };

  vi.doMock('electron', () => ({
    contextBridge: { exposeInMainWorld: exposeInMainWorldMock },
    ipcRenderer: {
      send: sendMock,
      invoke: invokeMock,
      on: onMock,
      removeListener: removeListenerMock,
    },
    webUtils: {
      getPathForFile: getPathForFileMock,
    },
  }));

  vi.doMock('@electron-toolkit/preload', () => ({
    electronAPI,
  }));

  Object.defineProperty(process, 'contextIsolated', {
    value: contextIsolated,
    configurable: true,
  });

  installTestWindow();

  await import('./index');

  return {
    sendMock,
    invokeMock,
    onMock,
    removeListenerMock,
    exposeInMainWorldMock,
    getPathForFileMock,
    electronAPI,
    handlerMap,
  };
}

describe('preload bridge', () => {
  beforeEach(() => {
    installTestWindow();
  });

  afterAll(() => {
    if (originalContextIsolated) {
      Object.defineProperty(process, 'contextIsolated', originalContextIsolated);
      return;
    }
    Reflect.deleteProperty(process, 'contextIsolated');
  });

  it('exposes electron and api in context isolated mode and proxies ipc calls', async () => {
    const setup = await loadPreloadWithContextIsolation(true);

    expect(setup.exposeInMainWorldMock).toHaveBeenCalledWith('electron', setup.electronAPI);

    const apiCall = setup.exposeInMainWorldMock.mock.calls.find(([name]) => name === 'api');
    expect(apiCall).toBeTruthy();

    const api = apiCall?.[1] as ExposedApi;

    api.enableMousePassthrough();
    expect(setup.sendMock).toHaveBeenCalledWith('window:enable-mouse-passthrough');

    setup.invokeMock.mockResolvedValue({ x: 100, y: 200 });
    await api.getMousePosition();
    expect(setup.invokeMock).toHaveBeenCalledWith('window:get-mouse-position');

    await api.mediaGetMuted();
    expect(setup.invokeMock).toHaveBeenCalledWith('media:get-muted');

    await api.mediaToggleMuted();
    expect(setup.invokeMock).toHaveBeenCalledWith('media:toggle-muted');

    const callback = vi.fn();
    const unsubscribe = api.onNowPlayingInfo(callback);
    const handler = setup.handlerMap.get('nowplaying:info');
    handler?.({}, { title: 't' });
    expect(callback).toHaveBeenCalledWith({ title: 't' });

    unsubscribe();
    expect(setup.removeListenerMock).toHaveBeenCalledWith('nowplaying:info', expect.any(Function));

    api.getPathForFile({} as File);
    expect(setup.getPathForFileMock).toHaveBeenCalledTimes(1);
  });

  it('assigns electron and api to window in non-isolated mode', async () => {
    const setup = await loadPreloadWithContextIsolation(false);
    const exposedWindow = installTestWindow();

    expect(exposedWindow.electron).toBe(setup.electronAPI);
    expect(typeof exposedWindow.api).toBe('object');

    exposedWindow.api?.windowClose();
    expect(setup.sendMock).toHaveBeenCalledWith('window:close');
    expect(setup.exposeInMainWorldMock).not.toHaveBeenCalled();
  });
});
