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
 * @file sttContentIntegration.test.tsx
 * @description 识别结果组件连接真实 Zustand、文本同步与待办备忘录持久化的公共交互测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks } from '../../../components/test/contentLifecycleHarness';
import { api, browser, renderWithHooks, resetBrowser, runEffects, settle, storage, unmountHooks } from '../../register/hooks/test/authHookHarness';
import { byClass, elements, invoke, text } from '../../test/tree';
import type { ReactElement } from 'react';
vi.mock('react', async (load) => ({
  ...(await load<typeof import('react')>()),
  ...(await import('../../../test/elementHarness')).hookMocks,
  ...(await import('../../../components/test/contentLifecycleHarness')).lifecycleHooks,
}));
vi.mock('react-i18next', async (load) => ({
  ...(await load<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));
let Component: typeof import('../SttContent').SttContent;
let store: typeof import('../../../../store/slices').default;
const read = vi.fn<Window['api']['storeRead']>();
const write = vi.fn<Window['api']['storeWrite']>();
const copy = vi.fn<(value: string) => Promise<void>>();
/** 获取实际 Zustand 公共快照。
 * @param subscribe - React 外部订阅入口。
 * @param getSnapshot - 真状态读取入口。
 * @returns 当前状态。
 */
function snapshot<T>(subscribe: (callback: () => void) => () => void, getSnapshot: () => T): T {
  void subscribe;
  return getSnapshot();
}
/** 重新求值真实组件。
 * @returns 实际元素树。
 */
function view(): ReactElement {
  return renderWithHooks(Component);
}
/** 通过公开文本节点绑定原生可编辑元素。
 * @param value - 原生文本值，null 表示缺少节点。
 * @returns 绑定节点或 null。
 */
function bind(value: string | null) {
  const ref = byClass(view(), 'stt-text-body').props.ref as { current: unknown };
  const element = value === null ? null : { textContent: value };
  ref.current = element;
  return element;
}
/** 点击公开动作按钮。
 * @param index - 五个动作的实际排列索引。
 * @returns 无返回值。
 */
function click(index: number): void {
  invoke(elements(view()).filter((node) => node.type === 'button')[index], 'onClick');
}
beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-06T12:34:56'));
  resetBrowser();
  read.mockReset().mockResolvedValue([]);
  write.mockReset().mockResolvedValue(true);
  copy.mockReset().mockResolvedValue();
  Object.assign(api, { storeRead: read, storeWrite: write, expandWindowNotification: vi.fn(), expandWindow: vi.fn() });
  vi.stubGlobal('navigator', { clipboard: { writeText: copy } });
  const react = await vi.importActual<typeof import('react') & { default: typeof import('react') }>('react');
  vi.spyOn(react.default, 'useSyncExternalStore').mockImplementation(snapshot);
  vi.spyOn(react.default, 'useCallback').mockImplementation((callback, dependencies) => lifecycleHooks.useCallback(callback, dependencies));
  vi.spyOn(react.default, 'useDebugValue').mockImplementation(() => undefined);
  vi.spyOn(react.default, 'useRef').mockImplementation((initial) => lifecycleHooks.useRef(initial));
  ({ SttContent: Component } = await import('../SttContent'));
  ({ default: store } = await import('../../../../store/slices'));
  store.setState({ state: 'stt', sttText: 'recognized', uiStateLocked: false });
});
afterEach(() => {
  unmountHooks();
  vi.clearAllTimers();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('识别组件真实状态与持久化', () => {
  it.each(['...', 'already', null])('聚焦 %s 节点仅清理占位，编辑期间不覆盖内容', (initial) => {
    const element = bind(initial);
    invoke(byClass(view(), 'stt-text-body'), 'onFocus');
    view();
    runEffects();
    if (element) expect(element.textContent).toBe(initial === '...' ? '' : initial);
    store.setState({ sttText: 'latest' });
    view();
    runEffects();
    if (element) expect(element.textContent).toBe(initial === '...' ? '' : initial);
  });
  it.each([' recognized ', '', null, ' edited '])('失焦输入 %s 仅在非空且改变时提交真实识别状态', (input) => {
    bind(input);
    invoke(byClass(view(), 'stt-text-body'), 'onBlur');
    expect(store.getState().sttText).toBe(input === ' edited ' ? 'edited' : 'recognized');
  });
  it.each([{ cached: [] }, { cached: [{ id: 1, text: 'old' }] }, { cached: {} }])('实际待办追加保留数组缓存并更新反馈：%s', async ({ cached }) => {
    read.mockResolvedValue(cached);
    bind(' edited ');
    click(2);
    await settle();
    const previous: unknown[] = Array.isArray(cached) ? cached as unknown[] : [];
    expect(write).toHaveBeenCalledWith('todos', [...previous, expect.objectContaining({ text: 'edited', done: false, description: '', subTodos: [] })]);
    expect(JSON.parse(storage.get('eIsland_todos') ?? '[]')).toEqual([...previous, expect.objectContaining({ text: 'edited' })]);
    expect(text(view())).toContain('stt.actions.added');
    vi.advanceTimersByTime(1500);
    expect(text(view())).toContain('stt.actions.addTodo');
  });
  it.each([{ cached: [] }, { cached: [{ id: 1, title: 'old' }] }, { cached: {} }])('实际备忘录前插保留数组缓存并更新反馈：%s', async ({ cached }) => {
    read.mockResolvedValue(cached);
    bind(null);
    click(1);
    await settle();
    const previous: unknown[] = Array.isArray(cached) ? cached as unknown[] : [];
    expect(write).toHaveBeenCalledWith('memos', [expect.objectContaining({ content: 'recognized', title: '2026-10-06 12:34:56-stt.asrQuickAdd', pinned: false, bookmarked: false }), ...previous]);
    expect(text(view())).toContain('stt.actions.added');
    vi.advanceTimersByTime(1500);
    expect(text(view())).toContain('stt.actions.addToMemo');
  });
  it.each(['read', 'write', 'local-storage'])('待办 %s 失败保持可重试，缓存失败仍可完成原生持久化', async (kind) => {
    if (kind === 'read') read.mockRejectedValue(new Error('read'));
    if (kind === 'write') write.mockRejectedValue(new Error('write'));
    if (kind === 'local-storage') vi.spyOn(browser.localStorage, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    bind(null);
    click(2);
    await settle();
    expect(text(view())).toContain(kind === 'local-storage' ? 'stt.actions.added' : 'stt.actions.addTodo');
  });
  it.each(['read', 'write'])('备忘录 %s 失败保持可重试', async (kind) => {
    if (kind === 'read') read.mockRejectedValue(new Error('read'));
    else write.mockRejectedValue(new Error('write'));
    bind(' ');
    click(1);
    await settle();
    expect(text(view())).toContain('stt.actions.addToMemo');
  });
  it('复制使用编辑文本并恢复反馈，发送和忽略走真实 Zustand 状态动作', async () => {
    bind(' edited ');
    click(3);
    await settle();
    expect(copy).toHaveBeenCalledWith('edited');
    expect(text(view())).toContain('stt.actions.copied');
    vi.advanceTimersByTime(1500);
    expect(text(view())).toContain('stt.actions.copy');
    click(0);
    expect(store.getState()).toMatchObject({ state: 'agent', agentPrompt: 'edited' });
    click(4);
    expect(store.getState().state).toBe('idle');
  });
  it.each([null, ' '])('空识别和空输入 %s 不创建任何记录或复制，发送仍传空提示', (input) => {
    store.setState({ sttText: '' });
    bind(input);
    click(1); click(2); click(3);
    expect(read).not.toHaveBeenCalled();
    expect(copy).not.toHaveBeenCalled();
    click(0);
    expect(store.getState().agentPrompt).toBe('');
  });
  it('原生剪贴板拒绝被实际复制链捕获，保持重试且仅成功才显示已复制', async () => {
    const failure = new Error('clipboard denied');
    const pending = Promise.reject<void>(failure);
    const terminal: Promise<unknown>[] = [];
    const nativeThen = pending.then.bind(pending);
    const then = vi.spyOn(pending, 'then').mockImplementation((fulfilled, rejected) => {
      const derived = nativeThen(fulfilled, rejected);
      const nativeCatch = derived.catch.bind(derived);
      vi.spyOn(derived, 'catch').mockImplementation((callback) => {
        const result = nativeCatch(callback);
        terminal.push(result);
        return result;
      });
      return derived;
    });
    copy.mockReturnValue(pending);
    bind(null);
    click(3);
    const sourceCall = then.mock.calls.findIndex(([, rejected]) => rejected === undefined);
    expect(then.mock.calls[sourceCall]).toHaveLength(1);
    const result = then.mock.results[sourceCall];
    const derived = result.type === 'return' ? result.value as Promise<void> : Promise.resolve();
    const productionCaught = terminal.length;
    await derived.catch(() => undefined);
    expect(productionCaught).toBeGreaterThan(0);
    await Promise.all(terminal);
    expect(result.type).toBe('return');
    // 测试侧只观察真实 Promise 链；失败反馈不得创建成功恢复计时器。
    expect(vi.getTimerCount()).toBe(0);
    expect(text(view())).toContain('stt.actions.copy');
    expect(text(view())).not.toContain('stt.actions.copied');
    copy.mockResolvedValue(undefined);
    click(3);
    await settle();
    expect(text(view())).toContain('stt.actions.copied');
    expect(copy).toHaveBeenCalledTimes(2);
  });

});
