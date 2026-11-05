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
 * @file imageConverter.test.ts
 * @description 图片格式转换执行真实编码控制流，验证 Canvas 参数、ICO 二进制、下载清理和失败边界。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { convertImageInRenderer } from '../imageConverter';
import type { FormatFactoryImageOutputFormat } from '../../config/formatFactoryToolConfig';

let imageFails = false;
let imageWidth = 400;
let imageHeight = 200;
class ImageFixture {
  width = imageWidth;

  height = imageHeight;

  onload: (() => void) | null = null;

  onerror: (() => void) | null = null;

  source = '';

  set src(value: string) {
    this.source = value;
    queueMicrotask(() => {
      if (imageFails) {
        this.onerror?.();
      } else {
        this.onload?.();
      }
    });
  }
}

const loadFile = vi.fn<(path: string) => Promise<string | null>>();
const drawImage = vi.fn();
const clearRect = vi.fn();
const getImageData = vi.fn();
const getContext = vi.fn();
const toBlob = vi.fn<(callback: BlobCallback, mime: string, quality?: number) => void>();
const canvas = { getContext, toBlob, width: 0, height: 0 };
const anchor = { href: '', download: '', style: { display: '' }, click: vi.fn() };
const appendChild = vi.fn();
const removeChild = vi.fn();
const revokeUrl = vi.fn();
const createUrl = vi.fn<(blob: Blob | MediaSource) => string>();
const sourceBytes = new Uint8Array([137, 80, 78, 71]);

