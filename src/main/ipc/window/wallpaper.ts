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
 * @file wallpaper.ts
 * @description 壁纸相关 IPC 处理模块
 * @description 处理壁纸选择、加载和缓存清理的 IPC 请求
 * @author 鸡哥
 */

import { app, BrowserWindow, dialog, ipcMain, net } from 'electron';
import { execFile } from 'child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';

const DESKTOP_SYNC_FILE_BASENAME = 'desktop-sync-wallpaper';

function inferImageExtFromContentType(contentType: string | null): string {
  if (!contentType) return 'jpg';
  const lower = contentType.toLowerCase();
  if (lower.includes('image/png')) return 'png';
  if (lower.includes('image/webp')) return 'webp';
  if (lower.includes('image/bmp')) return 'bmp';
  if (lower.includes('image/gif')) return 'gif';
  return 'jpg';
}

function decodeDataUrl(dataUrl: string): { ext: string; data: Buffer } | null {
  const matched = dataUrl.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!matched) return null;
  const rawExt = matched[1].toLowerCase();
  const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
  try {
    const data = Buffer.from(matched[2], 'base64');
    if (data.length === 0) return null;
    return { ext, data };
  } catch {
    return null;
  }
}

async function resolveDesktopWallpaperImagePath(
  wallpaperCacheDir: string,
  sourcePath: string | null,
  previewUrl: string | null,
): Promise<string | null> {
  const source = typeof sourcePath === 'string' ? sourcePath.trim() : '';
  if (source && existsSync(source)) return source;

  const preview = typeof previewUrl === 'string' ? previewUrl.trim() : '';
  if (!preview) return null;

  if (preview.startsWith('data:image/')) {
    const decoded = decodeDataUrl(preview);
    if (!decoded) return null;
    if (!existsSync(wallpaperCacheDir)) mkdirSync(wallpaperCacheDir, { recursive: true });
    const filePath = join(wallpaperCacheDir, `${DESKTOP_SYNC_FILE_BASENAME}.${decoded.ext}`);
    writeFileSync(filePath, decoded.data);
    return filePath;
  }

  if (preview.startsWith('file://')) {
    try {
      const filePath = fileURLToPath(preview);
      if (existsSync(filePath)) return filePath;
    } catch {
      return null;
    }
    return null;
  }

  const isHttp = preview.startsWith('http://') || preview.startsWith('https://');
  if (isHttp) {
    try {
      const response = await net.fetch(preview);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength <= 0) return null;
      if (!existsSync(wallpaperCacheDir)) mkdirSync(wallpaperCacheDir, { recursive: true });
      const urlExt = extname(new URL(preview).pathname).replace('.', '').toLowerCase();
      const contentType = response.headers.get('content-type');
      const ext = urlExt || inferImageExtFromContentType(contentType);
      const filePath = join(wallpaperCacheDir, `${DESKTOP_SYNC_FILE_BASENAME}.${ext}`);
      writeFileSync(filePath, Buffer.from(arrayBuffer));
      return filePath;
    } catch {
      return null;
    }
  }

  if (preview.startsWith('/')) {
    const rendererUrl = process.env.ELECTRON_RENDERER_URL;
    if (rendererUrl && (rendererUrl.startsWith('http://') || rendererUrl.startsWith('https://'))) {
      try {
        const normalized = `${rendererUrl.replace(/\/$/, '')}${preview}`;
        const response = await net.fetch(normalized);
        if (!response.ok) return null;
        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength <= 0) return null;
        if (!existsSync(wallpaperCacheDir)) mkdirSync(wallpaperCacheDir, { recursive: true });
        const ext = extname(preview).replace('.', '').toLowerCase() || inferImageExtFromContentType(response.headers.get('content-type'));
        const filePath = join(wallpaperCacheDir, `${DESKTOP_SYNC_FILE_BASENAME}.${ext}`);
        writeFileSync(filePath, Buffer.from(arrayBuffer));
        return filePath;
      } catch {
        return null;
      }
    }
  }

  return existsSync(preview) ? preview : null;
}

function setWindowsDesktopWallpaper(imagePath: string): Promise<boolean> {
  if (process.platform !== 'win32') return Promise.resolve(false);
  if (!imagePath || !existsSync(imagePath)) return Promise.resolve(false);
  const escapedPath = imagePath.replace(/'/g, "''");
  const command = `$sig='[DllImport(\"user32.dll\", SetLastError=true)] public static extern bool SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);'; Add-Type -MemberDefinition $sig -Name Win32Wall -Namespace Native -ErrorAction SilentlyContinue; [Native.Win32Wall]::SystemParametersInfo(20, 0, '${escapedPath}', 3)`;
  return new Promise((resolve) => {
    execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], { windowsHide: true }, (error, stdout) => {
      if (error) {
        resolve(false);
        return;
      }
      resolve(String(stdout).trim().toLowerCase().includes('true'));
    });
  });
}

