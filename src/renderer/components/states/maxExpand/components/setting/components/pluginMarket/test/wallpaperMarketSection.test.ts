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
 * @file wallpaperMarketSection.test.ts
 * @description WallpaperMarketSection 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WallpaperMarketSection } from '../WallpaperMarketSection';
import { elements, findElement, invoke, resetState, rewindState, textContent } from '../../../../../../../test/elementHarness';
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
describe('WallpaperMarketSection', () => {
  it.each(['image', 'video'] as const)('应用成功使用 %s 的对应地址，未登录不提交', async (type) => {
    const selected = { ...wallpaper };
    selected.type = type;
    resetState([8, [selected], selected, true, false]);
    const props = { onApplyBackground: vi.fn(), searchExpanded: false, onSearchExpandedChange: vi.fn() };
    api.applyUserWallpaper.mockResolvedValue({ ok: true, code: 200, message: '' });
    const tree = WallpaperMarketSection(props);
    const button = findElement(tree, (node) => node.type === 'button' && textContent(node) === 'settings.pluginMarket.wallpaper.actions.apply');
    session.token = null;
    invoke(button, 'onClick');
    expect(api.applyUserWallpaper).not.toHaveBeenCalled();
    session.token = 'opaque';
    invoke(button, 'onClick');
    await vi.waitFor(() => { expect(props.onApplyBackground).toHaveBeenCalledWith(type === 'video' ? wallpaper.originalUrl : wallpaper.thumb1280Url, { type }); });
    expect(api.getUserWallpaperDetail).toHaveBeenCalledWith('opaque', 1);
  });
  it('评分展开、选择3星和提交使用真实回调', async () => {
    resetState([8, [wallpaper], wallpaper, true, false]);
    const props = { onApplyBackground: vi.fn(), searchExpanded: false, onSearchExpandedChange: vi.fn() };
    let tree = WallpaperMarketSection(props);
    invoke(findElement(tree, (node) => node.type === 'button' && textContent(node) === 'settings.pluginMarket.wallpaper.actions.expandRate'), 'onClick');
    rewindState();
    tree = WallpaperMarketSection(props);
    const stars = elements(tree).filter((node) => node.props.role === 'radio');
    expect(stars).toHaveLength(5);
    invoke(stars[2], 'onClick');
    rewindState();
    tree = WallpaperMarketSection(props);
    invoke(findElement(tree, (node) => node.type === 'button' && textContent(node) === 'settings.pluginMarket.wallpaper.actions.rate'), 'onClick');
    await vi.waitFor(() => { expect(api.rateUserWallpaper).toHaveBeenCalledWith('opaque', 1, 3); });
    rewindState();
    expect(textContent(WallpaperMarketSection(props))).toContain('rejected');
  });
  it('举报表单传递原因和说明，成功后清空说明并提示', async () => {
    resetState([8, [wallpaper], wallpaper, true, false]);
    const props = { onApplyBackground: vi.fn(), searchExpanded: false, onSearchExpandedChange: vi.fn() };
    let tree = WallpaperMarketSection(props);
    invoke(findElement(tree, (node) => node.type === 'button' && textContent(node) === 'settings.pluginMarket.wallpaper.actions.expandReport'), 'onClick');
    rewindState();
    tree = WallpaperMarketSection(props);
    invoke(findElement(tree, (node) => node.type === 'select' && node.props.value === 'copyright'), 'onChange', { target: { value: 'other' } });
    invoke(findElement(tree, (node) => node.type === 'input' && node.props.placeholder === 'settings.pluginMarket.wallpaper.report.detailPlaceholder'), 'onChange', { target: { value: 'reason' } });
    api.reportUserWallpaper.mockResolvedValue({ ok: true, code: 200, message: '' });
    rewindState();
    tree = WallpaperMarketSection(props);
    invoke(findElement(tree, (node) => node.type === 'button' && textContent(node) === 'settings.pluginMarket.wallpaper.actions.submitReport'), 'onClick');
    await vi.waitFor(() => { expect(api.reportUserWallpaper).toHaveBeenCalledWith('opaque', { id: 1, reasonType: 'other', reasonDetail: 'reason' }); });
    rewindState();
    tree = WallpaperMarketSection(props);
    expect(textContent(tree)).toContain('reportSuccess');
    expect(findElement(tree, (node) => node.type === 'input' && node.props.placeholder === 'settings.pluginMarket.wallpaper.report.detailPlaceholder').props.value).toBe('');
  });
  it('shows empty list and guards unavailable pagination', () => {
    const tree = WallpaperMarketSection({ onApplyBackground: vi.fn(), searchExpanded: false, onSearchExpandedChange: vi.fn() });
    expect(textContent(tree)).toContain('settings.pluginMarket.wallpaper.feedback.empty');
    expect(findElement(tree, (n) => n.type === 'button' && textContent(n) === 'settings.pluginMarket.wallpaper.actions.prevPage').props.disabled).toBe(true);
    expect(findElement(tree, (n) => n.type === 'button' && textContent(n) === 'settings.pluginMarket.wallpaper.actions.nextPage').props.disabled).toBe(true);
  });
  it.each(['image', 'video'] as const)('renders %s preview and reports application rejection', async (type) => {
    const selected = { ...wallpaper, durationMs: 65000 };
    selected.type = type;
    resetState([8, [selected], selected, true, false]);
    const tree = WallpaperMarketSection({ onApplyBackground: vi.fn(), searchExpanded: true, onSearchExpandedChange: vi.fn() });
    expect(textContent(tree)).toContain('Ocean');
    expect(elements(tree).some((n) => n.type === (type === 'video' ? 'video' : 'img') && (n.props.className === 'settings-plugin-market-detail-video' || n.props.className === 'settings-plugin-market-detail-img'))).toBe(true);
    invoke(findElement(tree, (n) => n.type === 'button' && textContent(n) === 'settings.pluginMarket.wallpaper.actions.apply'), 'onClick');
    await Promise.resolve();
    expect(api.applyUserWallpaper).toHaveBeenCalledWith('opaque', 1);
    rewindState();
    expect(textContent(WallpaperMarketSection({ onApplyBackground: vi.fn(), searchExpanded: false, onSearchExpandedChange: vi.fn() }))).toContain('rejected');
  });
});
