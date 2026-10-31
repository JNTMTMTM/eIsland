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
 * @file toolsTab.test.tsx
 * @description 快捷启动的加载、拖拽、重复与容量边界、编辑、删除及卸载测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushEffects, nodes, render, text, value } from '../../../maxExpand/test/componentHarness';
import { fire, fireAsync } from '../../../maxExpand/components/tools/components/test/toolTestEvents';
import { ToolsTab } from '../ToolsTab';

const mocks = vi.hoisted(() => ({
  read: vi.fn<() => Promise<unknown>>(), write: vi.fn<(key: string, data: unknown) => Promise<boolean>>(),
  path: vi.fn<(file: File) => string>(), icon: vi.fn<(path: string) => Promise<string | null>>(),
  open: vi.fn<(path: string) => Promise<boolean>>(),
}));

/**
 * 构造可传递给真实拖拽处理器的事件。
 * @param paths - IPC 将读取的文件路径。
 * @returns 文件列表和事件处理观察器。
 */
function drop(paths: string[]) {
  mocks.path.mockImplementation((file) => file.name);
  return { preventDefault: vi.fn(), stopPropagation: vi.fn(), dataTransfer: { files: paths.map((name) => ({ name })) } };
}

/**
 * 执行初始加载并等待状态更新。
 */
async function load(): Promise<void> {
  await render(ToolsTab);
  flushEffects();
  await Promise.resolve();
}

