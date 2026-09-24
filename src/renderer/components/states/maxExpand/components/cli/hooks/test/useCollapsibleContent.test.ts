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
 * @file useCollapsibleContent.test.ts
 * @description CLI 重内容延迟卸载、快速反向切换和定时器清理回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useCollapsibleContent from '../useCollapsibleContent';

const { stateMock, effectMock } = vi.hoisted(() => ({ stateMock: vi.fn(), effectMock: vi.fn() }));
vi.mock('react', () => ({ useState: stateMock, useEffect: effectMock }));

let retained: boolean | undefined;
let previousDeps: unknown[];
let cleanup: (() => void) | void;
let pendingEffect: (() => void | (() => void)) | undefined;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('window', { setTimeout, clearTimeout });
  retained = undefined;
  previousDeps = [];
  cleanup = undefined;
  pendingEffect = undefined;
  stateMock.mockImplementation((initial: boolean) => {
    retained ??= initial;
    return [retained, (next: boolean) => { retained = next; }];
  });
  effectMock.mockImplementation((effect: () => void | (() => void), deps: unknown[]) => {
    if (deps.some((dep, index) => dep !== previousDeps[index])) {
      pendingEffect = effect;
      previousDeps = deps;
    }
  });
});

afterEach(() => {
  cleanup?.();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function render(visible: boolean): boolean {
  const mounted = useCollapsibleContent(visible, 260);
  if (pendingEffect) {
    cleanup?.();
    cleanup = pendingEffect();
    pendingEffect = undefined;
  }
  return mounted;
}

describe('CLI collapsible content lifetime', () => {
  it('does not mount initially hidden content or create idle timers', () => {
    expect(render(false)).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    expect(render(true)).toBe(true);
  });

  it('keeps content through the closing animation then releases it', () => {
    expect(render(true)).toBe(true);
    expect(render(false)).toBe(true);
    vi.advanceTimersByTime(259);
    expect(render(false)).toBe(true);
    vi.advanceTimersByTime(1);
    expect(render(false)).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels stale teardown when reopened and cleans up on unmount', () => {
    render(true);
    render(false);
    vi.advanceTimersByTime(100);
    expect(render(true)).toBe(true);
    vi.advanceTimersByTime(260);
    expect(render(true)).toBe(true);
    render(false);
    expect(vi.getTimerCount()).toBe(1);
    cleanup?.();
    expect(vi.getTimerCount()).toBe(0);
  });
});
