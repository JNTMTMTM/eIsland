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
 * @file wallpaperEditLifecycle.test.tsx
 * @description 壁纸编辑真实加载、详情、分页、表单提交、删除确认和渲染边界生命周期回归。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WallpaperEditSection } from '../WallpaperEditSection';
import { TagInput } from '../TagInput';
import { elementProps, elements, findElement, invoke, textContent } from '../../../../../../../test/elementHarness';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../hooks/test/settingsCoverageHarness';
import type * as UserApi from '../../../../../../../../api/user/userAccountApi';
import type { WallpaperMarketItem } from '../../../../../../../../api/user/types/Wallpaper';

const io = vi.hoisted(() => ({
  token: ((): string | null => 'token')(),
  list: vi.fn<typeof UserApi.listMyUserWallpapers>(),
  detail: vi.fn<typeof UserApi.getUserWallpaperDetail>(),
  remove: vi.fn<typeof UserApi.deleteUserWallpaper>(),
  update: vi.fn<typeof UserApi.updateUserWallpaperMetadata>(),
}));
vi.mock('../../../../../../../../api/user/userAccountApi', async () => ({
  listMyUserWallpapers: io.list, getUserWallpaperDetail: io.detail,
  deleteUserWallpaper: io.remove, updateUserWallpaperMetadata: io.update,
  normalizeWallpaperMarketListData: (await import('../../../../../../../../api/user/userAccountApi.wallpaper')).normalizeWallpaperMarketListData,
}));
vi.mock('../../../../../../../../utils/userAccount', () => ({ readLocalToken: () => io.token }));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../../test/elementHarness')).hookMocks,
  ...(await import('../../../hooks/test/settingsCoverageHarness')).lifecycleHooks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const onGoWallpaper = vi.fn();
const wallpaper: WallpaperMarketItem = { id: 1, ownerUsername: 'reader', title: 'Ocean', description: 'Calm', type: 'image', status: 'approved', originalUrl: '/original.png', thumb1280Url: '/large.png', thumb720Url: '/medium.png', thumb320Url: '/small.png', ownerAvatar: '/avatar.png', tagsText: ' blue， sea , ', copyrightInfo: 'Original', ratingAvg: 3.4, ratingCount: 7, applyCount: 9 };

/**
 * 执行真实壁纸编辑组件并提交当前依赖的真实 effect。
 * @returns 实际组件元素树。
 */
function view() {
  const tree = renderWithHooks(() => WallpaperEditSection({ onGoWallpaper }));
  runEffects();
  return tree;
}
/**
 * 查找真实翻译动作按钮。
 * @param suffix - 动作翻译结尾。
 * @returns 实际按钮。
 */
function button(suffix: string) {
  return findElement(view(), (node) => node.type === 'button' && textContent(node).endsWith(`.${suffix}`));
}
/**
 * 调用真实动作按钮的 click 回调。
 * @param suffix - 动作翻译结尾。
 * @returns 无返回值。
 */
function click(suffix: string): void {
  invoke(button(suffix), 'onClick');
}
/**
 * 消费列表、保存后详情及列表等真实 Promise 链。
 * @returns 请求消费等待句柄。
 */
async function settle(): Promise<void> {
  await Array.from({ length: 12 }).reduce<Promise<void>>((previous) => previous.then(() => undefined), Promise.resolve());
}
/**
 * 安装叶列表结果并完成真实首次加载。
 * @param items - 服务返回的壁纸列表。
 * @param total - 可选总数；缺省代表旧版数组响应。
 * @returns 无返回值。
 */
async function mount(items: WallpaperMarketItem[] = [wallpaper], total?: number): Promise<void> {
  io.list.mockResolvedValue({ ok: true, code: 200, message: '', data: total === undefined ? items : { items, total } });
  view();
  await settle();
  view();
}
/**
 * 输入真实元数据编辑表单。
 * @param name - 占位符字段结尾。
 * @param value - 用户编辑文本。
 * @returns 无返回值。
 */
