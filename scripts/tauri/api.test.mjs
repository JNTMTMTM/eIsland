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
 * @file api.test.mjs
 * @description 在独立 JavaScript 页面环境验证原生桌面 API、事件取消、窗口顺序与文件路径来源。
 * @author 鸡哥
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { buildSync } from 'esbuild';

const root = fileURLToPath(new URL('../../', import.meta.url));
const bundle = buildSync({ absWorkingDir: root, entryPoints: ['src/tauri/bootstrap.ts'], bundle: true, write: false, metafile: true, platform: 'browser', format: 'iife', target: 'es2022' });

/** 加载真实原生页面入口，模拟的边界仅为 Rust invoke 和 WebView 事件。
 * @param invoke - Rust 命令边界。
 * @param fetchResource - 本机资源服务器的 HTTP 边界。
 * @returns 独立的页面和事件入口。
 */
function page(invoke = async () => null, fetchResource = fetch) {
  const nativeEvents = new Map(); const domEvents = new Map();
  const window = { devicePixelRatio: 1, __TAURI__: {
    event: { listen: async (name, callback) => { nativeEvents.set(name, callback); return () => nativeEvents.delete(name); } },
    core: { invoke },
  } };
  const document = { readyState: 'loading', addEventListener: (name, callback) => domEvents.set(name, callback), elementFromPoint: () => null };
  runInNewContext(bundle.outputFiles[0].text, { window, document, console, File, atob, URL, fetch: fetchResource });
  return { window, nativeEvents, domEvents };
}

test('native API preserves every public function without loading preload or Electron', () => {
  const inputs = Object.keys(bundle.metafile.inputs);
  assert(inputs.every((path) => !/src\/(?:preload|main)\/|node_modules\/(?:electron|@electron-toolkit)/.test(path)));
  const { window } = page();
  const legacy = readFileSync(new URL('../../src/preload/index.ts', import.meta.url), 'utf8');
  const names = [...legacy.slice(legacy.indexOf('const api = {')).matchAll(/^ {2}(\w+):/gm)].map((match) => match[1]);
  assert(names.length > 250);
  names.forEach((name) => assert.equal(typeof window.api[name], 'function', name));
  assert.equal(typeof window.api.selectFiles, 'function');
  assert.equal(window.electron, undefined);
});

test('slow system requests run concurrently while window operations remain ordered', async () => {
  const calls = []; let finishHardware;
  const { window } = page(async (_command, { channel }) => {
    calls.push(channel);
    if (channel === 'system:brightness:get') return new Promise((resolve) => { finishHardware = resolve; });
    return null;
  });
  const hardware = window.api.getBrightness();
  await Promise.all([window.desktop.invoke('window:transition:begin', 1), window.desktop.invoke('window:collapse')]);
  assert.deepEqual(calls, ['system:brightness:get', 'window:transition:begin', 'window:collapse']);
  finishHardware(50); assert.equal(await hardware, 50);
});

test('settings events receive native arguments and cancelled listeners stay detached', () => {
  const { window, nativeEvents } = page(); const values = [];
  const first = window.api.onSettingsChanged((...args) => values.push(args));
  const second = window.api.onSettingsChanged((...args) => values.push(args));
  const emit = () => nativeEvents.get('eisland-ipc')({ payload: { channel: 'settings:changed', args: ['music:lyrics-enabled', false] } });
  first(); first(); emit();
  assert.equal(values.length, 1); assert.deepEqual(values[0], ['music:lyrics-enabled', false]);
  second(); emit(); assert.equal(values.length, 1);
});

test('file paths come from the native selector instead of browser-controlled File names', async () => {
  const { window } = page(async (_command, { channel }) => channel === 'app:pick-files' ? ['C:\\music\\track.flac'] : null);
  const files = await window.api.selectFiles();
  assert.equal(files[0].name, 'track.flac');
  assert.equal(window.api.getPathForFile(files[0]), 'C:\\music\\track.flac');
  assert.equal(window.api.getPathForFile(new File([], 'C:\\private\\secret.txt')), '');
});

test('native screenshot and file bytes become actual Uint8Array values', async () => {
  const { window } = page(async (_command, { channel }) => channel === 'system:screenshot' ? 'data:image/png;base64,AQID' : [4, 5, 6]);
  assert.deepEqual([...await window.api.screenshot()], [1, 2, 3]);
  assert.deepEqual([...await window.api.readLocalFileAsBuffer('fixture')], [4, 5, 6]);
});

test('large native file data uses the local resource stream without JSON byte expansion', async () => {
  const urls = [];
  const { window } = page(async () => 'http://127.0.0.1:1234/private-resource/file', async (url) => {
    urls.push(String(url)); return new Response(Uint8Array.from([7, 8, 9]));
  });
  assert.deepEqual([...await window.api.readLocalFileAsBuffer('fixture')], [7, 8, 9]);
  assert.deepEqual(urls, ['http://127.0.0.1:1234/private-resource/file']);
});
