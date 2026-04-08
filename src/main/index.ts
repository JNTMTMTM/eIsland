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
 * @file index.ts
 * @description Electron 主进程入口，负责任务栏窗口创建、透明窗口配置及系统级交互
 * @author 鸡哥
 */

import { app, BrowserWindow, shell, screen, ipcMain, desktopCapturer, dialog, globalShortcut } from 'electron';
import { join, basename } from 'path';
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'fs';
import { exec } from 'child_process';
import { Worker } from 'worker_threads';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { createTray, destroyTray } from './tray';

/** 防止 Electron 创建多个实例 */
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

/** SMTC Worker 线程引用 */
let smtcWorker: Worker | null = null;

/** 灵动岛尺寸常量 */
const ISLAND_WIDTH = 260;
const ISLAND_HEIGHT = 42;
const EXPANDED_WIDTH = 500;
const EXPANDED_HEIGHT = 60;
const NOTIFICATION_WIDTH = 500;
const NOTIFICATION_HEIGHT = 88;
const LYRICS_WIDTH = 500;
const LYRICS_HEIGHT = 42;
/** 单击展开后的完整面板尺寸 */
const EXPANDED_FULL_WIDTH = 860;
const EXPANDED_FULL_HEIGHT = 150;
/** 设置面板尺寸 */
const SETTINGS_WIDTH = 860;
const SETTINGS_HEIGHT = 400;

/** 播放程序白名单默认值 */
const DEFAULT_WHITELIST = ['QQMusic.exe', 'cloudmusic.exe', '汽水音乐', 'kugou'];

/** 白名单存储键名 */
const WHITELIST_STORE_KEY = 'music-whitelist';

/** 歌词源存储键名 */
const LYRICS_SOURCE_STORE_KEY = 'lyrics-source';

/** 运行时白名单（可被用户修改） */
let nowPlayingWhitelist: string[] = [...DEFAULT_WHITELIST];

/** 记录当前生效的设备ID（仅白名单内程序） */
let currentDeviceId: string = nowPlayingWhitelist[0] || '';

/**
 * 检查当前设备ID是否在白名单内
 */
function isWhitelisted(): boolean {
  return nowPlayingWhitelist.some(name => currentDeviceId.includes(name));
}

/**
 * 读取持久化的白名单配置
 * @returns 白名单数组
 */
function readWhitelistConfig(): string[] {
  try {
    const storeDir = join(app.getPath('userData'), 'eIsland_store');
    const filePath = join(storeDir, `${WHITELIST_STORE_KEY}.json`);
    if (!existsSync(filePath)) return DEFAULT_WHITELIST;
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : DEFAULT_WHITELIST;
  } catch {
    return DEFAULT_WHITELIST;
  }
}

/**
 * 读取持久化的歌词源配置
 * @returns 歌词源标识字符串
 */
function readLyricsSourceConfig(): string {
  try {
    const storeDir = join(app.getPath('userData'), 'eIsland_store');
    const filePath = join(storeDir, `${LYRICS_SOURCE_STORE_KEY}.json`);
    if (!existsSync(filePath)) return 'lrclib-first';
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return typeof data === 'string' ? data : 'lrclib-first';
  } catch {
    return 'lrclib-first';
  }
}

/** 当前注册的隐藏快捷键 */
let currentHideHotkey: string = '';

/** 隐藏快捷键存储键名 */
const HOTKEY_STORE_KEY = 'hide-hotkey';

/** 默认隐藏快捷键 */
const DEFAULT_HIDE_HOTKEY = 'Alt+X';

/**
 * 读取快捷键配置
 * @returns 存储的快捷键字符串，不存在时返回默认值
 */
function readHotkeyConfig(): string {
  try {
    const storeDir = join(app.getPath('userData'), 'eIsland_store');
    const filePath = join(storeDir, `${HOTKEY_STORE_KEY}.json`);
    if (!existsSync(filePath)) return DEFAULT_HIDE_HOTKEY;
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return typeof data === 'string' ? data : DEFAULT_HIDE_HOTKEY;
  } catch {
    return DEFAULT_HIDE_HOTKEY;
  }
}

/**
 * 注册隐藏灵动岛的全局快捷键
 * @param accelerator - Electron accelerator 字符串（如 "Alt+X"）
 */
