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
 * @file runningProcesses.ts
 * @description 运行进程查询模块
 * @description 查询 Windows 运行中的非系统进程，支持获取进程图标
 * @author 鸡哥
 */

import { app, nativeImage } from 'electron';
import { exec } from 'child_process';
import { activeWindow, openWindows } from 'get-windows';

const PROCESS_QUERY_TIMEOUT_MS = 4000;
const PROCESS_ICON_CACHE_MAX = 240;

const processIconCache = new Map<string, string | null>();

export interface RunningProcessInfo {
  name: string;
  iconDataUrl: string | null;
}

export interface RunningWindowInfo {
  id: string;
  title: string;
  processName: string;
  processPath: string | null;
  processId: number | null;
  iconDataUrl: string | null;
}

interface RawWindowInfo {
  id?: unknown;
  title?: unknown;
  owner?: {
    name?: unknown;
    path?: unknown;
    processId?: unknown;
  };
}

/**
 * 规范化进程名称
 * @description 将进程名称转换为小写并去除首尾空格
 * @param name - 原始进程名称
 * @returns 规范化后的进程名称
 */
export function normalizeProcessName(name: string): string {
  return name.trim().toLowerCase();
}

function normalizeWindowTitle(title: string): string {
  return title.trim().toLowerCase();
}

function normalizeProcessVariants(processName: string): string[] {
  const normalized = normalizeProcessName(processName);
  if (!normalized) return [];
  if (normalized.endsWith('.exe')) {
    return [normalized, normalized.slice(0, -4)];
  }
  return [normalized, `${normalized}.exe`];
}

function isSystemProcessName(processName: string): boolean {
  const name = normalizeProcessName(processName);
  if (!name) return true;

  if (name === 'system' || name === 'system idle process' || name === 'registry' || name === 'memory compression') {
    return true;
  }

  return [
    /^smss\.exe$/,
    /^csrss\.exe$/,
    /^wininit\.exe$/,
    /^winlogon\.exe$/,
    /^services\.exe$/,
    /^lsass\.exe$/,
    /^fontdrvhost\.exe$/,
    /^svchost\.exe$/,
    /^sihost\.exe$/,
    /^dwm\.exe$/,
    /^taskhostw\.exe$/,
    /^runtimebroker\.exe$/,
    /^startmenuexperiencehost\.exe$/,
    /^shellexperiencehost\.exe$/,
    /^searchhost\.exe$/,
  ].some((pattern) => pattern.test(name));
}

function parseTaskListProcessNames(raw: string): string[] {
  const names = new Set<string>();
  const lines = raw.split(/\r?\n/);

  lines.forEach((line) => {
    const text = line.trim();
    if (!text) return;
    const matched = text.match(/^"([^"]+)"/);
    const processName = (matched?.[1] || text.split(',')[0] || '').trim();
    if (!processName) return;
    names.add(processName);
  });

  return [...names].sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

function queryRunningProcessNames(): Promise<string[]> {
  return new Promise((resolve) => {
    exec(
      'tasklist /fo csv /nh',
      {
        windowsHide: true,
        timeout: PROCESS_QUERY_TIMEOUT_MS,
        maxBuffer: 1024 * 1024,
      },
      (err, stdout) => {
        if (err) {
          console.error('[Process] query running process failed:', err.message);
          resolve([]);
          return;
        }
        resolve(parseTaskListProcessNames(stdout));
      },
    );
  });
}

/**
 * 查询运行中的非系统进程名称列表
 * @description 获取当前运行的非系统进程名称列表
 * @returns 进程名称数组
 */
export async function queryRunningNonSystemProcessNames(): Promise<string[]> {
  const all = await queryRunningProcessNames();
  return all.filter((name) => !isSystemProcessName(name));
}

function parseRunningProcessPathMap(raw: string): Map<string, string> {
  const pathMap = new Map<string, string>();
  const text = raw.replace(/^\uFEFF/, '').trim();
  if (!text || (text[0] !== '[' && text[0] !== '{')) return pathMap;

  try {
    const parsed = JSON.parse(text);
    const rows = Array.isArray(parsed) ? parsed : [parsed];

    rows.forEach((row) => {
      if (!row || typeof row !== 'object') return;
      const nameValue = (row as { Name?: unknown }).Name;
      const pathValue = (row as { ExecutablePath?: unknown }).ExecutablePath;
      const processName = typeof nameValue === 'string' ? nameValue.trim() : '';
      const executablePath = typeof pathValue === 'string' ? pathValue.trim() : '';
      if (!processName || !executablePath) return;
      pathMap.set(normalizeProcessName(processName), executablePath);
    });
  } catch {
    return pathMap;
  }

  return pathMap;
}

