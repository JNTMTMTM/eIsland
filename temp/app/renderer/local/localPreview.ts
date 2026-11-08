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
 * @file localPreview.ts
 * @description 本地前端预览的内存状态与模拟 API；不访问 IPC、文件或网络。
 * @author 鸡哥
 */
import { ADAPTER_VERSION } from '../../shared/config/adapterConfig';
import type { AdapterApi, AdapterState, Phase, SourceId } from '../../shared/types/adapterTypes';

export const LOCAL_PHASES: Phase[] = ['welcome', 'inspecting', 'ready', 'backing-up', 'downloading', 'verifying', 'prepared', 'installing', 'complete', 'installed', 'cancelled', 'error'];

/** 创建独立的前端模拟会话。
 * @returns 模拟 preload API 以及供预览工具栏使用的阶段切换方法。
 */
export function createLocalPreview() {
  let source: SourceId = 'esa';
  let selectedDirectory = 'C:/Users/Preview/AppData/Local/eIsland-Tauri';
  let removeLegacy = false;
  const listeners = new Set<(state: AdapterState) => void>();
  const snapshot = (phase: Phase): AdapterState => ({
    phase, source, removeLegacy, sources: [{ id: 'esa' }, { id: 'r2' }, { id: 'github' }], signingConfigured: true,
    inspection: {
      installations: [{ directory: 'C:/Users/Preview/AppData/Local/eIsland', version: ADAPTER_VERSION, runtime: 'electron', uninstaller: 'C:/Users/Preview/AppData/Local/eIsland/Uninstall eIsland.exe' }], running: [], dataRoots: ['C:/Users/Preview/AppData/Roaming/eIsland'],
      legacyStore: 'C:/Users/Preview/AppData/Roaming/eIsland/eIsland_store',
      tauriStore: 'C:/Users/Preview/AppData/Roaming/com.pyisland.eisland',
      selectedStore: 'C:/Users/Preview/AppData/Roaming/eIsland/eIsland_store', targetDirectory: selectedDirectory,
    },
    release: { version: ADAPTER_VERSION, notes: '', url: 'https://example.invalid/preview.exe', signature: 'preview-only' },
    backup: ['downloading', 'verifying', 'prepared', 'installing', 'complete'].includes(phase)
      ? { directory: 'C:/Users/Preview/AppData/Local/eIsland-Migration/backups/preview', files: 128, bytes: 8388608 } : null,
    progress: { done: 67108864, total: 104857600 }, error: phase === 'error' ? 'network' : null,
  });
  let state = snapshot('welcome');
  const setPhase = (phase: Phase): void => {
    state = snapshot(phase);
    listeners.forEach((listener) => listener(structuredClone(state)));
  };
  const move = (phase: Phase): Promise<void> => { setPhase(phase); return Promise.resolve(); };
  const api: AdapterApi = {
    getState: () => Promise.resolve(structuredClone(state)),
    inspect: (value) => { source = value; return move('ready'); },
    prepare: () => move('prepared'), install: () => move('complete'),
    chooseLocal: () => move('ready'),
    chooseDirectory: () => { selectedDirectory = 'D:/Apps/eIsland'; return move(state.phase); },
    setRemoveLegacy: (remove) => { removeLegacy = remove; return move(state.phase); }, cancel: () => move('cancelled'),
    dismissError: () => move('welcome'), launch: () => move('welcome'), close: () => move('welcome'),
    openBackup: () => Promise.resolve(),
    onState: (callback) => { listeners.add(callback); return () => { listeners.delete(callback); }; },
  };
  return { api, setPhase };
}

export const localPreview = createLocalPreview();
