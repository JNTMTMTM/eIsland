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
 * @file index.ts
 * @description 独立 Electron 27.0.2 适配器的组合入口，旧业务数据仅由备份服务读取。
 * @author 鸡哥
 */
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { app, BrowserWindow, net } from 'electron';
import { FEEDS, IPC } from '../shared/config/adapterConfig';
import { fail } from '../shared/utils/adapterErrors';
import { MigrationService } from './services/migrationService';
import { ReleaseService } from './services/releaseService';
import { backupData } from './services/backupService';
import { inspectSystem, runInstaller } from './services/platformService';
import { verifyInstaller } from './services/verificationService';
import { registerAdapterIpc } from './ipc/registerAdapterIpc';
import type { ServiceConfig } from './types/serviceTypes';

const isolatedRoot = !app.isPackaged ? process.env.EISLAND_ADAPTER_TEST_ROOT : undefined;
const PROFILE_NAME = __ADAPTER_PREVIEW__ ? 'eIsland Migration PREVIEW' : 'eIsland Migration Adapter';
let modelId = 'com.eisland.app';
if (isolatedRoot) modelId = 'com.pyisland.migration.test';
else if (__ADAPTER_PREVIEW__) modelId = 'com.pyisland.migration.preview';
app.setName(PROFILE_NAME);
app.setPath('userData', isolatedRoot ? join(isolatedRoot, 'profile') : join(app.getPath('appData'), PROFILE_NAME));
app.setAppUserModelId(modelId);
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.whenReady().then(async () => {
    const workRoot = isolatedRoot ? join(isolatedRoot, 'work') : join(process.env.LOCALAPPDATA || app.getPath('appData'), PROFILE_NAME);
    await mkdir(workRoot, { recursive: true });
    const config: ServiceConfig = {
      workRoot,
      feeds: { ...FEEDS, ...(__ADAPTER_COS_URL__ ? { cos: __ADAPTER_COS_URL__ } : {}), ...(__ADAPTER_OSS_URL__ ? { oss: __ADAPTER_OSS_URL__ } : {}) },
      publicKey: __ADAPTER_PUBLIC_KEY__,
      verifier: app.isPackaged ? join(process.resourcesPath, 'native/eisland-update-verifier.exe') : resolve(__dirname, '../../native/verifier/target/release/eisland-update-verifier.exe'),
      appData: isolatedRoot ? join(isolatedRoot, 'roaming') : app.getPath('appData'),
      localData: isolatedRoot ? join(isolatedRoot, 'local') : process.env.LOCALAPPDATA || app.getPath('appData'),
      ownExecutable: process.execPath,
    };
    const window = new BrowserWindow({ width: 900, height: 600, minWidth: 820, minHeight: 540, show: false, frame: false, backgroundColor: '#080b11', resizable: false,
      webPreferences: { preload: join(__dirname, '../preload/index.js'), contextIsolation: true, sandbox: true, nodeIntegration: false, webSecurity: true } });
    const client = new ReleaseService((input, init) => net.fetch(input.href, init));
    const service = new MigrationService(config, {
      inspect: () => inspectSystem(config),
      release: (source, signal) => client.manifest(config.feeds[source] || fail('invalidSource'), signal),
      backup: backupData,
      download: (...args) => client.download(...args),
      verify: (release, file, signal) => verifyInstaller(config.verifier, config.publicKey, release, file, signal),
      install: runInstaller,
      publish: (state) => { if (!window.isDestroyed()) window.webContents.send(IPC.changed, state); },
    });
    const entry = process.env.ELECTRON_RENDERER_URL;
    const trusted = new URL(entry && !app.isPackaged ? entry : pathToFileURL(join(__dirname, '../renderer/index.html')).href).href;
    if (entry && !app.isPackaged && !['localhost', '127.0.0.1'].includes(new URL(trusted).hostname)) throw new Error('Invalid development origin');
    registerAdapterIpc(window, service, trusted);
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event, url) => { if (url !== trusted) event.preventDefault(); });
    window.webContents.on('will-attach-webview', (event) => event.preventDefault());
    window.on('close', (event) => { if (service.state.phase === 'installing') event.preventDefault(); else service.cancel(); });
    window.once('ready-to-show', () => window.show());
    app.on('second-instance', () => { window.show(); window.focus(); });
    await window.loadURL(trusted);
  }).catch(() => { console.error('Adapter initialization failed'); app.quit(); });
}
app.on('window-all-closed', () => app.quit());
