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
 * @file maxExpandAppLauncherRuntime.test.tsx
 * @description 真实应用启动器悬停、焦点、布局读取和长按拖动 Hook 联合交互测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { byClass, elements, invoke, text } from '../../../../../test/tree';
import { createHookReactMock, deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../../../hooks/test/startupHookHarness';
import { MAXEXPAND_CONFIGURABLE_TABS } from '../../../setting/utils/settingsConfig';
import type { MaxExpandTab } from '../../../../../../../store/types';
import type { RefObject } from 'react';
let Component: typeof import('../MaxExpandAppLauncher').default;
let browser: EventTarget;
let buttons: ReturnType<typeof button>[];
let observerCallback: () => void;
const observe = vi.fn<(node: unknown) => void>();
const disconnect = vi.fn<() => void>();
const select = vi.fn<(tab: MaxExpandTab) => void>();
const read = vi.fn<(key: string) => Promise<unknown>>();
const write = vi.fn<(key: string, value: unknown) => Promise<boolean>>();
/** 原生 ResizeObserver 构造协议。
 * @param callback - 原生回调
 * @returns 原生观察对象
 */
function createObserver(callback: () => void) {
  observerCallback = callback;
  return {
    observe,
    disconnect
  };
}
class NativeCustomEvent extends Event {
  detail: unknown;

  /** 建立原生事件。
   * @param type - 事件名
   * @param options - 原生载荷
   */
  constructor(type: string, options: CustomEventInit) {
    super(type);
    this.detail = options.detail;
  }
}
/** 模拟原生固定图标按钮，只提供浏览器几何和捕获API。
 * @param tab - 应用标识
 * @param index - 原生槽位
 * @returns 原生按钮叶
 */
function button(tab: string, index: number) {
  const left = 30 + index * 100;
  const rect = {
    left,
    top: 40,
    right: left + 80,
    bottom: 120,
    width: 80,
    height: 80
  };
  let captured = false;
  return {
    dataset: {
      app: tab
    },
    offsetLeft: left,
    offsetTop: 40,
    offsetWidth: 80,
    offsetHeight: 80,
    focusVisible: true,
    matches() {
      return this.focusVisible;
    },
    getBoundingClientRect: () => rect,
    querySelector: () => ({
      getBoundingClientRect: () => rect,
      offsetWidth: 64,
      offsetHeight: 64
    }),
    hasPointerCapture: () => captured,
    setPointerCapture: () => {
      captured = true;
    },
    releasePointerCapture: () => {
      captured = false;
    }
  };
}
/** 读取真实组件。
 * @param transition - 切页动画中的目标
 * @returns 实际树
 */
function run(transition?: MaxExpandTab) {
  return renderHook(Component, {
    onSelectApp: select,
    transitionTab: transition
  });
}
/** 返回真实应用按钮。
 * @param tree - 元素树
 * @returns 应用入口
 */
function entries(tree = run()) {
  return elements(tree).filter((node) => node.type === 'button' && node.props['data-app']);
}
/** 挂载到真实 DOM ref 协议并执行所有 Hook。
 * @returns 当前树
 */
async function mount() {
  let tree = run();
  const viewport = Object.assign(new EventTarget(), {
    scrollTop: 0,
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      right: 600,
      bottom: 240,
      width: 600,
      height: 240
    })
  });
  const grid = {
    parentElement: viewport,
    querySelectorAll: () => buttons
  };
  (byClass(tree, 'max-expand-app-launcher-grid').props.ref as RefObject<unknown>).current = grid;
  (byClass(tree, 'max-expand-app-hide-zone').props.ref as RefObject<unknown>).current = {
    getBoundingClientRect: () => ({
      left: 500,
      top: 0,
      right: 600,
      bottom: 240
    })
  };
  flushHookEffects();
  await settleHook();
  tree = run();
  buttons = entries(tree).map((node) => String(node.props['data-app'])).map(button);
  flushHookEffects();
  return run();
}
/** 原生指针事件。
 * @param index - 图标槽位
 * @param patch - 原生输入
 * @returns 原生事件
 */
