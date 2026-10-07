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
 * @file native.ts
 * @description E2E 构建专用原生模块替身；查询返回不可用，原生控制明确失败。
 * @author 鸡哥
 */

/**
 * 原生能力在跨平台 UI 测试中不可用。
 * @returns 不可用状态。
 */
function unavailable(): null {
  return null;
}

/**
 * 阻止 UI 测试意外调用真实硬件控制。
 * @returns 不会返回，直接抛出错误。
 */
function rejectControl(): never {
  throw new Error('Native controls are outside the cross-platform E2E suite.');
}

/**
 * 返回无媒体会话的时间戳。
 * @returns 未播放的媒体会话信息。
 */
export function getTimestamp() {
  return { isAvailable: false, playbackStatus: 'unknown', timeline: null };
}

export {
  unavailable as getVolume,
  unavailable as getMute,
  unavailable as getBrightness,
  unavailable as getIconByPath,
  unavailable as getIconByShortcutPath,
  rejectControl as play,
  rejectControl as pause,
  rejectControl as next,
  rejectControl as previous,
  rejectControl as seek,
  rejectControl as setVolume,
  rejectControl as setMute,
  rejectControl as setBrightness,
};
