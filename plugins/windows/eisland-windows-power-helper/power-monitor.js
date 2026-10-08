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
 * @file power-monitor.js
 * @description 电源状态实时监控器，通过 DLL FFI 监听 PowerManager 事件
 */

const { EventEmitter } = require('node:events');
const { pw, callJson } = require('./ffi-loader');

/** 电量过低阈值 */
const LOW_BATTERY_THRESHOLD = 15;

class PowerMonitor extends EventEmitter {
  constructor() {
    super();
    this._running = false;
    /** @type {import('.').PowerInfo | null} */
    this._prevInfo = null;
  }

  /**
   * 启动监控（幂等）
   * @returns {import('.').PowerInfo} 启动时的电源状态快照
   */
  start() {
    if (this._running) return this._normalizeInfo(callJson('pw_get_monitored_power_info'));
    const result = pw.pw_start_monitoring();
    if (result !== 0) {
      throw new Error('Failed to start power monitoring (DLL returned ' + result + ')');
    }
    this._running = true;
    this._prevInfo = this._normalizeInfo(callJson('pw_get_monitored_power_info'));
    this._pollLoop();
    return this._prevInfo;
  }

  /**
   * 停止监控（幂等）
   */
  stop() {
    if (!this._running) return;
    this._running = false;
    pw.pw_stop_monitoring();
    this._prevInfo = null;
    this.removeAllListeners();
  }

  /**
   * 获取当前电源状态快照（同步）
   * @returns {import('.').PowerInfo | null}
   */
  getPowerInfo() {
    return this._normalizeInfo(callJson('pw_get_monitored_power_info'));
  }

  /**
   * 轮询循环：等待 DLL 变更信号，diff 后触发事件
   * @private
   */
  _pollLoop() {
    if (!this._running) return;

    pw.pw_wait_for_changes(1000);

    if (!this._running) return;

    try {
      this._drainChanges();
    } catch (err) {
      this.emit('error', err);
    }

    setImmediate(() => this._pollLoop());
  }

  /**
   * 拉取最新电源状态，与缓存 diff 后触发事件
   * @private
   */
  _drainChanges() {
    const raw = callJson('pw_get_monitored_power_info');
    if (!raw) return;

    const curr = this._normalizeInfo(raw);
    const prev = this._prevInfo;

    // 始终触发通用事件
    this.emit('power-changed', curr);

    if (prev) {
      // AC 电源连接/断开
      if (!prev.isOnAcPower && curr.isOnAcPower) {
        this.emit('ac-connected', curr);
      } else if (prev.isOnAcPower && !curr.isOnAcPower) {
        this.emit('ac-disconnected', curr);
      }

      // 充电状态变化
      if (!prev.isCharging && curr.isCharging) {
        this.emit('charging', curr);
      } else if (prev.isCharging && !curr.isCharging) {
        this.emit('discharging', curr);
      }

      // 电量过低（仅在有电池且电量下降到阈值以下时触发）
      if (
        curr.hasBattery &&
        !curr.isCharging &&
        curr.remainingChargePercent <= LOW_BATTERY_THRESHOLD &&
        prev.remainingChargePercent > LOW_BATTERY_THRESHOLD
      ) {
        this.emit('battery-low', curr);
      }
    }

    this._prevInfo = curr;
  }

  /**
   * 标准化电源数据
   * @private
   */
  _normalizeInfo(raw) {
    if (!raw) return null;
    return {
      remainingChargePercent: raw.remainingChargePercent ?? 100,
      batteryStatus: raw.batteryStatus ?? 0,
      powerSupplyStatus: raw.powerSupplyStatus ?? 0,
      energySaverStatus: raw.energySaverStatus ?? 0,
      hasBattery: !!raw.hasBattery,
      isCharging: !!raw.isCharging,
      isOnAcPower: !!raw.isOnAcPower,
    };
  }
}

module.exports = { PowerMonitor };
