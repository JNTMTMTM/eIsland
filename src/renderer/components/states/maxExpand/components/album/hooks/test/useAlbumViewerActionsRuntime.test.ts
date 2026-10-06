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
 * @file useAlbumViewerActionsRuntime.test.ts
 * @description 真实相册查看器系统动作的成功、取消、失败、背景同步与持久化测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, resetHook, settleHook, unmountHook } from './albumHookHarness';
import type { AlbumItem, AlbumMeta } from '../../types/albumTypes';
const {
  useAlbumViewerActions
} = await import('../useAlbumViewerActions');
const io = {
  open: vi.fn<(path: string) => Promise<boolean>>(),
  save: vi.fn<(path: string) => Promise<{
    ok: boolean;
    filePath?: string;
    canceled?: boolean;
  }>>(),
  load: vi.fn<(path: string) => Promise<string | null>>(),
  write: vi.fn<(key: string, value: unknown) => Promise<boolean>>(),
  preview: vi.fn<(key: string, value: unknown) => Promise<void>>(),
  dispatch: vi.fn<(event: CustomEvent) => boolean>(),
  status: vi.fn(),
  reset: vi.fn()
};
let meta: AlbumMeta | undefined;
const image: AlbumItem = {
  id: 1,
  path: 'C:/album/image.jpg',
  name: 'image.jpg',
  ext: 'jpg',
  mediaType: 'image',
  addedAt: 1
};
/** 执行真实工具栏动作 Hook。
 * @returns 工具栏回调
 */
function view() {
  return renderHook(useAlbumViewerActions, meta, io.status, io.reset);
}
beforeEach(() => {
  resetHook();
  Object.values(io).forEach((mock) => mock.mockReset());
  io.open.mockResolvedValue(true);
  io.save.mockResolvedValue({
    ok: true,
    filePath: 'C:/saved.jpg'
  });
  io.load.mockResolvedValue('data:image/jpeg;base64,YWJj');
  io.write.mockResolvedValue(true);
  io.preview.mockResolvedValue();
  io.dispatch.mockReturnValue(true);
  meta = undefined;
  vi.stubGlobal('window', {
    api: {
      openInExplorer: io.open,
      saveImageAs: io.save,
      loadWallpaperFile: io.load,
      storeWrite: io.write,
      settingsPreview: io.preview
    },
    dispatchEvent: io.dispatch
  });
});
afterEach(() => {
  unmountHook();
  vi.unstubAllGlobals();
});
describe('album viewer external actions', () => {
  it.each(['success', 'false', 'reject'])('handles explorer %s', async (mode) => {
    if (mode === 'false') io.open.mockResolvedValue(false);
    if (mode === 'reject') io.open.mockRejectedValue(new Error('shell'));
    view().handleOpenInExplorer(image);
    await settleHook();
    expect(io.open).toHaveBeenCalledWith(image.path);
    expect(io.status.mock.calls).toEqual(mode === 'success' ? [] : [['albumTab.status.openInExplorerFailed']]);
  });
  it.each([{
    ok: true,
    filePath: 'C:/save.jpg',
    key: 'saveAsSuccess'
  }, {
    ok: true,
    key: 'saveAsFailed'
  }, {
    ok: false,
    canceled: true,
    key: 'saveAsCanceled'
  }, {
    ok: false,
    key: 'saveAsFailed'
  }])('reports save-as $key', async ({
    key,
    ...result
  }) => {
    io.save.mockResolvedValue(result);
    view().handleSaveAs(image);
    await settleHook();
    expect(io.save).toHaveBeenCalledWith(image.path);
    expect(io.status).toHaveBeenCalledWith(`albumTab.status.${  key}`);
  });
  it('catches save-as rejection and resets original zoom', async () => {
    io.save.mockRejectedValue(new Error('write'));
    view().handleSaveAs(image);
    await settleHook();
    expect(io.status).toHaveBeenCalledWith('albumTab.status.saveAsFailed');
    view().handleOriginalZoom();
    expect(io.reset).toHaveBeenCalledOnce();
    expect(io.status).toHaveBeenLastCalledWith('albumTab.status.zoomReset');
  });
  it.each(['cached', 'load', 'video'] as const)('synchronizes background using %s preview and correct legacy key', async (mode) => {
    const item = mode === 'video' ? {
      ...image,
      path: 'C:/album/video.mp4',
      mediaType: 'video' as const
    } : image;
    if (mode === 'cached') {meta = {
      dataUrl: 'data:image/png;base64,YQ=='
    };}
    view().handleSetAsIslandBackground(item);
    await settleHook();
    const media = {
      type: item.mediaType,
      source: item.path
    };
    const previews = { cached: meta?.dataUrl, video: 'eisland-media://local/C%3A%2Falbum%2Fvideo.mp4', load: 'data:image/jpeg;base64,YWJj' };
    const previewUrl = previews[mode];
    const [[event]] = io.dispatch.mock.calls;
    expect(event.type).toBe('island-bg-local-sync');
    expect(event.detail).toEqual({
      media,
      previewUrl,
      image: previewUrl
    });
    expect(io.write).toHaveBeenCalledWith('island-bg-media', media);
    expect(io.preview).toHaveBeenCalledWith('store:island-bg-media', media);
    expect(io.write).toHaveBeenCalledWith('island-bg-image', mode === 'video' ? null : item.path);
    expect(io.preview).toHaveBeenCalledWith('store:island-bg-image', mode === 'video' ? null : item.path);
    expect(io.load.mock.calls.length).toBe(mode === 'load' ? 1 : 0);
    expect(io.status).toHaveBeenCalledWith('albumTab.status.setIslandBackgroundSuccess');
  });
  it.each(['empty', 'read-reject', 'write-reject', 'preview-reject'])('handles background %s without reporting success', async (mode) => {
    if (mode === 'empty') io.load.mockResolvedValue(null);
    if (mode === 'read-reject') io.load.mockRejectedValue(new Error('read'));
    if (mode === 'write-reject') io.write.mockRejectedValue(new Error('write'));
    if (mode === 'preview-reject') io.preview.mockRejectedValue(new Error('preview'));
    view().handleSetAsIslandBackground(image);
    await settleHook();
    expect(io.status).toHaveBeenCalledWith('albumTab.status.setIslandBackgroundFailed');
    expect(io.status).not.toHaveBeenCalledWith('albumTab.status.setIslandBackgroundSuccess');
    if (mode === 'empty' || mode === 'read-reject') expect(io.dispatch).not.toHaveBeenCalled();
  });
});
