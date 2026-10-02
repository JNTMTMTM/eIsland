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
 */

/**
 * @file appLauncherReorder.test.ts
 * @description 应用顺序恢复、布局同步、长按拖动与本地保存失败回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useAppLauncherDrag from '../useAppLauncherDrag';
import useAppLauncherLayout from '../useAppLauncherLayout';
import { APP_LAUNCHER_LONG_PRESS_MS, MAX_EXPAND_APP_TABS } from '../../config/appLauncherConfig';
import { getAppLauncherTabs, reorderAppLauncherLayout } from '../../utils/appLauncherOrder';
import { DEFAULT_MAXEXPAND_NAV_LAYOUT, MAXEXPAND_NAV_LAYOUT_STORE_KEY } from '../../../setting/utils/settingsConfig';
import type { PointerEvent } from 'react';

const hooks = vi.hoisted(() => ({
  cursor: 0,
  states: [] as unknown[],
  refs: [] as { current: unknown }[],
  memos: [] as { deps: unknown[]; value: unknown }[],
  effects: [] as { deps: unknown[]; cleanup?: () => void }[],
  pending: [] as (() => void)[],
}));

vi.mock('react', () => ({
  useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.states)) hooks.states[index] = initial;
    return [hooks.states[index], (value: unknown) => { hooks.states[index] = value; }];
  },
  useRef: (initial: unknown) => hooks.refs[hooks.cursor++] ??= { current: initial },
  useCallback: (callback: unknown, deps: unknown[]) => {
    const index = hooks.cursor++;
    const prior = hooks.memos[index];
    if (!prior || deps.some((dep, i) => dep !== prior.deps[i])) hooks.memos[index] = { deps, value: callback };
    return hooks.memos[index].value;
  },
  useMemo: (factory: () => unknown, deps: unknown[]) => {
    const index = hooks.cursor++;
    const prior = hooks.memos[index];
    if (!prior || deps.some((dep, i) => dep !== prior.deps[i])) hooks.memos[index] = { deps, value: factory() };
    return hooks.memos[index].value;
  },
  useEffect: (effect: () => (() => void) | undefined, deps: unknown[]) => {
    const index = hooks.cursor++;
    const prior = hooks.effects[index];
    if (!prior || deps.some((dep, i) => dep !== prior.deps[i])) {
      hooks.pending.push(() => {
        prior?.cleanup?.();
        hooks.effects[index] = { deps, cleanup: effect() };
      });
    }
  },
}));

function render<T>(hook: () => T): T {
  hooks.cursor = 0;
  const result = hook();
  hooks.pending.splice(0).forEach((effect) => effect());
  return result;
}

function resetHooks(): void {
  hooks.effects.forEach((effect) => effect?.cleanup?.());
  hooks.cursor = 0;
  hooks.states = [];
  hooks.refs = [];
  hooks.memos = [];
  hooks.effects = [];
  hooks.pending = [];
}

describe('应用导航排序', () => {
  let storedLayout: unknown;
  let listeners: ((channel: string, value: unknown) => void)[];
  const storeRead = vi.fn();
  const storeWrite = vi.fn();
  const unsubscribe = vi.fn();

  beforeEach(() => {
    resetHooks();
    vi.clearAllMocks();
    vi.useFakeTimers();
    storedLayout = [{ id: 'calendar', visible: false }, { id: 'todo', visible: true }];
    listeners = [];
    storeRead.mockImplementation(() => Promise.resolve(storedLayout));
    storeWrite.mockImplementation((key: string, layout: unknown) => {
      expect(key).toBe(MAXEXPAND_NAV_LAYOUT_STORE_KEY);
      storedLayout = structuredClone(layout);
      return Promise.resolve(true);
    });
    vi.stubGlobal('window', Object.assign(new EventTarget(), {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
      api: {
        storeRead,
        storeWrite,
        onSettingsChanged: (listener: (channel: string, value: unknown) => void) => {
          listeners.push(listener);
          return unsubscribe;
        },
      },
    }));
  });

  afterEach(() => {
    resetHooks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('读取 Layout 顺序时不隐藏入口，并补齐缺失应用与设置', () => {
    const layout = [{ id: 'calendar', visible: false }, { id: 'todo', visible: true }, { id: 'calendar', visible: true }, { id: 'removed-app', visible: true }];
    const tabs = getAppLauncherTabs(layout);
    expect(tabs.slice(0, 2)).toEqual(['calendar', 'todo']);
    expect(tabs.at(-1)).toBe('settings');
    expect(new Set(tabs).size).toBe(MAX_EXPAND_APP_TABS.length);
    expect([...tabs].sort()).toEqual([...MAX_EXPAND_APP_TABS].sort());
  });

  it('移动应用只调整顺序，保留全部应用与可见性且不修改原配置', () => {
    const layout = DEFAULT_MAXEXPAND_NAV_LAYOUT.map((item) => ({ ...item, visible: item.id !== 'calendar' }));
    const snapshot = structuredClone(layout);
    const updated = reorderAppLauncherLayout(layout, 'calendar', 'todo');
    expect(updated[0]).toEqual({ id: 'calendar', visible: false });
    expect(updated[1].id).toBe('todo');
    expect(updated).toHaveLength(layout.length);
    expect(layout).toEqual(snapshot);
    expect([...updated].sort((a, b) => a.id.localeCompare(b.id))).toEqual([...snapshot].sort((a, b) => a.id.localeCompare(b.id)));
  });

  it('设置入口固定，原地移动不生成写入配置', () => {
    expect(reorderAppLauncherLayout(DEFAULT_MAXEXPAND_NAV_LAYOUT, 'settings', 'todo')).toBe(DEFAULT_MAXEXPAND_NAV_LAYOUT);
    expect(reorderAppLauncherLayout(DEFAULT_MAXEXPAND_NAV_LAYOUT, 'todo', 'settings')).toBe(DEFAULT_MAXEXPAND_NAV_LAYOUT);
    expect(reorderAppLauncherLayout(DEFAULT_MAXEXPAND_NAV_LAYOUT, 'todo', 'todo')).toBe(DEFAULT_MAXEXPAND_NAV_LAYOUT);
  });

  it('初始化读取完成前禁止排序，防止覆盖已保存顺序', async () => {
    const initial = render(useAppLauncherLayout);
    expect(initial.ready).toBe(false);
    await initial.moveApp('todo', 'calendar');
    expect(storeWrite).not.toHaveBeenCalled();
    const loaded = render(useAppLauncherLayout);
    expect(loaded.ready).toBe(true);
    expect(loaded.tabs.slice(0, 2)).toEqual(['calendar', 'todo']);
    expect(storeRead).toHaveBeenCalledWith(MAXEXPAND_NAV_LAYOUT_STORE_KEY);
  });

  it('拖动写回同一份本地 Layout，重新挂载恢复已保存的顺序', async () => {
    render(useAppLauncherLayout);
    await Promise.resolve();
    await render(useAppLauncherLayout).moveApp('todo', 'calendar');
    const saved = render(useAppLauncherLayout);
    expect(saved.tabs.slice(0, 2)).toEqual(['todo', 'calendar']);
    expect(storeWrite).toHaveBeenCalledWith(MAXEXPAND_NAV_LAYOUT_STORE_KEY, expect.arrayContaining([{ id: 'calendar', visible: false }]));
    resetHooks();
    render(useAppLauncherLayout);
    await Promise.resolve();
    expect(render(useAppLauncherLayout).tabs).toEqual(saved.tabs);
  });

  it.each(['local', 'remote'])('同步设置页的 %s 顺序变更', async (source) => {
    render(useAppLauncherLayout);
    await Promise.resolve();
    const updated = [{ id: 'mail', visible: false }, { id: 'album', visible: false }];
    if (source === 'local') window.dispatchEvent(new CustomEvent('maxexpand-nav-layout-changed', { detail: updated }));
    else listeners[0](`store:${MAXEXPAND_NAV_LAYOUT_STORE_KEY}`, updated);
    const result = render(useAppLauncherLayout);
    expect(result.tabs.slice(0, 2)).toEqual(['mail', 'album']);
    expect(result.tabs).toHaveLength(MAX_EXPAND_APP_TABS.length);
  });

  it.each(['false', 'reject'])('保存返回 %s 时保留已保存顺序并提供失败状态', async (failure) => {
    render(useAppLauncherLayout);
    await Promise.resolve();
    const loaded = render(useAppLauncherLayout);
    storeWrite.mockImplementation(() => failure === 'false' ? Promise.resolve(false) : Promise.reject(new Error('disk unavailable')));
    await loaded.moveApp('todo', 'calendar');
    const result = render(useAppLauncherLayout);
    expect(result.tabs).toEqual(loaded.tabs);
    expect(result.saveFailed).toBe(true);
    expect(result.saving).toBe(false);
  });

  it('保存中的后续排序不会并发覆盖配置', async () => {
    render(useAppLauncherLayout);
    await Promise.resolve();
    let finishSave!: (saved: boolean) => void;
    storeWrite.mockImplementation(() => new Promise<boolean>((resolve) => { finishSave = resolve; }));
    const loaded = render(useAppLauncherLayout);
    const pending = loaded.moveApp('todo', 'calendar');
    await loaded.moveApp('album', 'mail');
    expect(storeWrite).toHaveBeenCalledOnce();
    expect(render(useAppLauncherLayout).saving).toBe(true);
    finishSave(true);
    await pending;
    expect(render(useAppLauncherLayout).saving).toBe(false);
  });
});

describe('应用图标长按拖动', () => {
  let enabled: boolean;
  const moveApp = vi.fn().mockResolvedValue(undefined);
  const buttons = ['todo', 'urlFavorites', 'album', 'settings'].map((tab, index) => ({
    dataset: { app: tab },
    setPointerCapture: vi.fn(),
    hasPointerCapture: vi.fn().mockReturnValue(true),
    releasePointerCapture: vi.fn(),
    getBoundingClientRect: () => ({ left: index * 80, top: 0, width: 60, height: 60 }),
  }));
  const gridRef = { current: {
    parentElement: { getBoundingClientRect: () => ({ left: 0, right: 320, top: 0, bottom: 180 }) },
    querySelectorAll: () => buttons,
  } as unknown as HTMLDivElement };

  function renderDrag(): ReturnType<typeof useAppLauncherDrag> {
    return render(() => useAppLauncherDrag(gridRef, enabled, moveApp));
  }

  function pointer(x = 30, y = 30, overrides = {}): PointerEvent<HTMLButtonElement> {
    return { isPrimary: true, button: 0, pointerId: 1, clientX: x, clientY: y, currentTarget: buttons[0], preventDefault: vi.fn(), ...overrides } as unknown as PointerEvent<HTMLButtonElement>;
  }

  function startDrag(): ReturnType<typeof useAppLauncherDrag> {
    renderDrag().onPointerDown(pointer());
    vi.advanceTimersByTime(APP_LAUNCHER_LONG_PRESS_MS);
    return renderDrag();
  }

  beforeEach(() => {
    resetHooks();
    vi.clearAllMocks();
    vi.useFakeTimers();
    enabled = true;
    vi.stubGlobal('window', Object.assign(new EventTarget(), {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    }));
  });

  afterEach(() => {
    resetHooks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('短按保留打开应用行为且不会排序', () => {
    const result = renderDrag();
    result.onPointerDown(pointer());
    expect(renderDrag().pressedTab).toBe('todo');
    vi.advanceTimersByTime(APP_LAUNCHER_LONG_PRESS_MS - 1);
    result.onPointerUp(pointer());
    vi.runAllTimers();
    expect(renderDrag().drag).toBeNull();
    expect(renderDrag().pressedTab).toBeNull();
    expect(result.consumeClick()).toBe(false);
    expect(moveApp).not.toHaveBeenCalled();
  });

  it('长按后跟随指针，松手保存一次并抑制随后产生的点击', () => {
    const result = startDrag();
    expect(result.pressedTab).toBe('todo');
    expect(result.drag?.tab).toBe('todo');
    result.onPointerMove(pointer(110));
    expect(renderDrag().drag).toEqual({ tab: 'todo', target: 'urlFavorites', x: 80, y: 0 });
    result.onPointerUp(pointer(110));
    expect(moveApp).toHaveBeenCalledExactlyOnceWith('todo', 'urlFavorites');
    expect(renderDrag().drag).toBeNull();
    expect(renderDrag().pressedTab).toBeNull();
    expect(result.consumeClick()).toBe(true);
    expect(result.consumeClick()).toBe(false);
    expect(buttons[0].releasePointerCapture).toHaveBeenCalledWith(1);
  });

  it('长按前移动超过容差取消拖动并抑制误点击', () => {
    const result = renderDrag();
    result.onPointerDown(pointer());
    result.onPointerMove(pointer(50));
    vi.runAllTimers();
    expect(renderDrag().drag).toBeNull();
    expect(renderDrag().pressedTab).toBeNull();
    expect(moveApp).not.toHaveBeenCalled();
    expect(result.consumeClick()).toBe(true);
  });

  it('松手时重新检测边界，拖出网格不会删除或调整入口', () => {
    const result = startDrag();
    result.onPointerMove(pointer(110));
    result.onPointerUp(pointer(400));
    expect(moveApp).not.toHaveBeenCalled();
    expect(renderDrag().drag).toBeNull();
  });

  it.each(['cancel', 'blur', 'escape', 'disabled'])('%s 中断拖动不保存', (reason) => {
    const result = startDrag();
    result.onPointerMove(pointer(110));
    if (reason === 'cancel') result.cancelDrag();
    if (reason === 'blur') window.dispatchEvent(new Event('blur'));
    if (reason === 'escape') {
      const event = Object.assign(new Event('keydown', { cancelable: true }), { key: 'Escape' });
      window.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    }
    if (reason === 'disabled') {
      enabled = false;
      renderDrag();
    }
    expect(renderDrag().drag).toBeNull();
    expect(renderDrag().pressedTab).toBeNull();
    expect(moveApp).not.toHaveBeenCalled();
    expect(result.consumeClick()).toBe(true);
  });

  it('卸载时清理长按计时器和指针捕获', () => {
    renderDrag().onPointerDown(pointer());
    resetHooks();
    expect(vi.getTimerCount()).toBe(0);
    expect(buttons[0].releasePointerCapture).toHaveBeenCalledWith(1);
    expect(moveApp).not.toHaveBeenCalled();
  });

  it('取消拖动后的键盘激活不受指针点击抑制影响', () => {
    const result = startDrag();
    result.cancelDrag();
    expect(result.consumeClick(true)).toBe(false);
  });

  it('忽略其他指针与右键，设置入口保持固定', () => {
    const result = renderDrag();
    result.onPointerDown(pointer(30, 30, { isPrimary: false }));
    result.onPointerDown(pointer(30, 30, { button: 2 }));
    result.onPointerDown(pointer(270, 30, { currentTarget: buttons[3] }));
    vi.runAllTimers();
    expect(renderDrag().drag).toBeNull();
    expect(renderDrag().pressedTab).toBeNull();
    result.onPointerDown(pointer());
    vi.advanceTimersByTime(APP_LAUNCHER_LONG_PRESS_MS);
    result.onPointerMove(pointer(110, 30, { pointerId: 2 }));
    result.onPointerUp(pointer(110, 30, { pointerId: 2 }));
    expect(renderDrag().drag?.target).toBe('todo');
    result.onPointerUp(pointer(270));
    expect(moveApp).not.toHaveBeenCalled();
  });
});
