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
 * @file useIslandShellPresentation.test.ts
 * @description 壳层展示 Hook 的状态 class、动画组合、形状与主色样式分支测试。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, resetLifecycle } from '../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../test/elementHarness';
import { renderWithHooks } from '../../states/register/hooks/test/authHookHarness';
import { useIslandShellPresentation } from '../useIslandShellPresentation';
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
beforeEach(resetLifecycle);
type Options = Parameters<typeof useIslandShellPresentation>[0];
const base: Options = { state: 'idle', morphing: false, fromState: '', showGlow: null, springAnimation: false, animationSpeed: 'medium', shapeMode: 'notch', dominantColor: [1, 2, 3] };
describe('useIslandShellPresentation 实际展示值', () => {
  it('idle 无状态类且无 glow 样式', () => {
    const result = renderWithHooks(() => useIslandShellPresentation(base));
    expect(result.shellClassName).toBe('island-shell shape-notch  speed-medium'); expect(result.shellStyle).toBeUndefined();
  });
  it('组合真实状态、变形来源、暂停、弹簧与形状参数', () => {
    const input: Options = { ...base, state: 'hover', morphing: true, fromState: 'lyrics', showGlow: 'paused', springAnimation: true, animationSpeed: 'fast', shapeMode: 'pill' };
    const result = renderWithHooks(() => useIslandShellPresentation(input));
    expect(result.shellClassName).toBe('island-shell shape-pill hover morphing from-lyrics music-glow music-paused spring-animation speed-fast');
    expect(result.shellStyle).toEqual({ '--glow-r': 1, '--glow-g': 2, '--glow-b': 3 });
  });
  it('播放 glow 与暂停区分，主色更新只改变样式，关闭 glow 清除样式', () => {
    const input: Options = { ...base, showGlow: 'playing' };
    const first = renderWithHooks(() => useIslandShellPresentation(input));
    expect(first.shellClassName).toContain('music-glow'); expect(first.shellClassName).not.toContain('music-paused');
    const next = renderWithHooks(() => useIslandShellPresentation({ ...input, dominantColor: [7, 8, 9] }));
    expect(next.shellClassName).toBe(first.shellClassName); expect(next.shellStyle).toEqual({ '--glow-r': 7, '--glow-g': 8, '--glow-b': 9 });
    expect(renderWithHooks(() => useIslandShellPresentation(base)).shellStyle).toBeUndefined();
  });
});
