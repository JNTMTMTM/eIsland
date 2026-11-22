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
 * @file useIslandDragRuntime.test.ts
 * @description 验证胶囊拖动的原生接管、位置锁、点击抑制和手势清理。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../test/elementHarness';
import { useIslandDrag } from '../useIslandDrag';

vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));

type Options = Parameters<typeof useIslandDrag>[0];
let documentEvents: EventTarget;
let windowEvents: EventTarget;
const startPillDrag = vi.fn<(dx: number, dy: number) => void>();

beforeEach(() => {
  resetLifecycle();
  startPillDrag.mockClear();
  documentEvents = new EventTarget();
  windowEvents = new EventTarget();
  vi.stubGlobal('document', documentEvents);
  vi.stubGlobal('window', Object.assign(windowEvents, { api: { startPillDrag } }));
});

afterEach(() => {
  unmountHooks();
  vi.unstubAllGlobals();
});

/**
 * 安装真实拖动 Hook 的事件监听。
 * @param options - 当前形态、状态和位置锁。
 * @returns Hook 的点击包装器。
 */
function mount(options: Options = { shapeMode: 'pill', state: 'idle', positionLockedRef: { current: false } }) {
  const result = renderWithHooks(() => useIslandDrag(options));
  runEffects();
  return result;
}

/**
 * 派发位置和按键变化，覆盖窗口接管前的手势。
 * @param type - 鼠标事件名称。
 * @param fields - 覆盖系统坐标或鼠标按键。
 */
function mouse(type: string, fields: Partial<MouseEvent> = {}): void {
  documentEvents.dispatchEvent(Object.assign(new Event(type), { button: 0, buttons: 1, screenX: 100, screenY: 200, ...fields }));
}

describe('Pill 拖动', () => {
  it.each(['idle', 'lyrics', 'lyricsTranslation', 'agentVoiceInput'] as const)('从 %s 越过阈值立即交给系统且每次手势只启动一次', (state) => {
    const result = mount({ state, shapeMode: 'pill', positionLockedRef: { current: false } });
    const click = vi.fn();
    mouse('mousedown');
    mouse('mousemove', { screenX: 104, screenY: 196 });
    expect(startPillDrag).not.toHaveBeenCalled();
    mouse('mousemove', { screenY: 195 });
    expect(startPillDrag).toHaveBeenCalledExactlyOnceWith(0, -5);
    mouse('mousemove', { screenX: 130, screenY: 225 });
    mouse('mouseup', { buttons: 0 });
    result.wrapClick(click)();
    expect(startPillDrag).toHaveBeenCalledOnce();
    expect(click).not.toHaveBeenCalled();
    mouse('mousedown');
    mouse('mouseup', { buttons: 0 });
    result.wrapClick(click)();
    expect(click).toHaveBeenCalledOnce();
  });

  it.each([{ shapeMode: 'notch', state: 'idle' }, { shapeMode: 'pill', state: 'hover' }, { shapeMode: 'pill', state: 'cli' }] satisfies Array<Pick<Options, 'shapeMode' | 'state'>>)('在 $shapeMode/$state 不启动拖动', ({ shapeMode, state }) => {
    const click = vi.fn();
    const result = mount({ shapeMode, state, positionLockedRef: { current: false } });
    mouse('mousedown');
    mouse('mousemove', { screenX: 110 });
    result.wrapClick(click)();
    expect(startPillDrag).not.toHaveBeenCalled();
    expect(click).toHaveBeenCalledOnce();
  });

  it.each([true, false])('位置锁（初始为 %s）保留点击并阻止拖动', (initiallyLocked) => {
    const positionLockedRef = { current: initiallyLocked };
    const result = mount({ positionLockedRef, shapeMode: 'pill', state: 'idle' });
    mouse('mousedown');
    positionLockedRef.current = true;
    mouse('mousemove', { screenX: 110 });
    positionLockedRef.current = false;
    mouse('mousemove', { screenX: 120 });
    const click = vi.fn();
    result.wrapClick(click)();
    expect(startPillDrag).not.toHaveBeenCalled();
    expect(click).toHaveBeenCalledOnce();
  });

  it('只跟踪左键，并在松开或失焦后取消待处理手势', () => {
    mount();
    mouse('mousedown', { button: 2, buttons: 2 });
    mouse('mousemove', { screenX: 110 });
    mouse('mousedown');
    mouse('mousemove', { screenX: 110, buttons: 0 });
    mouse('mousemove', { screenX: 110 });
    mouse('mousedown');
    windowEvents.dispatchEvent(new Event('blur'));
    mouse('mousemove', { screenX: 110 });
    mouse('mousedown');
    mouse('mouseup', { buttons: 0 });
    mouse('mousemove', { screenX: 110 });
    expect(startPillDrag).not.toHaveBeenCalled();
    mouse('mousedown');
    mouse('mouseup', { button: 2 });
    mouse('mousemove', { screenX: 110 });
    expect(startPillDrag).toHaveBeenCalledOnce();
  });

  it('切换到 Notch 时清除拖动标记并恢复点击', () => {
    const positionLockedRef = { current: false };
    mount({ positionLockedRef, shapeMode: 'pill', state: 'idle' });
    mouse('mousedown');
    mouse('mousemove', { screenX: 110 });
    const result = mount({ positionLockedRef, shapeMode: 'notch', state: 'idle' });
    const click = vi.fn();
    result.wrapClick(click)();
    mouse('mousedown');
    mouse('mousemove', { screenX: 110 });
    expect(startPillDrag).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
  });
});
