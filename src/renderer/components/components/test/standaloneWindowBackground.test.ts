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
 * @file standaloneWindowBackground.test.ts
 * @description StandaloneWindowBackground 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StandaloneWindowBackground } from '../StandaloneWindowBackground';
import { elementProps, findElement, invoke, resetState } from '../../test/elementHarness';
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
describe('StandaloneWindowBackground', () => {
  it('renders empty, image, and video media without mixing their layers', () => {
    const props: ComponentProps<typeof StandaloneWindowBackground> = { bgMedia: null, bgImageOpacity: 50, bgImageBlur: 4, bgVideoHwDecode: true, bgVideoElementRef: { current: null }, bgVideoMuted: false, bgVideoVolume: 1, bgVideoFit: 'contain', onVideoLoadedMetadata: vi.fn(), onVideoCanPlay: vi.fn() };
    expect(elementProps(StandaloneWindowBackground(props)).style).toMatchObject({ backgroundImage: 'none', opacity: 0, filter: 'none' });
    props.bgMedia = { type: 'image', previewUrl: 'image.jpg' };
    expect(elementProps(StandaloneWindowBackground(props)).style).toMatchObject({ backgroundImage: 'url(image.jpg)', opacity: 0.5, filter: 'blur(4px)' });
    props.bgMedia = { type: 'video', previewUrl: 'movie.mp4' };
    props.bgVideoVolume = 0;
    const tree = StandaloneWindowBackground(props);
    const video = findElement(tree, (node) => node.type === 'video');
    expect(elementProps(video)).toMatchObject({ src: 'movie.mp4', muted: true, style: { objectFit: 'contain' } });
    invoke(video, 'onCanPlay', {});
    expect(props.onVideoCanPlay).toHaveBeenCalledOnce();
  });
});
