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
 * @file dynamicIslandBackground.test.ts
 * @description DynamicIslandBackground 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DynamicIslandBackground } from '../DynamicIslandBackground';
import { elementProps, elements, findElement, invoke, resetState } from '../../test/elementHarness';
import type { ComponentProps } from 'react';
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('DynamicIslandBackground', () => {
  it.each([null, { type: 'image', previewUrl: 'image.jpg' }] as const)('omits video playback for non-video media', (bgMedia) => {
    const tree = DynamicIslandBackground({ bgMedia, bgVideoElementRef: { current: null }, bgVideoHwDecode: true, bgVideoMuted: false, bgVideoVolume: 1, bgVideoFit: 'cover', onVideoLoadedMetadata: vi.fn(), onVideoCanPlay: vi.fn() });
    expect(elements(tree).filter((node) => node.type === 'video')).toHaveLength(0);
    expect(elementProps(tree).id).toBe('island-bg-layer');
  });
  it('mutes zero volume and forwards video readiness callbacks', () => {
    const props: ComponentProps<typeof DynamicIslandBackground> = { bgMedia: { type: 'video', previewUrl: 'video.mp4' }, bgVideoElementRef: { current: null }, bgVideoHwDecode: false, bgVideoMuted: false, bgVideoVolume: 0, bgVideoFit: 'contain', onVideoLoadedMetadata: vi.fn(), onVideoCanPlay: vi.fn() };
    const video = findElement(DynamicIslandBackground(props), (node) => node.type === 'video');
    expect(elementProps(video)).toMatchObject({ muted: true, style: { objectFit: 'contain', imageRendering: 'auto' } });
    invoke(video, 'onLoadedMetadata', {});
    expect(props.onVideoLoadedMetadata).toHaveBeenCalledOnce();
  });
});