function registerHideHotkey(accelerator: string): boolean {
  // 先注销旧快捷键
  const previousHotkey = currentHideHotkey || readHotkeyConfig();
  if (previousHotkey) {
    try { globalShortcut.unregister(previousHotkey); } catch { /* ignore */ }
  }
  currentHideHotkey = '';
  if (!accelerator) return true;
  try {
    const success = globalShortcut.register(accelerator, () => {
      if (!mainWindow) return;
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
      }
    });
    if (success) {
      currentHideHotkey = accelerator;
    }
    return success;
  } catch (err) {
    console.error('[Hotkey] register error:', err);
    return false;
  }
}

/** 当前注册的关闭快捷键 */
let currentQuitHotkey: string = '';

/** 关闭快捷键存储键名 */
const QUIT_HOTKEY_STORE_KEY = 'quit-hotkey';

/** 默认关闭快捷键（空表示默认不设置） */
const DEFAULT_QUIT_HOTKEY = 'Alt+C';

/**
 * 读取关闭快捷键配置
 * @returns 存储的快捷键字符串，不存在时返回默认值
 */
function readQuitHotkeyConfig(): string {
  try {
    const storeDir = join(app.getPath('userData'), 'eIsland_store');
    const filePath = join(storeDir, `${QUIT_HOTKEY_STORE_KEY}.json`);
    if (!existsSync(filePath)) return DEFAULT_QUIT_HOTKEY;
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return typeof data === 'string' ? data : DEFAULT_QUIT_HOTKEY;
  } catch {
    return DEFAULT_QUIT_HOTKEY;
  }
}

/**
 * 注册关闭灵动岛的全局快捷键
 * @param accelerator - Electron accelerator 字符串（如 "Alt+Q"）
 */
function registerQuitHotkey(accelerator: string): boolean {
  // 先注销旧快捷键
  if (currentQuitHotkey) {
    try { globalShortcut.unregister(currentQuitHotkey); } catch { /* ignore */ }
    currentQuitHotkey = '';
  }
  if (!accelerator) return true;
  try {
    const success = globalShortcut.register(accelerator, () => {
      app.quit();
    });
    if (success) {
      currentQuitHotkey = accelerator;
    }
    return success;
  } catch (err) {
    console.error('[QuitHotkey] register error:', err);
    return false;
  }
}

/** 暂停所有灵动岛相关快捷键响应（仅解绑，不修改配置） */
function suspendIslandHotkeys(): void {
  const hideHotkey = currentHideHotkey || readHotkeyConfig();
  const quitHotkey = currentQuitHotkey || readQuitHotkeyConfig();
  if (hideHotkey) {
    try { globalShortcut.unregister(hideHotkey); } catch { /* ignore */ }
  }
  if (quitHotkey) {
    try { globalShortcut.unregister(quitHotkey); } catch { /* ignore */ }
  }
}

/** 恢复所有灵动岛相关快捷键响应（按当前配置重新注册） */
function resumeIslandHotkeys(): void {
  const hideHotkey = currentHideHotkey || readHotkeyConfig();
  const quitHotkey = currentQuitHotkey || readQuitHotkeyConfig();
  if (hideHotkey) registerHideHotkey(hideHotkey);
  if (quitHotkey) registerQuitHotkey(quitHotkey);
}

/** 记录窗口初始中心 X 坐标 */
let initialCenterX = 0;

/** 计算灵动岛默认窗口边界（主屏工作区顶部居中） */
function getInitialIslandBounds(): Electron.Rectangle {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;
  const { x: workX, y: workY } = primaryDisplay.workArea;
  const x = Math.round(workX + (screenWidth - ISLAND_WIDTH) / 2);
  const y = Math.round(workY);
  return {
    x,
    y,
    width: ISLAND_WIDTH,
    height: ISLAND_HEIGHT,
  };
}

/**
 * 创建 Electron BrowserWindow 实例，配置透明无边框灵动岛窗口
 * @description 窗口固定尺寸、始终置顶、跳过任务栏，并初始化鼠标穿透行为
 */
