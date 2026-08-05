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
 * @file captureWindow.ts
 * @description 截图窗口服务模块
 * @description 管理截图窗口的创建、屏幕捕获和区域选择功能
 * @author 鸡哥
 */

import { app, BrowserWindow, desktopCapturer, screen } from 'electron';
import { join } from 'path';
import { existsSync } from 'fs';
import { is } from '@electron-toolkit/utils';
import { capturePrimaryDisplayPng, captureAllDisplaysPng, getVisibleWindows } from './screenshotHelper';
import { readScreenshotEngineConfig } from '../config/storeConfig';

interface CreateCaptureWindowServiceOptions {
  getMainWindow: () => BrowserWindow | null;
}

interface CaptureWindowService {
  getCaptureWindow: () => BrowserWindow | null;
  closeCaptureWindow: () => void;
  startRegionScreenshot: () => Promise<void>;
}

/**
 * 创建截图窗口服务
 * @description 初始化并返回截图窗口管理服务，支持区域截图功能
 * @param options - 服务配置选项，包含主窗口获取函数
 * @returns 截图窗口服务对象
 */
export function createCaptureWindowService(options: CreateCaptureWindowServiceOptions): CaptureWindowService {
  let captureWindow: BrowserWindow | null = null;
  let isStartingCaptureWindow = false;

  function getCaptureHtmlPath(): string {
    if (is.dev) {
      const candidates = [
        join(process.cwd(), 'resources', 'capture.html'),
        join(app.getAppPath(), 'resources', 'capture.html'),
        join(__dirname, '../../../resources/capture.html'),
      ];

      return candidates.find((c) => existsSync(c)) ?? candidates[0];
    }
    return join(process.resourcesPath, 'capture.html');
  }

  function closeCaptureWindow(): void {
    if (captureWindow && !captureWindow.isDestroyed()) {
      captureWindow.close();
    }
  }

  async function waitForMainWindowHidden(timeoutMs: number = 80): Promise<void> {
    const targetWindow = options.getMainWindow();
    if (!targetWindow || targetWindow.isDestroyed() || !targetWindow.isVisible()) {
      return;
    }

    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (!targetWindow.isDestroyed()) {
          targetWindow.removeListener('hide', finish);
        }
        resolve();
      };

      targetWindow.once('hide', finish);
      targetWindow.hide();
      setTimeout(finish, timeoutMs);
    });
  }

  /**
   * 计算所有显示器合并后的虚拟屏幕边界
   * @description 遍历全部显示器，返回包含所有屏幕的最小矩形和最大缩放因子
   */
  function getVirtualScreenBounds(): { x: number; y: number; width: number; height: number; scaleFactor: number } {
    const displays = screen.getAllDisplays();
    if (displays.length <= 1) {
      const primary = screen.getPrimaryDisplay();
      return {
        x: primary.bounds.x,
        y: primary.bounds.y,
        width: primary.size.width,
        height: primary.size.height,
        scaleFactor: primary.scaleFactor || 1,
      };
    }

    const { minX, minY, maxX, maxY, maxScale } = displays.reduce(
      (acc, d) => {
        const b = d.bounds;
        return {
          minX: Math.min(acc.minX, b.x),
          minY: Math.min(acc.minY, b.y),
          maxX: Math.max(acc.maxX, b.x + b.width),
          maxY: Math.max(acc.maxY, b.y + b.height),
          maxScale: Math.max(acc.maxScale, d.scaleFactor || 1),
        };
      },
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity, maxScale: 1 },
    );

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      scaleFactor: maxScale,
    };
  }

  interface DisplayLayout {
    id: number;
    bounds: Electron.Rectangle;
    physicalBounds: Electron.Rectangle;
    scaleFactor: number;
  }

  /**
   * 获取所有显示器的布局信息
   * @returns 显示器布局数组与合并后的物理屏幕边界
   */
  function getDisplayLayouts(): { displayLayouts: DisplayLayout[]; physicalScreen: { x: number; y: number; width: number; height: number } } {
    const displays = screen.getAllDisplays();
    const displayLayouts = displays.map((display) => ({
      id: display.id,
      bounds: display.bounds,
      physicalBounds: screen.dipToScreenRect(null, display.bounds),
      scaleFactor: display.scaleFactor,
    }));
    const physicalScreen = displayLayouts.reduce(
      (bounds, display) => ({
        x: Math.min(bounds.x, display.physicalBounds.x),
        y: Math.min(bounds.y, display.physicalBounds.y),
        right: Math.max(bounds.right, display.physicalBounds.x + display.physicalBounds.width),
        bottom: Math.max(bounds.bottom, display.physicalBounds.y + display.physicalBounds.height),
      }),
      { x: Infinity, y: Infinity, right: -Infinity, bottom: -Infinity },
    );

    return {
      displayLayouts,
      physicalScreen: {
        x: physicalScreen.x,
        y: physicalScreen.y,
        width: physicalScreen.right - physicalScreen.x,
        height: physicalScreen.bottom - physicalScreen.y,
      },
    };
  }

  interface CaptureResult {
    imageBytes: Buffer;
    captureSource: 'plugin' | 'js';
    winBounds: { x: number; y: number; width: number; height: number };
    virtualScreen: { x: number; y: number; width: number; height: number };
    scaleFactor: number;
  }

  /**
   * 尝试截取屏幕图像，优先使用原生插件，回退到 JS 方案
   * @param vs - 虚拟屏幕边界
   * @param isMultiMonitor - 是否为多显示器环境
   * @returns 截图结果，JS 回退失败时返回 null
   */
  async function tryCaptureScreenshot(vs: ReturnType<typeof getVirtualScreenBounds>, isMultiMonitor: boolean): Promise<CaptureResult | null> {
    const enginePref = readScreenshotEngineConfig();
    let nativeScreenshot: Buffer | null = null;

    if (enginePref === 'plugin') {
      nativeScreenshot = isMultiMonitor ? captureAllDisplaysPng() : null;
      if (!nativeScreenshot) {
        nativeScreenshot = capturePrimaryDisplayPng();
      }
    }

    if (nativeScreenshot) {
      return {
        imageBytes: nativeScreenshot,
        captureSource: 'plugin',
        winBounds: { x: vs.x, y: vs.y, width: vs.width, height: vs.height },
        virtualScreen: { x: vs.x, y: vs.y, width: vs.width, height: vs.height },
        scaleFactor: vs.scaleFactor,
      };
    }

    /** JS 回退：仅覆盖主显示器 */
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: sw, height: sh } = primaryDisplay.size;
    const sf = primaryDisplay.scaleFactor || 1;
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: Math.round(sw * sf), height: Math.round(sh * sf) },
    });
    if (!sources || sources.length === 0) {
      return null;
    }

    return {
      imageBytes: sources[0].thumbnail.toPNG(),
      captureSource: 'js',
      winBounds: { x: primaryDisplay.bounds.x, y: primaryDisplay.bounds.y, width: sw, height: sh },
      virtualScreen: { x: primaryDisplay.bounds.x, y: primaryDisplay.bounds.y, width: sw, height: sh },
      scaleFactor: sf,
    };
  }

  async function startRegionScreenshot(): Promise<void> {
    if (captureWindow || isStartingCaptureWindow) return;
    isStartingCaptureWindow = true;

    try {
      const vs = getVirtualScreenBounds();
      const isMultiMonitor = screen.getAllDisplays().length > 1;
      const { displayLayouts, physicalScreen } = getDisplayLayouts();

      await waitForMainWindowHidden();

      const visibleWindows = getVisibleWindows();
      const capture = await tryCaptureScreenshot(vs, isMultiMonitor);

      if (!capture) {
        closeCaptureWindow();
        const mainWindow = options.getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.setAlwaysOnTop(true, 'screen-saver');
        }
        return;
      }

      const { imageBytes, captureSource, winBounds, virtualScreen, scaleFactor } = capture;

      captureWindow = new BrowserWindow({
        width: winBounds.width,
        height: winBounds.height,
        x: winBounds.x,
        y: winBounds.y,
        show: false,
        opacity: 0,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        resizable: false,
        movable: false,
        hasShadow: false,
        skipTaskbar: true,
        backgroundColor: '#00000000',
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
        },
      });

      /** Windows 会在 BrowserWindow 构造阶段将超大无边框窗口限制到单屏工作区，显式重设边界才能覆盖虚拟桌面。 */
      captureWindow.setBounds(winBounds);
      captureWindow.setAlwaysOnTop(true, 'screen-saver');
      captureWindow.setIgnoreMouseEvents(true);
      captureWindow.showInactive();

      captureWindow.on('closed', () => {
        captureWindow = null;
        const mainWindow = options.getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.setAlwaysOnTop(true, 'screen-saver');
        }
      });

      const pageLoadPromise = captureWindow.loadFile(getCaptureHtmlPath());
      await pageLoadPromise;

      if (captureWindow && !captureWindow.isDestroyed()) {
        captureWindow.webContents.send('capture-image', {
          imageBytes,
          virtualScreen,
          displays: captureSource === 'plugin' ? displayLayouts : [],
          physicalScreen: captureSource === 'plugin' ? physicalScreen : null,
          scaleFactor,
          captureSource,
          visibleWindows,
        });
        captureWindow.setIgnoreMouseEvents(false);
        captureWindow.setOpacity(1);
        captureWindow.focus();
      }
    } catch (err) {
      console.error('[Screenshot] start error:', err);
      if (captureWindow && !captureWindow.isDestroyed()) {
        captureWindow.destroy();
      }
      captureWindow = null;
      const mainWindow = options.getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
      }
    } finally {
      isStartingCaptureWindow = false;
    }
  }

  return {
    getCaptureWindow: () => captureWindow,
    closeCaptureWindow,
    startRegionScreenshot,
  };
}
