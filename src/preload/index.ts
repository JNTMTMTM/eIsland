/**
 * @file index.ts
 * @description 预加载脚本，安全地将主进程能力桥接到渲染进程
 * @author 鸡哥
 */

import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

/** 自定义 API，供渲染进程调用 */
const api = {
  /** 启用鼠标穿透透明区域 */
  enableMousePassthrough: (): void => {
    ipcRenderer.send('window:enable-mouse-passthrough');
  },
  /** 禁用鼠标穿透，恢复窗口捕获鼠标事件 */
  disableMousePassthrough: (): void => {
    ipcRenderer.send('window:disable-mouse-passthrough');
  }
};

/** 注入到 window 对象，供渲染进程访问 */
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (err) {
    console.error('[Preload] contextBridge 注入失败:', err);
  }
} else {
  // @ts-expect-error 全局暴露兼容非隔离上下文
  window.electron = electronAPI;
  // @ts-expect-error 同上
  window.api = api;
}
