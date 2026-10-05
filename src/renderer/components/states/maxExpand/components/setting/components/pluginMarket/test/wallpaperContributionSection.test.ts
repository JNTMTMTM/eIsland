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
 * @file wallpaperContributionSection.test.ts
 * @description WallpaperContributionSection 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WallpaperContributionSection } from '../WallpaperContributionSection';
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
describe('WallpaperContributionSection', () => {
  it.each([
    { declared: false, info: '', previews: true, message: 'copyrightRequired' },
    { declared: true, info: ' ', previews: true, message: 'copyrightInfoRequired' },
    { declared: true, info: 'Original', previews: false, message: 'uploadFailed' },
  ])('提交前检查 $message，不触发上传API', async ({ declared, info, previews, message }) => {
    const file = new File(['image'], 'photo.png', { type: 'image/png' });
    const entries = [0, 1, 2, 3].map((index) => ({ file, label: String(index), url: `blob:test${  index}`, width: 100, height: 50 }));
    resetState(['', false, 0, 'Ocean', '', '', 'image', file, null, declared, info, previews ? entries : []]);
    invoke(findElement(WallpaperContributionSection(), (node) => node.type === 'button' && textContent(node) === 'settings.pluginMarket.wallpaper.actions.upload'), 'onClick');
    await Promise.resolve();
    rewindState();
    expect(textContent(WallpaperContributionSection())).toContain(`settings.pluginMarket.wallpaper.feedback.${  message}`);
    expect(api.uploadUserWallpaper).not.toHaveBeenCalled();
  });
  it.each([
    { type: 'image', name: 'photo.png', size: 20 * 1024 * 1024 + 1, message: 'fileTooLarge' },
    { type: 'video', name: 'movie.mp4', size: 100 * 1024 * 1024 + 1, message: 'videoTooLarge' },
  ])('选取过大 $type 文件立即反馈，避免生成缩略图', async ({ type, name, size, message }) => {
    const file = new File(['data'], name);
    Object.defineProperty(file, 'size', { value: size });
    resetState(['', false, 0, '', '', '', type]);
    invoke(findElement(WallpaperContributionSection(), (node) => node.type === 'input' && node.props.type === 'file'), 'onChange', { target: { files: [file] } });
    await Promise.resolve();
    rewindState();
    expect(textContent(WallpaperContributionSection())).toContain(`settings.pluginMarket.wallpaper.feedback.${  message}`);
    expect(api.uploadUserWallpaper).not.toHaveBeenCalled();
  });
  it.each([true, false])('完整上传成功=%s 传递缩略图和清理状态', async (ok) => {
    const file = new File(['image'], 'photo.png', { type: 'image/png' });
    const previews = [0, 1, 2, 3].map((index) => ({ file, label: String(index), url: `blob:test${  index}`, width: 100, height: 50 }));
    resetState(['', false, 0, ' Ocean ', ' Calm ', ' blue ', 'image', file, null, true, ' Original ', previews]);
    api.uploadUserWallpaper.mockResolvedValue({ ok, code: ok ? 200 : 400, message: ok ? '' : 'upload rejected' });
    invoke(findElement(WallpaperContributionSection(), (node) => node.type === 'button' && textContent(node) === 'settings.pluginMarket.wallpaper.actions.upload'), 'onClick');
    await vi.waitFor(() => { expect(api.uploadUserWallpaper).toHaveBeenCalledOnce(); });
    expect(api.uploadUserWallpaper).toHaveBeenCalledWith('opaque', expect.objectContaining({
      title: 'Ocean', description: 'Calm', tags: 'blue', copyrightInfo: 'Original', type: 'image', copyrightDeclared: true,
      width: 100, height: 50, original: file, thumb320: file, thumb720: file, thumb1280: file,
    }), expect.objectContaining({ onUploadProgress: expect.any(Function) as unknown }));
    rewindState();
    const tree = WallpaperContributionSection();
    expect(textContent(tree)).toContain(ok ? 'uploadSuccess' : 'upload rejected');
    expect(findElement(tree, (node) => node.type === 'input' && node.props.placeholder === 'settings.pluginMarket.wallpaper.upload.titlePlaceholder').props.value).toBe(ok ? '' : ' Ocean ');
  });
  it('switches media type and conditionally expands copyright declaration', () => {
    const tree = WallpaperContributionSection();
    expect(findElement(tree, (n) => n.type === 'input' && n.props.type === 'file').props.accept).toBe('image/jpeg,image/png,image/webp');
    invoke(findElement(tree, (n) => n.type === 'button' && textContent(n) === 'settings.pluginMarket.wallpaper.upload.typeVideo'), 'onClick');
    rewindState();
    const video = WallpaperContributionSection();
    expect(findElement(video, (n) => n.type === 'input' && n.props.type === 'file').props.accept).toBe('video/mp4,.mp4');
    invoke(findElement(video, (n) => n.type === 'input' && n.props.type === 'checkbox'), 'onChange', { target: { checked: true } });
    rewindState();
    expect(elements(WallpaperContributionSection()).filter((n) => n.type === 'textarea')).toHaveLength(2);
  });
  it.each([{ title: '', message: 'titleRequired' }, { title: 'Ocean', message: 'fileRequired' }])('validates $message before upload', async ({ title, message }) => {
    resetState(['', false, 0, title]);
    const tree = WallpaperContributionSection();
    invoke(findElement(tree, (n) => n.type === 'button' && textContent(n) === 'settings.pluginMarket.wallpaper.actions.upload'), 'onClick');
    await Promise.resolve();
    rewindState();
    expect(textContent(WallpaperContributionSection())).toContain(`settings.pluginMarket.wallpaper.feedback.${message}`);
    expect(api.uploadUserWallpaper).not.toHaveBeenCalled();
  });
  it('rejects non-mp4 videos before invoking browser media processing', async () => {
    resetState(['', false, 0, '', '', '', 'video']);
    const tree = WallpaperContributionSection();
    invoke(findElement(tree, (n) => n.type === 'input' && n.props.type === 'file'), 'onChange', { target: { files: [new File(['test'], 'movie.webm', { type: 'video/webm' })] } });
    await Promise.resolve();
    rewindState();
    expect(textContent(WallpaperContributionSection())).toContain('settings.pluginMarket.wallpaper.feedback.videoTypeInvalid');
  });
  it('disables file selection and type controls during upload', () => {
    resetState(['', true]);
    const tree = WallpaperContributionSection();
    expect(elements(tree).filter((n) => n.type === 'button').every((n) => n.props.disabled === true)).toBe(true);
  });
});