function fill(name: string, value: string): void {
  invoke(findElement(view(), (node) => String(elementProps(node).placeholder).endsWith(`.${name}Placeholder`)), 'onChange', { target: { value } });
}
/**
 * 创建由测试完成的叶接口请求，不改动组件状态。
 * @returns Promise 和成功完成入口。
 */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { resolve, promise };
}

beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
  io.token = 'token';
  io.list.mockReset().mockResolvedValue({ ok: true, code: 200, message: '', data: [] });
  io.detail.mockReset().mockResolvedValue({ ok: true, code: 200, message: '', data: wallpaper });
  io.remove.mockReset().mockResolvedValue({ ok: true, code: 200, message: '' });
  io.update.mockReset().mockResolvedValue({ ok: true, code: 200, message: '' });
});
afterEach(() => unmountHooks());

describe('real personal wallpaper loading and navigation', () => {
  it('clears a sessionless initial list without querying services', async () => {
    io.token = null;
    view(); await settle();
    expect(io.list).not.toHaveBeenCalled();
    expect(textContent(view())).toContain('settings.pluginMarket.edit.feedback.emptyMine');
    expect(textContent(view())).toContain('settings.pluginMarket.edit.feedback.selectHint');
  });
  it('renders pending requests and ignores pagination while the list is loading', async () => {
    const pending = deferred<Awaited<ReturnType<typeof io.list>>>();
    io.list.mockReturnValue(pending.promise);
    view();
    expect(textContent(view())).toContain('settings.pluginMarket.wallpaper.feedback.loading');
    click('prevPage'); click('nextPage');
    expect(io.list).toHaveBeenCalledOnce();
    pending.resolve({ ok: true, code: 200, message: '', data: [] });
    await settle();
    expect(textContent(view())).toContain('settings.pluginMarket.edit.feedback.emptyMine');
  });
  it.each(['server rejected', ''])('renders list failure feedback %j and completes loading', async (message) => {
    io.list.mockResolvedValue({ message, ok: false, code: 400 });
    view(); await settle();
    expect(textContent(view())).toContain(message || 'settings.pluginMarket.wallpaper.feedback.loadFailed');
    expect(elementProps(button('nextPage')).disabled).toBe(true);
  });
  it('consumes list request rejection on initial load, search and pagination callbacks', async () => {
    io.list.mockRejectedValue(new Error('list'));
    view(); await settle();
    expect(textContent(view())).not.toContain('settings.pluginMarket.wallpaper.feedback.loading');
    click('expandSearch'); click('search'); await settle();
    expect(io.list).toHaveBeenCalledTimes(2);
    await mount(Array.from({ length: 6 }, (value, index) => { void value; return { ...wallpaper, id: index + 1 }; }));
    click('search'); await settle();
    io.list.mockRejectedValue(new Error('next'));
    click('nextPage'); await settle();
    expect(textContent(view())).not.toContain('settings.pluginMarket.wallpaper.feedback.loading');
  });
  it('toggles search, trims its actual input, navigates known totals and returns to the market', async () => {
    await mount([wallpaper], 13);
    click('prevPage');
    expect(io.list).toHaveBeenCalledOnce();
    click('expandSearch');
    const input = findElement(view(), (node) => node.type === 'input');
    invoke(input, 'onChange', { target: { value: '  sea  ' } });
    click('search'); await settle();
    expect(io.list).toHaveBeenLastCalledWith('token', { keyword: 'sea', page: 1, pageSize: 6 });
    click('nextPage'); await settle();
    expect(io.list).toHaveBeenLastCalledWith('token', { keyword: 'sea', page: 2, pageSize: 6 });
    click('prevPage'); await settle();
    expect(io.list).toHaveBeenLastCalledWith('token', { keyword: 'sea', page: 1, pageSize: 6 });
    click('collapseSearch');
    expect(elements(view()).filter((node) => node.type === 'input')).toHaveLength(0);
    click('backToMarket');
    expect(onGoWallpaper).toHaveBeenCalledOnce();
  });
  it('computes unknown-total pagination from full pages and expands the upper page bound', async () => {
    const full = Array.from({ length: 6 }, (value, index) => { void value; return { ...wallpaper, id: index + 1 }; });
    await mount(full);
    expect(elementProps(button('nextPage')).disabled).toBe(false);
    click('nextPage'); await settle();
    expect(io.list).toHaveBeenLastCalledWith('token', { keyword: undefined, page: 2, pageSize: 6 });
    io.list.mockResolvedValue({ ok: true, code: 200, message: '', data: [wallpaper] });
    click('nextPage'); await settle();
    expect(elementProps(button('nextPage')).disabled).toBe(true);
    expect(io.list).toHaveBeenLastCalledWith('token', { keyword: undefined, page: 3, pageSize: 6 });
    click('nextPage');
    expect(io.list).toHaveBeenCalledTimes(3);
  });
  it('selects a replacement when the refreshed list no longer contains the selected wallpaper', async () => {
    await mount();
    click('expandSearch');
    io.list.mockResolvedValue({ ok: true, code: 200, message: '', data: [{ ...wallpaper, id: 2, title: 'Forest' }] });
    click('search'); await settle();
    expect(textContent(view())).toContain('Forest');
    io.list.mockResolvedValue({ ok: true, code: 200, message: '', data: [] });
    click('search'); await settle();
    expect(textContent(view())).toContain('settings.pluginMarket.edit.feedback.selectHint');
  });
  it('loads card details, consumes rejected detail requests and stops after authentication expires', async () => {
    await mount();
    const card = findElement(view(), (node) => node.type === 'button' && String(elementProps(node).className).includes('settings-plugin-market-card'));
    invoke(card, 'onClick'); await settle();
    expect(io.detail).toHaveBeenCalledWith('token', 1);
    io.detail.mockRejectedValue(new Error('detail'));
    invoke(card, 'onClick'); await settle();
    io.token = null;
    invoke(card, 'onClick'); await settle();
    expect(io.detail).toHaveBeenCalledTimes(2);
  });
  it.each(['detail rejected', ''])('renders failed detail message %j even when the API succeeds without data', async (message) => {
    await mount();
    io.detail.mockResolvedValue({ message, ok: message === '', code: 400 });
    invoke(findElement(view(), (node) => node.type === 'button' && String(elementProps(node).className).includes('settings-plugin-market-card')), 'onClick');
    await settle();
    expect(textContent(view())).toContain(message || 'settings.pluginMarket.wallpaper.feedback.detailFailed');
  });
});