describe('ToolsTab', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.read.mockResolvedValue([]);
    mocks.write.mockResolvedValue(true);
    mocks.icon.mockResolvedValue('icon');
    mocks.open.mockResolvedValue(true);
    vi.stubGlobal('window', { api: { storeRead: mocks.read, storeWrite: mocks.write, getPathForFile: mocks.path,
      getFileIcon: mocks.icon, openFile: mocks.open } });
    vi.stubGlobal('document', new EventTarget());
  });
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('空列表渲染提示，读取失败依旧显示空列表；卸载移除全局拖拽监听', async () => {
    mocks.read.mockRejectedValue(new Error('read offline'));
    const add = vi.spyOn(document, 'addEventListener');
    const remove = vi.spyOn(document, 'removeEventListener');
    expect(text(render(ToolsTab))).toContain('toolsTab.empty');
    const cleanup = flushEffects();
    await Promise.resolve(); await Promise.resolve();
    expect(add).toHaveBeenCalledWith('drop', expect.any(Function));
    cleanup.forEach((fn) => fn());
    expect(remove).toHaveBeenCalledWith('drop', expect.any(Function));
    expect(text(render(ToolsTab))).toContain('toolsTab.empty');
  });

  it('拖拽进出计数控制高亮，添加exe或lnk并获取图标', async () => {
    await load();
    const event = drop(['C:\\Apps\\Alpha.EXE', 'C:\\Apps\\Beta.lnk']);
    fire(render(ToolsTab), '.tools-drop-zone', 'onDragEnter', 0, event);
    fire(render(ToolsTab), '.tools-drop-zone', 'onDragEnter', 0, event);
    fire(render(ToolsTab), '.tools-drop-zone', 'onDragLeave', 0, event);
    expect(value(render(ToolsTab), '.tools-drop-zone', 'className')).toContain('drag-over');
    fire(render(ToolsTab), '.tools-drop-zone', 'onDragLeave', 0, event);
    expect(value(render(ToolsTab), '.tools-drop-zone', 'className')).not.toContain('drag-over');
    await fireAsync(render(ToolsTab), '.tools-drop-zone', 'onDrop', 0, event);
    const tree = render(ToolsTab);
    expect(nodes(tree, '.tools-app-row')).toHaveLength(2);
    expect(text(tree)).toContain('Alpha');
    expect(text(tree)).toContain('Beta');
    expect(value(tree, '.tools-app-icon', 'src')).toBe('data:image/png;base64,icon');
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
  });

  it('不支持的类型和重复文件显示提示，2秒后复原', async () => {
    mocks.read.mockResolvedValue([{ id: 1, name: 'Alpha', path: 'alpha.exe', iconBase64: null }]);
    await load();
    await fireAsync(render(ToolsTab), '.tools-drop-zone', 'onDrop', 0, drop(['note.txt']));
    expect(text(render(ToolsTab))).toContain('toolsTab.drop.onlyExe');
    vi.advanceTimersByTime(2000);
    await fireAsync(render(ToolsTab), '.tools-drop-zone', 'onDrop', 0, drop(['alpha.exe']));
    expect(text(render(ToolsTab))).toContain('toolsTab.drop.duplicate');
    expect(nodes(render(ToolsTab), '.tools-app-row')).toHaveLength(1);
    vi.advanceTimersByTime(2000);
    expect(text(render(ToolsTab))).toContain('toolsTab.drop.dragExe');
  });

  it('已达18项不再添加，路径为空或图标获取异常不会添加', async () => {
    mocks.read.mockResolvedValue([...Array.from({ length: 18 }).keys()].map((id) => ({ id, name: 'App', path: `${id  }.exe`, iconBase64: null })));
    await load();
    await fireAsync(render(ToolsTab), '.tools-drop-zone', 'onDrop', 0, drop(['new.exe', '']));
    expect(mocks.icon).not.toHaveBeenCalled();
    fire(render(ToolsTab), '.tools-app-delete', 'onClick');
    mocks.icon.mockRejectedValue(new Error('icon failure'));
    await fireAsync(render(ToolsTab), '.tools-drop-zone', 'onDrop', 0, drop(['new.exe', '']));
    expect(nodes(render(ToolsTab), '.tools-app-row')).toHaveLength(17);
  });

  it('编辑名称支持Enter、空白保留旧名称、Escape取消和删除编辑项', async () => {
    mocks.read.mockResolvedValue([{ id: 1, name: 'Old', path: 'app.exe', iconBase64: null }]);
    await load();
    fire(render(ToolsTab), '.tools-app-name', 'onDoubleClick');
    fire(render(ToolsTab), '.tools-app-edit-input', 'onChange', 0, { target: { value: '  New  ' } });
    fire(render(ToolsTab), '.tools-app-edit-input', 'onKeyDown', 0, { key: 'Enter' });
    expect(text(render(ToolsTab))).toContain('New');
    fire(render(ToolsTab), '.tools-app-edit', 'onClick');
    fire(render(ToolsTab), '.tools-app-edit-input', 'onChange', 0, { target: { value: '   ' } });
    fire(render(ToolsTab), '.tools-app-edit-input', 'onBlur');
    expect(text(render(ToolsTab))).toContain('New');
    fire(render(ToolsTab), '.tools-app-edit', 'onClick');
    fire(render(ToolsTab), '.tools-app-edit-input', 'onKeyDown', 0, { key: 'Escape' });
    expect(nodes(render(ToolsTab), '.tools-app-edit-input')).toHaveLength(0);
    fire(render(ToolsTab), '.tools-app-edit', 'onClick');
    fire(render(ToolsTab), '.tools-app-delete', 'onClick');
    expect(text(render(ToolsTab))).toContain('toolsTab.empty');
  });

  it('剩余1个位置时批量或并行拖入始终最多18项', async () => {
    mocks.read.mockResolvedValue([...Array.from({ length: 17 }).keys()].map((id) => ({ id, name: 'App', path: `${id  }.exe`, iconBase64: null })));
    await load();
    await fireAsync(render(ToolsTab), '.tools-drop-zone', 'onDrop', 0, drop(['a.exe', 'b.exe']));
    expect(nodes(render(ToolsTab), '.tools-app-row')).toHaveLength(18);
    expect(mocks.icon).toHaveBeenCalledTimes(1);
    fire(render(ToolsTab), '.tools-app-delete', 'onClick');
    const tree = render(ToolsTab);
    await Promise.all([
      fireAsync(tree, '.tools-drop-zone', 'onDrop', 0, drop(['c.exe'])),
      fireAsync(tree, '.tools-drop-zone', 'onDrop', 0, drop(['d.exe'])),
    ]);
    expect(nodes(render(ToolsTab), '.tools-app-row')).toHaveLength(18);
  });

  it('启动真实路径、写入持久化和IPC失败被处理', async () => {
    mocks.read.mockResolvedValue([{ id: 1, name: 'App', path: 'app.exe', iconBase64: null }]);
    mocks.open.mockRejectedValue(new Error('launch denied'));
    mocks.write.mockRejectedValue(new Error('storage denied'));
    await load();
    fire(render(ToolsTab), '.tools-app-icon-wrap', 'onClick');
    expect(mocks.open).toHaveBeenCalledWith('app.exe');
    flushEffects();
    await Promise.resolve();
    expect(mocks.write).toHaveBeenCalledWith('app-shortcuts', expect.arrayContaining([expect.objectContaining({ id: 1 })]));
  });

  it('卸载后才返回的存储数据不改变空状态', async () => {
    const pending = Promise.withResolvers<unknown>();
    mocks.read.mockReturnValue(pending.promise);
    await render(ToolsTab);
    flushEffects().forEach((cleanup) => cleanup());
    pending.resolve([{ id: 1, name: 'late', path: 'late.exe', iconBase64: null }]);
    await Promise.resolve();
    expect(nodes(render(ToolsTab), '.tools-app-row')).toHaveLength(0);
  });
});
