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
 * @file appHarness.ts
 * @description 应用IPC测试私有依赖边界，真实注册模块与虚构文件系统、命令和窗口交互。
 * @author 鸡哥
 */

import { Readable } from 'node:stream';
import { createRequire } from 'node:module';
import { expect, vi } from 'vitest';
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

  quit: vi.fn<() => void>(),
  relaunch: vi.fn<() => void>(),
  exit: vi.fn<(code: number) => void>(),
  logs: vi.fn<() => string>(),
  clearLogs: vi.fn<() => { success: boolean; fileCount: number; freedBytes: number }>(),
  icon: vi.fn<(file: string) => { data: Buffer } | null>(),
  shortcutIcon: vi.fn<(file: string) => { data: Buffer } | null>(),
  shortcut: vi.fn<(file: string) => { target: string }>(),
  standaloneOpen: vi.fn<() => void>(),
  standaloneClose: vi.fn<() => void>(),
  external: vi.fn<(url: string) => Promise<void>>(),
  trash: vi.fn<(file: string) => Promise<void>>(),
  broadcast: vi.fn<(sender: number, channel: string, value: unknown) => void>(),
  nowPlaying: vi.fn<() => unknown>(),
  text: vi.fn<() => string>(),
  image: vi.fn<() => { isEmpty: () => boolean; toPNG: () => Buffer; getSize: () => { width: number; height: number } }>(),
  clipboardWrite: vi.fn<(text: string) => void>(),
  capture: vi.fn<(options: unknown) => Promise<Array<{ thumbnail: { toPNG: () => Buffer } }>>>(),
  notification: vi.fn<(options: { title: string; body: string }) => { show: () => void }>(),
  showNotification: vi.fn<() => void>(),
  software: vi.fn<() => Promise<Array<Record<string, string>>>>(),
  openDefault: vi.fn<(target: string) => Promise<void>>(),
  openApp: vi.fn<(application: string, options?: { arguments: string[] }) => Promise<void>>(),
  platform: vi.fn<() => string>(),
  arch: vi.fn<() => string>(),
  release: vi.fn<() => string>(),
  hostname: vi.fn<() => string>(),
  homedir: vi.fn<() => string>(),
  tmpdir: vi.fn<() => string>(),
  cpus: vi.fn<() => Array<{ model: string }>>(),
  totalmem: vi.fn<() => number>(),
  freemem: vi.fn<() => number>(),
  uptime: vi.fn<() => number>(),
  userInfo: vi.fn<() => { username: string; uid: number; gid: number }>(),

}));
export { mocks };

vi.mock('electron', () => ({
  ipcMain: { handle: mocks.handle, on: mocks.on },
  app: { quit: mocks.quit, relaunch: mocks.relaunch, exit: mocks.exit, getPath: mocks.getPath },
  BrowserWindow: { fromWebContents: mocks.ownerWindow, getFocusedWindow: mocks.focusedWindow },
  dialog: { showOpenDialog: mocks.openDialog, showSaveDialog: mocks.saveDialog },
  clipboard: { readText: mocks.text, readImage: mocks.image, writeText: mocks.clipboardWrite },
  desktopCapturer: { getSources: mocks.capture },
  Notification: mocks.notification,
  shell: { showItemInFolder: mocks.reveal, openPath: mocks.openPath, readShortcutLink: mocks.shortcut, openExternal: mocks.external, trashItem: mocks.trash },
}));
vi.mock('fs', () => ({ existsSync: mocks.exists, createReadStream: mocks.stream }));
vi.mock('fs/promises', () => ({
  readdir: mocks.readdir, stat: mocks.stat, readFile: mocks.read, writeFile: mocks.write,
  mkdir: mocks.mkdir, copyFile: mocks.copy, appendFile: mocks.append, rename: mocks.rename, rm: mocks.rm,
}));
vi.mock('child_process', () => ({ execFile: mocks.exec }));
vi.mock('../../../log/mainLog', () => ({
  clearLogsCacheFiles: mocks.clearLogs, ensureLogsDir: mocks.logs,
}));
vi.mock('../../../window/standaloneWindow', () => ({
  openStandaloneWindow: mocks.standaloneOpen, closeStandaloneWindow: mocks.standaloneClose,
}));
vi.mock('../../agent', () => ({ registerAgentIpcHandlers: mocks.registerAgent }));
vi.mock('../../../system/runningProcesses', () => ({ queryOpenWindowsWithIcons: mocks.windows }));
vi.mock('../../../utils/broadcast', () => ({ broadcastSettingChange: mocks.broadcast }));
vi.mock('../../../music/smtcAccessor', () => ({ getSmtcNowPlaying: mocks.nowPlaying }));
vi.mock('@eisland/windows-application-icon-helper', () => ({ getIconByPath: mocks.icon, getIconByShortcutPath: mocks.shortcutIcon }));