describe('real metadata form and delete confirmations', () => {
  it('edits every input, calls real metadata submission with video type and refreshes detail/list', async () => {
    const video = { ...wallpaper, type: 'video' as const };
    await mount([video]);
    io.detail.mockResolvedValue({ ok: true, code: 200, message: '', data: { ...video, title: 'Saved' } });
    click('editMetadata');
    fill('title', 'New title'); fill('description', 'New description'); fill('copyrightInfo', 'Licensed');
    invoke(findElement(view(), (node) => node.type === TagInput), 'onChange', 'green');
    click('saveMetadata'); await settle();
    expect(io.update).toHaveBeenCalledWith('token', { id: 1, title: 'New title', description: 'New description', tags: 'green', copyrightInfo: 'Licensed', type: 'video' });
    expect(io.detail).toHaveBeenCalledWith('token', 1);
    expect(io.list).toHaveBeenCalledTimes(2);
    expect(textContent(view())).toContain('settings.pluginMarket.wallpaper.feedback.updateSuccess');
    expect(textContent(view())).toContain('Saved');
    expect(elements(view()).filter((node) => node.type === 'textarea')).toHaveLength(0);
  });
  it.each(['save rejected', ''])('preserves the editor and restores its button after save failure %j', async (message) => {
    await mount();
    click('editMetadata');
    io.update.mockResolvedValue({ message, ok: false, code: 400 });
    click('saveMetadata'); await settle();
    expect(textContent(view())).toContain(message || 'settings.pluginMarket.wallpaper.feedback.updateFailed');
    expect(elementProps(button('saveMetadata')).disabled).toBe(false);
    expect(io.detail).not.toHaveBeenCalled();
    expect(io.list).toHaveBeenCalledOnce();
    click('cancelEdit');
    expect(elements(view()).filter((node) => node.type === 'textarea')).toHaveLength(0);
  });
  it('shows saving state, prevents a busy callback and consumes a rejected update request', async () => {
    await mount(); click('editMetadata');
    const pending = deferred<Awaited<ReturnType<typeof io.update>>>();
    io.update.mockReturnValue(pending.promise);
    click('saveMetadata');
    expect(elementProps(button('savingMetadata')).disabled).toBe(true);
    click('savingMetadata');
    expect(io.update).toHaveBeenCalledOnce();
    pending.resolve({ ok: false, code: 400, message: 'denied' }); await settle();
    io.update.mockRejectedValue(new Error('save'));
    click('saveMetadata'); await settle();
    expect(elementProps(button('saveMetadata')).disabled).toBe(false);
  });
  it('stops save and deletion if authentication expires before their public callbacks run', async () => {
    await mount(); click('editMetadata'); click('delete');
    io.token = null;
    click('saveMetadata'); click('confirmDeleteBtn'); await settle();
    expect(io.update).not.toHaveBeenCalled();
    expect(io.remove).not.toHaveBeenCalled();
  });
  it('requires a cancellable confirmation and reloads the list after successful deletion', async () => {
    await mount();
    click('delete'); click('cancelDelete');
    expect(io.remove).not.toHaveBeenCalled();
    click('delete');
    io.list.mockResolvedValue({ ok: true, code: 200, message: '', data: [] });
    click('confirmDeleteBtn'); await settle();
    expect(io.remove).toHaveBeenCalledWith('token', 1);
    expect(io.list).toHaveBeenLastCalledWith('token', { keyword: undefined, page: 1, pageSize: 6 });
    expect(textContent(view())).toContain('settings.pluginMarket.wallpaper.feedback.deleteSuccess');
    expect(textContent(view())).toContain('settings.pluginMarket.edit.feedback.selectHint');
  });
  it.each(['delete rejected', ''])('retains selected detail and restores deletion controls after failure %j', async (message) => {
    await mount(); click('delete');
    io.remove.mockResolvedValue({ message, ok: false, code: 400 });
    click('confirmDeleteBtn'); await settle();
    expect(textContent(view())).toContain(message || 'settings.pluginMarket.wallpaper.feedback.deleteFailed');
    expect(textContent(view())).toContain('Ocean');
    expect(elementProps(button('confirmDeleteBtn')).disabled).toBe(false);
  });
  it('shows deleting state, blocks a busy callback and consumes a rejected deletion request', async () => {
    await mount(); click('delete');
    const pending = deferred<Awaited<ReturnType<typeof io.remove>>>();
    io.remove.mockReturnValue(pending.promise);
    click('confirmDeleteBtn');
    expect(elementProps(button('deleting')).disabled).toBe(true);
    click('deleting');
    expect(io.remove).toHaveBeenCalledOnce();
    pending.resolve({ ok: false, code: 400, message: 'denied' }); await settle();
    io.remove.mockRejectedValue(new Error('delete'));
    click('confirmDeleteBtn'); await settle();
    expect(elementProps(button('confirmDeleteBtn')).disabled).toBe(false);
  });
});

