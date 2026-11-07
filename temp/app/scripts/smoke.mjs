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
 * @file smoke.mjs
 * @description 真实 Electron 隔离 profile 的四语言向导与 IPC 冒烟，不读取真实业务数据或执行安装。
 * @author 鸡哥
 */
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { _electron as electron } from '@playwright/test';
import withoutSigningSecrets from '../../../scripts/native/environment.mjs';
import { publicKey } from './config.mjs';

const root = await mkdtemp(join(tmpdir(), 'eisland-adapter-webview-'));
await mkdir(join(root, 'roaming/eIsland/eIsland_store'), { recursive: true });
const history = join(root, 'roaming/eIsland/eIsland_store/download-history.json');
await writeFile(history, '{"isolated":true}');
const env = withoutSigningSecrets(process.env);
delete env.ELECTRON_RUN_AS_NODE;
const app = await electron.launch({ args: [resolve('.')], env: { ...env, EISLAND_ADAPTER_TEST_ROOT: root }, timeout: 30000 });
try {
  const page = await app.firstWindow();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.locator('h1').waitFor();
  const language = page.locator('header button[aria-haspopup="menu"]');
  await [['zh-CN', '准备好，迎接新的 eIsland'], ['zh-TW', '準備好，迎接新的 eIsland'], ['en-US', 'Get ready for the next eIsland'], ['ja-JP', '新しい eIsland の準備をしましょう']].reduce(async (previous, [locale, title]) => {
    await previous;
    await language.click();
    await page.locator(`button[role="menuitemradio"][value="${locale}"]`).click();
    assert.equal(await page.locator('h1').innerText(), title);
    assert.equal(await page.evaluate(() => document.documentElement.lang), locale);
  }, Promise.resolve());
  await language.click();
  await page.locator('button[role="menuitemradio"][value="zh-CN"]').click();
  await language.click();
  await page.waitForFunction(() => [...document.querySelectorAll('header img')].every((image) => image.complete && image.naturalWidth > 0));
  await mkdir('test-results', { recursive: true });
  await page.screenshot({ path: 'test-results/language-menu.png' });
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.locator(':focus').getAttribute('value'), 'zh-TW');
  await page.keyboard.press('Escape');
  assert.equal(await language.getAttribute('aria-expanded'), 'false');
  await language.click();
  await page.locator('h1').click();
  assert.equal(await language.getAttribute('aria-expanded'), 'false');
  const sources = page.locator('fieldset button');
  assert.equal(await sources.count(), 3);
  assert.equal(await page.locator('section select').count(), 0);
  await ['r2', 'github', 'esa'].reduce(async (previous, source) => {
    await previous;
    await page.locator(`button[value="${source}"]`).click();
    assert.equal(await page.locator('fieldset button[aria-pressed="true"]').getAttribute('value'), source);
  }, Promise.resolve());
  await page.waitForFunction(() => [...document.querySelectorAll('fieldset img')].every((image) => image.complete && image.naturalWidth > 0));
  const boundary = await page.evaluate(() => ({ node: typeof globalThis.process, require: typeof globalThis.require, api: Object.keys(window.migration).sort() }));
  assert.equal(boundary.node, 'undefined'); assert.equal(boundary.require, 'undefined');
  assert.deepEqual(boundary.api, ['cancel', 'chooseLocal', 'close', 'dismissError', 'getState', 'inspect', 'install', 'launch', 'onState', 'openBackup', 'prepare']);
  const profile = await app.evaluate(({ app: host }) => host.getPath('userData'));
  assert.equal(profile, join(root, 'profile'));
  await mkdir('test-results', { recursive: true });
  await page.screenshot({ path: 'test-results/welcome.png' });
  // 第二个窗口即使加载同一入口及 preload，sender 也不能越过唯一主窗口边界。
  const foreign = await app.evaluate(async ({ BrowserWindow }, preload) => {
    const [owner] = BrowserWindow.getAllWindows();
    const window = new BrowserWindow({ show: false, webPreferences: { preload, sandbox: true, contextIsolation: true, nodeIntegration: false } });
    try {
      await window.loadURL(owner.webContents.getURL());
      return await window.webContents.executeJavaScript('(async () => { if (!window.migration) return "NO_API"; try { await window.migration.getState(); return "UNEXPECTED"; } catch { return "DENIED"; } })()');
    } finally { window.destroy(); }
  }, resolve('out/preload/index.js'));
  assert.equal(foreign, 'DENIED');
  const denied = await app.evaluate(async ({ BrowserWindow }) => {
    const [window] = BrowserWindow.getAllWindows();
    const frame = window.webContents.mainFrame;
    return { sandbox: window.webContents.getLastWebPreferences().sandbox, isolated: window.webContents.getLastWebPreferences().contextIsolation, origin: frame.url };
  });
  assert.equal(denied.sandbox, true); assert.equal(denied.isolated, true);
  const state = await page.evaluate(() => window.migration.getState());
  assert.equal(state.signingConfigured, Boolean(publicKey()), 'compiled adapter must match the configured public-key presence');
  if (!state.signingConfigured) {
    await page.getByRole('button', { name: '检查新版本' }).click();
    await page.getByRole('alert').waitFor();
    assert.match(await page.getByRole('alert').innerText(), /公钥/);
    assert.equal((await page.evaluate(() => window.migration.getState())).phase, 'error');
    assert.equal(await page.getByRole('alert').locator('svg').count(), 2);
    await page.screenshot({ path: 'test-results/error.png' });
    await page.getByRole('button', { name: '关闭并返回上一步' }).click();
    await page.getByRole('heading', { name: '准备好，迎接新的 eIsland' }).waitFor();
    assert.equal(await page.getByRole('alert').count(), 0);
    assert.equal((await page.evaluate(() => window.migration.getState())).phase, 'welcome');
    await page.getByRole('button', { name: '检查新版本' }).click();
    await page.getByRole('alert').waitFor();
  }
  assert.equal(await readFile(history, 'utf8'), '{"isolated":true}');
  assert.deepEqual(errors, []);
  console.log('PASS: real Electron guide, four locales, isolated profile, sandbox, fixed preload API, foreign-sender denial and missing-key refusal');
} finally {
  await app.close();
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
