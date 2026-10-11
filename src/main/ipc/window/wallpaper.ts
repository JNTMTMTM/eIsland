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

import { app, BrowserWindow, dialog, ipcMain, nativeImage } from 'electron';
import { execFile } from 'child_process';
import { existsSync } from 'fs';
import { copyFile, mkdir, open, readdir, unlink, writeFile, stat, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createLocalAssetUrl } from '../../media/localAssets';
import downloadWallpaper from '../../media/downloadWallpaper';
import { extname, join, resolve, sep } from 'path';
import { fileURLToPath } from 'url';
import { getAlbumMediaInfo } from '../../media/albumMedia';

const MAX_IMAGE_BYTES = 64 * 1024 * 1024;
const MAX_FONT_BYTES = 32 * 1024 * 1024;
const MAX_BUFFER_BYTES = 128 * 1024 * 1024;
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
  if (dataUrl.length > MAX_IMAGE_BYTES * 4 / 3 + 100) return null;
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
    await mkdir(wallpaperCacheDir, { recursive: true });
    const filePath = join(wallpaperCacheDir, `${DESKTOP_SYNC_FILE_BASENAME}.${decoded.ext}`);
    await writeFile(filePath, decoded.data);
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

  const rendererUrl = process.env.ELECTRON_RENDERER_URL;
  const remote = /^https?:\/\//.test(preview) ? preview
    : preview.startsWith('/') && rendererUrl && /^https?:\/\//.test(rendererUrl) ? rendererUrl.replace(/\/$/, '') + preview : null;
  if (remote) {
    try {
      return await downloadWallpaper(remote, (response) => {
        const urlExt = extname(new URL(remote).pathname).slice(1).toLowerCase();
        const ext = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'].includes(urlExt) ? urlExt : inferImageExtFromContentType(response.headers.get('content-type'));
        return join(wallpaperCacheDir, DESKTOP_SYNC_FILE_BASENAME + '.' + ext);
      }, MAX_IMAGE_BYTES);
    } catch { return null; }
  }

  return existsSync(preview) ? preview : null;
}

