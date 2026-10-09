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

/** 电池状态枚举 */
export const enum BatteryStatus {
  /** 无电池（台式机） */
  NotPresent = 0,
  /** 放电中 */
  Discharging = 1,
  /** 空闲（已满未拔电） */
  Idle = 2,
  /** 充电中 */
  Charging = 3,
}

/** 电源供应状态枚举 */
export const enum PowerSupplyStatus {
  /** 无电源 */
  NotPresent = 0,
  /** 供电充足（已接通电源） */
  Adequate = 1,
  /** 供电不足 */
  Inadequate = 2,
  /** 未知 */
  Unknown = 3,
}

/** 省电模式状态枚举 */
export const enum EnergySaverStatus {
  /** 已禁用 */
  Disabled = 0,
  /** 关闭 */
  Off = 1,
  /** 开启 */
  On = 2,
}

export interface PowerInfo {
  /** 电池电量百分比 (0-100)，台式机无电池时为 100 */
  remainingChargePercent: number;
  /** 电池状态。0=NotPresent, 1=Discharging, 2=Idle, 3=Charging */
  batteryStatus: BatteryStatus;
  /** 电源供应状态。0=NotPresent, 1=Adequate, 2=Inadequate, 3=Unknown */
  powerSupplyStatus: PowerSupplyStatus;
  /** 省电模式状态。0=Disabled, 1=Off, 2=On */
  energySaverStatus: EnergySaverStatus;
  /** 是否有电池（台式机通常为 false） */
  hasBattery: boolean;
  /** 是否正在充电 */
  isCharging: boolean;
  /** 是否已接通电源（AC 电源） */
  isOnAcPower: boolean;
}

// ── 查询函数 ──────────────────────────────────────────────────

/** 获取当前电源状态快照 */
export function getPowerInfo(): PowerInfo | null;

// ── 监控器类 ──────────────────────────────────────────────────

/**
 * 电源状态实时监控器
 * 通过 DLL FFI 监听 WinRT PowerManager 事件
 *
 * @example
 * ```js
 * const monitor = new PowerMonitor();
 * monitor.on('ac-connected', () => { ... });
 * monitor.on('ac-disconnected', () => { ... });
 * monitor.on('battery-low', (info) => { ... });
 * monitor.on('power-changed', (info) => { ... });
 * monitor.start();
 * // ...
 * monitor.stop();
 * ```
 */
export class PowerMonitor extends EventEmitter {
  constructor();
  /** 启动监控 */
  start(): PowerInfo;
  /** 停止监控 */
  stop(): void;
  /** 获取当前电源状态快照 */
  getPowerInfo(): PowerInfo | null;

  /** 已接通 AC 电源 */
  on(event: 'ac-connected', listener: (info: PowerInfo) => void): this;
  /** 已断开 AC 电源（使用电池供电） */
  on(event: 'ac-disconnected', listener: (info: PowerInfo) => void): this;
  /** 电池电量过低 (<=15%) */
  on(event: 'battery-low', listener: (info: PowerInfo) => void): this;
  /** 开始充电 */
  on(event: 'charging', listener: (info: PowerInfo) => void): this;
  /** 停止充电（拔掉电源或已充满） */
  on(event: 'discharging', listener: (info: PowerInfo) => void): this;
  /** 电源状态发生变化（通用事件） */
  on(event: 'power-changed', listener: (info: PowerInfo) => void): this;
  /** 监控出错 */
  on(event: 'error', listener: (err: Error) => void): this;
  on(event: string, listener: (...args: any[]) => void): this;

  emit(event: 'ac-connected', info: PowerInfo): boolean;
  emit(event: 'ac-disconnected', info: PowerInfo): boolean;
  emit(event: 'battery-low', info: PowerInfo): boolean;
  emit(event: 'charging', info: PowerInfo): boolean;
  emit(event: 'discharging', info: PowerInfo): boolean;
  emit(event: 'power-changed', info: PowerInfo): boolean;
  emit(event: 'error', err: Error): boolean;
  emit(event: string, ...args: any[]): boolean;
}
