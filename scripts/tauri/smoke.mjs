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
/* global window, document -- Playwright 回调在被测 WebView 中运行。 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = process.env.EISLAND_SMOKE_OUTPUT ?? resolve(root, 'src-tauri/target/smoke');
mkdirSync(output, { recursive: true });
mkdirSync(resolve(output, 'store'), { recursive: true });
writeFileSync(resolve(output, 'store/island-shape-mode.json'), JSON.stringify('notch'));
writeFileSync(resolve(output, 'store/island-scale.json'), '100');
writeFileSync(resolve(output, 'store/hide-hotkey.json'), JSON.stringify('Alt+X'));
const port = 9224;
const app = spawn(process.env.EISLAND_SMOKE_BINARY ?? resolve(root, 'src-tauri/target/debug/eisland.exe'), [], {
  cwd: root, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'],
  env: { ...process.env, EISLAND_WEBVIEW_DEBUG_ARGS: `--remote-debugging-port=${port}`,
    EISLAND_DATA_DIR: resolve(output, 'store'), EISLAND_WEBVIEW_DATA_DIR: resolve(output, 'webview') },
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
    await page.evaluate(({ channel, args }) => window.desktop.send(channel, ...args), { channel, args });
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
  if (process.argv.includes('--agent')) {
    const fixture = createServer((request, response) => {
      if (request.url === '/') { response.end('Ollama is running'); return; }
      if (request.url === '/api/tags') { response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify({ models: [{ name: 'native-fixture' }] })); return; }
      request.resume();
      request.once('end', () => {
        response.writeHead(200, { 'Content-Type': 'text/event-stream' });
        response.write(`data: ${JSON.stringify({ choices: [{ delta: { reasoning_content: 'local thought' } }] })}\n\n`);
        const payload = Buffer.from(`data: ${JSON.stringify({ choices: [{ delta: { content: '{"type":"final","answer":"原生 AI"}' } }], usage: { prompt_tokens: 4, completion_tokens: 3 } })}\n\ndata: [DONE]\n\n`);
        const boundary = payload.indexOf(Buffer.from('原')) + 1;
        response.write(payload.subarray(0, boundary)); response.end(payload.subarray(boundary));
      });
    });
    await new Promise((resolve) => fixture.listen(0, '127.0.0.1', resolve));
    const baseUrl = `http://127.0.0.1:${fixture.address().port}`;
    try {
      assert.equal(await ipc(main, 'ollama:ping', baseUrl), true);
      assert.deepEqual(await ipc(main, 'ollama:models', baseUrl), ['native-fixture']);
      await main.evaluate(() => {
        window.nativeAgentEvents = [];
        window.nativeAgentUnsubscribe = window.desktop.on('customDirect:chat:event:native-smoke', (event) => window.nativeAgentEvents.push(event));
      });
      await ipc(main, 'customDirect:chat:start', 'native-smoke', { baseUrl, model: 'native-fixture', systemPrompt: '', userMessage: 'fixture', apiKey: 'local-fixture-only' });
      await main.waitForFunction(() => window.nativeAgentEvents.some((event) => event.type === 'final' || event.type === 'error'));
      const events = await main.evaluate(() => { window.nativeAgentUnsubscribe(); return window.nativeAgentEvents; });
      assert(!events.some((event) => event.type === 'error'), JSON.stringify(events));
      assert(events.some((event) => event.type === 'think'));
      assert.equal(events.filter((event) => event.type === 'chunk').map((event) => event.payload.text).join(''), '原生 AI');
      assert.equal(events.find((event) => event.type === 'final').payload.billedTokenTotal, 7);
      const workspace = resolve(output, 'agent-workspace'); mkdirSync(workspace, { recursive: true });
      const file = resolve(workspace, 'idempotency.txt'); writeFileSync(file, 'base');
      const request = { requestId: `native-smoke-${Date.now()}`, tool: 'file.append', arguments: { path: file, content: ' once' }, workspaces: [workspace] };
      const duplicates = await Promise.all([0, 1, 2].map(() => ipc(main, 'agent:local-tool:execute', request)));
      assert(duplicates.every((result) => result.success)); assert.equal(readFileSync(file, 'utf8'), 'base once');
      const conflict = await ipc(main, 'agent:local-tool:execute', { ...request, arguments: { ...request.arguments, content: ' twice' } });
      assert.equal(conflict.error, 'TOOL_REQUEST_ID_CONFLICT');
      const escaped = await ipc(main, 'agent:local-tool:execute', { tool: 'file.read', arguments: { path: resolve(workspace, '../outside') }, workspaces: [workspace] });
      assert.equal(escaped.success, false);
      const codex = await ipc(main, 'codex:status:get');
      assert(Array.isArray(codex.sessions) && Array.isArray(codex.events));
      console.log('PASS: native model SSE/UTF-8/thinking, token totals, local tool idempotency and workspace boundaries');
    } finally { fixture.closeAllConnections(); fixture.close(); }
  }
  if (process.argv.includes('--music')) {
    const fixture = createServer((_request, response) => response.end('[00:01.00]Tauri 歌词链路'));
    await new Promise((resolve) => fixture.listen(0, '127.0.0.1', resolve));
    try {
      const lyrics = await ipc(main, 'net:fetch', `http://127.0.0.1:${fixture.address().port}/lyrics`);
      assert.equal(lyrics.ok, true);
      assert.equal(lyrics.body, '[00:01.00]Tauri 歌词链路');
      const source = await ipc(main, 'music:lyrics-source:get');
      await ipc(main, 'music:lyrics-source:set', 'auto');
      assert.equal(await ipc(main, 'store:read', 'lyrics-source'), 'auto');
      await ipc(main, 'music:lyrics-source:set', source);
      const auth = await ipc(main, 'music-provider-auth:status', 'qishui');
      assert.equal(auth.loggedIn, false);
      assert.equal((await ipc(main, 'qishui:status')).provider, 'qishui');
      await assert.rejects(ipc(main, 'qishui:lyrics', ''), /QISHUI_TRACK_ID_REQUIRED/);
      console.log('PASS: native Rust lyrics network, shared preferences and original platform services');
      if (process.argv.includes('--music-network')) {
        const results = await ipc(main, 'qishui:search', '晴天', { limit: 2 });
        assert(results.songs?.length > 0, 'Public catalog must return tracks');
        const lyric = await ipc(main, 'qishui:lyrics', results.songs[0].id);
        assert.equal(typeof lyric.lyric, 'string');
        const playback = await ipc(main, 'qishui:song-url', results.songs[0].id);
        assert.equal(playback.reason, 'login_required');
        console.log('PASS: public music search/lyrics and original playback authentication guard');
      }
      if (process.argv.includes('--music-login')) {
        const qr = await ipc(main, 'music-provider-auth:create-qr', 'qishui');
        assert.equal(qr.state, 'waiting');
        assert(qr.token && qr.qrContent, 'QR payload must be complete');
        const status = await ipc(main, 'music-provider-auth:check-qr', 'qishui', qr.token);
        assert(['waiting', 'rate_limited', 'expired'].includes(status.state));
        await ipc(main, 'music-provider-auth:clear', 'qishui');
        assert.equal((await ipc(main, 'music-provider-auth:status', 'qishui')).loggedIn, false);
        const replacement = await ipc(main, 'music-provider-auth:create-qr', 'qishui');
        assert(replacement.token && replacement.qrContent);
        await ipc(main, 'music-provider-auth:clear', 'qishui');
        console.log('PASS: isolated WebView2 signer, official QR creation/polling, cleanup and recreation');
      }
    } finally { fixture.closeAllConnections(); fixture.close(); }
  }
  if (process.argv.includes('--system')) {
    const diagnostics = await ipc(main, 'debug:system-services');
    assert.equal(diagnostics.media.ready, true, JSON.stringify(diagnostics));
    assert.equal(diagnostics.media.error, null);
    const hardware = await main.evaluate(async () => ({
      volume: await window.api.getVolume(), brightness: await window.api.getBrightness(), muted: await window.api.mediaGetMuted(),
    }));
    console.log('Native system services:', JSON.stringify({ diagnostics, hardware }));
    assert(hardware.volume === null || (hardware.volume >= 0 && hardware.volume <= 100));
    assert(hardware.brightness === null || (hardware.brightness >= 0 && hardware.brightness <= 100));
    assert(hardware.muted === null || typeof hardware.muted === 'boolean');
    if (hardware.volume !== null) {
      const writes = await Promise.all([0,1,2,3].map(() => ipc(main, 'system:volume:set', hardware.volume)));
      assert(writes.every((success) => success === true));
      assert.equal(await ipc(main, 'system:volume:get'),hardware.volume);
    }
    if (hardware.brightness !== null) assert.equal(await ipc(main, 'system:brightness:set', hardware.brightness), true);
    assert.equal(await ipc(main, 'system:volume:set', 'invalid'), false);
    assert.equal(await ipc(main, 'system:brightness:set', null), false);
    const timestamp = await ipc(main, 'smtc:get-timestamp');
    assert.equal(typeof timestamp.isAvailable, 'boolean');
    const detected = await ipc(main, 'music:detect-source-app-id');
    assert(Array.isArray(detected.sources));
    const savedWhitelist = await ipc(main, 'music:whitelist:get');
    try {
      const titledSource = detected.sources.find((source) => source.hasTitle);
      if (titledSource) {
        await ipc(main, 'music:whitelist:set', [titledSource.sourceAppId]);
        const playing = await ipc(main, 'media:current-info:get');
        assert.equal(playing.deviceId,titledSource.sourceAppId);
        assert.equal(typeof playing.title,'string');
        assert.equal(typeof playing.positionTimestampMs,'number');
      }
      await ipc(main, 'music:whitelist:set', []);
      assert.equal((await ipc(main, 'media:play-pause')).success,false);
      assert.equal((await ipc(main, 'media:seek', -1)).success,false);
    } finally {
      await ipc(main, 'music:whitelist:set', savedWhitelist);
    }
    await assert.rejects(ipc(main, 'music:whitelist:set', ['valid', 42]), /Expected source name/);
  }
  // Saving while recording registers the new binding before blur resumes all shortcuts.
  const shortcutLogOffset = stderr.length;
  await ipc(main, 'hotkey:suspend');
  await ipc(main, 'hotkey:set', 'Ctrl+Alt+Shift+F11');
  await ipc(main, 'hotkey:resume');
  await ipc(main, 'hotkey:set', 'Control+Alt+Shift+F11');
  await ipc(main, 'hotkey:resume');
  await ipc(main, 'hotkey:suspend');
  await ipc(main, 'hotkey:resume');
  await delay(100);
  assert(!stderr.slice(shortcutLogOffset).includes('[Shortcut] hide-hotkey:'), 'resume must not register a shortcut already owned by this process');
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
  if (process.argv.includes('--transparency')) {
    await standalone.evaluate(() => {
      document.documentElement.style.background = '#e020d0';
      document.body.style.background = '#e020d0';
      document.getElementById('root').style.display = 'none';
    });
    await ipc(main, 'window:collapse');
    await ipc(main, 'debug:transparency-underlay');
    await delay(1000);
    const colors = await ipc(main, 'debug:transparency-sample');
    console.log('Native transparency pixels (left corner, right corner, island):', colors);
    assert.deepEqual(colors[0], [224, 32, 208, 255], 'left corner must reveal the background window');
    assert.deepEqual(colors[1], [224, 32, 208, 255], 'right corner must reveal the background window');
    assert.deepEqual(colors[2], [0, 0, 0, 255], 'island itself must stay opaque');
  }
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
  await capture.waitForFunction(() => document.getElementById('bg-canvas').width > 300);
  await ipc(capture, 'capture-cancel');
  await assert.rejects(ipc(main, 'store:read', '../secrets'), /Invalid store key/);
  assert.equal(typeof await ipc(main, 'system:performance-snapshot:get'), 'object');
  assert.deepEqual(errors, [], 'main page must remain mounted without runtime exceptions');
  await main.screenshot({ path: resolve(output, 'main.png'), omitBackground: true });
  console.log('PASS: real WebView2 main, guide, standalone, tray, capture, voice, glow, transitions, scale, shortcut suspend/save/resume, sender checks');
  console.log(JSON.stringify(await ipc(main, 'debug:windows')));
  const exited = new Promise((resolve) => app.once('exit', resolve));
  await main.evaluate(() => window.desktop.send('app:quit'));
  await Promise.race([exited, delay(3000).then(() => { throw new Error('Application did not quit'); })]);
} catch (error) {
  console.error(stderr);
  throw error;
} finally {
  if (browser) await browser.close();
  app.kill();
}
