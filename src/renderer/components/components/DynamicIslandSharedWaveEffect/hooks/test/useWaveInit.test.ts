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
 * @file useWaveInit.test.ts
 * @description 真实音浪初始化 Hook 暂停、空画布、重复激活及 GPU 资源卸载测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWaveInit } from '../useWaveInit';
import createWaveGlFixture from '../../utils/test/waveGlFixture';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from './waveLifecycleHarness';

vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../test/elementHarness')).hookMocks,
  ...(await import('./waveLifecycleHarness')).lifecycleHooks,
}));

beforeEach(() => { resetLifecycle(); });
afterEach(() => { unmountHooks(); vi.restoreAllMocks(); });

describe('wave initialization lifecycle', () => {
  it('does not initialize an inactive canvas and safely cleans up the empty lifecycle', () => {
    const { canvas, getContext } = createWaveGlFixture();
    const glRef = renderWithHooks(() => useWaveInit({ current: canvas }, false));
    runEffects();
    expect(glRef.current).toBeNull();
    expect(getContext).not.toHaveBeenCalled();
    unmountHooks();
    expect(glRef.current).toBeNull();
  });
  it('returns without resources when the public canvas ref has no element', () => {
    const glRef = renderWithHooks(() => useWaveInit({ current: null }, true));
    runEffects();
    expect(glRef.current).toBeNull();
  });
  it('initializes on activation, preserves resources during pause/resume and releases them on unmount', () => {
    const { canvas, gl, getContext, buffer, program } = createWaveGlFixture();
    const canvasRef = { current: canvas };
    const initialRef = renderWithHooks(() => useWaveInit(canvasRef, false));
    runEffects();
    const ref = renderWithHooks(() => useWaveInit(canvasRef, true));
    runEffects();
    expect(ref).toBe(initialRef);
    expect(ref.current?.buffer).toBe(buffer);
    renderWithHooks(() => useWaveInit(canvasRef, false));
    runEffects();
    renderWithHooks(() => useWaveInit(canvasRef, true));
    runEffects();
    expect(getContext).toHaveBeenCalledOnce();
    expect(gl.deleteBuffer).not.toHaveBeenCalled();
    unmountHooks();
    expect(gl.useProgram).toHaveBeenCalledExactlyOnceWith(null);
    expect(gl.bindBuffer).toHaveBeenLastCalledWith(gl.ARRAY_BUFFER, null);
    expect(gl.deleteBuffer).toHaveBeenCalledExactlyOnceWith(buffer);
    expect(gl.deleteProgram).toHaveBeenCalledExactlyOnceWith(program);
    expect(ref.current).toBeNull();
  });
  it('retries initialization after a failed context when playing changes back to true', () => {
    const { canvas, getContext, context } = createWaveGlFixture();
    const canvasRef = { current: canvas };
    getContext.mockReturnValueOnce(null);
    const ref = renderWithHooks(() => useWaveInit(canvasRef, true));
    runEffects();
    expect(ref.current).toBeNull();
    renderWithHooks(() => useWaveInit(canvasRef, false));
    runEffects();
    renderWithHooks(() => useWaveInit(canvasRef, true));
    runEffects();
    expect(ref.current?.gl).toBe(context);
    expect(getContext).toHaveBeenCalledTimes(2);
  });
});
