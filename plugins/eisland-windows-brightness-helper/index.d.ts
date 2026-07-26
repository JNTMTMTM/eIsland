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

export interface BrightnessInfo {
  /** 当前亮度百分比 (0-100) */
  currentBrightness: number;
  /** 显示器支持的亮度级别数组 (0-100) */
  levels: number[] | null;
  /** 显示器实例名称 */
  instanceName: string | null;
  /** 亮度控制来源：内置屏 WMI 或外接显示器 DDC/CI */
  source?: 'wmi' | 'ddc-ci';
}

// ── 查询函数 ──────────────────────────────────────────────────

/** 获取当前屏幕亮度 */
export function getBrightness(): BrightnessInfo | null;

// ── 设置函数 ──────────────────────────────────────────────────

/** 设置屏幕亮度 (0-100)，返回是否成功 */
export function setBrightness(brightness: number): boolean;

// ── 监控器类 ──────────────────────────────────────────────────

/**
 * 屏幕亮度实时监控器
 * 通过 WmiMonitorBrightnessEvent 监听亮度变化
 *
 * @example
 * ```js
 * const monitor = new BrightnessMonitor();
 * monitor.on('brightness-changed', (brightness, timestamp) => { ... });
 * monitor.on('error', (err) => { ... });
 * monitor.start();
 * // ...
 * monitor.stop();
 * ```
 */
export class BrightnessMonitor extends EventEmitter {
  constructor();
  /** 启动监控 */
  start(): void;
  /** 停止监控 */
  stop(): void;
  /** 是否正在监控 */
  isRunning(): boolean;

  on(event: 'brightness-changed', listener: (brightness: number, timestamp: number) => void): this;
  on(event: 'error', listener: (err: Error) => void): this;
  on(event: string, listener: (...args: any[]) => void): this;

  emit(event: 'brightness-changed', brightness: number, timestamp: number): boolean;
  emit(event: 'error', err: Error): boolean;
  emit(event: string, ...args: any[]): boolean;
}
