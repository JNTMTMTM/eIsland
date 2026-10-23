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
 * @file appHelpers.test.ts
 * @description 纯辅助函数单元测试 (normalizeWebUrl, decodeHtmlText, stripHtmlText,
 *   isTextMatched, parseWorkspaces, isInsideWorkspaces, normalizeLocalPath)
 * @description 通过 executeAgentLocalTool IPC handler 间接测试模块内部的纯函数
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── hoisted mocks ──

const { handleMock, onMock } = vi.hoisted(() => ({
  handleMock: vi.fn(),
  onMock: vi.fn(),
}));

const {
  appQuitMock,
  appRelaunchMock,
  appExitMock,
  appGetPathMock,
} = vi.hoisted(() => ({
  appQuitMock: vi.fn(),
  appRelaunchMock: vi.fn(),
  appExitMock: vi.fn(),
  appGetPathMock: vi.fn(),
}));

const { readdirMock, statMock, readFileMock, writeFileMock, mkdirMock } = vi.hoisted(() => ({
  readdirMock: vi.fn(),
  statMock: vi.fn(),
  readFileMock: vi.fn(),
  writeFileMock: vi.fn(),
  mkdirMock: vi.fn(),
}));

const { execFileMock } = vi.hoisted(() => ({
  execFileMock: vi.fn(),
}));

const { existsSyncMock } = vi.hoisted(() => ({
  existsSyncMock: vi.fn(),
}));

const { resolveMock, dirnameMock, basenameMock } = vi.hoisted(() => ({
  resolveMock: vi.fn((p: string) => p),
  dirnameMock: vi.fn((p: string) => p),
  basenameMock: vi.fn((p: string) => p),
}));

const { registerAgentIpcHandlersMock } = vi.hoisted(() => ({
  registerAgentIpcHandlersMock: vi.fn(),
}));

const { queryOpenWindowsWithIconsMock } = vi.hoisted(() => ({
  queryOpenWindowsWithIconsMock: vi.fn().mockResolvedValue([]),
}));

const { broadcastSettingChangeMock } = vi.hoisted(() => ({
  broadcastSettingChangeMock: vi.fn(),
}));

const { openStandaloneWindowMock, closeStandaloneWindowMock } = vi.hoisted(() => ({
  openStandaloneWindowMock: vi.fn(),
  closeStandaloneWindowMock: vi.fn(),
}));

const { clearLogsCacheFilesMock, ensureLogsDirMock } = vi.hoisted(() => ({
  clearLogsCacheFilesMock: vi.fn().mockReturnValue({ success: true, fileCount: 0, freedBytes: 0 }),
  ensureLogsDirMock: vi.fn().mockReturnValue('C:\\logs'),
}));

const { getSmtcNowPlayingMock } = vi.hoisted(() => ({
  getSmtcNowPlayingMock: vi.fn().mockReturnValue(null),
}));

// ── module mocks ──

vi.mock('electron', () => ({
  ipcMain: { handle: handleMock, on: onMock },
  app: { quit: appQuitMock, relaunch: appRelaunchMock, exit: appExitMock, getPath: appGetPathMock },
  BrowserWindow: Object.assign(
    vi.fn().mockImplementation(() => ({
      isDestroyed: () => false,
      isMaximized: () => false,
      minimize: vi.fn(),
      maximize: vi.fn(),
      unmaximize: vi.fn(),
      close: vi.fn(),
    })),
    {
      fromWebContents: vi.fn().mockReturnValue(null),
      getFocusedWindow: vi.fn().mockReturnValue(null),
    },
  ),
  dialog: { showOpenDialog: vi.fn(), showSaveDialog: vi.fn() },
  shell: {
    openPath: vi.fn(),
    showItemInFolder: vi.fn(),
    openExternal: vi.fn(),
    readShortcutLink: vi.fn(),
    trashItem: vi.fn(),
  },
}));

vi.mock('fs', () => ({ existsSync: existsSyncMock }));

vi.mock('fs/promises', () => ({
  appendFile: vi.fn(),
  copyFile: vi.fn(),
  mkdir: mkdirMock,
  readdir: readdirMock,
  readFile: readFileMock,
  rename: vi.fn(),
  rm: vi.fn(),
  stat: statMock,
  writeFile: writeFileMock,
}));

vi.mock('child_process', () => ({ execFile: execFileMock }));

vi.mock('path', () => ({
  basename: basenameMock,
  dirname: dirnameMock,
  resolve: resolveMock,
}));

vi.mock('../../../log/mainLog', () => ({
  clearLogsCacheFiles: clearLogsCacheFilesMock,
  ensureLogsDir: ensureLogsDirMock,
}));