function createSolidBlackBmpBuffer(): Buffer {
  return Buffer.from([
    0x42, 0x4d, 0x3a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x36, 0x00,
    0x00, 0x00, 0x28, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00,
    0x00, 0x00, 0x01, 0x00, 0x18, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x00,
    0x00, 0x00, 0x13, 0x0b, 0x00, 0x00, 0x13, 0x0b, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
  ]);
}

function clearWindowsDesktopWallpaper(wallpaperCacheDir: string): Promise<boolean> {
  if (process.platform !== 'win32') return Promise.resolve(false);
  try {
    if (!existsSync(wallpaperCacheDir)) mkdirSync(wallpaperCacheDir, { recursive: true });
    const blackWallpaperPath = join(wallpaperCacheDir, `${DESKTOP_SYNC_FILE_BASENAME}-black.bmp`);
    writeFileSync(blackWallpaperPath, createSolidBlackBmpBuffer());
    return setWindowsDesktopWallpaper(blackWallpaperPath);
  } catch {
    return Promise.resolve(false);
  }
}

/**
 * 注册壁纸相关 IPC 处理器
 * @description 注册壁纸选择、加载和缓存清理的 IPC 事件处理器
 */
export function registerWallpaperIpcHandlers(): void {
  const wallpaperCacheDir = join(app.getPath('userData'), 'wallpapers');
  const resolveDialogWindow = (event: Electron.IpcMainInvokeEvent): BrowserWindow | null => {
    return BrowserWindow.fromWebContents(event.sender) ?? BrowserWindow.getFocusedWindow();
  };

  ipcMain.handle('dialog:open-image', async (event) => {
    const win = resolveDialogWindow(event);
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      title: '选择图片',
      filters: [{ name: '图片', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'] }],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const filePath = result.filePaths[0];
    try {
      if (!existsSync(wallpaperCacheDir)) mkdirSync(wallpaperCacheDir, { recursive: true });
      const ext = filePath.split('.').pop()?.toLowerCase() || 'png';
      const destName = `custom-bg-${Date.now()}.${ext}`;
      const destPath = join(wallpaperCacheDir, destName);
      try {
        readdirSync(wallpaperCacheDir)
          .filter((f) => f.startsWith('custom-bg-'))
          .forEach((f) => unlinkSync(join(wallpaperCacheDir, f)));
      } catch {
        // ignore
      }
      copyFileSync(filePath, destPath);
      return destPath;
    } catch {
      return null;
    }
  });

  ipcMain.handle('dialog:open-video', async (event) => {
    const win = resolveDialogWindow(event);
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      title: '选择视频',
      filters: [{ name: '视频', extensions: ['mp4'] }],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const filePath = result.filePaths[0];
    try {
      if (!existsSync(wallpaperCacheDir)) mkdirSync(wallpaperCacheDir, { recursive: true });
      const ext = filePath.split('.').pop()?.toLowerCase() || 'mp4';
      const destName = `custom-bg-${Date.now()}.${ext}`;
      const destPath = join(wallpaperCacheDir, destName);
      try {
        readdirSync(wallpaperCacheDir)
          .filter((f) => f.startsWith('custom-bg-'))
          .forEach((f) => unlinkSync(join(wallpaperCacheDir, f)));
      } catch {
        // ignore
      }
      copyFileSync(filePath, destPath);
      return destPath;
    } catch {
      return null;
    }
  });

  ipcMain.handle('wallpaper:load-file', async (_event, filePath: string) => {
    try {
      if (!filePath || typeof filePath !== 'string') return null;
      if (!existsSync(filePath)) return null;
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

  ipcMain.handle('wallpaper:clear-cache', async () => {
    try {
      if (!existsSync(wallpaperCacheDir)) return;
      readdirSync(wallpaperCacheDir)
        .filter((f) => f.startsWith('custom-bg-'))
        .forEach((f) => unlinkSync(join(wallpaperCacheDir, f)));
    } catch {
      // ignore
    }
  });

  /**
   * 读取本地文件的二进制内容
   * @description 限定在 userData/wallpapers 下，用于渲染端把转码后的视频文件重新封装成 File
   */
  ipcMain.handle('wallpaper:read-file-buffer', async (_event, filePath: string): Promise<Uint8Array | null> => {
    try {
      if (!filePath || typeof filePath !== 'string') return null;
      if (!existsSync(filePath)) return null;
      const buf = readFileSync(filePath);
      return new Uint8Array(buf);
    } catch {
      return null;
    }
  });

  ipcMain.handle('wallpaper:system:set', async (_event, payload: unknown): Promise<boolean> => {
    if (process.platform !== 'win32') return false;
    const row = (payload ?? {}) as { sourcePath?: unknown; previewUrl?: unknown; clear?: unknown };
    if (row.clear === true) {
      return clearWindowsDesktopWallpaper(wallpaperCacheDir);
    }
    const sourcePath = typeof row.sourcePath === 'string' ? row.sourcePath : null;
    const previewUrl = typeof row.previewUrl === 'string' ? row.previewUrl : null;
    const imagePath = await resolveDesktopWallpaperImagePath(wallpaperCacheDir, sourcePath, previewUrl);
    if (!imagePath) return false;
    return setWindowsDesktopWallpaper(imagePath);
  });
}
