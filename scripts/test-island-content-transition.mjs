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
 * @file test-island-content-transition.mjs
 * @description 在隔离的隐藏 Electron 窗口中验证真实 React 内容切换与 CSS 布局。
 * @author 鸡哥
 * @example node scripts/test-island-content-transition.mjs
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = resolve(dirname(scriptPath), '..');
const electronMode = process.versions.electron && process.argv.includes('--island-transition-fixture');

/**
 * 仅清理本次测试创建的临时目录。
 * @param fixtureDirectory - 本次 mkdtemp 生成的绝对路径。
 * @returns 清理完成后的 Promise。
 */
async function cleanupFixture(fixtureDirectory) {
  if (dirname(resolve(fixtureDirectory)) !== resolve(tmpdir()) || !basename(fixtureDirectory).startsWith('eisland-content-transition-')) {
    throw new Error('Unexpected fixture temporary directory.');
  }
  await rm(fixtureDirectory, { recursive: true, force: true, maxRetries: 3 });
}

/**
 * 只启动独立测试页，不加载真实应用或用户数据。
 * @returns 测试完成后的 Promise。
 */
async function runElectronFixture() {
  const { app, BrowserWindow } = await import('electron');
  const fixtureDirectory = process.argv[process.argv.indexOf('--island-transition-fixture') + 1];
  app.setPath('userData', join(fixtureDirectory, 'user-data'));
  app.setPath('sessionData', join(fixtureDirectory, 'session-data'));
  await app.whenReady();
  const window = new BrowserWindow({
    show: false,
    width: 1100,
    height: 600,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      offscreen: true,
    },
  });
  window.webContents.setFrameRate(60);
  window.webContents.session.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_details, callback) => {
    callback({ cancel: true });
  });
  const timeout = setTimeout(() => {
    console.error('Island transition fixture timed out.');
    app.exit(1);
  }, 60000);
  try {
    await window.loadFile(join(fixtureDirectory, 'index.html'));
    const result = await window.webContents.executeJavaScript('window.runIslandTransitionTests()');
    console.log(JSON.stringify(result, null, 2));
    clearTimeout(timeout);
    window.destroy();
    app.exit(0);
  } catch (error) {
    console.error(error);
    clearTimeout(timeout);
    window.destroy();
    app.exit(1);
  }
}

/**
 * 打包当前业务组件并启动真实 Chromium 回归测试。
 * @returns 测试完成后的 Promise。
 */
async function runFixture() {
  const { build } = await import('esbuild');
  const { spawn } = await import('node:child_process');
  const { default: electronPath } = await import('electron');
  const fixtureDirectory = await mkdtemp(join(tmpdir(), 'eisland-content-transition-'));
  try {
    await build({
      absWorkingDir: projectRoot,
      entryPoints: ['scripts/fixtures/island-content-transition.tsx'],
      outfile: join(fixtureDirectory, 'fixture.js'),
      bundle: true,
      platform: 'browser',
      jsx: 'automatic',
      define: { 'process.env.NODE_ENV': '"production"' },
      logLevel: 'warning',
    });
    await writeFile(join(fixtureDirectory, 'index.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'"><link rel="stylesheet" href="./fixture.css"><title>Island transition regression</title></head><body><div id="root"></div><script src="./fixture.js"></script></body></html>`);
    const environment = { ...process.env };
    delete environment.ELECTRON_RUN_AS_NODE;
    const exitCode = await new Promise((resolveExit, reject) => {
      const child = spawn(electronPath, [scriptPath, '--island-transition-fixture', fixtureDirectory], {
        cwd: projectRoot,
        env: environment,
        stdio: 'inherit',
        windowsHide: true,
      });
      child.once('error', reject);
      child.once('exit', (code) => resolveExit(code ?? 1));
    });
    process.exitCode = exitCode;
  } finally {
    await cleanupFixture(fixtureDirectory);
  }
}

if (electronMode) {
  // Electron 在主模块求值后才发出 ready；顶层 await whenReady 会形成互相等待。
  void (async () => {
    try {
      await runElectronFixture();
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  })();
} else {
  await runFixture();
}
