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
 * @description 启动项、计划任务、服务查询 helper 的 Node 入口，异步调用 eIslandStartupReader.exe 并解析 JSON 结果
 * @author 鸡哥
 */

const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const EXE_NAME = 'eIslandStartupReader.exe';
const RID = `win-${process.arch === 'ia32' ? 'x86' : process.arch}`;

/**
 * 打包后 __dirname 位于 app.asar 内，EXE 无法从归档中直接启动，需改用 asarUnpack 解出的真实路径
 * @param {string} candidate - 基于 __dirname 的候选路径
 * @returns {string} 指向 app.asar.unpacked 的路径；未打包时原样返回
 */
function toUnpackedPath(candidate) {
  return candidate.replace(`${path.sep}app.asar${path.sep}`, `${path.sep}app.asar.unpacked${path.sep}`);
}

// SelfContained 构建会输出到 RID 子目录，同时保留无 RID 目录以兼容旧版 SDK
const helperCandidates = [
  path.join(__dirname, 'src', 'bin', 'Release', 'net10.0', RID, EXE_NAME),
  path.join(__dirname, 'src', 'bin', 'Release', 'net10.0', EXE_NAME),
  path.join(__dirname, 'src', 'bin', 'Debug', 'net10.0', RID, EXE_NAME),
  path.join(__dirname, 'src', 'bin', 'Debug', 'net10.0', EXE_NAME),
].map(toUnpackedPath);

/** @type {string | null | undefined} — undefined 表示尚未解析 */
let cachedHelperPath;

/**
 * helper 不可用或调用失败时抛出的错误，用于和"查询成功但结果为空"区分
 */
class StartupHelperError extends Error {
  /**
   * @param {string} message - 错误描述
   * @param {ErrorOptions} [options] - 可选的 cause
   */
  constructor(message, options) {
    super(message, options);
    this.name = 'StartupHelperError';
  }
}

/**
 * 查找 helper EXE 路径（首次解析后缓存）
 * @returns {string | null} 存在的 EXE 路径；全部候选均不存在时返回 null
 */
function findHelper() {
  if (cachedHelperPath !== undefined) {
    return cachedHelperPath;
  }
  cachedHelperPath = helperCandidates.find((c) => fs.existsSync(c)) ?? null;
  return cachedHelperPath;
}

/**
 * 异步调用 helper EXE，不阻塞调用方事件循环
 * @param {string[]} args - helper 命令行参数，首项为查询命令（startup / tasks / services）
 * @param {number} [timeout=15000] - 进程超时毫秒数，默认 15000
 * @returns {Promise<{items: any[], errors: Array<{source: string, message: string}>}>} 查询结果
 * @throws {StartupHelperError} helper 缺失、启动失败、非零退出、超时或输出非法 JSON 时 reject
 */
function callHelper(args, timeout = 15000) {
  const helperPath = findHelper();
  if (!helperPath) {
    return Promise.reject(new StartupHelperError(
      `Helper executable not found. Searched: ${helperCandidates.join(', ')}`,
    ));
  }

  return new Promise((resolve, reject) => {
    childProcess.execFile(helperPath, args, {
      encoding: 'utf8',
      windowsHide: true,
      timeout,
      maxBuffer: 32 * 1024 * 1024,
    }, (error, stdout, stderr) => {
      if (error) {
        const detail = stderr?.trim() || error.message;
        reject(new StartupHelperError(`Helper "${args[0]}" failed: ${detail}`, { cause: error }));
        return;
      }

      let parsed;
      try {
        parsed = JSON.parse(stdout);
      } catch (parseError) {
        reject(new StartupHelperError(`Helper "${args[0]}" returned invalid JSON`, { cause: parseError }));
        return;
      }

      if (!Array.isArray(parsed?.items) || !Array.isArray(parsed?.errors)) {
        reject(new StartupHelperError(`Helper "${args[0]}" returned unexpected payload`));
        return;
      }
      resolve(parsed);
    });
  });
}

/**
 * 获取启动项（注册表 Run / RunOnce 键与启动文件夹）
 * @returns {Promise<import('.').QueryResult<import('.').StartupItem>>} 启动项及无法读取的位置
 * @throws {StartupHelperError} helper 不可用或调用失败
 */
function getStartupItems() {
  return callHelper(['startup']);
}

/**
 * 获取计划任务（遍历全部目录，包含隐藏任务）
 * @returns {Promise<import('.').QueryResult<import('.').ScheduledTaskInfo>>} 计划任务及无法读取的目录 / 任务
 * @throws {StartupHelperError} helper 不可用或调用失败
 */
function getScheduledTasks() {
  return callHelper(['tasks']);
}

/**
 * 获取 Windows 服务
 * @returns {Promise<import('.').QueryResult<import('.').ServiceInfo>>} 服务列表及配置读取失败的服务
 * @throws {StartupHelperError} helper 不可用或调用失败
 */
function getServices() {
  return callHelper(['services']);
}

module.exports = {
  StartupHelperError,
  getStartupItems,
  getScheduledTasks,
  getServices,
  /**
   * 清除缓存的 helper 路径，仅供测试使用
   * @returns {void} 无返回值
   */
  __resetHelperCache() {
    cachedHelperPath = undefined;
  },
};
