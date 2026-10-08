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

import { EventEmitter } from 'events';

/** 获取当前默认播放设备的静音状态 */
export function getMute(): boolean | null;

/** 设置当前默认播放设备的静音状态 */
export function setMute(muted: boolean): boolean;

/** 获取当前默认播放设备的主音量（0-100） */
export function getVolume(): number | null;

/** 设置当前默认播放设备的主音量（0-100） */
export function setVolume(level: number): boolean;

/** 当前默认播放设备的主音量监控器 */
export class VolumeMonitor extends EventEmitter {
  constructor();
  start(): void;
  stop(): void;
  isRunning(): boolean;

  on(event: 'volume-changed', listener: (level: number, timestamp: number) => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
  on(event: string, listener: (...args: any[]) => void): this;

  emit(event: 'volume-changed', level: number, timestamp: number): boolean;
  emit(event: 'error', error: Error): boolean;
  emit(event: string, ...args: any[]): boolean;
}