function createWindow(): void {
  const initialBounds = getInitialIslandBounds();

  /** 计算初始中心 X 坐标，用于展开/收缩时保持居中 */
  initialCenterX = initialBounds.x + ISLAND_WIDTH / 2;

  mainWindow = new BrowserWindow({
    width: ISLAND_WIDTH,
    height: ISLAND_HEIGHT,
    x: initialBounds.x,
    y: initialBounds.y,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      enableWebSQL: false,
      v8CacheOptions: 'bypassHeatCheck'
    }
  });

  /**
   * 初始化：透明像素区域设为可穿透，使鼠标事件传递到下层窗口
   * forward: true 仍转发鼠标事件，但不会阻塞（实际由渲染进程按需控制）
   */
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  /** 使用最高级别置顶，确保不被全屏应用或其他置顶窗口覆盖 */
  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  // 某些 Windows 版本/打包环境下，首次显示前可能回退到系统默认居中，显式重置一次边界
  mainWindow.setBounds(initialBounds, false);

  mainWindow.on('ready-to-show', () => {
    // 再次确保首次展示位置稳定在主屏顶部居中
    mainWindow?.setBounds(initialBounds, false);
    mainWindow?.show();
    mainWindow?.setAlwaysOnTop(true, 'screen-saver');
  });

  /**
   * 窗口失焦时强制背景重绘，防止 Windows DWM 缓存白色回退背景
   */
  mainWindow.on('blur', () => {
    if (mainWindow) {
      mainWindow.setBackgroundColor('#00000000');
      mainWindow.webContents.executeJavaScript(`
        document.body.style.background = 'transparent';
        document.documentElement.style.background = 'transparent';
      `);
    }
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

/**
 * 通过 PowerShell P/Invoke 向系统发送媒体虚拟按键
 * 使用 -EncodedCommand 传递 Base64(UTF-16LE) 编码脚本，避免内联引号转义问题
 * @param vkCode - Windows 虚拟键代码（VK_MEDIA_*）
 */
function sendMediaVirtualKey(vkCode: number): void {
  const script = [
    'Add-Type -TypeDefinition @"',
    'using System;',
    'using System.Runtime.InteropServices;',
    'public class MediaKey {',
    '    [DllImport("user32.dll")]',
    '    public static extern void keybd_event(byte vk, byte scan, uint flags, IntPtr extra);',
    '}',
    '"@',
    `[MediaKey]::keybd_event(${vkCode}, 0, 0, [IntPtr]::Zero)`,
    `[MediaKey]::keybd_event(${vkCode}, 0, 2, [IntPtr]::Zero)`,
  ].join('\n');
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  exec(`powershell.exe -NonInteractive -NoProfile -EncodedCommand ${encoded}`, (err) => {
    if (err) console.error('[Media] virtual key error:', err.message);
  });
}

/** 注册 IPC 处理器，供渲染进程动态切换鼠标穿透状态及调整窗口大小 */
function registerIpcHandlers(): void {
  ipcMain.on('window:enable-mouse-passthrough', () => {
    if (mainWindow) {
      mainWindow.setIgnoreMouseEvents(true, { forward: true });
    }
  });

  ipcMain.on('window:disable-mouse-passthrough', () => {
    if (mainWindow) {
      mainWindow.setIgnoreMouseEvents(false);
    }
  });

  /**
   * 展开窗口 - 基于初始中心点，向两边均匀扩展
   * @description 窗口宽度从 180px 扩展到 320px，高度从 42px 扩展到 120px
   */
  ipcMain.on('window:expand', () => {
    if (mainWindow) {
      mainWindow.setBounds({
        x: Math.round(initialCenterX - EXPANDED_WIDTH / 2),
        y: mainWindow.getBounds().y,
        width: EXPANDED_WIDTH,
        height: EXPANDED_HEIGHT
      });
    }
  });

  /**
   * 展开通知窗口 - 使用通知专用尺寸
   * @description 宽度 500，高度 88，基于初始中心点左右均匀扩展
   */
  ipcMain.on('window:expand-notification', () => {
    if (mainWindow) {
      mainWindow.setBounds({
        x: Math.round(initialCenterX - NOTIFICATION_WIDTH / 2),
        y: mainWindow.getBounds().y,
        width: NOTIFICATION_WIDTH,
        height: NOTIFICATION_HEIGHT
      });
    }
  });

  /**
   * 展开歌词窗口 - 宽度 500，高度与 idle 一致（42）
   */
  ipcMain.on('window:expand-lyrics', () => {
    if (mainWindow) {
      mainWindow.setBounds({
        x: Math.round(initialCenterX - LYRICS_WIDTH / 2),
        y: mainWindow.getBounds().y,
        width: LYRICS_WIDTH,
        height: LYRICS_HEIGHT
      });
    }
  });

  /**
   * 完整展开窗口 - 单击灵动岛后展开为完整操作面板
   * @description 窗口从 hover 尺寸扩展到 560x200，基于初始中心点左右均匀扩展
   */
  ipcMain.on('window:expand-full', () => {
    if (mainWindow) {
      mainWindow.setBounds({
        x: Math.round(initialCenterX - EXPANDED_FULL_WIDTH / 2),
        y: mainWindow.getBounds().y,
        width: EXPANDED_FULL_WIDTH,
        height: EXPANDED_FULL_HEIGHT
      });
    }
  });

  /**
   * 展开设置面板 - 比 expanded 更大的独立设置界面
   * @description 窗口扩展到 860x400，基于初始中心点左右均匀扩展
   */
  ipcMain.on('window:expand-settings', () => {
    if (mainWindow) {
      mainWindow.setBounds({
        x: Math.round(initialCenterX - SETTINGS_WIDTH / 2),
        y: mainWindow.getBounds().y,
        width: SETTINGS_WIDTH,
        height: SETTINGS_HEIGHT
      });
    }
  });

  /**
   * 收缩窗口 - 基于初始中心点，收缩回原始尺寸
   * @description 窗口恢复到 180x42 的 idle 状态
   */
  ipcMain.on('window:collapse', () => {
    if (mainWindow) {
      mainWindow.setBounds({
        x: Math.round(initialCenterX - ISLAND_WIDTH / 2),
        y: mainWindow.getBounds().y,
        width: ISLAND_WIDTH,
        height: ISLAND_HEIGHT
      });
    }
  });

  /**
   * 隐藏窗口
   */
  ipcMain.on('window:hide', () => {
    if (mainWindow) {
      mainWindow.hide();
    }
  });

  /**
   * 获取鼠标当前位置（屏幕坐标）
   * @returns 包含 x、y 坐标的对象
   */
  ipcMain.handle('window:get-mouse-position', () => {
    const point = screen.getCursorScreenPoint();
    return { x: point.x, y: point.y };
  });

  /**
   * 获取窗口边界信息
   * @returns 窗口边界对象，包含 x、y、width、height
   */
  ipcMain.handle('window:get-bounds', () => {
    if (mainWindow) {
      return mainWindow.getBounds();
    }
    return null;
  });

  /**
   * 退出应用
   */
  ipcMain.on('app:quit', () => {
    app.quit();
  });

  // ===== 音乐媒体控制 IPC 处理器 =====
  ipcMain.handle('media:play-pause', () => {
    if (!isWhitelisted()) return;
    sendMediaVirtualKey(0xB3);
  });

  ipcMain.handle('media:next', () => {
    if (!isWhitelisted()) return;
    sendMediaVirtualKey(0xB0);
  });

  ipcMain.handle('media:prev', () => {
    if (!isWhitelisted()) return;
    sendMediaVirtualKey(0xB1);
  });

  /**
   * 跳转到指定播放位置（SMTC 不支持，保留接口兼容性）
   * @param _event - IPC 事件
   * @param _positionMs - 目标位置（毫秒，暂未实现）
   */
  ipcMain.handle('media:seek', (_event, _positionMs: number) => {
    // SMTCMonitor 暂不支持 seek 操作
  });

  /**
   * 获取系统音量（固定返回 0.5，SMTC 不提供音量查询接口）
   */
  ipcMain.handle('media:get-volume', () => 0.5);

  /**
   * 设置系统音量（SMTC 不支持，保留接口兼容性）
   * @param _event - IPC 事件
   * @param _volume - 目标音量（0.0 ~ 1.0，暂未实现）
   */
  ipcMain.handle('media:set-volume', (_event, _volume: number) => {
    // SMTCMonitor 暂不支持设置音量
  });

  /** 截图并返回 base64（PNG） */
  ipcMain.handle('system:screenshot', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 },
      });
      if (sources.length > 0) {
        const screenshot = sources[0].thumbnail.toPNG();
        return screenshot.toString('base64');
      }
    } catch (err) {
      console.error('[System] screenshot error:', err);
    }
    return null;
  });

  /** 打开任务管理器 */
  ipcMain.on('system:open-task-manager', () => {
    try {
      if (process.platform === 'win32') {
        require('child_process').exec('taskmgr');
      }
    } catch (err) {
      console.error('[System] open-task-manager error:', err);
    }
  });

  /** 获取文件图标（base64 PNG） */
  ipcMain.handle('app:get-file-icon', async (_event, filePath: string) => {
    try {
      let iconPath = filePath;
      // .lnk 文件先解析目标，从目标获取图标
      if (process.platform === 'win32' && filePath.toLowerCase().endsWith('.lnk')) {
        try {
          const result = shell.readShortcutLink(filePath);
          if (result.target) iconPath = result.target;
        } catch { /* 解析失败则用原路径 */ }
      }
      const icon = await app.getFileIcon(iconPath, { size: 'large' });
      return icon.toPNG().toString('base64');
    } catch (err) {
      console.error('[App] get-file-icon error:', err);
      return null;
    }
  });

  /** 打开文件/应用 */
  ipcMain.handle('app:open-file', async (_event, filePath: string) => {
    try {
      await shell.openPath(filePath);
      return true;
    } catch (err) {
      console.error('[App] open-file error:', err);
      return false;
    }
  });

  /** 解析快捷方式 (.lnk) 的目标路径 */
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

  // ===== 文件选择对话框 IPC =====
  ipcMain.handle('dialog:open-image', async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      title: '选择图片',
      filters: [{ name: '图片', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'] }],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const filePath = result.filePaths[0];
    try {
      const ext = filePath.split('.').pop()?.toLowerCase() || 'png';
      const mimeMap: Record<string, string> = {
        jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
        gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml',
      };
      const mime = mimeMap[ext] || 'image/png';
      const buf = readFileSync(filePath);
      return `data:${mime};base64,${buf.toString('base64')}`;
    } catch {
      return null;
    }
  });

  const logDir = join(app.getPath('userData'), 'logs');
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }

  const writeMainLog = (level: 'info' | 'warn' | 'error', message: string): void => {
    try {
      const now = new Date();
      const date = now.toISOString().slice(0, 10);
      const time = now.toISOString().slice(11, 23);
      const line = `[${date} ${time}] [${level.toUpperCase()}] ${message}\n`;
      const logFile = join(logDir, `${date}.log`);
      appendFileSync(logFile, line, 'utf-8');
    } catch {
      /* 日志写入失败不影响主流程 */
    }
  };

  // ===== HTTP 代理 IPC（绕过 CORS） =====
  ipcMain.handle('net:fetch', async (_event, url: string, options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
  }) => {
    const method = options?.method || 'GET';
    const headers = options?.headers || {};
    const body = options?.body;
    const allowsBody = method.toUpperCase() !== 'GET' && method.toUpperCase() !== 'HEAD';
    const timeoutMs = typeof options?.timeoutMs === 'number' ? options?.timeoutMs : 10000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    writeMainLog('info', `[Net] request ${JSON.stringify({ method, url, headers, body: body ?? '', timeoutMs })}`);
    try {
      const { net } = require('electron');
      const fetchOptions: {
        method: string;
        headers: Record<string, string>;
        signal: AbortSignal;
        body?: string;
      } = {
        method,
        headers,
        signal: controller.signal,
      };
      if (allowsBody && typeof body === 'string') {
        fetchOptions.body = body;
      }
      const resp = await net.fetch(url, fetchOptions);
      const text = await resp.text();
      writeMainLog('info', `[Net] response ${JSON.stringify({ method, url, status: resp.status, ok: resp.ok, body: text })}`);
      return { ok: resp.ok, status: resp.status, body: text };
    } catch (err) {
      if (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') {
        writeMainLog('warn', `[Net] timeout ${JSON.stringify({ method, url, headers, body: body ?? '', timeoutMs })}`);
        return { ok: false, status: 408, body: 'timeout' };
      }
      console.error('[Net] fetch proxy error:', err);
      writeMainLog('error', `[Net] error ${JSON.stringify({ method, url, headers, body: body ?? '', timeoutMs, error: String(err) })}`);
      return { ok: false, status: 0, body: '' };
    } finally {
      clearTimeout(timeout);
    }
  });

  // ===== 文件存储 IPC =====
  const storeDir = join(app.getPath('userData'), 'eIsland_store');
  if (!existsSync(storeDir)) {
    mkdirSync(storeDir, { recursive: true });
  }

  /**
   * 读取 JSON 文件
   * @param _event - IPC 事件
   * @param key - 存储键名（对应文件名）
   * @returns 解析后的数据，不存在时返回 null
   */
  ipcMain.handle('store:read', (_event, key: string) => {
    try {
      const filePath = join(storeDir, `${key}.json`);
      if (!existsSync(filePath)) return null;
      const raw = readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      console.error(`[Store] read '${key}' error:`, err);
      return null;
    }
  });

  /**
   * 写入 JSON 文件
   * @param _event - IPC 事件
   * @param key - 存储键名（对应文件名）
   * @param data - 要存储的数据
   * @returns 是否写入成功
   */
  ipcMain.handle('store:write', (_event, key: string, data: unknown) => {
    try {
      const filePath = join(storeDir, `${key}.json`);
      writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error(`[Store] write '${key}' error:`, err);
      return false;
    }
  });

  // ===== 日志文件 IPC =====
  /**
   * 写入日志到文件
   * @param _event - IPC 事件
   * @param level - 日志级别（info/warn/error）
   * @param message - 日志内容
   */
  ipcMain.on('log:write', (_event, level: string, message: string) => {
    writeMainLog(level === 'warn' ? 'warn' : level === 'error' ? 'error' : 'info', message);
  });

  // ===== 歌曲设置 IPC =====

  /**
   * 获取当前播放器白名单
   * @returns 白名单数组
   */
  ipcMain.handle('music:whitelist:get', () => {
    return nowPlayingWhitelist;
  });

  /**
   * 设置播放器白名单并持久化
   * @param _event - IPC 事件
   * @param list - 新的白名单数组
   * @returns 是否保存成功
   */
  ipcMain.handle('music:whitelist:set', (_event, list: string[]) => {
    try {
      nowPlayingWhitelist = list;
      const filePath = join(storeDir, `${WHITELIST_STORE_KEY}.json`);
      writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('[Whitelist] persist error:', err);
      return false;
    }
  });

  /**
   * 获取歌词源配置
   * @returns 歌词源标识字符串
   */
  ipcMain.handle('music:lyrics-source:get', () => {
    return readLyricsSourceConfig();
  });

  /**
   * 设置歌词源并持久化
   * @param _event - IPC 事件
   * @param source - 歌词源标识
   * @returns 是否保存成功
   */
  ipcMain.handle('music:lyrics-source:set', (_event, source: string) => {
    try {
      const filePath = join(storeDir, `${LYRICS_SOURCE_STORE_KEY}.json`);
      writeFileSync(filePath, JSON.stringify(source, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('[LyricsSource] persist error:', err);
      return false;
    }
  });

  /**
   * 运行 test.tsx 脚本，获取当前播放进程 sourceAppId
   * @returns 获取结果（成功时返回 sourceAppId，失败时返回 null）
   */
  ipcMain.handle('music:detect-source-app-id', async () => {
    const appPath = app.getAppPath();
    const scriptPath = join(appPath, 'test.tsx');
    const command = `npx tsx "${scriptPath}"`;

    const result = await new Promise<{ ok: boolean; sourceAppId: string | null; message: string }>((resolve) => {
      exec(command, { cwd: appPath }, (error, stdout, stderr) => {
        if (error) {
          console.error('[Music] detect source app id failed:', error, stderr);
          resolve({ ok: false, sourceAppId: null, message: '获取失败：脚本执行失败' });
          return;
        }

        const output = String(stdout ?? '').trim();
        if (!output || output === 'null') {
          resolve({ ok: false, sourceAppId: null, message: '获取失败：当前无播放程序' });
          return;
        }

        const sourceAppIdMatch = output.match(/sourceAppId:\s*'([^']+)'/);
        if (sourceAppIdMatch?.[1]) {
          resolve({ ok: true, sourceAppId: sourceAppIdMatch[1], message: '获取成功' });
          return;
        }

        resolve({ ok: false, sourceAppId: null, message: '获取失败：未解析到 sourceAppId' });
      });
    });

    return result;
  });

  // ===== 快捷键 IPC =====

  /**
   * 获取当前隐藏快捷键配置
   * @returns 当前快捷键字符串
   */
  ipcMain.handle('hotkey:get', () => {
    return currentHideHotkey || readHotkeyConfig();
  });

  /**
   * 设置隐藏快捷键并持久化
   * @param _event - IPC 事件
   * @param accelerator - 新的快捷键字符串
   * @returns 是否注册成功
   */
  ipcMain.handle('hotkey:set', (_event, accelerator: string) => {
    const currentQuit = currentQuitHotkey || readQuitHotkeyConfig();
    if (accelerator && currentQuit && accelerator === currentQuit) {
      return false;
    }
    const success = registerHideHotkey(accelerator);
    if (success) {
      // 持久化到 store
      const filePath = join(storeDir, `${HOTKEY_STORE_KEY}.json`);
      try {
        writeFileSync(filePath, JSON.stringify(accelerator, null, 2), 'utf-8');
      } catch (err) {
        console.error('[Hotkey] persist error:', err);
      }
    }
    return success;
  });

  // ===== 关闭快捷键 IPC =====

  /**
   * 获取当前关闭快捷键配置
   * @returns 当前快捷键字符串
   */
  ipcMain.handle('quit-hotkey:get', () => {
    return currentQuitHotkey || readQuitHotkeyConfig();
  });

  /**
   * 设置关闭快捷键并持久化
   * @param _event - IPC 事件
   * @param accelerator - 新的快捷键字符串
   * @returns 是否注册成功
   */
  ipcMain.handle('quit-hotkey:set', (_event, accelerator: string) => {
    const currentHide = currentHideHotkey || readHotkeyConfig();
    if (accelerator && currentHide && accelerator === currentHide) {
      return false;
    }
    const success = registerQuitHotkey(accelerator);
    if (success) {
      const filePath = join(storeDir, `${QUIT_HOTKEY_STORE_KEY}.json`);
      try {
        writeFileSync(filePath, JSON.stringify(accelerator, null, 2), 'utf-8');
      } catch (err) {
        console.error('[QuitHotkey] persist error:', err);
      }
    }
    return success;
  });

  /** 录入快捷键时暂停所有快捷键响应 */
  ipcMain.handle('hotkey:suspend', () => {
    suspendIslandHotkeys();
    return true;
  });

  /** 录入结束后恢复快捷键响应 */
  ipcMain.handle('hotkey:resume', () => {
    resumeIslandHotkeys();
    return true;
  });
}

