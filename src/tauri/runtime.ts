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
 * @file runtime.ts
 * @description 原生 Tauri 命令、事件与文件拖放，保持窗口操作顺序和独立的业务并发。
 * @author 鸡哥
 */
interface TauriRuntime {
  core: { invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> };
  event: { listen<T>(event: string, handler: (event: { payload: T }) => void): Promise<() => void> };
}
type Listener = (...args: unknown[]) => void;
interface NativeDrop { paths: string[]; position: { x: number; y: number } }
const tauri = (window as unknown as { __TAURI__: TauriRuntime }).__TAURI__;
const listeners = new Map<string, Set<Listener>>();
const nativeFiles = new WeakMap<File, string>();
let queue: Promise<void> = Promise.resolve();

/** 根据原生事件中的路径创建 File 引用，路径不会从浏览器文件名推测。
 * @param paths - 操作系统或原生选择器返回的路径。
 * @returns 带有本机路径映射的文件引用。
 */
function filesForPaths(paths: string[]): File[] {
  return paths.map((path) => {
    const file = new File([], path.replaceAll('\\', '/').split('/').at(-1) || path);
    nativeFiles.set(file, path);
    return file;
  });
}
const ready = tauri.event.listen<{ channel: string; args: unknown[] }>('eisland-ipc', ({ payload }) => {
  [...(listeners.get(payload.channel) ?? [])].forEach((listener) => {
    try { listener(...payload.args); } catch (error) { console.error('[Desktop] event listener:', error); }
  });
});
// Windows delivers file paths through the native WebView event instead of exposing File.path.
const dropReady = tauri.event.listen<NativeDrop>('tauri://drag-drop', ({ payload }) => {
  const transfer = new DataTransfer();
  filesForPaths(payload.paths).forEach((file) => transfer.items.add(file));
  const ratio = window.devicePixelRatio || 1;
  const target = document.elementFromPoint(payload.position.x / ratio, payload.position.y / ratio);
  target?.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true, cancelable: true }));
});

/** 读取通过原生选择器或系统拖放获得的真实路径。
 * @param file - 原生文件引用。
 * @returns 已绑定的路径；普通浏览器文件返回空字符串。
 */
export function getNativeFilePath(file: File): string { return nativeFiles.get(file) || ''; }

/** 打开原生多选文件对话框。
 * @returns 用户选择的原生文件引用。
 */
export async function selectNativeFiles(): Promise<File[]> {
  await ready;
  return filesForPaths(await tauri.core.invoke<string[]>('desktop_ipc', { channel: 'app:pick-files', args: [] }));
}

/** 调用原生 Rust 宿主；窗口变更按发送顺序提交。
 * @param channel - Rust 注册的业务操作。
 * @param args - 业务参数。
 * @returns 原生操作结果。
 */
async function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  if (!channel.startsWith('window:')) {
    await ready;
    return tauri.core.invoke<T>('desktop_ipc', { channel, args });
  }
  const previous = queue;
  let release = (): void => {};
  queue = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try {
    await ready;
    const result = await tauri.core.invoke<T>('desktop_ipc', { channel, args });
    return result;
  } finally { release(); }
}

/** 在同步事件处理器中提交无返回值的命令并收敛宿主错误。
 * @param channel - 原生业务操作。
 * @param args - 业务参数。
 */
async function send(channel: string, ...args: unknown[]): Promise<void> {
  try { await invoke(channel, ...args); } catch (error) { console.error(`[Desktop] ${channel}:`, error); }
}
export const desktop = {
  invoke,
  /** 提交原生命令，保持事件回调的同步返回语义。
   * @param channel - 业务操作。
   * @param args - 业务参数。
   */
  send(channel: string, ...args: unknown[]): void {
    // eslint-disable-next-line promise/prefer-await-to-then -- DOM 事件必须同步返回。
    send(channel, ...args).catch(console.error);
  },
  /** 订阅业务事件，同步返回可重复调用的取消函数。
   * @param channel - 业务事件。
   * @param callback - 只接收业务参数的回调。
   * @returns 独立取消订阅函数。
   */
  on<Args extends unknown[]>(channel: string, callback: (...args: Args) => void): () => void {
    const listener = callback as Listener;
    const group = listeners.get(channel) ?? new Set<Listener>();
    group.add(listener); listeners.set(channel, group);
    return () => desktop.off(channel, callback);
  },
  /** 移除指定的原生业务事件回调。
   * @param channel - 业务事件。
   * @param callback - 已注册的回调。
   */
  off<Args extends unknown[]>(channel: string, callback: (...args: Args) => void): void {
    const group = listeners.get(channel);
    group?.delete(callback as Listener);
    if (group?.size === 0) listeners.delete(channel);
  },
};

/** 确认原生事件注册已经完成，页面才可声明就绪。
 * @returns 所有原生订阅已经就绪。
 */
export async function readyForDesktop(): Promise<void> { await Promise.all([ready, dropReady]); }

/** 将 Tauri 的 JSON 数组或图片 data URL 解码为浏览器二进制对象。
 * @param channel - 返回二进制数据的原生操作。
 * @param args - 原生操作参数。
 * @returns 图片或文件字节；资源不存在时返回 null。
 */
export async function invokeBytes(channel: string, ...args: unknown[]): Promise<Uint8Array | null> {
  const value = await desktop.invoke<unknown>(channel, ...args);
  if (value === null) return null;
  if (Array.isArray(value) && value.every((byte: unknown) => typeof byte === 'number' && Number.isInteger(byte) && byte >= 0 && byte <= 255)) {
    return Uint8Array.from(value as number[]);
  }
  if (typeof value === 'string' && /^data:image\/[^;,]+;base64,/.test(value)) {
    return Uint8Array.from(atob(value.slice(value.indexOf(',') + 1)), (character) => character.charCodeAt(0));
  }
  if (typeof value === 'string') {
    const url = new URL(value);
    if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1') throw new TypeError('Invalid native binary resource');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Native binary resource failed: ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }
  throw new TypeError('Invalid native binary response');
}
