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
 * @file cliHookHarness.ts
 * @description CLI状态 Hook 私有原生快照、音频和窗口叶边界工具，保留真实音量与 Zustand 操作。
 * @author 鸡哥
 */

import { vi } from 'vitest';
import { ipc, resetStandalone, surface, values } from './standaloneIpcHarness';

export interface CliSnapshot {
  sessions: Array<{ id: string; phase: 'idle' | 'running' | 'waiting_permission' | 'completed'; pendingPermission?: { id: string } | null }>;
  events?: Array<{ id: string; eventName?: string }>;
}
type SnapshotListener = (snapshot: CliSnapshot | null | undefined) => void;
export let claude: SnapshotListener | null = null;
export let codex: SnapshotListener | null = null;
export const play = vi.fn(() => Promise.resolve());
export const audios: Array<{ src: string; volume: number; loop: boolean; preload: string; currentTime: number; play: typeof play }> = [];
export const cliIpc = {
  claudeCodeStatusGet: vi.fn(() => Promise.resolve<CliSnapshot | null>({ sessions: [] })),
  codexStatusGet: vi.fn(() => Promise.resolve<CliSnapshot | null>({ sessions: [] })),
  onClaudeCodeStatusUpdated: vi.fn((listener: SnapshotListener) => { claude = listener; return () => { claude = null; }; }),
  onCodexStatusUpdated: vi.fn((listener: SnapshotListener) => { codex = listener; return () => { codex = null; }; }),
  cliGlowShow: vi.fn(),
  expandWindowNotification: vi.fn(),
  disableMousePassthrough: vi.fn(),
};

/**
 * 建立原生 Audio 构造器叶边界，播放逻辑仍由真实音量和提醒音工具执行。
 * @param src - 实际工具请求的声音地址。
 * @returns 可观察的媒体元素。
 */
function createAudio(src: string): HTMLAudioElement {
  const audio = { src, play, volume: 1, loop: false, preload: '', currentTime: 0 };
  audios.push(audio); return audio as unknown as HTMLAudioElement;
}

/**
 * 重置原生快照请求、广播及播放边界。
 */
export function resetCliBoundary(): void {
  resetStandalone(); claude = null; codex = null;
  cliIpc.claudeCodeStatusGet.mockReset().mockResolvedValue({ sessions: [] });
  cliIpc.codexStatusGet.mockReset().mockResolvedValue({ sessions: [] });
  play.mockReset().mockResolvedValue(undefined);
  values.set('sound-volume-global', 0.5); values.set('sound-volume-effect', 0.4);
  vi.stubGlobal('window', Object.assign(surface, { api: { ...ipc, ...cliIpc }, localStorage: { setItem: vi.fn(), getItem: () => null } }));
  // eslint-disable-next-line prefer-arrow-callback -- Audio 由真实源码使用 new 调用，必须保留可构造函数。
  vi.stubGlobal('Audio', function AudioBoundary(src: string) { return createAudio(src); });
}

/**
 * 发送完整的有效会话标识与阶段，原生快照其他字段与当前 Hook 无关。
 * @param phase - 有效会话阶段。
 * @param id - 会话标识。
 * @returns 当前 Hook 读取的快照字段。
 */
export function snapshot(phase: CliSnapshot['sessions'][number]['phase'] = 'running', id = 'session'): CliSnapshot {
  return { sessions: [{ id, phase }] };
}
