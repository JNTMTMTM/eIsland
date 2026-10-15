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
 * @file windows.spec.ts
 * @description 验证 Windows 原生窗口裁剪、真实光标悬停与全局快捷键。
 * @author 鸡哥
 */

import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { test as desktopTest, expect } from './fixtures';
import type { BrowserWindow } from 'electron';
import type { Bounds, Point } from '../src/preload/types';

const execFileAsync = promisify(execFile);

/**
 * 调用系统探针，不把页面内合成输入当成 Windows 输入。
 * @param args - 探针操作及参数。
 * @returns 探针的标准输出。
 */
async function nativeInput(...args: string[]): Promise<string> {
  // 使用系统自带的 5.1，避免额外安装 PowerShell 7 或依赖用户 PATH。
  const powershell = resolve(process.env.SystemRoot ?? 'C:\\Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe');
  const { stdout } = await execFileAsync(powershell, [
    '-NoProfile', '-NonInteractive', '-File', resolve('e2e/windows-input.ps1'), ...args,
  ], { windowsHide: true, timeout: 15_000 });
  return stdout;
}

const test = desktopTest.extend<{ cursorGuard: void }>({
  cursorGuard: [async ({ desktop }, use) => {
    const original = JSON.parse(await nativeInput('-Action', 'cursor')) as Point;
    const parked = await desktop.app.evaluate(({ screen }) => {
      const { workArea } = screen.getPrimaryDisplay();
      return screen.dipToScreenPoint({ x: workArea.x + workArea.width - 10, y: workArea.y + workArea.height - 10 });
    });
    try {
      await nativeInput('-Action', 'move', '-X', String(parked.x), '-Y', String(parked.y));
      await use();
    } finally {
      await nativeInput('-Action', 'move', '-X', String(original.x), '-Y', String(original.y));
    }
  }, { auto: true }],
});

test.skip(process.platform !== 'win32', 'Requires the Windows graphical desktop and Win32 APIs.');

[100, 75, 150].forEach((scale) => test(`clips the native Windows region at ${scale}% when expanding and collapsing`, async ({ desktop }) => {
  await desktop.main.evaluate((value) => window.api.islandScaleSet(value), scale);
  const mainWindow = await desktop.app.browserWindow(desktop.main);
  const handle = await mainWindow.evaluate((win: BrowserWindow) => win.getNativeWindowHandle().readBigUInt64LE().toString());
  const initial = await desktop.main.evaluate(() => window.api.getWindowBounds());
  expect(await mainWindow.evaluate((win: BrowserWindow) => win.isAlwaysOnTop())).toBe(true);
  expect(await mainWindow.evaluate((win: BrowserWindow) => win.getBounds().width)).toBeGreaterThan(initial.width);

  const verifyRegion = async (): Promise<void> => {
    const visible = await desktop.main.evaluate(() => window.api.getWindowBounds());
    const physical = await desktop.app.evaluate(({ screen, BrowserWindow }, bounds) => {
      const main = BrowserWindow.getAllWindows().find((win) => win.webContents.getURL().endsWith('DynamicIslandIndex.html'));
      return screen.dipToScreenRect(main ?? null, bounds);
    }, visible);
    await expect.poll(async () => JSON.parse(await nativeInput('-Action', 'region', '-WindowHandle', handle)) as Bounds).toEqual(physical);
    expect(visible.x + visible.width / 2).toBe(initial.x + initial.width / 2);
  };

  await verifyRegion();
  await desktop.main.evaluate(() => window.api.expandWindowSettings());
  await expect.poll(() => desktop.main.evaluate(() => window.api.getWindowBounds())).toMatchObject({ width: Math.round(860 * scale / 100), height: Math.round(400 * scale / 100) });
  await verifyRegion();
  await desktop.main.evaluate(() => window.api.collapseWindow());
  await expect.poll(() => desktop.main.evaluate(() => window.api.getWindowBounds())).toEqual(initial);
  await verifyRegion();
  expect(desktop.rendererErrors).toEqual([]);
}));

