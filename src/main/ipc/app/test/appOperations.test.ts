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
 * @file appOperations.test.ts
 * @description 应用IPC与Agent本地工具的目录筛选、工作区边界、文件读写、窗口和哈希行为测试。
 * @author 鸡哥
 */

import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerAppIpcHandlers } from '../app';
import type { AgentLocalToolRequest, AgentLocalToolResult } from '../../agent';
import type { RunningWindowInfo } from '../../../system/runningProcesses';

type IpcHandler = (...args: unknown[]) => unknown;
interface DirectoryEntry {
  name: string | Buffer;
  isDirectory: () => boolean;
}
interface FileInfo {
  isFile: () => boolean;
  isDirectory: () => boolean;
  size: number;
}
type ExecuteTool = (request: AgentLocalToolRequest) => Promise<AgentLocalToolResult>;
type ExecCallback = (error: Error | null, stdout: unknown, stderr: unknown) => void;
interface WindowFixture {
  isDestroyed: () => boolean;
  isMaximized: () => boolean;
  minimize: () => void;
  maximize: () => void;
  unmaximize: () => void;
  close: () => void;
}
const mocks = vi.hoisted(() => ({
  handle: vi.fn<(channel: string, callback: IpcHandler) => void>(),
  on: vi.fn<(channel: string, callback: IpcHandler) => void>(),
  registerAgent: vi.fn<(options: { executeAgentLocalTool: ExecuteTool }) => void>(),
  exists: vi.fn<(file: string) => boolean>(),
  readdir: vi.fn<(file: string, options: unknown) => Promise<DirectoryEntry[]>>(),
  stat: vi.fn<(file: string) => Promise<FileInfo>>(),
  read: vi.fn<(...args: unknown[]) => Promise<string | Buffer>>(),
  write: vi.fn<(...args: unknown[]) => Promise<void>>(),
  mkdir: vi.fn<(...args: unknown[]) => Promise<void>>(),
  copy: vi.fn<(...args: unknown[]) => Promise<void>>(),
  append: vi.fn<(...args: unknown[]) => Promise<void>>(),
  rename: vi.fn<(...args: unknown[]) => Promise<void>>(),
  rm: vi.fn<(...args: unknown[]) => Promise<void>>(),
  stream: vi.fn<(file: string) => Readable>(),
  exec: vi.fn<(program: string, args: string[], options: unknown, callback: ExecCallback) => void>(),
  windows: vi.fn<() => Promise<RunningWindowInfo[]>>(),
  ownerWindow: vi.fn<() => WindowFixture | null>(),
  focusedWindow: vi.fn<() => WindowFixture | null>(),
  openDialog: vi.fn<(...args: unknown[]) => Promise<{ canceled: boolean; filePaths: string[] }>>(),
  saveDialog: vi.fn<(...args: unknown[]) => Promise<{ canceled: boolean; filePath?: string }>>(),
  reveal: vi.fn<(file: string) => void>(),
  openPath: vi.fn<(file: string) => Promise<string>>(),
  getPath: vi.fn<(name: string) => string>(),
}));
vi.mock('electron', () => ({
  ipcMain: { handle: mocks.handle, on: mocks.on },
  app: { quit: vi.fn(), relaunch: vi.fn(), exit: vi.fn(), getPath: mocks.getPath },
  BrowserWindow: { fromWebContents: mocks.ownerWindow, getFocusedWindow: mocks.focusedWindow },
  dialog: { showOpenDialog: mocks.openDialog, showSaveDialog: mocks.saveDialog },
  shell: { showItemInFolder: mocks.reveal, openPath: mocks.openPath, readShortcutLink: vi.fn(), openExternal: vi.fn() },
}));
vi.mock('fs', () => ({ existsSync: mocks.exists, createReadStream: mocks.stream }));
vi.mock('fs/promises', () => ({
  readdir: mocks.readdir, stat: mocks.stat, readFile: mocks.read, writeFile: mocks.write,
  mkdir: mocks.mkdir, copyFile: mocks.copy, appendFile: mocks.append, rename: mocks.rename, rm: mocks.rm,
}));
vi.mock('child_process', () => ({ execFile: mocks.exec }));
vi.mock('../../../log/mainLog', () => ({
  clearLogsCacheFiles: vi.fn(), ensureLogsDir: vi.fn(() => 'C:\\logs'),
}));
vi.mock('../../../window/standaloneWindow', () => ({
  openStandaloneWindow: vi.fn(), closeStandaloneWindow: vi.fn(),
}));
vi.mock('../../agent', () => ({ registerAgentIpcHandlers: mocks.registerAgent }));
vi.mock('../../../system/runningProcesses', () => ({ queryOpenWindowsWithIcons: mocks.windows }));
vi.mock('../../../utils/broadcast', () => ({ broadcastSettingChange: vi.fn() }));
vi.mock('../../../music/smtcAccessor', () => ({ getSmtcNowPlaying: vi.fn() }));
vi.mock('@eisland/windows-application-icon-helper', () => ({ getIconByPath: vi.fn(), getIconByShortcutPath: vi.fn() }));

const root = 'C:\\workspace';
const handles = new Map<string, IpcHandler>();
const events = new Map<string, IpcHandler>();
const directories = new Map<string, DirectoryEntry[]>();
let executeTool: ExecuteTool;
let window: WindowFixture;

/**
 * 生成具有明确文件类型的目录项边界。
 * @param name - 操作系统返回的名称。
 * @param directory - 是否是目录。
 * @returns 最小目录项。
 */
