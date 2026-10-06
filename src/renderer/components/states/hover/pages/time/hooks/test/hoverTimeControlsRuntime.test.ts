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
 * @file hoverTimeControlsRuntime.test.ts
 * @description 真实亮度音量防抖、工具截图与隐藏退出按钮的原生边界测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBrightness } from '../useBrightness';
import { useVolume } from '../useVolume';
import { useToolButtons } from '../useToolButtons';
import { useActionButtons } from '../useActionButtons';
import { deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../../../hooks/test/startupHookHarness';
import type { ChangeEvent } from 'react';
vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const {
    createHookReactMock
  } = await import('../../../../../../hooks/test/startupHookHarness');
  return createHookReactMock(actual);
});
const get = vi.fn<() => Promise<number | null>>();
const set = vi.fn<(value: number) => Promise<void>>();
const read = vi.fn<(key: string) => Promise<unknown>>();
const screenshot = vi.fn<() => Promise<string | null>>();
const region = vi.fn<() => Promise<void>>();
const manager = vi.fn<() => void>();
const collapse = vi.fn<() => void>();
const hide = vi.fn<() => void>();
const quit = vi.fn<() => void>();
const click = vi.fn<() => void>();
const anchor = {
  click,
  download: '',
  href: ''
};
/** 调整浏览器滑块事件。
 * @param value - 原生输入
 * @returns 滑块事件
 */
function change(value: string): ChangeEvent<HTMLInputElement> {
  return {
    target: {
      value
    }
  } as ChangeEvent<HTMLInputElement>;
}
/** 使用真实 Hook 派生系统控制状态。
 * @param kind - 控制种类
 * @returns 当前值及公开控制器
 */
