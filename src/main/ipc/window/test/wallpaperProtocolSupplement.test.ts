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
 * @file wallpaperProtocolSupplement.test.ts
 * @description 壁纸本地与网络来源、字体限制、缓存路径和系统命令失败边界测试。
 * @author 鸡哥
 */

import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerWallpaperIpcHandlers } from '../wallpaper';
type HandlerFixture = (...args: unknown[]) => unknown;
interface ThumbnailFixture { isEmpty: () => boolean; toJPEG: (quality: number) => Buffer; }
const io = vi.hoisted(() => ({
  handlers: new Map<string, HandlerFixture>(), existing: new Set<string>(),
  exists: vi.fn<(file: string) => boolean>(), mkdir: vi.fn(), copy: vi.fn(), write: vi.fn<(file: string, data: Buffer) => void>(),
  read: vi.fn<(file: string) => Buffer>(), list: vi.fn<() => string[]>(), unlink: vi.fn(),
  fromSender: vi.fn<() => { id: number } | null>(), focused: vi.fn<() => { id: number } | null>(),
  dialog: vi.fn<() => Promise<{ canceled: boolean; filePaths: string[] }>>(),
  fetch: vi.fn<(url: string) => Promise<Response>>(),
  exec: vi.fn<(command: string, args: string[], options: unknown, callback: (error: Error | null, stdout: string) => void) => void>(),
  thumbnail: vi.fn<(file: string, size: unknown) => Promise<ThumbnailFixture>>(),
  album: vi.fn<(file: string) => unknown>(),
}));
vi.mock('electron', () => ({
  app: { getPath: () => 'C:/fixture-user' }, ipcMain: { handle: (channel: string, handler: HandlerFixture) => io.handlers.set(channel, handler) },
  BrowserWindow: { fromWebContents: io.fromSender, getFocusedWindow: io.focused },
  dialog: { showOpenDialog: io.dialog }, net: { fetch: io.fetch }, nativeImage: { createThumbnailFromPath: io.thumbnail },
}));
vi.mock('fs', () => ({ existsSync: io.exists, mkdirSync: io.mkdir, copyFileSync: io.copy, writeFileSync: io.write, readFileSync: io.read, readdirSync: io.list, unlinkSync: io.unlink }));
vi.mock('child_process', () => ({ execFile: io.exec }));
vi.mock('../../../media/albumMedia', () => ({ getAlbumMediaInfo: io.album }));
const cache = join('C:/fixture-user', 'wallpapers');
const source = "D:/fixture's image.png";
const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
/**
 * 调用真实壁纸 IPC。
 * @param channel - 通道名称
 * @param payload - 输入载荷
 * @returns 处理器返回值
 */
