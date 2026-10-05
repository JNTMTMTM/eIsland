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
 * @file runningProcessesRuntime.test.ts
 * @description 真实进程与窗口查询链的CSV、WMI、图标缓存、失败降级与平台边界测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface IconFixture {
  isEmpty: () => boolean;
  resize: (size: { width: number; height: number }) => IconFixture;
  toDataURL: () => string;
}

type ExecCallback = (error: Error | null, stdout: string) => void;

const mocks = vi.hoisted(() => ({
  exec: vi.fn<(command: string, options: unknown, callback: ExecCallback) => void>(),
  getFileIcon: vi.fn<(file: string, options: { size: string }) => Promise<IconFixture>>(),
  createFromPath: vi.fn<(file: string) => IconFixture>(),
  openWindows: vi.fn<() => Promise<unknown>>(),
  activeWindow: vi.fn<() => Promise<unknown>>(),
}));
const inputs = vi.hoisted(() => ({
  taskList: '',
  taskError: null as Error | null,
  paths: '[]',
  pathError: null as Error | null,
}));

vi.mock('electron', () => ({
  app: { getFileIcon: mocks.getFileIcon },
  nativeImage: { createFromPath: mocks.createFromPath },
}));
vi.mock('child_process', () => ({ exec: mocks.exec }));
vi.mock('get-windows', () => ({ openWindows: mocks.openWindows, activeWindow: mocks.activeWindow }));

const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
let source: typeof import('../runningProcesses');

/**
 * 构造具有可观察缩放与编码回调的最小图标边界。
 * @param dataUrl - 编码后的图标。
 * @param empty - true 表示操作系统未返回有效图标。
 * @returns 图标依赖的测试替身。
 */
function makeIcon(dataUrl: string, empty = false): IconFixture {
  const icon: IconFixture = {
    isEmpty: vi.fn(() => empty),
    resize: vi.fn(() => icon),
    toDataURL: vi.fn(() => dataUrl),
  };
  return icon;
}

/**
 * 设置 tasklist 与 WMI 返回值，调用真实公共进程查询链。
 * @param names - tasklist 的进程名称。
 * @param paths - WMI 的原始 JSON。
 * @returns 带图标的真实查询结果。
 */
function queryProcesses(names: string[], paths: string = '[]'): ReturnType<typeof source.queryRunningNonSystemProcessesWithIcons> {
  inputs.taskList = names.map((name) => `"${  name  }","123","Console"`).join('\r\n');
  inputs.paths = paths;
  return source.queryRunningNonSystemProcessesWithIcons();
}

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  inputs.taskList = '';
  inputs.taskError = null;
  inputs.paths = '[]';
  inputs.pathError = null;
  Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
  mocks.exec.mockImplementation((command, options, callback) => {
    void options;
    if (command.startsWith('tasklist')) callback(inputs.taskError, inputs.taskList);
    else callback(inputs.pathError, inputs.paths);
  });
  mocks.getFileIcon.mockResolvedValue(makeIcon('data:api'));
  mocks.createFromPath.mockReturnValue(makeIcon('data:fallback'));
  mocks.openWindows.mockResolvedValue([]);
  mocks.activeWindow.mockResolvedValue(null);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  source = await import('../runningProcesses');
});
afterEach(() => {
  if (originalPlatform) Object.defineProperty(process, 'platform', originalPlatform);
  vi.restoreAllMocks();
});

