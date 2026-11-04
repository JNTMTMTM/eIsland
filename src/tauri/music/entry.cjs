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
 * @file entry.cjs
 * @description 按需启动的音乐辅助进程，复用既有设置、网络、平台和音频实现。
 * @author 鸡哥
 */
const { createInterface } = require('node:readline');
const { createServer } = require('node:http');
const { randomBytes } = require('node:crypto');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { mkdirSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const { registerNetIpcHandlers } = require('../../main/ipc/app/net');
const { registerMusicIpcHandlers } = require('../../main/ipc/media/music');
const { registerMusicProviderAuthIpcHandlers } = require('../../main/ipc/media/musicProviderAuth');
const { registerQishuiBusinessIpcHandlers } = require('../../main/ipc/media/qishui');
const { handleQishuiAudioRequest, cleanupQishuiAudioSources } = require('../../main/music/providers/qishuiAudio');
const { handlers } = require('./electron-host.cjs');

process.resourcesPath = __dirname;
console.log = (...values) => console.error(...values);
const pendingHost = new Map();
let sequence = 0;
const write = (message) => process.stdout.write(`${JSON.stringify(message)}\n`);
const secret = randomBytes(24).toString('hex');
let audioServer;
let audioBase;
let audioStarting;
/** 启动同一份音频/私有回调服务器。
 * @returns {Promise<string>} 回环地址。
 */
async function startEndpoint() {
  audioServer = createServer((request, response) => {
    const serve = async () => {
      const path = String(request.url || '');
      if (path.startsWith(`/${secret}/reply/`) && request.method === 'POST') {
        const id = Number(path.slice(`/${secret}/reply/`.length));
        const pending = pendingHost.get(id);
        if (!pending || pending.operation !== 'eval') { response.writeHead(404).end(); return; }
        let text = '';
        request.setEncoding('utf8');
        request.on('data', (chunk) => { text += chunk; if (text.length > 8388608) request.destroy(); });
        request.on('end', () => {
          try {
            const value = JSON.parse(text); clearTimeout(pending.timer); pendingHost.delete(id);
            if (value.error) pending.reject(new Error(value.error)); else pending.resolve(value);
            response.writeHead(200, { 'Access-Control-Allow-Origin': '*' }).end('ok');
          } catch { response.writeHead(400).end(); }
        });
        return;
      }
      if (!path.startsWith(`/${secret}/audio/`) || !['GET', 'HEAD'].includes(request.method)) { response.writeHead(404).end(); return; }
      const token = path.slice(`/${secret}/audio/`.length);
      const controller = new AbortController();
      response.once('close', () => { if (!response.writableEnded) controller.abort(); });
      const result = await handleQishuiAudioRequest(new Request(`eisland-qishui://audio/${token}`, { method: request.method, headers: request.headers, signal: controller.signal }));
      response.writeHead(result.status, { ...Object.fromEntries(result.headers), 'Access-Control-Allow-Origin': '*' });
      if (result.body) await pipeline(Readable.fromWeb(result.body), response);
      else response.end();
    };
    // HTTP 事件必须同步返回；在异步服务边界收敛流错误。
    // eslint-disable-next-line promise/prefer-await-to-then -- 不阻塞 HTTP 事件回调。
    serve().catch(() => { if (!response.headersSent) response.writeHead(502); response.end(); });
  });
  await new Promise((resolve, reject) => { audioServer.once('error', reject); audioServer.listen(0, '127.0.0.1', resolve); });
  audioBase = `http://127.0.0.1:${audioServer.address().port}/${secret}/audio/`;
  return audioBase;
}
/** 提供原音频代理的本机 Range 流服务。
 * @returns {Promise<string>} 仅绑定回环的随机地址。
 */
async function audioEndpoint() {
  if (audioBase) return audioBase;
  if (audioStarting) return audioStarting;
  audioStarting = startEndpoint();
  return audioStarting;
}

globalThis.__eislandMusicEvent = (channel, args) => write({ channel, args, kind: 'event' });
globalThis.__eislandMusicRpc = async (operation, args) => {
  const callbackBase = operation === 'eval' ? await audioEndpoint() : '';
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pendingHost.delete(id); reject(new Error('Music window operation timed out')); }, 300000);
    pendingHost.set(id, { resolve, reject, timer, operation });
    write({ id, operation, kind: 'host', args: { ...args, ...(callbackBase ? { callbackUrl: callbackBase.replace('/audio/', `/reply/${id}`) } : {}) } });
  });
};
globalThis.__eislandCancelMusicEvaluations = () => pendingHost.forEach((pending, id) => {
  if (pending.operation === 'eval') { clearTimeout(pending.timer); pendingHost.delete(id); pending.reject(new Error('Music verification window destroyed')); }
});
const storeDir = process.env.EISLAND_MUSIC_STORE || join(process.env.EISLAND_MUSIC_DATA, 'eIsland_store');
mkdirSync(storeDir, { recursive: true });
const readSetting = (key, fallback) => { try { return JSON.parse(readFileSync(join(storeDir, `${key}.json`), 'utf8')); } catch { return fallback; } };
const readLyricsSourceConfig = () => { const value = readSetting('lyrics-source', 'auto'); return typeof value === 'string' ? value : 'auto'; };
const sanitizeSmtcUnsubscribeMs = (value) => typeof value === 'number' && Number.isFinite(value) && Math.round(value) > 0 ? Math.max(1000, Math.min(1800000, Math.round(value))) : 0;
registerNetIpcHandlers({ writeMainLog: (level, message) => console.error(`[Music ${level}] ${message}`) });
let whitelist = readSetting('music-whitelist', []);
let unsubscribe = sanitizeSmtcUnsubscribeMs(readSetting('music-smtc-unsubscribe-ms', 0));
registerMusicIpcHandlers({
  storeDir, readLyricsSourceConfig, sanitizeSmtcUnsubscribeMs, whitelistStoreKey: 'music-whitelist', lyricsSourceStoreKey: 'lyrics-source', providerModeStoreKey: 'music-provider-mode',
  lyricsKaraokeStoreKey: 'lyrics-karaoke', lyricsClockStoreKey: 'lyrics-clock', lyricsCalibrateEnabledStoreKey: 'lyrics-calibrate-enabled',
  lyricsCalibrateDelayStoreKey: 'lyrics-calibrate-delay', lyricsEnabledStoreKey: 'lyrics-enabled', lyricsTranslationEnabledStoreKey: 'lyrics-translation-enabled',
  smtcUnsubscribeStoreKey: 'music-smtc-unsubscribe-ms', defaultLyricsKaraoke: false, defaultLyricsClock: true, defaultLyricsCalibrateEnabled: true, defaultLyricsCalibrateDelay: 20,
  getWhitelist: () => whitelist, setWhitelist: (value) => { whitelist = value; },
  getSmtcUnsubscribeMs: () => unsubscribe, setSmtcUnsubscribeMs: (value) => { unsubscribe = value; },
  detectAllSources: async () => (await globalThis.__eislandMusicRpc('sources', {})).sources,
});
registerMusicProviderAuthIpcHandlers();
registerQishuiBusinessIpcHandlers();

