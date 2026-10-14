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
 * @file island-scale.spec.ts
 * @description 真实 Electron 缩放设置、窗口几何、独立窗口隔离与重启恢复测试。
 * @author 鸡哥
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import en from '../i18n/en-US.json';
import { test, expect } from './fixtures';
import type { BrowserWindow } from 'electron';

test('scales all island views, saves the slider and restores scale after restart', async ({ desktop }, testInfo) => {
  const page = desktop.main;
  await page.evaluate(() => window.api.maxexpandMouseleaveIdleSet(false));
  await desktop.app.evaluate(({ BrowserWindow }) => {
    const main = BrowserWindow.getAllWindows().find((win) => win.webContents.getURL().endsWith('DynamicIslandIndex.html'));
    main?.webContents.send('settings:changed', 'shortcut:open-clipboard-history', null);
  });
  await expect(page.locator('.settings-content')).toBeVisible();
  await page.getByRole('button', { name: en.maxExpand.nav.switchTo.replace('{{label}}', en.maxExpand.nav.settings), exact: true }).click();
  await page.locator('.max-expand-settings-sidebar').getByRole('button', { name: en.settings.labels.app, exact: true }).click();
  await page.getByRole('button', { name: en.settings.navigation.expand, exact: true }).click();
  await page.getByRole('button', { name: en.settings.labels.position, exact: true }).click();
  const slider = page.getByRole('slider', { name: en.settings.app.position.scaleTitle });
  await expect(slider).toHaveValue('100');
  await slider.fill('75');
  await expect.poll(() => page.evaluate(() => window.api.islandScaleGet())).toBe(75);
  const mainWindow = await desktop.app.browserWindow(page);
  await expect.poll(() => mainWindow.evaluate((win: BrowserWindow) => win.webContents.getZoomFactor())).toBeCloseTo(0.75);
  await expect.poll(() => page.evaluate(() => window.api.getWindowBounds())).toMatchObject({ width: 645, height: 300 });
  const notch = await page.evaluate(() => window.api.getWindowBounds());
  await page.evaluate(() => window.api.shapeModeSet('pill'));
  await expect.poll(() => page.evaluate(() => window.api.getWindowBounds())).toMatchObject({ width: 645, height: 312 });
  await page.evaluate(() => window.api.shapeModeSet('notch'));
  await expect.poll(() => page.evaluate(() => window.api.getWindowBounds())).toEqual(notch);
  expect(JSON.parse(await readFile(join(desktop.userData, 'eIsland_store', 'island-scale.json'), 'utf8'))).toBe(75);
  await page.screenshot({ path: testInfo.outputPath('scale-75.png') });
  const standalone = await desktop.openStandalone();
  const standaloneWindow = await desktop.app.browserWindow(standalone);
  expect(await standaloneWindow.evaluate((win: BrowserWindow) => win.webContents.getZoomFactor())).toBe(1);
  await page.getByRole('button', { name: en.settings.app.position.scaleReset, exact: true }).click();
  await expect(slider).toHaveValue('100');
  await expect.poll(() => page.evaluate(() => window.api.islandScaleGet())).toBe(100);
  await slider.fill('50');
  await expect.poll(() => page.evaluate(() => window.api.getWindowBounds())).toMatchObject({ width: 430, height: 200 });
  await page.screenshot({ path: testInfo.outputPath('scale-50.png') });
  await [50, 150, 100].reduce(async (previous, scale) => {
    await previous;
    await page.evaluate((value) => window.api.islandScaleSet(value), scale);
    const states = { collapseWindow: 260, expandWindow: 500, expandWindowNotification: 500, expandWindowLyrics: 500, expandWindowLyricsTranslation: 500, expandWindowFull: 860, expandWindowSettings: 860 } as const;
    await (Object.keys(states) as Array<keyof typeof states>).reduce(async (pending, action) => {
      await pending;
      const before = await page.evaluate(() => window.api.getWindowBounds());
      await page.evaluate((name) => window.api[name](), action);
      const after = await page.evaluate(() => window.api.getWindowBounds());
      expect(Math.abs(after.x + after.width / 2 - before.x - before.width / 2)).toBeLessThanOrEqual(1);
      expect(after.width).toBe(states[action] * scale / 100);
    }, Promise.resolve());
  }, Promise.resolve());
  await page.evaluate(() => window.api.islandScaleSet(75));
  await desktop.restart();
  await expect.poll(() => desktop.main.evaluate(() => window.api.islandScaleGet())).toBe(75);
  const restarted = await desktop.app.browserWindow(desktop.main);
  expect(await restarted.evaluate((win: BrowserWindow) => win.webContents.getZoomFactor())).toBeCloseTo(0.75);
  await expect.poll(() => desktop.main.evaluate(() => window.api.getWindowBounds())).toMatchObject({ width: 195, height: 32 });
  expect(desktop.rendererErrors).toEqual([]);
});