describe('running process runtime chains', () => {
  it('parses quoted and plain CSV rows, deduplicates names and filters system processes', async () => {
    inputs.taskList = ['"Zebra.exe","1"', '"Alpha.exe","2"', '"Alpha.exe","3"', 'Notepad.exe,4', '"System","0"', '"SYSTEM IDLE PROCESS","0"', '"Registry","0"', '"Memory Compression","0"', '"CSRSS.EXE","0"', '"svchost.exe","0"', '', ',0'].join('\r\n');
    expect(await source.queryRunningNonSystemProcessNames()).toEqual(['Alpha.exe', 'Notepad.exe', 'Zebra.exe']);
    expect(mocks.exec).toHaveBeenCalledWith('tasklist /fo csv /nh', { windowsHide: true, timeout: 4000, maxBuffer: 1024 * 1024 }, expect.any(Function));
  });
  it.each(['smss.exe', 'wininit.exe', 'winlogon.exe', 'services.exe', 'lsass.exe', 'fontdrvhost.exe', 'sihost.exe', 'dwm.exe', 'taskhostw.exe', 'runtimebroker.exe', 'startmenuexperiencehost.exe', 'shellexperiencehost.exe', 'searchhost.exe'])('filters reserved process %s', async (name) => {
    const result = await queryProcesses([name]);
    expect(result).toEqual([]);
    expect(mocks.exec).toHaveBeenCalledOnce();
  });
  it('returns an empty result after tasklist failure without issuing WMI or icon requests', async () => {
    inputs.taskError = new Error('timeout');
    expect(await source.queryRunningNonSystemProcessesWithIcons()).toEqual([]);
    expect(mocks.exec).toHaveBeenCalledOnce();
    expect(mocks.getFileIcon).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith('[Process] query running process failed:', 'timeout');
  });
  it('parses a BOM-prefixed WMI array, normalizes names and resizes successful icons', async () => {
    const icon = makeIcon('data:code');
    mocks.getFileIcon.mockResolvedValue(icon);
    const paths = `\uFEFF${  JSON.stringify([null, 1, { Name: 3, ExecutablePath: 'wrong' }, { Name: 'missing.exe', ExecutablePath: null }, { Name: ' code.EXE ', ExecutablePath: ' C:/Code.exe ' }])}`;
    expect(await queryProcesses(['Code.exe'], paths)).toEqual([{ name: 'Code.exe', iconDataUrl: 'data:code' }]);
    expect(mocks.getFileIcon).toHaveBeenCalledWith('C:/Code.exe', { size: 'small' });
    expect(icon.resize).toHaveBeenCalledWith({ width: 16, height: 16 });
    expect(mocks.exec.mock.calls[1][1]).toEqual({ windowsHide: true, timeout: 4000, maxBuffer: 6 * 1024 * 1024 });
    await queryProcesses(['Code.exe'], paths);
    expect(mocks.getFileIcon).toHaveBeenCalledOnce();
  });
  it('accepts one WMI object and falls back from rejected Electron icon lookup', async () => {
    mocks.getFileIcon.mockRejectedValue(new Error('icon unavailable'));
    const result = await queryProcesses(['Code.exe'], JSON.stringify({ Name: 'Code.exe', ExecutablePath: 'C:/Code.exe' }));
    expect(result).toEqual([{ name: 'Code.exe', iconDataUrl: 'data:fallback' }]);
    expect(mocks.createFromPath).toHaveBeenCalledWith('C:/Code.exe');
  });
  it('falls back for an empty Electron image and caches a missing fallback image', async () => {
    mocks.getFileIcon.mockResolvedValue(makeIcon('', true));
    mocks.createFromPath.mockReturnValue(makeIcon('', true));
    const paths = JSON.stringify({ Name: 'Code.exe', ExecutablePath: 'C:/Code.exe' });
    expect(await queryProcesses(['Code.exe'], paths)).toEqual([{ name: 'Code.exe', iconDataUrl: null }]);
    await queryProcesses(['Code.exe'], paths);
    expect(mocks.getFileIcon).toHaveBeenCalledOnce();
    expect(mocks.createFromPath).toHaveBeenCalledOnce();
  });
  it('returns null icons when both extraction methods fail', async () => {
    mocks.getFileIcon.mockRejectedValue(new Error('api failed'));
    mocks.createFromPath.mockImplementation(() => { throw new Error('native failed'); });
    expect(await queryProcesses(['Code.exe'], JSON.stringify({ Name: 'Code.exe', ExecutablePath: 'C:/Code.exe' }))).toEqual([{ name: 'Code.exe', iconDataUrl: null }]);
  });
  it.each(['', 'not json', '{broken', 'null', '[]', '[{"Name":"Code.exe"}]'])('handles missing or malformed WMI data %s without extracting a file icon', async (paths) => {
    expect(await queryProcesses(['Code.exe'], paths)).toEqual([{ name: 'Code.exe', iconDataUrl: null }]);
    expect(mocks.getFileIcon).not.toHaveBeenCalled();
  });
  it('handles a failed WMI command and preserves tasklist names', async () => {
    inputs.pathError = new Error('WMI denied');
    expect(await queryProcesses(['Code.exe'])).toEqual([{ name: 'Code.exe', iconDataUrl: null }]);
    expect(mocks.getFileIcon).not.toHaveBeenCalled();
  });
  it('evicts the oldest icon when the 240-entry cache fills', async () => {
    const names = Array.from({ length: 241 }, (value, index) => {
      void value;
      return `p${  String(index).padStart(3, '0')  }.exe`;
    });
    const paths = JSON.stringify(names.map((Name) => ({ Name, ExecutablePath: `C:/${  Name}` })));
    await queryProcesses(names, paths);
    expect(mocks.getFileIcon).toHaveBeenCalledTimes(241);
    await queryProcesses(['p000.exe'], JSON.stringify({ Name: 'p000.exe', ExecutablePath: 'C:/p000.exe' }));
    expect(mocks.getFileIcon).toHaveBeenCalledTimes(242);
  });
  it('checks running process names case-insensitively and short-circuits an empty target list', async () => {
    expect(await source.hasAnyRunningProcess([])).toBe(false);
    expect(mocks.exec).not.toHaveBeenCalled();
    inputs.taskList = '"Code.exe","1"';
    expect(await source.hasAnyRunningProcess([' CODE.EXE '])).toBe(true);
    expect(await source.hasAnyRunningProcess(['Code'])).toBe(false);
    expect(await source.hasAnyRunningProcess(['Other.exe'])).toBe(false);
  });
});

