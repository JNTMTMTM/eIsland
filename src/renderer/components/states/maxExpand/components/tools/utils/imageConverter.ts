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

    const mime = targetFormat === 'jpg'
      ? 'image/jpeg'
      : targetFormat === 'webp'
        ? 'image/webp'
        : targetFormat === 'bmp'
          ? 'image/bmp'
          : 'image/png';

    const blob = await canvasToBlob(canvas, mime, quality);
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
