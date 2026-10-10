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
 * @file brightness-monitor.d.ts
 * @description 亮度变化事件与监控生命周期声明。
 * @author 鸡哥
 */
import { EventEmitter } from 'node:events';
/** 通过 500ms 硬件采样发送变化事件。 */
// eslint-disable-next-line import-x/prefer-default-export -- 声明对应 CommonJS 命名导出。
export class BrightnessMonitor extends EventEmitter {
  /**
   * 开始监控；无受支持屏幕时抛出 Error。
   * @returns 无返回值。
   */
  start(): void;
  /**
   * 停止监控并保留监听器以供重启。
   * @returns 无返回值。
   */
  stop(): void;
  /**
   * 查询采样是否运行。
   * @returns 当前运行状态。
   */
  isRunning(): boolean;
  /**
   * 注册亮度事件。
   * @param event - 亮度变化事件名称。
   * @param listener - 0–100 的亮度及 Unix 毫秒时间戳回调。
   * @returns 当前监控器。
   */
  on(event: 'brightness-changed', listener: (brightness: number, timestamp: number) => void): this;
  /**
   * 注册监控错误回调。
   * @param event - error 事件名称。
   * @param listener - 读取失败回调。
   * @returns 当前监控器。
   */
  on(event: 'error', listener: (error: Error) => void): this;
  /**
   * 注册自定义事件回调。
   * @param event - 事件名称。
   * @param listener - 对应回调。
   * @returns 当前监控器。
   */
  on(event: string | symbol, listener: (...args: unknown[]) => void): this;
}
