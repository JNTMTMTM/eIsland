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
 * @file smtcAccessor.ts
 * @description SMTC 会话共享访问器，供 agent 工具等非 IPC 上下文读取当前播放信息
 * @author 鸡哥
 */

interface SmtcSessionPayload {
  title: string;
  artist: string;
  album: string;
  duration_ms: number;
  position_ms: number;
  isPlaying: boolean;
  thumbnail: string | null;
  deviceId: string;
}

interface SmtcSessionEntry {
  payload: unknown;
  hasTitle: boolean;
}

type SmtcSessionRuntimeGetter = () => Map<string, SmtcSessionEntry> | null;
type CurrentDeviceIdGetter = () => string;

let _getSmtcSessionRuntime: SmtcSessionRuntimeGetter | null = null;
let _getCurrentDeviceId: CurrentDeviceIdGetter | null = null;

/**
 * 由 index.ts 在 smtcService 创建后调用，注入访问器
 */
export function setSmtcAccessor(
  getSmtcSessionRuntime: SmtcSessionRuntimeGetter,
  getCurrentDeviceId: CurrentDeviceIdGetter,
): void {
  _getSmtcSessionRuntime = getSmtcSessionRuntime;
  _getCurrentDeviceId = getCurrentDeviceId;
}

/**
 * 获取当前正在播放的媒体信息（不含专辑封面 thumbnail）
 * @returns 当前播放信息或 null
 */
export function getSmtcNowPlaying(): Omit<SmtcSessionPayload, 'thumbnail'> | null {
  if (!_getSmtcSessionRuntime || !_getCurrentDeviceId) return null;
  const runtime = _getSmtcSessionRuntime();
  if (!runtime) return null;
  const deviceId = _getCurrentDeviceId();
  if (!deviceId) return null;
  const entry = runtime.get(deviceId);
  if (!entry?.hasTitle) return null;
  const p = entry.payload as SmtcSessionPayload;
  return {
    title: p.title ?? '',
    artist: p.artist ?? '',
    album: p.album ?? '',
    duration_ms: p.duration_ms ?? 0,
    position_ms: p.position_ms ?? 0,
    isPlaying: p.isPlaying ?? false,
    deviceId: p.deviceId ?? '',
  };
}
