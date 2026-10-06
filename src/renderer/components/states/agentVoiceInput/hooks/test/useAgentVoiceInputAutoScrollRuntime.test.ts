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
 * @file useAgentVoiceInputAutoScrollRuntime.test.ts
 * @description 真实语音文本滚动 Hook 的缺失节点与转写变化测试。
 * @author 鸡哥
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushHookEffects, renderHook, resetHook, unmountHook } from '../../../../hooks/test/startupHookHarness';
import { useAgentVoiceInputAutoScroll } from '../useAgentVoiceInputAutoScroll';
vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const {
    createHookReactMock
  } = await import('../../../../hooks/test/startupHookHarness');
  return createHookReactMock(actual);
});
afterEach(() => {
  unmountHook();
  resetHook();
});
describe('useAgentVoiceInputAutoScroll real native node', () => {
  it('missing node remains safe and changed transcript scrolls native node to its latest width', () => {
    const textRef: {
      current: HTMLDivElement | null;
    } = {
      current: null
    };
    renderHook(useAgentVoiceInputAutoScroll, {
      textRef,
      transcript: ''
    });
    flushHookEffects();
    const node = {
      scrollLeft: 0,
      scrollWidth: 123
    };
    textRef.current = node as unknown as HTMLDivElement;
    renderHook(useAgentVoiceInputAutoScroll, {
      textRef,
      transcript: 'first'
    });
    flushHookEffects();
    expect(node.scrollLeft).toBe(123);
    node.scrollWidth = 456;
    renderHook(useAgentVoiceInputAutoScroll, {
      textRef,
      transcript: 'second'
    });
    flushHookEffects();
    expect(node.scrollLeft).toBe(456);
  });
});