function entry(name: string | Buffer, directory = false): DirectoryEntry {
  return { name, isDirectory: () => directory };
}
/**
 * 调用真实注册的应用 IPC，避免通过不存在的处理器得到空断言。
 * @param channel - 已注册频道。
 * @param args - 业务参数。
 * @returns 真实处理器结果。
 */
function invoke(channel: string, ...args: unknown[]): unknown {
  const handler = handles.get(channel);
  if (!handler) throw new Error(`Missing handler: ${  channel}`);
  return handler({ sender: { id: 7 } }, ...args);
}
/**
 * 调用真实的本地工具实现，限定到虚构测试工作区。
 * @param tool - 本地工具名称。
 * @param args - 工具参数。
 * @param workspaces - 允许路径列表。
 * @returns 真实工具的响应。
 */
function tool(tool: string, args: unknown, workspaces: unknown = [root]): Promise<AgentLocalToolResult> {
  return executeTool({ tool, workspaces, arguments: args });
}

/**
 * 包装消息匹配器，避免 Vitest 的 any 返回值进入业务形状断言。
 * @param message - 错误中的稳定片段。
 * @returns 非对称匹配器。
 */
function errorContaining(message: string): unknown {
  return expect.stringContaining(message);
}

beforeEach(() => {
  vi.resetAllMocks();
  directories.clear();
  handles.clear();
  events.clear();
  mocks.handle.mockImplementation((channel, handler) => { handles.set(channel, handler); });
  mocks.on.mockImplementation((channel, handler) => { events.set(channel, handler); });
  mocks.registerAgent.mockImplementation(({ executeAgentLocalTool }) => { executeTool = executeAgentLocalTool; });
  mocks.exists.mockReturnValue(true);
  mocks.readdir.mockImplementation((path) => {
    const found = directories.get(path);
    if (!found) throw new Error(`directory unavailable: ${  path}`);
    return Promise.resolve(found);
  });
  mocks.stat.mockResolvedValue({ isFile: () => true, isDirectory: () => false, size: 3 });
  mocks.read.mockResolvedValue('abc');
  mocks.write.mockResolvedValue(undefined);
  mocks.mkdir.mockResolvedValue(undefined);
  mocks.copy.mockResolvedValue(undefined);
  mocks.append.mockResolvedValue(undefined);
  mocks.rename.mockResolvedValue(undefined);
  mocks.rm.mockResolvedValue(undefined);
  mocks.stream.mockImplementation(() => Readable.from([Buffer.from('a'), Buffer.from('bc')]));
  mocks.exec.mockImplementation((program, args, options, callback) => {
    void program; void args; void options; callback(null, 'output', 'warning');
  });
  mocks.windows.mockResolvedValue([]);
  window = { isDestroyed: vi.fn(() => false), isMaximized: vi.fn(() => false), minimize: vi.fn(), maximize: vi.fn(), unmaximize: vi.fn(), close: vi.fn() };
  mocks.ownerWindow.mockReturnValue(window);
  mocks.focusedWindow.mockReturnValue(null);
  mocks.openDialog.mockResolvedValue({ canceled: false, filePaths: [`${root  }\\chosen.log`] });
  mocks.saveDialog.mockResolvedValue({ canceled: false, filePath: `${root  }\\saved.txt` });
  mocks.openPath.mockResolvedValue('');
  mocks.getPath.mockReturnValue('C:\\pictures');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  registerAppIpcHandlers();
});
afterEach(() => { vi.restoreAllMocks(); });

describe('app directory search through registered IPC', () => {
  it('skips hidden and excluded directories, filters extensions and handles Buffer names', async () => {
    directories.set(root, [entry('.hidden.txt'), entry('node_modules', true), entry('src', true), entry(Buffer.from('README.TXT')), entry('readme.js'), entry('cache', true)]);
    directories.set(`${root  }\\src`, [entry('readme.txt')]);
    directories.set(`${root  }\\cache`, [entry('readme.txt')]);
    expect(await invoke('app:search-local-files', root, 'readme', { extensions: [' .TXT ', '', 'txt'], excludeDirs: [' cache '], includeDirectories: false })).toEqual([
      { name: 'README.TXT', path: `${root  }\\README.TXT`, isDirectory: false },
      { name: 'readme.txt', path: `${root  }\\src\\readme.txt`, isDirectory: false },
    ]);
    expect(mocks.readdir.mock.calls.map(([path]) => path)).toEqual([root, `${root  }\\src`]);
  });
  it('includes hidden matches when enabled and enforces the depth boundary', async () => {
    directories.set(root, [entry('.secret.txt'), entry('src', true)]);
    directories.set(`${root  }\\src`, [entry('deep', true), entry('note.txt')]);
    directories.set(`${root  }\\src\\deep`, [entry('note.txt')]);
    const result = await invoke('app:search-local-files', root, '.txt', { includeHidden: true, maxDepth: 1 });
    expect(result).toEqual([
      { name: '.secret.txt', path: `${root  }\\.secret.txt`, isDirectory: false },
      { name: 'note.txt', path: `${root  }\\src\\note.txt`, isDirectory: false },
    ]);
    expect(mocks.readdir).not.toHaveBeenCalledWith(`${root  }\\src\\deep`, expect.anything());
  });
  it.each([
    { matchMode: 'startsWith', keyword: 'read', expected: ['read.txt'] },
    { matchMode: 'endsWith', keyword: '.txt', expected: ['read.txt'] },
    { matchMode: 'exact', keyword: 'read.txt', expected: ['read.txt'] },
  ])('applies case-sensitive $matchMode matching', async ({ matchMode, keyword, expected }) => {
    directories.set(root, [entry('read.txt'), entry('READ.TXT'), entry('archive.txt.old')]);
    const result = await invoke('app:search-local-files', root, keyword, { matchMode, caseSensitive: true });
    expect(result).toEqual(expected.map((name) => ({ name, path: `${root  }\\${  name}`, isDirectory: false })));
  });
  it('matches full paths and includes only directories when requested', async () => {
    directories.set(root, [entry('src', true), entry('file.txt')]);
    directories.set(`${root  }\\src`, []);
    expect(await invoke('app:search-local-files', root, 'workspace', { matchScope: 'path', includeFiles: false })).toEqual([{ name: 'src', path: `${root  }\\src`, isDirectory: true }]);
  });
  it('honors a numeric limit, avoids failed directories and returns empty for blank inputs', async () => {
    directories.set(root, [entry('denied', true), entry('match.txt'), entry('match2.txt')]);
    expect(await invoke('app:search-local-files', root, 'match', 1)).toEqual([{ name: 'match.txt', path: `${root  }\\match.txt`, isDirectory: false }]);
    expect(mocks.readdir).toHaveBeenCalledOnce();
    expect(await invoke('app:search-local-files', root, 'absent')).toEqual([]);
    expect(mocks.readdir).toHaveBeenCalledWith(`${root  }\\denied`, { withFileTypes: true });
    mocks.readdir.mockClear();
    expect(await invoke('app:search-local-files', '', 'match')).toEqual([]);
    expect(await invoke('app:search-local-files', root, ' ')).toEqual([]);
    expect(mocks.readdir).not.toHaveBeenCalled();
  });
});

