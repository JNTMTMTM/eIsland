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
 * @file cdp.mjs
 * @description 为隔离的原生测试进程等待 WebView2 调试端点，统一冷启动期限和退出诊断。
 * @author 鸡哥
 */
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from '@playwright/test';

/** 等待本次测试启动的进程，连接失败不会掩盖启动错误或无限等待。
 * @param app - 本次测试拥有的 ChildProcess。
 * @param endpoint - 本次测试的 CDP HTTP 地址。
 * @param options - 启动期限、诊断回调和可测试的 CDP 连接边界。
 * @param options.timeout - 冷启动总期限，默认 60 秒。
 * @param options.diagnostics - 返回被测进程的启动阶段与错误日志。
 * @param options.connect - CDP 连接函数，单次尝试最多 1 秒。
 * @returns 已连接的真实 WebView2 浏览器。
 */
export default async function connectNative(app, endpoint, { timeout = 60000, diagnostics = () => '', connect = chromium.connectOverCDP.bind(chromium) } = {}) {
  const started = Date.now();
  const deadline = started + timeout;
  let lastError;
  let spawnError;
  const onError = (error) => { spawnError = error; };
  app.on('error', onError);
  try {
    while (Date.now() < deadline) {
      if (spawnError || app.exitCode !== null || app.signalCode !== null) break;
      try {
        // eslint-disable-next-line no-await-in-loop -- 每次尝试必须受总期限约束。
        return await connect(endpoint, { timeout: Math.max(1, Math.min(1000, deadline - Date.now())) });
      } catch (error) { lastError = error; }
      // eslint-disable-next-line no-await-in-loop -- 只等待本任务拥有的进程冷启动。
      await delay(Math.max(0, Math.min(250, deadline - Date.now())));
    }
    const cause = spawnError ?? lastError;
    throw new Error([
      `Native WebView2 CDP startup failed: ${JSON.stringify({ endpoint, pid: app.pid, elapsedMs: Date.now() - started, timeoutMs: timeout, exitCode: app.exitCode, signal: app.signalCode })}`,
      cause?.message ?? 'Application exited before WebView2 became ready',
      diagnostics(),
    ].join('\n'), { cause });
  } finally { app.removeListener('error', onError); }
}
