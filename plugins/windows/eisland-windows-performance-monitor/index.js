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
 * @file index.js
 * @description Windows 性能采集插件入口
 * @description 加载原生绑定模块并导出 CPU、内存与温度采集 API
 * @author 鸡哥
 */

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

if (process.platform !== 'win32') {
  throw new Error('@eisland/windows-performance-monitor only supports Windows.');
}

const candidates = [
  path.join(__dirname, 'build', 'Release', 'windows_performance_monitor.node'),
  path.join(__dirname, 'build', 'Debug', 'windows_performance_monitor.node'),
];

const runtimeId = `win-${process.arch === 'ia32' ? 'x86' : process.arch}`;
const temperatureReaderCandidates = [
  path.join(__dirname, 'temperature-helper', 'bin', 'Release', 'net10.0', runtimeId, 'eIslandTemperatureReader.exe'),
  path.join(__dirname, 'temperature-helper', 'bin', 'Release', 'net10.0', 'eIslandTemperatureReader.exe'),
  path.join(__dirname, 'temperature-helper', 'bin', 'Debug', 'net10.0', runtimeId, 'eIslandTemperatureReader.exe'),
  path.join(__dirname, 'temperature-helper', 'bin', 'Debug', 'net10.0', 'eIslandTemperatureReader.exe'),
];

const emptyTemperatureSnapshot = Object.freeze({
  isAvailable: false,
  readings: Object.freeze([]),
  maxTemperatureCelsius: null,
});

const emptyHardwareListSnapshot = Object.freeze({
  isAvailable: false,
  cpus: Object.freeze([]),
  gpus: Object.freeze([]),
});

let nativeBinding;
let lastError;

candidates.some((candidate) => {
  try {
    nativeBinding = require(candidate);
    return true;
  } catch (error) {
    lastError = error;
    return false;
  }
});

if (!nativeBinding) {
  throw lastError ?? new Error('Unable to load windows_performance_monitor native binding.');
}

const TEMPERATURE_TTL_MS = 2000;
const RETRY_DELAY_MS = 10000;
const REQUEST_TIMEOUT_MS = 5000;
const IDLE_TIMEOUT_MS = 15000;
const MAX_RESPONSE_LENGTH = 1024 * 1024;
let temperature = emptyTemperatureSnapshot;
let hardwareList = emptyHardwareListSnapshot;
let expiresAt = 0;
let retryAt = 0;
let reader = null;

/**
 * 终止失效会话；旧进程的迟到事件不得影响新会话。
 * @param session - 需要停止的会话
 * @param failed - 是否对后续调用启用失败退避
 */
function stopReader(session, failed) {
  if (!session || reader !== session) return;
  reader = null;
  clearTimeout(session.timeout);
  clearTimeout(session.idle);
  process.removeListener('exit', session.onExit);
  session.child.kill();
  if (failed) {
    temperature = emptyTemperatureSnapshot;
    expiresAt = 0;
    retryAt = Date.now() + RETRY_DELAY_MS;
  }
  session.resolve?.();
}

/**
 * 释放 helper 和管道，并完成等待中的请求，防止退出时遗留子进程。
 */
function dispose() {
  stopReader(reader, false);
  temperature = emptyTemperatureSnapshot;
  hardwareList = emptyHardwareListSnapshot;
  expiresAt = 0;
  retryAt = 0;
}

/**
 * 校验传感器边界并生成不可变缓存，避免调用方污染后续快照。
 * @param payload - helper 返回的完整快照
 */
function acceptSnapshot(payload) {
  if (!payload || typeof payload.temperature !== 'object' || !payload.temperature ||
      typeof payload.hardwareList !== 'object' || !payload.hardwareList) {
    throw new Error('Invalid performance helper response.');
  }
  const readings = (Array.isArray(payload.temperature.readings) ? payload.temperature.readings : [])
    .filter((item) => item && typeof item.id === 'string' && typeof item.label === 'string' &&
      ['cpu', 'gpu', 'motherboard', 'storage', 'unknown'].includes(item.category) &&
      Number.isFinite(item.temperatureCelsius) && item.source === 'libre-hardware-monitor')
    .map((item) => Object.freeze({ ...item }));
  const devices = (items, category) => Object.freeze((Array.isArray(items) ? items : [])
    .filter((item) => item && typeof item.id === 'string' && typeof item.name === 'string' &&
      item.category === category && typeof item.hardwareType === 'string' && item.source === 'libre-hardware-monitor')
    .map((item) => Object.freeze({ ...item })));
  temperature = Object.freeze({
    isAvailable: payload.temperature.isAvailable === true && readings.length > 0,
    readings: Object.freeze(readings),
    maxTemperatureCelsius: readings.length ? Math.max(...readings.map((item) => item.temperatureCelsius)) : null,
  });
  const cpus = devices(payload.hardwareList.cpus, 'cpu');
  const gpus = devices(payload.hardwareList.gpus, 'gpu');
  hardwareList = Object.freeze({
    cpus,
    gpus,
    isAvailable: payload.hardwareList.isAvailable === true && (cpus.length > 0 || gpus.length > 0),
  });
}

