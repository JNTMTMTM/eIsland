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
 * @file index.ts
 * @description 隔离上下文仅暴露固定迁移动作，不向 renderer 暴露 Electron 事件或 Node 能力。
 * @author 鸡哥
 */
import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/config/adapterConfig';
import type { AdapterApi, AdapterState } from '../shared/types/adapterTypes';

const api: AdapterApi = {
  getState: () => ipcRenderer.invoke(IPC.state),
  inspect: (source) => ipcRenderer.invoke(IPC.inspect, source),
  chooseLocal: () => ipcRenderer.invoke(IPC.local),
  chooseDirectory: () => ipcRenderer.invoke(IPC.directory),
  setRemoveLegacy: (remove) => ipcRenderer.invoke(IPC.removeLegacy, remove),
  prepare: () => ipcRenderer.invoke(IPC.prepare),
  install: () => ipcRenderer.invoke(IPC.install),
  cancel: () => ipcRenderer.invoke(IPC.cancel),
  dismissError: () => ipcRenderer.invoke(IPC.dismissError),
  openBackup: () => ipcRenderer.invoke(IPC.backup),
  launch: () => ipcRenderer.invoke(IPC.launch),
  close: () => ipcRenderer.invoke(IPC.close),
  onState: (callback) => {
    const listener = (event: Electron.IpcRendererEvent, state: AdapterState): void => { void event; callback(state); };
    ipcRenderer.on(IPC.changed, listener);
    return () => ipcRenderer.removeListener(IPC.changed, listener);
  },
};
contextBridge.exposeInMainWorld('migration', api);
