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
 * @file fileCompressionLifecycleRuntime.test.tsx
 * @description 真实图片压缩页面、原生任务更新、设置输入及失败结果交互测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { byClass, elements, find, invoke, text } from '../../../../../test/tree';
import { createHookReactMock, deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../../../hooks/test/startupHookHarness';
import type { RefObject } from 'react';
import type { ImageCompressionTask, ImageCompressionStartPayload, ImageCompressionStartResult } from '../../../../../../../../preload/types';
import type { FileCompressionPageKey } from '../../config/fileCompressionToolConfig';
let Component: typeof import('../FileCompressionToolSection').FileCompressionToolSection;
let page: FileCompressionPageKey;
let browser: EventTarget;
let receive: (task: ImageCompressionTask) => void;
const leaves = {
  list: vi.fn<() => Promise<ImageCompressionTask[]>>(),
  pick: vi.fn<() => Promise<string[]>>(),
  dir: vi.fn<() => Promise<string | null>>(),
  start: vi.fn<(input: ImageCompressionStartPayload) => Promise<ImageCompressionStartResult>>(),
  remove: vi.fn<(id: string) => Promise<boolean>>(),
  open: vi.fn<(path: string) => Promise<boolean>>(),
  off: vi.fn<() => void>()
};
/** 构造实际原生压缩任务。
 * @param patch - 协议覆盖
 * @returns 任务
 */
function task(patch: Partial<ImageCompressionTask> = {}): ImageCompressionTask {
  return {
    id: 'task',
    fileName: '',
    inputPath: 'C:/photo.png',
    outputPath: 'C:/out.jpg',
    quality: 80,
    status: 'completed',
    success: true,
    originalBytes: 1024,
    compressedBytes: 10,
    ratio: 0.5,
    createdAt: 1,
    updatedAt: 2,
    ...patch
  };
}
/** 执行真实压缩页面。
 * @returns 组件树
 */
function run() {
  return renderHook(Component, {
    fileCompressionPage: page,
    setFileCompressionPage: (next: FileCompressionPageKey) => {
      page = next;
    }
  });
}
/** 根据文本定位实际按钮。
 * @param suffix - 翻译键后缀
 * @returns 实际按钮
 */
function button(suffix: string) {
  return find(run(), (node) => node.type === 'button' && text(node).endsWith(suffix));
}
/** 完成真实挂载。
 * @returns 当前树
 */
async function mount() {
  const tree = run();
  (byClass(tree, 'settings-app-pages-layout').props.ref as RefObject<unknown>).current = browser;
  flushHookEffects();
  await settleHook();
  return run();
}
/** 原生导航滚轮。
 * @param deltaY - 方向
 * @param dots - 目标命中
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
beforeEach(async () => {
  unmountHook();
  resetHook();
  vi.resetModules();
  vi.resetAllMocks();
  page = 'imageCompression';
  browser = new EventTarget();
  leaves.list.mockResolvedValue([]);
  leaves.pick.mockResolvedValue(['C:/photo.png']);
  leaves.dir.mockResolvedValue('C:/out');
  leaves.start.mockResolvedValue({
    ok: true,
    results: [task()]
  });
  leaves.remove.mockResolvedValue(true);
  leaves.open.mockResolvedValue(true);
  vi.stubGlobal('window', {
    api: {
      imageCompressionList: leaves.list,
      onImageCompressionTaskUpdated: (callback: typeof receive) => {
        receive = callback;
        return leaves.off;
      },
      imageCompressionPickImages: leaves.pick,
      imageCompressionPickOutputDir: leaves.dir,
      imageCompressionStart: leaves.start,
      imageCompressionRemove: leaves.remove,
      openInExplorer: leaves.open
    }
  });
  vi.doMock('react', async (original) => createHookReactMock(await original<typeof import('react')>()));
  Component = (await import('../FileCompressionToolSection')).FileCompressionToolSection;
});
afterEach(() => {
  unmountHook();
  vi.unstubAllGlobals();
});
describe('FileCompressionToolSection actual state and task protocol', () => {
  it('native wheel and page dots clamp navigation and listener cleanup', async () => {
    await mount();
    expect(wheel(1, false)).toBe(false);
    expect(wheel(-1)).toBe(false);
    expect(wheel(1)).toBe(true);
    expect(page).toBe('history');
    run();
    expect(wheel(1)).toBe(false);
    expect(wheel(-1)).toBe(true);
    invoke(elements(run()).filter((node) => String(node.props.className ?? '').split(' ').includes('settings-app-page-dot'))[1], 'onClick');
    expect(page).toBe('history');
    unmountHook();
    expect(wheel(-1)).toBe(false);
    expect(leaves.off).toHaveBeenCalledOnce();
  });
  it('native task updates replace existing IDs and render fallback names, failed reasons and zero bytes', async () => {
    leaves.list.mockResolvedValue([task(), task({
      id: 'other',
      success: false,
      status: 'failed',
      outputPath: '',
      inputPath: 'C:/missing.png'
    })]);
    page = 'history';
    await mount();
    receive(task({
      originalBytes: 0,
      compressedBytes: 0
    }));
    receive(task({
      id: 'new',
      fileName: 'new',
      createdAt: 3
    }));
    expect(text(run())).toContain('photo.png');
    expect(text(run())).toContain('new');
    expect(elements(run()).filter((node) => String(node.props.className ?? '').includes('download-task-card-header'))).toHaveLength(3);
    leaves.open.mockRejectedValue(new Error('native'));
    invoke(button('openOutput'), 'onClick');
    await settleHook();
    expect(text(run())).toContain('messages.openFolderFailed');
    leaves.remove.mockRejectedValue(new Error('native'));
    invoke(button('removeTask'), 'onClick');
    await settleHook();
    expect(text(run())).toContain('messages.removeFailed');
    leaves.remove.mockResolvedValue(false);
    invoke(button('removeTask'), 'onClick');
    await settleHook();
    expect(text(run())).toContain('messages.removeFailed');
  });
  it('public images, output path and quality create actual request while pending repeat is ignored', async () => {
    await mount();
    invoke(button('pickImages'), 'onClick');
    await settleHook();
    invoke(button('pickOutputDir'), 'onClick');
    await settleHook();
    invoke(byClass(run(), 'settings-slider'), 'onChange', {
      target: {
        value: '40'
      }
    });
    invoke(byClass(run(), 'download-save-path-input'), 'onChange', {
      target: {
        value: ' C:/custom '
      }
    });
    const pending = deferred<ImageCompressionStartResult>();
    leaves.start.mockReturnValue(pending.promise);
    invoke(byClass(run(), 'download-start-btn-full'), 'onClick');
    expect(leaves.start).toHaveBeenCalledWith({
      inputPaths: ['C:/photo.png'],
      outputDir: 'C:/custom',
      quality: 40
    });
    invoke(byClass(run(), 'download-start-btn-full'), 'onClick');
    expect(leaves.start).toHaveBeenCalledOnce();
    pending.resolve({
      ok: true,
      results: [task(), task({
        id: 'failed',
        status: 'failed',
        success: false
      })]
    });
    await settleHook();
    expect(text(run())).toContain('messages.done');
    expect(byClass(run(), 'download-start-btn-full').props.disabled).toBe(true);
  });
  it.each(['no-images', 'pick-rejected', 'dir-canceled', 'dir-rejected'] as const)('native %s keeps selection/output guards and corresponding feedback', async (kind) => {
    await mount();
    if (kind === 'no-images') {
      leaves.pick.mockResolvedValue([]);
      invoke(button('pickImages'), 'onClick');
      await settleHook();
      invoke(byClass(run(), 'download-start-btn-full'), 'onClick');
      expect(leaves.start).not.toHaveBeenCalled();
    }
    if (kind === 'pick-rejected') {
      leaves.pick.mockRejectedValue(new Error('dialog'));
      invoke(button('pickImages'), 'onClick');
      await settleHook();
      expect(text(run())).toContain('messages.pickFailed');
    }
    if (kind === 'dir-canceled') {
      leaves.dir.mockResolvedValue(null);
      invoke(button('pickOutputDir'), 'onClick');
      await settleHook();
      expect(byClass(run(), 'download-save-path-input').props.value).toBe('');
    }
    if (kind === 'dir-rejected') {
      leaves.dir.mockRejectedValue(new Error('dialog'));
      invoke(button('pickOutputDir'), 'onClick');
      await settleHook();
      expect(text(run())).toContain('messages.pickOutputDirFailed');
    }
  });
  it.each(['message', 'fallback', 'rejected', 'no-results'] as const)('native start %s uses real failed/success state', async (kind) => {
    await mount();
    invoke(button('pickImages'), 'onClick');
    await settleHook();
    if (kind === 'rejected') leaves.start.mockRejectedValue(new Error('start'));else {
      leaves.start.mockResolvedValue({
        ok: kind === 'no-results',
        message: kind === 'message' ? 'denied' : ''
      });
    }
    invoke(byClass(run(), 'download-start-btn-full'), 'onClick');
    await settleHook();
    expect(text(run())).toContain(({
      message: 'denied',
      'no-results': 'messages.done',
      fallback: 'messages.startFailed',
      rejected: 'messages.startFailed'
    } as const)[kind]);
  });
  it('late task list after unmount is ignored and list rejection retains empty history', async () => {
    const pending = deferred<ImageCompressionTask[]>();
    leaves.list.mockReturnValue(pending.promise);
    run();
    flushHookEffects();
    unmountHook();
    pending.resolve([task()]);
    await settleHook();
    page = 'history';
    expect(text(run())).toContain('resultsEmpty');
    unmountHook();
    resetHook();
    leaves.list.mockRejectedValue(new Error('list'));
    await mount();
    expect(text(run())).toContain('resultsEmpty');
  });
  it('successful compression merges an existing list and successful deletion retains other IDs', async () => {
    leaves.list.mockResolvedValue([task({
      id: 'keep'
    }), task({
      id: 'task'
    })]);
    await mount();
    invoke(button('pickImages'), 'onClick');
    await settleHook();
    invoke(byClass(run(), 'download-start-btn-full'), 'onClick');
    await settleHook();
    page = 'history';
    expect(elements(run()).filter((node) => String(node.props.className ?? '').includes('download-task-card-header'))).toHaveLength(2);
    invoke(button('removeTask'), 'onClick');
    await settleHook();
    expect(elements(run()).filter((node) => String(node.props.className ?? '').includes('download-task-card-header'))).toHaveLength(1);
  });
  it('native file task without DOM attachment preserves listener setup guard', async () => {
    run();
    flushHookEffects();
    await settleHook();
    expect(leaves.list).toHaveBeenCalledOnce();
  });
  it('persisted task protocol accepts a trailing-directory input string and displays its fallback name', async () => {
    leaves.list.mockResolvedValue([task({
      fileName: '',
      inputPath: 'C:/persisted/',
      success: false,
      status: 'failed'
    })]);
    page = 'history';
    await mount();
    expect(text(run())).toContain('C:/persisted/');
  });
});
