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
 * @file albumGridItem.test.ts
 * @description 相册网格只为可见视频保留解码器的回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AlbumGridItem } from './AlbumGridItem';
import type { AlbumGridItemProps } from '../types/albumTypes';

const { effectMock, stateMock, callbackMock } = vi.hoisted(() => ({ effectMock: vi.fn(), stateMock: vi.fn(), callbackMock: vi.fn() }));
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  useEffect: effectMock, useState: stateMock, useCallback: callbackMock,
  useRef: () => ({ current: {} }),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../../../../utils/SvgIcon', () => ({ SvgIcon: { CANCEL: '', DELETE: '' } }));

let visible: boolean;
let intersect: (entries: Array<{ isIntersecting: boolean }>) => void;
const observe = vi.fn();
const disconnect = vi.fn();
const props: AlbumGridItemProps = {
  item: { id: 1, path: 'C:/video.mp4', name: 'video.mp4', ext: 'mp4', mediaType: 'video', addedAt: 1 },
  meta: { videoUrl: 'eisland-media://album/video', durationSec: 60 },
  selected: false, selectMode: false, gridVideoRefs: { current: {} },
  onToggleSelection: vi.fn(), onOpen: vi.fn(), onRemove: vi.fn(), onMouseEnter: vi.fn(), onMouseLeave: vi.fn(),
};

beforeEach(() => {
  visible = false;
  props.gridVideoRefs.current = {};
  stateMock.mockImplementation(() => [visible, (value: boolean) => { visible = value; }]);
  callbackMock.mockImplementation((callback: unknown) => callback);
  vi.stubGlobal('IntersectionObserver', class {
    observe = observe;

    disconnect = disconnect;

    constructor(callback: typeof intersect) { intersect = callback; }
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('album video visibility', () => {
  it('mounts the video only near the viewport and disconnects observation', () => {
    expect(renderToStaticMarkup(AlbumGridItem(props))).not.toContain('<video');
    const effect = effectMock.mock.calls[0][0] as () => (() => void);
    const cleanup = effect();
    expect(observe).toHaveBeenCalledOnce();
    intersect([{ isIntersecting: true }]);
    expect(renderToStaticMarkup(AlbumGridItem(props))).toContain('<video');
    intersect([{ isIntersecting: false }]);
    expect(renderToStaticMarkup(AlbumGridItem(props))).not.toContain('<video');
    cleanup();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it('stops playback and releases the media source when a grid video unmounts', () => {
    AlbumGridItem(props);
    const setVideoRef = callbackMock.mock.calls[0][0] as (element: HTMLVideoElement | null) => void;
    const video = { pause: vi.fn(), removeAttribute: vi.fn(), load: vi.fn() };
    setVideoRef(video as unknown as HTMLVideoElement);
    setVideoRef(null);
    expect(video.pause).toHaveBeenCalledOnce();
    expect(video.removeAttribute).toHaveBeenCalledWith('src');
    expect(video.load).toHaveBeenCalledOnce();
    expect(props.gridVideoRefs.current[1]).toBeUndefined();
  });
});
