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
 * @file aiChatStorage.test.ts
 * @description 在独立临时用户目录的隐藏 Electron 中验证真实 IndexedDB 原子迁移和正文读写。
 * @author 鸡哥
 */
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { expect, it } from 'vitest';
import { transform } from 'esbuild';
import { createRequire } from 'node:module';

it('commits migration atomically and loads only requested bodies in real IndexedDB', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eisland-chat-storage-'));
  try {
    const source = await readFile(resolve('src/renderer/store/utils/aiChatStorage.ts'), 'utf8');
    const compiled = (await transform(source, { loader: 'ts', format: 'cjs', target: 'es2022' })).code;
    const checks = `(async () => {
      const module = {exports: {}};
      ${compiled}
      const db = module.exports.aiChatStorage;
      const session = (id, text) => ({ id, title: id, updatedAt: 1, messages: [{role: 'user', content: text}] });
      let aborted = false;
      try { await db.initialize(() => [session('a', 'original')], () => () => {}); } catch { aborted = true; }
      if (!aborted || (await db.list()).length) throw new Error('Migration was not atomic');
      await db.initialize(() => [session('a', 'original'), session('b', 'other')], () => ({raw: 'backup'}));
      const index = await db.list();
      if (index.length !== 2 || index.some(item => 'messages' in item)) throw new Error('Index contains bodies');
      await db.initialize(() => { throw new Error('Legacy loaded twice'); }, () => { throw new Error('Backup loaded twice'); });
      await db.save(session('a', 'updated'));
      if ((await db.read('a'))[0].content !== 'updated' || (await db.read('b'))[0].content !== 'other') throw new Error('Body overwrite');
      await db.remove('a');
      if (await db.read('a') !== undefined || (await db.list()).length !== 1) throw new Error('Delete failed');
      return 'CHAT_STORAGE_PASS';
    })()`;
    await writeFile(join(directory, 'blank.html'), '<!doctype html><title>Storage test</title>');
    const script = `const {app,BrowserWindow}=require(${JSON.stringify(resolve('node_modules/electron'))});
      app.setPath('userData',${JSON.stringify(join(directory, 'profile'))});
      app.disableHardwareAcceleration();
      app.whenReady().then(async()=>{try{
        const win=new BrowserWindow({show:false,webPreferences:{sandbox:true}});
        await win.loadFile(${JSON.stringify(join(directory, 'blank.html'))});
        console.log(await win.webContents.executeJavaScript(${JSON.stringify(checks)}));
        win.destroy(); app.exit(0);
      }catch(error){console.error(error);app.exit(1);}});`;
    // Electron's module path resolves to its executable under ordinary Node; native main uses require('electron').
    await writeFile(join(directory, 'main.cjs'), script.replace(JSON.stringify(resolve('node_modules/electron')), "'electron'"));
    const environment = { ...process.env };
    delete environment.ELECTRON_RUN_AS_NODE;
    const result = await promisify(execFile)(createRequire(import.meta.url)('electron'), [join(directory, 'main.cjs')], {
      env: environment, windowsHide: true, timeout: 20000,
    });
    expect(result.stdout).toContain('CHAT_STORAGE_PASS');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 25000);
