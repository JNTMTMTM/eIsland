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
 * @description 音乐提供商认证的跨进程协议类型
 * @author 鸡哥
 */

/** 支持登录的音乐提供商标识 */
export type MusicProviderId = 'qishui';

/** 音乐提供商登录状态 */
export type MusicProviderAuthState =
  | 'idle'
  | 'waiting'
  | 'scanned'
  | 'confirmed'
  | 'expired'
  | 'rate_limited'
  | 'mfa_cancelled'
  | 'error';

/** 音乐提供商当前会话状态 */
export interface MusicProviderAuthStatus {
  provider: MusicProviderId;
  loggedIn: boolean;
  state: MusicProviderAuthState;
  retryAfterMs: number;
  errorCode?: string;
  message?: string;
}

/** 音乐提供商二维码创建结果 */
export interface MusicProviderQrCodeResult extends MusicProviderAuthStatus {
  token: string;
  qrContent: string;
  expiresAt: number | null;
}