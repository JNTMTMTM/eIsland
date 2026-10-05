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
 * @file test-quick-nav.mjs
 * @description 在无网络、独立用户目录的隐藏 Electron 窗口验证快速导航行为与渲染成本。
 * @author 鸡哥
 * @example node scripts/test-quick-nav.mjs
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = resolve(dirname(scriptPath), '..');
const fixtureFlag = '--quick-nav-fixture';
const baseline = process.argv.includes('--baseline');

/**
 * 验证目录边界后只清理本次测试生成的临时目录。
 * @param fixtureDirectory - mkdtemp 返回的绝对临时路径。
 * @returns 清理完成后的 Promise。
 */
async function cleanupFixture(fixtureDirectory) {
  if (dirname(resolve(fixtureDirectory)) !== resolve(tmpdir()) || !basename(fixtureDirectory).startsWith('eisland-quick-nav-')) {
    throw new Error('Unexpected fixture temporary directory.');
  }
  await rm(fixtureDirectory, { recursive: true, force: true, maxRetries: 3 });
}

/**
 * 运行独立测试页；不加载应用 preload、用户配置或网络。
 * @returns 测试完成后的 Promise。
 */
async function runElectronFixture() {
  const { app, BrowserWindow } = await import('electron');
  const fixtureDirectory = process.argv[process.argv.indexOf(fixtureFlag) + 1];
  app.setPath('userData', join(fixtureDirectory, 'user-data'));
  app.setPath('sessionData', join(fixtureDirectory, 'session-data'));
  app.disableHardwareAcceleration();
  await app.whenReady();
  const window = new BrowserWindow({
    show: false,
    width: 1100,
    height: 700,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false, offscreen: true },
  });
  window.webContents.session.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_details, callback) => {
    callback({ cancel: true });
  });
  const timeout = setTimeout(() => {
    console.error('Quick navigation fixture timed out.');
    app.exit(1);
  }, 60000);
  try {
    await window.loadFile(join(fixtureDirectory, 'index.html'));
    const result = await window.webContents.executeJavaScript(`window.runQuickNavTests(${!baseline})`);
    console.log(JSON.stringify({ baseline, ...result }, null, 2));
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
 * 打包真实导航组件；基线模式仅从 Git HEAD 读取旧源码，不修改工作树。
 * @returns 测试完成后的 Promise。
 */
async function runFixture() {
  const { build } = await import('esbuild');
  const { spawn, execFileSync } = await import('node:child_process');
  const { default: electronPath } = await import('electron');
  const fixtureDirectory = await mkdtemp(join(tmpdir(), 'eisland-quick-nav-'));
  const mockPath = join(projectRoot, 'scripts/fixtures/quick-nav-mocks.tsx');
  const sectionPath = 'src/renderer/components/states/maxExpand/components/setting/components/index/IndexSettingsSection.tsx';
  try {
    await build({
      absWorkingDir: projectRoot,
      entryPoints: ['scripts/fixtures/quick-nav.tsx'],
      outfile: join(fixtureDirectory, 'fixture.js'),
      bundle: true,
      platform: 'browser',
      jsx: 'automatic',
      define: { 'process.env.NODE_ENV': '"production"' },
      logLevel: 'warning',
      plugins: [{
        name: 'isolated-quick-nav',
        setup(builder) {
          builder.onResolve({ filter: /\/store\/slices$|\/components\/components\/DynamicIslandQuestionnaireBanner$/ }, () => ({ path: mockPath }));
          if (baseline) {
            builder.onLoad({ filter: /[/\\]IndexSettingsSection\.tsx$/ }, () => ({
              contents: execFileSync('git', ['show', `HEAD:${sectionPath}`], { cwd: projectRoot, encoding: 'utf8', windowsHide: true }),
              loader: 'tsx',
              resolveDir: dirname(join(projectRoot, sectionPath)),
            }));
          }
        },
      }],
    });
    await writeFile(join(fixtureDirectory, 'index.html'), `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src data:"><link rel="stylesheet" href="./fixture.css"><title>Quick navigation regression</title></head><body><div id="root"></div><script src="./fixture.js"></script></body></html>`);
    const environment = { ...process.env };
    delete environment.ELECTRON_RUN_AS_NODE;
    process.exitCode = await new Promise((resolveExit, reject) => {
      const args = [scriptPath, fixtureFlag, fixtureDirectory];
      if (baseline) args.push('--baseline');
      const child = spawn(electronPath, args, { cwd: projectRoot, env: environment, stdio: 'inherit', windowsHide: true });
      child.once('error', reject);
      child.once('exit', (code) => resolveExit(code ?? 1));
    });
  } finally {
    await cleanupFixture(fixtureDirectory);
  }
}

if (process.versions.electron && process.argv.includes(fixtureFlag)) {
  // Electron 主模块完成求值后才发出 ready，避免顶层 await whenReady 互相等待。
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
