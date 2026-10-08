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
 * @file screenshot.test.ts
 * @description Windows 截图助手原生模块单元测试
 * @author 鸡哥
 */

import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const loadNative = createRequire(import.meta.url);
const isWindows = process.platform === 'win32';
/** Target framework moniker — keep in sync with eIslandScreenshotHelper.csproj */
const TFM = 'net10.0-windows10.0.19041.0';
const nativeDllPath = path.join(__dirname, '..', 'src', 'bin', 'Release', TFM, 'win-x64', 'native', 'eIslandScreenshotHelper.dll');
const hasNativeDll = fs.existsSync(nativeDllPath);

interface ScreenshotResult {
  data: Buffer;
  size: number;
  format: 'png';
}

const screenshot = isWindows && hasNativeDll
  ? (loadNative('../index.js') as {
    capturePrimaryDisplayPng(): ScreenshotResult | null;
    captureAllDisplaysPng(): ScreenshotResult | null;
    getVisibleWindows(): Array<{
      hwnd: string;
      title: string;
      processId: number;
      x: number;
      y: number;
      width: number;
      height: number;
    }>;
    getLastError(): string;
  })
  : null;

function expectValidPng(result: ScreenshotResult): void {
  expect(Buffer.isBuffer(result.data)).toBe(true);
  expect(result.data.length).toBeGreaterThan(0);
  expect(result.data[0]).toBe(0x89);
  expect(result.data[1]).toBe(0x50);
  expect(result.data[2]).toBe(0x4e);
  expect(result.data[3]).toBe(0x47);
  expect(result.size).toBe(result.data.length);
  expect(result.format).toBe('png');
}

describe.skipIf(!isWindows || !hasNativeDll)('@eisland/windows-screenshot-helper', () => {
  const mod = screenshot!;

  it('exports expected functions', () => {
    expect(typeof mod.capturePrimaryDisplayPng).toBe('function');
    expect(typeof mod.captureAllDisplaysPng).toBe('function');
    expect(typeof mod.getVisibleWindows).toBe('function');
    expect(typeof mod.getLastError).toBe('function');
  });

  it('captures primary display as PNG buffer', () => {
    const result = mod.capturePrimaryDisplayPng();
    expect(result).not.toBeNull();
    if (result) expectValidPng(result);
  });

  it('captures all displays as PNG buffer', () => {
    const result = mod.captureAllDisplaysPng();
    expect(result).not.toBeNull();
    if (result) expectValidPng(result);
  });

  it('both captures contain valid PNG dimensions', () => {
    const primary = mod.capturePrimaryDisplayPng();
    const all = mod.captureAllDisplaysPng();
    expect(primary).not.toBeNull();
    expect(all).not.toBeNull();
    if (primary && all) {
      // PNG 压缩大小受画面和采样时刻影响，IHDR 才记录真实图像尺寸。
      [primary, all].forEach((result) => {
        expectValidPng(result);
        expect(result.data.subarray(12, 16).toString('ascii')).toBe('IHDR');
        expect(result.data.readUInt32BE(16)).toBeGreaterThan(0);
        expect(result.data.readUInt32BE(20)).toBeGreaterThan(0);
      });
    }
  });

  it('returns visible window bounds list', () => {
    const windows = mod.getVisibleWindows();
    expect(Array.isArray(windows)).toBe(true);
    windows.forEach((item) => {
      expect(typeof item.hwnd).toBe('string');
      expect(typeof item.title).toBe('string');
      expect(typeof item.processId).toBe('number');
      expect(typeof item.x).toBe('number');
      expect(typeof item.y).toBe('number');
      expect(item.width).toBeGreaterThan(0);
      expect(item.height).toBeGreaterThan(0);
    });
  });

  it('does not throw on repeated capture', () => {
    expect(() => mod.capturePrimaryDisplayPng()).not.toThrow();
    expect(() => mod.capturePrimaryDisplayPng()).not.toThrow();
  });

  it('returns empty error string after successful capture', () => {
    const result = mod.capturePrimaryDisplayPng();
    if (result) {
      expect(mod.getLastError()).toBe('');
    }
  });
});