/** 分发经过 Rust 白名单筛选的既有 IPC 请求。
 * @param {object} message - 传输消息。
 * @returns {Promise<void>} 响应已经发送。
 */
async function dispatch(message) {
  if (message.kind === 'host-result') {
    const pending = pendingHost.get(message.id);
    if (pending?.operation === 'eval' && !message.error && message.result?.scheduled) return;
    if (pending) { pendingHost.delete(message.id); clearTimeout(pending.timer); if (message.error) pending.reject(new Error(message.error)); else pending.resolve(message.result); }
    return;
  }
  const handler = handlers.get(message.channel);
  if (!handler) throw new Error('Unsupported music operation');
  const args = [...(message.args || [])];
  while (args.length && args.at(-1) === null) args.pop();
  let result = await handler({ sender: { id: 1 }, senderFrame: { url: 'file:///eisland-music.html' } }, ...args);
  if (message.channel === 'qishui:song-url' && result?.url?.startsWith('eisland-qishui://audio/')) {
    result = { ...result, url: (await audioEndpoint()) + result.url.slice('eisland-qishui://audio/'.length) };
  }
  write({ kind: 'result', id: message.id, result: result ?? null });
}
const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
input.on('line', (line) => {
  let message;
  try { if (line.length > 33554432) throw new Error('Music request too large'); message = JSON.parse(line); }
  catch { process.exitCode = 1; input.close(); return; }
  if (message.kind === 'shutdown') { input.close(); return; }
  // eslint-disable-next-line promise/prefer-await-to-then -- stdin 逐行事件允许并发请求。
  dispatch(message).catch((error) => write({ kind: 'result', id: message.id, error: String(error.message || error) }));
});
input.on('close', () => {
  const cleanup = async () => { await cleanupQishuiAudioSources(); audioServer?.close(); process.exit(0); };
  // eslint-disable-next-line promise/prefer-await-to-then -- close 事件同步返回，异步清理完成后退出。
  cleanup().catch(() => process.exit(1));
});
