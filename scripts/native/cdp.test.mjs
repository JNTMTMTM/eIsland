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
 * @file cdp.test.mjs
 * @description 验证原生 CDP 冷启动重试、总期限、进程退出和启动错误的诊断契约。
 * @author 鸡哥
 */
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { test } from 'node:test';
import connectNative from './cdp.mjs';

/** 构造仅包含连接器所需生命周期边界的测试进程。
 * @returns 隔离的进程事件替身。
 */
function processFixture() {
  return Object.assign(new EventEmitter(), { pid: 1234, exitCode: null, signalCode: null });
}

test('CDP readiness retries connection refusals and bounds each attempt', async () => {
  const app = processFixture();
  const browser = {};
  let attempts = 0;
  const connected = await connectNative(app, 'http://127.0.0.1:9224', {
    timeout: 2000,
    connect: async (endpoint, { timeout }) => {
      assert.equal(endpoint, 'http://127.0.0.1:9224');
      assert(timeout > 0 && timeout <= 1000);
      attempts += 1;
      if (attempts < 3) throw new Error('ECONNREFUSED');
      return browser;
    },
  });
  assert.equal(connected, browser);
  assert.equal(attempts, 3);
  assert.equal(app.listenerCount('error'), 0);
});

test('CDP failure retains the final error, endpoint, process state and startup stage', async () => {
  const app = processFixture();
  const refused = new Error('ECONNREFUSED');
  await assert.rejects(connectNative(app, 'http://127.0.0.1:9224', {
    timeout: 25, diagnostics: () => '[WebView] creating main',
    connect: async (_endpoint, { timeout }) => { assert(timeout > 0 && timeout <= 25); throw refused; },
  }), (error) => {
    assert.equal(error.cause, refused);
    assert.match(error.message, /"pid":1234/u);
    assert.match(error.message, /"timeoutMs":25/u);
    assert.match(error.message, /"exitCode":null/u);
    assert.match(error.message, /ECONNREFUSED/u);
    assert.match(error.message, /\[WebView\] creating main/u);
    return true;
  });
  assert.equal(app.listenerCount('error'), 0);
});

test('CDP stops on normal exit or signal without connecting to another instance', async () => {
  await Promise.all([{ exitCode: 0 }, { signalCode: 'SIGTERM' }].map(async (state) => {
    const app = Object.assign(processFixture(), state);
    await assert.rejects(connectNative(app, 'http://127.0.0.1:9224', {
      connect: () => assert.fail('Exited application must never connect'),
    }), /Application exited before WebView2 became ready/u);
    assert.equal(app.listenerCount('error'), 0);
  }));
});

test('CDP reports a spawn error and releases its listener', async () => {
  const app = processFixture();
  const missing = Object.assign(new Error('spawn eisland.exe ENOENT'), { code: 'ENOENT' });
  let attempts = 0;
  await assert.rejects(connectNative(app, 'http://127.0.0.1:9224', {
    connect: async () => {
      attempts += 1;
      app.emit('error', missing);
      throw new Error('ECONNREFUSED');
    },
  }), (error) => { assert.equal(error.cause, missing); return true; });
  assert.equal(attempts, 1);
  assert.equal(app.listenerCount('error'), 0);
});
