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
import { appendFile, copyFile, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'fs/promises';
import { execFile } from 'child_process';
import { basename, dirname, resolve } from 'path';
import os from 'os';
import { clearLogsCacheFiles, ensureLogsDir } from '../../log/mainLog';
import { openStandaloneWindow, closeStandaloneWindow } from '../../window/standaloneWindow';
import { registerAgentIpcHandlers } from '../agent';
import { queryOpenWindowsWithIcons, type RunningWindowInfo } from '../../system/runningProcesses';
import { broadcastSettingChange } from '../../utils/broadcast';

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
  workspaces?: unknown;
}

const MAX_LOCAL_FILE_READ_BYTES = 1024 * 1024;
const MAX_LOCAL_CMD_OUTPUT_BYTES = 1024 * 1024;

function parseWorkspaces(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((w) => (typeof w === 'string' ? resolve(w.trim()) : ''))
    .filter(Boolean);
}

function isInsideWorkspaces(targetPath: string, workspaces: string[]): boolean {
  if (workspaces.length === 0) return false;
  const normalized = resolve(targetPath).toLowerCase();
  return workspaces.some((ws) => {
    const wsLower = ws.toLowerCase();
    return normalized === wsLower || normalized.startsWith(wsLower + '\\');
  });
}

function assertWorkspaceBoundary(targetPath: string, workspaces: string[], toolName: string): void {
  if (workspaces.length === 0) {
    throw new Error(`${toolName}: 未配置工作区，请先在设置中添加 Agent 工作区目录`);
  }
  if (!isInsideWorkspaces(targetPath, workspaces)) {
    throw new Error(`${toolName}: 路径 ${targetPath} 不在工作区范围内`);
  }
}
const BING_SEARCH_URL_TEMPLATE = 'https://www.bing.com/search?q=%s&form=QBLH&setmkt=zh-CN';
const BING_SEARCH_FALLBACK_URL_TEMPLATE = 'https://cn.bing.com/search?q=%s&form=QBLH';
const BING_RESULT_BLOCK_PATTERN = /<li[^>]*class="[^"]*b_algo[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
const BING_TITLE_LINK_PATTERN = /<h2[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i;
const BING_SNIPPET_PATTERN = /<(?:p|div)[^>]*class="[^"]*(?:b_lineclamp\d|b_paractl|b_algoSlug|b_caption)[^"]*"[^>]*>([\s\S]*?)<\/(?:p|div)>/i;
const BING_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const ISLAND_SETTINGS_REGISTRY: Array<{ key: string; description: string; type: string }> = [
  { key: 'theme-mode', description: '主题模式 (dark/light/system)', type: 'string' },
  { key: 'island-opacity', description: '灵动岛透明度 (10-100)', type: 'number' },
  { key: 'expand-mouseleave-idle', description: 'Expand 鼠标移开自动回 idle', type: 'boolean' },
  { key: 'maxexpand-mouseleave-idle', description: 'MaxExpand 鼠标移开自动回 idle', type: 'boolean' },
  { key: 'spring-animation', description: '弹性动画开关', type: 'boolean' },
  { key: 'clipboard-url-monitor-enabled', description: '剪贴板 URL 监听开关', type: 'boolean' },
  { key: 'clipboard-url-detect-mode', description: '剪贴板 URL 识别模式 (auto/strict)', type: 'string' },
  { key: 'clipboard-url-blacklist', description: '剪贴板 URL 域名黑名单', type: 'array' },
  { key: 'clipboard-url-suppress-in-url-favorites', description: '已收藏 URL 不再弹出通知', type: 'boolean' },
  { key: 'autostart-mode', description: '开机自启模式 (disabled/enabled/high-priority)', type: 'string' },
  { key: 'update-auto-prompt-enabled', description: '自动提示版本更新', type: 'boolean' },
  { key: 'update-source', description: '更新源 (cloudflare-r2/github/tencent-cos/aliyun-oss)', type: 'string' },
  { key: 'weather-alert-enabled', description: '天气预警通知', type: 'boolean' },
  { key: 'island-position-offset', description: '灵动岛位置偏移 {x, y}', type: 'object' },
  { key: 'island-display-id', description: '灵动岛显示器选择 (primary 或显示器 id)', type: 'string' },
  { key: 'island-bg-opacity', description: '背景图片透明度 (0-100)', type: 'number' },
  { key: 'island-bg-blur', description: '背景模糊度 (0-50)', type: 'number' },
  { key: 'island-bg-video-fit', description: '背景视频适配模式 (cover/contain)', type: 'string' },
  { key: 'island-bg-video-muted', description: '背景视频静音', type: 'boolean' },
  { key: 'island-bg-video-loop', description: '背景视频循环', type: 'boolean' },
  { key: 'island-bg-video-volume', description: '背景视频音量 (0-1)', type: 'number' },
  { key: 'island-bg-video-rate', description: '背景视频播放速率 (0.25-2)', type: 'number' },
  { key: 'island-bg-video-hw-decode', description: '背景视频硬件解码', type: 'boolean' },
  { key: 'island-bg-sync-system-wallpaper', description: '同步系统桌面壁纸', type: 'boolean' },
  { key: 'nav-order', description: '导航卡片顺序 {visibleOrder, hiddenOrder}', type: 'object' },
  { key: 'hide-hotkey', description: '隐藏快捷键', type: 'string' },
  { key: 'quit-hotkey', description: '退出快捷键', type: 'string' },
  { key: 'screenshot-hotkey', description: '截图快捷键', type: 'string' },
  { key: 'next-song-hotkey', description: '切歌快捷键', type: 'string' },
  { key: 'play-pause-song-hotkey', description: '暂停/播放快捷键', type: 'string' },
  { key: 'reset-position-hotkey', description: '还原位置快捷键', type: 'string' },
  { key: 'toggle-tray-hotkey', description: '切换托盘图标快捷键', type: 'string' },
  { key: 'show-settings-window-hotkey', description: '显示配置窗口快捷键', type: 'string' },
  { key: 'open-clipboard-history-hotkey', description: '打开剪贴板历史快捷键', type: 'string' },
  { key: 'toggle-passthrough-hotkey', description: '切换鼠标穿透快捷键', type: 'string' },
  { key: 'toggle-ui-lock-hotkey', description: '切换 UI 锁定快捷键', type: 'string' },
  { key: 'hide-process-list', description: '隐藏进程名单', type: 'array' },
  { key: 'lyrics-clock', description: '歌词界面时钟开关', type: 'boolean' },
  { key: 'mail-fetch-limit', description: '邮件获取数量限制', type: 'number' },
  { key: 'standalone-window-mac-controls', description: '独立窗口 Mac 风格控制按钮', type: 'boolean' },
];

const ISLAND_SETTING_BROADCAST_CHANNELS: Record<string, string> = {
  'theme-mode': 'theme:mode',
  'island-opacity': 'island:opacity',
  'expand-mouseleave-idle': 'island:expand-mouseleave-idle',
  'maxexpand-mouseleave-idle': 'island:maxexpand-mouseleave-idle',
  'spring-animation': 'island:spring-animation',
};

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
  const limit = Math.max(1, Math.min(10, Math.floor(limitRaw ?? 5)));
  const results: Array<{ title: string; url: string; snippet: string }> = [];
  let lastError = '';
  const searchTemplates = [BING_SEARCH_URL_TEMPLATE, BING_SEARCH_FALLBACK_URL_TEMPLATE];
  await searchTemplates.reduce(async (prev, template) => {
    await prev;
    if (results.length >= limit) return;
    try {
      await collectBingHtmlResults(query, results, limit, template);
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }, Promise.resolve());
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
    const workspaces = parseWorkspaces(request?.workspaces);
    if (!tool) {
      throw new Error('tool 不能为空');
    }

    if (tool === 'file.list') {
      const pathArg = normalizeLocalPath(getStringArg(args, 'path'));
      const limitRaw = getNumberArg(args, 'limit');
      const limit = Math.max(1, Math.min(500, Math.floor(limitRaw ?? 200)));
      if (!pathArg) {
        throw new Error('file.list 需要 path');
      }
      assertWorkspaceBoundary(pathArg, workspaces, 'file.list');
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

    if (tool === 'file.exists') {
      const pathArg = normalizeLocalPath(getStringArg(args, 'path'));
      if (!pathArg) {
        throw new Error('file.exists 需要 path');
      }
      assertWorkspaceBoundary(pathArg, workspaces, 'file.exists');
      const pathStat = await stat(pathArg).catch(() => null);
      return {
        success: true,
        result: {
          path: pathArg,
          exists: Boolean(pathStat),
          isFile: Boolean(pathStat?.isFile()),
          isDirectory: Boolean(pathStat?.isDirectory()),
        },
        error: '',
        durationMs: Date.now() - startedAt,
      };
    }

    if (tool === 'file.stat') {
      const pathArg = normalizeLocalPath(getStringArg(args, 'path'));
      if (!pathArg) {
        throw new Error('file.stat 需要 path');
      }
      assertWorkspaceBoundary(pathArg, workspaces, 'file.stat');
      const pathStat = await stat(pathArg);
      return {
        success: true,
        result: {
          path: pathArg,
          exists: true,
          isFile: pathStat.isFile(),
          isDirectory: pathStat.isDirectory(),
          size: pathStat.size,
          mode: pathStat.mode,
          atimeMs: pathStat.atimeMs,
          mtimeMs: pathStat.mtimeMs,
          ctimeMs: pathStat.ctimeMs,
          birthtimeMs: pathStat.birthtimeMs,
        },
        error: '',
        durationMs: Date.now() - startedAt,
      };
    }

    if (tool === 'file.mkdir') {
      const pathArg = normalizeLocalPath(getStringArg(args, 'path'));
      if (!pathArg) {
        throw new Error('file.mkdir 需要 path');
      }
      assertWorkspaceBoundary(pathArg, workspaces, 'file.mkdir');
      const recursive = args.recursive !== false;
      await mkdir(pathArg, { recursive });
      return {
        success: true,
        result: {
          path: pathArg,
          recursive,
          created: true,
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
      assertWorkspaceBoundary(pathArg, workspaces, 'file.read');
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

    if (tool === 'file.read.lines') {
      const pathArg = normalizeLocalPath(getStringArg(args, 'path'));
      if (!pathArg) {
        throw new Error('file.read.lines 需要 path');
      }
      assertWorkspaceBoundary(pathArg, workspaces, 'file.read.lines');
      const fileInfo = await stat(pathArg);
      if (!fileInfo.isFile()) {
        throw new Error('目标路径不是文件');
      }
      if (fileInfo.size > MAX_LOCAL_FILE_READ_BYTES) {
        throw new Error(`文件过大，最大支持 ${MAX_LOCAL_FILE_READ_BYTES} bytes`);
      }
      const startLineRaw = getNumberArg(args, 'startLine');
      const endLineRaw = getNumberArg(args, 'endLine');
      const startLine = Math.max(1, Math.floor(startLineRaw ?? 1));
      const maxWindow = 2000;
      let endLine = Math.max(startLine, Math.floor(endLineRaw ?? startLine + 199));
      if (endLine - startLine + 1 > maxWindow) {
        endLine = startLine + maxWindow - 1;
      }
      const content = await readFile(pathArg, 'utf8');
      const allLines = content.split(/\r?\n/);
      const startIndex = Math.max(0, startLine - 1);
      const endIndex = Math.min(allLines.length, endLine);
      const lines = allLines.slice(startIndex, endIndex).map((text, index) => ({
        line: startIndex + index + 1,
        text,
      }));
      return {
        success: true,
        result: {
          path: pathArg,
          startLine,
          endLine,
          totalLines: allLines.length,
          count: lines.length,
          lines,
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
      assertWorkspaceBoundary(pathArg, workspaces, 'file.write');
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
      assertWorkspaceBoundary(pathArg, workspaces, 'file.delete');
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
      const timeoutMs = Math.max(1000, Math.min(60000, Math.floor(timeoutRaw ?? 20000)));
      if (!command) {
        throw new Error('cmd.exec 需要 command');
      }
      if (cwd) {
        assertWorkspaceBoundary(cwd, workspaces, 'cmd.exec');
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

    if (tool === 'file.grep') {
      const pathArg = normalizeLocalPath(getStringArg(args, 'path'));
      const pattern = getStringArg(args, 'pattern');
      if (!pathArg) {
        throw new Error('file.grep 需要 path');
      }
      assertWorkspaceBoundary(pathArg, workspaces, 'file.grep');
      if (!pattern) {
        throw new Error('file.grep 需要 pattern');
      }
      const limitRaw = getNumberArg(args, 'limit');
      const maxResults = Math.max(1, Math.min(200, Math.floor(limitRaw ?? 50)));
      const maxDepthRaw = getNumberArg(args, 'maxDepth');
      const maxDepth = Math.max(0, Math.min(12, Math.floor(maxDepthRaw ?? 8)));
      const fixedStrings = args.fixedStrings === true;
      const caseSensitive = args.caseSensitive === true;
      const extensionSet = new Set(
        (Array.isArray(args.extensions) ? args.extensions : [])
          .map((ext: unknown) => String(ext || '').trim().replace(/^\./, '').toLowerCase())
          .filter(Boolean),
      );
      const excludedDirSet = new Set([
        '.git', 'node_modules', '.idea', '.vscode', '__pycache__', '.next', 'dist', 'out', 'build',
        ...(Array.isArray(args.excludeDirs) ? args.excludeDirs : [])
          .map((d: unknown) => String(d || '').trim().toLowerCase())
          .filter(Boolean),
      ]);

      let regex: RegExp;
      try {
        const flags = caseSensitive ? '' : 'i';
        const source = fixedStrings ? pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : pattern;
        regex = new RegExp(source, flags);
      } catch {
        throw new Error(`file.grep pattern 无效: ${pattern}`);
      }

      interface GrepMatch { file: string; line: number; text: string }
      const matches: GrepMatch[] = [];
      const MAX_FILE_SIZE = 2 * 1024 * 1024;
      const queue: Array<{ dir: string; depth: number }> = [{ dir: pathArg, depth: 0 }];

      // 如果 path 指向文件则直接搜索该文件
      const rootStat = await stat(pathArg).catch(() => null);
      if (rootStat && rootStat.isFile()) {
        if (rootStat.size <= MAX_FILE_SIZE) {
          const content = await readFile(pathArg, 'utf8').catch(() => '');
          const lines = content.split(/\r?\n/);
          for (let li = 0; li < lines.length && matches.length < maxResults; li++) {
            if (regex.test(lines[li])) {
              matches.push({ file: pathArg, line: li + 1, text: lines[li].slice(0, 500) });
            }
          }
        }
      } else {
        while (queue.length > 0 && matches.length < maxResults) {
          const current = queue.shift();
          if (!current) break;
          let entries: Array<{ name: string | Buffer; isDirectory: () => boolean }>;
          try {
            entries = await readdir(current.dir, { withFileTypes: true });
          } catch {
            continue;
          }
          for (let entryIdx = 0; entryIdx < entries.length; entryIdx++) {
            if (matches.length >= maxResults) break;
            const entry = entries[entryIdx];
            const entryName = typeof entry.name === 'string' ? entry.name : entry.name.toString('utf8');
            if (entryName.startsWith('.') && excludedDirSet.has(entryName.toLowerCase())) continue;
            const entryPath = `${current.dir}${current.dir.endsWith('\\') ? '' : '\\'}${entryName}`;
            if (entry.isDirectory()) {
              if (current.depth < maxDepth && !excludedDirSet.has(entryName.toLowerCase())) {
                queue.push({ dir: entryPath, depth: current.depth + 1 });
              }
              continue;
            }
            if (extensionSet.size > 0) {
              const dotIndex = entryName.lastIndexOf('.');
              const ext = dotIndex >= 0 ? entryName.slice(dotIndex + 1).toLowerCase() : '';
              if (!extensionSet.has(ext)) continue;
            }
            let fileStat;
            try { fileStat = await stat(entryPath); } catch { continue; }
            if (!fileStat.isFile() || fileStat.size > MAX_FILE_SIZE) continue;
            let content: string;
            try { content = await readFile(entryPath, 'utf8'); } catch { continue; }
            const lines = content.split(/\r?\n/);
            for (let li = 0; li < lines.length && matches.length < maxResults; li++) {
              if (regex.test(lines[li])) {
                matches.push({ file: entryPath, line: li + 1, text: lines[li].slice(0, 500) });
              }
            }
          }
          if (queue.length > 20000) {
            queue.splice(20000);
          }
        }
      }
      return {
        success: true,
        result: {
          path: pathArg,
          pattern,
          count: matches.length,
          matches,
        },
        error: '',
        durationMs: Date.now() - startedAt,
      };
    }

    if (tool === 'file.search') {
      const pathArg = normalizeLocalPath(getStringArg(args, 'path'));
      const keyword = getStringArg(args, 'keyword');
      if (!pathArg) {
        throw new Error('file.search 需要 path');
      }
      assertWorkspaceBoundary(pathArg, workspaces, 'file.search');
      if (!keyword) {
        throw new Error('file.search 需要 keyword');
      }
      const limitRaw = getNumberArg(args, 'limit');
      const searchOptions: LocalFileSearchOptions = {
        limit: Math.max(1, Math.min(200, Math.floor(limitRaw ?? 50))),
        maxDepth: typeof args.maxDepth === 'number' ? args.maxDepth : undefined,
        includeDirectories: args.includeDirectories !== false,
        includeFiles: args.includeFiles !== false,
        caseSensitive: args.caseSensitive === true,
        extensions: Array.isArray(args.extensions) ? args.extensions.map((e: unknown) => String(e || '')) : undefined,
      };
      const results = await searchLocalFiles(pathArg, keyword, searchOptions);
      return {
        success: true,
        result: {
          path: pathArg,
          keyword,
          count: results.length,
          items: results,
        },
        error: '',
        durationMs: Date.now() - startedAt,
      };
    }

    if (tool === 'file.rename') {
      const oldPath = normalizeLocalPath(getStringArg(args, 'oldPath') || getStringArg(args, 'path'));
      const newPath = normalizeLocalPath(getStringArg(args, 'newPath') || getStringArg(args, 'destination'));
      if (!oldPath) {
        throw new Error('file.rename 需要 oldPath');
      }
      if (!newPath) {
        throw new Error('file.rename 需要 newPath');
      }
      assertWorkspaceBoundary(oldPath, workspaces, 'file.rename');
      assertWorkspaceBoundary(newPath, workspaces, 'file.rename');
      await mkdir(dirname(newPath), { recursive: true });
      await rename(oldPath, newPath);
      return {
        success: true,
        result: { oldPath, newPath, renamed: true },
        error: '',
        durationMs: Date.now() - startedAt,
      };
    }

    if (tool === 'file.copy') {
      const srcPath = normalizeLocalPath(getStringArg(args, 'source') || getStringArg(args, 'path'));
      const destPath = normalizeLocalPath(getStringArg(args, 'destination') || getStringArg(args, 'newPath'));
      if (!srcPath) {
        throw new Error('file.copy 需要 source');
      }
      if (!destPath) {
        throw new Error('file.copy 需要 destination');
      }
      assertWorkspaceBoundary(srcPath, workspaces, 'file.copy');
      assertWorkspaceBoundary(destPath, workspaces, 'file.copy');
      await mkdir(dirname(destPath), { recursive: true });
      const srcStat = await stat(srcPath);
      if (srcStat.isDirectory()) {
        const copyDirRecursive = async (src: string, dest: string): Promise<void> => {
          await mkdir(dest, { recursive: true });
          const entries = await readdir(src, { withFileTypes: true });
          for (let entryIdx = 0; entryIdx < entries.length; entryIdx++) {
            const entry = entries[entryIdx];
            const srcEntry = resolve(src, entry.name);
            const destEntry = resolve(dest, entry.name);
            if (entry.isDirectory()) {
              await copyDirRecursive(srcEntry, destEntry);
            } else {
              await copyFile(srcEntry, destEntry);
            }
          }
        };
        await copyDirRecursive(srcPath, destPath);
      } else {
        await copyFile(srcPath, destPath);
      }
      return {
        success: true,
        result: { source: srcPath, destination: destPath, isDirectory: srcStat.isDirectory(), copied: true },
        error: '',
        durationMs: Date.now() - startedAt,
      };
    }

    if (tool === 'file.append') {
      const pathArg = normalizeLocalPath(getStringArg(args, 'path'));
      const content = typeof args.content === 'string' ? args.content : String(args.content ?? '');
      if (!pathArg) {
        throw new Error('file.append 需要 path');
      }
      assertWorkspaceBoundary(pathArg, workspaces, 'file.append');
      await mkdir(dirname(pathArg), { recursive: true });
      await appendFile(pathArg, content, 'utf8');
      return {
        success: true,
        result: { path: pathArg, appendedBytes: Buffer.byteLength(content, 'utf8') },
        error: '',
        durationMs: Date.now() - startedAt,
      };
    }

    if (tool === 'file.replace') {
      const pathArg = normalizeLocalPath(getStringArg(args, 'path'));
      const search = getStringArg(args, 'search');
      const replacement = typeof args.replacement === 'string' ? args.replacement : String(args.replacement ?? '');
      const replaceAll = args.replaceAll !== false;
      if (!pathArg) {
        throw new Error('file.replace 需要 path');
      }
      if (!search) {
        throw new Error('file.replace 需要 search');
      }
      assertWorkspaceBoundary(pathArg, workspaces, 'file.replace');
      const fileInfo = await stat(pathArg);
      if (!fileInfo.isFile()) {
        throw new Error('目标路径不是文件');
      }
      if (fileInfo.size > MAX_LOCAL_FILE_READ_BYTES) {
        throw new Error(`文件过大，最大支持 ${MAX_LOCAL_FILE_READ_BYTES} bytes`);
      }
      const originalContent = await readFile(pathArg, 'utf8');
      let newContent: string;
      let count: number;
      if (replaceAll) {
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'g');
        count = (originalContent.match(regex) || []).length;
        newContent = originalContent.replace(regex, replacement);
      } else {
        const idx = originalContent.indexOf(search);
        count = idx >= 0 ? 1 : 0;
        newContent = idx >= 0
          ? originalContent.slice(0, idx) + replacement + originalContent.slice(idx + search.length)
          : originalContent;
      }
      if (count > 0) {
        await writeFile(pathArg, newContent, 'utf8');
      }
      return {
        success: true,
        result: { path: pathArg, search, replacementLength: replacement.length, replaceAll, matchCount: count, modified: count > 0 },
        error: '',
        durationMs: Date.now() - startedAt,
      };
    }

    if (tool === 'cmd.powershell') {
      const command = getStringArg(args, 'command');
      const cwd = normalizeLocalPath(getStringArg(args, 'cwd'));
      const timeoutRaw = getNumberArg(args, 'timeoutMs');
      const timeoutMs = Math.max(1000, Math.min(60000, Math.floor(timeoutRaw ?? 20000)));
      if (!command) {
        throw new Error('cmd.powershell 需要 command');
      }
      if (cwd) {
        assertWorkspaceBoundary(cwd, workspaces, 'cmd.powershell');
      }
      const output = await new Promise<{ stdout: string; stderr: string }>((resolvePromise, rejectPromise) => {
        execFile(
          'powershell.exe',
          ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command],
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
        result: { command, cwd, stdout: output.stdout, stderr: output.stderr },
        error: '',
        durationMs: Date.now() - startedAt,
      };
    }

    if (tool === 'sys.info') {
      return {
        success: true,
        result: {
          platform: os.platform(),
          arch: os.arch(),
          release: os.release(),
          hostname: os.hostname(),
          homedir: os.homedir(),
          tmpdir: os.tmpdir(),
          cpuModel: os.cpus()[0]?.model || 'unknown',
          cpuCores: os.cpus().length,
          totalMemoryMB: Math.round(os.totalmem() / (1024 * 1024)),
          freeMemoryMB: Math.round(os.freemem() / (1024 * 1024)),
          uptime: Math.round(os.uptime()),
          userInfo: (() => { try { const u = os.userInfo(); return { username: u.username, uid: u.uid, gid: u.gid }; } catch { return null; } })(),
        },
        error: '',
        durationMs: Date.now() - startedAt,
      };
    }

    if (tool === 'sys.env') {
      const nameArg = getStringArg(args, 'name');
      if (nameArg) {
        return {
          success: true,
          result: { name: nameArg, value: process.env[nameArg] ?? null },
          error: '',
          durationMs: Date.now() - startedAt,
        };
      }
      const filterArg = getStringArg(args, 'filter');
      const entries = Object.entries(process.env);
      let filtered: Array<[string, string | undefined]>;
      if (filterArg) {
        const fl = filterArg.toLowerCase();
        filtered = entries.filter(([key]) => key.toLowerCase().includes(fl));
      } else {
        filtered = entries;
      }
      const limitRaw = getNumberArg(args, 'limit');
      const limit = Math.max(1, Math.min(200, Math.floor(limitRaw === null || limitRaw === undefined ? 50 : limitRaw)));
      const sliced = filtered.slice(0, limit);
      return {
        success: true,
        result: {
          count: sliced.length,
          totalMatched: filtered.length,
          variables: Object.fromEntries(sliced),
        },
        error: '',
        durationMs: Date.now() - startedAt,
      };
    }

    if (tool === 'sys.open') {
      const target = getStringArg(args, 'target')?.toLowerCase().trim();
      const pathArg = getStringArg(args, 'path');
      if (!target) throw new Error('sys.open 需要 target');

      // 预定义的 Windows 系统组件映射
      const builtinTargets: Record<string, { exe?: string; uri?: string; label: string }> = {
        explorer:    { exe: 'explorer.exe', label: '文件资源管理器' },
        settings:    { uri: 'ms-settings:', label: 'Windows 设置' },
        display:     { uri: 'ms-settings:display', label: '显示设置' },
        sound:       { uri: 'ms-settings:sound', label: '声音设置' },
        bluetooth:   { uri: 'ms-settings:bluetooth', label: '蓝牙设置' },
        wifi:        { uri: 'ms-settings:network-wifi', label: 'Wi-Fi 设置' },
        network:     { uri: 'ms-settings:network-status', label: '网络状态' },
        proxy:       { uri: 'ms-settings:network-proxy', label: '代理设置' },
        apps:        { uri: 'ms-settings:appsfeatures', label: '应用和功能' },
        defaultapps: { uri: 'ms-settings:defaultapps', label: '默认应用' },
        storage:     { uri: 'ms-settings:storagesense', label: '存储设置' },
        power:       { uri: 'ms-settings:powersleep', label: '电源和睡眠' },
        about:       { uri: 'ms-settings:about', label: '系统信息' },
        update:      { uri: 'ms-settings:windowsupdate', label: 'Windows 更新' },
        datetime:    { uri: 'ms-settings:dateandtime', label: '日期和时间' },
        language:    { uri: 'ms-settings:regionlanguage', label: '语言设置' },
        privacy:     { uri: 'ms-settings:privacy', label: '隐私设置' },
        personalize: { uri: 'ms-settings:personalization', label: '个性化' },
        themes:      { uri: 'ms-settings:themes', label: '主题' },
        wallpaper:   { uri: 'ms-settings:personalization-background', label: '壁纸' },
        lockscreen:  { uri: 'ms-settings:lockscreen', label: '锁屏界面' },
        taskbar:     { uri: 'ms-settings:taskbar', label: '任务栏设置' },
        startmenu:   { uri: 'ms-settings:personalization-start', label: '开始菜单设置' },
        mouse:       { uri: 'ms-settings:mousetouchpad', label: '鼠标设置' },
        keyboard:    { uri: 'ms-settings:typing', label: '键盘设置' },
        control:     { exe: 'control.exe', label: '控制面板' },
        taskmgr:     { exe: 'taskmgr.exe', label: '任务管理器' },
        devmgr:      { exe: 'devmgmt.msc', label: '设备管理器' },
        diskmgmt:    { exe: 'diskmgmt.msc', label: '磁盘管理' },
        services:    { exe: 'services.msc', label: '服务管理' },
        regedit:     { exe: 'regedit.exe', label: '注册表编辑器' },
        notepad:     { exe: 'notepad.exe', label: '记事本' },
        calc:        { exe: 'calc.exe', label: '计算器' },
        paint:       { exe: 'mspaint.exe', label: '画图' },
        terminal:    { exe: 'wt.exe', label: 'Windows Terminal' },
        snip:        { exe: 'snippingtool.exe', label: '截图工具' },
      };

      const entry = builtinTargets[target];
      if (entry) {
        if (entry.uri) {
          await shell.openExternal(entry.uri);
        } else if (entry.exe) {
          const exe: string = entry.exe;
          const exeArgs: string[] = [];
          // explorer 支持打开指定路径
          if (target === 'explorer' && pathArg) {
            exeArgs.push(normalizeLocalPath(pathArg) || pathArg);
          }
          // msc 文件通过 mmc.exe 打开
          if (exe.endsWith('.msc')) {
            await new Promise<void>((res, rej) => {
              execFile('mmc.exe', [exe, ...exeArgs], { windowsHide: false, timeout: 10000 },
                (err) => { if (err) rej(new Error(err.message)); else res(); });
            });
          } else {
            await new Promise<void>((res, rej) => {
              execFile(exe, exeArgs, { windowsHide: false, timeout: 10000 },
                (err) => { if (err) rej(new Error(err.message)); else res(); });
            });
          }
        }
        return { success: true, result: { target, label: entry.label, opened: true }, error: '', durationMs: Date.now() - startedAt };
      }

      // 支持直接传入 ms-settings: URI 或其他 URI scheme
      if (target.startsWith('ms-settings:') || target.startsWith('http://') || target.startsWith('https://')) {
        await shell.openExternal(target);
        return { success: true, result: { target, opened: true }, error: '', durationMs: Date.now() - startedAt };
      }

      throw new Error(`sys.open 不支持的 target: ${target}。可用值: ${Object.keys(builtinTargets).join(', ')}，或直接传入 ms-settings: URI`);
    }

    if (tool === 'file.tree') {
      const pathArg = normalizeLocalPath(getStringArg(args, 'path'));
      const maxDepthRaw = getNumberArg(args, 'maxDepth');
      const maxDepth = Math.max(1, Math.min(6, Math.floor(maxDepthRaw === null || maxDepthRaw === undefined ? 3 : maxDepthRaw)));
      const limitRaw = getNumberArg(args, 'limit');
      const maxItems = Math.max(1, Math.min(500, Math.floor(limitRaw === null || limitRaw === undefined ? 200 : limitRaw)));
      if (!pathArg) {
        throw new Error('file.tree 需要 path');
      }
      assertWorkspaceBoundary(pathArg, workspaces, 'file.tree');
      interface TreeNode { name: string; path: string; isDirectory: boolean; children?: TreeNode[] }
      let itemCount = 0;
      const buildTree = async (dir: string, depth: number): Promise<TreeNode[]> => {
        if (depth > maxDepth || itemCount >= maxItems) return [];
        let entries: Array<{ name: string; isDirectory: () => boolean }>;
        try { entries = await readdir(dir, { withFileTypes: true }); } catch { return []; }
        const excludedDirs = new Set(['.git', 'node_modules', '.idea', '.vscode', '__pycache__', '.next', 'dist', 'out', 'build']);
        const nodes: TreeNode[] = [];
        for (let entryIdx = 0; entryIdx < entries.length; entryIdx++) {
          if (itemCount >= maxItems) break;
          const entry = entries[entryIdx];
          const entryName = entry.name;
          if (entryName.startsWith('.') && excludedDirs.has(entryName.toLowerCase())) continue;
          const entryPath = resolve(dir, entryName);
          const isDir = entry.isDirectory();
          itemCount++;
          const node: TreeNode = { name: entryName, path: entryPath, isDirectory: isDir };
          if (isDir && depth < maxDepth && !excludedDirs.has(entryName.toLowerCase())) {
            node.children = await buildTree(entryPath, depth + 1);
          }
          nodes.push(node);
        }
        return nodes;
      };
      const tree = await buildTree(pathArg, 1);
      return {
        success: true,
        result: { path: pathArg, maxDepth, itemCount, tree },
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

    const WIN_PS_TIMEOUT = 15000;

    if (tool === 'win.list') {
      const filterArg = getStringArg(args, 'filter') || '';
      let allWindows: RunningWindowInfo[] = await queryOpenWindowsWithIcons();
      if (filterArg) {
        const lower = filterArg.toLowerCase();
        allWindows = allWindows.filter(w =>
          w.processName.toLowerCase().includes(lower) || w.title.toLowerCase().includes(lower));
      }
      const items = allWindows.map(w => ({
        pid: w.processId,
        name: w.processName,
        title: w.title,
        handle: Number(w.id) || 0,
        path: w.processPath,
      }));
      return { success: true, result: { windows: items, count: items.length }, error: '', durationMs: Date.now() - startedAt };
    }

    if (tool === 'win.minimize' || tool === 'win.maximize' || tool === 'win.restore') {
      const pidRaw = getNumberArg(args, 'pid');
      const name = getStringArg(args, 'name');
      const handleRaw = getNumberArg(args, 'handle');
      if ((pidRaw === null || pidRaw === undefined) && !name && (handleRaw === null || handleRaw === undefined)) throw new Error(`${tool} 需要 pid、name 或 handle`);
      const swFlag = tool === 'win.minimize' ? 6 : tool === 'win.maximize' ? 3 : 9;
      const actionLabel = tool === 'win.minimize' ? '最小化' : tool === 'win.maximize' ? '最大化' : '还原';

      // 通过 queryOpenWindowsWithIcons 查找目标窗口
      const allWindows = await queryOpenWindowsWithIcons();
      let targetHandle: number = handleRaw ?? 0;
      let targetInfo = { pid: 0, name: '', title: '' };
      if (!targetHandle) {
        const match = pidRaw !== null && pidRaw !== undefined
          ? allWindows.find(w => w.processId === Math.floor(pidRaw))
          : allWindows.find(w => w.processName.toLowerCase().includes((name || '').toLowerCase()) || w.title.toLowerCase().includes((name || '').toLowerCase()));
        if (!match) throw new Error('未找到匹配的窗口');
        targetHandle = Number(match.id) || 0;
        if (!targetHandle) throw new Error('无法获取窗口句柄');
        targetInfo = { pid: match.processId ?? 0, name: match.processName, title: match.title };
      } else {
        const match = allWindows.find(w => Number(w.id) === targetHandle);
        if (match) targetInfo = { pid: match.processId ?? 0, name: match.processName, title: match.title };
      }

      // 通过 PowerShell 调用 Win32 ShowWindow 控制窗口状态
      const psScript = `Add-Type -Name WinAPI -Namespace User32 -MemberDefinition '[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);'; [User32.WinAPI]::ShowWindow([IntPtr]${targetHandle}, ${swFlag})`;
      await new Promise<void>((res, rej) => {
        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
          { windowsHide: true, timeout: WIN_PS_TIMEOUT, maxBuffer: 64 * 1024 },
          (err) => { if (err) rej(new Error(err.message)); else res(); });
      });
      return { success: true, result: { ...targetInfo, handle: targetHandle, action: actionLabel }, error: '', durationMs: Date.now() - startedAt };
    }

    if (tool === 'win.close') {
      const pidRaw = getNumberArg(args, 'pid');
      const name = getStringArg(args, 'name');
      if ((pidRaw === null || pidRaw === undefined) && !name) throw new Error('win.close 需要 pid 或 name');

      // 通过 queryOpenWindowsWithIcons 确认目标窗口存在
      const allWindows = await queryOpenWindowsWithIcons();
      const matches = pidRaw !== null && pidRaw !== undefined
        ? allWindows.filter(w => w.processId === Math.floor(pidRaw))
        : allWindows.filter(w => w.processName.toLowerCase().includes((name || '').toLowerCase()));
      if (matches.length === 0) throw new Error('未找到匹配的窗口进程');

      const targetPid = matches[0].processId ?? 0;
      const targetName = matches[0].processName;
      const targetTitle = matches[0].title;
      if (!targetPid) throw new Error('无法获取目标进程 PID');

      // 通过 taskkill 终止进程
      await new Promise<void>((res, rej) => {
        execFile('taskkill', ['/PID', String(targetPid), '/F'],
          { windowsHide: true, timeout: WIN_PS_TIMEOUT },
          (err) => { if (err) rej(new Error(err.message)); else res(); });
      });
      return { success: true, result: { closed: { pid: targetPid, name: targetName, title: targetTitle } }, error: '', durationMs: Date.now() - startedAt };
    }

    if (tool === 'win.screenshot') {
      if (workspaces.length === 0) throw new Error('win.screenshot: 未配置工作区，请先在设置中添加 Agent 工作区目录');
      const pathArg = getStringArg(args, 'path');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
      const fileName = pathArg || `screenshot_${timestamp}.png`;
      const savePath = resolve(workspaces[0], fileName);
      assertWorkspaceBoundary(savePath, workspaces, 'win.screenshot');
      await mkdir(dirname(savePath), { recursive: true });

      // 复用 desktopCapturer 截取屏幕
      const { desktopCapturer } = await import('electron');
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 },
      });
      if (sources.length === 0) throw new Error('无法获取屏幕截图源');
      const pngBuffer = sources[0].thumbnail.toPNG();
      await writeFile(savePath, pngBuffer);

      return {
        success: true,
        result: { path: savePath, size: pngBuffer.length, fileName: basename(savePath) },
        error: '',
        durationMs: Date.now() - startedAt,
      };
    }

    // ── 剪贴板 ──

    if (tool === 'clipboard.read') {
      const { clipboard } = await import('electron');
      const text = clipboard.readText();
      const image = clipboard.readImage();
      const hasImage = !image.isEmpty();
      const result: Record<string, unknown> = { text: text || null, hasImage };
      if (hasImage) {
        const pngBuf = image.toPNG();
        result.imageBase64 = pngBuf.toString('base64');
        result.imageSize = pngBuf.length;
        result.imageWidth = image.getSize().width;
        result.imageHeight = image.getSize().height;
      }
      return { success: true, result, error: '', durationMs: Date.now() - startedAt };
    }

    if (tool === 'clipboard.write') {
      const { clipboard } = await import('electron');
      const text = getStringArg(args, 'text');
      if (!text) throw new Error('clipboard.write 需要 text');
      clipboard.writeText(text);
      return { success: true, result: { written: true, length: text.length }, error: '', durationMs: Date.now() - startedAt };
    }

    // ── 通知 ──

    if (tool === 'notification.send') {
      const { Notification: ElectronNotification } = await import('electron');
      const title = getStringArg(args, 'title') || 'eIsland Agent';
      const body = getStringArg(args, 'body');
      if (!body) throw new Error('notification.send 需要 body');
      new ElectronNotification({ title, body }).show();
      return { success: true, result: { title, body, sent: true }, error: '', durationMs: Date.now() - startedAt };
    }

    // ── 文件压缩/解压 ──

    if (tool === 'file.compress') {
      const pathArg = normalizeLocalPath(getStringArg(args, 'path'));
      const destArg = normalizeLocalPath(getStringArg(args, 'destination'));
      if (!pathArg) throw new Error('file.compress 需要 path');
      assertWorkspaceBoundary(pathArg, workspaces, 'file.compress');
      const dest = destArg || `${pathArg}.zip`;
      assertWorkspaceBoundary(dest, workspaces, 'file.compress');
      const psScript = `Compress-Archive -Path '${pathArg.replace(/'/g, "''")}' -DestinationPath '${dest.replace(/'/g, "''")}' -Force`;
      await new Promise<void>((res, rej) => {
        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
          { windowsHide: true, timeout: 60000, maxBuffer: 64 * 1024 },
          (err) => { if (err) rej(new Error(err.message)); else res(); });
      });
      const zipStat = await stat(dest).catch(() => null);
      return { success: true, result: { source: pathArg, destination: dest, size: zipStat?.size ?? 0 }, error: '', durationMs: Date.now() - startedAt };
    }

    if (tool === 'file.extract') {
      const pathArg = normalizeLocalPath(getStringArg(args, 'path'));
      const destArg = normalizeLocalPath(getStringArg(args, 'destination'));
      if (!pathArg) throw new Error('file.extract 需要 path');
      assertWorkspaceBoundary(pathArg, workspaces, 'file.extract');
      const dest = destArg || dirname(pathArg);
      assertWorkspaceBoundary(dest, workspaces, 'file.extract');
      const psScript = `Expand-Archive -Path '${pathArg.replace(/'/g, "''")}' -DestinationPath '${dest.replace(/'/g, "''")}' -Force`;
      await new Promise<void>((res, rej) => {
        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
          { windowsHide: true, timeout: 60000, maxBuffer: 64 * 1024 },
          (err) => { if (err) rej(new Error(err.message)); else res(); });
      });
      return { success: true, result: { source: pathArg, destination: dest, extracted: true }, error: '', durationMs: Date.now() - startedAt };
    }

    // ── 文件哈希 / 回收站 ──

    if (tool === 'file.hash') {
      const pathArg = normalizeLocalPath(getStringArg(args, 'path'));
      const algorithm = (getStringArg(args, 'algorithm') || 'sha256').toUpperCase();
      if (!pathArg) throw new Error('file.hash 需要 path');
      assertWorkspaceBoundary(pathArg, workspaces, 'file.hash');
      const psScript = `(Get-FileHash -Path '${pathArg.replace(/'/g, "''")}' -Algorithm ${algorithm}).Hash`;
      const output = await new Promise<string>((res, rej) => {
        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
          { windowsHide: true, timeout: 30000, maxBuffer: 64 * 1024 },
          (err, stdout) => { if (err) rej(new Error(err.message)); else res(String(stdout).trim()); });
      });
      return { success: true, result: { path: pathArg, algorithm, hash: output }, error: '', durationMs: Date.now() - startedAt };
    }

    if (tool === 'file.trash') {
      const pathArg = normalizeLocalPath(getStringArg(args, 'path'));
      if (!pathArg) throw new Error('file.trash 需要 path');
      assertWorkspaceBoundary(pathArg, workspaces, 'file.trash');
      const { shell: electronShell } = await import('electron');
      await electronShell.trashItem(pathArg);
      return { success: true, result: { path: pathArg, trashed: true }, error: '', durationMs: Date.now() - startedAt };
    }

    // ── 网络工具 ──

    if (tool === 'net.ping') {
      const host = getStringArg(args, 'host');
      if (!host) throw new Error('net.ping 需要 host');
      const countRaw = getNumberArg(args, 'count');
      const count = Math.max(1, Math.min(10, Math.floor(countRaw ?? 4)));
      const output = await new Promise<string>((res) => {
        execFile('ping', ['-n', String(count), host],
          { windowsHide: true, timeout: 30000, maxBuffer: 64 * 1024 },
          (err, stdout) => { if (err) res(String(stdout || err.message)); else res(String(stdout)); });
      });
      return { success: true, result: { host, count, output: output.trim() }, error: '', durationMs: Date.now() - startedAt };
    }

    if (tool === 'net.dns') {
      const host = getStringArg(args, 'host');
      if (!host) throw new Error('net.dns 需要 host');
      const psScript = `Resolve-DnsName -Name '${host.replace(/'/g, "''")}' | Select-Object Name,Type,IPAddress,NameHost | ConvertTo-Json -Compress`;
      const output = await new Promise<string>((res, rej) => {
        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
          { windowsHide: true, timeout: 15000, maxBuffer: 64 * 1024 },
          (err, stdout) => { if (err) rej(new Error(err.message)); else res(String(stdout).trim()); });
      });
      let parsed: unknown;
      try { parsed = JSON.parse(output); } catch { parsed = output; }
      return { success: true, result: { host, records: parsed }, error: '', durationMs: Date.now() - startedAt };
    }

    if (tool === 'net.ports') {
      const filterArg = getStringArg(args, 'filter') || '';
      const psScript = `Get-NetTCPConnection -State Listen ${filterArg ? `| Where-Object { $_.LocalPort -eq ${filterArg} -or $_.OwningProcess -eq '${filterArg.replace(/'/g, "''")}' }` : ''} | Select-Object -First 50 LocalAddress,LocalPort,OwningProcess,@{N='ProcessName';E={(Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).ProcessName}} | ConvertTo-Json -Compress`;
      const output = await new Promise<string>((res, rej) => {
        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
          { windowsHide: true, timeout: 15000, maxBuffer: 128 * 1024 },
          (err, stdout) => { if (err) rej(new Error(err.message)); else res(String(stdout).trim()); });
      });
      let parsed: unknown;
      try { parsed = JSON.parse(output); } catch { parsed = output; }
      return { success: true, result: { filter: filterArg || null, ports: parsed }, error: '', durationMs: Date.now() - startedAt };
    }

    // ── 系统监控 ──

    if (tool === 'monitor.cpu') {
      const psScript = `Get-CimInstance Win32_Processor | Select-Object Name,NumberOfCores,NumberOfLogicalProcessors,LoadPercentage | ConvertTo-Json -Compress`;
      const output = await new Promise<string>((res, rej) => {
        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
          { windowsHide: true, timeout: 15000, maxBuffer: 64 * 1024 },
          (err, stdout) => { if (err) rej(new Error(err.message)); else res(String(stdout).trim()); });
      });
      let parsed: unknown;
      try { parsed = JSON.parse(output); } catch { parsed = output; }
      return { success: true, result: parsed, error: '', durationMs: Date.now() - startedAt };
    }

    if (tool === 'monitor.memory') {
      const totalMB = Math.round(os.totalmem() / (1024 * 1024));
      const freeMB = Math.round(os.freemem() / (1024 * 1024));
      const usedMB = totalMB - freeMB;
      const usagePercent = Math.round((usedMB / totalMB) * 100);
      return { success: true, result: { totalMB, freeMB, usedMB, usagePercent }, error: '', durationMs: Date.now() - startedAt };
    }

    if (tool === 'monitor.disk') {
      const psScript = `Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | Select-Object DeviceID,VolumeName,@{N='SizeGB';E={[math]::Round($_.Size/1GB,2)}},@{N='FreeGB';E={[math]::Round($_.FreeSpace/1GB,2)}},@{N='UsedGB';E={[math]::Round(($_.Size-$_.FreeSpace)/1GB,2)}},@{N='UsagePercent';E={[math]::Round(($_.Size-$_.FreeSpace)/$_.Size*100,1)}} | ConvertTo-Json -Compress`;
      const output = await new Promise<string>((res, rej) => {
        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
          { windowsHide: true, timeout: 15000, maxBuffer: 64 * 1024 },
          (err, stdout) => { if (err) rej(new Error(err.message)); else res(String(stdout).trim()); });
      });
      let parsed: unknown;
      try { parsed = JSON.parse(output); } catch { parsed = output; }
      return { success: true, result: { disks: parsed }, error: '', durationMs: Date.now() - startedAt };
    }

    if (tool === 'monitor.gpu') {
      const psScript = `Get-CimInstance Win32_VideoController | Select-Object Name,AdapterRAM,DriverVersion,VideoProcessor,CurrentHorizontalResolution,CurrentVerticalResolution | ConvertTo-Json -Compress`;
      const output = await new Promise<string>((res, rej) => {
        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
          { windowsHide: true, timeout: 15000, maxBuffer: 64 * 1024 },
          (err, stdout) => { if (err) rej(new Error(err.message)); else res(String(stdout).trim()); });
      });
      let parsed: unknown;
      try { parsed = JSON.parse(output); } catch { parsed = output; }
      return { success: true, result: parsed, error: '', durationMs: Date.now() - startedAt };
    }

    // ── 音量 / 亮度 ──

    if (tool === 'volume.get') {
      const psScript = `Add-Type -TypeDefinition 'using System.Runtime.InteropServices; [Guid("5CDF2C82-841E-4546-9722-0CF74078229A"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IAudioEndpointVolume { int _0(); int _1(); int _2(); int _3(); int SetMasterVolumeLevelScalar(float fLevel, System.Guid pguidEventContext); int _5(); int GetMasterVolumeLevelScalar(out float pfLevel); int SetMute(bool bMute, System.Guid pguidEventContext); int GetMute(out bool pbMute); } [Guid("D666063F-1587-4E43-81F1-B948E807363F"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IMMDevice { int Activate(ref System.Guid iid, int dwClsCtx, IntPtr pActivationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface); } [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IMMDeviceEnumerator { int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice); } [ComImport,Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumerator {}'; $e = New-Object MMDeviceEnumerator; $d = $null; [void]$e.GetDefaultAudioEndpoint(0,1,[ref]$d); $iid=[Guid]'5CDF2C82-841E-4546-9722-0CF74078229A'; $v=$null; [void]$d.Activate([ref]$iid,1,[IntPtr]::Zero,[ref]$v); $vol=$v; $level=0.0; [void]$vol.GetMasterVolumeLevelScalar([ref]$level); $muted=$false; [void]$vol.GetMute([ref]$muted); @{level=[math]::Round($level*100);muted=$muted}|ConvertTo-Json -Compress`;
      const output = await new Promise<string>((res, rej) => {
        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
          { windowsHide: true, timeout: 10000, maxBuffer: 64 * 1024 },
          (err, stdout) => { if (err) rej(new Error(err.message)); else res(String(stdout).trim()); });
      });
      let parsed: unknown;
      try { parsed = JSON.parse(output); } catch { parsed = { raw: output }; }
      return { success: true, result: parsed, error: '', durationMs: Date.now() - startedAt };
    }

    if (tool === 'volume.set') {
      const levelRaw = getNumberArg(args, 'level');
      if (levelRaw === null || levelRaw === undefined) throw new Error('volume.set 需要 level (0-100)');
      const level = Math.max(0, Math.min(100, Math.floor(levelRaw)));
      const scalar = (level / 100).toFixed(2);
      const psScript = `Add-Type -TypeDefinition 'using System.Runtime.InteropServices; [Guid("5CDF2C82-841E-4546-9722-0CF74078229A"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IAudioEndpointVolume { int _0(); int _1(); int _2(); int _3(); int SetMasterVolumeLevelScalar(float fLevel, System.Guid pguidEventContext); int _5(); int GetMasterVolumeLevelScalar(out float pfLevel); int SetMute(bool bMute, System.Guid pguidEventContext); int GetMute(out bool pbMute); } [Guid("D666063F-1587-4E43-81F1-B948E807363F"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IMMDevice { int Activate(ref System.Guid iid, int dwClsCtx, IntPtr pActivationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface); } [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IMMDeviceEnumerator { int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice); } [ComImport,Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumerator {}'; $e = New-Object MMDeviceEnumerator; $d = $null; [void]$e.GetDefaultAudioEndpoint(0,1,[ref]$d); $iid=[Guid]'5CDF2C82-841E-4546-9722-0CF74078229A'; $v=$null; [void]$d.Activate([ref]$iid,1,[IntPtr]::Zero,[ref]$v); $vol=$v; [void]$vol.SetMasterVolumeLevelScalar(${scalar},[Guid]::Empty); [void]$vol.SetMute($false,[Guid]::Empty)`;
      await new Promise<void>((res, rej) => {
        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
          { windowsHide: true, timeout: 10000, maxBuffer: 64 * 1024 },
          (err) => { if (err) rej(new Error(err.message)); else res(); });
      });
      return { success: true, result: { level, set: true }, error: '', durationMs: Date.now() - startedAt };
    }

    if (tool === 'brightness.get') {
      const psScript = `(Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightness).CurrentBrightness`;
      const output = await new Promise<string>((res, rej) => {
        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
          { windowsHide: true, timeout: 10000, maxBuffer: 64 * 1024 },
          (err, stdout) => { if (err) rej(new Error(err.message)); else res(String(stdout).trim()); });
      });
      return { success: true, result: { brightness: parseInt(output) || 0 }, error: '', durationMs: Date.now() - startedAt };
    }

    if (tool === 'brightness.set') {
      const levelRaw = getNumberArg(args, 'level');
      if (levelRaw === null || levelRaw === undefined) throw new Error('brightness.set 需要 level (0-100)');
      const level = Math.max(0, Math.min(100, Math.floor(levelRaw)));
      const psScript = `(Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightnessMethods).WmiSetBrightness(1,${level})`;
      await new Promise<void>((res, rej) => {
        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
          { windowsHide: true, timeout: 10000, maxBuffer: 64 * 1024 },
          (err) => { if (err) rej(new Error(err.message)); else res(); });
      });
      return { success: true, result: { brightness: level, set: true }, error: '', durationMs: Date.now() - startedAt };
    }

    // ── 显示器 / 电源 / Wi-Fi ──

    if (tool === 'display.list') {
      const psScript = `Get-CimInstance Win32_DesktopMonitor | Select-Object Name,ScreenWidth,ScreenHeight; Get-CimInstance Win32_VideoController | Select-Object Name,CurrentHorizontalResolution,CurrentVerticalResolution,CurrentRefreshRate | ConvertTo-Json -Compress`;
      const output = await new Promise<string>((res, rej) => {
        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
          { windowsHide: true, timeout: 10000, maxBuffer: 64 * 1024 },
          (err, stdout) => { if (err) rej(new Error(err.message)); else res(String(stdout).trim()); });
      });
      let parsed: unknown;
      try { parsed = JSON.parse(output); } catch { parsed = output; }
      return { success: true, result: { displays: parsed }, error: '', durationMs: Date.now() - startedAt };
    }

    if (tool === 'power.sleep' || tool === 'power.shutdown' || tool === 'power.restart') {
      const action = tool.split('.')[1];
      let cmd: string;
      if (action === 'sleep') cmd = 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0';
      else if (action === 'shutdown') cmd = 'shutdown /s /t 5 /c "eIsland Agent 关机"';
      else cmd = 'shutdown /r /t 5 /c "eIsland Agent 重启"';
      await new Promise<void>((res, rej) => {
        execFile('cmd.exe', ['/c', cmd], { windowsHide: true, timeout: 10000 },
          (err) => { if (err) rej(new Error(err.message)); else res(); });
      });
      return { success: true, result: { action, initiated: true }, error: '', durationMs: Date.now() - startedAt };
    }

    if (tool === 'wifi.list') {
      const output = await new Promise<string>((res, rej) => {
        execFile('netsh', ['wlan', 'show', 'networks', 'mode=bssid'],
          { windowsHide: true, timeout: 15000, maxBuffer: 128 * 1024 },
          (err, stdout) => { if (err) rej(new Error(err.message)); else res(String(stdout).trim()); });
      });
      return { success: true, result: { output }, error: '', durationMs: Date.now() - startedAt };
    }

    // ── 注册表 ──

    if (tool === 'registry.read') {
      const keyPath = getStringArg(args, 'path');
      const valueName = getStringArg(args, 'name') || '';
      if (!keyPath) throw new Error('registry.read 需要 path');
      const psScript = valueName
        ? `Get-ItemPropertyValue -Path '${keyPath.replace(/'/g, "''")}' -Name '${valueName.replace(/'/g, "''")}'`
        : `Get-ItemProperty -Path '${keyPath.replace(/'/g, "''")}' | Select-Object * -ExcludeProperty PS* | ConvertTo-Json -Compress`;
      const output = await new Promise<string>((res, rej) => {
        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
          { windowsHide: true, timeout: 10000, maxBuffer: 64 * 1024 },
          (err, stdout) => { if (err) rej(new Error(err.message)); else res(String(stdout).trim()); });
      });
      let parsed: unknown;
      try { parsed = JSON.parse(output); } catch { parsed = output; }
      return { success: true, result: { path: keyPath, name: valueName || null, value: parsed }, error: '', durationMs: Date.now() - startedAt };
    }

    if (tool === 'registry.write') {
      const keyPath = getStringArg(args, 'path');
      const valueName = getStringArg(args, 'name');
      const value = getStringArg(args, 'value');
      const valueType = getStringArg(args, 'type') || 'String';
      if (!keyPath || !valueName) throw new Error('registry.write 需要 path 和 name');
      const psScript = `New-ItemProperty -Path '${keyPath.replace(/'/g, "''")}' -Name '${valueName.replace(/'/g, "''")}' -Value '${(value || '').replace(/'/g, "''")}' -PropertyType ${valueType} -Force | Out-Null`;
      await new Promise<void>((res, rej) => {
        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
          { windowsHide: true, timeout: 10000, maxBuffer: 64 * 1024 },
          (err) => { if (err) rej(new Error(err.message)); else res(); });
      });
      return { success: true, result: { path: keyPath, name: valueName, written: true }, error: '', durationMs: Date.now() - startedAt };
    }

    if (tool === 'registry.delete') {
      const keyPath = getStringArg(args, 'path');
      const valueName = getStringArg(args, 'name');
      if (!keyPath) throw new Error('registry.delete 需要 path');
      const psScript = valueName
        ? `Remove-ItemProperty -Path '${keyPath.replace(/'/g, "''")}' -Name '${valueName.replace(/'/g, "''")}' -Force`
        : `Remove-Item -Path '${keyPath.replace(/'/g, "''")}' -Recurse -Force`;
      await new Promise<void>((res, rej) => {
        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
          { windowsHide: true, timeout: 10000, maxBuffer: 64 * 1024 },
          (err) => { if (err) rej(new Error(err.message)); else res(); });
      });
      return { success: true, result: { path: keyPath, name: valueName || null, deleted: true }, error: '', durationMs: Date.now() - startedAt };
    }

    // ── 服务管理 ──

    if (tool === 'service.list') {
      const filterArg = getStringArg(args, 'filter') || '';
      const psScript = `Get-Service ${filterArg ? `| Where-Object { $_.Name -like '*${filterArg.replace(/'/g, "''")}*' -or $_.DisplayName -like '*${filterArg.replace(/'/g, "''")}*' }` : ''} | Select-Object -First 50 Name,DisplayName,Status,StartType | ConvertTo-Json -Compress`;
      const output = await new Promise<string>((res, rej) => {
        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
          { windowsHide: true, timeout: 15000, maxBuffer: 128 * 1024 },
          (err, stdout) => { if (err) rej(new Error(err.message)); else res(String(stdout).trim()); });
      });
      let parsed: unknown;
      try { parsed = JSON.parse(output); } catch { parsed = output; }
      return { success: true, result: { filter: filterArg || null, services: parsed }, error: '', durationMs: Date.now() - startedAt };
    }

    if (tool === 'service.start' || tool === 'service.stop' || tool === 'service.restart') {
      const name = getStringArg(args, 'name');
      if (!name) throw new Error(`${tool} 需要 name`);
      const action = tool.split('.')[1];
      const verb = action === 'start' ? 'Start' : action === 'stop' ? 'Stop' : 'Restart';
      const psScript = `${verb}-Service -Name '${name.replace(/'/g, "''")}' -Force -PassThru | Select-Object Name,Status | ConvertTo-Json -Compress`;
      const output = await new Promise<string>((res, rej) => {
        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
          { windowsHide: true, timeout: 30000, maxBuffer: 64 * 1024 },
          (err, stdout) => { if (err) rej(new Error(err.message)); else res(String(stdout).trim()); });
      });
      let parsed: unknown;
      try { parsed = JSON.parse(output); } catch { parsed = output; }
      return { success: true, result: { name, action, service: parsed }, error: '', durationMs: Date.now() - startedAt };
    }

    // ── 计划任务 ──

    if (tool === 'schedule.task.list') {
      const filterArg = getStringArg(args, 'filter') || '';
      const psScript = `Get-ScheduledTask ${filterArg ? `| Where-Object { $_.TaskName -like '*${filterArg.replace(/'/g, "''")}*' }` : ''} | Select-Object -First 50 TaskName,State,TaskPath | ConvertTo-Json -Compress`;
      const output = await new Promise<string>((res, rej) => {
        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
          { windowsHide: true, timeout: 15000, maxBuffer: 128 * 1024 },
          (err, stdout) => { if (err) rej(new Error(err.message)); else res(String(stdout).trim()); });
      });
      let parsed: unknown;
      try { parsed = JSON.parse(output); } catch { parsed = output; }
      return { success: true, result: { filter: filterArg || null, tasks: parsed }, error: '', durationMs: Date.now() - startedAt };
    }

    if (tool === 'schedule.task.create') {
      const taskName = getStringArg(args, 'name');
      const command = getStringArg(args, 'command');
      const trigger = getStringArg(args, 'trigger') || 'Once';
      const time = getStringArg(args, 'time');
      if (!taskName || !command) throw new Error('schedule.task.create 需要 name 和 command');
      const triggerPart = time ? `-Trigger (New-ScheduledTaskTrigger -${trigger} -At '${time.replace(/'/g, "''")}')` : `-Trigger (New-ScheduledTaskTrigger -${trigger} -At (Get-Date).AddMinutes(5))`;
      const psScript = `Register-ScheduledTask -TaskName '${taskName.replace(/'/g, "''")}' -Action (New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-NoProfile -Command ${command.replace(/'/g, "''")}') ${triggerPart} -Force | Select-Object TaskName,State | ConvertTo-Json -Compress`;
      const output = await new Promise<string>((res, rej) => {
        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
          { windowsHide: true, timeout: 15000, maxBuffer: 64 * 1024 },
          (err, stdout) => { if (err) rej(new Error(err.message)); else res(String(stdout).trim()); });
      });
      let parsed: unknown;
      try { parsed = JSON.parse(output); } catch { parsed = output; }
      return { success: true, result: { name: taskName, command, trigger, task: parsed }, error: '', durationMs: Date.now() - startedAt };
    }

    // ── 网络代理 / hosts ──

    if (tool === 'net.proxy') {
      const action = getStringArg(args, 'action') || 'get';
      if (action === 'get') {
        const psScript = `Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' | Select-Object ProxyEnable,ProxyServer,ProxyOverride | ConvertTo-Json -Compress`;
        const output = await new Promise<string>((res, rej) => {
          execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
            { windowsHide: true, timeout: 10000, maxBuffer: 64 * 1024 },
            (err, stdout) => { if (err) rej(new Error(err.message)); else res(String(stdout).trim()); });
        });
        let parsed: unknown;
        try { parsed = JSON.parse(output); } catch { parsed = output; }
        return { success: true, result: { action, proxy: parsed }, error: '', durationMs: Date.now() - startedAt };
      }
      const server = getStringArg(args, 'server') || '';
      const enable = action === 'set' && server;
      const psScript = `Set-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' -Name ProxyEnable -Value ${enable ? 1 : 0}; ${server ? `Set-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' -Name ProxyServer -Value '${server.replace(/'/g, "''")}'` : ''}`;
      await new Promise<void>((res, rej) => {
        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
          { windowsHide: true, timeout: 10000, maxBuffer: 64 * 1024 },
          (err) => { if (err) rej(new Error(err.message)); else res(); });
      });
      return { success: true, result: { action, server, enabled: Boolean(enable) }, error: '', durationMs: Date.now() - startedAt };
    }

    if (tool === 'net.hosts') {
      const action = getStringArg(args, 'action') || 'read';
      const hostsPath = 'C:\\Windows\\System32\\drivers\\etc\\hosts';
      if (action === 'read') {
        const content = await readFile(hostsPath, 'utf8').catch(() => '');
        return { success: true, result: { path: hostsPath, content }, error: '', durationMs: Date.now() - startedAt };
      }
      const ip = getStringArg(args, 'ip');
      const host = getStringArg(args, 'host');
      if (!ip || !host) throw new Error('net.hosts edit 需要 ip 和 host');
      const entry = `${ip} ${host}`;
      const psScript = `Add-Content -Path '${hostsPath}' -Value '${entry.replace(/'/g, "''")}' -Force`;
      await new Promise<void>((res, rej) => {
        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
          { windowsHide: true, timeout: 10000, maxBuffer: 64 * 1024 },
          (err) => { if (err) rej(new Error(err.message)); else res(); });
      });
      return { success: true, result: { action: 'add', entry, added: true }, error: '', durationMs: Date.now() - startedAt };
    }

    // ── 防火墙 / Defender ──

    if (tool === 'firewall.rules') {
      const filterArg = getStringArg(args, 'filter') || '';
      const psScript = `Get-NetFirewallRule ${filterArg ? `| Where-Object { $_.DisplayName -like '*${filterArg.replace(/'/g, "''")}*' }` : ''} | Select-Object -First 30 DisplayName,Direction,Action,Enabled | ConvertTo-Json -Compress`;
      const output = await new Promise<string>((res, rej) => {
        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
          { windowsHide: true, timeout: 15000, maxBuffer: 128 * 1024 },
          (err, stdout) => { if (err) rej(new Error(err.message)); else res(String(stdout).trim()); });
      });
      let parsed: unknown;
      try { parsed = JSON.parse(output); } catch { parsed = output; }
      return { success: true, result: { filter: filterArg || null, rules: parsed }, error: '', durationMs: Date.now() - startedAt };
    }

    if (tool === 'defender.scan') {
      const scanType = getStringArg(args, 'type') || 'QuickScan';
      const psScript = `Start-MpScan -ScanType ${scanType}`;
      await new Promise<void>((res, rej) => {
        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
          { windowsHide: true, timeout: 30000, maxBuffer: 64 * 1024 },
          (err) => { if (err) rej(new Error(err.message)); else res(); });
      });
      return { success: true, result: { scanType, initiated: true }, error: '', durationMs: Date.now() - startedAt };
    }

    // ── eIsland 设置控制 ──

    if (tool === 'island.settings.list') {
      const storeDir = resolve(app.getPath('userData'), 'eIsland_store');
      const items = await Promise.all(ISLAND_SETTINGS_REGISTRY.map(async (entry) => {
        let value: unknown = null;
        try {
          const filePath = resolve(storeDir, `${entry.key}.json`);
          if (existsSync(filePath)) {
            value = JSON.parse(await readFile(filePath, 'utf8'));
          }
        } catch { /* noop */ }
        return { key: entry.key, description: entry.description, type: entry.type, value };
      }));
      return { success: true, result: { count: items.length, settings: items }, error: '', durationMs: Date.now() - startedAt };
    }

    if (tool === 'island.settings.read') {
      const key = getStringArg(args, 'key');
      if (!key) throw new Error('island.settings.read 需要 key');
      const storeDir = resolve(app.getPath('userData'), 'eIsland_store');
      const filePath = resolve(storeDir, `${key}.json`);
      let value: unknown = null;
      if (existsSync(filePath)) {
        try { value = JSON.parse(await readFile(filePath, 'utf8')); } catch { /* noop */ }
      }
      const entry = ISLAND_SETTINGS_REGISTRY.find(e => e.key === key);
      return { success: true, result: { key, value, description: entry?.description ?? null }, error: '', durationMs: Date.now() - startedAt };
    }

    if (tool === 'island.settings.write') {
      const key = getStringArg(args, 'key');
      if (!key) throw new Error('island.settings.write 需要 key');
      const value = args.value;
      const storeDir = resolve(app.getPath('userData'), 'eIsland_store');
      await mkdir(storeDir, { recursive: true });
      const filePath = resolve(storeDir, `${key}.json`);
      await writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
      const specialChannel = ISLAND_SETTING_BROADCAST_CHANNELS[key];
      if (specialChannel) {
        broadcastSettingChange(-1, specialChannel, value);
      }
      broadcastSettingChange(-1, `store:${key}`, value);
      return { success: true, result: { key, value, written: true }, error: '', durationMs: Date.now() - startedAt };
    }

    if (tool === 'island.theme.get') {
      const storeDir = resolve(app.getPath('userData'), 'eIsland_store');
      const filePath = resolve(storeDir, 'theme-mode.json');
      let mode = 'dark';
      if (existsSync(filePath)) {
        try {
          const data = JSON.parse(await readFile(filePath, 'utf8'));
          if (data === 'dark' || data === 'light' || data === 'system') mode = data;
        } catch { /* noop */ }
      }
      return { success: true, result: { mode }, error: '', durationMs: Date.now() - startedAt };
    }

    if (tool === 'island.theme.set') {
      const mode = getStringArg(args, 'mode');
      if (!mode) throw new Error('island.theme.set 需要 mode (dark/light/system)');
      const safe = mode === 'dark' || mode === 'light' || mode === 'system' ? mode : 'dark';
      const storeDir = resolve(app.getPath('userData'), 'eIsland_store');
      await mkdir(storeDir, { recursive: true });
      const filePath = resolve(storeDir, 'theme-mode.json');
      await writeFile(filePath, JSON.stringify(safe, null, 2), 'utf8');
      broadcastSettingChange(-1, 'theme:mode', safe);
      return { success: true, result: { mode: safe, applied: true }, error: '', durationMs: Date.now() - startedAt };
    }

    if (tool === 'island.opacity.get') {
      const storeDir = resolve(app.getPath('userData'), 'eIsland_store');
      const filePath = resolve(storeDir, 'island-opacity.json');
      let opacity = 100;
      if (existsSync(filePath)) {
        try {
          const data = JSON.parse(await readFile(filePath, 'utf8'));
          if (typeof data === 'number' && Number.isFinite(data)) opacity = Math.max(10, Math.min(100, Math.round(data)));
        } catch { /* noop */ }
      }
      return { success: true, result: { opacity }, error: '', durationMs: Date.now() - startedAt };
    }

    if (tool === 'island.opacity.set') {
      const levelRaw = getNumberArg(args, 'opacity');
      if (levelRaw === null || levelRaw === undefined) throw new Error('island.opacity.set 需要 opacity (10-100)');
      const opacity = Math.max(10, Math.min(100, Math.round(levelRaw)));
      const storeDir = resolve(app.getPath('userData'), 'eIsland_store');
      await mkdir(storeDir, { recursive: true });
      const filePath = resolve(storeDir, 'island-opacity.json');
      await writeFile(filePath, JSON.stringify(opacity, null, 2), 'utf8');
      broadcastSettingChange(-1, 'island:opacity', opacity);
      return { success: true, result: { opacity, applied: true }, error: '', durationMs: Date.now() - startedAt };
    }

    if (tool === 'island.restart') {
      setTimeout(() => { app.relaunch(); app.exit(0); }, 500);
      return { success: true, result: { restarting: true }, error: '', durationMs: Date.now() - startedAt };
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

  ipcMain.handle('app:pick-skill-file', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender) ?? BrowserWindow.getFocusedWindow();
      if (!win) return null;
      const result = await dialog.showOpenDialog(win, {
        title: '选择 Skill 文件 (.md)',
        properties: ['openFile'],
        filters: [{ name: 'Markdown', extensions: ['md'] }],
      });
      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }
      return result.filePaths[0] || null;
    } catch (err) {
      console.error('[App] pick skill file error:', err);
      return null;
    }
  });

  ipcMain.handle('app:read-text-file', async (_event, filePath: string) => {
    try {
      if (!filePath || !existsSync(filePath)) return null;
      const content = await readFile(filePath, 'utf-8');
      return content;
    } catch (err) {
      console.error('[App] read text file error:', err);
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

  registerAgentIpcHandlers({
    executeAgentLocalTool,
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
