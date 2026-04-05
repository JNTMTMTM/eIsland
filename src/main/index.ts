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

import { app, BrowserWindow, shell, screen, ipcMain, desktopCapturer, dialog } from 'electron';
import { join, basename } from 'path';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { createTray, destroyTray } from './tray';
import { NowPlaying } from 'node-nowplaying';

/** 防止 Electron 创建多个实例 */
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

/** NowPlaying 局部实例引用 */
let nowPlaying: NowPlaying | null = null;

/** 灵动岛尺寸常量 */
const ISLAND_WIDTH = 260;
const ISLAND_HEIGHT = 42;
const EXPANDED_WIDTH = 500;
const EXPANDED_HEIGHT = 60;
/** 单击展开后的完整面板尺寸 */
const EXPANDED_FULL_WIDTH = 860;
const EXPANDED_FULL_HEIGHT = 150;
/** 设置面板尺寸 */
const SETTINGS_WIDTH = 860;
const SETTINGS_HEIGHT = 400;

/** 播放程序白名单 - 只有在白名单中的程序才会执行歌曲相关操作 */
const NOW_PLAYING_WHITELIST = [
    'QQMusic.exe',
    'cloudmusic.exe',
    '汽水音乐',
    'kugou'
];

/** 记录当前生效的设备ID（仅白名单内程序） */
let currentDeviceId: string = NOW_PLAYING_WHITELIST[0] || '';

/**
 * 检查当前设备ID是否在白名单内
 */
function isWhitelisted(): boolean {
  return NOW_PLAYING_WHITELIST.some(name => currentDeviceId.includes(name));
}

/** 记录窗口初始中心 X 坐标 */
let initialCenterX = 0;

/**
 * 创建 Electron BrowserWindow 实例，配置透明无边框灵动岛窗口
 * @description 窗口固定尺寸、始终置顶、跳过任务栏，并初始化鼠标穿透行为
 */
function createWindow(): void {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;
  const { x: workX, y: workY } = primaryDisplay.workArea;

  /** 计算初始中心 X 坐标，用于展开/收缩时保持居中 */
  initialCenterX = workX + (screenWidth - ISLAND_WIDTH) / 2 + ISLAND_WIDTH / 2;

  mainWindow = new BrowserWindow({
    width: ISLAND_WIDTH,
    height: ISLAND_HEIGHT,
    x: workX + (screenWidth - ISLAND_WIDTH) / 2,
    y: workY,
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

  mainWindow.on('ready-to-show', () => {
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

  // ===== 音乐相关 IPC 处理器 =====
  ipcMain.handle('media:play-pause', async () => {
    if (!isWhitelisted()) return;
    try {
      await nowPlaying?.playPause(currentDeviceId);
    } catch (err) {
      console.error('[Media] playPause error:', err);
    }
  });

  ipcMain.handle('media:next', async () => {
    if (!isWhitelisted()) return;
    try {
      await nowPlaying?.nextTrack(currentDeviceId);
    } catch (err) {
      console.error('[Media] nextTrack error:', err);
    }
  });

  ipcMain.handle('media:prev', async () => {
    if (!isWhitelisted()) return;
    try {
      await nowPlaying?.previousTrack(currentDeviceId);
    } catch (err) {
      console.error('[Media] previousTrack error:', err);
    }
  });

  /**
   * 跳转到指定播放位置
   * @param _event - IPC 事件
   * @param positionMs - 目标位置（毫秒）
   */
  ipcMain.handle('media:seek', async (_event, positionMs: number) => {
    if (!isWhitelisted()) return;
    try {
      await nowPlaying?.seekTo(positionMs, currentDeviceId);
    } catch (err) {
      console.error('[Media] seekTo error:', err);
    }
  });

  ipcMain.handle('media:get-volume', async () => {
    if (!isWhitelisted()) return 0.5;
    try {
      await nowPlaying?.setVolume(0, currentDeviceId); // 查询当前音量
    // node-nowplaying 不支持查询当前音量，忽略错误并返回默认值
    } catch {
      // ignore
    }
    return Promise.resolve(0.5);
  });

  /**
   * 设置系统音量
   * @param _event - IPC 事件
   * @param volume - 目标音量（0.0 ~ 1.0）
   */
  ipcMain.handle('media:set-volume', async (_event, volume: number) => {
    if (!isWhitelisted()) return;
    try {
      await nowPlaying?.setVolume(volume, currentDeviceId);
    } catch (err) {
      console.error('[Media] setVolume error:', err);
    }
  });

  // ===== node-nowplaying 歌曲信息监听 =====

  /** 截图并保存 */
  ipcMain.handle('system:screenshot', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: screen.getPrimaryDisplay().workAreaSize
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

  // ===== HTTP 代理 IPC（绕过 CORS） =====
  ipcMain.handle('net:fetch', async (_event, url: string, options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }) => {
    try {
      const { net } = require('electron');
      const resp = await net.fetch(url, {
        method: options?.method || 'GET',
        headers: options?.headers,
        body: options?.body,
      });
      const text = await resp.text();
      return { ok: resp.ok, status: resp.status, body: text };
    } catch (err) {
      console.error('[Net] fetch proxy error:', err);
      return { ok: false, status: 0, body: '' };
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
}

/**
 * 初始化 node-nowplaying 监听歌曲信息
 * @description 通过 NowPlaying 订阅系统媒体信息变更，实时推送到渲染进程
 */
function initNowPlaying(mainWindow: BrowserWindow | null): void {
  try {
    nowPlaying = new NowPlaying((info) => {
      if (!mainWindow || mainWindow.isDestroyed()) {
        return;
      }

      if (!info || !info.trackName) {
        mainWindow.webContents.send('nowplaying:info', null);
        return;
      }

      const deviceId = info.deviceId || '';

      if (!NOW_PLAYING_WHITELIST.some(name => deviceId.includes(name))) {
        return;
      }

      // 更新当前激活的设备ID
      currentDeviceId = deviceId;

      const payload = {
        title: info.trackName || '',
        artist: Array.isArray(info.artist) ? info.artist.join(', ') : (info.artist || ''),
        album: info.album || '',
        duration_ms: info.trackDuration || 0,
        position_ms: info.trackProgress || 0,
        isPlaying: info.isPlaying || false,
        thumbnail: info.thumbnail || null,
        canFastForward: info.canFastForward || false,
        canSkip: info.canSkip || false,
        canLike: info.canLike || false,
        canChangeVolume: info.canChangeVolume || false,
        canSetOutput: info.canSetOutput || false,
        deviceId: deviceId,
      };
      mainWindow.webContents.send('nowplaying:info', payload);
    });

    nowPlaying.subscribe()
      .then(() => {
        // 订阅成功
      })
      .catch((err) => {
        console.error('[NowPlaying] subscribe error:', err);
      });
  } catch (err) {
    console.error('[NowPlaying] init error:', err);
  }
}

/**
 * 清理 node-nowplaying 资源
 * @description 应用退出时调用，释放实例
 */
function cleanupNowPlaying(): void {
  nowPlaying = null;
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

  // 初始化 node-nowplaying 必须在 IPC 处理器之前，确保 nowPlaying 已就绪
  initNowPlaying(mainWindow);

  registerIpcHandlers();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  cleanupNowPlaying();
  destroyTray();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