function queryRunningProcessExecutablePathMap(): Promise<Map<string, string>> {
  return new Promise((resolve) => {
    const cmd =
      'powershell.exe -NoProfile -NonInteractive -Command "Get-CimInstance Win32_Process | Select-Object Name,ExecutablePath | ConvertTo-Json -Compress"';

    exec(
      cmd,
      {
        windowsHide: true,
        timeout: PROCESS_QUERY_TIMEOUT_MS,
        maxBuffer: 6 * 1024 * 1024,
      },
      (err, stdout) => {
        if (err) {
          resolve(new Map<string, string>());
          return;
        }
        resolve(parseRunningProcessPathMap(stdout));
      },
    );
  });
}

function setProcessIconCache(key: string, value: string | null): void {
  if (!processIconCache.has(key) && processIconCache.size >= PROCESS_ICON_CACHE_MAX) {
    const oldestKey = processIconCache.keys().next().value;
    if (typeof oldestKey === 'string') {
      processIconCache.delete(oldestKey);
    }
  }
  processIconCache.set(key, value);
}

async function getProcessIconDataUrl(processName: string, pathMap: Map<string, string>): Promise<string | null> {
  const normalized = normalizeProcessName(processName);
  if (!normalized) return null;

  if (processIconCache.has(normalized)) {
    return processIconCache.get(normalized) ?? null;
  }

  const executablePath = pathMap.get(normalized);
  if (!executablePath) {
    setProcessIconCache(normalized, null);
    return null;
  }

  try {
    const iconFromApi = await app.getFileIcon(executablePath, { size: 'small' });
    if (!iconFromApi.isEmpty()) {
      const dataUrl = iconFromApi.resize({ width: 16, height: 16 }).toDataURL();
      setProcessIconCache(normalized, dataUrl);
      return dataUrl;
    }
  } catch {
    // ignore and fallback
  }

  try {
    const icon = nativeImage.createFromPath(executablePath);
    if (!icon.isEmpty()) {
      const dataUrl = icon.resize({ width: 16, height: 16 }).toDataURL();
      setProcessIconCache(normalized, dataUrl);
      return dataUrl;
    }
  } catch {
    // ignore and fallback to null
  }

  setProcessIconCache(normalized, null);
  return null;
}

async function getWindowIconDataUrl(processPath: string | null, processName: string, windowTitle: string): Promise<string | null> {
  const cacheKey = normalizeProcessName(processPath || processName || windowTitle);
  if (!cacheKey) return null;

  if (processIconCache.has(cacheKey)) {
    return processIconCache.get(cacheKey) ?? null;
  }

  if (!processPath) {
    setProcessIconCache(cacheKey, null);
    return null;
  }

  try {
    const iconFromApi = await app.getFileIcon(processPath, { size: 'small' });
    if (!iconFromApi.isEmpty()) {
      const dataUrl = iconFromApi.resize({ width: 16, height: 16 }).toDataURL();
      setProcessIconCache(cacheKey, dataUrl);
      return dataUrl;
    }
  } catch {
    // ignore and fallback
  }

  try {
    const icon = nativeImage.createFromPath(processPath);
    if (!icon.isEmpty()) {
      const dataUrl = icon.resize({ width: 16, height: 16 }).toDataURL();
      setProcessIconCache(cacheKey, dataUrl);
      return dataUrl;
    }
  } catch {
    // ignore and fallback to null
  }

  setProcessIconCache(cacheKey, null);
  return null;
}

function toRunningWindowInfo(windowInfo: RawWindowInfo, iconDataUrl: string | null): RunningWindowInfo | null {
  const title = typeof windowInfo.title === 'string' ? windowInfo.title.trim() : '';
  if (!title) return null;

  const processName = typeof windowInfo.owner?.name === 'string' ? windowInfo.owner.name.trim() : '';
  const processPath = typeof windowInfo.owner?.path === 'string' ? windowInfo.owner.path.trim() : '';
  const processIdRaw = windowInfo.owner?.processId;
  const processId = typeof processIdRaw === 'number' && Number.isFinite(processIdRaw) ? processIdRaw : null;

  return {
    id: String(windowInfo.id ?? `${title}-${processName}-${processId ?? '0'}`),
    title,
    processName,
    processPath: processPath || null,
    processId,
    iconDataUrl,
  };
}

/**
 * 查询运行中的非系统进程（包含图标）
 * @description 获取当前运行的非系统进程信息，包括进程图标
 * @returns 进程信息数组，包含名称和图标数据
 */
export async function queryRunningNonSystemProcessesWithIcons(): Promise<RunningProcessInfo[]> {
  const names = await queryRunningNonSystemProcessNames();
  if (!names.length) return [];

  const pathMap = await queryRunningProcessExecutablePathMap();
  const items = await Promise.all(
    names.map(async (name) => ({
      name,
      iconDataUrl: await getProcessIconDataUrl(name, pathMap),
    })),
  );

  return items;
}

