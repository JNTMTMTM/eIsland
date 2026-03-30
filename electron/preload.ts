/**
 * @file preload.ts
 * @description Electron 预加载脚本，通过 contextBridge 安全暴露 ElectronAPI 到渲染进程
 * @author 鸡哥
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { NotificationPayload, ElectronAPI } from './types/electron-api';

const api: ElectronAPI = {
  getNotifications: () => ipcRenderer.invoke('notifications:getAll'),
  addNotification: (notification) => ipcRenderer.invoke('notifications:add', notification),
  removeNotification: (id) => ipcRenderer.invoke('notifications:remove', id),
  clearAllNotifications: () => ipcRenderer.invoke('notifications:clearAll'),
  updateIslandState: (state) => ipcRenderer.invoke('island:updateState', state),
  getIslandState: () => ipcRenderer.invoke('island:getState'),
  minimizeToTray: () => ipcRenderer.invoke('app:minimizeToTray'),
  quitApp: () => ipcRenderer.invoke('app:quit'),
  onNotification: (callback) => {
    const handler = (_: Electron.IpcRendererEvent, notification: NotificationPayload) => {
      callback(notification);
    };
    ipcRenderer.on('notification:received', handler);
    return () => {
      ipcRenderer.removeListener('notification:received', handler);
    };
  },
  onIslandExpand: (callback) => {
    const handler = (_: Electron.IpcRendererEvent, expanded: boolean) => {
      callback(expanded);
    };
    ipcRenderer.on('island:expand', handler);
    return () => {
      ipcRenderer.removeListener('island:expand', handler);
    };
  },
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (settings) => ipcRenderer.invoke('settings:update', settings),
};

contextBridge.exposeInMainWorld('electronAPI', api);