describe('actual wallpaper preview and metadata boundary rendering', () => {
  it.each([
    { originalUrl: '', thumb1280Url: '', thumb720Url: '', thumb320Url: '' },
    { originalUrl: '/original.png', thumb1280Url: '', thumb720Url: '', thumb320Url: '' },
    { originalUrl: '', thumb1280Url: '', thumb720Url: '/720.png', thumb320Url: '' },
    { originalUrl: '', thumb1280Url: '', thumb720Url: '', thumb320Url: '/320.png' },
  ])('uses the actual available image preview and permits absent image data %j', async (urls) => {
    await mount([{ ...wallpaper, ...urls, title: '', description: '', tagsText: '', copyrightInfo: '', ownerAvatar: undefined, ratingAvg: undefined, ratingCount: undefined, applyCount: undefined }]);
    const images = elements(view()).filter((node) => elementProps(node).className === 'settings-plugin-market-detail-img');
    const expected = urls.thumb1280Url || urls.thumb720Url || urls.thumb320Url || urls.originalUrl;
    expect(images).toHaveLength(expected ? 1 : 0);
    if (expected) expect(elementProps(images[0]).src).toBe(expected);
    expect(elements(view()).some((node) => String(elementProps(node).className).includes('placeholder'))).toBe(true);
    click('editMetadata');
    expect(elementProps(findElement(view(), (node) => node.type === 'input')).value).toBe('');
  });
  it.each([undefined, 0, -1000, Infinity, NaN, 61000])('renders a video with actual duration %s and optional poster', async (duration) => {
    await mount([{ ...wallpaper, durationMs: duration, type: 'video', thumb1280Url: '', thumb720Url: '', thumb320Url: '' }]);
    const video = findElement(view(), (node) => node.type === 'video');
    expect(elementProps(video)).toMatchObject({ src: '/original.png', poster: undefined, controls: true, muted: true });
    if (duration === 61000) expect(textContent(view())).toContain('01:01');
    if (duration === -1000 || duration === Infinity) expect(textContent(view())).toContain('--:--');
  });
  it('shows a video poster when available and falls back to an image when its original URL is absent', async () => {
    await mount([{ ...wallpaper, type: 'video', durationMs: 1000 }]);
    expect(elementProps(findElement(view(), (node) => node.type === 'video')).poster).toBe('/large.png');
    io.detail.mockResolvedValue({ ok: true, code: 200, message: '', data: { ...wallpaper, type: 'video', originalUrl: '' } });
    invoke(findElement(view(), (node) => node.type === 'button' && String(elementProps(node).className).includes('settings-plugin-market-card')), 'onClick'); await settle();
    expect(elements(view()).filter((node) => node.type === 'video')).toHaveLength(0);
    expect(elementProps(findElement(view(), (node) => elementProps(node).className === 'settings-plugin-market-detail-img')).src).toBe('/large.png');
  });
  it('loads detail fields with absent optional metadata and uses safe edit defaults', async () => {
    await mount();
    io.detail.mockResolvedValue({ ok: true, code: 200, message: '', data: { id: 2, title: '', description: '', ownerUsername: 'other', status: 'pending', type: 'image' } });
    invoke(findElement(view(), (node) => node.type === 'button' && String(elementProps(node).className).includes('settings-plugin-market-card')), 'onClick'); await settle();
    click('editMetadata');
    expect(elementProps(findElement(view(), (node) => node.type === 'input')).value).toBe('');
    expect(elementProps(findElement(view(), (node) => node.type === TagInput)).value).toBe('');
  });
});