function setWindowsDesktopWallpaper(imagePath: string): Promise<boolean> {
  if (process.platform !== 'win32') return Promise.resolve(false);
  if (!imagePath || !existsSync(imagePath)) return Promise.resolve(false);
  const escapedPath = imagePath.replace(/'/g, "''");
  const command = `$sig='[DllImport(\"user32.dll\", SetLastError=true)] public static extern bool SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);'; Add-Type -MemberDefinition $sig -Name Win32Wall -Namespace Native -ErrorAction SilentlyContinue; [Native.Win32Wall]::SystemParametersInfo(20, 0, '${escapedPath}', 3)`;
  return new Promise((resolve) => {
    execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], { windowsHide: true, timeout: 10_000, maxBuffer: 64 * 1024 }, (error, stdout) => {
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

async function clearWindowsDesktopWallpaper(wallpaperCacheDir: string): Promise<boolean> {
  if (process.platform !== 'win32') return Promise.resolve(false);
  try {
    await mkdir(wallpaperCacheDir, { recursive: true });
    const blackWallpaperPath = join(wallpaperCacheDir, `${DESKTOP_SYNC_FILE_BASENAME}-black.bmp`);
    await writeFile(blackWallpaperPath, createSolidBlackBmpBuffer());
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

  let backgroundQueue: Promise<unknown> = Promise.resolve();
  let backgroundPending = 0;
  let clearingCache: Promise<void> | null = null;
  /** 串行发布背景，最多保留一次正在复制和一次等待，失败时保留旧文件。 */
  const importBackground = async (filePath: string, image: boolean): Promise<string> => {
    if (backgroundPending >= 2) throw new Error('Background import queue is full');
    backgroundPending += 1;
    const request = backgroundQueue.then(async () => {
      if (image) {
        const source = await stat(filePath);
        if (!source.isFile() || source.size <= 0 || source.size > MAX_IMAGE_BYTES) throw new Error('Image exceeds size limit');
      }
      await mkdir(wallpaperCacheDir, { recursive: true });
      const ext = filePath.split('.').pop()?.toLowerCase() || (image ? 'png' : 'mp4');
      const name = 'custom-bg-' + Date.now() + '.' + ext;
      const target = join(wallpaperCacheDir, name);
      const temporary = target + '.part';
      try {
        await copyFile(filePath, temporary);
        if (image) {
          const copied = await stat(temporary);
          if (!copied.isFile() || copied.size <= 0 || copied.size > MAX_IMAGE_BYTES) throw new Error('Image exceeds size limit');
        }
        await rename(temporary, target);
      } catch (error) { await unlink(temporary).catch(() => {}); throw error; }
      const files = await readdir(wallpaperCacheDir).catch(() => []);
      await Promise.all(files.filter((file) => file.startsWith('custom-bg-') && file !== name && !file.endsWith('.part'))
        .map((file) => unlink(join(wallpaperCacheDir, file)).catch(() => {})));
      return target;
    });
    backgroundQueue = request.catch(() => {});
    try { return await request; } finally { backgroundPending -= 1; }
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
      return await importBackground(filePath, true);
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
      return await importBackground(filePath, false);
    } catch {
      return null;
    }
  });

  ipcMain.handle('dialog:open-font', async (event) => {
    const win = resolveDialogWindow(event);
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      title: '选择字体文件',
      filters: [{ name: '字体', extensions: ['ttf', 'otf', 'woff', 'woff2'] }],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const filePath = result.filePaths[0];
    try {
      const ext = extname(filePath).slice(1).toLowerCase();
      if (!['ttf', 'otf', 'woff', 'woff2'].includes(ext)) return null;
      const name = filePath.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, '') || 'CustomFont';
      const url = await createLocalAssetUrl(filePath, MAX_FONT_BYTES);
      return { path: filePath, data: '', url, ext, name };
    } catch {
      return null;
    }
  });

  ipcMain.handle('font:read-file', async (_event, filePath: string) => {
    try {
      if (!filePath || typeof filePath !== 'string') return null;
      if (!existsSync(filePath)) return null;
      const ext = extname(filePath).slice(1).toLowerCase();
      if (!['ttf', 'otf', 'woff', 'woff2'].includes(ext)) return null;
      const name = filePath.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, '') || 'CustomFont';
      const url = await createLocalAssetUrl(filePath, MAX_FONT_BYTES);
      return { path: filePath, data: '', url, ext, name };
    } catch {
      return null;
    }
  });

  let previewQueue: Promise<unknown> = Promise.resolve();
  let previewQueued = 0;
  ipcMain.handle('wallpaper:load-file', async (_event, filePath: string, preview = false) => {
    try {
      if (!filePath || typeof filePath !== 'string' || !existsSync(filePath)) return null;
      if (!['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'].includes(extname(filePath).toLowerCase())) return null;
      const originalUrl = await createLocalAssetUrl(filePath, MAX_IMAGE_BYTES);
      if (!preview || !['.jpg', '.jpeg', '.png', '.bmp'].includes(extname(filePath).toLowerCase())) return originalUrl;
      // 静态背景限制到2048px；相册原图及GIF/SVG保留完整格式。
      if (previewQueued >= 4) return null;
      const generate = async (): Promise<string | null> => {
        const info = await stat(filePath);
        const key = createHash('sha256').update(filePath + ':' + info.mtimeMs + ':' + info.size).digest('hex').slice(0, 24);
        const target = join(wallpaperCacheDir, 'preview-' + key + '.png');
        await mkdir(wallpaperCacheDir, { recursive: true });
        if (!existsSync(target)) {
          const thumbnail = await nativeImage.createThumbnailFromPath(filePath, { width: 2048, height: 2048 });
          if (thumbnail.isEmpty()) return originalUrl;
          await writeFile(target, thumbnail.toPNG());
          const previews = (await readdir(wallpaperCacheDir)).filter((name) => name.startsWith('preview-') && name !== 'preview-' + key + '.png');
          await Promise.all(previews.slice(0, Math.max(0, previews.length - 15)).map((name) => unlink(join(wallpaperCacheDir, name)).catch(() => {})));
        }
        return createLocalAssetUrl(target, MAX_IMAGE_BYTES);
      };
      previewQueued += 1;
      const pending = previewQueue.then(generate);
      previewQueue = pending.catch(() => {});
      try { return await pending; } finally { previewQueued -= 1; }
    } catch { return null; }
  });

  ipcMain.handle('album:load-thumbnail', async (_event, filePath: string): Promise<string | null> => {
    try {
      if (!filePath || typeof filePath !== 'string') return null;
      if (!existsSync(filePath)) return null;
      const thumbnail = await nativeImage.createThumbnailFromPath(filePath, { width: 320, height: 320 });
      if (thumbnail.isEmpty()) return null;
      return `data:image/jpeg;base64,${thumbnail.toJPEG(78).toString('base64')}`;
    } catch {
      return null;
    }
  });

  ipcMain.handle('album:media-info', (_event, filePath: string) => getAlbumMediaInfo(filePath));

  ipcMain.handle('wallpaper:clear-cache', async () => {
    if (clearingCache) return clearingCache;
    const request = backgroundQueue.then(async () => {
      await previewQueue;
      if (!existsSync(wallpaperCacheDir)) return;
      const files = await readdir(wallpaperCacheDir);
      await Promise.all(files.filter((file) => file.startsWith('custom-bg-') || file.startsWith('preview-'))
        .map((file) => unlink(join(wallpaperCacheDir, file)).catch(() => {})));
    }).catch(() => {}).finally(() => { clearingCache = null; });
    clearingCache = request;
    backgroundQueue = request;
    return request;
  });

  /**
   * 读取本地文件的二进制内容
   * @description 限定在 userData/wallpapers 下，用于渲染端把转码后的视频文件重新封装成 File
   */
  ipcMain.handle('wallpaper:read-file-buffer', async (_event, filePath: string): Promise<Uint8Array | null> => {
    try {
      if (!filePath || typeof filePath !== 'string') return null;
      const normalized = resolve(filePath);
      if (!normalized.startsWith(wallpaperCacheDir + sep)) return null;
      if (!existsSync(normalized)) return null;
      const file = await open(normalized, 'r');
      try {
        const info = await file.stat();
        if (!info.isFile() || info.size > MAX_BUFFER_BYTES) return null;
        const bytes = new Uint8Array(info.size);
        let offset = 0;
        while (offset < bytes.length) {
          const { bytesRead } = await file.read(bytes, offset, bytes.length - offset, offset);
          if (!bytesRead) return null;
          offset += bytesRead;
        }
        return bytes;
      } finally { await file.close(); }
    } catch {
      return null;
    }
  });

  let desktopWallpaperBusy = false;
  ipcMain.handle('wallpaper:system:set', async (_event, payload: unknown): Promise<boolean> => {
    if (process.platform !== 'win32' || desktopWallpaperBusy) return false;
    desktopWallpaperBusy = true;
    try {
      const row = (payload ?? {}) as { sourcePath?: unknown; previewUrl?: unknown; clear?: unknown };
      if (row.clear === true) {
        return await clearWindowsDesktopWallpaper(wallpaperCacheDir);
      }
      const sourcePath = typeof row.sourcePath === 'string' ? row.sourcePath : null;
      const previewUrl = typeof row.previewUrl === 'string' ? row.previewUrl : null;
      const imagePath = await resolveDesktopWallpaperImagePath(wallpaperCacheDir, sourcePath, previewUrl);
      if (!imagePath) return false;
      return await setWindowsDesktopWallpaper(imagePath);
    } finally { desktopWallpaperBusy = false; }
  });
}
