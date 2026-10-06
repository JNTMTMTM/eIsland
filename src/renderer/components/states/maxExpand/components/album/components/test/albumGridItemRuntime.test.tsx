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
 * @file albumGridItemRuntime.test.tsx
 * @description 真实相册缩略图的可见区域监听、视频节点清理、失败/加载状态和用户事件测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushHookEffects, renderHook, resetHook, unmountHook } from '../../hooks/test/albumHookHarness';
import { byClass, find, invoke, text, elements } from '../../../../../test/tree';
import type { AlbumGridItemProps } from '../../types/albumTypes';
import type { RefObject } from 'react';
const {
  AlbumGridItem
} = await import('../AlbumGridItem');
let props: AlbumGridItemProps;
let observerCallback: ((entries: Array<{
  isIntersecting: boolean;
}>) => void) | undefined;
const observe = vi.fn();
const disconnect = vi.fn();
/** 浏览器可见区域叶观察器，不观察用户界面。 */
class TestObserver {
  /** 保存浏览器观察器回调。
   * @param callback - 可见区域通知
   * @param options - 浏览器配置
   */
  constructor(callback: (entries: Array<{
    isIntersecting: boolean;
  }>) => void, options: unknown) {
    observerCallback = callback;
    expect(options).toEqual({
      rootMargin: '120px'
    });
  }

  observe = observe;

  disconnect = disconnect;
}
/** 执行真实缩略图组件。
 * @returns 缩略图树
 */
function view() {
  return renderHook(AlbumGridItem, props);
}
beforeEach(() => {
  resetHook();
  observerCallback = undefined;
  observe.mockReset();
  disconnect.mockReset();
  props = {
    item: {
      id: 1,
      name: 'a.mp4',
      path: 'C:/a.mp4',
      ext: 'mp4',
      mediaType: 'video',
      addedAt: 1
    },
    meta: undefined,
    selected: false,
    selectMode: false,
    onToggleSelection: vi.fn(),
    onOpen: vi.fn(),
    onRemove: vi.fn(),
    onMouseEnter: vi.fn(),
    onMouseLeave: vi.fn(),
    gridVideoRefs: {
      current: {}
    }
  };
  vi.stubGlobal('IntersectionObserver', TestObserver);
});
afterEach(() => {
  unmountHook();
  vi.unstubAllGlobals();
});
describe('album grid preview lifecycle', () => {
  it('guards missing container and image media before registering observers', () => {
    view();
    flushHookEffects();
    expect(observe).not.toHaveBeenCalled();
    props.item = {
      ...props.item,
      mediaType: 'image'
    };
    const tree = view();
    const ref = byClass(tree, 'album-grid-item').props.ref as RefObject<HTMLDivElement | null>;
    ref.current = {} as HTMLDivElement;
    flushHookEffects();
    expect(observe).not.toHaveBeenCalled();
  });
  it('loads visible video only and disconnects/recycles its mounted media refs', () => {
    props.meta = {
      videoUrl: 'media://video',
      durationSec: 12
    };
    let tree = view();
    const ref = byClass(tree, 'album-grid-item').props.ref as RefObject<HTMLDivElement | null>;
    const container = {} as HTMLDivElement;
    ref.current = container;
    flushHookEffects();
    expect(observe).toHaveBeenCalledWith(container);
    observerCallback?.([{
      isIntersecting: true
    }]);
    tree = view();
    const node = find(tree, (element) => element.type === 'video');
    const first = {
      pause: vi.fn(),
      removeAttribute: vi.fn(),
      load: vi.fn()
    };
    invoke(node, 'ref', first);
    invoke(node, 'ref', first);
    expect(first.pause).not.toHaveBeenCalled();
    const second = {
      pause: vi.fn(),
      removeAttribute: vi.fn(),
      load: vi.fn()
    };
    invoke(node, 'ref', second);
    expect(first.pause).toHaveBeenCalledOnce();
    expect(first.removeAttribute).toHaveBeenCalledWith('src');
    expect(first.load).toHaveBeenCalledOnce();
    invoke(node, 'ref', null);
    expect(second.pause).toHaveBeenCalledOnce();
    expect(props.gridVideoRefs.current[1]).toBeUndefined();
    observerCallback?.([{
      isIntersecting: false
    }]);
    expect(elements(view()).some((element) => element.type === 'video')).toBe(false);
    unmountHook();
    expect(disconnect).toHaveBeenCalledOnce();
  });
  it.each([false, true])('shows video loadFailed=%s and forwards selection, hover, remove and open actions', (loadFailed) => {
    props.meta = {
      loadFailed
    };
    props.selected = true;
    let tree = view();
    expect(text(tree)).toContain(loadFailed ? 'albumTab.thumb.failed' : 'albumTab.thumb.loading');
    invoke(byClass(tree, 'album-selection-input'), 'onChange');
    invoke(byClass(tree, 'album-thumb'), 'onMouseEnter');
    invoke(byClass(tree, 'album-thumb'), 'onMouseLeave');
    invoke(byClass(tree, 'album-thumb'), 'onClick');
    invoke(byClass(tree, 'album-grid-remove'), 'onClick');
    expect(props.onToggleSelection).toHaveBeenCalledWith(1);
    expect(props.onOpen).toHaveBeenCalledWith(props.item);
    expect(props.onMouseEnter).toHaveBeenCalledWith(props.item);
    expect(props.onMouseLeave).toHaveBeenCalledWith(props.item);
    expect(props.onRemove).toHaveBeenCalledWith(1);
    props.selectMode = true;
    tree = view();
    invoke(byClass(tree, 'album-thumb'), 'onClick');
    expect(props.onToggleSelection).toHaveBeenCalledTimes(2);
    const icon = find(tree, (node) => typeof node.type === 'function');
    const child = Reflect.apply(icon.type as (props: Record<string, unknown>) => unknown, undefined, [icon.props]);
    expect((child as {
      props: {
        className: string;
      };
    }).props.className).toBe('album-svg-icon-img');
  });
});
