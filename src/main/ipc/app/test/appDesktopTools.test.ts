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
 * @file appDesktopTools.test.ts
 * @description 桌面叶依赖、本地压缩与媒体工具、应用IPC及窗口生命周期边界测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupHarness, resetHarness, mocks, root, window, events, tool, invoke } from './appHarness';
beforeEach(resetHarness);
afterEach(cleanupHarness);

describe('desktop integration tools at isolated leaf boundaries', () => {
  it('captures a screen into the selected workspace using the first source', async () => {
    expect(await tool('win.screenshot', { path: 'capture.png' })).toMatchObject({ success: true, result: { path: `${root  }\\capture.png`, size: 3, fileName: 'capture.png' } });
    expect(mocks.capture).toHaveBeenCalledWith({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } });
    expect(mocks.write).toHaveBeenCalledWith(`${root  }\\capture.png`, Buffer.from('png'));
  });
  it('generates the default screenshot name and handles absent capture sources', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-02T03:04:05Z'));
    expect(await tool('win.screenshot', {})).toMatchObject({ success: true, result: { fileName: 'screenshot_2026-01-02_03-04-05.png' } });
    mocks.capture.mockResolvedValue([]);
    expect(await tool('win.screenshot', {})).toMatchObject({ success: false, error: '无法获取屏幕截图源' });
  });
  it('guards screenshot workspace boundaries and propagates image write failures', async () => {
    expect((await tool('win.screenshot', {}, [])).success).toBe(false);
    expect((await tool('win.screenshot', { path: 'C:\\outside\\capture.png' })).success).toBe(false);
    expect(mocks.capture).not.toHaveBeenCalled();
    mocks.write.mockRejectedValue(new Error('image write denied'));
    expect(await tool('win.screenshot', { path: 'capture.png' })).toMatchObject({ success: false, error: 'image write denied' });
  });
  it('reads clipboard text without an image and serializes an available image', async () => {
    mocks.text.mockReturnValue('');
    expect(await tool('clipboard.read', {})).toMatchObject({ success: true, result: { text: null, hasImage: false } });
    mocks.text.mockReturnValue('text');
    mocks.image.mockReturnValue({ isEmpty: () => false, toPNG: () => Buffer.from('png'), getSize: () => ({ width: 10, height: 20 }) });
    expect(await tool('clipboard.read', {})).toMatchObject({ success: true, result: { text: 'text', hasImage: true, imageBase64: 'cG5n', imageSize: 3, imageWidth: 10, imageHeight: 20 } });
  });
  it('writes normalized clipboard text and avoids empty writes', async () => {
    expect(await tool('clipboard.write', { text: ' fixture ' })).toMatchObject({ success: true, result: { written: true, length: 7 } });
    expect(mocks.clipboardWrite).toHaveBeenCalledWith('fixture');
    mocks.clipboardWrite.mockClear();
    expect((await tool('clipboard.write', { text: ' ' })).success).toBe(false);
    expect(mocks.clipboardWrite).not.toHaveBeenCalled();
    mocks.clipboardWrite.mockImplementation(() => { throw new Error('clipboard denied'); });
    expect(await tool('clipboard.write', { text: 'fixture' })).toMatchObject({ success: false, error: 'clipboard denied' });
  });
  it('shows notifications with default or explicit titles after validation', async () => {
    expect(await tool('notification.send', { body: ' Body ' })).toMatchObject({ success: true, result: { title: 'eIsland Agent', body: 'Body', sent: true } });
    expect(mocks.notification).toHaveBeenCalledWith({ title: 'eIsland Agent', body: 'Body' });
    expect(mocks.showNotification).toHaveBeenCalledOnce();
    expect(await tool('notification.send', { title: ' Title ', body: 'Body' })).toMatchObject({ success: true, result: { title: 'Title' } });
    expect((await tool('notification.send', {})).success).toBe(false);
  });
  it('compresses and extracts files through quoted command arguments and destination validation', async () => {
    expect(await tool('file.compress', { path: `${root  }\\o'ne` })).toMatchObject({ success: true, result: { source: `${root  }\\o'ne`, destination: `${root  }\\o'ne.zip`, size: 3 } });
    expect(mocks.exec.mock.calls[0][1].at(-1)).toContain("o''ne.zip");
    mocks.stat.mockRejectedValue(new Error('stat denied'));
    expect(await tool('file.compress', { path: `${root  }\\input`, destination: `${root  }\\explicit.zip` })).toMatchObject({ success: true, result: { size: 0, destination: `${root  }\\explicit.zip` } });
    expect(await tool('file.extract', { path: `${root  }\\input.zip` })).toMatchObject({ success: true, result: { destination: root, extracted: true } });
    expect(mocks.exec.mock.calls[2][1].at(-1)).toContain('Expand-Archive');
    expect(await tool('file.extract', { path: `${root  }\\input.zip`, destination: `${root  }\\output` })).toMatchObject({ success: true, result: { destination: `${root  }\\output` } });
    const calls = mocks.exec.mock.calls.length;
    expect((await tool('file.compress', { path: `${root  }\\input`, destination: 'C:\\outside\\output' })).success).toBe(false);
    expect(mocks.exec).toHaveBeenCalledTimes(calls);
  });
  it.each(['file.compress', 'file.extract'])('%s reports command failures', async (name) => {
    mocks.exec.mockImplementation((program, args, options, callback) => { void program; void args; void options; callback(new Error('archive denied'), '', ''); });
    expect(await tool(name, { path: `${root  }\\input.zip` })).toMatchObject({ success: false, error: 'archive denied' });
  });
  it('trashes only a validated workspace path and propagates shell failure', async () => {
    expect(await tool('file.trash', { path: `${root  }\\a` })).toMatchObject({ success: true, result: { trashed: true } });
    expect(mocks.trash).toHaveBeenCalledWith(`${root  }\\a`);
    mocks.trash.mockRejectedValue(new Error('trash denied'));
    expect(await tool('file.trash', { path: `${root  }\\a` })).toMatchObject({ success: false, error: 'trash denied' });
  });
  it('returns idle media metadata or an active playback snapshot', async () => {
    expect(await tool('sys.nowplaying', {})).toMatchObject({ success: true, result: { playing: false, message: '当前没有正在播放的媒体' } });
    mocks.nowPlaying.mockReturnValue({ title: 'Song', artist: 'Artist', album: 'Album', isPlaying: true, duration_ms: 1000, position_ms: 300, deviceId: 'device' });
    expect(await tool('sys.nowplaying', {})).toMatchObject({ success: true, result: { playing: true, title: 'Song', artist: 'Artist', album: 'Album', isPlaying: true, duration_ms: 1000, position_ms: 300, deviceId: 'device' } });
  });
});

