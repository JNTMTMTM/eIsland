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
 * @file capture.ts
 * @description 截图相关 IPC 处理模块
 * @description 处理截图、保存和复制到剪贴板等 IPC 请求
 * @author 鸡哥
 */

import { app, clipboard, desktopCapturer, dialog, ipcMain, nativeImage, type BrowserWindow } from 'electron';
import { join } from 'path';
import { writeFileSync } from 'fs';
import { capturePrimaryDisplayPng } from '../../window/screenshotHelper';
import { translateCaptureImage } from '../../services/imageTranslationService';

interface RegisterCaptureIpcHandlersOptions {
  getCaptureWindow: () => BrowserWindow | null;
  closeCaptureWindow: () => void;
  startRegionScreenshot: () => Promise<void>;
}

/**
 * 注册截图相关 IPC 处理器
 * @description 注册截图、保存、取消等 IPC 事件处理器
 * @param options - 配置选项，包含获取和关闭截图窗口的函数
 */
export function registerCaptureIpcHandlers(options: RegisterCaptureIpcHandlersOptions): void {
  ipcMain.handle('system:screenshot:region:start', async () => {
    try {
      await options.startRegionScreenshot();
      return true;
    } catch (err) {
      console.error('[System] start region screenshot error:', err);
      return false;
    }
  });

  ipcMain.handle('system:screenshot', async () => {
    try {
      const nativeScreenshot = capturePrimaryDisplayPng();
      if (nativeScreenshot) {
        return nativeScreenshot.toString('base64');
      }

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

  ipcMain.on('capture-complete', (_event, { dataURL }: { dataURL: string }) => {
    try {
      const image = nativeImage.createFromDataURL(dataURL);
      clipboard.writeImage(image);
    } catch (err) {
      console.error('[Screenshot] copy error:', err);
    }
    options.closeCaptureWindow();
  });

  ipcMain.handle('capture-translate', async (event, payload: {
    dataURL: string;
    token: string;
    sourceLanguage: string;
    targetLanguage: string;
  }) => {
    const captureWindow = options.getCaptureWindow();
    if (!captureWindow || captureWindow.isDestroyed() || event.sender.id !== captureWindow.webContents.id) {
      return { success: false, code: 'captureWindowClosed' };
    }

    const controller = new AbortController();
    const abort = (): void => controller.abort();
    event.sender.once('destroyed', abort);
    try {
      return await translateCaptureImage(
        typeof payload?.token === 'string' ? payload.token : '',
        typeof payload?.dataURL === 'string' ? payload.dataURL : '',
        typeof payload?.sourceLanguage === 'string' && payload.sourceLanguage ? payload.sourceLanguage : 'auto',
        typeof payload?.targetLanguage === 'string' && payload.targetLanguage ? payload.targetLanguage : 'zh',
        controller.signal,
      );
    } finally {
      event.sender.removeListener('destroyed', abort);
    }
  });

  ipcMain.on('capture-save', async (_event, { dataURL }: { dataURL: string }) => {
    const captureWindow = options.getCaptureWindow();
    if (captureWindow && !captureWindow.isDestroyed()) {
      captureWindow.hide();
    }
    try {
      const image = nativeImage.createFromDataURL(dataURL);
      const pngBuffer = image.toPNG();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const result = await dialog.showSaveDialog({
        title: '保存截图',
        defaultPath: join(app.getPath('pictures'), `eIsland_screenshot_${timestamp}.png`),
        filters: [{ name: 'PNG', extensions: ['png'] }],
      });
      if (!result.canceled && result.filePath) {
        writeFileSync(result.filePath, pngBuffer);
      }
    } catch (err) {
      console.error('[Screenshot] save error:', err);
    }
    options.closeCaptureWindow();
  });

  ipcMain.on('capture-cancel', () => {
    options.closeCaptureWindow();
  });
}
