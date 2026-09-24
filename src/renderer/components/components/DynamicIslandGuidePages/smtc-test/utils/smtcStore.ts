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
 * @file smtcStore.ts
 * @description 引导 SMTC — 模块级单例状态
 * @author 鸡哥
 */

import type { SmtcTestStatus, SmtcMediaMeta } from '../types';

/** 仅保留当前封面任务，避免 base64 图片作为 key 长期累积，并合并并发提色。 */
export const dominantColorCache = new Map<string, Promise<[number, number, number]>>();

/** 运行时状态（跨组件挂载持久化） */
export const runtime = {
  status: 'loading' as SmtcTestStatus,
  meta: null as SmtcMediaMeta | null,
  coverImage: null as string | null,
  dominantColor: [0, 0, 0] as [number, number, number],
  sourceAppId: '',
  initialized: false,
  unsubscribe: null as (() => void) | null,
  listeners: new Set<() => void>(),
};

/** 通知所有订阅者触发重渲染 */
export function notify(): void {
  runtime.listeners.forEach((fn) => fn());
}