[100, 75, 150].forEach((scale) => test(`keeps the pill aligned with its native clip while moving at ${scale}%`, async ({ desktop }, testInfo) => {
  await desktop.main.evaluate(async (value) => {
    await window.api.shapeModeSet('pill');
    await window.api.islandScaleSet(value);
  }, scale);
  await desktop.restart();
  const mainWindow = await desktop.app.browserWindow(desktop.main);
  const handle = await mainWindow.evaluate((win: BrowserWindow) => win.getNativeWindowHandle().readBigUInt64LE().toString());
  const initial = await desktop.main.evaluate(() => window.api.getWindowBounds());
  expect(initial).toMatchObject({ width: Math.round(260 * scale / 100), height: Math.round(52 * scale / 100) });
  const backingWidth = await mainWindow.evaluate((win: BrowserWindow) => win.getBounds().width);

  const verifyAlignment = async (): Promise<void> => {
    const visible = await desktop.main.evaluate(() => window.api.getWindowBounds());
    const frame = await mainWindow.evaluate((win: BrowserWindow) => win.getBounds());
    expect(frame.width).toBe(backingWidth);
    expect(frame.height).toBe(visible.height);
    const physical = await desktop.app.evaluate(({ screen, BrowserWindow }, bounds) => {
      const main = BrowserWindow.getAllWindows().find((win) => win.webContents.getURL().endsWith('DynamicIslandIndex.html'));
      return screen.dipToScreenRect(main ?? null, bounds);
    }, visible);
    await expect.poll(async () => JSON.parse(await nativeInput('-Action', 'region', '-WindowHandle', handle)) as Bounds).toEqual(physical);
    const shell = await desktop.main.locator('.island-shell').boundingBox();
    expect(shell).not.toBeNull();
    if (!shell) throw new Error('Missing island shell');
    expect(Math.abs(frame.x + (shell.x + shell.width / 2) * scale / 100 - visible.x - visible.width / 2)).toBeLessThanOrEqual(1);
  };

  const moveRepeatedly = async (): Promise<void> => {
    const before = await desktop.main.evaluate(() => window.api.getWindowBounds());
    const after = await desktop.main.evaluate(async () => {
      Array.from({ length: 40 }).forEach(() => window.api.moveWindowDelta(2, 1));
      return window.api.getWindowBounds();
    });
    expect(after).toEqual({ ...before, x: before.x + 80, y: before.y + 40 });
    await verifyAlignment();
  };

  await verifyAlignment();
  await moveRepeatedly();
  await desktop.main.evaluate(() => window.api.expandWindowSettings());
  await expect.poll(() => desktop.main.evaluate(() => window.api.getWindowBounds())).toMatchObject({ width: Math.round(860 * scale / 100), height: Math.round(416 * scale / 100) });
  await moveRepeatedly();
  await desktop.main.evaluate(() => window.api.collapseWindow());
  await expect.poll(() => desktop.main.evaluate(() => window.api.getWindowBounds())).toMatchObject({ width: initial.width, height: initial.height });
  await moveRepeatedly();
  await desktop.main.screenshot({ path: testInfo.outputPath(`pill-drag-${scale}.png`) });
  expect(desktop.rendererErrors).toEqual([]);
}));

test('uses the real desktop cursor to enter and leave the visible island', async ({ desktop }) => {
  await desktop.main.evaluate(() => window.api.islandScaleSet(75));
  const shell = desktop.main.locator('.island-shell');
  const initial = await desktop.main.evaluate(() => window.api.getWindowBounds());
  const center = { x: Math.round(initial.x + initial.width / 2), y: Math.round(initial.y + initial.height / 2) };
  const physical = await desktop.app.evaluate(({ screen }, point) => screen.dipToScreenPoint(point), center);
  await nativeInput('-Action', 'move', '-X', String(physical.x), '-Y', String(physical.y));
  await expect.poll(() => desktop.main.evaluate(() => window.api.getMousePosition())).toEqual(center);
  await expect(shell).toHaveClass(/\bhover\b/);
  const expanded = await desktop.main.evaluate(() => window.api.getWindowBounds());
  expect(expanded.width).toBeGreaterThan(initial.width);

  // 指针位于预留 backing window 内、可见区域外，不能继续维持 hover。
  const outside = { x: initial.x - 150, y: initial.y + initial.height / 2 };
  const outsidePhysical = await desktop.app.evaluate(({ screen }, point) => screen.dipToScreenPoint(point), outside);
  await nativeInput('-Action', 'move', '-X', String(outsidePhysical.x), '-Y', String(outsidePhysical.y));
  await expect(shell).not.toHaveClass(/\bhover\b/);
  await expect.poll(() => desktop.main.evaluate(() => window.api.getWindowBounds())).toEqual(initial);
  expect(desktop.rendererErrors).toEqual([]);
});

test('hides and restores the island using a real Windows global shortcut and unregisters it', async ({ desktop }) => {
  const mainWindow = await desktop.app.browserWindow(desktop.main);
  const accelerator = 'Control+Alt+Shift+F11';
  expect(await desktop.main.evaluate((key) => window.api.hotkeySet(key), accelerator)).toBe(true);
  try {
    expect(await desktop.app.evaluate(({ globalShortcut }, key) => globalShortcut.isRegistered(key), accelerator)).toBe(true);
    const standalone = await desktop.openStandalone();
    const standaloneWindow = await desktop.app.browserWindow(standalone);
    await standaloneWindow.evaluate((win: BrowserWindow) => win.focus());
    await expect.poll(() => standaloneWindow.evaluate((win: BrowserWindow) => win.isFocused())).toBe(true);
    await expect.poll(() => mainWindow.evaluate((win: BrowserWindow) => win.isVisible())).toBe(true);
    await nativeInput('-Action', 'shortcut');
    await expect.poll(() => mainWindow.evaluate((win: BrowserWindow) => win.isVisible())).toBe(false);
    await nativeInput('-Action', 'shortcut');
    await expect.poll(() => mainWindow.evaluate((win: BrowserWindow) => win.isVisible())).toBe(true);
  } finally {
    expect(await desktop.main.evaluate(() => window.api.hotkeySet(''))).toBe(true);
  }
  expect(await desktop.app.evaluate(({ globalShortcut }, key) => globalShortcut.isRegistered(key), accelerator)).toBe(false);
  expect(desktop.rendererErrors).toEqual([]);
});
