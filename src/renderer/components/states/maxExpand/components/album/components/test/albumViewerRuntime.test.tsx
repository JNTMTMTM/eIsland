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
 * @file albumViewerRuntime.test.tsx
 * @description 真实相册查看器组件结合真实 Hook 验证导航、缩放平移、媒体控件、内部图标和工具栏转发。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../hooks/test/albumHookHarness';
import { byClass, find, invoke, text, elements } from '../../../../../test/tree';
import type { AlbumItem, AlbumMeta, UseAlbumViewerReturn } from '../../types/albumTypes';
import type { ReactElement } from 'react';
const {
  AlbumViewer
} = await import('../AlbumViewer');
const {
  useAlbumViewer
} = await import('../../hooks/useAlbumViewer');
let items: AlbumItem[];
let meta: Record<number, AlbumMeta>;
let viewer: UseAlbumViewerReturn;
const resource = vi.fn();
const actions = {
  back: vi.fn(),
  original: vi.fn(),
  open: vi.fn(),
  save: vi.fn(),
  background: vi.fn()
};
/** 渲染真实组件及其真实 Hook 状态。
 * @returns 查看器元素树
 */
function view() {
  return renderHook(() => {
    viewer = useAlbumViewer(items, items, meta, resource, resource);
    return AlbumViewer({
      viewer,
      filteredCount: items.length,
      onBack: actions.back,
      onOriginalZoom: actions.original,
      onOpenInExplorer: actions.open,
      onSaveAs: actions.save,
      onSetAsIslandBackground: actions.background
    });
  });
}
/** 提交组件实际状态同步。
 * @returns 当前查看器元素树
 */
function commit() {
  view();
  flushHookEffects();
  return view();
}
/** 触发实际工具栏按钮。
 * @param title - 标题翻译键
 */
function click(title: string): void {
  invoke(find(view(), (node) => node.type === 'button' && node.props.title === `albumTab.viewer.${  title}`), 'onClick');
}
/** 执行真实私有图标组件并断言其图片输出。
 * @param tree - 查看器树
 */
function icons(tree: ReactElement): void {
  elements(tree).filter((node) => typeof node.type === 'function' && node.type.name === 'AlbumControlIcon').forEach((node) => {
    const element = Reflect.apply(node.type as (props: Record<string, unknown>) => ReactElement, undefined, [node.props]);
    expect(element.props).toMatchObject({
      className: 'album-svg-icon-img',
      alt: '',
      'aria-hidden': 'true',
      draggable: false
    });
  });
}
beforeEach(() => {
  resetHook();
  items = [{
    id: 1,
    name: 'a.jpg',
    path: 'C:/a.jpg',
    ext: 'jpg',
    mediaType: 'image',
    addedAt: 1
  }, {
    id: 2,
    name: 'b.mp4',
    path: 'C:/b.mp4',
    ext: 'mp4',
    mediaType: 'video',
    addedAt: 2
  }];
  meta = {};
  resource.mockReset();
  Object.values(actions).forEach((mock) => mock.mockReset());
  vi.stubGlobal('window', {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  });
});
afterEach(() => {
  unmountHook();
  vi.unstubAllGlobals();
});
describe('album viewer actual component actions', () => {
  it('renders empty/loading/error/image states and performs toolbar zoom/pan/navigation actions', () => {
    expect(text(commit())).toBe('');
    viewer.handleOpenItem(items[0]);
    commit();
    expect(text(view())).toContain('albumTab.viewer.loading');
    meta = {
      1: {
        loadFailed: true
      }
    };
    expect(text(view())).toContain('albumTab.viewer.failed');
    meta = {
      1: {
        dataUrl: 'data:image/jpeg;base64,YWJj'
      }
    };
    view();
    click('zoomIn');
    view();
    expect(viewer.zoom).toBe(1.15);
    invoke(byClass(view(), 'album-viewer-canvas'), 'onMouseDown', {
      clientX: 10,
      clientY: 20
    });
    view();
    expect(byClass(view(), 'album-viewer-canvas').props.className).toContain('--panning');
    invoke(byClass(view(), 'album-viewer-canvas'), 'onMouseMove', {
      clientX: 12,
      clientY: 23
    });
    view();
    expect(byClass(view(), 'album-viewer-image').props.style).toEqual({
      transform: 'translate(2px, 3px) scale(1.15)'
    });
    invoke(byClass(view(), 'album-viewer-canvas'), 'onMouseUp');
    click('zoomOut');
    view();
    expect(viewer.zoom).toBe(1);
    click('zoomOne');
    expect(actions.original).toHaveBeenCalledOnce();
    click('zoomFit');
    click('openInExplorer');
    click('saveAs');
    expect(actions.open).toHaveBeenCalledWith(items[0]);
    expect(actions.save).toHaveBeenCalledWith(items[0]);
    icons(view());
    click('prev');
    commit();
    expect(viewer.activeId).toBe(2);
    click('next');
    commit();
    expect(viewer.activeId).toBe(1);
    click('back');
    expect(actions.back).toHaveBeenCalledOnce();
  });
  it('renders toggled video play/mute/seek state and positive duration from actual native metadata', async () => {
    meta = {
      2: {
        videoUrl: 'media://video'
      }
    };
    commit();
    viewer.handleOpenItem(items[1]);
    commit();
    const el = {
      duration: 20,
      currentTime: 4,
      paused: false,
      muted: true,
      volume: 0.6,
      play: vi.fn<() => Promise<void>>().mockResolvedValue(),
      pause: vi.fn()
    };
    viewer.viewerVideoRef.current = el as unknown as HTMLVideoElement;
    invoke(byClass(view(), 'album-viewer-video'), 'onLoadedMetadata');
    await settleHook();
    view();
    expect(byClass(view(), 'album-video-seek').props).toMatchObject({
      max: 20,
      value: 4,
      disabled: false
    });
    click('pause');
    view();
    expect(el.pause).toHaveBeenCalledOnce();
    expect(find(view(), (node) => node.props.title === 'albumTab.viewer.play')).toBeDefined();
    click('unmute');
    commit();
    expect(byClass(view(), 'album-video-volume').props.value).toBe(0.6);
    expect(find(view(), (node) => node.props.title === 'albumTab.viewer.mute')).toBeDefined();
    icons(view());
    invoke(byClass(view(), 'album-video-seek'), 'onChange', {
      target: {
        value: '7'
      }
    });
    view();
    expect(viewer.videoCurrentTime).toBe(7);
    invoke(byClass(view(), 'album-video-volume'), 'onChange', {
      target: {
        value: '0.4'
      }
    });
    view();
    expect(viewer.videoVolume).toBe(0.4);
    click('hideControls');
    view();
    expect(elements(view()).some((node) => node.props.className === 'album-video-seek')).toBe(false);
    icons(view());
    click('showControls');
    view();
    expect(byClass(view(), 'album-video-seek')).toBeDefined();
  });
});
