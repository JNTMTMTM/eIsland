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
import { getAppLauncherTabs, hideAppLauncherLayout, reorderAppLauncherLayout } from '../../utils/appLauncherOrder';
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

  function delaySaves(): {
    layout: typeof DEFAULT_MAXEXPAND_NAV_LAYOUT;
    finish: (saved: boolean) => void;
    fail: (reason: Error) => void;
  }[] {
    const writes: ReturnType<typeof delaySaves> = [];
    storeWrite.mockImplementation((key: string, layout: typeof DEFAULT_MAXEXPAND_NAV_LAYOUT) => new Promise<boolean>((resolve, reject) => {
      expect(key).toBe(MAXEXPAND_NAV_LAYOUT_STORE_KEY);
      writes.push({ layout, finish: (saved) => {
        if (saved) storedLayout = structuredClone(layout);
        resolve(saved);
      }, fail: reject });
    }));
    return writes;
  }

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

  it('读取 Layout 顺序和可见性，隐藏入口不被补齐逻辑重新加入', () => {
    const layout = [{ id: 'calendar', visible: false }, { id: 'todo', visible: true }, { id: 'calendar', visible: true }, { id: 'removed-app', visible: true }];
    const tabs = getAppLauncherTabs(layout);
    expect(tabs.slice(0, 2)).toEqual(['todo', 'urlFavorites']);
    expect(tabs).not.toContain('calendar');
    expect(tabs.at(-1)).toBe('settings');
    expect(new Set(tabs).size).toBe(MAX_EXPAND_APP_TABS.length - 1);
    expect([...tabs].sort()).toEqual(MAX_EXPAND_APP_TABS.filter((tab) => tab !== 'calendar').sort());
  });

  it('全部应用隐藏时仍保留设置入口，空配置按默认可见性展示', () => {
    expect(getAppLauncherTabs(DEFAULT_MAXEXPAND_NAV_LAYOUT.map((item) => ({ ...item, visible: false })))).toEqual(['settings']);
    expect(getAppLauncherTabs([])).toEqual([...DEFAULT_MAXEXPAND_NAV_LAYOUT.map((item) => item.id), 'settings']);
  });

  it('移动应用只调整顺序，保留全部应用与可见性且不修改原配置', () => {
    const layout = DEFAULT_MAXEXPAND_NAV_LAYOUT.map((item) => ({ ...item, visible: item.id !== 'calendar' }));
    const snapshot = structuredClone(layout);
    const updated = reorderAppLauncherLayout(layout, 'album', 'todo');
    expect(updated[0]).toEqual({ id: 'album', visible: true });
    expect(updated[1].id).toBe('todo');
    expect(updated).toHaveLength(layout.length);
    expect(updated).toContainEqual({ id: 'calendar', visible: false });
    expect(getAppLauncherTabs(updated)).not.toContain('calendar');
    expect(layout).toEqual(snapshot);
    expect([...updated].sort((a, b) => a.id.localeCompare(b.id))).toEqual([...snapshot].sort((a, b) => a.id.localeCompare(b.id)));
  });

  it('设置入口固定，原地移动不生成写入配置', () => {
    expect(reorderAppLauncherLayout(DEFAULT_MAXEXPAND_NAV_LAYOUT, 'settings', 'todo')).toBe(DEFAULT_MAXEXPAND_NAV_LAYOUT);
    expect(reorderAppLauncherLayout(DEFAULT_MAXEXPAND_NAV_LAYOUT, 'todo', 'settings')).toBe(DEFAULT_MAXEXPAND_NAV_LAYOUT);
    expect(reorderAppLauncherLayout(DEFAULT_MAXEXPAND_NAV_LAYOUT, 'todo', 'todo')).toBe(DEFAULT_MAXEXPAND_NAV_LAYOUT);
  });

  it('隐藏只更新可见性，保留应用顺序、其他隐藏配置与设置入口', () => {
    const layout = DEFAULT_MAXEXPAND_NAV_LAYOUT.map((item) => ({ ...item, visible: item.id !== 'calendar' }));
    const snapshot = structuredClone(layout);
    const hidden = hideAppLauncherLayout(layout, 'todo');
    expect(hidden.map((item) => item.id)).toEqual(layout.map((item) => item.id));
    expect(hidden).toContainEqual({ id: 'todo', visible: false });
    expect(hidden).toContainEqual({ id: 'calendar', visible: false });
    expect(layout).toEqual(snapshot);
    expect(hideAppLauncherLayout(hidden, 'todo')).toBe(hidden);
    expect(hideAppLauncherLayout(layout, 'settings')).toBe(layout);
  });

  it('初始化读取完成前不展示入口且禁止排序，避免短暂显示隐藏应用', async () => {
    const initial = render(useAppLauncherLayout);
    expect(initial.ready).toBe(false);
    expect(initial.tabs).toEqual([]);
    await initial.moveApp('album', 'todo');
    await initial.hideApp('todo');
    expect(storeWrite).not.toHaveBeenCalled();
    const loaded = render(useAppLauncherLayout);
    expect(loaded.ready).toBe(true);
    expect(loaded.tabs.slice(0, 2)).toEqual(['todo', 'urlFavorites']);
    expect(loaded.tabs).not.toContain('calendar');
    expect(storeRead).toHaveBeenCalledWith(MAXEXPAND_NAV_LAYOUT_STORE_KEY);
  });

  it('拖动写回同一份本地 Layout，重新挂载恢复已保存的顺序', async () => {
    render(useAppLauncherLayout);
    await Promise.resolve();
    await render(useAppLauncherLayout).moveApp('album', 'todo');
    const saved = render(useAppLauncherLayout);
    expect(saved.tabs.slice(0, 2)).toEqual(['album', 'todo']);
    expect(saved.tabs).not.toContain('calendar');
    expect(storeWrite).toHaveBeenCalledWith(MAXEXPAND_NAV_LAYOUT_STORE_KEY, expect.arrayContaining([{ id: 'calendar', visible: false }]));
    resetHooks();
    render(useAppLauncherLayout);
    await Promise.resolve();
    expect(render(useAppLauncherLayout).tabs).toEqual(saved.tabs);
  });

  it('隐藏立即更新入口，保存到同一份 Layout，重启后保持隐藏且可从设置页恢复', async () => {
    render(useAppLauncherLayout);
    await Promise.resolve();
    const original = render(useAppLauncherLayout).tabs;
    const pending = render(useAppLauncherLayout).hideApp('todo');
    expect(render(useAppLauncherLayout).tabs).not.toContain('todo');
    await pending;
    expect(storeWrite).toHaveBeenCalledExactlyOnceWith(MAXEXPAND_NAV_LAYOUT_STORE_KEY,
      expect.arrayContaining([{ id: 'todo', visible: false }, { id: 'calendar', visible: false }]));
    resetHooks();
    render(useAppLauncherLayout);
    await Promise.resolve();
    expect(render(useAppLauncherLayout).tabs).toEqual(original.filter((tab) => tab !== 'todo'));
    const restored = (storedLayout as typeof DEFAULT_MAXEXPAND_NAV_LAYOUT).map((item) => ({ ...item, visible: item.id === 'todo' || item.visible }));
    window.dispatchEvent(new CustomEvent('maxexpand-nav-layout-changed', { detail: restored }));
    expect(render(useAppLauncherLayout).tabs).toEqual(original);
  });

  it.each(['false', 'reject'])('隐藏保存返回 %s 时恢复图标和可见性', async (failure) => {
    render(useAppLauncherLayout);
    await Promise.resolve();
    const original = render(useAppLauncherLayout).tabs;
    storeWrite.mockImplementation(() => failure === 'false' ? Promise.resolve(false) : Promise.reject(new Error('disk unavailable')));
    await render(useAppLauncherLayout).hideApp('todo');
    expect(render(useAppLauncherLayout).tabs).toEqual(original);
    expect(render(useAppLauncherLayout).saveFailed).toBe(true);
  });

  it('设置入口和已隐藏应用不会产生保存操作', async () => {
    render(useAppLauncherLayout);
    await Promise.resolve();
    const loaded = render(useAppLauncherLayout);
    await loaded.hideApp('settings');
    await loaded.hideApp('calendar');
    expect(storeWrite).not.toHaveBeenCalled();
    expect(render(useAppLauncherLayout).tabs.at(-1)).toBe('settings');
  });

  it.each(['local', 'remote'])('同步设置页的 %s 顺序及显示隐藏变更', async (source) => {
    render(useAppLauncherLayout);
    await Promise.resolve();
    const updated = [{ id: 'mail', visible: false }, { id: 'album', visible: true }, { id: 'calendar', visible: false }];
    if (source === 'local') window.dispatchEvent(new CustomEvent('maxexpand-nav-layout-changed', { detail: updated }));
    else listeners[0](`store:${MAXEXPAND_NAV_LAYOUT_STORE_KEY}`, updated);
    const result = render(useAppLauncherLayout);
    expect(result.tabs.slice(0, 2)).toEqual(['album', 'todo']);
    expect(result.tabs).not.toContain('mail');
    expect(result.tabs).not.toContain('calendar');
    expect(result.tabs).toHaveLength(MAX_EXPAND_APP_TABS.length - 2);
    const toggled = updated.map((item) => ({ ...item, visible: item.id === 'mail' }));
    if (source === 'local') window.dispatchEvent(new CustomEvent('maxexpand-nav-layout-changed', { detail: toggled }));
    else listeners[0](`store:${MAXEXPAND_NAV_LAYOUT_STORE_KEY}`, toggled);
    const visible = render(useAppLauncherLayout).tabs;
    expect(visible[0]).toBe('mail');
    expect(visible).not.toContain('album');
    expect(visible.at(-1)).toBe('settings');
    expect(storeWrite).not.toHaveBeenCalled();
  });

  it.each(['false', 'reject'])('保存返回 %s 时保留已保存顺序并提供失败状态', async (failure) => {
    render(useAppLauncherLayout);
    await Promise.resolve();
    const loaded = render(useAppLauncherLayout);
    storeWrite.mockImplementation(() => failure === 'false' ? Promise.resolve(false) : Promise.reject(new Error('disk unavailable')));
    await loaded.moveApp('album', 'todo');
    const result = render(useAppLauncherLayout);
    expect(result.tabs).toEqual(loaded.tabs);
    expect(result.saveFailed).toBe(true);
    expect(result.saving).toBe(false);
  });

  it('连续排序和隐藏依次保存，旧回调与较早的配置回传不会覆盖最新预览', async () => {
    render(useAppLauncherLayout);
    await Promise.resolve();
    const original = storedLayout as typeof DEFAULT_MAXEXPAND_NAV_LAYOUT;
    const writes = delaySaves();
    const loaded = render(useAppLauncherLayout);
    const firstLayout = reorderAppLauncherLayout(original, 'album', 'todo');
    const secondLayout = reorderAppLauncherLayout(firstLayout, 'album', 'mail');
    const finalLayout = hideAppLauncherLayout(secondLayout, 'todo');
    const first = loaded.moveApp('album', 'todo');
    const second = loaded.moveApp('album', 'mail');
    const third = loaded.hideApp('todo');
    await Promise.resolve();
    expect(storeWrite).toHaveBeenCalledOnce();
    expect(writes[0].layout).toEqual(firstLayout);
    expect(render(useAppLauncherLayout).tabs).toEqual(getAppLauncherTabs(finalLayout));
    listeners[0](`store:${MAXEXPAND_NAV_LAYOUT_STORE_KEY}`, firstLayout);
    expect(render(useAppLauncherLayout).tabs).toEqual(getAppLauncherTabs(finalLayout));
    writes[0].finish(true);
    await first;
    expect(storeWrite).toHaveBeenCalledTimes(2);
    expect(writes[1].layout).toEqual(secondLayout);
    expect(render(useAppLauncherLayout).saving).toBe(true);
    writes[1].finish(true);
    await second;
    expect(storeWrite).toHaveBeenCalledTimes(3);
    expect(writes[2].layout).toEqual(finalLayout);
    expect(render(useAppLauncherLayout).saving).toBe(true);
    writes[2].finish(true);
    await third;
    expect(render(useAppLauncherLayout).saving).toBe(false);
    expect(render(useAppLauncherLayout).saveFailed).toBe(false);
    expect(storedLayout).toEqual(finalLayout);
    resetHooks();
    render(useAppLauncherLayout);
    await Promise.resolve();
    expect(render(useAppLauncherLayout).tabs).toEqual(getAppLauncherTabs(finalLayout));
  });

  it.each(['false', 'reject'])('较早保存返回 %s 时继续保存后续隐藏，保留全部操作', async (failure) => {
    render(useAppLauncherLayout);
    await Promise.resolve();
    const writes = delaySaves();
    const loaded = render(useAppLauncherLayout);
    const first = loaded.hideApp('todo');
    const second = loaded.hideApp('album');
    const latest = render(useAppLauncherLayout).tabs;
    expect(latest).not.toContain('todo');
    expect(latest).not.toContain('album');
    await Promise.resolve();
    if (failure === 'false') writes[0].finish(false);
    else writes[0].fail(new Error('disk unavailable'));
    await first;
    expect(writes).toHaveLength(2);
    expect(render(useAppLauncherLayout).tabs).toEqual(latest);
    expect(render(useAppLauncherLayout).saving).toBe(true);
    expect(render(useAppLauncherLayout).saveFailed).toBe(false);
    writes[1].finish(true);
    await second;
    expect(storedLayout).toEqual(writes[1].layout);
    expect(getAppLauncherTabs(storedLayout as typeof DEFAULT_MAXEXPAND_NAV_LAYOUT)).toEqual(latest);
    expect(render(useAppLauncherLayout).saveFailed).toBe(false);
    expect(render(useAppLauncherLayout).saving).toBe(false);
  });

  it.each(['false', 'reject'])('最后保存返回 %s 时恢复最近成功的布局，仍可接受新操作', async (failure) => {
    render(useAppLauncherLayout);
    await Promise.resolve();
    const writes = delaySaves();
    const loaded = render(useAppLauncherLayout);
    const first = loaded.hideApp('todo');
    const second = loaded.hideApp('album');
    await Promise.resolve();
    writes[0].finish(true);
    await first;
    if (failure === 'false') writes[1].finish(false);
    else writes[1].fail(new Error('disk unavailable'));
    await second;
    const result = render(useAppLauncherLayout);
    expect(result.tabs).toEqual(getAppLauncherTabs(writes[0].layout));
    expect(result.tabs).toContain('album');
    expect(result.tabs).not.toContain('todo');
    expect(result.saving).toBe(false);
    expect(result.saveFailed).toBe(true);
    const retry = result.hideApp('urlFavorites');
    await Promise.resolve();
    expect(writes[2].layout).toEqual(hideAppLauncherLayout(writes[0].layout, 'urlFavorites'));
    writes[2].finish(true);
    await retry;
    expect(render(useAppLauncherLayout).saveFailed).toBe(false);
    expect(render(useAppLauncherLayout).tabs).toEqual(getAppLauncherTabs(writes[2].layout));
  });

  it('连续保存全部失败时恢复原布局，原地操作不增加排队写入', async () => {
    render(useAppLauncherLayout);
    await Promise.resolve();
    const writes = delaySaves();
    const loaded = render(useAppLauncherLayout);
    const first = loaded.hideApp('todo');
    const second = loaded.hideApp('album');
    await loaded.hideApp('todo');
    await loaded.moveApp('mail', 'mail');
    writes[0].finish(false);
    await first;
    expect(writes).toHaveLength(2);
    writes[1].finish(false);
    await second;
    expect(render(useAppLauncherLayout).tabs).toEqual(loaded.tabs);
    expect(render(useAppLauncherLayout).saveFailed).toBe(true);
  });

  it('组件卸载后仍完成已接受的排队操作，重新挂载恢复最终布局', async () => {
    render(useAppLauncherLayout);
    await Promise.resolve();
    const writes = delaySaves();
    const loaded = render(useAppLauncherLayout);
    const first = loaded.hideApp('todo');
    const second = loaded.hideApp('album');
    await Promise.resolve();
    resetHooks();
    writes[0].finish(true);
    await first;
    writes[1].finish(true);
    await second;
    render(useAppLauncherLayout);
    await Promise.resolve();
    expect(render(useAppLauncherLayout).tabs).toEqual(getAppLauncherTabs(writes[1].layout));
  });
});

