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
 * @file formatFactory.ts
 * @description 格式工厂视频轨道提取 IPC 处理模块
 *              通过 ffmpeg（系统 PATH）完成：
 *              - 从视频文件中提取音轨（-vn）或视频轨（-an）
 *              - 输出到源文件同目录，文件名后缀标注轨道类型
 *              无 ffmpeg 时返回失败信息
 * @author 鸡哥
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */

import { BrowserWindow, dialog, ipcMain } from 'electron';
import { spawn } from 'child_process';
import { existsSync, statSync } from 'fs';
import { basename, dirname, extname, join } from 'path';
import { getFfmpegBinary } from '../../utils/ffmpegPath';
import type { ExtractVideoTrackOptions, ExtractVideoTrackResult } from './types';

/**
 * 执行 ffmpeg 命令
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */
function runFfmpeg(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(getFfmpegBinary(), args, { windowsHide: true });
    } catch (err) {
      reject(err);
      return;
    }
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', (err) => {
      reject(err);
    });
    child.on('close', (code) => {
      resolve({ code: code ?? -1, stdout, stderr });
    });
  });
}

/**
 * 注册格式工厂 IPC 处理器
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */
export function registerFormatFactoryIpcHandlers(): void {
  /**
   * format-factory:pick-video
   * @description 选择视频文件对话框
   */
  ipcMain.handle('format-factory:pick-video', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender) ?? BrowserWindow.getFocusedWindow();
      if (!win) return null;
      const result = await dialog.showOpenDialog(win, {
        title: '选择视频文件',
        filters: [
          {
            name: 'Video',
            extensions: [
              'mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'ts', 'mts',
              'm4v', '3gp', 'mpg', 'mpeg', 'vob', 'ogv', 'rm', 'rmvb',
            ],
          },
          { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openFile'],
      });
      if (result.canceled || result.filePaths.length === 0) return null;
      const filePath = result.filePaths[0] || null;
      if (!filePath) return null;
      let fileSize: number | null = null;
      try {
        fileSize = statSync(filePath).size;
      } catch { /* ignore */ }
      return { filePath, fileSize };
    } catch (err) {
      console.error('[FormatFactory] pick-video error:', err);
      return null;
    }
  });

  /**
   * format-factory:extract-track
   * @description 提取视频文件的音轨或视频轨
   */
  ipcMain.handle('format-factory:extract-track', async (event, options: ExtractVideoTrackOptions): Promise<ExtractVideoTrackResult> => {
    if (!options || typeof options !== 'object') {
      return { success: false, error: 'invalid options' };
    }
    const { filePath, trackType, outputFormat } = options;
    if (!filePath || typeof filePath !== 'string' || !existsSync(filePath)) {
      return { success: false, error: 'source file not found' };
    }
    if (trackType !== 'audio' && trackType !== 'video') {
      return { success: false, error: 'invalid track type' };
    }
    if (!outputFormat || typeof outputFormat !== 'string') {
      return { success: false, error: 'invalid output format' };
    }

    const win = BrowserWindow.fromWebContents(event.sender) ?? BrowserWindow.getFocusedWindow();
    if (!win) return { success: false, error: 'no window' };

    const sourceBase = basename(filePath, extname(filePath));
    const suffix = trackType === 'audio' ? 'audio' : 'video';
    const defaultName = `${sourceBase}_${suffix}.${outputFormat}`;
    const saveResult = await dialog.showSaveDialog(win, {
      title: trackType === 'audio' ? '保存提取的音轨' : '保存提取的视频轨',
      defaultPath: join(dirname(filePath), defaultName),
      filters: [
        { name: outputFormat.toUpperCase(), extensions: [outputFormat] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (saveResult.canceled || !saveResult.filePath) {
      return { success: false, error: 'canceled' };
    }
    const outputPath = saveResult.filePath;

    try {
      const args: string[] = [
        '-y',
        '-hide_banner',
        '-i', filePath,
      ];

      if (trackType === 'audio') {
        // 提取音轨：去掉视频流
        args.push('-vn');
        // 根据输出格式选择编码器
        switch (outputFormat) {
          case 'mp3':
            args.push('-c:a', 'libmp3lame', '-q:a', '0');
            break;
          case 'aac':
            args.push('-c:a', 'aac', '-b:a', '320k');
            break;
          case 'wav':
            args.push('-c:a', 'pcm_s16le');
            break;
          case 'flac':
            args.push('-c:a', 'flac');
            break;
          case 'ogg':
            args.push('-c:a', 'libvorbis', '-q:a', '6');
            break;
          default:
            args.push('-c:a', 'copy');
        }
      } else {
        // 提取视频轨：去掉音频流
        args.push('-an');
        switch (outputFormat) {
          case 'mp4':
            args.push('-c:v', 'copy', '-movflags', '+faststart');
            break;
          case 'mkv':
            args.push('-c:v', 'copy');
            break;
          case 'avi':
            args.push('-c:v', 'copy');
            break;
          case 'webm':
            args.push('-c:v', 'copy');
            break;
          default:
            args.push('-c:v', 'copy');
        }
      }

      args.push(outputPath);

      const result = await runFfmpeg(args);
      if (result.code !== 0 || !existsSync(outputPath)) {
        const errMsg = result.stderr?.split('\n').filter((l) => l.trim()).pop() ?? 'ffmpeg exited with non-zero code';
        return { success: false, error: errMsg };
      }

      let fileSize: number | undefined;
      try {
        fileSize = statSync(outputPath).size;
      } catch { /* ignore */ }

      return { success: true, outputPath, fileSize };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('ENOENT')) {
        return { success: false, error: 'ffmpeg not found. Please install ffmpeg and add it to your PATH.' };
      }
      return { success: false, error: message };
    }
  });
}