describe('agent local filesystem tools', () => {
  it('copies a nested directory using real recursion with mocked filesystem boundaries', async () => {
    mocks.stat.mockResolvedValue({ isFile: () => false, isDirectory: () => true, size: 0 });
    directories.set(`${root  }\\source`, [entry('a.txt'), entry('nested', true)]);
    directories.set(`${root  }\\source\\nested`, [entry('b.txt')]);
    const response = await tool('file.copy', { source: `${root  }\\source`, destination: `${root  }\\target` });
    expect(response).toMatchObject({ success: true, error: '', result: { source: `${root  }\\source`, destination: `${root  }\\target`, isDirectory: true, copied: true } });
    expect(mocks.copy.mock.calls).toEqual([[`${root  }\\source\\a.txt`, `${root  }\\target\\a.txt`], [`${root  }\\source\\nested\\b.txt`, `${root  }\\target\\nested\\b.txt`]]);
    expect(mocks.mkdir).toHaveBeenCalledWith(`${root  }\\target\\nested`, { recursive: true });
  });
  it('copies one file using argument aliases and propagates a failed copy as a tool response', async () => {
    expect(await tool('file.copy', { path: `${root  }\\a.txt`, newPath: `${root  }\\b.txt` })).toMatchObject({ success: true, result: { isDirectory: false, copied: true } });
    mocks.copy.mockRejectedValue(new Error('copy denied'));
    expect(await tool('file.copy', { source: `${root  }\\a.txt`, destination: `${root  }\\b.txt` })).toMatchObject({ success: false, result: {}, error: 'copy denied' });
  });
  it.each([
    { args: {}, error: '需要 source' },
    { args: { source: `${root  }\\a` }, error: '需要 destination' },
    { args: { source: `${root  }\\a`, destination: 'C:\\outside\\a' }, error: '不在工作区范围内' },
    { args: { source: 'C:\\outside\\a', destination: `${root  }\\a` }, error: '不在工作区范围内' },
  ])('rejects invalid copy boundaries before any filesystem mutation $error', async ({ args, error }) => {
    expect(await tool('file.copy', args)).toMatchObject({ success: false, error: errorContaining(error) });
    expect(mocks.mkdir).not.toHaveBeenCalled();
    expect(mocks.copy).not.toHaveBeenCalled();
  });
  it('requires a workspace and rejects sibling-prefix paths', async () => {
    expect(await tool('file.read', { path: `${root  }\\a` }, [])).toMatchObject({ success: false, error: errorContaining('未配置工作区') });
    expect(await tool('file.read', { path: `${root  }-other\\a` })).toMatchObject({ success: false, error: errorContaining('不在工作区范围内') });
    expect(mocks.read).not.toHaveBeenCalled();
  });
  it('builds a bounded tree and excludes system directories from traversal', async () => {
    directories.set(root, [entry('.git', true), entry('src', true), entry('node_modules', true), entry('final.txt')]);
    directories.set(`${root  }\\src`, [entry('one.txt'), entry('deep', true)]);
    directories.set(`${root  }\\src\\deep`, [entry('two.txt')]);
    expect(await tool('file.tree', { path: root, maxDepth: 2, limit: 4 })).toMatchObject({
      success: true, result: { itemCount: 4, maxDepth: 2, tree: [
        { name: 'src', path: `${root  }\\src`, isDirectory: true, children: [{ name: 'one.txt', path: `${root  }\\src\\one.txt`, isDirectory: false }, { name: 'deep', path: `${root  }\\src\\deep`, isDirectory: true }] },
        { name: 'node_modules', path: `${root  }\\node_modules`, isDirectory: true },
      ] },
    });
    expect(mocks.readdir.mock.calls.map(([path]) => path)).toEqual([root, `${root  }\\src`]);
  });
  it('returns an empty tree for a failed directory and validates the root', async () => {
    expect(await tool('file.tree', { path: root })).toMatchObject({ success: true, result: { itemCount: 0, tree: [] } });
    expect(await tool('file.tree', {})).toMatchObject({ success: false, error: 'file.tree 需要 path' });
  });
  it.each(['file.read', 'file.read.lines'])('guards %s against directories and oversized files', async (name) => {
    mocks.stat.mockResolvedValue({ isFile: () => false, isDirectory: () => true, size: 0 });
    expect(await tool(name, { path: `${root  }\\file` })).toMatchObject({ success: false, error: '目标路径不是文件' });
    mocks.stat.mockResolvedValue({ isFile: () => true, isDirectory: () => false, size: 1024 * 1024 + 1 });
    expect(await tool(name, { path: `${root  }\\file` })).toMatchObject({ success: false, error: errorContaining('文件过大') });
    expect(mocks.read).not.toHaveBeenCalled();
  });
  it('reads numbered lines, clamps the requested window and normalizes invalid numeric inputs', async () => {
    mocks.read.mockResolvedValue('one\r\ntwo\r\nthree');
    expect(await tool('file.read.lines', { path: `${root  }\\a`, startLine: 2, endLine: 3 })).toMatchObject({ success: true, result: { startLine: 2, endLine: 3, totalLines: 3, count: 2, lines: [{ line: 2, text: 'two' }, { line: 3, text: 'three' }] } });
    expect(await tool('file.read.lines', { path: `${root  }\\a`, startLine: Number.NaN, endLine: 9999 })).toMatchObject({ success: true, result: { startLine: 1, endLine: 2000, count: 3 } });
    expect(await tool('file.read', { path: `${root  }\\a` })).toMatchObject({ success: true, result: { content: 'one\r\ntwo\r\nthree', size: 3 } });
  });
  it('writes UTF-8 content and appends converted payloads after creating the parent', async () => {
    expect(await tool('file.write', { path: `${root  }\\a`, content: '你好' })).toMatchObject({ success: true, result: { writtenBytes: 6 } });
    expect(mocks.write).toHaveBeenCalledWith(`${root  }\\a`, '你好', 'utf8');
    expect(await tool('file.append', { path: `${root  }\\a`, content: 123 })).toMatchObject({ success: true, result: { appendedBytes: 3 } });
    expect(mocks.append).toHaveBeenCalledWith(`${root  }\\a`, '123', 'utf8');
    expect(mocks.mkdir).toHaveBeenCalledWith(root, { recursive: true });
  });
});

