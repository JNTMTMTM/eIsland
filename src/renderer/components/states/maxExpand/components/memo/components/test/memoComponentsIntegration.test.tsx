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
 * @file memoComponentsIntegration.test.tsx
 * @description 备忘录侧栏和编辑器连接真实 Hook、存储、标签筛选和编辑交互测试。
 * @author 鸡哥
 */

import {
  afterEach, beforeEach, describe, expect, it, vi
} from 'vitest';
import {
  byClass, elements, invoke, text
} from '../../../../../test/tree';
import {
  renderWithHooks, resetLifecycle, runEffects, unmountHooks
} from '../../../setting/hooks/test/settingsCoverageHarness';
import {
  MemoSidebar
} from '../MemoSidebar';
import {
  MemoEditor
} from '../MemoEditor';
import {
  useMemoTab
} from '../../hooks/useMemoTab';
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../test/elementHarness')).hookMocks,
  ...(await import('../../../setting/hooks/test/settingsCoverageHarness')).lifecycleHooks,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));
const storeRead = vi.fn<Window['api']['storeRead']>();
const storeWrite = vi.fn<Window['api']['storeWrite']>();
const onSettingsChanged = vi.fn<Window['api']['onSettingsChanged']>();
/** 同一次渲染执行实际备忘录 Hook 和两个真实组件。
 * @returns 状态与侧栏、编辑器元素。
 */
function view() {
  return renderWithHooks(() => {
    const state = useMemoTab();
    return {
      state, side: MemoSidebar(state), editor: state.selectedMemo ? MemoEditor({
        ...state, selectedMemo: state.selectedMemo
      }) : null
    };
  });
}
/** 提交真实加载和持久化 effect。
 * @returns 最新实际界面。
 */
async function commit() {
  view();
  runEffects();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  view();
  runEffects();
  await Promise.resolve();
  return view();
}
beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(1000);
  storeRead.mockResolvedValue([{
    id: 1, title: 'First', content: 'body', tags: ['work'], createdAt: 1, updatedAt: 1, pinned: false, bookmarked: true
  }, {
    id: 2, title: 'Other', content: 'details', tags: ['other'], createdAt: 1, updatedAt: 2, pinned: false, bookmarked: false
  }]);
  storeWrite.mockResolvedValue(true);
  onSettingsChanged.mockReturnValue(() => undefined);
  vi.stubGlobal('ResizeObserver', class ResizeObserverBoundary {
    /** 接受真实 observer 注册的元素。
     * @param target - 原生元素。
     */
    observe(target: Element): void {
      void target;
    }

    /** 隔离原生 observer 资源释放。 */
    disconnect(): void {
    }
  });
  vi.stubGlobal('window', {
    api: {
      storeRead, storeWrite, onSettingsChanged
    }
  });
  vi.stubGlobal('localStorage', {
    getItem: () => null, setItem: () => undefined
  });
});
afterEach(() => {
  unmountHooks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('备忘录侧栏与编辑器真实 Hook 集成', () => {
  it('搜索、书签及标签点击改变实际筛选，重复标签恢复全部', async () => {
    const initial = view();
    initial.state.tagFilterRef.current = {
      scrollWidth: 200, clientWidth: 100
    } as HTMLDivElement;
    await commit();
    expect(byClass(view().side, 'memo-tab-tag-filter').props.className).toContain('scrollable');
    invoke(byClass(view().side, 'memo-tab-search'), 'onChange', {
      target: {
        value: 'First'
      }
    });
    expect(view().state.filteredMemos).toHaveLength(1);
    invoke(byClass(view().side, 'memo-tab-search'), 'onChange', {
      target: {
        value: ''
      }
    });
    invoke(byClass(view().side, 'memo-tab-bookmark-filter'), 'onClick');
    expect(view().state.bookmarkOnly).toBe(true);
    invoke(byClass(view().side, 'memo-tab-bookmark-filter'), 'onClick');
    expect(view().state.bookmarkOnly).toBe(false);
    const chip = () => elements(view().side).find((node) => String(node.key).endsWith('work'))!;
    invoke(chip(), 'onClick');
    expect(view().state.activeTag).toBe('work');
    invoke(chip(), 'onClick');
    expect(view().state.activeTag).toBeNull();
    invoke(chip(), 'onClick');
    invoke(byClass(view().side, 'memo-tab-tag-chip'), 'onClick');
    expect(view().state.activeTag).toBeNull();
    const target = {
      scrollLeft: 1
    };
    invoke(byClass(view().side, 'memo-tab-tag-filter'), 'onWheel', {
      deltaY: 10, deltaX: 0, currentTarget: target
    });
    expect(target.scrollLeft).toBe(11);
    invoke(byClass(view().side, 'memo-tab-tag-filter'), 'onWheel', {
      deltaY: 0, deltaX: 10, currentTarget: target
    });
    expect(target.scrollLeft).toBe(11);
  });
  it('侧栏正常选择兼容未绑定编辑器，批选模式切换并删除真实记录', async () => {
    await commit();
    invoke(byClass(view().side, 'memo-tab-item'), 'onClick');
    vi.advanceTimersByTime(50);
    expect(view().state.selectedId).not.toBeNull();
    invoke(byClass(view().side, 'memo-tab-bulk-select-toggle'), 'onClick');
    invoke(byClass(view().side, 'memo-tab-item'), 'onClick');
    expect(view().state.selectedMemoCount).toBe(1);
    invoke(byClass(view().side, 'memo-tab-bulk-delete'), 'onClick');
    expect(view().state.memos).toHaveLength(1);
    invoke(byClass(view().side, 'memo-tab-bulk-cancel'), 'onClick');
    invoke(byClass(view().side, 'memo-tab-add-btn'), 'onClick');
    expect(view().state.memos).toHaveLength(2);
  });
  it('编辑器模式、标签面板与输入通过真实操作回写记录', async () => {
    await commit();
    invoke(byClass(view().side, 'memo-tab-item'), 'onClick');
    const editor = () => view().editor!;
    invoke(byClass(editor(), 'memo-tab-editor-title'), 'onChange', {
      target: {
        value: 'Updated'
      }
    });
    invoke(byClass(editor(), 'memo-tab-editor-tag-toggle'), 'onClick');
    expect(view().state.tagEditorOpen).toBe(true);
    invoke(byClass(editor(), 'memo-tab-editor-tag-toggle'), 'onClick');
    expect(view().state.tagEditorOpen).toBe(false);
    ['preview', 'split', 'edit'].forEach((mode) => {
      invoke(elements(editor()).find((node) => String(node.key).endsWith(mode))!, 'onClick');
      expect(view().state.viewMode).toBe(mode);
    });
    invoke(byClass(editor(), 'memo-tab-tag-input'), 'onChange', {
      target: {
        value: 'new'
      }
    });
    const preventDefault = vi.fn();
    invoke(byClass(editor(), 'memo-tab-tag-input'), 'onKeyDown', {
      preventDefault, key: 'Escape'
    });
    expect(preventDefault).not.toHaveBeenCalled();
    invoke(byClass(editor(), 'memo-tab-tag-add-btn'), 'onClick');
    expect(view().state.selectedMemo!.tags).toContain('new');
    const tag = elements(editor()).find((node) => String(node.key).endsWith('new'))!;
    invoke(tag, 'onClick');
    expect(view().state.selectedMemo!.tags).not.toContain('new');
    await commit();
    expect(storeWrite).toHaveBeenCalledWith('memos', expect.arrayContaining([expect.objectContaining({
      title: 'Updated'
    })]));
    expect(text(editor())).toContain('maxExpand.memo.created');
  });
});
