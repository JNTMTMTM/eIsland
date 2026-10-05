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
 * @file liquidOrbCanvas.test.ts
 * @description LiquidOrbCanvas 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiquidOrbCanvas } from '../LiquidOrbCanvas';
import { elementProps, resetState } from '../../../../test/elementHarness';
const { renderer } = vi.hoisted(() => ({ renderer: vi.fn() }));
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
vi.mock('../../hooks/useWebGPURenderer', () => ({ useWebGPURenderer: renderer }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('LiquidOrbCanvas', () => {
  it('creates an accessible canvas with defaults and forwards lifecycle callbacks', () => {
    const onReady = vi.fn();
    const onError = vi.fn();
    const tree = LiquidOrbCanvas({ onReady, onError });
    expect(tree.type).toBe('canvas');
    expect(elementProps(tree)['aria-label']).toBe('agent.liquidOrb.ariaLabel');
    expect(renderer).toHaveBeenCalledWith(expect.objectContaining({ current: null }), true, expect.any(Float32Array), onReady, onError);
  });
  it('preserves caller-provided uniform identity and stopped animation state', () => {
    const uniformOverrides = new Float32Array([1, 2, 3]);
    LiquidOrbCanvas({ uniformOverrides, playing: false });
    expect(renderer.mock.calls[0][1]).toBe(false);
    expect(renderer.mock.calls[0][2]).toBe(uniformOverrides);
  });
});