describe('running window runtime chains', () => {
  it('handles a malformed window list without producing metadata or icons', async () => {
    mocks.openWindows.mockResolvedValue(null);
    expect(await source.queryOpenWindowsWithIcons()).toEqual([]);
    expect(mocks.getFileIcon).not.toHaveBeenCalled();
  });
  it('ignores a non-string focused title before attempting icon extraction', async () => {
    mocks.activeWindow.mockResolvedValue({ title: 123, owner: { name: 'Code', path: 'C:/Code.exe' } });
    expect(await source.queryFocusedWindow()).toBeNull();
    expect(mocks.getFileIcon).not.toHaveBeenCalled();
  });
  it('caches null when both window image sources return empty images', async () => {
    mocks.getFileIcon.mockResolvedValue(makeIcon('', true));
    mocks.createFromPath.mockReturnValue(makeIcon('', true));
    mocks.activeWindow.mockResolvedValue({ title: 'Editor', owner: { name: 'Code', path: 'C:/Code.exe' } });
    expect(await source.queryFocusedWindow()).toMatchObject({ iconDataUrl: null });
    await source.queryFocusedWindow();
    expect(mocks.createFromPath).toHaveBeenCalledOnce();
  });

  it('normalizes window metadata, drops blank titles and sorts visible windows', async () => {
    mocks.openWindows.mockResolvedValue([
      { id: 7, title: ' Zebra ', owner: { name: ' Code.exe ', path: ' C:/Code.exe ', processId: 123 } },
      { title: 'Alpha', owner: { name: 4, path: 5, processId: Number.NaN } },
      { title: '   ', owner: { path: 'C:/Hidden.exe' } },
      { title: 7 },
    ]);
    expect(await source.queryOpenWindowsWithIcons()).toEqual([
      { id: 'Alpha--0', title: 'Alpha', processName: '', processPath: null, processId: null, iconDataUrl: null },
      { id: '7', title: 'Zebra', processName: 'Code.exe', processPath: 'C:/Code.exe', processId: 123, iconDataUrl: 'data:api' },
    ]);
    expect(mocks.getFileIcon).toHaveBeenCalledOnce();
  });
  it('caches icons across open-window and focused-window queries for the same executable path', async () => {
    const window = { id: 8, title: 'Editor', owner: { name: 'Code', path: 'C:/Code.exe', processId: 123 } };
    mocks.openWindows.mockResolvedValue([window]);
    mocks.activeWindow.mockResolvedValue(window);
    await source.queryOpenWindowsWithIcons();
    expect(await source.queryFocusedWindow()).toMatchObject({ id: '8', iconDataUrl: 'data:api' });
    expect(mocks.getFileIcon).toHaveBeenCalledOnce();
  });
  it.each(['empty', 'error'])('uses native-image fallback after %s Electron window icon', async (mode) => {
    if (mode === 'empty') mocks.getFileIcon.mockResolvedValue(makeIcon('', true));
    else mocks.getFileIcon.mockRejectedValue(new Error('unavailable'));
    mocks.activeWindow.mockResolvedValue({ title: 'Editor', owner: { name: 'Code', path: 'C:/Code.exe' } });
    expect(await source.queryFocusedWindow()).toMatchObject({ iconDataUrl: 'data:fallback' });
    expect(mocks.createFromPath).toHaveBeenCalledWith('C:/Code.exe');
  });
  it('caches null window icons after both extraction methods fail', async () => {
    mocks.getFileIcon.mockRejectedValue(new Error('api'));
    mocks.createFromPath.mockImplementation(() => { throw new Error('native'); });
    mocks.activeWindow.mockResolvedValue({ title: 'Editor', owner: { name: 'Code', path: 'C:/Code.exe' } });
    expect(await source.queryFocusedWindow()).toMatchObject({ iconDataUrl: null });
    await source.queryFocusedWindow();
    expect(mocks.getFileIcon).toHaveBeenCalledOnce();
  });
  it('caches window names without executable paths and normalizes non-finite process IDs', async () => {
    mocks.activeWindow.mockResolvedValue({ title: 'Editor', owner: { name: 'Code', processId: Number.POSITIVE_INFINITY } });
    expect(await source.queryFocusedWindow()).toMatchObject({ id: 'Editor-Code-0', processPath: null, processId: null, iconDataUrl: null });
    await source.queryFocusedWindow();
    expect(mocks.getFileIcon).not.toHaveBeenCalled();
  });
  it('returns empty window results and null focus on unsupported platforms', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    expect(await source.queryOpenWindowsWithIcons()).toEqual([]);
    expect(await source.queryFocusedWindow()).toBeNull();
    expect(mocks.openWindows).not.toHaveBeenCalled();
    expect(mocks.activeWindow).not.toHaveBeenCalled();
  });
  it('handles rejected window APIs, absent focus and unusable titles', async () => {
    mocks.openWindows.mockRejectedValueOnce(new Error('window unavailable'));
    mocks.activeWindow.mockRejectedValueOnce(new Error('focus unavailable'));
    expect(await source.queryOpenWindowsWithIcons()).toEqual([]);
    expect(await source.queryFocusedWindow()).toBeNull();
    expect(await source.queryFocusedWindow()).toBeNull();
    mocks.activeWindow.mockResolvedValue({ title: ' ' });
    expect(await source.queryFocusedWindow()).toBeNull();
    expect(mocks.getFileIcon).not.toHaveBeenCalled();
  });
  it.each([{ names: ['Code'], expected: true }, { names: ['CODE.EXE'], expected: true }, { names: ['Code-preview'], expected: false }, { names: [' '], expected: false }])('matches focus using exact executable variants $names', async ({ names, expected }) => {
    mocks.activeWindow.mockResolvedValue({ title: 'Unrelated document', owner: { name: 'Code.exe' } });
    expect(await source.hasAnyFocusedWindowTitle(names)).toBe(expected);
  });
  it('short-circuits empty focused process filters and ignores windows without a process name', async () => {
    expect(await source.hasAnyFocusedWindowTitle([])).toBe(false);
    expect(mocks.activeWindow).not.toHaveBeenCalled();
    mocks.activeWindow.mockResolvedValue({ title: 'Editor' });
    expect(await source.hasAnyFocusedWindowTitle(['Code'])).toBe(false);
  });
});
