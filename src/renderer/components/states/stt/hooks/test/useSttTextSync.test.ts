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
 * @file useSttTextSync.test.ts
 * @description 真实识别文本 Hook 的可编辑节点绑定、占位符及编辑期间同步保护测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../../components/test/contentLifecycleHarness';
import { useSttTextSync } from '../useSttTextSync';
vi.mock('react', async (load) => ({
  ...(await load<typeof import('react')>()),
  ...(await import('../../../../test/elementHarness')).hookMocks,
  ...(await import('../../../../components/test/contentLifecycleHarness')).lifecycleHooks,
}));
beforeEach(resetLifecycle);
afterEach(unmountHooks);
describe('真实识别文本同步', () => {
  it('缺少节点时不写入，绑定后同步内容和空文本占位', () => {
    const ref: { current: HTMLDivElement | null } = { current: null };
    renderWithHooks(() => useSttTextSync(ref, 'recognized', false));
    runEffects();
    const element = { textContent: 'before' };
    ref.current = element as HTMLDivElement;
    renderWithHooks(() => useSttTextSync(ref, 'next', false));
    runEffects();
    expect(element.textContent).toBe('next');
    renderWithHooks(() => useSttTextSync(ref, '', false));
    runEffects();
    expect(element.textContent).toBe('...');
  });
  it('编辑期间保留输入，退出编辑时恢复最新识别文本', () => {
    const element = { textContent: 'typing' };
    const ref = { current: element as HTMLDivElement };
    renderWithHooks(() => useSttTextSync(ref, 'recognized', true));
    runEffects();
    expect(element.textContent).toBe('typing');
    renderWithHooks(() => useSttTextSync(ref, 'recognized', false));
    runEffects();
    expect(element.textContent).toBe('recognized');
  });
});