function control(kind: 'brightness' | 'volume') {
  if (kind === 'brightness') {
    const s = renderHook(useBrightness);
    return {
      value: s.brightness,
      isAvailable: s.isAvailable,
      change: s.handleBrightnessChange
    };
  }
  const s = renderHook(useVolume);
  return {
    value: s.volume,
    isAvailable: s.isAvailable,
    change: s.handleVolumeChange
  };
}
beforeEach(() => {
  unmountHook();
  resetHook();
  vi.resetAllMocks();
  vi.useFakeTimers();
  get.mockResolvedValue(75);
  set.mockResolvedValue(undefined);
  read.mockResolvedValue('region');
  screenshot.mockResolvedValue('native-pixels');
  region.mockResolvedValue(undefined);
  anchor.download = '';
  anchor.href = '';
  vi.stubGlobal('window', {
    api: {
      screenshot,
      getBrightness: get,
      getVolume: get,
      setBrightness: set,
      setVolume: set,
      storeRead: read,
      startRegionScreenshot: region,
      openTaskManager: manager,
      collapseWindow: collapse,
      hideWindow: hide,
      quitApp: quit
    }
  });
  vi.stubGlobal('document', {
    createElement: () => anchor
  });
});
afterEach(() => {
  unmountHook();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe.each(['brightness', 'volume'] as const)('true %s device controls', (kind) => {
  it('reads native value, converts input and debounces only latest change', async () => {
    expect(control(kind)).toMatchObject({
      value: 50,
      isAvailable: false
    });
    flushHookEffects();
    await settleHook();
    expect(control(kind)).toMatchObject({
      value: 75,
      isAvailable: true
    });
    control(kind).change(change('20'));
    await vi.advanceTimersByTimeAsync(40);
    control(kind).change(change('0'));
    expect(control(kind).value).toBe(0);
    await vi.advanceTimersByTimeAsync(79);
    expect(set).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(set).toHaveBeenCalledExactlyOnceWith(0);
  });
  it.each(['null', 'rejected'] as const)('native %s read leaves control unavailable', async (failure) => {
    if (failure === 'null') get.mockResolvedValue(null);else get.mockRejectedValue(new Error('device'));
    control(kind);
    flushHookEffects();
    await settleHook();
    expect(control(kind)).toMatchObject({
      value: 50,
      isAvailable: false
    });
  });
  it.each(['resolve', 'reject'] as const)('native late %s read cannot update unmounted state', async (result) => {
    const pending = deferred<number | null>();
    get.mockReturnValue(pending.promise);
    control(kind);
    flushHookEffects();
    unmountHook();
    if (result === 'resolve') pending.resolve(90);else pending.reject(new Error('late'));
    await settleHook();
    expect(control(kind)).toMatchObject({
      value: 50,
      isAvailable: false
    });
  });
  it('pending slider write is cleared on unmount', async () => {
    control(kind);
    flushHookEffects();
    await settleHook();
    control(kind).change(change('99'));
    unmountHook();
    await vi.advanceTimersByTimeAsync(80);
    expect(set).not.toHaveBeenCalled();
  });
});
describe('true screenshot and native action buttons', () => {
  it.each(['region', 'display', 'invalid'] as const)('stored screenshot mode %s routes native APIs and real download properties', async (mode) => {
    read.mockResolvedValue(mode);
    renderHook(useToolButtons);
    flushHookEffects();
    await settleHook();
    await renderHook(useToolButtons).handleScreenshot();
    if (mode === 'display') {
      expect(screenshot).toHaveBeenCalledOnce();
      expect(anchor.href).toBe('data:image/png;base64,native-pixels');
      expect(anchor.download).toMatch(/^screenshot_\d+\.png$/);
      expect(click).toHaveBeenCalledOnce();
    } else {
      expect(region).toHaveBeenCalledOnce();
      expect(click).not.toHaveBeenCalled();
    }
    renderHook(useToolButtons).handleTaskManager();
    expect(manager).toHaveBeenCalledOnce();
  });
  it('display screenshot empty payload does not create a download', async () => {
    read.mockResolvedValue('display');
    screenshot.mockResolvedValue(null);
    renderHook(useToolButtons);
    flushHookEffects();
    await settleHook();
    await renderHook(useToolButtons).handleScreenshot();
    expect(click).not.toHaveBeenCalled();
  });
  it.each(['read', 'region', 'display'] as const)('native %s failure is consumed with screenshot fallback/error', async (kind) => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    if (kind === 'read') read.mockRejectedValue(new Error('storage'));
    if (kind === 'region') region.mockRejectedValue(new Error('capture'));
    if (kind === 'display') {
      read.mockResolvedValue('display');
      screenshot.mockRejectedValue(new Error('capture'));
    }
    renderHook(useToolButtons);
    flushHookEffects();
    await settleHook();
    await renderHook(useToolButtons).handleScreenshot();
    if (kind === 'read') {
      expect(region).toHaveBeenCalledOnce();
      expect(error).not.toHaveBeenCalled();
    } else expect(error).toHaveBeenCalledOnce();
    error.mockRestore();
  });
  it.each(['resolve', 'reject'] as const)('late screenshot mode %s after unmount retains region route', async (kind) => {
    const pending = deferred<unknown>();
    read.mockReturnValue(pending.promise);
    renderHook(useToolButtons);
    flushHookEffects();
    unmountHook();
    if (kind === 'resolve') pending.resolve('display');else pending.reject(new Error('late'));
    await settleHook();
    await renderHook(useToolButtons).handleScreenshot();
    expect(region).toHaveBeenCalledOnce();
    expect(screenshot).not.toHaveBeenCalled();
  });
  it('hide invokes collapse before hide, quit invokes native exit without executing real system actions', () => {
    const actions = renderHook(useActionButtons);
    actions.handleHide();
    actions.handleQuit();
    expect(collapse).toHaveBeenCalledOnce();
    expect(hide).toHaveBeenCalledOnce();
    expect(collapse.mock.invocationCallOrder[0]).toBeLessThan(hide.mock.invocationCallOrder[0]);
    expect(quit).toHaveBeenCalledOnce();
  });
});
