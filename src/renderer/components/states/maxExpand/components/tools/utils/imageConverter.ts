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
 * @file imageConverter.ts
 * @description 格式工厂图片格式转换工具函数（前端实现）
 * @author 鸡哥
 */
import type {
  FormatFactoryIcoOutputSize,
  FormatFactoryImageOutputFormat,
} from '../config/formatFactoryToolConfig';

export interface ConvertImageInRendererParams {
  filePath: string;
  targetFormat: FormatFactoryImageOutputFormat;
  icoSize: FormatFactoryIcoOutputSize;
  quality?: number;
}

export interface ConvertImageInRendererResult {
  success: boolean;
  outputPath?: string;
  fileSize?: number;
  error?: string;
}

function getFileBaseName(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/');
  const name = parts[parts.length - 1] || `converted-${Date.now()}`;
  const idx = name.lastIndexOf('.');
  return idx > 0 ? name.slice(0, idx) : name;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // 本地资源协议与页面不同源，启用 CORS 才能继续导出画布。
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = dataUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality = 1): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error('canvas encode failed'));
    }, mime, quality);
  });
}

async function buildIcoBlobFromPng(pngBlob: Blob, iconSize: number): Promise<Blob> {
  const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());

  const header = new Uint8Array(6 + 16);
  const view = new DataView(header.buffer);

  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, 1, true);

  header[6] = iconSize >= 256 ? 0 : iconSize;
  header[7] = iconSize >= 256 ? 0 : iconSize;
  header[8] = 0;
  header[9] = 0;
  view.setUint16(10, 1, true);
  view.setUint16(12, 32, true);
  view.setUint32(14, pngBytes.byteLength, true);
  view.setUint32(18, 22, true);

  return new Blob([header, pngBytes], { type: 'image/x-icon' });
}

/**
 * 编码带透明通道的 BMP V4，避免浏览器不支持 image/bmp 时静默生成 PNG。
 * @param canvas - 已绘制原图的画布。
 * @param ctx - 原图画布上下文。
 * @returns 包含标准 BMP 文件头、颜色掩码与 BGRA 像素的图片。
 */
function canvasToBmp(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Blob {
  const { width, height } = canvas;
  const rgba = ctx.getImageData(0, 0, width, height).data;
  const pixelOffset = 122;
  const bytes = new Uint8Array(pixelOffset + rgba.byteLength);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, 0x4d42, true);
  view.setUint32(2, bytes.byteLength, true);
  view.setUint32(10, pixelOffset, true);
  view.setUint32(14, 108, true);
  view.setInt32(18, width, true);
  // 负高度按从上到下的行顺序保存，与 Canvas 像素顺序一致。
  view.setInt32(22, -height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 32, true);
  view.setUint32(30, 3, true);
  view.setUint32(34, rgba.byteLength, true);
  view.setUint32(54, 0x00ff0000, true);
  view.setUint32(58, 0x0000ff00, true);
  view.setUint32(62, 0x000000ff, true);
  view.setUint32(66, 0xff000000, true);
  view.setUint32(70, 0x73524742, true);
  for (let offset = 0; offset < rgba.length; offset += 4) {
    bytes[pixelOffset + offset] = rgba[offset + 2];
    bytes[pixelOffset + offset + 1] = rgba[offset + 1];
    bytes[pixelOffset + offset + 2] = rgba[offset];
    bytes[pixelOffset + offset + 3] = rgba[offset + 3];
  }
  return new Blob([bytes], { type: 'image/bmp' });
}

function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * 在渲染进程执行图片格式转换并触发保存。
 * @param params - 本机源文件、目标格式、图标尺寸与图片质量。
 * @returns 实际保存格式的转换结果，或加载、解码及保存失败原因。
 */
export async function convertImageInRenderer(params: ConvertImageInRendererParams): Promise<ConvertImageInRendererResult> {
  const { filePath, targetFormat, icoSize, quality = 1 } = params;

  try {
    const dataUrl = await window.api.loadWallpaperFile(filePath);
    if (!dataUrl) {
      return { success: false, error: 'load source image failed' };
    }

    const img = await loadImage(dataUrl);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { success: false, error: 'canvas context unavailable' };
    }

    if (targetFormat === 'ico') {
      canvas.width = icoSize;
      canvas.height = icoSize;
      ctx.clearRect(0, 0, icoSize, icoSize);

      const ratio = Math.min(icoSize / img.width, icoSize / img.height);
      const drawWidth = Math.max(1, Math.round(img.width * ratio));
      const drawHeight = Math.max(1, Math.round(img.height * ratio));
      const dx = Math.floor((icoSize - drawWidth) / 2);
      const dy = Math.floor((icoSize - drawHeight) / 2);
      ctx.drawImage(img, dx, dy, drawWidth, drawHeight);

      const pngBlob = await canvasToBlob(canvas, 'image/png', 1);
      const icoBlob = await buildIcoBlobFromPng(pngBlob, icoSize);
      const outputName = `${getFileBaseName(filePath)}-${icoSize}x${icoSize}.ico`;
      triggerBlobDownload(icoBlob, outputName);
      return {
        success: true,
        outputPath: outputName,
        fileSize: icoBlob.size,
      };
    }

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const mime = { jpg: 'image/jpeg', webp: 'image/webp', png: 'image/png', bmp: 'image/bmp' }[targetFormat];

    const blob = targetFormat === 'bmp' ? canvasToBmp(canvas, ctx) : await canvasToBlob(canvas, mime, quality);
    const outputName = `${getFileBaseName(filePath)}.${targetFormat}`;
    triggerBlobDownload(blob, outputName);

    return {
      success: true,
      outputPath: outputName,
      fileSize: blob.size,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: message || 'convert failed',
    };
  }
}
