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
 * @file toolbox-services.test.mjs
 * @description 在隔离原生进程中验证工具箱公开 API、真实文件哈希/ICO 和本地 HTTP 服务适配。
 * @author 鸡哥
 */
/* global window, document, Image -- 回调在真实 WebView2 页面执行。 */
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { existsSync, globSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';
import connectNative from './cdp.mjs';
import { cargoTargetDirectory } from './release-artifacts.mjs';
import withoutSigningSecrets from './environment.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const binary = process.env.EISLAND_SMOKE_BINARY || join(cargoTargetDirectory(root), 'debug/eisland.exe');
/** 等待真实本地进程或任务状态，不忽略最终超时。
 * @param query - 被测异步操作。
 * @param accept - 成功判定。
 * @param timeout - 最多等待时间。
 * @returns 最后成功的操作结果。
 */
async function until(query, accept = Boolean, timeout = 20000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    // eslint-disable-next-line no-await-in-loop -- 后续查询依赖前一个真实状态。
    const value = await query();
    if (accept(value)) return value;
    // eslint-disable-next-line no-await-in-loop -- 对隔离应用限频。
    await delay(40);
  }
  throw new Error('Native toolbox operation timed out');
}

test('toolbox public APIs operate on real native files and bounded local HTTP services', { skip: process.platform !== 'win32', timeout: 180000 }, async (t) => {
  assert(existsSync(binary), 'Build the isolated native app before running toolbox services tests');
  const directory = mkdtempSync(join(tmpdir(), 'eisland-toolbox-test-'));
  const store = join(directory, 'store'); mkdirSync(store);
  writeFileSync(join(store, 'startup-animation-enabled.json'), 'false');
  writeFileSync(join(store, 'standalone-window-active-tab.json'), '"toolbox"');
  writeFileSync(join(store, 'clipboard-url-detection-enabled.json'), 'false');
  const sample = Buffer.concat([Buffer.from('工具箱哈希测试\n'), Buffer.alloc(8 * 1024 * 1024, 0x42)]);
  const file = join(directory, 'hash-fixture.bin'); writeFileSync(file, sample);
  writeFileSync(join(store, 'download-tasks.json'), JSON.stringify([{ id: 'legacy-download', fileName: { Windows: [65] }, savePath: join(directory, '历史😀.zip'), status: 'completed', totalBytes: 12, downloadedBytes: 12, progress: 1, speedBytesPerSecond: 0, estimatedFinishAt: null, threads: 8, createdAt: 1, updatedAt: 2, _parts: [] }]));
  writeFileSync(join(store, 'image-compression-tasks.json'), JSON.stringify([{ id: 'legacy-image', fileName: { Windows: [66] }, inputPath: join(directory, '压缩😀.png'), outputPath: join(directory, '压缩-output.png'), status: 'completed', success: true, originalBytes: 20, compressedBytes: 12, ratio: 0.4, quality: 80, createdAt: 1, updatedAt: 2 }]));
  const requests = [];
  const upstream = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk); // eslint-disable-line no-restricted-syntax -- 真实流式请求边界。
    const body = Buffer.concat(chunks).toString('utf8');
    const path = new URL(request.url, 'http://fixture.invalid').pathname;
    requests.push({ body, path, method: request.method, range: request.headers.range, authorization: request.headers.authorization });
    response.setHeader('Content-Type', 'application/json');
    if (path === '/file') {
      response.setHeader('Content-Length', sample.length); response.setHeader('Accept-Ranges', 'bytes');
      if (request.method === 'HEAD') { response.end(); return; }
      const range = request.headers.range?.match(/^bytes=(\d+)-(\d+)$/);
      if (range) {
        const start = Number(range[1]); const end = Math.min(Number(range[2]), sample.length - 1);
        response.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${sample.length}`, 'Content-Length': end - start + 1 });
        let cursor = start;
        const timer = setInterval(() => { const next = Math.min(cursor + 16384, end + 1); response.write(sample.subarray(cursor, next)); cursor = next; if (cursor > end) { clearInterval(timer); response.end(); } }, 20);
        response.on('close', () => clearInterval(timer));
      } else response.end(sample);
      return;
    }
    if (path === '/redirect') { response.writeHead(302, { Location: '/echo' }); response.end(); return; }
    if (path === '/slow') {
      const timer = setTimeout(() => response.end('{}'), 300);
      response.on('close', () => clearTimeout(timer)); return;
    }
    if (path === '/large') { response.setHeader('Content-Length', 16 * 1024 * 1024 + 1); response.end(Buffer.alloc(16 * 1024 * 1024 + 1)); return; }
    if (path === '/failure') { response.writeHead(503); response.end('{"error":"fixture unavailable"}'); return; }
    if (path === '/v1/toolbox/software/list') {
      response.end(JSON.stringify({ code: 200, data: [{ id: 1, name: 'Fixture software', description: 'Local native transport fixture', url: 'https://example.test/download', iconUrl: 'https://example.test/icon.png' }] })); return;
    }
    if (path === '/v1/toolbox/translate') {
      if (request.headers.authorization !== 'Bearer fixture-only-token') { response.writeHead(401); response.end('{}'); return; }
      const input = JSON.parse(body);
      response.end(JSON.stringify(input.text === 'business-error' ? { code: 400, message: 'fixture business error' } : { code: 200, data: { targetText: 'Hello native toolbox', source: input.source, target: input.target, requestId: 'fixture' } })); return;
    }
    response.end(JSON.stringify({ body, method: request.method, authorization: request.headers.authorization || null }));
  });
  upstream.listen(0, '127.0.0.1'); await once(upstream, 'listening');
  const base = `http://127.0.0.1:${upstream.address().port}`;
  const port = 9226;
  const app = spawn(binary, [], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'], env: {
    ...withoutSigningSecrets(process.env), EISLAND_DATA_DIR: store, EISLAND_WEBVIEW_DATA_DIR: join(directory, 'webview'), EISLAND_WEBVIEW_DEBUG_ARGS: `--remote-debugging-port=${port}`,
  } });
  let diagnostics = ''; app.stderr.on('data', (chunk) => { diagnostics = (diagnostics + chunk.toString()).slice(-16000); });
  let browser; let page;
  try {
    browser = await connectNative(app, `http://127.0.0.1:${port}`, { diagnostics: () => diagnostics });
    page = await until(async () => {
      const candidates = browser.contexts().flatMap((context) => context.pages());
      const labels = await Promise.all(candidates.map(async (candidate) => {
        try { return await candidate.evaluate(() => window.__TAURI_INTERNALS__?.metadata?.currentWindow?.label); } catch { return null; }
      }));
      return candidates[labels.indexOf('main')];
    });
    await page.waitForFunction(() => typeof window.api?.computeFileHash === 'function');
    const api = (name, ...args) => page.evaluate(({ name, args }) => window.api[name](...args), { name, args });
    await t.test('standalone toolbox renders old history, starts eight threads, pauses and resumes without disappearing', async () => {
      const oldDownload = (await api('downloadList')).find((task) => task.id === 'legacy-download');
      const oldImage = (await api('imageCompressionList')).find((task) => task.id === 'legacy-image');
      assert.equal(oldDownload.fileName, '历史😀.zip'); assert.equal(oldImage.fileName, '压缩😀.png');
      assert.equal(JSON.parse(readFileSync(join(store, 'download-tasks.json'), 'utf8'))[0].fileName, '历史😀.zip');
      assert.equal(JSON.parse(readFileSync(join(store, 'image-compression-tasks.json'), 'utf8'))[0].fileName, '压缩😀.png');
      assert.equal(await api('openStandaloneWindow'), true);
      const ui = await until(async () => {
        const candidates = browser.contexts().flatMap((context) => context.pages());
        const labels = await Promise.all(candidates.map(async (candidate) => {
          try { return await candidate.evaluate(() => window.__TAURI_INTERNALS__?.metadata?.currentWindow?.label); } catch { return null; }
        }));
        return candidates[labels.indexOf('standalone')];
      });
      const errors = []; ui.on('pageerror', (error) => errors.push(error.message));
      ui.on('console', (message) => { if (message.type() === 'error' && message.text().includes('Objects are not valid as a React child')) errors.push(message.text()); });
      const sidebar = ui.locator('.max-expand-settings-sidebar-item');
      await sidebar.nth(1).click();
      await ui.locator('.settings-app-page-dots button').nth(1).click();
      await ui.waitForFunction(() => document.querySelector('.download-task-card')?.parentElement.textContent.includes('历史😀.zip'));
      await sidebar.nth(7).click();
      await ui.locator('.settings-app-page-dots button').nth(1).click();
      await ui.waitForFunction(() => document.body.textContent.includes('压缩😀.png'));
      await sidebar.nth(1).click();
      await ui.locator('.settings-app-page-dots button').nth(0).click();
      const destination = join(directory, '真实多线程😀.bin');
      await ui.locator('.settings-field-input[type=text]').fill(`${base}/file`);
      await ui.locator('.download-save-path-input').fill(destination);
      await ui.locator('.download-threads-inline-input').fill('8');
      await ui.locator('.download-start-btn-full').first().click();
      const active = await until(async () => (await api('downloadList')).find((task) => task.savePath === destination), (task) => task?.status === 'downloading' && task.downloadedBytes > 0);
      assert.equal(active.threads, 8);
      const card = ui.locator('.download-task-card').filter({ hasText: '真实多线程😀.bin' });
      await card.locator('.download-task-actions button').first().click();
      await until(async () => (await api('downloadList')).find((task) => task.id === active.id), (task) => task.status === 'paused');
      await delay(200);
      await card.locator('.download-task-actions button').first().click();
      const completed = await until(async () => (await api('downloadList')).find((task) => task.id === active.id), (task) => task.status === 'completed');
      assert.equal(completed.fileName, '真实多线程😀.bin'); assert.equal(completed.downloadedBytes, sample.length); assert.equal(completed.progress, 1);
      assert.deepEqual(readFileSync(destination), sample);
      const ranges = requests.filter((request) => request.path === '/file' && request.method === 'GET').map((request) => request.range);
      const chunk = Math.ceil(sample.length / 8);
      assert(Array.from({ length: 8 }, (_, index) => index * chunk).every((start) => ranges.some((range) => range?.startsWith(`bytes=${start}-`))), 'all eight native range workers must request their own part');
      assert(ranges.some((range) => Number(range.match(/^bytes=(\d+)-/)[1]) % chunk !== 0), 'resume must request saved offsets rather than restart all parts');
      assert.equal(await card.count(), 1); assert((await card.textContent()).includes('100.0%'));
      assert.equal(await ui.locator('.cw-chrome').count(), 1); assert.deepEqual(errors, []);
      assert.equal(app.exitCode, null, 'native application must remain running after real UI history updates');
      await ui.screenshot({ path: join(root, 'src-tauri/target/toolbox-download-ui.png') });
    });
    await t.test('all four file hash algorithms read native bytes and missing files preserve null contract', async () => {
      const values = await Promise.all(['md5', 'sha1', 'sha256', 'sha512'].map(async (algorithm) => ({ algorithm, value: await api('computeFileHash', file, algorithm) })));
      values.forEach(({ algorithm, value }) => {
        assert.equal(value.hash, createHash(algorithm).update(sample).digest('hex'));
        assert.equal(value.algorithm, algorithm); assert.equal(value.fileSize, sample.length); assert.equal(value.fileName, basename(file));
      });
      assert.equal(await api('computeFileHash', join(directory, 'missing'), 'sha256'), null);
      const icon = await api('getFileIcon', binary);
      assert.equal(typeof icon, 'string'); assert(Buffer.from(icon, 'base64').subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])));
    });
    await t.test('native network preserves UTF-8 body, authorization, redirect, status and limits', async () => {
      const body = JSON.stringify({ text: '你好，工具箱', source: 'zh', target: 'en' });
      const result = await api('netFetch', `${base}/echo`, { body, method: 'POST', headers: { Authorization: 'Bearer fixture-only-token', 'Content-Type': 'application/json' } });
      assert.equal(result.ok, true); assert.deepEqual(JSON.parse(result.body), { body, method: 'POST', authorization: 'Bearer fixture-only-token' });
      assert.equal((await api('netFetch', `${base}/redirect`)).ok, true);
      assert.equal((await api('netFetch', `${base}/failure`)).status, 503);
      assert.equal((await api('netFetch', `${base}/slow`, { timeoutMs: 30 })).status, 408);
      assert.equal((await api('netFetch', `${base}/large`)).status, 413);
      assert.equal((await api('netFetch', 'file:///C:/private')).status, 400);
    });
    await t.test('real renderer translation and software adapters consume native HTTP responses', async () => {
      const bundle = buildSync({ absWorkingDir: root, stdin: { contents: 'export {fetchTranslate} from "./src/renderer/api/tools/toolboxTranslateApi";export {fetchToolboxSoftwareList} from "./src/renderer/api/tools/toolboxSoftwareApi";', resolveDir: root }, bundle: true, write: false, format: 'iife', globalName: '__toolboxAdapterFixture', platform: 'browser' });
      await page.addScriptTag({ content: bundle.outputFiles[0].text });
      const values = await page.evaluate(async (base) => {
        const original = window.api.netFetch;
        window.api.netFetch = (url, options) => original(`${base}${new URL(url).pathname.replace(/^\/api/, '')}`, options);
        try {
          const software = await window.__toolboxAdapterFixture.fetchToolboxSoftwareList();
          const translated = await window.__toolboxAdapterFixture.fetchTranslate('fixture-only-token', '你好', 'zh', 'en');
          const unauthorized = await window.__toolboxAdapterFixture.fetchTranslate('invalid-fixture-token', '你好', 'zh', 'en');
          const failure = await window.__toolboxAdapterFixture.fetchTranslate('fixture-only-token', 'business-error', 'zh', 'en');
          return { software, translated, unauthorized, failure };
        } finally { window.api.netFetch = original; }
      }, base);
      assert.equal(values.software[0].name, 'Fixture software');
      assert.equal(values.translated.success, true); assert.equal(values.translated.data.targetText, 'Hello native toolbox');
      assert.equal(values.unauthorized.success, false); assert.equal(values.failure.message, 'fixture business error');
      assert(requests.some((request) => request.path === '/v1/toolbox/translate' && JSON.parse(request.body).text === '你好'));
    });
    await t.test('download public API events and task removal preserve real bytes and existing files', async () => {
      await page.evaluate(() => { window.__toolboxDownloadEvents = []; window.__toolboxDownloadOff = window.api.onDownloadTaskUpdated((task) => window.__toolboxDownloadEvents.push(task.id)); });
      const destination = join(directory, 'downloaded.bin');
      const started = await api('downloadStart', { url: `${base}/file`, savePath: destination, threads: 4 });
      assert.equal(started.ok, true, started.message);
      const completed = await until(async () => (await api('downloadList')).find((task) => task.id === started.task.id), (task) => task?.status === 'completed');
      assert.equal(completed.progress, 1); assert.equal(completed.downloadedBytes, sample.length); assert.deepEqual(readFileSync(destination), sample);
      assert((await api('downloadList')).some((task) => task.id === started.task.id));
      assert(await page.evaluate((id) => window.__toolboxDownloadEvents.includes(id), started.task.id));
      assert.equal((await api('downloadStart', { url: `${base}/file`, savePath: destination })).ok, false);
      assert.deepEqual(readFileSync(destination), sample);
      assert.equal(await api('downloadRemove', started.task.id), true); assert(!(await api('downloadList')).some((task) => task.id === started.task.id));
      assert.deepEqual(readFileSync(destination), sample, 'removing history must preserve the completed user file');
      await page.evaluate(() => window.__toolboxDownloadOff());
    });
    await t.test('ICO input supplies correct MIME, exact bytes, browser pixels and native thumbnail', async () => {
      const ffmpeg = join(dirname(binary), 'native', 'ffmpeg', 'ffmpeg.exe'); assert(existsSync(ffmpeg));
      const png = join(directory, 'icon.png');
      execFileSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=red:s=16x16', '-frames:v', '1', '-pix_fmt', 'rgba', png], { windowsHide: true, timeout: 15000 });
      const pixels = readFileSync(png); const header = Buffer.alloc(22);
      header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4); header[6] = 16; header[7] = 16; header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12); header.writeUInt32LE(pixels.length, 14); header.writeUInt32LE(22, 18);
      const ico = join(directory, 'fixture.ico'); writeFileSync(ico, Buffer.concat([header, pixels]));
      const url = await api('loadWallpaperFile', ico); assert.equal(typeof url, 'string');
      const response = await fetch(url); assert.equal(response.headers.get('content-type'), 'image/x-icon'); assert.deepEqual(Buffer.from(await response.arrayBuffer()), readFileSync(ico));
      const dimensions = await page.evaluate(async (url) => {
        const image = new Image(); image.crossOrigin = 'anonymous'; image.src = url; await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
        canvas.getContext('2d').drawImage(image, 0, 0); return { width: image.width, height: image.height, pixels: canvas.toDataURL('image/png') };
      }, url);
      assert.equal(dimensions.width, 16); assert.equal(dimensions.height, 16); assert(dimensions.pixels.startsWith('data:image/png;base64,'));
      const thumbnail = await api('loadAlbumThumbnail', ico); assert(thumbnail?.startsWith('data:image/jpeg;base64,'));
    });
  } catch (error) {
    error.message += `\nNative toolbox diagnostics:\n${diagnostics}`; throw error;
  } finally {
    const exited = app.exitCode === null ? once(app, 'exit') : Promise.resolve();
    if (page && app.exitCode === null) {
      try { await page.evaluate(() => window.desktop.send('app:quit')); } catch { /* Closing the WebView may finish its IPC connection first. */ }
    }
    await Promise.race([exited, delay(5000)]);
    if (app.exitCode === null) { app.kill(); await Promise.race([exited, delay(3000)]); }
    if (browser) await browser.close();
    upstream.closeAllConnections(); upstream.close();
    const target = resolve(directory);
    if (target.startsWith(resolve(tmpdir()) + sep) && basename(target).startsWith('eisland-toolbox-test-')) {
      try { rmSync(target, { recursive: true, force: true }); } catch { /* WebView2 briefly retains its isolated profile after exit. */ }
    }
    if (process.env.LLVM_PROFILE_FILE) {
      const profile = process.env.LLVM_PROFILE_FILE.replaceAll('%p', String(app.pid)).replace(/%\d*m/gu, '*').replaceAll('\\', '/');
      assert(globSync(profile).length > 0, 'Native toolbox GUI execution profile was not flushed');
    }
  }
});
