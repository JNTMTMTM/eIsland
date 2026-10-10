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
 * @file brightness-monitor.js
 * @description 定时采样系统硬件亮度，提供 Windows 兼容变化事件与停止清理。
 * @author 鸡哥
 */
const { EventEmitter } = require('node:events');
// eslint-disable-next-line import-x/extensions -- CommonJS 无扩展名导入与同名声明文件对应。
const { getBrightness } = require('./brightness');

/** 每个实例监控一个系统优先屏幕；所有读写在 Swift 层串行。 */
class BrightnessMonitor extends EventEmitter {
  timer = null;

  last = null;

  /**
   * 开始每 500ms 读取亮度，首次读值作为比较基线。
   * @returns 无返回值；没有受支持屏幕时抛出 Error。
   */
  start() {
    if (this.isRunning()) return;
    const current = getBrightness();
    if (!current) throw new Error('No supported display brightness interface is available.');
    this.last = current;
    this.timer = setInterval(() => this.poll(), 500);
  }

  /**
   * 停止采样并清理状态，保留监听器以支持重新启动。
   * @returns 无返回值。
   */
  stop() {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.last = null;
  }

  /**
   * 查询监控器是否正在采样。
   * @returns 启动后且尚未停止时为 true。
   */
  isRunning() { return this.timer !== null; }

  /**
   * 比较硬件亮度与设备标识，只在变化时发送事件。
   * @returns 无返回值；读取错误或设备消失时停止并发送 error。
   */
  poll() {
    if (!this.isRunning()) return;
    let current;
    try {
      current = getBrightness();
      if (!current) throw new Error('The supported display brightness interface became unavailable.');
    } catch (error) {
      this.stop();
      this.emit('error', error);
      return;
    }
    const changed = current.currentBrightness !== this.last?.currentBrightness
      || current.instanceName !== this.last?.instanceName;
    this.last = current;
    if (changed) this.emit('brightness-changed', current.currentBrightness, Date.now());
  }
}
module.exports = { BrightnessMonitor };