/**
 * 初始化 SMTC Worker 线程，监听系统媒体信息变更并推送到渲染进程
 * @param win - 主窗口引用
 */
function initSmtcWorker(win: BrowserWindow | null): void {
  try {
    interface SessionRuntimeEntry {
      payload: {
        title: string;
        artist: string;
        album: string;
        duration_ms: number;
        position_ms: number;
        isPlaying: boolean;
        thumbnail: string | null;
        canFastForward: boolean;
        canSkip: boolean;
        canLike: boolean;
        canChangeVolume: boolean;
        canSetOutput: boolean;
        deviceId: string;
      };
      hasTitle: boolean;
      isPlaying: boolean;
      playStartedAt: number;
    }

    const sessionRuntime = new Map<string, SessionRuntimeEntry>();

    const pickFirstComePlayingSource = (): string => {
      let selectedSourceId = '';
      let earliestStart = Number.POSITIVE_INFINITY;

      sessionRuntime.forEach((entry, sourceId) => {
        if (!entry.hasTitle || !entry.isPlaying || entry.playStartedAt <= 0) return;
        if (entry.playStartedAt < earliestStart) {
          earliestStart = entry.playStartedAt;
          selectedSourceId = sourceId;
        }
      });

      return selectedSourceId;
    };

    const emitCurrentSession = (): void => {
      if (!win || win.isDestroyed()) return;
      const currentEntry = currentDeviceId ? sessionRuntime.get(currentDeviceId) : undefined;
      if (currentEntry?.hasTitle) {
        win.webContents.send('nowplaying:info', currentEntry.payload);
      } else {
        win.webContents.send('nowplaying:info', null);
      }
    };

    const workerPath = join(__dirname, 'smtcWorker.js');
    smtcWorker = new Worker(workerPath);

    smtcWorker.on('message', (msg: {
      type: string;
      sourceAppId?: string;
      session?: {
        media: { title: string; artist: string; albumTitle: string; thumbnail: string | null } | null;
        playback: { playbackStatus: number; playbackType: number } | null;
        timeline: { position: number; duration: number } | null;
      };
    }) => {
      if (!win || win.isDestroyed()) return;

      if (msg.type === 'session-removed') {
        if (msg.sourceAppId) {
          sessionRuntime.delete(msg.sourceAppId);
        }
        if (msg.sourceAppId === currentDeviceId) {
          currentDeviceId = pickFirstComePlayingSource();
          emitCurrentSession();
        }
        return;
      }

      if (msg.type !== 'session-update') return;

      const { sourceAppId = '', session } = msg;
      const { media, playback, timeline } = session ?? {};

      if (!nowPlayingWhitelist.some(name => sourceAppId.includes(name))) return;

      const hasTitle = Boolean(media?.title);
      const isPlaying = (playback?.playbackStatus ?? 0) === 4;

      const payload = {
        title: media?.title ?? '',
        artist: media?.artist ?? '',
        album: media?.albumTitle ?? '',
        duration_ms: Math.round((timeline?.duration ?? 0) * 1000),
        position_ms: Math.round((timeline?.position ?? 0) * 1000),
        isPlaying,
        thumbnail: media?.thumbnail ?? null,
        canFastForward: false,
        canSkip: false,
        canLike: false,
        canChangeVolume: false,
        canSetOutput: false,
        deviceId: sourceAppId,
      };

      const prevEntry = sessionRuntime.get(sourceAppId);
      let playStartedAt = prevEntry?.playStartedAt ?? 0;
      if (isPlaying) {
        if (!prevEntry?.isPlaying || playStartedAt <= 0) {
          playStartedAt = Date.now();
        }
      } else {
        playStartedAt = 0;
      }

      sessionRuntime.set(sourceAppId, {
        payload,
        hasTitle,
        isPlaying,
        playStartedAt,
      });

      const currentEntry = currentDeviceId ? sessionRuntime.get(currentDeviceId) : undefined;

      if (currentEntry?.isPlaying) {
        if (sourceAppId === currentDeviceId) {
          emitCurrentSession();
        }
        return;
      }

      const nextPlayingSourceId = pickFirstComePlayingSource();
      if (nextPlayingSourceId) {
        currentDeviceId = nextPlayingSourceId;
        emitCurrentSession();
        return;
      }

      if (currentEntry?.hasTitle) {
        if (sourceAppId === currentDeviceId) {
          emitCurrentSession();
        }
        return;
      }

      if (hasTitle) {
        currentDeviceId = sourceAppId;
        emitCurrentSession();
        return;
      }

      if (sourceAppId === currentDeviceId) {
        currentDeviceId = '';
      }
      emitCurrentSession();
    });

    smtcWorker.on('error', (err) => {
      console.error('[SMTC] Worker error:', err);
    });

    smtcWorker.on('exit', (code) => {
      if (code !== 0) console.error('[SMTC] Worker exited with code:', code);
    });
  } catch (err) {
    console.error('[SMTC] Worker init error:', err);
  }
}

