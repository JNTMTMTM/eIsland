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

import { EventEmitter } from 'events';

// ── 数据类型 ──────────────────────────────────────────────────

/** 网络连接级别枚举 */
export const enum ConnectivityLevel {
  /** 无连接 */
  None = 0,
  /** 仅本地访问 */
  LocalAccess = 1,
  /** 受限互联网访问 */
  ConstrainedInternetAccess = 2,
  /** 完全互联网访问 */
  InternetAccess = 3,
}

export interface WifiInfo {
  /** 是否已连接 WiFi */
  isConnected: boolean;
  /** WiFi 网络名称 (SSID)，未连接时为 null */
  ssid: string | null;
  /** 信号强度 (0-5 bars)，-1 表示不可用 */
  signalBars: number;
  /** 网络连接级别。0=None, 1=LocalAccess, 2=ConstrainedInternetAccess, 3=InternetAccess */
  connectivityLevel: ConnectivityLevel;
  /** 适配器 ID，无 WiFi 适配器时为 null */
  adapterName: string | null;
  /** 是否为 WiFi 适配器（IANA type 71） */
  isWifiAdapter: boolean;
}

// ── 查询函数 ──────────────────────────────────────────────────

/** 获取当前 WiFi 连接状态快照 */
export function getWifiInfo(): WifiInfo | null;

// ── 监控器类 ──────────────────────────────────────────────────

/**
 * WiFi 连接状态实时监控器
 * 通过 DLL FFI 监听 WinRT NetworkInformation.NetworkStatusChanged 事件
 *
 * @example
 * ```js
 * const monitor = new WifiMonitor();
 * monitor.on('wifi-connected', (info) => { ... });
 * monitor.on('wifi-disconnected', (info) => { ... });
 * monitor.on('wifi-changed', (info) => { ... });
 * monitor.start();
 * // ...
 * monitor.stop();
 * ```
 */
export class WifiMonitor extends EventEmitter {
  constructor();
  /** 启动监控 */
  start(): WifiInfo;
  /** 停止监控 */
  stop(): void;
  /** 获取当前 WiFi 连接状态快照 */
  getWifiInfo(): WifiInfo | null;

  /** WiFi 已连接 */
  on(event: 'wifi-connected', listener: (info: WifiInfo) => void): this;
  /** WiFi 已断开 */
  on(event: 'wifi-disconnected', listener: (info: WifiInfo) => void): this;
  /** WiFi 信号强度变化 */
  on(event: 'signal-changed', listener: (info: WifiInfo) => void): this;
  /** WiFi SSID 变化（切换网络） */
  on(event: 'ssid-changed', listener: (info: WifiInfo) => void): this;
  /** WiFi 状态发生变化（通用事件） */
  on(event: 'wifi-changed', listener: (info: WifiInfo) => void): this;
  /** 监控出错 */
  on(event: 'error', listener: (err: Error) => void): this;
  on(event: string, listener: (...args: any[]) => void): this;

  emit(event: 'wifi-connected', info: WifiInfo): boolean;
  emit(event: 'wifi-disconnected', info: WifiInfo): boolean;
  emit(event: 'signal-changed', info: WifiInfo): boolean;
  emit(event: 'ssid-changed', info: WifiInfo): boolean;
  emit(event: 'wifi-changed', info: WifiInfo): boolean;
  emit(event: 'error', err: Error): boolean;
  emit(event: string, ...args: any[]): boolean;
}
