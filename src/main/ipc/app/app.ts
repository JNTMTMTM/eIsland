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
 * @file app.ts
 * @description 应用相关 IPC 处理模块
 * @description 处理应用退出、重启、日志管理和文件操作等 IPC 请求
 * @author 鸡哥
 */

import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { existsSync } from 'fs';
import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from 'fs/promises';
import { execFile } from 'child_process';
import { basename, dirname, resolve } from 'path';
import { clearLogsCacheFiles, ensureLogsDir } from '../../log/mainLog';
import { openStandaloneWindow, closeStandaloneWindow } from '../../window/standaloneWindow';

interface LocalFileSearchItem {
  name: string;
  path: string;
  isDirectory: boolean;
}

interface LocalFileSearchOptions {
  limit?: number;
  maxDepth?: number;
  includeDirectories?: boolean;
  includeFiles?: boolean;
  includeHidden?: boolean;
  caseSensitive?: boolean;
  matchMode?: 'contains' | 'startsWith' | 'endsWith' | 'exact';
  matchScope?: 'name' | 'path';
  extensions?: string[];
  excludeDirs?: string[];
}

interface AgentLocalToolRequest {
  tool?: unknown;
  arguments?: unknown;
}

const MAX_LOCAL_FILE_READ_BYTES = 1024 * 1024;
const MAX_LOCAL_CMD_OUTPUT_BYTES = 1024 * 1024;
const BING_SEARCH_URL_TEMPLATE = 'https://www.bing.com/search?q=%s&form=QBLH&setmkt=zh-CN';
const BING_SEARCH_FALLBACK_URL_TEMPLATE = 'https://cn.bing.com/search?q=%s&form=QBLH';
const BING_RESULT_BLOCK_PATTERN = /<li[^>]*class="[^"]*b_algo[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
const BING_TITLE_LINK_PATTERN = /<h2[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i;
const BING_SNIPPET_PATTERN = /<(?:p|div)[^>]*class="[^"]*(?:b_lineclamp\d|b_paractl|b_algoSlug|b_caption)[^"]*"[^>]*>([\s\S]*?)<\/(?:p|div)>/i;
const BING_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function isTextMatched(target: string, keyword: string, mode: 'contains' | 'startsWith' | 'endsWith' | 'exact'): boolean {
  if (mode === 'startsWith') return target.startsWith(keyword);
  if (mode === 'endsWith') return target.endsWith(keyword);
  if (mode === 'exact') return target === keyword;
  return target.includes(keyword);
}

async function searchLocalFiles(rootDir: string, keyword: string, options?: LocalFileSearchOptions): Promise<LocalFileSearchItem[]> {
  const trimmedKeyword = keyword.trim();
  if (!trimmedKeyword || !rootDir.trim()) return [];

  const limit = typeof options?.limit === 'number' ? options.limit : 120;
  const maxDepthOption = typeof options?.maxDepth === 'number' ? options.maxDepth : 8;
  const maxCount = Math.max(1, Math.min(500, Math.floor(limit || 120)));
  const maxDepth = Math.max(0, Math.min(12, Math.floor(maxDepthOption || 8)));
  const includeDirectories = options?.includeDirectories !== false;
  const includeFiles = options?.includeFiles !== false;
  const includeHidden = options?.includeHidden === true;
  const caseSensitive = options?.caseSensitive === true;
  const matchMode = options?.matchMode ?? 'contains';
  const matchScope = options?.matchScope ?? 'name';
  const keywordForMatch = caseSensitive ? trimmedKeyword : trimmedKeyword.toLowerCase();
  const extensionSet = new Set(
    (Array.isArray(options?.extensions) ? options?.extensions : [])
      .map((ext) => String(ext || '').trim().replace(/^\./, '').toLowerCase())
      .filter(Boolean),
  );
  const excludedDirSet = new Set([
    '.git',
    'node_modules',
    '.idea',
    '.vscode',
    ...(Array.isArray(options?.excludeDirs) ? options.excludeDirs : []).map((name) => String(name || '').trim().toLowerCase()).filter(Boolean),
  ]);

  const queue: Array<{ dir: string; depth: number }> = [{ dir: rootDir, depth: 0 }];
  const results: LocalFileSearchItem[] = [];

  while (queue.length > 0 && results.length < maxCount) {
    const current = queue.shift();
    if (!current) break;
    let entries: Array<{ name: string | Buffer; isDirectory: () => boolean }>;
    try {
      entries = await readdir(current.dir, { withFileTypes: true });
    } catch {
      continue;
    }

    entries.some((entry) => {
      if (results.length >= maxCount) {
        return true;
      }
      const entryName = typeof entry.name === 'string' ? entry.name : entry.name.toString('utf8');
      if (!includeHidden && entryName.startsWith('.')) {
        return false;
      }
      const entryPath = `${current.dir}${current.dir.endsWith('\\') ? '' : '\\'}${entryName}`;
      const isDirectory = entry.isDirectory();
      const matchTargetRaw = matchScope === 'path' ? entryPath : entryName;
      const matchTarget = caseSensitive ? matchTargetRaw : matchTargetRaw.toLowerCase();
      let extensionMatched = true;
      if (!isDirectory && extensionSet.size > 0) {
        const dotIndex = entryName.lastIndexOf('.');
        const ext = dotIndex >= 0 ? entryName.slice(dotIndex + 1).toLowerCase() : '';
        extensionMatched = extensionSet.has(ext);
      }
      const typeMatched = (isDirectory && includeDirectories) || (!isDirectory && includeFiles);

      if (isTextMatched(matchTarget, keywordForMatch, matchMode) && extensionMatched && typeMatched) {
        results.push({
          name: entryName,
          path: entryPath,
          isDirectory,
        });
      }
      if (isDirectory && current.depth < maxDepth && !excludedDirSet.has(entryName.toLowerCase())) {
        queue.push({ dir: entryPath, depth: current.depth + 1 });
      }
      return false;
    });
  }

  return results;
}

function toArgumentsRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function getStringArg(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  return typeof value === 'string' ? value.trim() : '';
}

function getNumberArg(args: Record<string, unknown>, key: string): number | null {
  const value = args[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

function normalizeLocalPath(input: string): string {
  const safe = input.trim();
  if (!safe) {
    return '';
  }
  return resolve(safe);
}

function normalizeWebUrl(input: string): string {
  const safe = input.trim();
  if (!safe) {
    return '';
  }
  const normalized = safe.startsWith('http://') || safe.startsWith('https://')
    ? safe
    : `https://${safe}`;
  try {
    const url = new URL(normalized);
    const protocol = url.protocol.toLowerCase();
    if (protocol !== 'http:' && protocol !== 'https:') {
      return '';
    }
    if (!url.hostname.trim()) {
      return '';
    }
    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
}

function decodeHtmlText(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripHtmlText(input: string): string {
  if (!input.trim()) {
    return '';
  }
  const noTag = input.replace(/<[^>]+>/g, ' ');
  return decodeHtmlText(noTag);
}

function normalizeBingResultUrl(rawHref: string): string {
  const href = rawHref.trim();
  if (!href) {
    return '';
  }
  try {
    const url = new URL(href, 'https://www.bing.com');
    if (url.hostname.endsWith('bing.com') && url.pathname.startsWith('/ck/a')) {
      const encoded = url.searchParams.get('u');
      if (encoded) {
        const candidate = encoded.startsWith('a1') ? encoded.slice(2) : encoded;
        try {
          const decoded = Buffer.from(candidate, 'base64').toString('utf8');
          const normalized = normalizeWebUrl(decoded);
          if (normalized) {
            return normalized;
          }
        } catch {
          // ignore decode failure
        }
      }
    }
    return normalizeWebUrl(url.toString());
  } catch {
    return normalizeWebUrl(href);
  }
}

function parseBingResultBlock(block: string): { title: string; url: string; snippet: string } | null {
  const titleMatch = BING_TITLE_LINK_PATTERN.exec(block);
  if (!titleMatch) {
    return null;
  }
  const rawHref = String(titleMatch[1] ?? '').trim();
  const titleHtml = String(titleMatch[2] ?? '').trim();
  const resolvedUrl = normalizeBingResultUrl(rawHref);
  if (!resolvedUrl) {
    return null;
  }
  const title = stripHtmlText(titleHtml);
  const snippetMatch = BING_SNIPPET_PATTERN.exec(block);
  const snippet = snippetMatch ? stripHtmlText(String(snippetMatch[1] ?? '')) : '';
  return {
    title: title || resolvedUrl,
    url: resolvedUrl,
    snippet,
  };
}

async function fetchBingSearchHtml(query: string, urlTemplate: string): Promise<string> {
  const encodedQuery = encodeURIComponent(query.trim());
  const url = urlTemplate.replace('%s', encodedQuery);
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'User-Agent': BING_USER_AGENT,
    },
  });
  if (!response.ok) {
    throw new Error(`Bing search failed: HTTP ${response.status}`);
  }
  const html = await response.text();
  return html ?? '';
}

async function collectBingHtmlResults(query: string, collector: Array<{ title: string; url: string; snippet: string }>, limit: number, urlTemplate: string): Promise<void> {
  if (collector.length >= limit) {
    return;
  }
  let html = '';
  try {
    html = await fetchBingSearchHtml(query, urlTemplate);
  } catch {
    return;
  }
  if (!html.trim()) {
    return;
  }
  BING_RESULT_BLOCK_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null = BING_RESULT_BLOCK_PATTERN.exec(html);
  while (match && collector.length < limit) {
    const block = String(match[1] ?? '');
    if (block.trim()) {
      const item = parseBingResultBlock(block);
      if (item && !collector.some((existing) => existing.url === item.url)) {
        collector.push(item);
      }
    }
    match = BING_RESULT_BLOCK_PATTERN.exec(html);
  }
}

async function executeLocalWebSearch(args: Record<string, unknown>): Promise<{
  query: string;
  provider: string;
  count: number;
  results: Array<{ title: string; url: string; snippet: string }>;
}> {
  const query = getStringArg(args, 'query') || getStringArg(args, 'q');
  if (!query) {
    throw new Error('web.search 需要 query');
  }
  const limitRaw = getNumberArg(args, 'limit');
  const limit = Math.max(1, Math.min(10, Math.floor(limitRaw == null ? 5 : limitRaw)));
  const results: Array<{ title: string; url: string; snippet: string }> = [];
  let lastError = '';
  for (const template of [BING_SEARCH_URL_TEMPLATE, BING_SEARCH_FALLBACK_URL_TEMPLATE]) {
    if (results.length >= limit) {
      break;
    }
    try {
      await collectBingHtmlResults(query, results, limit, template);
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  if (results.length === 0) {
    const suffix = lastError ? ` (${lastError})` : '';
    throw new Error(`web.search 无结果: ${query}${suffix}`);
  }
  return {
    query,
    provider: 'bing-local',
    count: results.length,
    results,
  };
}

async function executeAgentLocalTool(request: AgentLocalToolRequest): Promise<{
  success: boolean;
  result: unknown;
  error: string;
  durationMs: number;
}> {
  const startedAt = Date.now();
  try {
    const tool = typeof request?.tool === 'string' ? request.tool.trim().toLowerCase() : '';
    const args = toArgumentsRecord(request?.arguments);
    if (!tool) {
      throw new Error('tool 不能为空');
    }

    if (tool === 'file.list') {
      const pathArg = normalizeLocalPath(getStringArg(args, 'path'));
      const limitRaw = getNumberArg(args, 'limit');
      const limit = Math.max(1, Math.min(500, Math.floor(limitRaw == null ? 200 : limitRaw)));
      if (!pathArg) {
        throw new Error('file.list 需要 path');
      }
      const entries = await readdir(pathArg, { withFileTypes: true });
      const items = entries.slice(0, limit).map((entry) => ({
        name: entry.name,
        path: resolve(pathArg, entry.name),
        isDirectory: entry.isDirectory(),
      }));
      return {
        success: true,
        result: {
          path: pathArg,
          items,
          count: items.length,
        },
        error: '',
        durationMs: Date.now() - startedAt,
      };
    }

    if (tool === 'file.read') {
      const pathArg = normalizeLocalPath(getStringArg(args, 'path'));
      if (!pathArg) {
        throw new Error('file.read 需要 path');
      }
      const fileInfo = await stat(pathArg);
      if (!fileInfo.isFile()) {
        throw new Error('目标路径不是文件');
      }
      if (fileInfo.size > MAX_LOCAL_FILE_READ_BYTES) {
        throw new Error(`文件过大，最大支持 ${MAX_LOCAL_FILE_READ_BYTES} bytes`);
      }
      const content = await readFile(pathArg, 'utf8');
      return {
        success: true,
        result: {
          path: pathArg,
          content,
          size: fileInfo.size,
        },
        error: '',
        durationMs: Date.now() - startedAt,
      };
    }

    if (tool === 'file.write') {
      const pathArg = normalizeLocalPath(getStringArg(args, 'path'));
      const content = typeof args.content === 'string' ? args.content : String(args.content ?? '');
      if (!pathArg) {
        throw new Error('file.write 需要 path');
      }
      await mkdir(dirname(pathArg), { recursive: true });
      await writeFile(pathArg, content, 'utf8');
      return {
        success: true,
        result: {
          path: pathArg,
          writtenBytes: Buffer.byteLength(content, 'utf8'),
        },
        error: '',
        durationMs: Date.now() - startedAt,
      };
    }

    if (tool === 'file.delete') {
      const pathArg = normalizeLocalPath(getStringArg(args, 'path'));
      if (!pathArg) {
        throw new Error('file.delete 需要 path');
      }
      await rm(pathArg, { recursive: true, force: false });
      return {
        success: true,
        result: {
          path: pathArg,
          deleted: true,
        },
        error: '',
        durationMs: Date.now() - startedAt,
      };
    }

    if (tool === 'cmd.exec') {
      const command = getStringArg(args, 'command');
      const cwd = normalizeLocalPath(getStringArg(args, 'cwd'));
      const timeoutRaw = getNumberArg(args, 'timeoutMs');
      const timeoutMs = Math.max(1000, Math.min(60000, Math.floor(timeoutRaw == null ? 20000 : timeoutRaw)));
      if (!command) {
        throw new Error('cmd.exec 需要 command');
      }
      const output = await new Promise<{ stdout: string; stderr: string }>((resolvePromise, rejectPromise) => {
        execFile(
          'cmd.exe',
          ['/d', '/s', '/c', command],
          {
            windowsHide: true,
            cwd: cwd || undefined,
            timeout: timeoutMs,
            maxBuffer: MAX_LOCAL_CMD_OUTPUT_BYTES,
          },
          (error, stdout, stderr) => {
            if (error) {
              rejectPromise(error);
              return;
            }
            resolvePromise({
              stdout: typeof stdout === 'string' ? stdout : '',
              stderr: typeof stderr === 'string' ? stderr : '',
            });
          },
        );
      });
      return {
        success: true,
        result: {
          command,
          cwd,
          stdout: output.stdout,
          stderr: output.stderr,
        },
        error: '',
        durationMs: Date.now() - startedAt,
      };
    }

    if (tool === 'web.search') {
      const result = await executeLocalWebSearch(args);
      return {
        success: true,
        result,
        error: '',
        durationMs: Date.now() - startedAt,
      };
    }

    throw new Error(`不支持的工具: ${tool}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? 'local tool failed');
    return {
      success: false,
      result: {},
      error: message,
      durationMs: Date.now() - startedAt,
    };
  }
}

/**
 * 注册应用相关 IPC 处理器
 * @description 注册应用级别的 IPC 事件处理器，包括退出、重启、日志管理等
 */
export function registerAppIpcHandlers(): void {
  ipcMain.on('app:quit', () => {
    app.quit();
  });

  ipcMain.handle('app:pick-local-search-directory', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender) ?? BrowserWindow.getFocusedWindow();
      if (!win) return null;
      const result = await dialog.showOpenDialog(win, {
        title: '选择搜索目录',
        properties: ['openDirectory'],
      });
      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }
      return result.filePaths[0] || null;
    } catch (err) {
      console.error('[App] pick local search directory error:', err);
      return null;
    }
  });

  ipcMain.handle('app:search-local-files', async (
    _event,
    rootDir: string,
    keyword: string,
    options?: number | LocalFileSearchOptions,
  ) => {
    try {
      const searchOptions = typeof options === 'number' ? { limit: options } : options;
      return await searchLocalFiles(rootDir, keyword, searchOptions);
    } catch (err) {
      console.error('[App] search local files error:', err);
      return [];
    }
  });

  ipcMain.handle('agent:local-tool:execute', async (_event, request: AgentLocalToolRequest) => {
    try {
      return await executeAgentLocalTool(request);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err ?? 'local tool execute failed');
      return {
        success: false,
        result: {},
        error: message,
        durationMs: 0,
      };
    }
  });

  ipcMain.handle('app:pick-feedback-screenshot-file', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender) ?? BrowserWindow.getFocusedWindow();
      if (!win) return null;
      const result = await dialog.showOpenDialog(win, {
        title: '选择截图文件',
        defaultPath: app.getPath('pictures'),
        filters: [{ name: '图片文件', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'] }],
        properties: ['openFile'],
      });
      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }
      return result.filePaths[0] || null;
    } catch (err) {
      console.error('[App] pick feedback screenshot file error:', err);
      return null;
    }
  });

  ipcMain.handle('app:pick-feedback-log-file', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender) ?? BrowserWindow.getFocusedWindow();
      if (!win) return null;
      const logDir = ensureLogsDir();
      const result = await dialog.showOpenDialog(win, {
        title: '选择日志文件',
        defaultPath: logDir,
        filters: [{ name: '日志文件', extensions: ['log'] }],
        properties: ['openFile'],
      });
      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }
      const selectedPath = result.filePaths[0] || '';
      if (!selectedPath.toLowerCase().endsWith('.log')) {
        return null;
      }
      return selectedPath;
    } catch (err) {
      console.error('[App] pick feedback log file error:', err);
      return null;
    }
  });

  ipcMain.handle('app:restart', () => {
    try {
      app.relaunch();
      app.exit(0);
      return true;
    } catch (err) {
      console.error('[App] restart error:', err);
      return false;
    }
  });

  ipcMain.handle('app:open-logs-folder', async () => {
    try {
      const logDir = ensureLogsDir();
      const result = await shell.openPath(logDir);
      return result === '';
    } catch (err) {
      console.error('[App] open logs folder error:', err);
      return false;
    }
  });

  ipcMain.handle('app:clear-logs-cache', async () => {
    try {
      const result = clearLogsCacheFiles();
      if (!result.success) {
        return { success: false, freedBytes: 0 };
      }
      console.log(`[App] cleared logs cache: ${result.fileCount} files, ${(result.freedBytes / 1024).toFixed(1)} KB freed`);
      return { success: true, freedBytes: result.freedBytes };
    } catch (err) {
      console.error('[App] clear logs cache error:', err);
      return { success: false, freedBytes: 0 };
    }
  });

  ipcMain.handle('app:get-file-icon', async (_event, filePath: string) => {
    try {
      let iconPath = filePath;
      if (process.platform === 'win32' && filePath.toLowerCase().endsWith('.lnk')) {
        try {
          const result = shell.readShortcutLink(filePath);
          if (result.target) iconPath = result.target;
        } catch {
          // ignore
        }
      }
      const icon = await app.getFileIcon(iconPath, { size: 'large' });
      return icon.toPNG().toString('base64');
    } catch (err) {
      console.error('[App] get-file-icon error:', err);
      return null;
    }
  });

  ipcMain.handle('app:open-file', async (_event, filePath: string) => {
    try {
      await shell.openPath(filePath);
      return true;
    } catch (err) {
      console.error('[App] open-file error:', err);
      return false;
    }
  });

  ipcMain.handle('app:open-in-explorer', (_event, filePath: string) => {
    try {
      if (!filePath || typeof filePath !== 'string') return false;
      if (!existsSync(filePath)) return false;
      shell.showItemInFolder(filePath);
      return true;
    } catch (err) {
      console.error('[App] open-in-explorer error:', err);
      return false;
    }
  });

  ipcMain.handle('app:save-image-as', async (event, sourcePath: string) => {
    try {
      if (!sourcePath || typeof sourcePath !== 'string') {
        return { ok: false, canceled: false, filePath: null as string | null };
      }
      if (!existsSync(sourcePath)) {
        return { ok: false, canceled: false, filePath: null as string | null };
      }

      const win = BrowserWindow.fromWebContents(event.sender) ?? BrowserWindow.getFocusedWindow();
      if (!win) {
        return { ok: false, canceled: false, filePath: null as string | null };
      }

      const defaultName = basename(sourcePath);
      const saveDialogResult = await dialog.showSaveDialog(win, {
        title: '保存图片',
        defaultPath: defaultName,
        filters: [{ name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'] }],
      });

      if (saveDialogResult.canceled || !saveDialogResult.filePath) {
        return { ok: false, canceled: true, filePath: null as string | null };
      }

      await copyFile(sourcePath, saveDialogResult.filePath);
      shell.showItemInFolder(saveDialogResult.filePath);
      return { ok: true, canceled: false, filePath: saveDialogResult.filePath };
    } catch (err) {
      console.error('[App] save-image-as error:', err);
      return { ok: false, canceled: false, filePath: null as string | null };
    }
  });

  ipcMain.handle('app:resolve-shortcut', (_event, lnkPath: string) => {
    try {
      if (process.platform === 'win32') {
        const result = shell.readShortcutLink(lnkPath);
        return { target: result.target, name: basename(lnkPath, '.lnk') };
      }
      return null;
    } catch (err) {
      console.error('[App] resolve-shortcut error:', err);
      return null;
    }
  });

  ipcMain.handle('app:open-standalone-window', () => {
    try {
      openStandaloneWindow();
      return true;
    } catch (err) {
      console.error('[App] open-standalone-window error:', err);
      return false;
    }
  });

  ipcMain.handle('app:close-standalone-window', () => {
    try {
      closeStandaloneWindow();
      return true;
    } catch (err) {
      console.error('[App] close-standalone-window error:', err);
      return false;
    }
  });

  ipcMain.on('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) win.minimize();
  });

  ipcMain.on('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return;
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });

  ipcMain.on('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) win.close();
  });
}
