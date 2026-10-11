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
 * @file async-control.js
 * @description 合并短期控制请求，避免重复启动辅助进程和积压过期滑块值。
 * @author 鸡哥
 */

/**
 * 创建一次性异步 helper 控制器，共享读取并合并尚未发送的目标值。
 * @param {Function} call - 有超时限制的异步 helper 调用
 * @param {string} readCommand - 读取命令
 * @param {string} writeCommand - 设置命令
 * @returns {{get: Function, set: Function}} 带读取缓存和末值队列的控制器
 */
function createAsyncControl(call, readCommand, writeCommand) {
  let cached = null;
  let expiresAt = 0;
  let reading = null;
  let writing = null;
  let pending;
  const get = () => {
    if (writing) return writing.then(get);
    if (Date.now() < expiresAt) return Promise.resolve(cached);
    if (!reading) {
      reading = call([readCommand]).then((result) => {
        cached = result;
        expiresAt = Date.now() + 250;
        return result;
      }).finally(() => { reading = null; });
    }
    return reading;
  };
  const set = (value) => {
    pending = value;
    expiresAt = 0;
    if (!writing) {
      // 延至微任务开始，合并同一轮的连续滑块值；读取结束后才写，防止缓存倒序。
      writing = Promise.resolve().then(async () => {
        if (reading) await reading;
        let success = false;
        while (pending !== undefined) {
          const target = pending;
          pending = undefined;
          const result = await call([writeCommand, String(target)]);
          success = result?.success === true;
        }
        return success;
      }).finally(() => {
        writing = null;
        expiresAt = 0;
        // 最后一次 await 恢复与 finally 之间仍可能收到新值，必须继续排空。
        if (pending !== undefined) return set(pending);
      });
    }
    return writing;
  };
  return { get, set };
}

module.exports = { createAsyncControl };
