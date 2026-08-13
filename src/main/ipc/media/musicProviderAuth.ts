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
 */

/**
 * @file musicProviderAuth.ts
 * @description 音乐提供商登录 IPC 处理模块
 * @author 鸡哥
 */

import { ipcMain } from 'electron';
import type { MusicProviderId } from '../../../shared/musicProviderAuth';
import {
  checkQishuiQrCode,
  clearQishuiAuth,
  createQishuiQrCode,
  getQishuiAuthStatus,
} from '../../music/providers/qishuiAuthService';

const PROVIDER_HANDLERS = {
  qishui: {
    createQrCode: createQishuiQrCode,
    checkQrCode: checkQishuiQrCode,
    getStatus: getQishuiAuthStatus,
    clear: clearQishuiAuth,
  },
} satisfies Record<MusicProviderId, {
  createQrCode: () => Promise<unknown>;
  checkQrCode: (token: string) => Promise<unknown>;
  getStatus: () => unknown;
  clear: () => Promise<unknown>;
}>;

function providerHandler(provider: MusicProviderId) {
  const handler = PROVIDER_HANDLERS[provider];
  if (!handler) throw new Error('MUSIC_PROVIDER_NOT_SUPPORTED');
  return handler;
}

/** 注册音乐提供商认证 IPC 处理器 */
export function registerMusicProviderAuthIpcHandlers(): void {
  ipcMain.handle('music-provider-auth:status', (_event, provider: MusicProviderId) => {
    return providerHandler(provider).getStatus();
  });
  ipcMain.handle('music-provider-auth:create-qr', (_event, provider: MusicProviderId) => {
    return providerHandler(provider).createQrCode();
  });
  ipcMain.handle('music-provider-auth:check-qr', (_event, provider: MusicProviderId, token: string) => {
    return providerHandler(provider).checkQrCode(token);
  });
  ipcMain.handle('music-provider-auth:clear', (_event, provider: MusicProviderId) => {
    return providerHandler(provider).clear();
  });
}