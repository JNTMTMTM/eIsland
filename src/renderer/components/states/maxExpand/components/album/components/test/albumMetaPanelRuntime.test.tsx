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
 * @file albumMetaPanelRuntime.test.tsx
 * @description 真实相册元数据空字段、JPEG/非JPEG EXIF、视频缺省信息和背景事件测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, resetHook, unmountHook } from '../../hooks/test/albumHookHarness';
import { byClass, invoke, text } from '../../../../../test/tree';
import type { AlbumMetaPanelProps } from '../../types/albumTypes';
const {
  AlbumMetaPanel
} = await import('../AlbumMetaPanel');
let props: AlbumMetaPanelProps;
beforeEach(() => {
  resetHook();
  props = {
    activeItem: {
      id: 1,
      name: 'a',
      path: 'C:/a',
      ext: '',
      mediaType: 'image',
      addedAt: 0
    },
    activeMeta: undefined,
    onSetAsIslandBackground: vi.fn()
  };
});
afterEach(unmountHook);
describe('album metadata optional fields', () => {
  it.each(['', 'png', 'jpg', 'jpeg'])('renders format %s and the appropriate empty EXIF notice', (ext) => {
    props.activeItem.ext = ext;
    const tree = renderHook(AlbumMetaPanel, props);
    expect(text(tree).includes('albumTab.meta.exifEmpty')).toBe(ext === 'jpg' || ext === 'jpeg');
    invoke(byClass(tree, 'album-meta-apply-btn'), 'onClick');
    expect(props.onSetAsIslandBackground).toHaveBeenCalledWith(props.activeItem);
  });
  it('renders sparse EXIF without unavailable field rows', () => {
    props.activeMeta = {
      exif: {
        make: 'Camera'
      }
    };
    const tree = renderHook(AlbumMetaPanel, props);
    expect(text(tree)).toContain('Camera');
    expect(text(tree)).not.toContain('albumTab.meta.model');
    expect(text(tree)).not.toContain('albumTab.meta.dateTimeOriginal');
    expect(text(tree)).not.toContain('albumTab.meta.exposure');
    expect(text(tree)).not.toContain('albumTab.meta.fNumber');
    expect(text(tree)).not.toContain('albumTab.meta.iso');
    expect(text(tree)).not.toContain('albumTab.meta.focalLength');
  });
  it('renders date and exposure EXIF without manufacturer fields', () => {
    props.activeMeta = {
      exif: {
        iso: 100,
        dateTimeOriginal: '2026:10:06 10:00:00',
        exposureTime: '1/250s'
      }
    };
    const tree = renderHook(AlbumMetaPanel, props);
    expect(text(tree)).toContain('2026:10:06 10:00:00');
    expect(text(tree)).toContain('1/250s');
    expect(text(tree)).toContain('ISO 100');
    expect(text(tree)).not.toContain('albumTab.meta.make');
  });
  it('renders video codec/fps fallbacks instead of image EXIF', () => {
    props.activeItem.mediaType = 'video';
    const tree = renderHook(AlbumMetaPanel, props);
    expect(text(tree)).toContain('albumTab.meta.codec-');
    expect(text(tree)).toContain('albumTab.meta.fps-');
    expect(text(tree)).not.toContain('albumTab.meta.exifEmpty');
  });
});
