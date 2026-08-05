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
  throw new Error('@eisland/windows-volume-helper only supports Windows.');
}

const { spawnSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');

const helperFileName = 'eIslandVolumeHelper.exe';
const helperCandidates = [
  ...(typeof process.resourcesPath === 'string'
    ? [path.join(process.resourcesPath, 'helpers', 'volume', helperFileName)]
    : []),
  path.join(__dirname, 'src', 'bin', 'Release', 'net10.0', helperFileName),
  path.join(__dirname, 'src', 'bin', 'Debug', 'net10.0', helperFileName),
];

function findHelper() {
  return helperCandidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

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
 * 获取当前默认播放设备的静音状态
 * @returns {boolean | null} 静音状态，失败时返回 null
 */
function getMute() {
  const result = callHelper(['get-mute']);
  return typeof result?.muted === 'boolean' ? result.muted : null;
}

/**
 * 设置当前默认播放设备的静音状态
 * @param {boolean} muted - 是否静音
 * @returns {boolean} 是否设置成功
 */
function setMute(muted) {
  if (typeof muted !== 'boolean') return false;
  const result = callHelper(['set-mute', String(muted)]);
  return result?.success === true;
}

/**
 * 获取当前默认播放设备的主音量
 * @returns {number | null} 0-100 音量，失败时返回 null
 */
function getVolume() {
  const result = callHelper(['get']);
  return typeof result?.level === 'number' ? result.level : null;
}

/**
 * 设置当前默认播放设备的主音量
 * @param {number} level - 目标音量 (0-100)
 * @returns {boolean} 是否设置成功
 */
function setVolume(level) {
  const normalized = Math.max(0, Math.min(100, Math.round(level)));
  const result = callHelper(['set', String(normalized)]);
  return result?.success === true;
}

class VolumeMonitor extends EventEmitter {
  constructor() {
    super();
    this._process = null;
    this._running = false;
    this._buffer = '';
  }

  start() {
    if (this._running) return;

    const helperPath = findHelper();
    if (!helperPath) {
      throw new Error('Volume helper EXE not found. Run "npm run build" first.');
    }

    this._process = spawn(helperPath, ['monitor'], {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this._running = true;

    this._process.stdout.on('data', (chunk) => {
      this._buffer += chunk.toString();
      const lines = this._buffer.split('\n');
      this._buffer = lines.pop() ?? '';

      for (const line of lines) {
        this._handleLine(line);
      }
    });

    this._process.stderr.on('data', (chunk) => {
      this.emit('error', new Error(chunk.toString().trim()));
    });

    this._process.on('error', (error) => {
      this._running = false;
      this.emit('error', error);
    });

    this._process.on('close', () => {
      this._running = false;
      this._process = null;
      this._buffer = '';
    });
  }

  stop() {
    if (!this._running) return;
    this._running = false;

    const process = this._process;
    this._process = null;
    if (!process) return;

    process.stdin.end('\n');
    const killTimer = setTimeout(() => {
      if (!process.killed) process.kill();
    }, 1000);
    killTimer.unref();
  }

  isRunning() {
    return this._running;
  }

  _handleLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return;

    try {
      const event = JSON.parse(trimmed);
      if (event.eventName === 'volume-changed' && typeof event.level === 'number') {
        this.emit('volume-changed', event.level, event.timestamp);
        return;
      }
      if (event.eventName === 'error' && typeof event.message === 'string') {
        this.emit('error', new Error(event.message));
      }
    } catch {
      // Ignore non-JSON helper output.
    }
  }
}

module.exports = {
  getMute,
  setMute,
  getVolume,
  setVolume,
  VolumeMonitor,
};