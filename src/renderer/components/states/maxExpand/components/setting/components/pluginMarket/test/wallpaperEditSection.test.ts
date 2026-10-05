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
 * @file wallpaperEditSection.test.ts
 * @description WallpaperEditSection 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WallpaperEditSection } from '../WallpaperEditSection';
import { findElement, invoke, resetState, rewindState, textContent } from '../../../../../../../test/elementHarness';
import type * as UserApi from '../../../../../../../../api/user/userAccountApi';
const api = vi.hoisted(() => ({
  applyUserWallpaper: vi.fn<typeof UserApi.applyUserWallpaper>(),
  deleteUserWallpaper: vi.fn<typeof UserApi.deleteUserWallpaper>(),
  updateUserWallpaperMetadata: vi.fn<typeof UserApi.updateUserWallpaperMetadata>(),
  uploadUserWallpaper: vi.fn<typeof UserApi.uploadUserWallpaper>(),
  getUserWallpaperDetail: vi.fn<typeof UserApi.getUserWallpaperDetail>(),
  listMyUserWallpapers: vi.fn<typeof UserApi.listMyUserWallpapers>(),
  listUserWallpapers: vi.fn<typeof UserApi.listUserWallpapers>(),
  rateUserWallpaper: vi.fn<typeof UserApi.rateUserWallpaper>(),
  reportUserWallpaper: vi.fn<typeof UserApi.reportUserWallpaper>(),
}));
const wallpaper = { id: 1, title: 'Ocean', description: 'Calm', type: 'image', tagsText: 'blue, sea', originalUrl: 'https://example.com/original.jpg', thumb320Url: 'https://example.com/small.jpg', thumb1280Url: 'https://example.com/large.jpg', ownerUsername: 'reader', ownerNickname: 'Reader', ratingAvg: 3, applyCount: 1, status: 'approved', copyrightInfo: 'Original' };
const session = vi.hoisted<{
  token: string | null;
}>(() => ({ token: 'opaque' }));
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
vi.mock('../../../../../../../../utils/userAccount', () => ({ readLocalToken: () => session.token }));
vi.mock('../../../../../../../../api/user/userAccountApi', () => api);
beforeEach(() => {
  vi.clearAllMocks();
  Object.values(api).forEach((method) => { method.mockReset(); method.mockResolvedValue({ ok: false, code: 400, message: 'rejected' }); });
  resetState();
  session.token = 'opaque';
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('WallpaperEditSection', () => {
  it('取消删除保留记录，未登录时确认不会提交', () => {
    resetState([[wallpaper], wallpaper]);
    const props = { onGoWallpaper: vi.fn() };
    const tree = WallpaperEditSection(props);
    invoke(findElement(tree, (node) => textContent(node) === 'settings.pluginMarket.wallpaper.actions.delete' && node.type === 'button'), 'onClick');
    rewindState();
    invoke(findElement(WallpaperEditSection(props), (node) => textContent(node) === 'settings.pluginMarket.wallpaper.actions.cancelDelete' && node.type === 'button'), 'onClick');
    expect(api.deleteUserWallpaper).not.toHaveBeenCalled();
    resetState([[wallpaper], wallpaper, false, '', 1, 1, false, false, '', false, '', '', '', '', false, false, true]);
    session.token = null;
    invoke(findElement(WallpaperEditSection(props), (node) => textContent(node) === 'settings.pluginMarket.wallpaper.actions.confirmDeleteBtn' && node.type === 'button'), 'onClick');
    expect(api.deleteUserWallpaper).not.toHaveBeenCalled();
  });
  it.each([true, false])('元数据保存成功=%s 传递全部字段并恢复操作状态', async (ok) => {
    resetState([[wallpaper], wallpaper, false, '', 1, 1, false, false, '', true, 'New title', 'New description', 'green', 'Licensed']);
    api.updateUserWallpaperMetadata.mockResolvedValue({ ok, code: ok ? 200 : 400, message: ok ? '' : 'save rejected' });
    const props = { onGoWallpaper: vi.fn() };
    invoke(findElement(WallpaperEditSection(props), (node) => node.type === 'button' && textContent(node) === 'settings.pluginMarket.wallpaper.actions.saveMetadata'), 'onClick');
    await vi.waitFor(() => { expect(api.updateUserWallpaperMetadata).toHaveBeenCalledOnce(); });
    expect(api.updateUserWallpaperMetadata).toHaveBeenCalledWith('opaque', {
      id: 1, title: 'New title', description: 'New description', tags: 'green', copyrightInfo: 'Licensed', type: 'image',
    });
    if (ok)
    {await vi.waitFor(() => { expect(api.listMyUserWallpapers).toHaveBeenCalledOnce(); });}
    else {
      rewindState();
      expect(textContent(WallpaperEditSection(props))).toContain('save rejected');
    }
  });
  it('成功删除清空详情并重新加载列表', async () => {
    resetState([[wallpaper], wallpaper, false, '', 1, 1, false, false, '', false, '', '', '', '', false, false, true]);
    api.deleteUserWallpaper.mockResolvedValue({ ok: true, code: 200, message: '' });
    const props = { onGoWallpaper: vi.fn() };
    invoke(findElement(WallpaperEditSection(props), (node) => node.type === 'button' && textContent(node) === 'settings.pluginMarket.wallpaper.actions.confirmDeleteBtn'), 'onClick');
    await vi.waitFor(() => { expect(api.listMyUserWallpapers).toHaveBeenCalledWith('opaque', { keyword: undefined, page: 1, pageSize: 6 }); });
    rewindState();
    expect(textContent(WallpaperEditSection(props))).toContain('settings.pluginMarket.edit.feedback.selectHint');
  });
  it('存储列表查询失败提示服务端消息，关键词去除首尾空白', async () => {
    resetState([[], null, false, '  sea  ', 1, 1, false, true]);
    const props = { onGoWallpaper: vi.fn() };
    invoke(findElement(WallpaperEditSection(props), (node) => node.type === 'button' && textContent(node) === 'settings.pluginMarket.wallpaper.actions.search'), 'onClick');
    await vi.waitFor(() => { expect(api.listMyUserWallpapers).toHaveBeenCalledWith('opaque', { keyword: 'sea', page: 1, pageSize: 6 }); });
    rewindState();
    expect(textContent(WallpaperEditSection(props))).toContain('rejected');
  });
  it('shows empty personal list, expands search and returns to market', () => {
    const props = { onGoWallpaper: vi.fn() };
    const tree = WallpaperEditSection(props);
    expect(textContent(tree)).toContain('settings.pluginMarket.edit.feedback.emptyMine');
    invoke(findElement(tree, (n) => n.type === 'button' && textContent(n) === 'settings.pluginMarket.edit.actions.backToMarket'), 'onClick');
    expect(props.onGoWallpaper).toHaveBeenCalledOnce();
    invoke(findElement(tree, (n) => n.type === 'button' && textContent(n) === 'settings.pluginMarket.wallpaper.actions.expandSearch'), 'onClick');
    rewindState();
    expect(textContent(WallpaperEditSection(props))).toContain('settings.pluginMarket.wallpaper.actions.search');
  });
  it('requires confirmation before deletion and shows server rejection', async () => {
    resetState([[wallpaper], wallpaper]);
    const props = { onGoWallpaper: vi.fn() };
    const tree = WallpaperEditSection(props);
    invoke(findElement(tree, (n) => n.type === 'button' && textContent(n) === 'settings.pluginMarket.wallpaper.actions.delete'), 'onClick');
    expect(api.deleteUserWallpaper).not.toHaveBeenCalled();
    rewindState();
    const confirming = WallpaperEditSection(props);
    invoke(findElement(confirming, (n) => n.type === 'button' && textContent(n) === 'settings.pluginMarket.wallpaper.actions.confirmDeleteBtn'), 'onClick');
    await Promise.resolve();
    expect(api.deleteUserWallpaper).toHaveBeenCalledWith('opaque', 1);
    rewindState();
    expect(textContent(WallpaperEditSection(props))).toContain('rejected');
  });
});
