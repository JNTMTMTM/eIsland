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
 * @file native-services.test.mjs
 * @description 在隔离的原生 Tauri 进程中验证本地 HTTP 下载、暂停续传、Range 和资产流并发。
 * @author 鸡哥
 */
/* global window -- Playwright 回调在被测 WebView2 中运行。 */
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, globSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { cargoTargetDirectory } from './release-artifacts.mjs';
import withoutSigningSecrets from './environment.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const binary = process.env.EISLAND_SMOKE_BINARY || join(cargoTargetDirectory(root), 'debug/eisland.exe');
/** 等待真实任务进入指定状态。
 * @param query - 异步查询。
 * @param accept - 满足验收条件。
 * @param timeout - 超时毫秒。
 * @returns 最后查询的任务。
 */
async function until(query, accept, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    // eslint-disable-next-line no-await-in-loop -- 轮询必须等待前一个查询完成。
    const value = await query();
    if (accept(value)) return value;
    // eslint-disable-next-line no-await-in-loop -- 对本任务隔离进程限频。
    await delay(30);
  }
  throw new Error('Native task did not reach the expected state');
}

test('native services use real streams, resume data and concurrent local assets', { skip: !binary, timeout: 90000 }, async (t) => {
  assert(existsSync(binary), 'Native test application is missing; run npm run build:e2e first');
  const directory = mkdtempSync(join(tmpdir(), 'eisland-native-services-test-'));
  const store = join(directory, 'store'); mkdirSync(store);
  writeFileSync(join(store, 'startup-animation-enabled.json'), 'false');
  const data = Buffer.alloc(8 * 1024 * 1024);
  data.forEach((_value, index) => { data[index] = index % 251; });
  let ranges = 0;
  let requestedResume = false;
  const upstream = createServer((request, response) => {
    response.setHeader('Content-Length', data.length);
    response.setHeader('Accept-Ranges', 'bytes');
    response.setHeader('ETag', '"native-services-fixture"');
    if (request.method === 'HEAD') { response.end(); return; }
    const match = request.headers.range?.match(/^bytes=(\d+)-(\d+)$/);
    let cursor = match ? Number(match[1]) : 0;
    const end = match ? Math.min(Number(match[2]), data.length - 1) : data.length - 1;
    if (match) {
      ranges += 1; if (cursor % (2 * 1024 * 1024) !== 0) requestedResume = true;
      response.setHeader('Content-Range', `bytes ${cursor}-${end}/${data.length}`);
      response.setHeader('Content-Length', end - cursor + 1);
      response.writeHead(206);
    }
    const timer = setInterval(() => {
      const next = Math.min(cursor + 16384, end + 1);
      response.write(data.subarray(cursor, next)); cursor = next;
      if (cursor > end) { clearInterval(timer); response.end(); }
    }, 8);
    response.on('close', () => clearInterval(timer));
  });
  upstream.listen(0, '127.0.0.1'); await once(upstream, 'listening');
  const port = 9225;
  const app = spawn(binary, [], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'], env: {
    ...withoutSigningSecrets(process.env), EISLAND_DATA_DIR: store, EISLAND_WEBVIEW_DATA_DIR: join(directory, 'webview'), EISLAND_WEBVIEW_DEBUG_ARGS: `--remote-debugging-port=${port}`,
  } });
  let diagnostics = ''; app.stderr.on('data', (chunk) => { diagnostics += chunk.toString(); });
  let browser;
  let mainPage;
  try {
    browser = await until(async () => {
      try { return await chromium.connectOverCDP(`http://127.0.0.1:${port}`); } catch { return null; }
    }, Boolean, 20000);
    const page = await until(async () => {
      const candidates = browser.contexts().flatMap((context) => context.pages());
      const labels = await Promise.all(candidates.map(async (candidate) => {
        try { return await candidate.evaluate(() => window.__TAURI_INTERNALS__?.metadata?.currentWindow?.label); } catch { return null; }
      }));
      return candidates[labels.indexOf('main')];
    }, Boolean);
    mainPage = page;
    await page.waitForFunction(() => Boolean(window.api && window.desktop));
    const invoke = (channel, ...args) => page.evaluate(({ channel, args }) => window.__TAURI__.core.invoke('desktop_ipc', { channel, args }), { channel, args });
    await t.test('settings previews deliver active language, animation and notification events', async () => {
      const channels = ['i18n:language', 'notification:show', 'settings:maxexpand-tab-animation', 'settings:expand-tab-animation'];
      const received = await page.evaluate(async (channels) => {
        const received = [];
        const stop = window.api.onSettingsChanged((channel) => received.push(channel));
        try {
          await Promise.all(channels.map((channel) => window.__TAURI__.core.invoke('desktop_ipc', { channel: 'settings:preview', args: [channel, null] })));
          await new Promise((resolve) => setTimeout(resolve, 100));
          return received;
        } finally { stop(); }
      }, channels);
      channels.forEach((channel) => assert(received.includes(channel), `${channel} must reach the native event consumer`));
      assert(['disabled', 'enabled', 'high-priority'].includes(await invoke('island:autostart:get')));
    });
    await t.test('downloads preserve HEAD size, use parallel ranges and resume partial files', async () => {
      const destination = join(directory, 'download.bin');
      const result = await invoke('download:start', { url: `http://127.0.0.1:${upstream.address().port}/file`, savePath: destination, threads: 4 });
      assert.equal(result.ok, true);
      const {id} = result.task;
      assert.equal(result.task.totalBytes, data.length, 'HEAD representation length must come from Content-Length');
      assert.equal(result.task.threads, 4);
      await until(() => invoke('download:get', id), (task) => task.downloadedBytes > 65536);
      assert.equal(await invoke('download:pause', id), true);
      await until(() => invoke('download:get', id), (task) => task.status === 'paused');
      const resumed = await until(() => invoke('download:resume', id), (value) => value.ok === true);
      assert.equal(resumed.task.status, 'downloading');
      const completed = await until(() => invoke('download:get', id), (task) => ['failed', 'completed'].includes(task.status), 25000);
      assert.equal(completed.status, 'completed', completed.errorMessage ?? 'Download failed');
      assert.deepEqual(readFileSync(destination), data);
      assert(ranges >= 4 && requestedResume, 'resumption must retain partial byte ranges');
      assert.equal(await invoke('download:remove', id), true);
    });
    await t.test('cancelled downloads do not publish a partial destination or leave part files', async () => {
      const destination = join(directory, 'cancelled.bin');
      const result = await invoke('download:start', { url: `http://127.0.0.1:${upstream.address().port}/cancel`, savePath: destination, threads: 4 });
      assert.equal(result.ok, true);
      const {id} = result.task;
      await until(() => invoke('download:get', id), (task) => task.downloadedBytes > 65536);
      assert.equal(await invoke('download:cancel', id), true);
      await until(() => invoke('download:remove', id), (removed) => removed === true);
      assert.equal(await invoke('download:get', id), null);
      assert.equal(existsSync(destination), false);
      assert(!readdirSync(directory).some((file) => file.includes(`eisland-${id}-`)), 'owned part files must be removed');
    });
    await t.test('local assets support HEAD/Range and one slow reader does not block other assets', async () => {
      const small = join(directory, 'small.txt'); writeFileSync(small, 'abcdefgh');
      const registered = await Promise.all(Array.from({ length: 8 }, () => invoke('album:media-info', small)));
      assert.equal(new Set(registered.map((entry) => new URL(entry.url).port)).size, 1, 'server initialization must be unique');
      const [{ url }] = registered;
      assert.equal((await fetch(url, { method: 'HEAD' })).headers.get('content-length'), '8');
      const range = await fetch(url, { headers: { Range: 'bytes=2-4' } });
      assert.equal(range.status, 206); assert.equal(await range.text(), 'cde');
      assert.equal((await fetch(url, { headers: { Range: 'bytes=99-' } })).status, 416);
      await Promise.all([['bytes=5-', 'fgh'], ['bytes=-2', 'gh'], ['bytes=6-99', 'gh']].map(async ([value, expected]) => {
        const response = await fetch(url, { headers: { Range: value } });
        assert.equal(response.status, 206); assert.equal(await response.text(), expected);
      }));
      await Promise.all(['bytes=-0', 'bytes=+1-2', 'bytes=0-1,3-4', 'bytes=3-2'].map(async (value) => {
        assert.equal((await fetch(url, { headers: { Range: value } })).status, 416);
      }));
      const empty = join(directory, 'empty.bin'); writeFileSync(empty, '');
      const emptyAsset = await invoke('album:media-info', empty);
      const emptyResponse = await fetch(emptyAsset.url);
      assert.equal(emptyResponse.status, 200); assert.equal((await emptyResponse.arrayBuffer()).byteLength, 0);
      const emptyRange = await fetch(emptyAsset.url, { headers: { Range: 'bytes=0-' } });
      assert.equal(emptyRange.status, 416); assert.equal(emptyRange.headers.get('content-range'), 'bytes */0');
      const large = join(directory, 'large.bin'); writeFileSync(large, Buffer.alloc(32 * 1024 * 1024));
      const asset = await invoke('album:media-info', large);
      const stalled = await fetch(asset.url);
      try {
        const another = await fetch(url, { signal: AbortSignal.timeout(3000) });
        assert.equal(await another.text(), 'abcdefgh');
      } finally { await stalled.body.cancel(); }
    });
    await t.test('native file APIs preserve missing-file and image preview contracts', async () => {
      assert.equal(await invoke('app:read-text-file', join(directory, 'missing-SKILL.md')), null);
      const source = join(directory, 'background.bmp');
      const bitmap = Buffer.alloc(58);
      bitmap.write('BM'); bitmap.writeUInt32LE(58, 2); bitmap.writeUInt32LE(54, 10);
      bitmap.writeUInt32LE(40, 14); bitmap.writeInt32LE(1, 18); bitmap.writeInt32LE(1, 22);
      bitmap.writeUInt16LE(1, 26); bitmap.writeUInt16LE(24, 28); bitmap.writeUInt32LE(4, 34);
      writeFileSync(source, bitmap);
      const preview = await invoke('wallpaper:load-file', source, true);
      assert(preview, 'native image preview must return a usable asset URL');
      const response = await fetch(preview);
      assert.equal(response.status, 200);
      assert((await response.arrayBuffer()).byteLength > 0);
    });
    await t.test('bundled FFmpeg compresses and bundled ffprobe supplies JSON video metadata', async () => {
      const ffmpeg = join(dirname(binary), 'native', 'ffmpeg', 'ffmpeg.exe');
      assert(existsSync(ffmpeg), 'native resources must ship FFmpeg');
      assert(existsSync(join(dirname(ffmpeg), 'ffprobe.exe')), 'native resources must ship ffprobe');
      const source = join(directory, 'fixture.bmp');
      const video = join(directory, 'fixture.mp4');
      execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=red:s=64x48', '-frames:v', '1', source], { windowsHide: true, timeout: 15000 });
      execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=blue:s=64x48:r=10', '-t', '0.5', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', video], { windowsHide: true, timeout: 15000 });
      const compressed = await invoke('image-compression:start', { inputPaths: [source], quality: 80, outputDir: join(directory, 'compressed') });
      assert.equal(compressed.ok, true);
      assert.equal(compressed.results[0].success, true, compressed.results[0].error);
      assert(existsSync(compressed.results[0].outputPath));
      assert(compressed.results[0].compressedBytes > 0);
      const metadata = await invoke('wallpaper:video:probe', video);
      assert.equal(metadata.width, 64);
      assert.equal(metadata.height, 48);
      assert(metadata.durationMs >= 400);
      assert.equal(metadata.videoCodec, 'h264');
      const prepared = await invoke('wallpaper:video:prepare', { sourcePath: video, preferRemux: true });
      assert.equal(prepared.ok, true, prepared.message);
      assert.equal(prepared.mode, 'remux');
      assert(existsSync(prepared.playbackPath));
      assert(prepared.coverPath && existsSync(prepared.coverPath));
    });
    await t.test('native performance sampling warms real sensors without blocking IPC', async () => {
      const helper = join(dirname(binary), 'native', 'win-x64', 'volume', 'eIslandTemperatureReader.exe');
      assert(existsSync(helper), 'sensor collector must ship with the shared native runtime');
      const initial = await invoke('system:performance-snapshot:get');
      assert(initial.cpu && initial.memory);
      const warm = await until(() => invoke('system:performance-snapshot:get'), (snapshot) => typeof snapshot.cpu.speedMaxGhz === 'number', 20000);
      assert(warm.cpu.speedMaxGhz > 0);
      assert(warm.cpu.loadPercent >= 0 && warm.cpu.loadPercent <= 100);
      [warm.cpu.temperatureCelsius, warm.gpu?.temperatureCelsius, warm.disk.temperatureCelsius].forEach((value) => {
        assert(value === null || value === undefined || (value > 0 && value <= 200));
      });
      assert(warm.gpu?.loadPercent === null || warm.gpu === null || (warm.gpu.loadPercent >= 0 && warm.gpu.loadPercent <= 100));
      assert.equal(await invoke('app:read-text-file', join(directory, 'still-missing.md')), null);
    });
  } catch (error) {
    error.message += `\nNative process diagnostics:\n${diagnostics}`; throw error;
  } finally {
    if (app.exitCode !== null || mainPage?.isClosed()) {
      t.diagnostic(`Native process closed before cleanup (exit=${app.exitCode}):\n${diagnostics}`);
    }
    const exited = app.exitCode === null ? once(app, 'exit') : Promise.resolve();
    if (mainPage && app.exitCode === null) {
      try { await mainPage.evaluate(() => window.desktop.send('app:quit')); } catch { /* The window may close before its command response. */ }
      await Promise.race([exited, delay(3000)]);
    }
    if (browser) await browser.close();
    if (app.exitCode === null) app.kill();
    await Promise.race([exited, delay(3000)]);
    upstream.closeAllConnections(); upstream.close();
    const target = resolve(directory);
    if (target.startsWith(resolve(tmpdir()) + sep) && basename(target).startsWith('eisland-native-services-test-')) {
      try { rmSync(target, { recursive: true, force: true }); } catch { /* WebView2 may still release its isolated profile after parent exit. */ }
    }
    if (process.env.LLVM_PROFILE_FILE) {
      const profile = process.env.LLVM_PROFILE_FILE.replaceAll('%p', String(app.pid)).replace(/%\d*m/gu, '*').replaceAll('\\', '/');
      assert(globSync(profile).length > 0, 'Native service GUI execution profile was not flushed');
    }
  }
});
