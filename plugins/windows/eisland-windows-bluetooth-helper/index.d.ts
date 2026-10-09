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

export interface BluetoothDeviceInfo {
  /** 设备 ID（Windows DeviceInformation ID） */
  deviceId: string;
  /** 设备友好名称 */
  name: string | null;
  /** 蓝牙地址（MAC，十六进制字符串） */
  bluetoothAddress: string | null;
  /** 是否已连接 */
  isConnected: boolean;
  /** 是否已配对 */
  isPaired: boolean;
  /** 信号强度 (RSSI dBm)，不可用时为 null */
  signalStrength: number | null;
  /** 设备类别（CoD） */
  deviceClass: number | null;
  /** 外观类别（BLE Appearance） */
  appearance: number | null;
  /** 设备支持的 GATT 服务 UUID 列表 */
  serviceUuids: string[];
  /** 设备类型：BLE 从 Appearance 推导（如 "HID"、"Watch"），经典蓝牙从 CoD 推导（如 "Headphones"、"Speaker"、"Printer"、"Phone"） */
  deviceType: string | null;
  /** 电池电量百分比 (0–100)，仅 BLE 设备可用，不可用时为 null */
  batteryLevel: number | null;
}

// ── 查询函数 ──────────────────────────────────────────────────

/** 获取所有已配对的蓝牙设备 */
export function getPairedDevices(): BluetoothDeviceInfo[];
/** 获取所有已连接的蓝牙设备 */
export function getConnectedDevices(): BluetoothDeviceInfo[];
/** 获取所有可见蓝牙设备（已配对 + 附近 BLE 广播） */
export function getAllDevices(): BluetoothDeviceInfo[];
/** 获取单个设备快照 */
export function getDevice(deviceId: string): BluetoothDeviceInfo | null;

// ── 监控器类 ──────────────────────────────────────────────────

/**
 * 蓝牙设备实时监控器
 * 通过 DLL FFI 监听 WinRT DeviceWatcher 事件
 *
 * @example
 * ```js
 * const monitor = new BluetoothMonitor();
 * monitor.on('device-added', (device) => { ... });
 * monitor.on('device-removed', (deviceId) => { ... });
 * monitor.on('device-connected', (device) => { ... });
 * monitor.on('device-disconnected', (deviceId) => { ... });
 * monitor.on('device-updated', (device) => { ... });
 * monitor.start();
 * // ...
 * monitor.stop();
 * ```
 */
export class BluetoothMonitor extends EventEmitter {
  constructor();
  /** 启动监控 */
  start(): void;
  /** 停止监控 */
  stop(): void;
  /** 获取当前所有设备快照 */
  getDevices(): BluetoothDeviceInfo[];

  on(event: 'device-added', listener: (device: BluetoothDeviceInfo) => void): this;
  on(event: 'device-removed', listener: (deviceId: string) => void): this;
  on(event: 'device-connected', listener: (device: BluetoothDeviceInfo) => void): this;
  on(event: 'device-disconnected', listener: (deviceId: string) => void): this;
  on(event: 'device-updated', listener: (device: BluetoothDeviceInfo) => void): this;
  on(event: 'error', listener: (err: Error) => void): this;
  on(event: string, listener: (...args: any[]) => void): this;

  emit(event: 'device-added', device: BluetoothDeviceInfo): boolean;
  emit(event: 'device-removed', deviceId: string): boolean;
  emit(event: 'device-connected', device: BluetoothDeviceInfo): boolean;
  emit(event: 'device-disconnected', deviceId: string): boolean;
  emit(event: 'device-updated', device: BluetoothDeviceInfo): boolean;
  emit(event: 'error', err: Error): boolean;
  emit(event: string, ...args: any[]): boolean;
}