function pointer(index = 0, patch: Record<string, unknown> = {}) {
  return {
    isPrimary: true,
    button: 0,
    pointerType: 'mouse',
    pointerId: 1,
    clientX: 70 + index * 100,
    clientY: 80,
    currentTarget: buttons[index],
    preventDefault: vi.fn(),
    ...patch
  };
}
beforeEach(async () => {
  unmountHook();
  resetHook();
  vi.resetModules();
  vi.resetAllMocks();
  vi.useFakeTimers();
  browser = new EventTarget();
  buttons = [];
  read.mockResolvedValue(MAXEXPAND_CONFIGURABLE_TABS.map((id) => ({
    id,
    visible: id === 'todo' || id === 'album'
  })));
  write.mockResolvedValue(true);
  vi.stubGlobal('CustomEvent', NativeCustomEvent);
  vi.stubGlobal('ResizeObserver', vi.fn(createObserver));
  vi.stubGlobal('window', Object.assign(browser, {
    setTimeout,
    clearTimeout,
    api: {
      storeRead: read,
      storeWrite: write,
      onSettingsChanged: () => vi.fn()
    }
  }));
  vi.doMock('react', async (original) => createHookReactMock(await original<typeof import('react')>()));
  Component = (await import('../MaxExpandAppLauncher')).default;
});
afterEach(() => {
  unmountHook();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('MaxExpandAppLauncher with actual layout and drag hooks', () => {
  it('native hover measures and observes real hover offsets, focus/blur/leave preserve correct active app', async () => {
    await mount();
    const [first] = entries();
    invoke(first, 'onPointerEnter', pointer(0, {
      pointerType: 'touch'
    }));
    expect(entries()[0].props.className).not.toContain('is-active');
    invoke(first, 'onPointerEnter', pointer());
    run();
    flushHookEffects();
    expect(observe).toHaveBeenCalledOnce();
    expect(entries()[0].props.className).toContain('is-active');
    expect(entries()[1].props.style).toMatchObject({
      '--max-expand-app-offset-x': expect.any(String) as unknown
    });
    observerCallback();
    buttons[1].focusVisible = false;
    invoke(entries()[1], 'onFocus', pointer(1));
    buttons[1].focusVisible = true;
    invoke(entries()[1], 'onFocus', pointer(1));
    expect(entries()[0].props.className).toContain('is-active');
    invoke(first, 'onPointerLeave');
    expect(entries()[1].props.className).toContain('is-active');
    run();
    flushHookEffects();
    invoke(entries()[1], 'onBlur');
    run();
    flushHookEffects();
    expect(entries()[1].props.className).not.toContain('is-active');
    expect(disconnect).toHaveBeenCalled();
    run('todo');
    flushHookEffects();
    expect(select).not.toHaveBeenCalled();
  });
  it('ordinary click opens public application and long press suppresses pointer click while keyboard click remains available after cancel', async () => {
    await mount();
    invoke(entries()[0], 'onClick', {
      ...pointer(),
      detail: 1
    });
    expect(select).toHaveBeenCalledWith('todo');
    invoke(entries()[0], 'onPointerDown', pointer());
    await vi.advanceTimersByTimeAsync(450);
    let tree = run();
    flushHookEffects();
    expect(byClass(tree, 'max-expand-app-launcher').props['data-dragging']).toBe(true);
    const click = {
      ...pointer(),
      detail: 1
    };
    invoke(entries()[0], 'onClick', click);
    expect(click.preventDefault).toHaveBeenCalledOnce();
    expect(select).toHaveBeenCalledTimes(1);
    invoke(entries()[0], 'onPointerCancel');
    tree = run();
    flushHookEffects();
    invoke(entries()[0], 'onClick', {
      ...pointer(),
      detail: 0
    });
    expect(select).toHaveBeenCalledTimes(2);
  });
  it('real pointer reorder attempts persisted layout and exposes failure feedback after native save rejection', async () => {
    await mount();
    const pending = deferred<boolean>();
    write.mockReturnValue(pending.promise);
    invoke(entries()[0], 'onPointerDown', pointer());
    await vi.advanceTimersByTimeAsync(450);
    run();
    flushHookEffects();
    invoke(entries()[0], 'onPointerMove', pointer(0, {
      clientX: 170
    }));
    run();
    invoke(entries()[0], 'onPointerUp', pointer(0, {
      clientX: 170
    }));
    await settleHook();
    expect(write).toHaveBeenCalledOnce();
    expect(byClass(run(), 'max-expand-app-launcher').props['data-saving']).toBe(true);
    pending.resolve(false);
    await settleHook();
    run();
    flushHookEffects();
    expect(text(run())).toContain('maxExpand.appMode.saveLayoutFailed');
  });
  it('keyboard focus with no hover selects focused item and public drag into hide zone exposes release instruction', async () => {
    await mount();
    invoke(entries()[1], 'onFocus', pointer(1));
    expect(entries()[1].props.className).toContain('is-active');
    invoke(entries()[0], 'onPointerDown', pointer());
    await vi.advanceTimersByTimeAsync(450);
    run();
    flushHookEffects();
    invoke(entries()[0], 'onPointerMove', pointer(0, {
      clientX: 550
    }));
    expect(text(run())).toContain('maxExpand.appMode.releaseToHide');
    invoke(entries()[0], 'onPointerCancel');
  });
});