/**
 * 延迟启动一个按请求工作的 helper，硬件驱动仅在会话内初始化一次。
 * @returns helper 会话；不存在可执行文件时返回 null
 */
function startReader() {
  const readerPath = temperatureReaderCandidates.find((candidate) => fs.existsSync(candidate));
  if (!readerPath) return null;
  const child = spawn(readerPath, ['server'], { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
  const session = { child, onExit: dispose, buffer: '', pending: null, resolve: null, timeout: null, idle: null };
  reader = session;
  process.once('exit', session.onExit);
  child.stdout.setEncoding('utf8');
  child.on('error', () => stopReader(session, true));
  child.on('exit', () => stopReader(session, true));
  child.stdin.on('error', () => stopReader(session, true));
  child.stdout.on('error', () => stopReader(session, true));
  child.stdout.on('data', (chunk) => {
    if (reader !== session) return;
    session.buffer += chunk;
    if (session.buffer.length > MAX_RESPONSE_LENGTH) {
      stopReader(session, true);
      return;
    }
    const newline = session.buffer.indexOf('\n');
    if (newline < 0) return;
    try {
      if (!session.pending || session.buffer.slice(newline + 1).trim()) throw new Error('Unexpected helper response.');
      acceptSnapshot(JSON.parse(session.buffer.slice(0, newline)));
    } catch {
      stopReader(session, true);
      return;
    }
    session.buffer = '';
    expiresAt = Date.now() + TEMPERATURE_TTL_MS;
    clearTimeout(session.timeout);
    const { resolve } = session;
    session.pending = null;
    session.resolve = null;
    resolve();
    // 无后台轮询；不再查看监控时关闭驱动和 .NET 进程。
    session.idle = setTimeout(() => {
      if (reader !== session) return;
      reader = null;
      process.removeListener('exit', session.onExit);
      child.stdin.end();
    }, IDLE_TIMEOUT_MS);
    session.idle.unref();
    child.unref();
    child.stdin.unref?.();
    child.stdout.unref?.();
  });
  return session;
}

/**
 * 合并温度和硬件并发请求，缓存命中与失败退避期间不执行采集。
 * @returns 本次刷新完成的 Promise
 */
function refresh() {
  if (Date.now() < expiresAt || Date.now() < retryAt) return Promise.resolve();
  if (reader?.pending) return reader.pending;
  try {
    const session = reader ?? startReader();
    if (!session) {
      retryAt = Date.now() + RETRY_DELAY_MS;
      return Promise.resolve();
    }
    clearTimeout(session.idle);
    session.child.ref();
    session.child.stdin.ref?.();
    session.child.stdout.ref?.();
    session.pending = new Promise((resolve) => { session.resolve = resolve; });
    const { pending } = session;
    session.timeout = setTimeout(() => stopReader(session, true), REQUEST_TIMEOUT_MS);
    session.child.stdin.write('snapshot\n');
    return pending;
  } catch {
    stopReader(reader, true);
    retryAt = Date.now() + RETRY_DELAY_MS;
    return Promise.resolve();
  }
}

/**
 * 立即返回温度缓存并在过期时异步刷新；首次调用返回不可用快照。
 * @returns 最近的温度快照
 */
function getTemperature() {
  void refresh();
  return temperature;
}

/**
 * 等待合并后的温度采集；不会阻塞 JavaScript 事件循环。
 * @returns 温度快照
 */
async function getTemperatureAsync() {
  await refresh();
  return temperature;
}

/**
 * 立即返回硬件列表缓存，尚未发现硬件时异步刷新。
 * @returns 硬件列表快照
 */
function getHardwareList() {
  if (!hardwareList.isAvailable) void refresh();
  return hardwareList;
}

/**
 * 首次等待硬件发现，后续复用硬件列表。
 * @returns 硬件列表快照
 */
async function getHardwareListAsync() {
  if (!hardwareList.isAvailable) await refresh();
  return hardwareList;
}

nativeBinding.getTemperature = getTemperature;
nativeBinding.getHardwareList = getHardwareList;
nativeBinding.getTemperatureAsync = getTemperatureAsync;
nativeBinding.getHardwareListAsync = getHardwareListAsync;
nativeBinding.dispose = dispose;

module.exports = nativeBinding;