/**
 * 查询当前打开的窗口（包含图标）
 * @description 获取当前系统可见窗口列表，返回窗口标题和所属进程信息
 * @returns 窗口信息数组
 */
export async function queryOpenWindowsWithIcons(): Promise<RunningWindowInfo[]> {
  if (process.platform !== 'win32') return [];

  let windows: RawWindowInfo[] = [];
  try {
    const list = await openWindows();
    windows = Array.isArray(list) ? list as RawWindowInfo[] : [];
  } catch (err) {
    console.error('[Window] query open windows failed:', err);
    return [];
  }

  const items = await Promise.all(
    windows.map(async (windowInfo) => {
      const title = typeof windowInfo.title === 'string' ? windowInfo.title.trim() : '';
      if (!title) return null;
      const processName = typeof windowInfo.owner?.name === 'string' ? windowInfo.owner.name.trim() : '';
      const processPath = typeof windowInfo.owner?.path === 'string' ? windowInfo.owner.path.trim() : '';
      const iconDataUrl = await getWindowIconDataUrl(processPath || null, processName, title);
      return toRunningWindowInfo(windowInfo, iconDataUrl);
    }),
  );

  return items
    .filter((item): item is RunningWindowInfo => Boolean(item && item.title))
    .sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
}

/**
 * 查询当前前台焦点窗口
 * @description 获取当前处于焦点状态的窗口信息
 * @returns 焦点窗口信息，未命中时返回 null
 */
export async function queryFocusedWindow(): Promise<RunningWindowInfo | null> {
  if (process.platform !== 'win32') return null;

  try {
    const focused = await activeWindow();
    if (!focused) return null;

    const rawInfo = focused as unknown as RawWindowInfo;
    const title = typeof rawInfo.title === 'string' ? rawInfo.title.trim() : '';
    if (!title) return null;

    const processName = typeof rawInfo.owner?.name === 'string' ? rawInfo.owner.name.trim() : '';
    const processPath = typeof rawInfo.owner?.path === 'string' ? rawInfo.owner.path.trim() : '';
    const iconDataUrl = await getWindowIconDataUrl(processPath || null, processName, title);
    return toRunningWindowInfo(rawInfo, iconDataUrl);
  } catch (err) {
    console.error('[Window] query focused window failed:', err);
    return null;
  }
}

/**
 * 检查焦点窗口进程名是否命中名单
 * @description 仅当名单中的进程名与当前焦点窗口进程名精确匹配时返回 true
 * @param processNames - 需要匹配的进程名列表
 * @returns 是否命中焦点窗口进程
 */
export async function hasAnyFocusedWindowTitle(processNames: string[]): Promise<boolean> {
  if (!processNames.length) return false;

  const focusedWindow = await queryFocusedWindow();
  if (!focusedWindow?.processName) return false;

  const targetSet = new Set<string>();
  processNames.forEach((name) => {
    normalizeProcessVariants(name).forEach((variant) => {
      if (variant) targetSet.add(variant);
    });
  });
  if (!targetSet.size) return false;

  const focusedVariants = normalizeProcessVariants(focusedWindow.processName);
  return focusedVariants.some((variant) => targetSet.has(variant));
}

/**
 * 检查是否有指定进程正在运行
 * @description 检查给定进程名称列表中是否有任意进程正在运行
 * @param names - 要检查的进程名称数组
 * @returns 是否有进程正在运行
 */
export async function hasAnyRunningProcess(names: string[]): Promise<boolean> {
  if (!names.length) return false;

  const running = await queryRunningProcessNames();
  const runningSet = new Set(running.map(normalizeProcessName));
  return names.some((name) => runningSet.has(normalizeProcessName(name)));
}

/**
 * 清理进程名称列表
 * @description 去除重复项和空项，返回规范化后的进程名称列表
 * @param list - 原始进程名称数组
 * @returns 清理后的进程名称数组
 */
export function sanitizeProcessNameList(list: string[]): string[] {
  const normalizedSet = new Set<string>();
  const sanitized: string[] = [];

  list.forEach((item) => {
    const text = item.trim();
    if (!text) return;
    const key = normalizeProcessName(text);
    if (normalizedSet.has(key)) return;
    normalizedSet.add(key);
    sanitized.push(text);
  });

  return sanitized;
}

/**
 * 清理窗口标题名单
 * @description 去除重复项和空项，返回清理后的窗口标题列表
 * @param list - 原始窗口标题数组
 * @returns 清理后的窗口标题数组
 */
export function sanitizeWindowTitleList(list: string[]): string[] {
  const normalizedSet = new Set<string>();
  const sanitized: string[] = [];

  list.forEach((item) => {
    const text = item.trim();
    if (!text) return;
    const key = normalizeWindowTitle(text);
    if (normalizedSet.has(key)) return;
    normalizedSet.add(key);
    sanitized.push(text);
  });

  return sanitized;
}
