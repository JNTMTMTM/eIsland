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
 * @file wifi-monitor.js
 * @description WiFi 连接状态实时监控器，通过 DLL FFI 监听 NetworkStatusChanged 事件
 */

const { EventEmitter } = require('node:events');
const { wf, callJson } = require('./ffi-loader');

class WifiMonitor extends EventEmitter {
  constructor() {
    super();
    this._running = false;
    /** @type {import('.').WifiInfo | null} */
    this._prevInfo = null;
  }

  /**
   * 启动监控（幂等）
   * @returns {import('.').WifiInfo} 启动时的 WiFi 状态快照
   */
  start() {
    if (this._running) return this._normalizeInfo(callJson('wf_get_monitored_wifi_info'));
    const result = wf.wf_start_monitoring();
    if (result !== 0) {
      throw new Error('Failed to start WiFi monitoring (DLL returned ' + result + ')');
    }
    this._running = true;
    this._prevInfo = this._normalizeInfo(callJson('wf_get_monitored_wifi_info'));
    this._pollLoop();
    return this._prevInfo;
  }

  /**
   * 停止监控（幂等）
   */
  stop() {
    if (!this._running) return;
    this._running = false;
    wf.wf_stop_monitoring();
    this._prevInfo = null;
    this.removeAllListeners();
  }

  /**
   * 获取当前 WiFi 连接状态快照（同步）
   * @returns {import('.').WifiInfo | null}
   */
  getWifiInfo() {
    return this._normalizeInfo(callJson('wf_get_monitored_wifi_info'));
  }

  /**
   * 轮询循环：等待 DLL 变更信号，diff 后触发事件
   * @private
   */
  _pollLoop() {
    if (!this._running) return;

    wf.wf_wait_for_changes(1000);

    if (!this._running) return;

    try {
      this._drainChanges();
    } catch (err) {
      this.emit('error', err);
    }

    setImmediate(() => this._pollLoop());
  }

  /**
   * 拉取最新 WiFi 状态，与缓存 diff 后触发事件
   * @private
   */
  _drainChanges() {
    const raw = callJson('wf_get_monitored_wifi_info');
    if (!raw) return;

    const curr = this._normalizeInfo(raw);
    const prev = this._prevInfo;

    // 始终触发通用事件
    this.emit('wifi-changed', curr);

    if (prev) {
      // WiFi 连接/断开
      if (!prev.isConnected && curr.isConnected) {
        this.emit('wifi-connected', curr);
      } else if (prev.isConnected && !curr.isConnected) {
        this.emit('wifi-disconnected', curr);
      }

      // SSID 变化（切换网络）
      if (prev.ssid !== curr.ssid && (prev.ssid != null || curr.ssid != null)) {
        this.emit('ssid-changed', curr);
      }

      // 信号强度变化
      if (prev.signalBars !== curr.signalBars && curr.signalBars >= 0) {
        this.emit('signal-changed', curr);
      }
    }

    this._prevInfo = curr;
  }

  /**
   * 标准化 WiFi 数据
   * @private
   */
  _normalizeInfo(raw) {
    if (!raw) return null;
    return {
      isConnected: !!raw.isConnected,
      ssid: raw.ssid || null,
      signalBars: raw.signalBars ?? -1,
      connectivityLevel: raw.connectivityLevel ?? 0,
      adapterName: raw.adapterName || null,
      isWifiAdapter: !!raw.isWifiAdapter,
    };
  }
}

module.exports = { WifiMonitor };
