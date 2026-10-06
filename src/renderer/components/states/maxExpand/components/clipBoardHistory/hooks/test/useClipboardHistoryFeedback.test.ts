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
 * @file useClipboardHistoryFeedback.test.ts
 * @description 复制反馈替换、延时清除与卸载定时器生命周期测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useClipboardHistoryFeedback } from '../useClipboardHistoryFeedback';
import { FEEDBACK_DURATION_MS } from '../../config/clipboardHistoryConfig';
import { flushHookEffects, renderHook, resetHook, unmountHook } from '../../../../../../hooks/test/startupHookHarness';

vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const { createHookReactMock } = await import('../../../../../../hooks/test/startupHookHarness');
  return createHookReactMock(actual);
});

beforeEach(() => {
  resetHook();
  vi.useFakeTimers();
  vi.stubGlobal('window', { setTimeout, clearTimeout });
});

afterEach(() => {
  unmountHook();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('重复反馈替换旧反馈且重新计时，只有最新反馈到期才清除', () => {
  const hook = renderHook(useClipboardHistoryFeedback);
  flushHookEffects();
  expect(hook.copyFeedback).toBeNull();
  hook.showCopyFeedback('success', 'copied');
  expect(renderHook(useClipboardHistoryFeedback).copyFeedback).toEqual({ type: 'success', text: 'copied' });
  vi.advanceTimersByTime(500);
  hook.showCopyFeedback('error', 'retry');
  expect(vi.getTimerCount()).toBe(1);
  vi.advanceTimersByTime(FEEDBACK_DURATION_MS - 500);
  expect(renderHook(useClipboardHistoryFeedback).copyFeedback).toEqual({ type: 'error', text: 'retry' });
  vi.advanceTimersByTime(500);
  expect(renderHook(useClipboardHistoryFeedback).copyFeedback).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
});

it.each([false, true])('卸载反馈组件时取消已建立的定时器：%s', (withFeedback) => {
  const hook = renderHook(useClipboardHistoryFeedback);
  flushHookEffects();
  if (withFeedback) hook.showCopyFeedback('success', 'copied');
  unmountHook();
  expect(vi.getTimerCount()).toBe(0);
});