vi.mock('os', () => ({ default: { platform: mocks.platform, arch: mocks.arch, release: mocks.release, hostname: mocks.hostname, homedir: mocks.homedir, tmpdir: mocks.tmpdir, cpus: mocks.cpus, totalmem: mocks.totalmem, freemem: mocks.freemem, uptime: mocks.uptime, userInfo: mocks.userInfo } }));

export const root = 'C:\\workspace';
export const handles = new Map<string, IpcHandler>();
export const events = new Map<string, IpcHandler>();
export const directories = new Map<string, DirectoryEntry[]>();
let executeTool: ExecuteTool;
export let window: WindowFixture;

/**
 * 生成具有明确文件类型的目录项边界。
 * @param name - 操作系统返回的名称。
 * @param directory - 是否是目录。
 * @returns 最小目录项。
 */
export function entry(name: string | Buffer, directory = false): DirectoryEntry {
  return { name, isDirectory: () => directory };
}
/**
 * 调用真实注册的应用 IPC，避免通过不存在的处理器得到空断言。
 * @param channel - 已注册频道。
 * @param args - 业务参数。
 * @returns 真实处理器结果。
 */
export function invoke(channel: string, ...args: unknown[]): unknown {
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
export function tool(tool: string, args: unknown, workspaces: unknown = [root]): Promise<AgentLocalToolResult> {
  return executeTool({ tool, workspaces, arguments: args });
}

/**
 * 包装消息匹配器，避免 Vitest 的 any 返回值进入业务形状断言。
 * @param message - 错误中的稳定片段。
 * @returns 非对称匹配器。
 */
export function errorContaining(message: string): unknown {
  return expect.stringContaining(message);
}

/** 重置所有叶依赖与模拟目录，注册真实应用IPC。 */
export function resetHarness(): void {
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

  mocks.logs.mockReturnValue('C:\\logs');
  mocks.clearLogs.mockReturnValue({ success: true, fileCount: 2, freedBytes: 2048 });
  mocks.icon.mockReturnValue({ data: Buffer.from('icon') });
  mocks.shortcutIcon.mockReturnValue({ data: Buffer.from('shortcut') });
  mocks.shortcut.mockReturnValue({ target: 'C:\\fixture.exe' });
  mocks.external.mockResolvedValue(undefined);
  mocks.trash.mockResolvedValue(undefined);
  mocks.nowPlaying.mockReturnValue(null);
  mocks.text.mockReturnValue('fixture');
  mocks.image.mockReturnValue({ isEmpty: () => true, toPNG: () => Buffer.from('png'), getSize: () => ({ width: 10, height: 20 }) });
  mocks.capture.mockResolvedValue([{ thumbnail: { toPNG: () => Buffer.from('png') } }]);
  // Electron Notification 由 new 调用，边界必须提供可构造函数。
  // eslint-disable-next-line prefer-arrow-callback -- Notification 依赖 new 所需的普通函数构造语义
  mocks.notification.mockImplementation(function notificationFixture() { return { show: mocks.showNotification }; });
  mocks.software.mockResolvedValue([]);
  mocks.openDefault.mockResolvedValue(undefined);
  mocks.openApp.mockResolvedValue(undefined);
  mocks.platform.mockReturnValue('win32');
  mocks.arch.mockReturnValue('x64');
  mocks.release.mockReturnValue('fixture-os');
  mocks.hostname.mockReturnValue('fixture-host');
  mocks.homedir.mockReturnValue('C:\\fixture-user');
  mocks.tmpdir.mockReturnValue('C:\\fixture-temp');
  mocks.cpus.mockReturnValue([{ model: 'fixture-cpu' }, { model: 'fixture-cpu' }]);
  mocks.totalmem.mockReturnValue(8 * 1024 * 1024);
  mocks.freemem.mockReturnValue(3 * 1024 * 1024);
  mocks.uptime.mockReturnValue(1.8);
  mocks.userInfo.mockReturnValue({ username: 'fixture', uid: 1, gid: 2 });
  vi.spyOn(console, 'log').mockImplementation(() => {});
  const softwareBoundary = createRequire(import.meta.url)('fetch-installed-software') as { getAllInstalledSoftware: () => Promise<Array<Record<string, string>>> };
  vi.spyOn(softwareBoundary, 'getAllInstalledSoftware').mockImplementation(mocks.software);
  vi.stubGlobal('Function', new Proxy(Function, {
    apply(original: FunctionConstructor, thisArg: unknown, argumentsList: unknown[]): unknown {
      if (argumentsList.length === 1 && argumentsList[0] === 'return import("open")') {
        return () => Promise.resolve({ default: mocks.openDefault, openApp: mocks.openApp });
      }
      return Reflect.apply(original, thisArg, argumentsList) as unknown;
    },
  }));

  registerAppIpcHandlers();
}
/** 恢复测试创建的全局与观察器，避免影响其他用例。 */
export function cleanupHarness(): void { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); }
