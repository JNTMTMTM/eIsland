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
 * @file toolsTabLifecycle.test.tsx
 * @description 快捷启动真实加载、全局拖拽、输入聚焦、名称回退及容量竞争集成测试。
 * @author 鸡哥
 */

import {
  afterEach, beforeEach, describe, expect, it, vi
} from 'vitest';
import {
  ToolsTab
} from '../ToolsTab';
import {
  byClass, elements, invoke, text
} from '../../../test/tree';
import {
  renderWithHooks, resetLifecycle, runEffects, unmountHooks
} from '../../../maxExpand/components/setting/hooks/test/settingsCoverageHarness';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../test/elementHarness')).hookMocks,
  ...(await import('../../../maxExpand/components/setting/hooks/test/settingsCoverageHarness')).lifecycleHooks
}));

const api = {
  storeRead: vi.fn<Window['api']['storeRead']>(), storeWrite: vi.fn<Window['api']['storeWrite']>(),
  getPathForFile: vi.fn<Window['api']['getPathForFile']>(), getFileIcon: vi.fn<Window['api']['getFileIcon']>(), openFile: vi.fn<Window['api']['openFile']>()
};
let surface: EventTarget;
const focus = vi.fn<() => void>();
const select = vi.fn<() => void>();

/**
 * 求值实际工具页，保留真实状态。
 * @returns 当前组件树。
 */
function view() {
  return renderWithHooks(ToolsTab);
}
/**
 * 提交实际加载/持久化与聚焦 effect。
 * @returns 当前组件树。
 */
async function commit() {
  view();
  runEffects();
  await Promise.resolve();
  await Promise.resolve();
  view();
  runEffects();
  await Promise.resolve();
  return view();
}
/**
 * 构造原生文件拖拽边界。
 * @param paths - 文件路径。
 * @returns 拖拽事件。
 */
function drag(paths: string[] = []) {
  return {
    preventDefault: vi.fn(), stopPropagation: vi.fn(), dataTransfer: {
      files: paths.map((name) => ({
        name
      }))
    }
  };
}
beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
  vi.useFakeTimers();
  api.storeRead.mockResolvedValue([]);
  api.storeWrite.mockResolvedValue(true);
  api.getPathForFile.mockImplementation((file) => file.name);
  api.getFileIcon.mockResolvedValue(null);
  api.openFile.mockResolvedValue(true);
  surface = new EventTarget();
  vi.stubGlobal('document', surface);
  vi.stubGlobal('window', {
    api
  });
});
afterEach(() => {
  unmountHooks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('ToolsTab 真实生命周期', () => {
  it('阻止全局默认拖拽并在卸载时移除监听', async () => {
    await commit();
    ['dragover', 'drop'].forEach((type) => {
      const event = new Event(type, {
        cancelable: true
      });
      surface.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    });
    const event = drag();
    invoke(byClass(view(), 'tools-drop-zone'), 'onDragOver', event);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalledOnce();
    unmountHooks();
    const after = new Event('drop', {
      cancelable: true
    });
    surface.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
  });
  it.each(['success', 'failure'])('卸载后忽略原生加载 %s 回调且不持久化', async (completion) => {
    let resolve!: (value: unknown) => void;
    let reject!: (reason: Error) => void;
    api.storeRead.mockReturnValueOnce(new Promise((done, fail) => {
      resolve = done;
      reject = fail;
    }));
    await commit();
    unmountHooks();
    if (completion === 'success') {
      resolve([{
        id: 1, name: 'Late', path: 'late.exe', iconBase64: null
      }]);
    }
    else reject(new Error('late'));
    await Promise.resolve();
    await Promise.resolve();
    expect(text(view())).toContain('toolsTab.empty');
    expect(api.storeWrite).not.toHaveBeenCalled();
  });
  it('非数组原生快照保留空列表并完成加载', async () => {
    api.storeRead.mockResolvedValueOnce({
      bad: true
    });
    expect(text(await commit())).toContain('toolsTab.empty');
    expect(api.storeWrite).toHaveBeenCalledWith('app-shortcuts', []);
  });
  it('仅扩展名文件使用默认名称并聚焦已挂载编辑输入框', async () => {
    await commit();
    await invoke(byClass(view(), 'tools-drop-zone'), 'onDrop', drag(['.exe', 'C:\\other.exe']));
    await commit();
    expect(text(view())).toContain('toolsTab.defaultAppName');
    invoke(byClass(view(), 'tools-app-edit'), 'onClick');
    let root = view();
    const ref = byClass(root, 'tools-app-edit-input').props.ref as {
      current: HTMLInputElement | null
    };
    ref.current = {
      focus, select
    } as unknown as HTMLInputElement;
    runEffects();
    expect(focus).toHaveBeenCalledOnce();
    expect(select).toHaveBeenCalledOnce();
    invoke(byClass(root, 'tools-app-edit-input'), 'onChange', {
      target: {
        value: ' Renamed '
      }
    });
    invoke(byClass(view(), 'tools-app-edit-input'), 'onBlur');
    root = await commit();
    expect(text(root)).toContain('Renamed');
    expect(text(root)).toContain('other');
    invoke(byClass(root, 'tools-app-edit'), 'onClick');
    view();
    runEffects();
    invoke(byClass(view(), 'tools-app-edit-input'), 'onKeyDown', {
      key: 'Escape'
    });
    expect(elements(view()).some((node) => node.props.className === 'tools-app-edit-input')).toBe(false);
  });
  it('两个真实图标请求并发完成仍遵守容量上限', async () => {
    api.storeRead.mockResolvedValueOnce(Array.from({
      length: 17
    }, (value, id) => {
      void value;
      return {
        id, name: `app${id}`, path: `app${id}.exe`, iconBase64: null
      };
    }));
    await commit();
    let first!: (value: string | null) => void;
    let second!: (value: string | null) => void;
    api.getFileIcon.mockReturnValueOnce(new Promise((done) => {
      first = done;
    })).mockReturnValueOnce(new Promise((done) => {
      second = done;
    }));
    const root = view();
    const one = invoke(byClass(root, 'tools-drop-zone'), 'onDrop', drag(['one.exe']));
    const two = invoke(byClass(root, 'tools-drop-zone'), 'onDrop', drag(['two.exe']));
    first('one');
    await one;
    second('two');
    await two;
    expect(elements(view()).filter((node) => node.props.className === 'tools-app-row')).toHaveLength(18);
  });
});