vi.mock('../../../window/standaloneWindow', () => ({
  openStandaloneWindow: openStandaloneWindowMock,
  closeStandaloneWindow: closeStandaloneWindowMock,
}));

vi.mock('../../agent', () => ({
  registerAgentIpcHandlers: registerAgentIpcHandlersMock,
}));

vi.mock('../../../system/runningProcesses', () => ({
  queryOpenWindowsWithIcons: queryOpenWindowsWithIconsMock,
}));

vi.mock('../../../utils/broadcast', () => ({
  broadcastSettingChange: broadcastSettingChangeMock,
}));

vi.mock('../../../music/smtcAccessor', () => ({
  getSmtcNowPlaying: getSmtcNowPlayingMock,
}));

vi.mock('@eisland/windows-application-icon-helper', () => ({
  getIconByPath: vi.fn().mockResolvedValue(null),
  getIconByShortcutPath: vi.fn().mockResolvedValue(null),
}));

// ── imports under test ──

import { registerAppIpcHandlers } from '../app';

// ── test helpers ──

const MOCK_HOME = 'C:\\Users\\test';

// ── tests ──

describe('app.ts pure helpers (via executeAgentLocalTool)', () => {
  const handleHandlers = new Map<string, (...args: unknown[]) => unknown>();
  const onHandlersMap = new Map<string, (...args: unknown[]) => unknown>();
  let capturedExecuteTool: ((request: unknown) => Promise<unknown>) | null = null;

  beforeEach(() => {
    handleHandlers.clear();
    onHandlersMap.clear();
    handleMock.mockReset();
    onMock.mockReset();
    readdirMock.mockReset();
    statMock.mockReset();
    readFileMock.mockReset();
    writeFileMock.mockReset();
    mkdirMock.mockReset().mockResolvedValue(undefined);
    execFileMock.mockReset();
    existsSyncMock.mockReset();
    appQuitMock.mockReset();
    appRelaunchMock.mockReset();
    appExitMock.mockReset();
    appGetPathMock.mockReset().mockReturnValue(MOCK_HOME);
    resolveMock.mockReset().mockImplementation((p: string) => p);
    dirnameMock.mockReset().mockImplementation((p: string) => p);
    basenameMock.mockReset().mockImplementation((p: string) => p);
    registerAgentIpcHandlersMock.mockReset();
    capturedExecuteTool = null;

    handleMock.mockImplementation((channel: string, handler: (...args: unknown[]) => unknown) => {
      handleHandlers.set(channel, handler);
    });
    onMock.mockImplementation((channel: string, handler: (...args: unknown[]) => unknown) => {
      onHandlersMap.set(channel, handler);
    });

    registerAgentIpcHandlersMock.mockImplementation(
      (opts: { executeAgentLocalTool: (request: unknown) => Promise<unknown> }) => {
        capturedExecuteTool = opts.executeAgentLocalTool;
      },
    );

    registerAppIpcHandlers();
  });

  async function callTool(request: unknown): Promise<unknown> {
    expect(capturedExecuteTool).not.toBeNull();
    return capturedExecuteTool!(request);
  }

  // ──────────────────────────────────────────────
  // registerAppIpcHandlers registration
  // ──────────────────────────────────────────────

  describe('registerAppIpcHandlers', () => {
    it('registers expected IPC channels', () => {
      expect(handleHandlers.has('app:quit')).toBe(false); // uses .on, not .handle
      expect(onHandlersMap.has('app:quit')).toBe(true);
      expect(handleHandlers.has('app:restart')).toBe(true);
      expect(handleHandlers.has('app:search-local-files')).toBe(true);
      expect(handleHandlers.has('app:read-text-file')).toBe(true);
      expect(handleHandlers.has('app:open-logs-folder')).toBe(true);
    });

    it('delegates executeAgentLocalTool to registerAgentIpcHandlers', () => {
      expect(registerAgentIpcHandlersMock).toHaveBeenCalledTimes(1);
      const arg = registerAgentIpcHandlersMock.mock.calls[0][0];
      expect(typeof arg.executeAgentLocalTool).toBe('function');
    });
  });

  // ──────────────────────────────────────────────
  // isTextMatched (via file.search)
  // ──────────────────────────────────────────────

  describe('isTextMatched (via app:search-local-files)', () => {
    // The file.search tool does not expose matchMode, so we test isTextMatched
    // through the app:search-local-files IPC handler which passes options directly.

    it('defaults to contains mode', async () => {
      readdirMock.mockResolvedValue([
        { name: 'readme.md', isDirectory: () => false },
      ]);

      const searchHandler = handleHandlers.get('app:search-local-files');
      const result = await searchHandler!({}, 'C:\\ws', 'read') as Array<{ name: string }>;

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('readme.md');
    });

    it('startsWith mode matches prefix only', async () => {
      readdirMock.mockResolvedValue([
        { name: 'readme.md', isDirectory: () => false },
        { name: 'unread.txt', isDirectory: () => false },
      ]);

      const searchHandler = handleHandlers.get('app:search-local-files');
      const result = await searchHandler!({}, 'C:\\ws', 'read', { matchMode: 'startsWith' }) as Array<{ name: string }>;

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('readme.md');
    });

    it('endsWith mode matches suffix only', async () => {
      readdirMock.mockResolvedValue([
        { name: 'log_output', isDirectory: () => false },
        { name: 'log_input', isDirectory: () => false },
      ]);

      const searchHandler = handleHandlers.get('app:search-local-files');
      const result = await searchHandler!({}, 'C:\\ws', 'output', { matchMode: 'endsWith' }) as Array<{ name: string }>;

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('log_output');
    });

    it('exact mode requires full match', async () => {
      readdirMock.mockResolvedValue([
        { name: 'test', isDirectory: () => false },
        { name: 'testfile', isDirectory: () => false },
      ]);

      const searchHandler = handleHandlers.get('app:search-local-files');
      const result = await searchHandler!({}, 'C:\\ws', 'test', { matchMode: 'exact' }) as Array<{ name: string }>;

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('test');
    });

    it('caseSensitive false is default', async () => {
      readdirMock.mockResolvedValue([
        { name: 'README.MD', isDirectory: () => false },
      ]);

      const searchHandler = handleHandlers.get('app:search-local-files');
      const result = await searchHandler!({}, 'C:\\ws', 'readme') as Array<{ name: string }>;

      expect(result).toHaveLength(1);
    });

    it('caseSensitive true requires matching case', async () => {
      readdirMock.mockResolvedValue([
        { name: 'README.MD', isDirectory: () => false },
      ]);

      const searchHandler = handleHandlers.get('app:search-local-files');
      const result = await searchHandler!({}, 'C:\\ws', 'readme', { caseSensitive: true }) as Array<{ name: string }>;

      expect(result).toHaveLength(0);
    });
  });

  // ──────────────────────────────────────────────
  // parseWorkspaces + isInsideWorkspaces
  // ──────────────────────────────────────────────

  describe('parseWorkspaces + isInsideWorkspaces', () => {
    it('rejects path outside configured workspaces', async () => {
      readdirMock.mockResolvedValue([]);

      const result = (await callTool({
        tool: 'file.list',
        arguments: { path: 'C:\\other' },
        workspaces: ['C:\\workspace'],
      })) as { success: boolean; error: string };

      expect(result.success).toBe(false);
      expect(result.error).toContain('不在工作区范围内');
    });

    it('rejects when workspaces is empty', async () => {
      const result = (await callTool({
        tool: 'file.list',
        arguments: { path: 'C:\\workspace' },
        workspaces: [],
      })) as { success: boolean; error: string };

      expect(result.success).toBe(false);
      expect(result.error).toContain('未配置工作区');
    });

    it('rejects when workspaces is not an array (falsy)', async () => {
      const result = (await callTool({
        tool: 'file.list',
        arguments: { path: 'C:\\workspace' },
      })) as { success: boolean; error: string };

      expect(result.success).toBe(false);
      expect(result.error).toContain('未配置工作区');
    });

    it('allows path matching workspace root', async () => {
      readdirMock.mockResolvedValue([]);

      const result = (await callTool({
        tool: 'file.list',
        arguments: { path: 'C:\\workspace' },
        workspaces: ['C:\\workspace'],
      })) as { success: boolean; result: { path: string; items: unknown[] } };

      expect(result.success).toBe(true);
    });

    it('allows path inside workspace subdirectory', async () => {
      readdirMock.mockResolvedValue([]);

      const result = (await callTool({
        tool: 'file.list',
        arguments: { path: 'C:\\workspace\\src' },
        workspaces: ['C:\\workspace'],
      })) as { success: boolean; result: { path: string } };

      expect(result.success).toBe(true);
    });

    it('filters out non-string entries in workspaces array', async () => {
      readdirMock.mockResolvedValue([]);

      const result = (await callTool({
        tool: 'file.list',
        arguments: { path: 'C:\\workspace' },
        workspaces: ['C:\\workspace', 123 as unknown, null as unknown, ''],
      })) as { success: boolean; result: unknown };

      expect(result.success).toBe(true);
    });

    it('parses multiple workspaces and matches any', async () => {
      readdirMock.mockResolvedValue([]);

      const resultA = (await callTool({
        tool: 'file.list',
        arguments: { path: 'C:\\proj-a' },
        workspaces: ['C:\\proj-a', 'C:\\proj-b'],
      })) as { success: boolean };

      const resultB = (await callTool({
        tool: 'file.list',
        arguments: { path: 'C:\\proj-b\\src' },
        workspaces: ['C:\\proj-a', 'C:\\proj-b'],
      })) as { success: boolean };

      expect(resultA.success).toBe(true);
      expect(resultB.success).toBe(true);
    });
  });

  // ──────────────────────────────────────────────
  // normalizeLocalPath (via file.list, file.read, etc.)
  // ──────────────────────────────────────────────

  describe('normalizeLocalPath (via file tools)', () => {
    it('trims whitespace from path', async () => {
      readdirMock.mockResolvedValue([]);

      const result = (await callTool({
        tool: 'file.list',
        arguments: { path: '  C:\\workspace  ' },
        workspaces: ['C:\\workspace'],
      })) as { success: boolean; result: { path: string } };

      expect(result.success).toBe(true);
    });

    it('rejects empty path', async () => {
      const result = (await callTool({
        tool: 'file.list',
        arguments: { path: '' },
        workspaces: ['C:\\workspace'],
      })) as { success: boolean; error: string };

      expect(result.success).toBe(false);
      expect(result.error).toContain('path');
    });

    it('rejects whitespace-only path', async () => {
      const result = (await callTool({
        tool: 'file.list',
        arguments: { path: '   ' },
        workspaces: ['C:\\workspace'],
      })) as { success: boolean; error: string };

      expect(result.success).toBe(false);
      expect(result.error).toContain('path');
    });
  });

  // ──────────────────────────────────────────────
  // error handling
  // ──────────────────────────────────────────────

  describe('error handling', () => {
    it('returns error when tool is empty string', async () => {
      const result = (await callTool({
        tool: '',
        arguments: {},
      })) as { success: boolean; error: string };

      expect(result.success).toBe(false);
      expect(result.error).toContain('tool 不能为空');
    });

    it('returns error when tool is whitespace only', async () => {
      const result = (await callTool({
        tool: '   ',
        arguments: {},
      })) as { success: boolean; error: string };

      expect(result.success).toBe(false);
      expect(result.error).toContain('tool 不能为空');
    });

    it('returns error when tool is missing', async () => {
      const result = (await callTool({
        arguments: {},
      })) as { success: boolean; error: string };

      expect(result.success).toBe(false);
      expect(result.error).toContain('tool 不能为空');
    });

    it('returns error for unsupported tool', async () => {
      const result = (await callTool({
        tool: 'nonexistent.tool',
        arguments: {},
        workspaces: ['C:\\ws'],
      })) as { success: boolean; error: string };

      expect(result.success).toBe(false);
      expect(result.error).toContain('不支持的工具');
    });
  });

  // ──────────────────────────────────────────────
  // sys.info
  // ──────────────────────────────────────────────

  describe('sys.info', () => {
    it('returns expected system info structure', async () => {
      // os is not mocked at module level; it uses the real os module.
      // We verify the shape and that values are sane.
      const result = (await callTool({
        tool: 'sys.info',
        arguments: {},
      })) as {
        success: boolean;
        result: {
          platform: string;
          arch: string;
          release: string;
          hostname: string;
          homedir: string;
          tmpdir: string;
          cpuModel: string;
          cpuCores: number;
          totalMemoryMB: number;
          freeMemoryMB: number;
          uptime: number;
          userInfo: { username: string; uid: number; gid: number } | null;
        };
        error: string;
        durationMs: number;
      };

      expect(result.success).toBe(true);
      expect(result.error).toBe('');
      expect(typeof result.durationMs).toBe('number');

      const r = result.result;
      expect(typeof r.platform).toBe('string');
      expect(typeof r.arch).toBe('string');
      expect(typeof r.release).toBe('string');
      expect(typeof r.hostname).toBe('string');
      expect(typeof r.homedir).toBe('string');
      expect(typeof r.tmpdir).toBe('string');
      expect(typeof r.cpuModel).toBe('string');
      expect(r.cpuCores).toBeGreaterThanOrEqual(1);
      expect(r.totalMemoryMB).toBeGreaterThan(0);
      expect(r.freeMemoryMB).toBeGreaterThanOrEqual(0);
      expect(r.uptime).toBeGreaterThanOrEqual(0);
    });
  });
});
