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
 * @file registerAdapterIpc.ts
 * @description 只允许受信任主文档调用固定动作，不暴露任意路径、进程或 IPC 转发。
 * @author 鸡哥
 */
import { readFile, stat } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { ipcMain, dialog, shell } from 'electron';
import { IPC } from '../../shared/config/adapterConfig';
import { parseRelease } from '../services/releaseService';
import type { SourceId } from '../../shared/types/adapterTypes';
import type { MigrationService } from '../services/migrationService';
import type { BrowserWindow, IpcMainInvokeEvent } from 'electron';

/** 注册最小权限迁移动作。
 * @param window - 唯一可信的本地窗口。
 * @param service - 主进程状态机。
 * @param trustedUrl - 构建页面或开发服务器的确切入口。
 */
export function registerAdapterIpc(window: BrowserWindow, service: MigrationService, trustedUrl: string): void {
  const validate = (event: IpcMainInvokeEvent): void => {
    const frame = event.senderFrame;
    const main = window.webContents.mainFrame;
    if (event.sender !== window.webContents || !frame || frame.processId !== main.processId || frame.routingId !== main.routingId || frame.url.split('#')[0] !== trustedUrl.split('#')[0]) throw new Error('Unauthorized adapter request');
  };
  const handle = (channel: string, action: (...args: unknown[]) => unknown): void => {
    ipcMain.handle(channel, (event, ...args) => { validate(event); return action(...args as unknown[]); });
  };
  handle(IPC.state, () => structuredClone(service.state));
  handle(IPC.inspect, (source) => {
    if (typeof source !== 'string' || !service.state.sources.some((entry) => entry.id === source)) throw new Error('Invalid source');
    return service.inspect(source as SourceId);
  });
  handle(IPC.local, async () => {
    const result = await dialog.showOpenDialog(window, { properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }] });
    const [manifest] = result.filePaths;
    if (result.canceled || !manifest) return;
    if ((await stat(manifest)).size > 1024 * 1024) throw new Error('Invalid manifest');
    const release = parseRelease(JSON.parse(await readFile(manifest, 'utf8')));
    const name = decodeURIComponent(new URL(release.url).pathname.split('/').at(-1) || '');
    if (!name || basename(name) !== name || /[\\/\0<>:"|?*]/.test(name)) throw new Error('Invalid installer name');
    await service.inspect('local', { release, file: join(dirname(manifest), name) });
  });
  handle(IPC.prepare, () => service.prepare());
  handle(IPC.install, () => service.install());
  handle(IPC.cancel, () => service.cancel());
  handle(IPC.dismissError, () => service.dismissError());
  handle(IPC.backup, async () => { if (service.state.backup) await shell.openPath(service.state.backup.directory); });
  handle(IPC.launch, async () => {
    if (['complete', 'installed'].includes(service.state.phase) && service.state.inspection) {
      const error = await shell.openPath(join(service.state.inspection.targetDirectory, 'eisland.exe'));
      if (error) throw new Error('Application launch failed');
      window.close();
    }
  });
  handle(IPC.close, () => { if (service.state.phase !== 'installing') { service.cancel(); window.close(); } });
  window.on('closed', () => Object.values(IPC).forEach((channel) => ipcMain.removeHandler(channel)));
}
