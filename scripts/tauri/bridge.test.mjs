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

/** @file bridge.test.mjs
 * @description 验证慢硬件调用不会阻塞窗口命令，同时保持窗口过渡消息顺序。
 * @author 鸡哥
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

test('hardware queries do not block ordered window operations', async () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  execFileSync(process.execPath, ['scripts/tauri/build-bridge.mjs'], { cwd: root, windowsHide: true });
  const calls = [];
  let finishHardware;
  const window = { __TAURI__: {
    event: { listen: async () => () => {} },
    core: { invoke: async (command, { channel }) => {
      void command;
      calls.push(channel);
      if (channel === 'system:brightness:get') return new Promise((resolve) => { finishHardware = resolve; });
      return null;
    } },
  } };
  runInNewContext(readFileSync(new URL('../../src-tauri/generated/bridge.js', import.meta.url), 'utf8'), {
    window, console, navigator: { platform: 'Win32' }, document: { addEventListener: () => {} },
  });
  const hardware = window.api.getBrightness();
  const first = window.electron.ipcRenderer.invoke('window:transition:begin', 1);
  const second = window.electron.ipcRenderer.invoke('window:collapse');
  await Promise.all([first,second]);
  assert.deepEqual(calls, ['system:brightness:get', 'window:transition:begin', 'window:collapse']);
  finishHardware(50);
  assert.equal(await hardware,50);
});
