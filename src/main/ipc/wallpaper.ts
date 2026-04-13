import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';

export function registerWallpaperIpcHandlers(): void {
  const wallpaperCacheDir = join(app.getPath('userData'), 'wallpapers');

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
}
