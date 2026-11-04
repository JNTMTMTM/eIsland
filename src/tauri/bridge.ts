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

/** @file bridge.ts
 * @description 将现有页面 IPC API 接到 Tauri；监听先注册再发送，保留同步取消订阅语义。
 * @author 鸡哥
 */
type Listener = (event: unknown, ...args: unknown[]) => void;
interface TauriGlobal {
  core: { invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> };
  event: { listen<T>(event: string, handler: (event: { payload: T }) => void): Promise<() => void> };
}
const tauri = (window as unknown as { __TAURI__: TauriGlobal }).__TAURI__;
const listeners = new Map<string, Set<Listener>>();
// A single transport listener avoids async per-channel registration races.
const ready = tauri.event.listen<{ channel: string; args: unknown[] }>('eisland-ipc', ({ payload }) => {
  [...(listeners.get(payload.channel) ?? [])].forEach((listener) => {
    try { listener({}, ...payload.args); } catch (error) { console.error('[Tauri] event listener:', error); }
  });
});
let queue: Promise<void> = Promise.resolve();

/** 按调用顺序发送窗口操作，避免 begin/resize/complete 被异步传输重排。
 * @param channel - 现有业务通道。
 * @param args - JSON 参数。
 * @returns Rust 命令结果。
 */
async function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  // Hardware helpers and media calls may take seconds; keep them off the window queue.
  if (!channel.startsWith('window:')) {
    await ready;
    return tauri.core.invoke<T>('desktop_ipc', { channel, args });
  }
  const previous = queue;
  let release: () => void = () => {};
  queue = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try {
    await ready;
    const result = await tauri.core.invoke<T>('desktop_ipc', { channel, args });
    return result;
  } finally { release(); }
}

/** 发送无需返回值的消息并记录宿主错误。
 * @param channel - 业务通道。
 * @param args - JSON 参数。
 */
async function sendMessage(channel: string, ...args: unknown[]): Promise<void> {
  try { await invoke(channel, ...args); } catch (error) { console.error(`[Tauri] ${channel}:`, error); }
}

export const ipcRenderer = {
  invoke,
  /** 以现有同步签名发送消息。
   * @param channel - 业务通道。
   * @param args - JSON 参数。
   */
  send(channel: string, ...args: unknown[]): void {
    // eslint-disable-next-line promise/prefer-await-to-then -- preload 的 send 必须同步返回，异步错误在此收敛。
    sendMessage(channel, ...args).catch(console.error);
  },
  /** 注册现有 IPC 签名的监听器。
   * @param channel - 业务通道。
   * @param listener - 包含 event 参数的回调。
   */
  on(channel: string, listener: Listener): void {
    const group = listeners.get(channel) ?? new Set<Listener>();
    group.add(listener); listeners.set(channel, group);
  },
  /** 第一次通知后移除监听器。
   * @param channel - 业务通道。
   * @param listener - 包含 event 参数的回调。
   */
  once(channel: string, listener: Listener): void {
    const wrapper: Listener = (event, ...args) => {
      ipcRenderer.removeListener(channel, wrapper); listener(event, ...args);
    };
    ipcRenderer.on(channel, wrapper);
  },
  /** 移除指定监听器并回收空通道。
   * @param channel - 业务通道。
   * @param listener - 已注册的回调。
   */
  removeListener(channel: string, listener: Listener): void {
    const group = listeners.get(channel);
    group?.delete(listener);
    if (group?.size === 0) listeners.delete(channel);
  },
  /** 移除通道全部监听器。
   * @param channel - 业务通道。
   */
  removeAllListeners(channel: string): void { listeners.delete(channel); },
};

export const contextBridge = {
  /** 暴露不可写的兼容 API。
   * @param name - window 属性名。
   * @param value - 桥接对象。
   */
  exposeInMainWorld(name: string, value: unknown): void {
    Object.defineProperty(window, name, { value, configurable: false, writable: false });
  },
};
export const webUtils = {
  /** 浏览器 File 无法提供可信原生路径，要求调用方使用原生选择器。 */
  getPathForFile(): string {
    throw new Error('Tauri does not expose local paths from browser File objects; use a native file picker.');
  },
};
export const electronAPI = {
  ipcRenderer: {
    ...ipcRenderer,
    /** toolkit 监听器省略底层 event 参数并同步返回取消函数。
     * @param channel - 业务通道。
     * @param callback - 业务参数回调。
     * @returns 取消订阅函数。
     */
    on(channel: string, callback: (...args: unknown[]) => void): () => void {
      const listener: Listener = (event, ...args) => { void event; callback(...args); };
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    },
    /** 兼容 toolkit 的一次性业务通知。
     * @param channel - 业务通道。
     * @param callback - 业务参数回调。
     */
    once(channel: string, callback: (...args: unknown[]) => void): void {
      ipcRenderer.once(channel, (event, ...args) => { void event; callback(...args); });
    },
  },
  process: { platform: navigator.platform.toLowerCase().includes('mac') ? 'darwin' : 'win32', versions: {} },
};
Object.defineProperty(window, '__EISLAND_CAPTURE__', {
  value: { ipcRenderer, clipboard: { writeText: (text: string) => ipcRenderer.send('clipboard:write-text', text) } },
});
document.addEventListener('DOMContentLoaded', () => {
  // CSS app-region is Electron-specific; use the host's native drag loop.
  document.addEventListener('mousedown', (event) => {
    if (event.button !== 0 || !(event.target instanceof Element)) return;
    let element: Element | null = event.target;
    while (element) {
      const region = getComputedStyle(element).getPropertyValue('-webkit-app-region').trim();
      if (region === 'no-drag' || element.matches('button,input,textarea,select,a')) return;
      if (region === 'drag' || element.hasAttribute('data-tauri-drag-region')) {
        ipcRenderer.send('window:start-dragging'); return;
      }
      element = element.parentElement;
    }
  });
  ipcRenderer.send('window:renderer-ready');
});
