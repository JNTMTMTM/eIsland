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
 * @file qishuiAuthService.ts
 * @description 汽水音乐官方 Passport 二维码登录服务
 * @author 鸡哥
 */

import { app } from 'electron';
import { join } from 'path';
import type {
  MusicProviderAuthStatus,
  MusicProviderQrCodeResult,
} from '../../../shared/musicProviderAuth';

interface QishuiQrEnvelope {
  message?: string;
  data?: {
    token?: string;
    scan_url?: string;
    expire_time?: number;
    error_code?: number;
    status?: string | number;
    description?: string;
  };
}

interface QishuiBridgeStatus {
  loggedIn: boolean;
}

interface QishuiQrBridge {
  createQrCode: () => Promise<QishuiQrEnvelope>;
  checkQrConnect: (token: string) => Promise<QishuiQrEnvelope>;
  getStatus: () => QishuiBridgeStatus;
  clear: () => Promise<QishuiBridgeStatus>;
}

interface QishuiQrBridgeModule {
  createQishuiQrLoginBridge: (options: { configFile: string }) => QishuiQrBridge;
}

let bridge: QishuiQrBridge | null = null;

function getResourceRoot(): string {
  return app.isPackaged ? process.resourcesPath : join(app.getAppPath(), 'resources');
}

function getBridge(): QishuiQrBridge {
  if (bridge) return bridge;
  const runtimePath = join(getResourceRoot(), 'qishui-qr-login.js');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const runtime = require(runtimePath) as QishuiQrBridgeModule;
  bridge = runtime.createQishuiQrLoginBridge({
    configFile: join(app.getPath('userData'), 'music-providers', 'qishui.json'),
  });
  return bridge;
}

function parseExpiresAt(expireTime: number | undefined): number | null {
  if (!expireTime || !Number.isFinite(expireTime)) return null;
  return expireTime > 1_000_000_000_000 ? expireTime : expireTime * 1000;
}

function baseStatus(state: MusicProviderAuthStatus['state']): MusicProviderAuthStatus {
  return {
    provider: 'qishui',
    loggedIn: state === 'confirmed',
    state,
    retryAfterMs: 0,
  };
}

/**
 * 创建汽水音乐登录二维码
 * @returns 二维码内容、轮询 token 与过期时间
 */
export async function createQishuiQrCode(): Promise<MusicProviderQrCodeResult> {
  const result = await getBridge().createQrCode();
  const data = result.data ?? {};
  const token = String(data.token ?? '').trim();
  const qrContent = String(data.scan_url ?? '').trim();
  if (!token || !qrContent) throw new Error('QISHUI_QR_PAYLOAD_INCOMPLETE');
  return {
    ...baseStatus('waiting'),
    token,
    qrContent,
    expiresAt: parseExpiresAt(data.expire_time),
  };
}

/**
 * 检查汽水音乐二维码登录状态
 * @param token - 创建二维码时返回的轮询 token
 * @returns 标准化后的登录状态
 */
export async function checkQishuiQrCode(token: string): Promise<MusicProviderAuthStatus> {
  let result: QishuiQrEnvelope;
  try {
    result = await getBridge().checkQrConnect(token);
  } catch (error) {
    const codedError = error as Error & { code?: string };
    if (codedError.code === 'QISHUI_MFA_CANCELLED') {
      return {
        ...baseStatus('mfa_cancelled'),
        errorCode: codedError.code,
        message: codedError.message,
      };
    }
    throw error;
  }
  if (getBridge().getStatus().loggedIn) return baseStatus('confirmed');

  const data = result.data ?? {};
  const errorCode = Number(data.error_code ?? 0);
  const rawStatus = String(data.status ?? '').trim();
  if (errorCode === 2) return { ...baseStatus('expired'), errorCode: String(errorCode) };
  if (errorCode === 7) return { ...baseStatus('rate_limited'), retryAfterMs: 60_000, errorCode: String(errorCode) };
  if (rawStatus === '2') return baseStatus('scanned');
  return {
    ...baseStatus('waiting'),
    message: result.message || data.description || undefined,
  };
}

/**
 * 获取汽水音乐本地登录状态
 * @returns 当前是否已持久化有效会话
 */
export function getQishuiAuthStatus(): MusicProviderAuthStatus {
  return baseStatus(getBridge().getStatus().loggedIn ? 'confirmed' : 'idle');
}

/**
 * 清除汽水音乐登录会话
 * @returns 清理后的登录状态
 */
export async function clearQishuiAuth(): Promise<MusicProviderAuthStatus> {
  await getBridge().clear();
  return baseStatus('idle');
}