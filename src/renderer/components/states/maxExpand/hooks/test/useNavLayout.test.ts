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
 * @file useNavLayout.test.ts
 * @description 传统导航布局停用、恢复及异步配置读取竞态回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNavLayout } from '../useNavLayout';
import { MAXEXPAND_NAV_LAYOUT_STORE_KEY } from '../../components/setting/utils/settingsConfig';

const hooks = vi.hoisted(() => ({
  cursor: 0,
  states: [] as unknown[],
  effects: [] as { deps: unknown[]; cleanup?: () => void }[],
  pending: [] as (() => void)[],
}));

vi.mock('react', () => ({
  useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.states)) hooks.states[index] = initial;
    return [hooks.states[index], (value: unknown) => { hooks.states[index] = value; }];
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

describe('useNavLayout lifecycle', () => {
  let reads: ((value: unknown) => void)[];
  let listeners: ((channel: string, value: unknown) => void)[];
  const storeRead = vi.fn();
  const unsubscribe = vi.fn();
  const firstLayout = [{ id: 'todo', visible: true }, { id: 'calendar', visible: false }];
  const latestLayout = [{ id: 'calendar', visible: true }, { id: 'todo', visible: false }];

  function render(enabled: boolean): ReturnType<typeof useNavLayout> {
    hooks.cursor = 0;
    const result = useNavLayout(enabled);
    hooks.pending.splice(0).forEach((effect) => effect());
    return result;
  }

  beforeEach(() => {
    hooks.cursor = 0;
    hooks.states = [];
    hooks.effects = [];
    hooks.pending = [];
    reads = [];
    listeners = [];
    storeRead.mockImplementation(() => new Promise<unknown>((resolve) => reads.push(resolve)));
    vi.stubGlobal('window', Object.assign(new EventTarget(), { api: {
      storeRead,
      onSettingsChanged: (listener: (channel: string, value: unknown) => void) => {
        listeners.push(listener);
        return unsubscribe;
      },
    } }));
  });

  afterEach(() => {
    hooks.effects.forEach((effect) => effect?.cleanup?.());
    vi.unstubAllGlobals();
  });

  it('应用化模式下不读取配置或订阅传统导航事件', () => {
    expect(render(false).navLayoutLoaded).toBe(false);
    expect(storeRead).not.toHaveBeenCalled();
    expect(listeners).toHaveLength(0);
    window.dispatchEvent(new CustomEvent('maxexpand-nav-layout-changed', { detail: latestLayout }));
    expect(render(false).navLayoutConfig).toEqual([]);
  });

  it('恢复传统模式时等待重新读取，不把停用期间的旧布局当成已加载', async () => {
    render(true);
    reads[0](firstLayout);
    await Promise.resolve();
    expect(render(true).navLayoutLoaded).toBe(true);
    render(false);
    expect(unsubscribe).toHaveBeenCalledOnce();
    window.dispatchEvent(new CustomEvent('maxexpand-nav-layout-changed', { detail: latestLayout }));
    listeners[0](`store:${MAXEXPAND_NAV_LAYOUT_STORE_KEY}`, latestLayout);
    expect(render(false).navLayoutConfig[0].id).toBe('todo');
    expect(render(true).navLayoutLoaded).toBe(false);

    reads[1](latestLayout);
    await Promise.resolve();
    const restored = render(true);
    expect(restored.navLayoutLoaded).toBe(true);
    expect(restored.navLayoutConfig.slice(0, 2)).toEqual(latestLayout);
  });

  it.each(['remote', 'local'])('迟到的初次读取不能覆盖更新的 %s 布局事件', async (source) => {
    render(true);
    if (source === 'remote') listeners[0](`store:${MAXEXPAND_NAV_LAYOUT_STORE_KEY}`, latestLayout);
    else window.dispatchEvent(new CustomEvent('maxexpand-nav-layout-changed', { detail: latestLayout }));
    expect(render(true).navLayoutLoaded).toBe(true);
    reads[0](firstLayout);
    await Promise.resolve();
    expect(render(true).navLayoutConfig.slice(0, 2)).toEqual(latestLayout);
  });

  it('切入应用化模式后拒绝未完成的旧读取', async () => {
    render(true);
    render(false);
    reads[0](firstLayout);
    await Promise.resolve();
    expect(render(false)).toEqual({ navLayoutConfig: [], navLayoutLoaded: false });
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
