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

if (process.platform !== 'win32') {
  throw new Error('@eisland/windows-src only supports Windows.');
}

const { spawnSync, spawn, execFile } = require('node:child_process');
const { createAsyncControl } = require('./async-control');
const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');

const helperFileName = 'eIslandBrightnessReader.exe';
const helperCandidates = [
  ...(typeof process.resourcesPath === 'string'
    ? [path.join(process.resourcesPath, 'helpers', 'brightness', helperFileName)]
    : []),
  path.join(__dirname, 'src', 'bin', 'Release', 'net10.0', helperFileName),
  path.join(__dirname, 'src', 'bin', 'Debug', 'net10.0', helperFileName),
];

/**
 * 查找 helper EXE 路径
 * @returns {string | null}
 */
function findHelper() {
  return helperCandidates.find((c) => fs.existsSync(c)) ?? null;
}

/**
 * 同步调用 helper EXE
 * @param {string[]} args
 * @param {number} timeout
 * @returns {any | null}
 */
function callHelper(args, timeout = 5000) {
  const helperPath = findHelper();
  if (!helperPath) return null;

  const result = spawnSync(helperPath, args, {
    encoding: 'utf8',
    windowsHide: true,
    timeout,
  });

  if (result.status !== 0 || result.error || !result.stdout) return null;

  try {
    return JSON.parse(result.stdout.trim());
  } catch {
    return null;
  }
}

/**
 * 异步启动一次性辅助进程；超时由 child_process 终止子进程，不占用主线程。
 * @param {string[]} args - 原生命令参数
 * @returns {Promise<object|null>} 解析后的结果，失败返回 null
 */
function callHelperAsync(args) {
  const helperPath = findHelper();
  if (!helperPath) return Promise.resolve(null);
  return new Promise((resolve) => {
    execFile(helperPath, args, { encoding: 'utf8', windowsHide: true, timeout: 5000, maxBuffer: 64 * 1024 }, (error, stdout) => {
      if (error || !stdout) { resolve(null); return; }
      try { resolve(JSON.parse(stdout.trim())); } catch { resolve(null); }
    });
  });
}

/**
 * 获取当前屏幕亮度
 * @returns {import('.').BrightnessInfo | null}
 */
function getBrightness() {
  return callHelper(['get']);
}

/**
 * 设置屏幕亮度
 * @param {number} brightness - 目标亮度 (0-100)
 * @returns {boolean}
 */
function setBrightness(brightness) {
  const val = Math.max(0, Math.min(100, Math.round(brightness)));
  const result = callHelper(['set', String(val)]);
  return result?.success === true;
}

/**
 * 屏幕亮度实时监控器
 * 通过 WmiMonitorBrightnessEvent 监听亮度变化
 */
class BrightnessMonitor extends EventEmitter {
  constructor() {
    super();
    this._process = null;
    this._running = false;
  }

  /**
   * 启动监控（幂等）
   */
  start() {
    if (this._running) return;

    const helperPath = findHelper();
    if (!helperPath) {
      throw new Error('Brightness helper EXE not found. Run "npm run build" first.');
    }

    this._process = spawn(helperPath, ['monitor'], {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this._running = true;

    let buffer = '';
    this._process.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const event = JSON.parse(trimmed);
          if (typeof event.brightness === 'number') {
            this.emit('brightness-changed', event.brightness, event.timestamp);
          }
        } catch {
          // ignore non-JSON output
        }
      }
    });

    this._process.stderr.on('data', (chunk) => {
      this.emit('error', new Error(chunk.toString()));
    });

    this._process.on('error', (err) => {
      this._running = false;
      this.emit('error', err);
    });

    this._process.on('close', () => {
      this._running = false;
    });
  }

  /**
   * 停止监控（幂等）
   */
  stop() {
    if (!this._running) return;
    this._running = false;

    if (this._process) {
      this._process.kill();
      this._process = null;
    }

    this.removeAllListeners();
  }

  /**
   * 是否正在监控
   * @returns {boolean}
   */
  isRunning() {
    return this._running;
  }
}

const brightnessControl = createAsyncControl(callHelperAsync, 'get', 'set');

/** @returns {Promise<object|null>} 异步读取当前亮度。 */
function getBrightnessAsync() { return brightnessControl.get(); }

/**
 * 异步设置亮度，只发送队列中的最新目标。
 * @param {number} brightness - 目标亮度
 * @returns {Promise<boolean>} 最新写入是否成功
 */
function setBrightnessAsync(brightness) {
  if (!Number.isFinite(brightness)) return Promise.resolve(false);
  return brightnessControl.set(Math.max(0, Math.min(100, Math.round(brightness))));
}

module.exports = {
  getBrightnessAsync,
  setBrightnessAsync,
  getBrightness,
  setBrightness,
  BrightnessMonitor,
};
