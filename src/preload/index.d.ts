/**
 * @file index.d.ts
 * @description 渲染进程全局类型声明，扩展 Window 接口以包含 Electron API 和自定义 API
 * @author 鸡哥
 */

import { ElectronAPI } from '@electron-toolkit/preload';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: {
      enableMousePassthrough: () => void;
      disableMousePassthrough: () => void;
      expandWindow: () => void;
      collapseWindow: () => void;
      getMousePosition: () => Promise<{ x: number; y: number }>;
      getWindowBounds: () => Promise<{ x: number; y: number; width: number; height: number }>;
      quitApp: () => void;
    };
  }
}
