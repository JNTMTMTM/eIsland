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
 * @file updater-services.test.mjs
 * @description 隔离 WebView2 中验证官方签名更新、错误拒绝和事件；从不执行更新安装。
 * @author 鸡哥
 */
/* global window -- Playwright callbacks execute in the isolated WebView2. */
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { existsSync, globSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { basename, join, resolve, sep } from 'node:path';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import connectNative from './cdp.mjs';
import withoutSigningSecrets from './environment.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const configured = process.platform === 'win32' && process.env.EISLAND_SMOKE_BINARY && process.env.TAURI_SIGNING_PRIVATE_KEY && process.env.TAURI_UPDATER_PUBLIC_KEY;
/** Poll a local app operation with an explicit deadline.
 * @param query - Local operation.
 * @param accept - Acceptance predicate.
 * @param timeout - Deadline in milliseconds.
 * @returns Accepted value.
 */
async function until(query, accept = Boolean, timeout = 20000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    // eslint-disable-next-line no-await-in-loop -- Connection retries depend on process startup.
    const value = await query(); if (accept(value)) return value;
    // eslint-disable-next-line no-await-in-loop -- Bound polling of one isolated process.
    await delay(40);
  }
  throw new Error('Native updater fixture timed out');
}

const skip = configured ? false : 'Requires an isolated debug executable and temporary updater signing identity; production secrets are not required';
test('official updater validates signed downloads through a real isolated WebView without installation', { skip, timeout: 180000 }, async (t) => {
  const binary = process.env.EISLAND_SMOKE_BINARY;
  assert(existsSync(binary)); assert(/[\\/]debug[\\/]/u.test(binary), 'Only an explicitly supplied debug test binary may run');
  const directory = mkdtempSync(join(tmpdir(), 'eisland-updater-services-test-'));
  t.after(() => {
    const target = resolve(directory);
    assert(target.startsWith(resolve(tmpdir()) + sep) && basename(target).startsWith('eisland-updater-services-test-'));
    try { rmSync(target, { recursive: true, force: true }); } catch { /* WebView2 may briefly retain its isolated profile. */ }
  });
  const store = join(directory, 'store'); mkdirSync(store);
  ['startup-animation-enabled', 'update-auto-prompt-enabled', 'first-launch'].forEach((key) => writeFileSync(join(store, `${key}.json`), 'false'));
  const key = process.env.TAURI_SIGNING_PRIVATE_KEY;
  const signingEnv = { ...process.env, TAURI_SIGNING_PRIVATE_KEY: existsSync(key) ? readFileSync(key, 'utf8').trim() : key };
  const cli = join(root, 'node_modules/@tauri-apps/cli/tauri.js');
  const bytes = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(512 * 1024, 0x51)]);
  const payloads = new Map(); const signatures = new Map();
  ['99.0.0', '99.0.1'].forEach((version) => {
    const file = join(directory, `eIsland_${version}_x64-setup.exe`);
    writeFileSync(file, bytes);
    const signed = spawnSync(process.execPath, [cli, 'signer', 'sign', '--app-version', version, file], { env: signingEnv, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'], timeout: 30000 });
    assert(!signed.error && signed.status === 0, 'Official temporary test signing failed; private-key output is suppressed');
    payloads.set(version, basename(file)); signatures.set(version, readFileSync(`${file}.sig`, 'utf8').trim());
  });
  const otherFile = join(directory, 'other.exe'); writeFileSync(otherFile, Buffer.from('MZdifferent signed bytes'));
  const other = spawnSync(process.execPath, [cli, 'signer', 'sign', '--app-version', '99.0.0', otherFile], { env: signingEnv, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'], timeout: 30000 });
  assert(!other.error && other.status === 0, 'Official alternate temporary signing failed');
  const otherSignature = readFileSync(`${otherFile}.sig`, 'utf8').trim();
  const requests = []; let currentVersion; const fixture = { base: '' };
  const upstream = createServer((request, response) => {
    const path = new URL(request.url, 'http://fixture.invalid').pathname;
    requests.push(path); response.on('error', () => {});
    const [, mode] = path.split('/');
    if (path.endsWith('/latest.json')) {
      if (mode === 'failure') { response.writeHead(503); response.end('{}'); return; }
      let version = mode === 'switched' ? '99.0.1' : '99.0.0';
      if (mode === 'replay') version = '100.0.0';
      if (mode === 'same') version = currentVersion;
      if (mode === 'older') version = '0.0.1';
      const name = payloads.get(version) || payloads.get('99.0.0');
      const url = `${fixture.base}/${mode === 'esa' ? 'origin' : mode}/${name}`;
      const signature = mode === 'wrong-signature' ? otherSignature : signatures.get(version) || signatures.get('99.0.0');
      response.setHeader('Content-Type', 'application/json');
      const platform = { signature, url, format: 'nsis', size: bytes.length, sha512: createHash('sha512').update(bytes).digest('base64') };
      if (mode === 'missing-signature') delete platform.signature;
      response.end(JSON.stringify({ version, notes: 'Local official updater fixture', pub_date: '2026-01-01T00:00:00Z', runtime: 'tauri', platforms: { 'windows-x86_64': platform } })); return;
    }
    if (!path.endsWith('-setup.exe')) { response.writeHead(404); response.end(); return; }
    response.setHeader('Content-Length', bytes.length);
    if (mode === 'interrupted') { response.write(bytes.subarray(0, 4096)); setTimeout(() => response.destroy(), 30); return; }
    const content = Buffer.from(bytes); if (mode === 'tampered') content[32] ^= 0xff;
    let position = 0;
    const timer = setInterval(() => { const end = Math.min(content.length, position + 32768); response.write(content.subarray(position, end)); position = end; if (position === content.length) { clearInterval(timer); response.end(); } }, 4);
    response.on('close', () => clearInterval(timer));
  });
  upstream.listen(0, '127.0.0.1'); await once(upstream, 'listening');
  const base = `http://127.0.0.1:${upstream.address().port}`; fixture.base = base;
  const port = 9227;
  const app = spawn(binary, [], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'], env: {
    ...withoutSigningSecrets(process.env), EISLAND_DATA_DIR: store, EISLAND_WEBVIEW_DATA_DIR: join(directory, 'webview'), EISLAND_WEBVIEW_DEBUG_ARGS: `--remote-debugging-port=${port}`,
    EISLAND_TAURI_UPDATE_ESA_URL: `${base}/esa/latest.json`, EISLAND_TAURI_UPDATE_R2_URL: `${base}/valid/latest.json`, EISLAND_TAURI_UPDATE_GITHUB_URL: `${base}/valid/latest.json`,
  } });
  let diagnostics = ''; app.stderr.on('data', (chunk) => { diagnostics = (diagnostics + chunk.toString()).slice(-16000); });
  let browser; let page;
  try {
    browser = await connectNative(app, `http://127.0.0.1:${port}`, { diagnostics: () => diagnostics });
    page = await until(async () => {
      const candidates = browser.contexts().flatMap((context) => context.pages());
      const labels = await Promise.all(candidates.map(async (candidate) => { try { return await candidate.evaluate(() => window.__TAURI_INTERNALS__?.metadata?.currentWindow?.label); } catch { return null; } }));
      return candidates[labels.indexOf('main')];
    });
    await page.waitForFunction(() => typeof window.api?.updaterDownload === 'function');
    const api = (name, ...args) => {
      assert.notEqual(name, 'updaterInstall', 'This suite must never execute an installer');
      return page.evaluate(({ name, args }) => window.api[name](...args), { name, args });
    };
    currentVersion = await page.evaluate(() => window.__TAURI__.core.invoke('desktop_ipc', { channel: 'updater:version', args: [] }));
    await page.evaluate(() => {
      window.__updaterFixture = { progress: [], available: [], absent: [], downloaded: [], errors: [] };
      window.__updaterFixtureOff = [window.api.onUpdaterProgress((value) => window.__updaterFixture.progress.push(value)), window.api.onUpdaterAvailable((value) => window.__updaterFixture.available.push(value)), window.api.onUpdaterNotAvailable((value) => window.__updaterFixture.absent.push(value)), window.api.onUpdaterDownloaded((value) => window.__updaterFixture.downloaded.push(value)), window.desktop.on('updater:error', (value) => window.__updaterFixture.errors.push(value))];
    });
    const sourceArgs = (mode) => ['tencent-cos', `${base}/${mode}/latest.json`];
    await t.test('signed hybrid feed checks, verifies real bytes, emits progress and switches version', async () => {
      const result = await api('updaterCheck', ...sourceArgs('valid'));
      assert.equal(result.available, true, result.error); assert.equal(result.version, '99.0.0');
      assert.equal(await api('updaterDownload', ...sourceArgs('valid')), true);
      const events = await until(() => page.evaluate(() => window.__updaterFixture), (value) => value.downloaded.some((event) => event.version === '99.0.0'));
      assert(events.progress.some((value) => value.transferred > 0 && value.total === bytes.length));
      assert(events.available.some((event) => event.version === '99.0.0'));
      const switched = await api('updaterCheck', ...sourceArgs('switched')); assert.equal(switched.version, '99.0.1');
      assert.equal(await api('updaterDownload', ...sourceArgs('switched')), true);
      await until(() => page.evaluate(() => window.__updaterFixture.downloaded.at(-1)), (value) => value?.version === '99.0.1');
    });
    await t.test('tampered bytes, wrong signature and replayed signed version are rejected', async () => {
      // eslint-disable-next-line no-restricted-syntax -- Native updater state must be exercised serially.
      for (const mode of ['tampered', 'wrong-signature', 'replay']) {
        // eslint-disable-next-line no-await-in-loop -- Test each official update operation sequentially.
        assert.equal(await api('updaterDownload', ...sourceArgs(mode)), false, mode);
      }
      const errors = await page.evaluate(() => window.__updaterFixture.errors); assert(errors.length >= 3);
    });
    await t.test('same and older versions are not offered and unsigned/failed feeds cannot download', async () => {
      // eslint-disable-next-line no-restricted-syntax -- Native updater state must be exercised serially.
      for (const mode of ['same', 'older']) {
        // eslint-disable-next-line no-await-in-loop -- Updater invalidation is stateful.
        const result = await api('updaterCheck', ...sourceArgs(mode)); assert.equal(result.available, false); assert.equal(result.version, currentVersion);
      }
      // eslint-disable-next-line no-restricted-syntax -- Native updater state must be exercised serially.
      for (const mode of ['missing-signature', 'failure']) {
        // eslint-disable-next-line no-await-in-loop -- Native operations share an updater lock.
        assert.equal(await api('updaterDownload', ...sourceArgs(mode)), false);
      }
    });
    await t.test('interrupted downloads fail without a downloaded event and the next signed request succeeds', async () => {
      const before = await page.evaluate(() => window.__updaterFixture.downloaded.length);
      assert.equal(await api('updaterDownload', ...sourceArgs('interrupted')), false);
      assert.equal(await page.evaluate(() => window.__updaterFixture.downloaded.length), before);
      assert.equal(await api('updaterDownload', ...sourceArgs('valid')), true);
    });
    await t.test('ESA selection routes the same signed bytes through CDN directory and source URLs remain isolated', async () => {
      assert.equal(await api('updaterDownload', 'esa-cdn'), true);
      assert(requests.some((path) => path === `/esa/${payloads.get('99.0.0')}`));
      assert(!requests.some((path) => path === `/origin/${payloads.get('99.0.0')}`));
      assert.equal((await api('updaterCheck', 'cloudflare-r2')).available, true);
      assert.equal((await api('updaterCheck', 'github')).available, true);
      const rejected = await api('updaterCheck', 'tencent-cos', `http://user:password@127.0.0.1:${upstream.address().port}/valid/latest.json`);
      assert.equal(rejected.available, false); assert(rejected.error);
      assert.equal(await page.locator('#root > *').count() > 0, true); assert.equal(app.exitCode, null);
    });
  } catch (error) { error.message += `\nIsolated updater diagnostics:\n${diagnostics}`; throw error; }
  finally {
    const exited = app.exitCode === null ? once(app, 'exit') : Promise.resolve();
    if (page && app.exitCode === null) { try { await page.evaluate(() => window.desktop.send('app:quit')); } catch { /* The WebView may close while acknowledging quit. */ } }
    await Promise.race([exited, delay(5000)]);
    if (app.exitCode === null) { app.kill(); await Promise.race([exited, delay(3000)]); }
    if (browser) await browser.close(); upstream.closeAllConnections(); upstream.close();
    if (process.env.LLVM_PROFILE_FILE) { const profile = process.env.LLVM_PROFILE_FILE.replaceAll('%p', String(app.pid)).replace(/%\d*m/gu, '*').replaceAll('\\', '/'); assert(globSync(profile).length > 0, 'Updater GUI execution profile was not flushed'); }
  }
});