describe('local commands and window tools at mocked boundaries', () => {
  it.each([
    { name: 'cmd.exec', program: 'cmd.exe', args: ['/d', '/s', '/c', 'echo fixture'] },
    { name: 'cmd.powershell', program: 'powershell.exe', args: ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', 'echo fixture'] },
  ])('routes $name with a clamped timeout and workspace cwd', async ({ name, program, args }) => {
    expect(await tool(name, { command: ' echo fixture ', cwd: root, timeoutMs: 1 })).toMatchObject({ success: true, result: { command: 'echo fixture', cwd: root, stdout: 'output', stderr: 'warning' } });
    expect(mocks.exec).toHaveBeenCalledWith(program, args, { windowsHide: true, cwd: root, timeout: 1000, maxBuffer: 1024 * 1024 }, expect.any(Function));
  });
  it.each(['cmd.exec', 'cmd.powershell'])('handles command errors and invalid arguments for %s', async (name) => {
    expect(await tool(name, {})).toMatchObject({ success: false, error: errorContaining('需要 command') });
    expect(await tool(name, { command: 'echo fixture', cwd: 'C:\\outside' })).toMatchObject({ success: false, error: errorContaining('不在工作区范围内') });
    expect(mocks.exec).not.toHaveBeenCalled();
    mocks.exec.mockImplementation((program, args, options, callback) => { void program; void args; void options; callback(new Error('timeout'), '', ''); });
    expect(await tool(name, { command: 'echo fixture' })).toMatchObject({ success: false, error: 'timeout' });
  });
  it('normalizes non-string command output and caps long timeouts', async () => {
    mocks.exec.mockImplementation((program, args, options, callback) => { void program; void args; void options; callback(null, Buffer.from('out'), null); });
    expect(await tool('cmd.exec', { command: 'fixture', timeoutMs: 999999 })).toMatchObject({ success: true, result: { cwd: '', stdout: '', stderr: '' } });
    expect(mocks.exec.mock.calls[0][2]).toMatchObject({ timeout: 60000, cwd: undefined });
  });
  it('filters window names and titles and normalizes nonnumeric handles', async () => {
    mocks.windows.mockResolvedValue([
      { id: '42', title: 'Editor', processName: 'Code.exe', processPath: 'C:/Code.exe', processId: 4, iconDataUrl: null },
      { id: 'n/a', title: 'Code guide', processName: 'Guide.exe', processPath: null, processId: null, iconDataUrl: null },
      { id: '5', title: 'Other', processName: 'Other.exe', processPath: null, processId: 5, iconDataUrl: null },
    ]);
    expect(await tool('win.list', { filter: ' CODE ' })).toMatchObject({ success: true, result: { count: 2, windows: [
      { pid: 4, name: 'Code.exe', title: 'Editor', handle: 42, path: 'C:/Code.exe' },
      { pid: null, name: 'Guide.exe', title: 'Code guide', handle: 0, path: null },
    ] } });
  });
  it.each([
    { name: 'win.minimize', args: { pid: 4.9 }, flag: 6, action: '最小化' },
    { name: 'win.maximize', args: { name: 'editor' }, flag: 3, action: '最大化' },
    { name: 'win.restore', args: { handle: 42 }, flag: 9, action: '还原' },
  ])('chooses the target and ShowWindow flag for $name', async ({ name, args, flag, action }) => {
    mocks.windows.mockResolvedValue([{ id: '42', title: 'Editor', processName: 'Code.exe', processPath: null, processId: 4, iconDataUrl: null }]);
    expect(await tool(name, args)).toMatchObject({ success: true, result: { action, handle: 42, pid: 4, name: 'Code.exe', title: 'Editor' } });
    expect(mocks.exec.mock.calls[0][0]).toBe('powershell.exe');
    expect(mocks.exec.mock.calls[0][1].at(-1)).toContain(`[IntPtr]42, ${  flag}`);
  });
  it('rejects missing targets, unmatched windows and unusable handles before dispatch', async () => {
    expect(await tool('win.minimize', {})).toMatchObject({ success: false, error: errorContaining('需要 pid、name 或 handle') });
    expect(await tool('win.minimize', { pid: 7 })).toMatchObject({ success: false, error: '未找到匹配的窗口' });
    mocks.windows.mockResolvedValue([{ id: 'n/a', title: 'Editor', processName: 'Code.exe', processPath: null, processId: 4, iconDataUrl: null }]);
    expect(await tool('win.minimize', { name: 'code' })).toMatchObject({ success: false, error: '无法获取窗口句柄' });
    expect(mocks.exec).not.toHaveBeenCalled();
  });
  it('closes the selected process and reports command failures', async () => {
    mocks.windows.mockResolvedValue([{ id: '42', title: 'Editor', processName: 'Code.exe', processPath: null, processId: 4, iconDataUrl: null }]);
    expect(await tool('win.close', { name: 'CODE' })).toMatchObject({ success: true, result: { closed: { pid: 4, name: 'Code.exe', title: 'Editor' } } });
    expect(mocks.exec).toHaveBeenCalledWith('taskkill', ['/PID', '4', '/F'], { windowsHide: true, timeout: 15000 }, expect.any(Function));
    mocks.exec.mockImplementation((program, args, options, callback) => { void program; void args; void options; callback(new Error('denied'), '', ''); });
    expect(await tool('win.close', { pid: 4 })).toMatchObject({ success: false, error: 'denied' });
  });
  it('rejects close without a selection or usable process PID', async () => {
    expect(await tool('win.close', {})).toMatchObject({ success: false, error: 'win.close 需要 pid 或 name' });
    expect(await tool('win.close', { pid: 9 })).toMatchObject({ success: false, error: '未找到匹配的窗口进程' });
    mocks.windows.mockResolvedValue([{ id: '42', title: 'Editor', processName: 'Code.exe', processPath: null, processId: null, iconDataUrl: null }]);
    expect(await tool('win.close', { name: 'code' })).toMatchObject({ success: false, error: '无法获取目标进程 PID' });
    expect(mocks.exec).not.toHaveBeenCalled();
  });
});

describe('file dialog, read, save and hash IPC responses', () => {
  it.each(['app:pick-local-search-directory', 'app:pick-skill-file', 'app:pick-feedback-screenshot-file', 'app:pick-feedback-log-file', 'app:pick-file-for-hash'])('returns selection and handles cancellation, absent windows and dialog failures for %s', async (channel) => {
    expect(await invoke(channel)).toBe(`${root  }\\chosen.log`);
    mocks.openDialog.mockResolvedValue({ canceled: true, filePaths: [] });
    expect(await invoke(channel)).toBeNull();
    mocks.ownerWindow.mockReturnValue(null);
    expect(await invoke(channel)).toBeNull();
    mocks.focusedWindow.mockReturnValue(window);
    mocks.openDialog.mockRejectedValue(new Error('dialog failed'));
    expect(await invoke(channel)).toBeNull();
  });
  it('enforces the feedback log extension and the skill dialog filter', async () => {
    mocks.openDialog.mockResolvedValue({ canceled: false, filePaths: ['C:\\note.txt'] });
    expect(await invoke('app:pick-feedback-log-file')).toBeNull();
    await invoke('app:pick-skill-file');
    expect(mocks.openDialog).toHaveBeenLastCalledWith(window, expect.objectContaining({ filters: [{ name: 'Markdown', extensions: ['md'] }] }));
  });
  it('returns file content, or null for missing and failed reads', async () => {
    expect(await invoke('app:read-text-file', `${root  }\\a`)).toBe('abc');
    expect(mocks.read).toHaveBeenCalledWith(`${root  }\\a`, 'utf-8');
    mocks.exists.mockReturnValue(false);
    expect(await invoke('app:read-text-file', `${root  }\\a`)).toBeNull();
    expect(await invoke('app:read-text-file', '')).toBeNull();
    mocks.exists.mockReturnValue(true);
    mocks.read.mockRejectedValue(new Error('denied'));
    expect(await invoke('app:read-text-file', `${root  }\\a`)).toBeNull();
  });
  it('sanitizes save filters, writes the chosen file and reveals it', async () => {
    expect(await invoke('app:save-text-file', { content: '你好', defaultPath: ' export.md ', filters: [null, 7, {}, { name: ' ', extensions: ['md'] }, { name: ' Markdown ', extensions: ['md', '', 3] }] })).toEqual({ ok: true, canceled: false, filePath: `${root  }\\saved.txt` });
    expect(mocks.saveDialog).toHaveBeenCalledWith(window, { title: '保存文件', defaultPath: 'export.md', filters: [{ name: 'Markdown', extensions: ['md'] }] });
    expect(mocks.write).toHaveBeenCalledWith(`${root  }\\saved.txt`, '你好', 'utf8');
    expect(mocks.reveal).toHaveBeenCalledWith(`${root  }\\saved.txt`);
  });
  it('uses save defaults and returns distinct cancellation and failure responses', async () => {
    expect(await invoke('app:save-text-file', null)).toEqual({ ok: false, canceled: false, filePath: null });
    expect(await invoke('app:save-text-file', {})).toEqual({ ok: true, canceled: false, filePath: `${root  }\\saved.txt` });
    expect(mocks.saveDialog).toHaveBeenCalledWith(window, { title: '保存文件', defaultPath: 'eIsland-export.txt', filters: undefined });
    expect(mocks.write).toHaveBeenCalledWith(`${root  }\\saved.txt`, '', 'utf8');
    mocks.saveDialog.mockResolvedValue({ canceled: true });
    expect(await invoke('app:save-text-file', {})).toEqual({ ok: false, canceled: true, filePath: null });
    mocks.saveDialog.mockResolvedValue({ canceled: false, filePath: `${root  }\\saved.txt` });
    mocks.write.mockRejectedValue(new Error('disk full'));
    expect(await invoke('app:save-text-file', {})).toEqual({ ok: false, canceled: false, filePath: null });
    mocks.ownerWindow.mockReturnValue(null);
    expect(await invoke('app:save-text-file', {})).toEqual({ ok: false, canceled: false, filePath: null });
  });
  it('copies a saved image and guards cancellation, missing files and copy errors', async () => {
    expect(await invoke('app:save-image-as', `${root  }\\image.png`)).toEqual({ ok: true, canceled: false, filePath: `${root  }\\saved.txt` });
    expect(mocks.saveDialog).toHaveBeenCalledWith(window, expect.objectContaining({ defaultPath: 'image.png' }));
    expect(mocks.copy).toHaveBeenCalledWith(`${root  }\\image.png`, `${root  }\\saved.txt`);
    mocks.saveDialog.mockResolvedValue({ canceled: true });
    expect(await invoke('app:save-image-as', `${root  }\\image.png`)).toEqual({ ok: false, canceled: true, filePath: null });
    mocks.exists.mockReturnValue(false);
    expect(await invoke('app:save-image-as', `${root  }\\image.png`)).toEqual({ ok: false, canceled: false, filePath: null });
    expect(await invoke('app:save-image-as', '')).toEqual({ ok: false, canceled: false, filePath: null });
    mocks.exists.mockReturnValue(true);
    mocks.saveDialog.mockResolvedValue({ canceled: false, filePath: `${root  }\\saved.txt` });
    mocks.copy.mockRejectedValue(new Error('denied'));
    expect(await invoke('app:save-image-as', `${root  }\\image.png`)).toEqual({ ok: false, canceled: false, filePath: null });
  });
  it.each([
    { algorithm: 'sha256', hash: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' },
    { algorithm: 'unsupported', hash: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' },
    { algorithm: 'md5', hash: '900150983cd24fb0d6963f7d28e17f72' },
  ])('hashes actual fixture chunks for $algorithm without reading the filesystem', async ({ algorithm, hash }) => {
    expect(await invoke('app:compute-file-hash', `${root  }\\abc.txt`, algorithm)).toEqual({ hash, algorithm: algorithm === 'unsupported' ? 'sha256' : algorithm, fileName: 'abc.txt', fileSize: 3 });
    expect(mocks.stream).toHaveBeenCalledWith(`${root  }\\abc.txt`);
  });
  it('returns null for absent paths, missing files and stat errors before hashing', async () => {
    expect(await invoke('app:compute-file-hash', '', 'sha256')).toBeNull();
    mocks.exists.mockReturnValue(false);
    expect(await invoke('app:compute-file-hash', `${root  }\\a`, 'sha256')).toBeNull();
    mocks.exists.mockReturnValue(true);
    mocks.stat.mockRejectedValue(new Error('missing'));
    expect(await invoke('app:compute-file-hash', `${root  }\\a`, 'sha256')).toBeNull();
    expect(mocks.stream).not.toHaveBeenCalled();
  });
  it('dispatches local window events and respects destroyed windows', () => {
    events.get('window:minimize')?.({ sender: {} });
    events.get('window:close')?.({ sender: {} });
    events.get('window:maximize')?.({ sender: {} });
    expect(window.minimize).toHaveBeenCalledOnce();
    expect(window.close).toHaveBeenCalledOnce();
    expect(window.maximize).toHaveBeenCalledOnce();
    vi.mocked(window.isMaximized).mockReturnValue(true);
    events.get('window:maximize')?.({ sender: {} });
    expect(window.unmaximize).toHaveBeenCalledOnce();
    vi.mocked(window.isDestroyed).mockReturnValue(true);
    ['window:minimize', 'window:close', 'window:maximize'].forEach((channel) => { events.get(channel)?.({ sender: {} }); });
    expect(window.minimize).toHaveBeenCalledOnce();
    expect(window.close).toHaveBeenCalledOnce();
    expect(window.maximize).toHaveBeenCalledOnce();
    expect(window.unmaximize).toHaveBeenCalledOnce();
  });
});

describe('local file mutation and content search branches', () => {
  it('checks existence without failing the tool when stat rejects', async () => {
    mocks.stat.mockRejectedValue(new Error('missing'));
    expect(await tool('file.exists', { path: `${root  }\\absent` })).toMatchObject({ success: true, result: { exists: false, isFile: false, isDirectory: false } });
    mocks.stat.mockResolvedValue({ isFile: () => true, isDirectory: () => false, size: 3 });
    expect(await tool('file.exists', { path: `${root  }\\a` })).toMatchObject({ success: true, result: { exists: true, isFile: true, isDirectory: false } });
  });
  it('lists bounded entries and chooses explicit mkdir recursion', async () => {
    directories.set(root, [entry('dir', true), entry('a.txt')]);
    expect(await tool('file.list', { path: root, limit: 1 })).toMatchObject({ success: true, result: { count: 1, items: [{ name: 'dir', path: `${root  }\\dir`, isDirectory: true }] } });
    expect(await tool('file.mkdir', { path: `${root  }\\dir`, recursive: false })).toMatchObject({ success: true, result: { recursive: false, created: true } });
    expect(mocks.mkdir).toHaveBeenCalledWith(`${root  }\\dir`, { recursive: false });
  });
  it('renames using aliases, creates a parent and deletes through the filesystem boundary', async () => {
    expect(await tool('file.rename', { path: `${root  }\\a`, destination: `${root  }\\dir\\b` })).toMatchObject({ success: true, result: { oldPath: `${root  }\\a`, newPath: `${root  }\\dir\\b`, renamed: true } });
    expect(mocks.mkdir).toHaveBeenCalledWith(`${root  }\\dir`, { recursive: true });
    expect(mocks.rename).toHaveBeenCalledWith(`${root  }\\a`, `${root  }\\dir\\b`);
    expect(await tool('file.delete', { path: `${root  }\\dir` })).toMatchObject({ success: true, result: { deleted: true } });
    expect(mocks.rm).toHaveBeenCalledWith(`${root  }\\dir`, { recursive: true, force: false });
  });
  it.each(['file.list', 'file.exists', 'file.stat', 'file.mkdir', 'file.read', 'file.read.lines', 'file.write', 'file.delete', 'file.append'])('rejects a missing path for %s without touching the filesystem', async (name) => {
    expect(await tool(name, {})).toMatchObject({ success: false, error: errorContaining('需要 path') });
    expect(mocks.stat).not.toHaveBeenCalled();
    expect(mocks.readdir).not.toHaveBeenCalled();
    expect(mocks.mkdir).not.toHaveBeenCalled();
    expect(mocks.rm).not.toHaveBeenCalled();
  });
  it('replaces regex punctuation literally and avoids writes when no matches exist', async () => {
    mocks.read.mockResolvedValue('a.b a.b acb');
    expect(await tool('file.replace', { path: `${root  }\\a`, search: 'a.b', replacement: 'X' })).toMatchObject({ success: true, result: { matchCount: 2, modified: true, replaceAll: true } });
    expect(mocks.write).toHaveBeenCalledWith(`${root  }\\a`, 'X X acb', 'utf8');
    mocks.write.mockClear();
    expect(await tool('file.replace', { path: `${root  }\\a`, search: 'absent', replacement: 'X', replaceAll: false })).toMatchObject({ success: true, result: { matchCount: 0, modified: false } });
    expect(mocks.write).not.toHaveBeenCalled();
    expect(await tool('file.replace', { path: `${root  }\\a`, search: 'a.b', replacement: 'X', replaceAll: false })).toMatchObject({ success: true, result: { matchCount: 1 } });
    expect(mocks.write).toHaveBeenCalledWith(`${root  }\\a`, 'X a.b acb', 'utf8');
  });
  it('grep searches a direct file with fixed-string escaping and a bounded result count', async () => {
    mocks.read.mockResolvedValue('a.b\r\nacb\r\nA.B');
    expect(await tool('file.grep', { path: `${root  }\\a`, pattern: 'a.b', fixedStrings: true, limit: 1 })).toMatchObject({ success: true, result: { count: 1, matches: [{ file: `${root  }\\a`, line: 1, text: 'a.b' }] } });
    expect(await tool('file.grep', { path: `${root  }\\a`, pattern: '[' })).toMatchObject({ success: false, error: errorContaining('pattern 无效') });
    expect(await tool('file.grep', { path: `${root  }\\a` })).toMatchObject({ success: false, error: 'file.grep 需要 pattern' });
  });
  it('grep handles failed reads, oversized direct files and case-sensitive patterns', async () => {
    mocks.stat.mockResolvedValue({ isFile: () => true, isDirectory: () => false, size: 2 * 1024 * 1024 + 1 });
    expect(await tool('file.grep', { path: `${root  }\\a`, pattern: 'find' })).toMatchObject({ success: true, result: { count: 0 } });
    expect(mocks.read).not.toHaveBeenCalled();
    mocks.stat.mockResolvedValue({ isFile: () => true, isDirectory: () => false, size: 3 });
    mocks.read.mockRejectedValue(new Error('denied'));
    expect(await tool('file.grep', { path: `${root  }\\a`, pattern: 'find' })).toMatchObject({ success: true, result: { count: 0 } });
    mocks.read.mockResolvedValue('Find\nfind');
    expect(await tool('file.grep', { path: `${root  }\\a`, pattern: 'find', caseSensitive: true })).toMatchObject({ success: true, result: { matches: [{ file: `${root  }\\a`, line: 2, text: 'find' }], count: 1 } });
  });
  it('grep walks eligible directories and skips denied files and excluded paths', async () => {
    directories.set(root, [entry('.git', true), entry('node_modules', true), entry('src', true), entry('bad.txt'), entry('wrong.js'), entry('README')]);
    directories.set(`${root  }\\src`, [entry(Buffer.from('good.TXT')), entry('deep', true), entry('denied.txt'), entry('large.txt'), entry('unreadable.txt')]);
    mocks.stat.mockImplementation((path) => {
      if (path === root) return Promise.resolve({ isFile: () => false, isDirectory: () => true, size: 0 });
      if (path.endsWith('denied.txt')) return Promise.reject(new Error('denied'));
      return Promise.resolve({ isFile: () => true, isDirectory: () => false, size: path.endsWith('large.txt') ? 3 * 1024 * 1024 : 3 });
    });
    mocks.read.mockImplementation((path) => {
      if (path === `${root  }\\bad.txt` || path === `${root  }\\src\\unreadable.txt`) return Promise.reject(new Error('denied'));
      return Promise.resolve('find\nignored');
    });
    expect(await tool('file.grep', { path: root, pattern: 'find', extensions: ['.txt'], maxDepth: 1 })).toMatchObject({ success: true, result: { count: 1, matches: [{ file: `${root  }\\src\\good.TXT`, line: 1, text: 'find' }] } });
    expect(mocks.readdir.mock.calls.map(([path]) => path)).toEqual([root, `${root  }\\src`]);
    expect(mocks.read).not.toHaveBeenCalledWith(`${root  }\\wrong.js`, 'utf8');
  });
  it('routes the local hash tool through the command boundary and propagates command failure', async () => {
    mocks.exec.mockImplementation((program, args, options, callback) => { void program; void args; void options; callback(null, '  ABC123\n', ''); });
    expect(await tool('file.hash', { path: `${root  }\\o'ne.txt` })).toMatchObject({ success: true, result: { algorithm: 'SHA256', hash: 'ABC123' } });
    expect(mocks.exec.mock.calls[0][1].at(-1)).toContain("o''ne.txt");
    mocks.exec.mockImplementation((program, args, options, callback) => { void program; void args; void options; callback(new Error('hash denied'), '', ''); });
    expect(await tool('file.hash', { path: `${root  }\\a`, algorithm: 'md5' })).toMatchObject({ success: false, error: 'hash denied' });
  });
  it('accepts explicit window handles without metadata and reports ShowWindow command failure', async () => {
    expect(await tool('win.restore', { handle: 42 })).toMatchObject({ success: true, result: { pid: 0, name: '', title: '', handle: 42, action: '还原' } });
    mocks.exec.mockImplementation((program, args, options, callback) => { void program; void args; void options; callback(new Error('window denied'), '', ''); });
    expect(await tool('win.restore', { handle: 42 })).toMatchObject({ success: false, error: 'window denied' });
  });
});

describe('app hash stream and zero-depth regressions', () => {
  it.each([
    { maxDepth: 0, expectedPaths: [`${root  }\\match.txt`], expectedDirectories: [root] },
    { maxDepth: 1, expectedPaths: [`${root  }\\match.txt`, `${root  }\\src\\match.txt`], expectedDirectories: [root, `${root  }\\src`] },
    { maxDepth: undefined, expectedPaths: [`${root  }\\match.txt`, `${root  }\\src\\match.txt`, `${root  }\\src\\deep\\match.txt`], expectedDirectories: [root, `${root  }\\src`, `${root  }\\src\\deep`] },
    { maxDepth: Number.NaN, expectedPaths: [`${root  }\\match.txt`, `${root  }\\src\\match.txt`, `${root  }\\src\\deep\\match.txt`], expectedDirectories: [root, `${root  }\\src`, `${root  }\\src\\deep`] },
  ])('searches exactly the allowed directories for maxDepth=$maxDepth', async ({ maxDepth, expectedPaths, expectedDirectories }) => {
    directories.set(root, [entry('match.txt'), entry('src', true)]);
    directories.set(`${root  }\\src`, [entry('match.txt'), entry('deep', true)]);
    directories.set(`${root  }\\src\\deep`, [entry('match.txt')]);
    expect(await invoke('app:search-local-files', root, 'match', { maxDepth, includeDirectories: false })).toEqual(
      expectedPaths.map((path) => ({ path, name: 'match.txt', isDirectory: false })),
    );
    expect(mocks.readdir.mock.calls.map(([path]) => path)).toEqual(expectedDirectories);
  });
  it('keeps a local file search tool with zero depth inside the selected directory', async () => {
    directories.set(root, [entry('match.txt'), entry('src', true)]);
    directories.set(`${root  }\\src`, [entry('match.txt')]);
    expect(await tool('file.search', { path: root, keyword: 'match', maxDepth: 0 })).toMatchObject({
      success: true,
      result: { count: 1, items: [{ name: 'match.txt', path: `${root  }\\match.txt`, isDirectory: false }] },
    });
    expect(mocks.readdir.mock.calls.map(([path]) => path)).toEqual([root]);
  });
  it.each([false, true])('returns null after a stream failure, partialData=%s', async (partialData) => {
    const error = new Error('fixture stream read failed');
    mocks.stream.mockImplementation(() => {
      const stream = new Readable({ read: () => {} });
      queueMicrotask(() => {
        if (partialData) stream.push(Buffer.from('abc'));
        stream.destroy(error);
      });
      return stream;
    });
    await expect(invoke('app:compute-file-hash', `${root  }\\file.txt`, 'sha256')).resolves.toBeNull();
    expect(console.error).toHaveBeenCalledWith('[App] compute-file-hash error:', error);
  });
});