it('consumes a previous-page list request rejection and restores navigation', async () => {
  await mount([wallpaper], 12);
  click('nextPage'); await settle();
  io.list.mockRejectedValue(new Error('previous page'));
  click('prevPage'); await settle();
  expect(io.list).toHaveBeenLastCalledWith('token', { keyword: undefined, page: 1, pageSize: 6 });
  expect(elementProps(button('prevPage')).disabled).toBe(false);
});
it('resets confirmation when another detail is selected while the original deletion is pending', async () => {
  const other = { ...wallpaper, id: 2, title: 'Another' };
  await mount([wallpaper, other]);
  click('delete');
  const pending = deferred<Awaited<ReturnType<typeof io.remove>>>();
  io.remove.mockReturnValue(pending.promise);
  click('confirmDeleteBtn');
  io.detail.mockResolvedValue({ ok: true, code: 200, message: '', data: other });
  invoke(findElement(view(), (node) => node.type === 'button' && node.key === '2'), 'onClick');
  await settle();
  view();
  expect(elementProps(button('deleting')).disabled).toBe(true);
  expect(textContent(view())).toContain('Another');
  pending.resolve({ ok: false, code: 400, message: 'original deletion failed' });
  await settle();
  expect(elementProps(button('delete')).disabled).toBe(false);
});