describe('remaining application IPC handlers', () => {
  it('quits and restarts through application boundaries, with a boolean failure response', async () => {
    const quit = events.get('app:quit');
    expect(quit).toBeTypeOf('function');
    quit?.({});
    expect(mocks.quit).toHaveBeenCalledOnce();
    expect(await invoke('app:restart')).toBe(true);
    expect(mocks.relaunch).toHaveBeenCalledOnce();
    expect(mocks.exit).toHaveBeenCalledWith(0);
    mocks.relaunch.mockImplementation(() => { throw new Error('relaunch failed'); });
    expect(await invoke('app:restart')).toBe(false);
  });
  it('opens the logs folder and reports shell failures', async () => {
    expect(await invoke('app:open-logs-folder')).toBe(true);
    expect(mocks.openPath).toHaveBeenCalledWith('C:\\logs');
    mocks.openPath.mockResolvedValue('shell error');
    expect(await invoke('app:open-logs-folder')).toBe(false);
    mocks.openPath.mockRejectedValue(new Error('shell denied'));
    expect(await invoke('app:open-logs-folder')).toBe(false);
  });
  it('clears log caches and converts failed cleanup into a stable response', async () => {
    expect(await invoke('app:clear-logs-cache')).toEqual({ success: true, freedBytes: 2048 });
    mocks.clearLogs.mockReturnValue({ success: false, fileCount: 0, freedBytes: 4096 });
    expect(await invoke('app:clear-logs-cache')).toEqual({ success: false, freedBytes: 0 });
    mocks.clearLogs.mockImplementation(() => { throw new Error('cleanup denied'); });
    expect(await invoke('app:clear-logs-cache')).toEqual({ success: false, freedBytes: 0 });
  });
  it('selects icon providers by shortcut extension and converts bytes to base64', async () => {
    expect(await invoke('app:get-file-icon', 'C:\\fixture.exe')).toBe('aWNvbg==');
    expect(mocks.icon).toHaveBeenCalledWith('C:\\fixture.exe');
    expect(await invoke('app:get-file-icon', 'C:\\fixture.LNK')).toBe('c2hvcnRjdXQ=');
    expect(mocks.shortcutIcon).toHaveBeenCalledWith('C:\\fixture.LNK');
    mocks.icon.mockReturnValue(null);
    expect(await invoke('app:get-file-icon', 'C:\\fixture.exe')).toBeNull();
    mocks.icon.mockImplementation(() => { throw new Error('icon denied'); });
    expect(await invoke('app:get-file-icon', 'C:\\fixture.exe')).toBeNull();
  });
  it('opens a file or reveals an existing path and handles shell errors', async () => {
    expect(await invoke('app:open-file', `${root  }\\a`)).toBe(true);
    expect(mocks.openPath).toHaveBeenCalledWith(`${root  }\\a`);
    mocks.openPath.mockRejectedValue(new Error('open denied'));
    expect(await invoke('app:open-file', `${root  }\\a`)).toBe(false);
    expect(await invoke('app:open-in-explorer', `${root  }\\a`)).toBe(true);
    expect(mocks.reveal).toHaveBeenCalledWith(`${root  }\\a`);
    mocks.exists.mockReturnValue(false);
    expect(await invoke('app:open-in-explorer', `${root  }\\a`)).toBe(false);
    expect(await invoke('app:open-in-explorer', '')).toBe(false);
    mocks.exists.mockReturnValue(true);
    mocks.reveal.mockImplementation(() => { throw new Error('reveal denied'); });
    expect(await invoke('app:open-in-explorer', `${root  }\\a`)).toBe(false);
  });
  it('resolves shortcut names on Windows and safely handles errors and other platforms', async () => {
    const original = Object.getOwnPropertyDescriptor(process, 'platform');
    try {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
      expect(await invoke('app:resolve-shortcut', 'C:\\Fixture.lnk')).toEqual({ target: 'C:\\fixture.exe', name: 'Fixture' });
      mocks.shortcut.mockImplementation(() => { throw new Error('shortcut denied'); });
      expect(await invoke('app:resolve-shortcut', 'C:\\Fixture.lnk')).toBeNull();
      Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
      expect(await invoke('app:resolve-shortcut', 'C:\\Fixture.lnk')).toBeNull();
    } finally {
      if (original) Object.defineProperty(process, 'platform', original);
    }
  });
  it.each([
    { channel: 'app:open-standalone-window', boundary: 'standaloneOpen' },
    { channel: 'app:close-standalone-window', boundary: 'standaloneClose' },
  ] as const)('$channel returns success or failure from its dedicated boundary', async ({ channel, boundary }) => {
    expect(await invoke(channel)).toBe(true);
    expect(mocks[boundary]).toHaveBeenCalledOnce();
    mocks[boundary].mockImplementation(() => { throw new Error('standalone denied'); });
    expect(await invoke(channel)).toBe(false);
  });
  it('does not operate window events when their owner has disappeared', () => {
    mocks.ownerWindow.mockReturnValue(null);
    ['window:minimize', 'window:maximize', 'window:close'].forEach((name) => { events.get(name)?.({ sender: {} }); });
    expect(window.minimize).not.toHaveBeenCalled();
    expect(window.maximize).not.toHaveBeenCalled();
    expect(window.close).not.toHaveBeenCalled();
  });
  it.each(['app:pick-local-search-directory', 'app:pick-skill-file', 'app:pick-feedback-screenshot-file', 'app:pick-feedback-log-file', 'app:pick-file-for-hash'])('%s handles an empty accepted selection and the focused-window fallback', async (channel) => {
    mocks.openDialog.mockResolvedValue({ canceled: false, filePaths: [] });
    expect(await invoke(channel)).toBeNull();
    mocks.ownerWindow.mockReturnValue(null);
    mocks.focusedWindow.mockReturnValue(window);
    mocks.openDialog.mockResolvedValue({ canceled: false, filePaths: ['C:\\fixture.log'] });
    expect(await invoke(channel)).toBe('C:\\fixture.log');
  });
  it('handles accepted save dialogs without output paths and absent image windows', async () => {
    mocks.saveDialog.mockResolvedValue({ canceled: false });
    expect(await invoke('app:save-text-file', { content: 42, defaultPath: ' ', filters: [null, { name: 42, extensions: ['txt'] }] })).toEqual({ ok: false, canceled: true, filePath: null });
    expect(await invoke('app:save-image-as', `${root  }\\image.png`)).toEqual({ ok: false, canceled: true, filePath: null });
    mocks.ownerWindow.mockReturnValue(null);
    expect(await invoke('app:save-image-as', `${root  }\\image.png`)).toEqual({ ok: false, canceled: false, filePath: null });
    expect(await invoke('app:open-in-explorer', 42)).toBe(false);
    expect(await invoke('app:save-image-as', 42)).toEqual({ ok: false, canceled: false, filePath: null });
    expect(await invoke('app:compute-file-hash', 42, 'sha256')).toBeNull();
  });
});
