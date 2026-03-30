/**
 * @file ipc.ts
 * @description Electron IPC 处理器注册模块，定义渲染进程与主进程之间的通信通道
 * @author 鸡哥
 */

import { ipcMain, screen } from 'electron';
import { getMainWindow } from '../main';
import {
  getAllNotifications,
  insertNotification,
  deleteNotification,
  clearAllNotifications,
  getAllSettings,
  updateSettings,
} from '../store/database';
import log from 'electron-log/main';

/**
 * 注册所有 IPC 通信通道的处理器，包括通知、灵动岛状态、应用和设置四个模块
 */
export function registerIpcHandlers(): void {
  ipcMain.handle('notifications:getAll', async () => {
    try {
      return getAllNotifications().map((n) => ({
        id: n.id,
        appId: n.app_id,
        appName: n.app_name,
        title: n.title,
        body: n.body,
        icon: n.icon ?? undefined,
        timestamp: n.timestamp,
        priority: n.priority as 'high' | 'medium' | 'low',
        category: n.category,
        actions: n.actions ? JSON.parse(n.actions) : undefined,
      }));
    } catch (error) {
      log.error('Failed to get notifications:', error);
      return [];
    }
  });

  ipcMain.handle('notifications:add', async (_, notification) => {
    try {
      insertNotification({
        id: notification.id,
        app_id: notification.appId,
        app_name: notification.appName,
        title: notification.title,
        body: notification.body,
        icon: notification.icon,
        timestamp: notification.timestamp,
        priority: notification.priority,
        category: notification.category,
        actions: notification.actions ? JSON.stringify(notification.actions) : undefined,
      });

      const mainWindow = getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send('notification:received', notification);
      }

      log.info(`Notification added: ${notification.id}`);
    } catch (error) {
      log.error('Failed to add notification:', error);
      throw error;
    }
  });

  ipcMain.handle('notifications:remove', async (_, id: string) => {
    try {
      deleteNotification(id);
      log.info(`Notification removed: ${id}`);
    } catch (error) {
      log.error('Failed to remove notification:', error);
      throw error;
    }
  });

  ipcMain.handle('notifications:clearAll', async () => {
    try {
      clearAllNotifications();
      log.info('All notifications cleared');
    } catch (error) {
      log.error('Failed to clear notifications:', error);
      throw error;
    }
  });

  ipcMain.handle('island:updateState', async (_, state: { expanded: boolean; height: number }) => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return;

    const width = state.expanded ? 600 : 400;
    const height = state.expanded ? state.height : 80;

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth } = primaryDisplay.workAreaSize;
    const x = Math.round((screenWidth - width) / 2);
    const y = 0;

    mainWindow.setBounds({ x, y, width, height });

    mainWindow.webContents.send('island:expand', state.expanded);

    log.info(`Island state updated: expanded=${state.expanded}, size=${width}x${height}, x=${x}`);
  });

  ipcMain.handle('island:getState', async () => {
    return { expanded: false, height: 80 };
  });

  ipcMain.handle('app:minimizeToTray', async () => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.hide();
      log.info('Window minimized to tray');
    }
  });

  ipcMain.handle('app:quit', async () => {
    log.info('Quit requested via IPC');
    const { app } = await import('electron');
    app.quit();
  });

  ipcMain.handle('settings:get', async () => {
    try {
      return getAllSettings();
    } catch (error) {
      log.error('Failed to get settings:', error);
      return {};
    }
  });

  ipcMain.handle('settings:update', async (_, settings: Record<string, unknown>) => {
    try {
      updateSettings(settings);
      log.info('Settings updated');
    } catch (error) {
      log.error('Failed to update settings:', error);
      throw error;
    }
  });
}