beforeEach(() => {
  vi.useFakeTimers();
  imageFails = false;
  imageWidth = 400;
  imageHeight = 200;
  canvas.width = 0;
  canvas.height = 0;
  loadFile.mockReset().mockResolvedValue('data:image/png;base64,iVBORw==');
  getContext.mockReset().mockReturnValue({ drawImage, clearRect, getImageData });
  toBlob.mockReset().mockImplementation((callback, mime) => {
    callback(new Blob([sourceBytes], { type: mime }));
  });
  vi.stubGlobal('Image', ImageFixture);
  vi.stubGlobal('window', { setTimeout, api: { loadWallpaperFile: loadFile } });
  vi.stubGlobal('document', { createElement: vi.fn((tag: string) => tag === 'canvas' ? canvas : anchor), body: { appendChild, removeChild } });
  createUrl.mockReset().mockReturnValue('blob:converted');
  vi.spyOn(URL, 'createObjectURL').mockImplementation(createUrl);
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(revokeUrl);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('renderer image conversion', () => {
  it.each<{ format: FormatFactoryImageOutputFormat; mime: string }>([
    { format: 'png', mime: 'image/png' }, { format: 'jpg', mime: 'image/jpeg' },
    { format: 'webp', mime: 'image/webp' },
  ])('encodes $format using original dimensions and exact quality', async ({ format, mime }) => {
    const result = await convertImageInRenderer({ filePath: 'C:\\pictures\\a.photo.png', targetFormat: format, icoSize: 32, quality: 0.7 });
    expect(result).toEqual({ success: true, outputPath: `a.photo.${format}`, fileSize: 4 });
    expect(canvas).toMatchObject({ width: 400, height: 200 });
    expect(clearRect).toHaveBeenCalledExactlyOnceWith(0, 0, 400, 200);
    expect(drawImage).toHaveBeenCalledExactlyOnceWith(expect.any(ImageFixture), 0, 0, 400, 200);
    expect(toBlob).toHaveBeenCalledExactlyOnceWith(expect.any(Function), mime, 0.7);
    expect(anchor).toMatchObject({ href: 'blob:converted', download: `a.photo.${format}`, style: { display: 'none' } });
    expect(appendChild).toHaveBeenCalledExactlyOnceWith(anchor);
    expect(removeChild).toHaveBeenCalledExactlyOnceWith(anchor);
    expect(anchor.click).toHaveBeenCalledOnce();
    expect(revokeUrl).not.toHaveBeenCalled();
    vi.advanceTimersByTime(999);
    expect(revokeUrl).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:converted');
  });
  it('encodes actual BMP bytes with dimensions, color masks and top-down BGRA pixels', async () => {
    imageWidth = 2;
    imageHeight = 2;
    getImageData.mockReturnValue({ data: new Uint8ClampedArray([
      255, 0, 0, 255, 0, 255, 0, 128,
      0, 0, 255, 64, 1, 2, 3, 0,
    ]) });
    const result = await convertImageInRenderer({ filePath: 'colors.png', targetFormat: 'bmp', icoSize: 32 });
    const blob = createUrl.mock.calls[0][0] as Blob;
    expect(result).toEqual({ success: true, outputPath: 'colors.bmp', fileSize: 138 });
    expect(blob.type).toBe('image/bmp');
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const view = new DataView(bytes.buffer);
    expect(String.fromCharCode(...bytes.subarray(0, 2))).toBe('BM');
    expect(view.getUint32(2, true)).toBe(bytes.byteLength);
    expect(view.getUint32(14, true)).toBe(108);
    expect(view.getInt32(18, true)).toBe(2);
    expect(view.getInt32(22, true)).toBe(-2);
    expect(view.getUint16(26, true)).toBe(1);
    expect(view.getUint16(28, true)).toBe(32);
    expect(view.getUint32(30, true)).toBe(3);
    expect(view.getUint32(54, true)).toBe(0xff0000);
    expect(view.getUint32(58, true)).toBe(0xff00);
    expect(view.getUint32(62, true)).toBe(0xff);
    expect(view.getUint32(66, true)).toBe(0xff000000);
    expect([...bytes.subarray(view.getUint32(10, true))]).toEqual([
      0, 0, 255, 255, 0, 255, 0, 128,
      255, 0, 0, 64, 3, 2, 1, 0,
    ]);
    expect(getImageData).toHaveBeenCalledExactlyOnceWith(0, 0, 2, 2);
    expect(toBlob).not.toHaveBeenCalled();
    expect(anchor.download).toBe('colors.bmp');
  });
  it('returns a BMP pixel-read error without saving a mislabeled fallback image', async () => {
    getImageData.mockImplementation(() => { throw new Error('canvas pixel read denied'); });
    expect(await convertImageInRenderer({ filePath: 'colors.png', targetFormat: 'bmp', icoSize: 32 }))
      .toEqual({ success: false, error: 'canvas pixel read denied' });
    expect(createUrl).not.toHaveBeenCalled();
    expect(toBlob).not.toHaveBeenCalled();
  });
  it.each([32, 256] as const)('writes a valid PNG-backed ICO directory for %s', async (size) => {
    const result = await convertImageInRenderer({ filePath: '/pictures/icon.png', targetFormat: 'ico', icoSize: size });
    expect(result).toEqual({ success: true, outputPath: `icon-${size}x${size}.ico`, fileSize: 26 });
    expect(canvas).toMatchObject({ width: size, height: size });
    expect(drawImage).toHaveBeenCalledExactlyOnceWith(expect.any(ImageFixture), 0, size / 4, size, size / 2);
    expect(toBlob).toHaveBeenCalledExactlyOnceWith(expect.any(Function), 'image/png', 1);
    const blob = createUrl.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('image/x-icon');
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const view = new DataView(bytes.buffer);
    expect([...bytes.slice(0, 6)]).toEqual([0, 0, 1, 0, 1, 0]);
    expect([...bytes.slice(6, 10)]).toEqual([size === 256 ? 0 : size, size === 256 ? 0 : size, 0, 0]);
    expect(view.getUint16(10, true)).toBe(1);
    expect(view.getUint16(12, true)).toBe(32);
    expect(view.getUint32(14, true)).toBe(4);
    expect(view.getUint32(18, true)).toBe(22);
    expect([...bytes.slice(22)]).toEqual([...sourceBytes]);
  });
  it('preserves a visible one-pixel width for extreme portrait ICOs', async () => {
    imageWidth = 1;
    imageHeight = 10000;
    await convertImageInRenderer({ filePath: 'portrait', targetFormat: 'ico', icoSize: 32 });
    expect(drawImage).toHaveBeenCalledExactlyOnceWith(expect.any(ImageFixture), 15, 0, 1, 32);
  });
  it.each([{ path: 'plain', output: 'plain.png' }, { path: '.hidden', output: '.hidden.png' }, { path: '/folder/', output: 'converted-1234.png' }])('handles source name $path', async ({ path, output }) => {
    vi.spyOn(Date, 'now').mockReturnValue(1234);
    expect(await convertImageInRenderer({ filePath: path, targetFormat: 'png', icoSize: 32 })).toEqual({ success: true, outputPath: output, fileSize: 4 });
    expect(toBlob).toHaveBeenCalledExactlyOnceWith(expect.any(Function), 'image/png', 1);
  });
  it('returns source loading failure without creating canvas data', async () => {
    loadFile.mockResolvedValue(null);
    expect(await convertImageInRenderer({ filePath: 'a.png', targetFormat: 'png', icoSize: 32 })).toEqual({ success: false, error: 'load source image failed' });
    expect(toBlob).not.toHaveBeenCalled();
  });
  it('returns image decode failure', async () => {
    imageFails = true;
    expect(await convertImageInRenderer({ filePath: 'bad.png', targetFormat: 'png', icoSize: 32 })).toEqual({ success: false, error: 'image load failed' });
  });
  it('reports missing Canvas context', async () => {
    getContext.mockReturnValue(null);
    expect(await convertImageInRenderer({ filePath: 'a.png', targetFormat: 'png', icoSize: 32 })).toEqual({ success: false, error: 'canvas context unavailable' });
  });
  it('reports failed Canvas encoding', async () => {
    toBlob.mockImplementation((callback) => callback(null));
    expect(await convertImageInRenderer({ filePath: 'a.png', targetFormat: 'ico', icoSize: 32 })).toEqual({ success: false, error: 'canvas encode failed' });
  });
  it('loads a native ICO URL and converts decoded pixels to a real PNG target', async () => {
    loadFile.mockResolvedValueOnce('http://127.0.0.1:18000/signed-icon');
    const result = await convertImageInRenderer({ filePath: 'C:/icons/source.ico', targetFormat: 'png', icoSize: 32 });
    expect(loadFile).toHaveBeenCalledWith('C:/icons/source.ico');
    expect(result).toEqual({ success: true, outputPath: 'source.png', fileSize: 4 });
    expect(toBlob).toHaveBeenCalledExactlyOnceWith(expect.any(Function), 'image/png', 1);
    expect(drawImage.mock.calls[0][0]).toMatchObject({ source: 'http://127.0.0.1:18000/signed-icon', crossOrigin: 'anonymous' });
  });
  it.each(['native-read', 'decode'])('ICO %s failure does not save an output', async (failure) => {
    if (failure === 'native-read') loadFile.mockRejectedValueOnce(new Error('ICO source unavailable'));
    else imageFails = true;
    expect(await convertImageInRenderer({ filePath: 'bad.ico', targetFormat: 'png', icoSize: 32 }))
      .toEqual({ success: false, error: failure === 'native-read' ? 'ICO source unavailable' : 'image load failed' });
    expect(createUrl).not.toHaveBeenCalled();
  });
  it.each([{ error: new Error('read denied'), message: 'read denied' }, { error: 'offline', message: 'offline' }, { error: new Error(''), message: 'convert failed' }])('reports exceptions $message', async ({ error, message }) => {
    loadFile.mockRejectedValue(error);
    expect(await convertImageInRenderer({ filePath: 'a.png', targetFormat: 'png', icoSize: 32 })).toEqual({ success: false, error: message });
  });
});