describe('应用图标长按拖动', () => {
  let enabled: boolean;
  const moveApp = vi.fn().mockResolvedValue(undefined);
  const hideApp = vi.fn().mockResolvedValue(undefined);
  const hideZoneRef = { current: null as HTMLDivElement | null };
  const hideZone = { getBoundingClientRect: () => ({ left: 240, right: 312, top: 8, bottom: 172 }) } as HTMLDivElement;
  const buttons = ['todo', 'urlFavorites', 'album', 'settings'].map((tab, index) => ({
    dataset: { app: tab },
    setPointerCapture: vi.fn(),
    hasPointerCapture: vi.fn().mockReturnValue(true),
    releasePointerCapture: vi.fn(),
    getBoundingClientRect: () => ({ left: index * 80, top: 0, width: 60, height: 60 }),
    querySelector: (selector: string) => selector.endsWith('visual')
      ? { getBoundingClientRect: () => ({ left: index * 80, top: 0, width: 60, height: 60 }) }
      : { offsetWidth: 40, offsetHeight: 40, getBoundingClientRect: () => ({ left: index * 80 + 10, top: 10, width: 40, height: 40 }) },
  }));
  const gridRef = { current: {
    parentElement: Object.assign(new EventTarget(), { scrollTop: 0, getBoundingClientRect: () => ({ left: 0, right: 320, top: 0, bottom: 180 }) }),
    querySelectorAll: () => buttons,
  } as unknown as HTMLDivElement };

  function renderDrag(): ReturnType<typeof useAppLauncherDrag> {
    return render(() => useAppLauncherDrag(gridRef, enabled, moveApp, hideZoneRef, hideApp));
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
    hideZoneRef.current = null;
    if (gridRef.current?.parentElement) gridRef.current.parentElement.scrollTop = 0;
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
    expect(renderDrag().drag).toEqual({ tab: 'todo', target: 'urlFavorites', x: 80, y: 0, hideTarget: false, offsets: [
      { x: 0, y: 0 }, { x: -80, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 },
    ] });
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

  it('鼠标移出容器后图标停在边缘，松手保存容器内的插入位置', () => {
    const result = startDrag();
    result.onPointerMove(pointer(400));
    expect(renderDrag().drag?.x).toBe(260);
    expect(renderDrag().drag?.target).toBe('album');
    result.onPointerUp(pointer(400));
    expect(moveApp).toHaveBeenCalledExactlyOnceWith('todo', 'album');
    expect(renderDrag().drag).toBeNull();
  });

  it.each([
    [-1000, 30, 0, 0], [1000, 30, 260, 0],
    [30, -1000, 0, 0], [30, 1000, 0, 120],
    [-1000, -1000, 0, 0], [1000, 1000, 260, 120],
  ])('指针移到 (%s, %s) 时整个图标留在容器内', (x, y, expectedX, expectedY) => {
    const result = startDrag();
    result.onPointerMove(pointer(x, y));
    expect(renderDrag().drag).toMatchObject({ x: expectedX, y: expectedY });
    expect(moveApp).not.toHaveBeenCalled();
  });

  it('开始拖动时就为放大圆圈和外侧进度环预留空间', () => {
    const selector = vi.spyOn(buttons[0], 'querySelector')
      .mockReturnValueOnce({ getBoundingClientRect: () => ({ left: 0, top: 0, width: 60, height: 60 }) })
      .mockReturnValueOnce({ offsetWidth: 64, offsetHeight: 64, getBoundingClientRect: () => ({ left: -2, top: -2, width: 64, height: 64 }) });
    const result = startDrag();
    selector.mockRestore();
    expect(result.drag?.x).toBeCloseTo(12.55);
    expect(result.drag?.y).toBeCloseTo(12.55);
    result.onPointerMove(pointer(1000, 1000));
    expect(renderDrag().drag?.x).toBeCloseTo(247.45);
    expect(renderDrag().drag?.y).toBeCloseTo(107.45);
  });

  it.each(['cancel', 'blur', 'resize', 'escape', 'disabled'])('%s 中断拖动不保存', (reason) => {
    const result = startDrag();
    result.onPointerMove(pointer(110));
    if (reason === 'cancel') result.cancelDrag();
    if (reason === 'blur') window.dispatchEvent(new Event('blur'));
    if (reason === 'resize') window.dispatchEvent(new Event('resize'));
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
    expect(moveApp).toHaveBeenCalledExactlyOnceWith('todo', 'album');
  });

  it('横向拖动实时挤走多个相邻图标，反向拖回时恢复槽位且尚未保存', () => {
    const result = startDrag();
    result.onPointerMove(pointer(190));
    expect(renderDrag().drag?.offsets).toEqual([
      { x: 0, y: 0 }, { x: -80, y: 0 }, { x: -80, y: 0 }, { x: 0, y: 0 },
    ]);
    expect(renderDrag().drag?.target).toBe('album');
    result.onPointerMove(pointer(30));
    expect(renderDrag().drag?.offsets.every((offset) => offset.x === 0 && offset.y === 0)).toBe(true);
    expect(renderDrag().drag?.target).toBe('todo');
    expect(moveApp).not.toHaveBeenCalled();
  });

  it('插入预览使用固定槽位，重复指针事件不会受让位动画影响', () => {
    const result = startDrag();
    result.onPointerMove(pointer(80));
    const preview = renderDrag().drag;
    result.onPointerMove(pointer(80));
    expect(renderDrag().drag).toEqual(preview);
    expect(moveApp).not.toHaveBeenCalled();
  });

  it('滚动时修正拖动位置，保持源图标跟随指针', () => {
    const result = startDrag();
    if (gridRef.current?.parentElement) gridRef.current.parentElement.scrollTop = 20;
    result.onPointerMove(pointer(110));
    expect(renderDrag().drag?.y).toBe(20);
    expect(renderDrag().drag?.target).toBe('urlFavorites');
    result.onPointerMove(pointer(110, 1000));
    expect(renderDrag().drag?.y).toBe(140);
  });

  it('鼠标静止时滚动容器也会更新边界，不让图标滚出可见区域', () => {
    startDrag();
    const viewport = gridRef.current?.parentElement;
    if (viewport) {
      viewport.scrollTop = 100;
      viewport.dispatchEvent(new Event('scroll'));
    }
    expect(renderDrag().drag?.y).toBe(100);
    expect(moveApp).not.toHaveBeenCalled();
  });

  it('进入右侧隐藏区时清除排序预览，松手隐藏一次并抑制误点击', () => {
    const result = startDrag();
    hideZoneRef.current = hideZone;
    result.onPointerMove(pointer(110));
    result.onPointerMove(pointer(270, 90));
    expect(renderDrag().drag).toMatchObject({ hideTarget: true, target: null });
    expect(renderDrag().drag?.offsets.every(({ x, y }) => x === 0 && y === 0)).toBe(true);
    expect(hideApp).not.toHaveBeenCalled();
    result.onPointerUp(pointer(270, 90));
    expect(hideApp).toHaveBeenCalledExactlyOnceWith('todo');
    expect(moveApp).not.toHaveBeenCalled();
    expect(renderDrag().drag).toBeNull();
    expect(renderDrag().pressedTab).toBeNull();
    expect(result.consumeClick()).toBe(true);
  });

  it('从隐藏区拖回网格时取消隐藏高亮并恢复排序', () => {
    const result = startDrag();
    hideZoneRef.current = hideZone;
    result.onPointerMove(pointer(270, 90));
    expect(renderDrag().drag?.hideTarget).toBe(true);
    result.onPointerMove(pointer(110));
    expect(renderDrag().drag).toMatchObject({ hideTarget: false, target: 'urlFavorites' });
    result.onPointerUp(pointer(110));
    expect(hideApp).not.toHaveBeenCalled();
    expect(moveApp).toHaveBeenCalledExactlyOnceWith('todo', 'urlFavorites');
  });

  it.each([true, false])('按松手位置最终判断是否隐藏：%s', (hide) => {
    const result = startDrag();
    hideZoneRef.current = hideZone;
    result.onPointerMove(hide ? pointer(110) : pointer(270, 90));
    result.onPointerUp(hide ? pointer(270, 90) : pointer(110));
    expect(hideApp).toHaveBeenCalledTimes(hide ? 1 : 0);
    expect(moveApp).toHaveBeenCalledTimes(hide ? 0 : 1);
  });

  it.each(['cancel', 'blur', 'escape', 'disabled'])('隐藏区内 %s 取消不会隐藏或排序', (reason) => {
    const result = startDrag();
    hideZoneRef.current = hideZone;
    result.onPointerMove(pointer(270, 90));
    if (reason === 'cancel') result.cancelDrag();
    if (reason === 'blur') window.dispatchEvent(new Event('blur'));
    if (reason === 'escape') window.dispatchEvent(Object.assign(new Event('keydown'), { key: 'Escape' }));
    if (reason === 'disabled') { enabled = false; renderDrag(); }
    expect(hideApp).not.toHaveBeenCalled();
    expect(moveApp).not.toHaveBeenCalled();
    expect(renderDrag().drag).toBeNull();
  });

  it('指针拖出容器底部时图标仍被限制在容器内，但不会误隐藏', () => {
    const result = startDrag();
    hideZoneRef.current = hideZone;
    result.onPointerMove(pointer(110, 1000));
    expect(renderDrag().drag).toMatchObject({ y: 120, hideTarget: false });
    result.onPointerUp(pointer(110, 1000));
    expect(hideApp).not.toHaveBeenCalled();
  });

  it('指针越过右侧隐藏区拖出容器时不误隐藏，回到区域内恢复高亮', () => {
    const result = startDrag();
    hideZoneRef.current = hideZone;
    result.onPointerMove(pointer(1000, 90));
    expect(renderDrag().drag).toMatchObject({ x: 260, hideTarget: false });
    result.onPointerMove(pointer(270, 90));
    expect(renderDrag().drag?.hideTarget).toBe(true);
    result.onPointerUp(pointer(1000, 90));
    expect(hideApp).not.toHaveBeenCalled();
  });

  it('原本位于隐藏区位置的图标长按后直接松手不会误隐藏', () => {
    const result = startDrag();
    hideZoneRef.current = { getBoundingClientRect: () => ({ left: 0, right: 320, top: 0, bottom: 60 }) } as HTMLDivElement;
    result.onPointerUp(pointer());
    expect(hideApp).not.toHaveBeenCalled();
  });
});
