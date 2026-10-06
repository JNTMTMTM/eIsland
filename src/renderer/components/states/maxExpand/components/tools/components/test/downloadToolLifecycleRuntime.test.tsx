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
 * @file downloadToolLifecycleRuntime.test.tsx
 * @description 真实下载页面与任务 Hook、IPC更新、滚轮导航和失败反馈联合测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { byClass, elements, find, invoke, text } from '../../../../../test/tree';
import { createHookReactMock, deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../../../hooks/test/startupHookHarness';
import type { RefObject } from 'react';
import type { DownloadTaskSnapshot, DownloadPageKey } from '../../config/downloadToolConfig';
let Component: typeof import('../DownloadToolSection').DownloadToolSection;
let page: DownloadPageKey;
let browser: EventTarget;
let receive: (task: DownloadTaskSnapshot) => void;
const leaves = {
  list: vi.fn<() => Promise<DownloadTaskSnapshot[]>>(),
  dir: vi.fn<() => Promise<string>>(),
  pick: vi.fn<(name: string) => Promise<string | null>>(),
  start: vi.fn<(input: unknown) => Promise<{
    ok: boolean;
    message?: string;
  }>>(),
  cancel: vi.fn<(id: string) => Promise<boolean>>(),
  pause: vi.fn<(id: string) => Promise<boolean>>(),
  resume: vi.fn<(id: string) => Promise<{
    ok: boolean;
    message?: string;
  }>>(),
  remove: vi.fn<(id: string) => Promise<boolean>>(),
  open: vi.fn<(path: string) => Promise<boolean>>(),
  off: vi.fn<() => void>()
};
/** 创建真实下载任务协议。
 * @param patch - IPC字段
 * @returns 完整任务
 */
function task(patch: Partial<DownloadTaskSnapshot> = {}): DownloadTaskSnapshot {
  return {
    id: 'task',
    status: 'downloading',
    url: 'https://example.test/file.bin',
    fileName: 'file.bin',
    savePath: 'C:/downloads/file.bin',
    totalBytes: 1024,
    downloadedBytes: 500,
    progress: 0.5,
    speedBytesPerSecond: 20,
    estimatedFinishAt: Date.now() + 10000,
    threads: 8,
    createdAt: 1,
    updatedAt: 1001,
    ...patch
  };
}
/** 读取真实页面。
 * @returns 页面元素树
 */
function run() {
  return renderHook(Component, {
    downloadPage: page,
    setDownloadPage: (next: DownloadPageKey) => {
      page = next;
    }
  });
}
/** 提交真实生命周期。
 * @returns 初始页面
 */
async function mount() {
  const tree = run();
  (byClass(tree, 'settings-app-pages-layout').props.ref as RefObject<unknown>).current = browser;
  flushHookEffects();
  await settleHook();
  return run();
}
/** 原生页面滚轮。
 * @param deltaY - 方向
 * @param dots - 是否命中导航点
 * @returns 默认事件状态
 */
function wheel(deltaY: number, dots = true) {
  const e = new Event('wheel', {
    cancelable: true
  });
  Object.defineProperties(e, {
    deltaY: {
      value: deltaY
    },
    target: {
      value: {
        closest: () => dots
      }
    }
  });
  browser.dispatchEvent(e);
  return e.defaultPrevented;
}
/** 根据真实文本选取操作按钮。
 * @param suffix - 翻译键后缀
 * @returns 按钮元素
 */
function button(suffix: string) {
  return find(run(), (node) => node.type === 'button' && text(node).endsWith(suffix));
}
beforeEach(async () => {
  unmountHook();
  resetHook();
  vi.resetModules();
  vi.resetAllMocks();
  vi.useFakeTimers();
  page = 'create';
  browser = new EventTarget();
  leaves.list.mockResolvedValue([]);
  leaves.dir.mockResolvedValue('C:/downloads');
  leaves.pick.mockResolvedValue(null);
  leaves.start.mockResolvedValue({
    ok: true
  });
  leaves.cancel.mockResolvedValue(true);
  leaves.pause.mockResolvedValue(true);
  leaves.resume.mockResolvedValue({
    ok: true
  });
  leaves.remove.mockResolvedValue(true);
  leaves.open.mockResolvedValue(true);
  vi.stubGlobal('window', {
    setInterval,
    clearInterval,
    api: {
      downloadList: leaves.list,
      downloadGetDefaultDir: leaves.dir,
      onDownloadTaskUpdated: (callback: typeof receive) => {
        receive = callback;
        return leaves.off;
      },
      downloadPickSavePath: leaves.pick,
      downloadStart: leaves.start,
      downloadCancel: leaves.cancel,
      downloadPause: leaves.pause,
      downloadResume: leaves.resume,
      downloadRemove: leaves.remove,
      openInExplorer: leaves.open
    }
  });
  vi.doMock('react', async (original) => createHookReactMock(await original<typeof import('react')>()));
  Component = (await import('../DownloadToolSection')).DownloadToolSection;
});
afterEach(() => {
  unmountHook();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('DownloadToolSection real hook and native updates', () => {
  it('native page wheel and dot clicks clamp boundaries and remove listener on unmount', async () => {
    await mount();
    expect(wheel(-1)).toBe(false);
    expect(wheel(1, false)).toBe(false);
    expect(wheel(1)).toBe(true);
    expect(page).toBe('history');
    run();
    expect(wheel(1)).toBe(false);
    expect(wheel(-1)).toBe(true);
    expect(page).toBe('create');
    invoke(elements(run()).filter((node) => String(node.props.className ?? '').split(' ').includes('settings-app-page-dot'))[1], 'onClick');
    expect(page).toBe('history');
    unmountHook();
    expect(wheel(-1)).toBe(false);
    expect(leaves.off).toHaveBeenCalledOnce();
  });
  it('canceled path dialog leaves empty save path and real creation retains requested fields', async () => {
    await mount();
    const inputs = elements(run()).filter((node) => node.type === 'input');
    invoke(inputs[0], 'onChange', {
      target: {
        value: 'https://example.test/file.bin'
      }
    });
    invoke(byClass(run(), 'settings-lyrics-source-btn'), 'onClick');
    await settleHook();
    expect(byClass(run(), 'download-save-path-input').props.value).toBe('');
    invoke(byClass(run(), 'download-start-btn-full'), 'onClick');
    await settleHook();
    expect(leaves.start).toHaveBeenCalledWith({
      url: 'https://example.test/file.bin',
      savePath: undefined,
      threads: 8
    });
    expect(page).toBe('history');
  });
  it.each(['false', 'fallback', 'rejected-empty'] as const)('native start %s yields actual error without history', async (kind) => {
    await mount();
    if (kind === 'rejected-empty') leaves.start.mockRejectedValue(new Error(''));else {
      leaves.start.mockResolvedValue({
        ok: false,
        message: kind === 'false' ? 'denied' : ''
      });
    }
    invoke(byClass(run(), 'download-start-btn-full'), 'onClick');
    await settleHook();
    expect(text(run())).toContain(kind === 'false' ? 'denied' : 'messages.startFailed');
    expect(page).toBe('create');
  });
  it.each(['false', 'rejected', 'success'] as const)('native pause %s reports requested result', async (kind) => {
    leaves.list.mockResolvedValue([task()]);
    page = 'history';
    await mount();
    if (kind === 'rejected') leaves.pause.mockRejectedValue(new Error('bridge'));else leaves.pause.mockResolvedValue(kind === 'success');
    invoke(button('tasks.pause'), 'onClick');
    await settleHook();
    expect(leaves.pause).toHaveBeenCalledWith('task');
    expect(text(run()).includes('messages.pauseSuccess')).toBe(kind === 'success');
    expect(text(run()).includes('messages.pauseFailed')).toBe(kind === 'rejected');
  });
  it.each(['message', 'fallback', 'rejected', 'success'] as const)('native resume %s and retained removal operate on true state', async (kind) => {
    leaves.list.mockResolvedValue([task({
      status: 'paused'
    })]);
    page = 'history';
    await mount();
    if (kind === 'rejected') leaves.resume.mockRejectedValue(new Error('bridge'));else {
      leaves.resume.mockResolvedValue({
        ok: kind === 'success',
        message: kind === 'message' ? 'resume denied' : ''
      });
    }
    invoke(button('tasks.resume'), 'onClick');
    await settleHook();
    expect(text(run())).toContain(({
      message: 'resume denied',
      success: 'messages.resumeSuccess',
      fallback: 'messages.resumeFailed',
      rejected: 'messages.resumeFailed'
    } as const)[kind]);
    leaves.remove.mockResolvedValue(false);
    invoke(button('tasks.delete'), 'onClick');
    await settleHook();
    expect(elements(run()).filter((node) => String(node.props.className ?? '').includes('download-task-card-header'))).toHaveLength(1);
    leaves.remove.mockResolvedValue(true);
    invoke(button('tasks.delete'), 'onClick');
    await settleHook();
    expect(text(run())).toContain('tasks.empty');
  });
  it('native updates replace existing task and completed entry opens folder or exposes failure', async () => {
    leaves.list.mockResolvedValue([task()]);
    page = 'history';
    await mount();
    receive(task({
      status: 'completed',
      fileName: '',
      errorMessage: ''
    }));
    receive(task({
      id: 'other',
      status: 'failed',
      createdAt: 2,
      totalBytes: 0
    }));
    expect(text(run())).toContain('status.failed');
    expect(text(run())).toContain('https://example.test/file.bin');
    invoke(button('tasks.openFolder'), 'onClick');
    await settleHook();
    expect(leaves.open).toHaveBeenCalledWith('C:/downloads/file.bin');
    leaves.open.mockRejectedValue(new Error('native'));
    invoke(button('tasks.openFolder'), 'onClick');
    await settleHook();
    expect(text(run())).toContain('messages.openFolderFailed');
  });
  it.each(['false', 'rejected', 'success'] as const)('native cancel %s uses actual active request and history cancellation', async (kind) => {
    leaves.list.mockResolvedValue([task()]);
    await mount();
    if (kind === 'rejected') leaves.cancel.mockRejectedValue(new Error('cancel'));else leaves.cancel.mockResolvedValue(kind === 'success');
    invoke(button('form.cancelCurrent'), 'onClick');
    await settleHook();
    expect(leaves.cancel).toHaveBeenCalledWith('task');
    expect(text(run()).includes('messages.cancelSuccess')).toBe(kind === 'success');
    expect(text(run()).includes('messages.cancelFailed')).toBe(kind === 'rejected');
  });
  it('public path and thread inputs include chosen paths, finite fallback and dialog failure', async () => {
    await mount();
    invoke(button('form.pickPath'), 'onClick');
    expect(leaves.pick).not.toHaveBeenCalled();
    invoke(find(run(), (node) => node.type === 'input'), 'onChange', {
      target: {
        value: 'https://example.test/a'
      }
    });
    leaves.pick.mockResolvedValue('C:/saved.bin');
    invoke(button('form.pickPath'), 'onClick');
    await settleHook();
    expect(byClass(run(), 'download-save-path-input').props.value).toBe('C:/saved.bin');
    leaves.pick.mockRejectedValue(new Error('dialog'));
    invoke(button('form.pickPath'), 'onClick');
    await settleHook();
    expect(text(run())).toContain('messages.pickPathFailed');
    invoke(byClass(run(), 'download-save-path-input'), 'onChange', {
      target: {
        value: ' C:/own.bin '
      }
    });
    invoke(byClass(run(), 'download-threads-inline-input'), 'onChange', {
      target: {
        value: 'not-number'
      }
    });
    invoke(button('form.start'), 'onClick');
    await settleHook();
    expect(leaves.start).toHaveBeenCalledWith({
      url: 'https://example.test/a',
      savePath: 'C:/own.bin',
      threads: 8
    });
  });
  it('real task clock and mixed status metadata tolerate zero estimates and surface native folder/remove failures', async () => {
    leaves.list.mockResolvedValue([task(), task({
      id: 'second',
      status: 'canceled',
      estimatedFinishAt: 0,
      errorMessage: 'native canceled'
    }), task({
      id: 'paused',
      status: 'paused'
    }), task({
      id: 'complete',
      status: 'completed'
    })]);
    page = 'history';
    await mount();
    receive(task({
      fileName: 'renamed',
      estimatedFinishAt: 0
    }));
    expect(text(run())).toContain('renamed');
    expect(text(run())).toContain('native canceled');
    vi.advanceTimersByTime(1000);
    run();
    leaves.open.mockResolvedValue(false);
    invoke(button('tasks.openFolder'), 'onClick');
    await settleHook();
    expect(text(run())).toContain('messages.openFolderFailed');
    leaves.remove.mockRejectedValue(new Error('remove'));
    invoke(button('tasks.delete'), 'onClick');
    await settleHook();
    expect(text(run())).toContain('messages.removeFailed');
  });
  it('late initial directory/list are ignored and rejected leaves retain empty defaults', async () => {
    const dir = deferred<string>();
    const list = deferred<DownloadTaskSnapshot[]>();
    leaves.dir.mockReturnValue(dir.promise);
    leaves.list.mockReturnValue(list.promise);
    run();
    flushHookEffects();
    unmountHook();
    dir.resolve('late');
    list.resolve([task()]);
    await settleHook();
    expect(byClass(run(), 'download-save-path-input').props.placeholder).toContain('savePathPlaceholder');
    unmountHook();
    resetHook();
    leaves.dir.mockRejectedValue(new Error('dir'));
    leaves.list.mockRejectedValue(new Error('list'));
    await mount();
    page = 'history';
    expect(text(run())).toContain('tasks.empty');
  });
  it('native start rejection string and blank output defaults survive actual optional fields', async () => {
    leaves.dir.mockResolvedValue('');
    await mount();
    invoke(button('form.start'), 'onClick');
    await settleHook();
    page = 'create';
    leaves.start.mockRejectedValue('native string');
    invoke(button('form.start'), 'onClick');
    await settleHook();
    expect(text(run())).toContain('native string');
  });
  it('native pending start renders loading state until response settles', async () => {
    await mount();
    const pending = deferred<{
      ok: boolean;
    }>();
    leaves.start.mockReturnValue(pending.promise);
    invoke(button('form.start'), 'onClick');
    expect(button('form.starting').props.disabled).toBe(true);
    pending.resolve({
      ok: true
    });
    await settleHook();
    expect(page).toBe('history');
  });
});