/**
 * 终止 SMTC Worker 线程并释放资源
 */
function cleanupSmtcWorker(): void {
  if (smtcWorker) {
    smtcWorker.terminate();
    smtcWorker = null;
  }
}

/**
 * Chromium 性能优化：禁用不需要的内核功能以降低内存和 CPU 占用
 * @description 必须在 app.whenReady() 之前调用
 */
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-features',
  [
    'SpareRendererForSitePerProcess',
    'HardwareMediaKeyHandling',
    'MediaSessionService',
    'WebRtcHideLocalIpsWithMdns',
    'CalculateNativeWinOcclusion',
    'WinRetrieveSuggestionsOnlyOnDemand',
  ].join(',')
);
app.commandLine.appendSwitch('enable-features', 'BackForwardCache');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-speech-api');
app.commandLine.appendSwitch('disable-print-preview');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('disable-breakpad');
app.commandLine.appendSwitch('disable-domain-reliability');
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=128 --lite-mode');
app.commandLine.appendSwitch('disable-dev-shm-usage');

/** 单实例锁回调 */
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

/**
 * 应用就绪入口，初始化窗口、注册 IPC 处理器并响应 macOS dock 点击重建窗口
 */
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.eisland.app');

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  createWindow();
  createTray(mainWindow);

  initSmtcWorker(mainWindow);

  registerIpcHandlers();

  // 读取持久化白名单
  nowPlayingWhitelist = readWhitelistConfig();

  // 读取持久化快捷键并注册
  const savedHotkey = readHotkeyConfig();
  registerHideHotkey(savedHotkey);

  // 读取持久化关闭快捷键并注册
  const savedQuitHotkey = readQuitHotkeyConfig();
  if (savedQuitHotkey) registerQuitHotkey(savedQuitHotkey);

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  cleanupSmtcWorker();
  destroyTray();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
