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
 * @file useFileTransferDrop.test.ts
 * @description 文件拖入在允许状态下切换中转站、记录路径、UI 锁定时拒收并在卸载时清理订阅的测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushHookEffects, renderHook, resetHook, unmountHook } from '../../../hooks/test/startupHookHarness';

vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const { createHookReactMock } = await import('../../../hooks/test/startupHookHarness');
  return createHookReactMock(actual);
});
const store = vi.hoisted(() => ({ addFileTransferPaths: vi.fn() }));
vi.mock('../../../../store/fileTransferStore', () => store);
const island = vi.hoisted(() => ({ uiStateLocked: false }));
vi.mock('../../../../store/slices', () => ({ default: { getState: () => island } }));

let dragEnter: ((paths: string[]) => void) | null = null;
const unsubscribe = vi.fn();
const documentBoundary = new EventTarget();
const api = {
  onNativeDragEnter: vi.fn((callback: (paths: string[]) => void) => { dragEnter = callback; return unsubscribe; }),
  getPathForFile: vi.fn((file: { path: string }) => file.path),
};

/**
 * 派发携带原生文件引用的合成 drop 事件。
 * @param paths - 文件路径；空字符串模拟浏览器自建文件。
 * @returns 派发后的事件。
 */
function drop(paths: string[]): Event {
  const event = Object.assign(new Event('drop', { cancelable: true }), { dataTransfer: { files: paths.map((path) => ({ path })) } });
  documentBoundary.dispatchEvent(event);
  return event;
}

/**
 * 以指定状态渲染 Hook 并执行副作用。
 * @param state - 当前岛屿状态。
 * @param setFileTransfer - 状态切换入口。
 */
async function run(state: string, setFileTransfer: () => void): Promise<void> {
  const { useFileTransferDrop } = await import('../hooks/useFileTransferDrop');
  renderHook(useFileTransferDrop, { state, setFileTransfer });
  flushHookEffects();
}

beforeEach(() => {
  resetHook();
  vi.clearAllMocks();
  dragEnter = null;
  island.uiStateLocked = false;
  vi.stubGlobal('window', { api });
  vi.stubGlobal('document', documentBoundary);
});
afterEach(() => {
  unmountHook();
  vi.unstubAllGlobals();
});

describe('useFileTransferDrop', () => {
  it.each(['idle', 'hover', 'lyrics', 'lyricsTranslation'])('opens the shelf on drag enter and records drops in %s', async (state) => {
    const setFileTransfer = vi.fn();
    await run(state, setFileTransfer);

    dragEnter?.(['C:\\a.txt']);
    expect(setFileTransfer).toHaveBeenCalledOnce();
    const event = drop(['C:\\a.txt', '']);
    expect(store.addFileTransferPaths).toHaveBeenCalledWith(['C:\\a.txt']);
    expect(event.defaultPrevented).toBe(true);
  });

  it('ignores drags in other states and drops without native files', async () => {
    const setFileTransfer = vi.fn();
    await run('maxExpand', setFileTransfer);
    dragEnter?.(['C:\\a.txt']);
    drop(['C:\\a.txt']);
    expect(setFileTransfer).not.toHaveBeenCalled();
    expect(store.addFileTransferPaths).not.toHaveBeenCalled();
  });

  it('does not re-enter the shelf when dropping while it is open, and ignores empty drag enters', async () => {
    const setFileTransfer = vi.fn();
    await run('fileTransfer', setFileTransfer);
    dragEnter?.([]);
    drop(['']);
    drop(['/b']);
    expect(store.addFileTransferPaths).toHaveBeenCalledOnce();
    expect(setFileTransfer).not.toHaveBeenCalled();
  });

  it('rejects drops while the UI lock keeps the shelf closed', async () => {
    island.uiStateLocked = true;
    await run('idle', vi.fn());
    const event = drop(['/a']);
    expect(store.addFileTransferPaths).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('still accepts drops into an already open shelf while locked', async () => {
    island.uiStateLocked = true;
    await run('fileTransfer', vi.fn());
    drop(['/b']);
    expect(store.addFileTransferPaths).toHaveBeenCalledWith(['/b']);
  });

  it('unsubscribes native drag enter and the drop listener on unmount', async () => {
    await run('idle', vi.fn());
    unmountHook();
    expect(unsubscribe).toHaveBeenCalledOnce();
    drop(['/c']);
    expect(store.addFileTransferPaths).not.toHaveBeenCalled();
  });
});
