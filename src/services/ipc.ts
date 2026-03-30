/**
 * @file ipc.ts
 * @description IPC 通信封装模块，提供 ElectronAPI 调用和事件监听的类型安全封装
 * @author 鸡哥
 */

import type { NotificationPayload, ElectronAPI } from '../types/electron-api';

/**
 * 获取全局 ElectronAPI 实例（仅在 Electron 渲染进程中可用）
 * @returns ElectronAPI 实例或 null
 */
export function getElectronAPI(): ElectronAPI | null {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return window.electronAPI;
  }
  return null;
}

/**
 * 类型安全地调用 ElectronAPI 方法
 * @param channel - API 方法名
 * @param args - 方法参数
 * @returns Promise  resolve 的返回值
 * @throws Electron API 不可用时抛出错误
 */
export async function invoke<T>(channel: keyof ElectronAPI, ...args: unknown[]): Promise<T> {
  const api = getElectronAPI();
  if (!api) {
    throw new Error('Electron API not available');
  }

  const handler = api[channel] as (...args: unknown[]) => Promise<T>;
  return handler(...args);
}

/**
 * 订阅主进程推送的新通知事件
 * @param callback - 收到通知时的回调函数
 * @returns 取消订阅的函数
 */
export function onNotification(callback: (notification: NotificationPayload) => void): () => void {
  const api = getElectronAPI();
  if (!api) {
    return () => {};
  }
  return api.onNotification(callback);
}

/**
 * 订阅灵动岛展开状态变化事件
 * @param callback - 展开状态变化时的回调函数
 * @returns 取消订阅的函数
 */
export function onIslandExpand(callback: (expanded: boolean) => void): () => void {
  const api = getElectronAPI();
  if (!api) {
    return () => {};
  }
  return api.onIslandExpand(callback);
}
