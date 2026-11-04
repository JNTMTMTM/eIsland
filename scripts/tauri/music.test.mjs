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
 * @file music.test.mjs
 * @description 使用本地 HTTP 和独立辅助进程验证既有歌词传输、设置及平台边界。
 * @author 鸡哥
 */
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { basename, join, resolve, sep } from 'node:path';
import { createInterface } from 'node:readline';
import { once } from 'node:events';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

test('existing music services run without Electron', { timeout: 30000 }, async (t) => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  execFileSync(process.execPath, ['scripts/tauri/build-music.mjs'], { cwd: root, windowsHide: true });
  const data = mkdtempSync(join(tmpdir(), 'eisland-music-test-'));
  // 仅在测试进程替换指定虚构上游；生产包和实际账号均不受影响。
  const preload = join(data, 'upstream-fixture.cjs');
  writeFileSync(preload, `const nativeFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
  const url = new URL(String(input));
  if (url.hostname === 'api.qishui.com' && url.pathname === '/luna/pc/track_v2')
    return Response.json({ track: { bit_rates: [{ url: 'https://audio.fixture.invalid/song', quality: 'normal' }] } });
  if (url.hostname === 'api.qishui.com' && url.pathname === '/luna/pc/me') return Response.json({ is_vip: false });
  if (url.hostname === 'audio.fixture.invalid') return new Response('abcdefgh', { headers: { 'Content-Type': 'audio/mp4' } });
  return nativeFetch(input, options);
};`);
  const server = createServer((request, response) => {
    if (request.url === '/slow') return;
    if (request.url === '/large') { response.writeHead(200, { 'Content-Length': 16777217 }).end(); return; }
    if (request.url === '/redirect') { response.writeHead(302, { Location: '/lyrics' }).end(); return; }
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ lyric: '[00:01.00]测试歌词', cookie: request.headers.cookie }));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const child = spawn(process.execPath, ['--require', preload, join(root, 'src-tauri/resources/music/entry.cjs')], {
    cwd: root, windowsHide: true, env: { ...process.env, EISLAND_MUSIC_DATA: data }, stdio: ['pipe', 'pipe', 'pipe'],
  });
  let stderr = ''; let sequence = 0;
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  const pending = new Map(); const events = [];
  createInterface({ input: child.stdout }).on('line', (line) => {
    const result = JSON.parse(line);
    if (result.kind === 'event') events.push(result);
    const item = pending.get(result.id);
    if (result.kind === 'result' && item) {
      pending.delete(result.id); clearTimeout(item.timer);
      if (result.error) item.reject(new Error(result.error)); else item.resolve(result.result);
    }
  });
  const request = (channel, ...args) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Music fixture timed out: ${channel}\n${stderr}`)); }, 5000);
    pending.set(id, { resolve, reject, timer }); child.stdin.write(`${JSON.stringify({ id, channel, args })}\n`);
  });
  try {
    await t.test('network keeps UTF-8, headers, redirects, timeouts and response limits', async () => {
      const response = await request('net:fetch', `${base}/redirect`, { headers: { Cookie: 'fixture-secret' } });
      assert.equal(response.ok, true); assert.equal(JSON.parse(response.body).lyric, '[00:01.00]测试歌词');
      assert.equal(JSON.parse(response.body).cookie, 'fixture-secret');
      assert.equal((await request('net:fetch', `${base}/slow`, { timeoutMs: 40 })).status, 408);
      assert.equal((await request('net:fetch', `${base}/large`)).status, 413);
      assert.equal((await request('net:fetch', 'file:///private')).status, 400);
      assert(!stderr.includes('fixture-secret'), 'credentials must not be logged');
    });
    await t.test('lyrics preferences retain defaults, persistence, normalization and events', async () => {
      assert.equal(await request('music:lyrics-source:get'), 'auto');
      assert.equal(await request('music:lyrics-karaoke:get'), false);
      assert.equal(await request('music:lyrics-clock:get'), true);
      assert.equal(await request('music:lyrics-calibrate-delay:get'), 20);
      assert.equal(await request('music:lyrics-karaoke:set', true), true);
      assert.equal(await request('music:lyrics-karaoke:get'), true);
      assert.equal(JSON.parse(readFileSync(join(data, 'eIsland_store/lyrics-karaoke.json'), 'utf8')), true);
      assert(events.some((event) => event.channel === 'settings:changed' && event.args[0] === 'music:lyrics-karaoke' && event.args[1] === true));
      await request('music:provider-mode:set', 'invalid'); assert.equal(await request('music:provider-mode:get'), 'guest');
      await request('music:smtc-unsubscribe-ms:set', 1); assert.equal(await request('music:smtc-unsubscribe-ms:get'), 1000);
    });
    await t.test('platform status and validation reuse original implementation', async () => {
      const status = await request('music-provider-auth:status', 'qishui');
      assert.equal(status.loggedIn, false); assert.equal(status.state, 'idle');
      assert.equal((await request('qishui:status')).provider, 'qishui');
      const playback = await request('qishui:song-url', 'fixture');
      assert.equal(playback.playable, false); assert.equal(playback.reason, 'login_required');
      await assert.rejects(request('qishui:lyrics', ''), /QISHUI_TRACK_ID_REQUIRED/);
      await assert.rejects(request('music-provider-auth:status', 'unknown'), /MUSIC_PROVIDER_NOT_SUPPORTED/);
    });
    await t.test('original audio registration streams through the HTTP bridge with Range and HEAD', async () => {
      mkdirSync(join(data, 'music-providers'), { recursive: true });
      writeFileSync(join(data, 'music-providers/qishui.json'), JSON.stringify({ cookie: 'sessionid=fixture-only' }));
      const playback = await request('qishui:song-url', 'fixture-track');
      assert.equal(playback.playable, true);
      assert(playback.url.startsWith('http://127.0.0.1:'));
      assert(!playback.url.includes('audio.fixture.invalid'));
      const full = await fetch(playback.url);
      assert.equal(full.status, 200); assert.equal(await full.text(), 'abcdefgh');
      const range = await fetch(playback.url, { headers: { Range: 'bytes=2-4' } });
      assert.equal(range.status, 206); assert.equal(range.headers.get('content-range'), 'bytes 2-4/8');
      assert.equal(await range.text(), 'cde');
      const head = await fetch(playback.url, { method: 'HEAD' });
      assert.equal(head.headers.get('content-length'), '8'); assert.equal(await head.text(), '');
      assert.equal((await fetch(playback.url, { headers: { Range: 'bytes=99-100' } })).status, 416);
      assert.equal((await fetch(playback.url.replace(/[^/]+$/, 'missing'))).status, 404);
    });
  } finally {
    const exited = once(child, 'exit'); child.stdin.end();
    await Promise.race([exited, new Promise((resolve) => { const timer = setTimeout(() => { child.kill(); resolve(); }, 2000); timer.unref(); })]);
    server.closeAllConnections(); server.close();
    pending.forEach((item) => clearTimeout(item.timer));
    if (resolve(data).startsWith(resolve(tmpdir()) + sep) && basename(data).startsWith('eisland-music-test-')) rmSync(data, { recursive: true, force: true });
  }
});
