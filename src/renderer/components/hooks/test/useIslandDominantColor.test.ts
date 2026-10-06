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
 * @file useIslandDominantColor.test.ts
 * @description 封面主色 Hook 的 Image 与外部提取器叶边界、空颜色、错误和迟到结果清理测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, resetLifecycle } from '../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../test/elementHarness';
import { renderWithHooks, runEffects, unmountHooks } from '../../states/register/hooks/test/authHookHarness';
import { useIslandDominantColor } from '../useIslandDominantColor';
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
interface ColorResult { rgb: () => { r: number; g: number; b: number } }
interface ImageLeaf { crossOrigin: string; src: string; onload: (() => Promise<void>) | null }
const extract = vi.hoisted(() => ({ getColor: vi.fn<(image: unknown, options: unknown) => Promise<ColorResult | null>>() }));
vi.mock('colorthief', () => extract);
const images: ImageLeaf[] = [];
const setDominantColor = vi.fn<(color: [number, number, number]) => void>();
const imageConstructor = vi.fn(
  // eslint-disable-next-line prefer-arrow-callback -- Image 叶边界由真实 Hook 通过 new 构造。
  function createImage() {
    const image: ImageLeaf = { crossOrigin: '', src: '', onload: null }; images.push(image); return image;
  },
);
beforeEach(() => {
  resetLifecycle(); vi.clearAllMocks(); images.length = 0; vi.stubGlobal('Image', imageConstructor);
  extract.getColor.mockResolvedValue({ rgb: () => ({ r: 20, g: 30, b: 40 }) });
});
afterEach(() => { unmountHooks(); vi.unstubAllGlobals(); });
describe('useIslandDominantColor 实际图像生命周期', () => {
  it.each([null, ''])('没有封面时直接回到黑色且不加载图片：%s', (coverImage) => {
    renderWithHooks(() => useIslandDominantColor({ coverImage, setDominantColor })); runEffects();
    expect(setDominantColor).toHaveBeenCalledWith([0, 0, 0]); expect(imageConstructor).not.toHaveBeenCalled();
  });
  it('创建匿名跨域图片并提取 RGB 元组', async () => {
    renderWithHooks(() => useIslandDominantColor({ setDominantColor, coverImage: 'https://example.com/cover.png' })); runEffects();
    expect(images[0].crossOrigin).toBe('Anonymous'); expect(images[0].src).toBe('https://example.com/cover.png');
    await images[0].onload?.();
    expect(extract.getColor).toHaveBeenCalledWith(images[0], { colorSpace: 'rgb' });
    expect(setDominantColor).toHaveBeenCalledWith([20, 30, 40]);
    unmountHooks(); expect(images[0].onload).toBeNull(); expect(images[0].src).toBe('');
  });
  it('外部提取器无可用颜色时不覆盖当前主色', async () => {
    extract.getColor.mockResolvedValue(null);
    renderWithHooks(() => useIslandDominantColor({ setDominantColor, coverImage: 'cover.png' })); runEffects();
    await images[0].onload?.(); expect(setDominantColor).not.toHaveBeenCalled();
  });
  it('提取器拒绝记录错误且不更新主色', async () => {
    const error = new Error('decode-failed'); extract.getColor.mockRejectedValue(error);
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderWithHooks(() => useIslandDominantColor({ setDominantColor, coverImage: 'cover.png' })); runEffects();
    await images[0].onload?.(); expect(log).toHaveBeenCalledWith('ColorThief error:', error); expect(setDominantColor).not.toHaveBeenCalled();
  });
  it('提取尚未完成时切换封面，旧结果忽略而新结果生效', async () => {
    let resolve!: (color: ColorResult) => void;
    extract.getColor.mockImplementationOnce(() => new Promise((accept) => { resolve = accept; }));
    renderWithHooks(() => useIslandDominantColor({ setDominantColor, coverImage: 'first.png' })); runEffects();
    const previous = images[0].onload?.();
    renderWithHooks(() => useIslandDominantColor({ setDominantColor, coverImage: 'second.png' })); runEffects();
    expect(images[0].onload).toBeNull(); expect(images[0].src).toBe('');
    resolve({ rgb: () => ({ r: 1, g: 2, b: 3 }) }); await previous;
    expect(setDominantColor).not.toHaveBeenCalled(); await images[1].onload?.(); expect(setDominantColor).toHaveBeenCalledWith([20, 30, 40]);
  });
});
