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

/** @file smoke.mjs
 * @description 在真实 WebView2 中验证全部窗口和动画握手，使用隔离的数据目录。
 * @author 鸡哥
 */
/* global window, bgImage -- Playwright 回调在被测 WebView 中运行。 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = resolve(root, 'src-tauri/target/smoke');
mkdirSync(output, { recursive: true });
mkdirSync(resolve(output, 'store'), { recursive: true });
writeFileSync(resolve(output, 'store/island-shape-mode.json'), JSON.stringify('notch'));
writeFileSync(resolve(output, 'store/island-scale.json'), '100');
const port = 9224;
const app = spawn(resolve(root, 'src-tauri/target/debug/eisland.exe'), [], {
  cwd: root, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'],
  env: { ...process.env, EISLAND_WEBVIEW_DEBUG_ARGS: `--remote-debugging-port=${port}`,
    EISLAND_DATA_DIR: resolve(output, 'store'), WEBVIEW2_USER_DATA_FOLDER: resolve(output, 'webview') },
});
let stderr = '';
app.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
let browser;
/** 等待本任务启动的调试端点。
 * @param attempts - 剩余重试次数。
 * @returns CDP 浏览器连接。
 */
async function connect(attempts = 80) {
  try { return await chromium.connectOverCDP(`http://127.0.0.1:${port}`); }
  catch (error) {
    if (attempts === 0 || app.exitCode !== null) throw new Error(`${error.message}\n${stderr}`, { cause: error });
    await delay(250);
    return connect(attempts - 1);
  }
}
/** 查找真实宿主创建的窗口页面。
 * @param label - 固定窗口标签。
 * @param attempts - 剩余重试次数。
 * @returns 页面。
 */
async function pageFor(label, attempts = 80) {
  const pages = browser.contexts().flatMap((context) => context.pages());
  const labels = await Promise.all(pages.map(async (page) => {
    try { return await page.evaluate(() => window.__TAURI_INTERNALS__?.metadata?.currentWindow?.label); }
    catch { return null; }
  }));
  const index = labels.indexOf(label);
  if (index >= 0) {
    await pages[index].waitForFunction(() => Boolean(window.api));
    return pages[index];
  }
  assert(attempts > 0, `Missing window ${label}`);
  await delay(100);
  return pageFor(label, attempts - 1);
}
/** 调用真实 Rust 路由。
 * @param page - 发送窗口。
 * @param channel - 业务通道。
 * @param args - 参数。
 * @returns Rust 返回值。
 */
async function ipc(page, channel, ...args) {
  if (channel === 'window:close' || channel === 'capture-cancel') {
    const closed = page.waitForEvent('close');
    await page.evaluate(({ channel, args }) => window.electron.ipcRenderer.send(channel, ...args), { channel, args });
    await closed;
    return null;
  }
  return page.evaluate(({ channel, args }) => window.__TAURI__.core.invoke('desktop_ipc', { channel, args }), { channel, args });
}
try {
  browser = await connect();
  const main = await pageFor('main');
  const errors = [];
  main.on('pageerror', (error) => errors.push(error.message));
  const guide = await pageFor('guide');
  await guide.waitForSelector('#root > *');
  await ipc(guide, 'window:close');
  await main.waitForSelector('#root > *');
  const packaged = process.argv.includes('--packaged');
  if (!packaged) {
    await main.evaluate(async () => {
      // eslint-disable-next-line import-x/extensions -- 浏览器直接请求 Vite 的 TypeScript 模块 URL。
      const { default: store } = await import('/store/isLandStore.ts');
      store.setState({ state: 'idle', uiStateLocked: true });
    });
  }
  await delay(1000);
  await ipc(main, 'window:expand-full');
  await ipc(main, 'window:transition:begin', 991);
  await ipc(main, 'window:collapse', 1000);
  assert.equal((await ipc(main, 'window:get-bounds')).width, 860, 'shrink must wait for animation');
  await ipc(main, 'window:transition:complete', 990);
  assert.equal((await ipc(main, 'window:get-bounds')).width, 860, 'stale ack must be ignored');
  await ipc(main, 'window:transition:complete', 991);
  assert.equal((await ipc(main, 'window:get-bounds')).width, 260);
  await ipc(main, 'island:scale:set', 125);
  await ipc(main, 'island:shape-mode:set', 'pill');
  await delay(100);
  await ipc(main, 'window:collapse');
  assert.equal((await ipc(main, 'window:get-bounds')).height, 65);
  await ipc(main, 'island:scale:set', 100);
  await ipc(main, 'island:shape-mode:set', 'notch');
  assert.equal(await ipc(main, 'app:open-standalone-window'), true);
  const standalone = await pageFor('standalone');
  await standalone.waitForSelector('#root > *');
  await assert.rejects(ipc(standalone, 'window:expand-full'), /restricted to main/);
  await ipc(standalone, 'window:maximize');
  await ipc(standalone, 'window:maximize');
  await ipc(standalone, 'window:minimize');
  await ipc(main, 'app:open-standalone-window');
  await ipc(standalone, 'window:close');
  await ipc(main, 'cli-glow:show');
  const glow = await pageFor('cli-glow');
  await glow.waitForSelector('#lightCanvas');
  await ipc(main, 'cli-glow:hide');
  await ipc(main, 'cli-glow:show');
  await delay(600);
  assert((await ipc(main, 'debug:windows')).some((w) => w.label === 'cli-glow'), 'old fade must not close reopened effect');
  await ipc(main, 'cli-glow:hide');
  await ipc(main, 'agent-voice-input:show');
  await pageFor('agent-voice-input');
  await ipc(main, 'agent-voice-input:hide');
  await ipc(main, 'debug:open-window', 'tray-menu');
  const menu = await pageFor('tray-menu');
  await menu.waitForSelector('#root > *');
  await ipc(menu, 'tray-menu:close');
  await ipc(main, 'system:screenshot:region:start');
  const capture = await pageFor('capture');
  await capture.waitForFunction(() => typeof bgImage !== 'undefined' && bgImage?.width > 0);
  await ipc(capture, 'capture-cancel');
  await assert.rejects(ipc(main, 'store:read', '../secrets'), /Invalid store key/);
  await assert.rejects(ipc(main, 'media:play-pause'), /not migrated/);
  assert.deepEqual(errors, [], 'main page must remain mounted without runtime exceptions');
  await main.screenshot({ path: resolve(output, 'main.png'), omitBackground: true });
  console.log('PASS: real WebView2 main, guide, standalone, tray, capture, voice, glow, transitions, scale, sender checks');
  console.log(JSON.stringify(await ipc(main, 'debug:windows')));
} finally {
  if (browser) await browser.close();
  app.kill();
}