function invoke(channel: string, payload?: unknown): unknown { return io.handlers.get(channel)?.({ sender: { id: 7 } }, payload); }
beforeEach(() => {
  vi.resetAllMocks(); io.handlers.clear(); io.existing.clear(); io.existing.add(cache); io.existing.add(source);
  Object.defineProperty(process, 'platform', { configurable: true, value: 'win32' });
  io.exists.mockImplementation((file) => io.existing.has(file)); io.write.mockImplementation((file) => { io.existing.add(file); });
  io.fromSender.mockReturnValue({ id: 7 }); io.focused.mockReturnValue(null);
  io.dialog.mockResolvedValue({ canceled: false, filePaths: [source] }); io.list.mockReturnValue([]);
  io.read.mockReturnValue(Buffer.from('fixture')); io.fetch.mockResolvedValue(new Response('download'));
  io.exec.mockImplementation((...args) => args[3](null, 'True'));
  io.thumbnail.mockResolvedValue({ isEmpty: () => false, toJPEG: () => Buffer.from('jpeg') }); io.album.mockReturnValue({ title: 'fixture' });
  vi.spyOn(Date, 'now').mockReturnValue(123);
  registerWallpaperIpcHandlers();
});
afterEach(() => {
  if (originalPlatform) Object.defineProperty(process, 'platform', originalPlatform);
  vi.restoreAllMocks(); vi.unstubAllEnvs();
});
describe('壁纸选择、字体、缓存与图像读取', () => {
  it.each(['dialog:open-image', 'dialog:open-video', 'dialog:open-font'])('%s 拒绝无窗口、取消与空选择', async (channel) => {
    io.fromSender.mockReturnValue(null);
    await expect(invoke(channel)).resolves.toBeNull(); expect(io.dialog).not.toHaveBeenCalled();
    io.focused.mockReturnValue({ id: 8 }); io.dialog.mockResolvedValue({ canceled: true, filePaths: [source] });
    await expect(invoke(channel)).resolves.toBeNull();
    io.dialog.mockResolvedValue({ canceled: false, filePaths: [] }); await expect(invoke(channel)).resolves.toBeNull();
  });
  it.each(['dialog:open-image', 'dialog:open-video'])('%s 创建缓存且仅清理旧自定义文件，失败返回 null', async (channel) => {
    io.existing.delete(cache); io.dialog.mockResolvedValue({ canceled: false, filePaths: ['D:/fixture.'] });
    io.list.mockReturnValue(['custom-bg-old.png', 'keep.png']);
    const extension = channel === 'dialog:open-image' ? 'png' : 'mp4';
    await expect(invoke(channel)).resolves.toBe(join(cache, `custom-bg-123.${extension}`));
    expect(io.mkdir).toHaveBeenCalledWith(cache, { recursive: true });
    expect(io.unlink).toHaveBeenCalledExactlyOnceWith(join(cache, 'custom-bg-old.png'));
    io.list.mockImplementation(() => { throw new Error('list failed'); });
    await expect(invoke(channel)).resolves.toBe(join(cache, `custom-bg-123.${extension}`));
    io.copy.mockImplementation(() => { throw new Error('copy failed'); });
    await expect(invoke(channel)).resolves.toBeNull();
  });
  it('字体对话框读取字节、名称和扩展，文件失败返回 null', async () => {
    io.dialog.mockResolvedValue({ canceled: false, filePaths: ['D:/fonts/Nice Font.OTF'] });
    await expect(invoke('dialog:open-font')).resolves.toEqual({ path: 'D:/fonts/Nice Font.OTF', ext: 'otf', name: 'Nice Font', data: Buffer.from('fixture').toString('base64') });
    io.dialog.mockResolvedValue({ canceled: false, filePaths: ['D:/fonts/fixture.'] });
    await expect(invoke('dialog:open-font')).resolves.toMatchObject({ ext: 'ttf' });
    io.dialog.mockResolvedValue({ canceled: false, filePaths: ['D:/fonts/.ttf'] });
    await expect(invoke('dialog:open-font')).resolves.toMatchObject({ name: 'CustomFont' });
    io.read.mockImplementation(() => { throw new Error('read failed'); });
    await expect(invoke('dialog:open-font')).resolves.toBeNull();
  });
  it.each(['font:read-file', 'wallpaper:load-file', 'album:load-thumbnail', 'wallpaper:read-file-buffer'])('%s 拒绝无效参数或不存在文件', async (channel) => {
    await Promise.all([null, 5, '', 'D:/missing.png'].map(async (value) => { await expect(invoke(channel, value)).resolves.toBeNull(); }));
  });
  it('字体读取限制扩展并保留二进制，捕获读取失败', async () => {
    io.existing.add('D:/fonts/Legal.woff2'); io.existing.add('D:/invalid.exe');
    await expect(invoke('font:read-file', 'D:/fonts/Legal.woff2')).resolves.toMatchObject({ ext: 'woff2', name: 'Legal', data: Buffer.from('fixture').toString('base64') });
    await expect(invoke('font:read-file', 'D:/invalid.exe')).resolves.toBeNull();
    io.read.mockImplementation(() => { throw new Error('font failed'); });
    await expect(invoke('font:read-file', 'D:/fonts/Legal.woff2')).resolves.toBeNull();
  });
  it.each(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'unknown', ''])('图片扩展 %s 映射 MIME 或默认 png', async (extension) => {
    const file = `D:/image.${extension}`; io.existing.add(file);
    const types: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml' };
    await expect(invoke('wallpaper:load-file', file)).resolves.toBe(`data:${types[extension] ?? 'image/png'};base64,${Buffer.from('fixture').toString('base64')}`);
  });
  it('图像读取和缩略图失败返回 null，媒体信息委托真实 IPC 参数', async () => {
    io.read.mockImplementation(() => { throw new Error('read failed'); });
    await expect(invoke('wallpaper:load-file', source)).resolves.toBeNull();
    io.thumbnail.mockResolvedValue({ isEmpty: () => true, toJPEG: () => Buffer.from('unused') });
    await expect(invoke('album:load-thumbnail', source)).resolves.toBeNull();
    io.thumbnail.mockRejectedValue(new Error('thumbnail failed'));
    await expect(invoke('album:load-thumbnail', source)).resolves.toBeNull();
    expect(invoke('album:media-info', source)).toEqual({ title: 'fixture' }); expect(io.album).toHaveBeenCalledExactlyOnceWith(source);
  });
  it('缓存读取验证目录边界、文件存在和读取错误', async () => {
    const inside = resolve(cache, 'inside.mp4'); io.existing.add(inside);
    await expect(invoke('wallpaper:read-file-buffer', inside)).resolves.toEqual(new Uint8Array(Buffer.from('fixture')));
    await expect(invoke('wallpaper:read-file-buffer', resolve(cache, 'missing.mp4'))).resolves.toBeNull();
    await expect(invoke('wallpaper:read-file-buffer', resolve(cache, '..', 'escape.mp4'))).resolves.toBeNull();
    io.read.mockImplementation(() => { throw new Error('disk failed'); });
    await expect(invoke('wallpaper:read-file-buffer', inside)).resolves.toBeNull();
  });
  it('清理缓存缺失或读取失败不抛异常', async () => {
    io.existing.delete(cache); await expect(invoke('wallpaper:clear-cache')).resolves.toBeUndefined();
    io.existing.add(cache); io.list.mockImplementation(() => { throw new Error('cache unavailable'); });
    await expect(invoke('wallpaper:clear-cache')).resolves.toBeUndefined();
  });
});
describe('系统壁纸数据、本地、网络及渲染开发来源', () => {
  it.each(['linux', 'darwin'])('%s 拒绝系统壁纸修改并跳过 I/O', async (platform) => {
    Object.defineProperty(process, 'platform', { configurable: true, value: platform });
    await expect(invoke('wallpaper:system:set', { clear: true })).resolves.toBe(false);
    expect(io.exec).not.toHaveBeenCalled(); expect(io.write).not.toHaveBeenCalled();
  });
  it('转义本地路径单引号，命令拒绝或返回 false 则失败', async () => {
    await expect(invoke('wallpaper:system:set', { sourcePath: source })).resolves.toBe(true);
    expect(io.exec.mock.calls[0]?.[1].at(-1)).toContain("fixture''s image.png");
    io.exec.mockImplementation((...args) => args[3](new Error('powershell failed'), ''));
    await expect(invoke('wallpaper:system:set', { sourcePath: source })).resolves.toBe(false);
    io.exec.mockImplementation((...args) => args[3](null, 'False'));
    await expect(invoke('wallpaper:system:set', { sourcePath: source })).resolves.toBe(false);
    io.exists.mockReturnValueOnce(true).mockReturnValueOnce(false);
    await expect(invoke('wallpaper:system:set', { sourcePath: source })).resolves.toBe(false);
  });
  it('清空壁纸创建黑色 BMP，写入失败返回 false', async () => {
    io.existing.delete(cache);
    await expect(invoke('wallpaper:system:set', { clear: true })).resolves.toBe(true);
    expect(io.mkdir).toHaveBeenCalledWith(cache, { recursive: true });
    const black = io.write.mock.calls[0]?.[1]; expect(black?.subarray(0, 2).toString()).toBe('BM');
    io.write.mockImplementation(() => { throw new Error('full disk'); });
    await expect(invoke('wallpaper:system:set', { clear: true })).resolves.toBe(false);
  });
  it.each([undefined, null, { sourcePath: 5, previewUrl: false }, { sourcePath: ' ', previewUrl: ' ' }, { previewUrl: 'data:image/png;base64,!' }])('缺失或无效系统来源 %s 不执行命令', async (payload) => {
    await expect(invoke('wallpaper:system:set', payload)).resolves.toBe(false); expect(io.exec).not.toHaveBeenCalled();
  });
  it('data URL 创建缓存，内存分配异常返回 false', async () => {
    io.existing.delete(cache);
    await expect(invoke('wallpaper:system:set', { previewUrl: 'data:image/png;base64,aGk=' })).resolves.toBe(true);
    expect(io.write).toHaveBeenCalledWith(join(cache, 'desktop-sync-wallpaper.png'), Buffer.from('hi'));
    io.existing.add(cache);
    await expect(invoke('wallpaper:system:set', { previewUrl: 'data:image/png;base64,aGk=' })).resolves.toBe(true);
    vi.spyOn(Buffer, 'from').mockImplementationOnce(() => { throw new RangeError('allocation failed'); });
    await expect(invoke('wallpaper:system:set', { previewUrl: 'data:image/png;base64,Zg==' })).resolves.toBe(false);
  });
  it.each(['file:///D:/missing.png', 'file://%', 'missing-relative.png'])('不可用来源 %s 返回 false', async (previewUrl) => {
    await expect(invoke('wallpaper:system:set', { previewUrl })).resolves.toBe(false);
  });
  it('file URL 与普通本地预览路径可设置壁纸', async () => {
    io.existing.add('D:\\local.png');
    await expect(invoke('wallpaper:system:set', { previewUrl: 'file:///D:/local.png' })).resolves.toBe(true);
    await expect(invoke('wallpaper:system:set', { previewUrl: source })).resolves.toBe(true);
  });
  it.each(['http', 'relative'])('%s 网络失败、空内容、异常和有效图像的处理', async (kind) => {
    vi.stubEnv('ELECTRON_RENDERER_URL', 'https://renderer.invalid/');
    const previewUrl = kind === 'http' ? 'https://images.invalid/asset' : '/asset';
    const requestUrl = kind === 'http' ? previewUrl : 'https://renderer.invalid/asset';
    io.fetch.mockResolvedValue(new Response(null, { status: 404 }));
    await expect(invoke('wallpaper:system:set', { previewUrl })).resolves.toBe(false);
    io.fetch.mockResolvedValue(new Response(''));
    await expect(invoke('wallpaper:system:set', { previewUrl })).resolves.toBe(false);
    io.fetch.mockRejectedValue(new Error('fetch failed'));
    await expect(invoke('wallpaper:system:set', { previewUrl })).resolves.toBe(false);
    io.fetch.mockResolvedValue(new Response('download', { headers: { 'content-type': 'IMAGE/BMP' } })); io.existing.delete(cache);
    await expect(invoke('wallpaper:system:set', { previewUrl })).resolves.toBe(true);
    expect(io.fetch).toHaveBeenCalledWith(requestUrl);
    expect(io.write).toHaveBeenCalledWith(join(cache, 'desktop-sync-wallpaper.bmp'), Buffer.from('download'));
    io.existing.add(cache);
    io.fetch.mockResolvedValue(new Response('download', { headers: { 'content-type': 'IMAGE/BMP' } }));
    await expect(invoke('wallpaper:system:set', { previewUrl: `${previewUrl  }.PNG` })).resolves.toBe(true);
    expect(io.write).toHaveBeenCalledWith(join(cache, 'desktop-sync-wallpaper.png'), Buffer.from('download'));
  });
  it.each([undefined, 'file://renderer', 'http://renderer.invalid', 'https://renderer.invalid'])('渲染来源 %s 对根路径回退或获取图像', async (rendererUrl) => {
    vi.stubEnv('ELECTRON_RENDERER_URL', rendererUrl);
    const expected = rendererUrl?.startsWith('http') ?? false;
    await expect(invoke('wallpaper:system:set', { previewUrl: '/preview.png' })).resolves.toBe(expected);
    if (!expected) expect(io.fetch).not.toHaveBeenCalled();
  });
});
