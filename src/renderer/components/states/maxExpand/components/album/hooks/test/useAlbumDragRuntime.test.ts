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
 * @file useAlbumDragRuntime.test.ts
 * @description 真实相册拖拽 Hook 的进入、离开、文件投递和空载荷分支测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, resetHook, unmountHook } from './albumHookHarness';
import type { DragEvent } from 'react';
const {
  useAlbumDrag
} = await import('../useAlbumDrag');
beforeEach(resetHook);
afterEach(unmountHook);
describe('album drag handlers', () => {
  it('tracks drag entry and only exits when the page target itself is left', () => {
    const drop = vi.fn();
    const page = {};
    const child = {};
    const preventDefault = vi.fn();
    const view = () => renderHook(useAlbumDrag, drop);
    view().handleDragOver({
      preventDefault
    } as unknown as DragEvent<HTMLDivElement>);
    expect(view().dragOverPage).toBe(true);
    view().handleDragOver({
      preventDefault
    } as unknown as DragEvent<HTMLDivElement>);
    expect(preventDefault).toHaveBeenCalledTimes(2);
    view().handleDragLeave({
      currentTarget: page,
      target: child
    } as unknown as DragEvent<HTMLDivElement>);
    expect(view().dragOverPage).toBe(true);
    view().handleDragLeave({
      currentTarget: page,
      target: page
    } as unknown as DragEvent<HTMLDivElement>);
    expect(view().dragOverPage).toBe(false);
  });
  it('delivers files and clears drag state, ignoring absent data transfers and files', () => {
    const drop = vi.fn();
    const preventDefault = vi.fn();
    const view = () => renderHook(useAlbumDrag, drop);
    const files = [new File(['a'], 'a.jpg')];
    view().handleDragOver({
      preventDefault
    } as unknown as DragEvent<HTMLDivElement>);
    view().handleDrop({
      preventDefault,
      dataTransfer: {
        files
      }
    } as unknown as DragEvent<HTMLDivElement>);
    expect(drop).toHaveBeenCalledWith(files);
    expect(view().dragOverPage).toBe(false);
    view().handleDrop({
      preventDefault
    } as unknown as DragEvent<HTMLDivElement>);
    view().handleDrop({
      preventDefault,
      dataTransfer: {}
    } as unknown as DragEvent<HTMLDivElement>);
    expect(drop).toHaveBeenCalledOnce();
  });
});
