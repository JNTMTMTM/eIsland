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
 * @file splashWindow.ts
 * @description 启动画面窗口服务模块
 * @description 管理应用启动画面的创建、显示和关闭，在主窗口加载期间提供视觉反馈
 * @author 鸡哥
 */

import { BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { is } from '@electron-toolkit/utils';

let splashWindow: BrowserWindow | null = null;

/** 视频播放完成回调（跨 closeSplashWindow 调用生命周期存储） */
let videoEndedResolve: (() => void) | null = null;

/** splash 渲染层已挂载并完成 IPC 订阅的等待句柄 */
let splashReadyResolve: (() => void) | null = null;
let splashReadyPromise: Promise<void> | null = null;
let splashReadyFallbackTimer: ReturnType<typeof setTimeout> | null = null;
let splashPlaybackFallbackTimer: ReturnType<typeof setTimeout> | null = null;

/** 启动画面淡出动画时长（毫秒），需与 CSS transition 保持一致 */
const SPLASH_FADE_DURATION_MS = 300;

/** 视频播完后额外停留时间（毫秒），需与 renderer 侧 SPLASH_POST_VIDEO_DELAY_MS 保持一致 */
const SPLASH_POST_VIDEO_DELAY_MS = 1000;

/** 等待 splash 渲染层注册 IPC 的最长时间，超时后不阻塞主窗口启动 */
const SPLASH_READY_TIMEOUT_MS = 1500;

/** 启动视频播放兜底超时，避免视频资源异常时主窗口一直不显示 */
const SPLASH_PLAYBACK_TIMEOUT_MS = 5000;

function clearSplashReadyFallbackTimer(): void {
  if (splashReadyFallbackTimer) {
    clearTimeout(splashReadyFallbackTimer);
    splashReadyFallbackTimer = null;
  }
}

function clearSplashPlaybackFallbackTimer(): void {
  if (splashPlaybackFallbackTimer) {
    clearTimeout(splashPlaybackFallbackTimer);
    splashPlaybackFallbackTimer = null;
  }
}

function resolveSplashReady(): void {
  clearSplashReadyFallbackTimer();
  if (splashReadyResolve) {
    splashReadyResolve();
    splashReadyResolve = null;
  }
  splashReadyPromise = null;
}

function revealSplashWindow(): void {
  if (!splashWindow || splashWindow.isDestroyed()) return;
  splashWindow.showInactive();
  if (!splashWindow.isVisible()) {
    splashWindow.show();
  }
}

function waitForSplashReady(): Promise<void> {
  return splashReadyPromise ?? Promise.resolve();
}

/**
 * 创建并显示启动画面窗口
 * @description 创建一个无边框、居中的启动画面窗口，播放开场视频
 */
function showSplashWindow(): void {
  if (splashWindow && !splashWindow.isDestroyed()) {
    revealSplashWindow();
    resolveSplashReady();
    return;
  }

  splashReadyPromise = new Promise<void>((resolve) => {
    splashReadyResolve = resolve;
  });

  splashReadyFallbackTimer = setTimeout(() => {
    revealSplashWindow();
    resolveSplashReady();
  }, SPLASH_READY_TIMEOUT_MS);

  splashWindow = new BrowserWindow({
    width: 600,
    height: 400,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    title: '',
    hasShadow: true,
    icon: is.dev
      ? join(__dirname, '../../resources/icon/eisland_256x256.ico')
      : join(process.resourcesPath, 'icon/eisland_256x256.ico'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  splashWindow.setAlwaysOnTop(true, 'screen-saver');
  splashWindow.center();
  splashWindow.removeMenu();

  const handleVideoEnded = (): void => {
    if (videoEndedResolve) {
      videoEndedResolve();
      videoEndedResolve = null;
    }
  };

  const handleRendererReady = (): void => {
    revealSplashWindow();
    resolveSplashReady();
  };

  /** 注册一次性 IPC：renderer 完成挂载并已订阅播放指令 */
  ipcMain.once('splash:renderer-ready', handleRendererReady);

  /** 注册一次性 IPC：renderer 视频播完后通知 */
  ipcMain.once('splash:video-ended', handleVideoEnded);

  splashWindow.webContents.once('did-fail-load', () => {
    resolveSplashReady();
  });

  splashWindow.on('closed', () => {
    ipcMain.removeListener('splash:renderer-ready', handleRendererReady);
    ipcMain.removeListener('splash:video-ended', handleVideoEnded);
    clearSplashReadyFallbackTimer();
    clearSplashPlaybackFallbackTimer();
    splashWindow = null;
    videoEndedResolve = null;
    splashReadyResolve = null;
    splashReadyPromise = null;
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    splashWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/html/DynamicIslandSplash.html');
  } else {
    splashWindow.loadFile(join(__dirname, '../renderer/html/DynamicIslandSplash.html'));
  }
}

/**
 * 关闭启动画面窗口
 * @description 触发开场视频播放，等待视频播完 + 1 秒停留，然后淡出并关闭窗口。
 *   返回 Promise，在窗口完全关闭后 resolve，供主窗口等待后再显示。
 */
function closeSplashWindow(): Promise<void> {
  return new Promise<void>((resolve) => {
    if (!splashWindow || splashWindow.isDestroyed()) {
      resolve();
      return;
    }

    const win = splashWindow;
    let resolved = false;
    let closing = false;

    const resolveOnce = (): void => {
      if (resolved) return;
      resolved = true;
      resolve();
    };

    win.once('closed', resolveOnce);

    /**
     * 视频播完后的收尾流程：等待 1s → 淡出 → 关窗口
     * 可由 IPC 回调触发，也可由播放兜底超时触发
     */
    const finishAndClose = (): void => {
      if (closing) return;
      closing = true;
      clearSplashPlaybackFallbackTimer();
      setTimeout(() => {
        if (!win.isDestroyed()) {
          win.webContents.send('splash:fade-out');
        }
        setTimeout(() => {
          if (!win.isDestroyed()) {
            win.close();
          }
          resolveOnce();
        }, SPLASH_FADE_DURATION_MS);
      }, SPLASH_POST_VIDEO_DELAY_MS);
    };

    waitForSplashReady().then(() => {
      if (win.isDestroyed()) {
        resolveOnce();
        return;
      }

      revealSplashWindow();
      videoEndedResolve = finishAndClose;
      splashPlaybackFallbackTimer = setTimeout(finishAndClose, SPLASH_PLAYBACK_TIMEOUT_MS);

      /** 通知 renderer 开始播放视频 */
      win.webContents.send('splash:play-video');
    }).catch(() => {
      finishAndClose();
    });
  });
}

/**
 * 获取启动画面窗口实例
 */
function getSplashWindow(): BrowserWindow | null {
  return splashWindow;
}

export { showSplashWindow, closeSplashWindow, getSplashWindow };
