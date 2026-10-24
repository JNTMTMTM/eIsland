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
 * @file islandVisibility.test.ts
 * @description 灵动岛淡入淡出过渡的透明度、反向切换与外部隐藏中断测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hideIsland, isIslandShown, showIsland } from '../islandVisibility';
import type { BrowserWindow } from 'electron';

const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform')!;

function setPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', { ...originalPlatform, value: platform });
}

/**
 * 创建记录透明度与可见性的窗口替身。
 * @param visible - 初始是否可见。
 * @returns 窗口替身及其可变状态。
 */
function createWindow(visible: boolean) {
  const state = { visible, opacity: 1, destroyed: false };
  const window = {
    isDestroyed: () => state.destroyed,
    isVisible: () => state.visible,
    show: vi.fn(() => { state.visible = true; }),
    hide: vi.fn(() => { state.visible = false; }),
    getOpacity: () => state.opacity,
    setOpacity: vi.fn((value: number) => { state.opacity = value; }),
  };
  return { state, window, target: window as unknown as BrowserWindow };
}

beforeEach(() => {
  vi.useFakeTimers();
  setPlatform('win32');
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  Object.defineProperty(process, 'platform', originalPlatform);
});

describe('islandVisibility', () => {
  it('淡出结束后才隐藏窗口，并把透明度恢复为不透明', () => {
    const { state, window, target } = createWindow(true);
    hideIsland(target);
    expect(isIslandShown(target)).toBe(false);
    expect(window.hide).not.toHaveBeenCalled();

    vi.advanceTimersByTime(96);
    expect(state.visible).toBe(true);
    expect(state.opacity).toBeGreaterThan(0);
    expect(state.opacity).toBeLessThan(1);

    vi.advanceTimersByTime(200);
    expect(window.hide).toHaveBeenCalledOnce();
    expect(state.opacity).toBe(1);
    expect(isIslandShown(target)).toBe(false);
  });

  it('隐藏的窗口以全透明显示后淡入到不透明', () => {
    const { state, window, target } = createWindow(false);
    showIsland(target);
    expect(window.setOpacity.mock.calls[0]).toEqual([0]);
    expect(window.setOpacity.mock.invocationCallOrder[0]).toBeLessThan(window.show.mock.invocationCallOrder[0]);
    expect(isIslandShown(target)).toBe(true);

    vi.advanceTimersByTime(300);
    expect(state.opacity).toBe(1);
    expect(state.visible).toBe(true);
  });

  it('淡出途中再次显示会就地反向，窗口不会被隐藏', () => {
    const { state, window, target } = createWindow(true);
    hideIsland(target);
    vi.advanceTimersByTime(96);
    const midOpacity = state.opacity;

    showIsland(target);
    expect(isIslandShown(target)).toBe(true);
    expect(window.setOpacity).not.toHaveBeenCalledWith(0);
    vi.advanceTimersByTime(16);
    expect(state.opacity).toBeGreaterThan(midOpacity);

    vi.advanceTimersByTime(300);
    expect(window.hide).not.toHaveBeenCalled();
    expect(state.opacity).toBe(1);
  });

  it('已隐藏或正在淡出时不重复开始淡出', () => {
    const hidden = createWindow(false);
    hideIsland(hidden.target);
    vi.advanceTimersByTime(300);
    expect(hidden.window.setOpacity).not.toHaveBeenCalled();

    const fading = createWindow(true);
    hideIsland(fading.target);
    vi.advanceTimersByTime(96);
    hideIsland(fading.target);
    vi.advanceTimersByTime(100);
    expect(fading.window.hide).toHaveBeenCalledOnce();
  });

  it('过渡中被外部直接隐藏时放弃过渡并恢复不透明', () => {
    const { state, window, target } = createWindow(true);
    hideIsland(target);
    vi.advanceTimersByTime(48);
    state.visible = false;

    vi.advanceTimersByTime(16);
    expect(state.opacity).toBe(1);
    expect(isIslandShown(target)).toBe(false);
    window.setOpacity.mockClear();
    vi.advanceTimersByTime(300);
    expect(window.setOpacity).not.toHaveBeenCalled();
    expect(window.hide).not.toHaveBeenCalled();
  });

  it('窗口销毁后停止过渡', () => {
    const { state, window, target } = createWindow(true);
    hideIsland(target);
    state.destroyed = true;
    window.setOpacity.mockClear();
    vi.advanceTimersByTime(300);
    expect(window.setOpacity).not.toHaveBeenCalled();
    expect(window.hide).not.toHaveBeenCalled();
  });

  it('Linux 不支持窗口透明度，直接显示与隐藏', () => {
    setPlatform('linux');
    const { window, target } = createWindow(true);
    hideIsland(target);
    expect(window.hide).toHaveBeenCalledOnce();

    showIsland(target);
    expect(window.show).toHaveBeenCalledOnce();
    expect(window.setOpacity).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
