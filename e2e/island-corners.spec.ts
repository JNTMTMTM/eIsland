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
 * @file island-corners.spec.ts
 * @description 真实 Electron 边角配置、轮廓裁切、跨窗口同步、缩放与持久化回归。
 * @author 鸡哥
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import en from '../i18n/en-US.json';
import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import type { BrowserWindow } from 'electron';

/**
 * 验证反弧形实际命中区域：顶部肩部可见，侧边及底部外角透明，主体仍可交互。
 * @param page - 实际灵动岛页面。
 */
async function expectConcaveOutline(page: Page): Promise<void> {
  const shell = page.locator('.island-shell');
  await expect(shell).toHaveCSS('clip-path', /^shape\(/);
  await expect.poll(() => shell.evaluate((node) => {
    const { x, y, width, height } = node.getBoundingClientRect();
    const hits = (dx: number, dy: number): boolean => {
      const hit = document.elementFromPoint(x + dx, y + dy);
      return hit === node || (hit !== null && node.contains(hit));
    };
    return {
      topLeft: hits(8, 1), topRight: hits(width - 8, 1),
      leftCutout: hits(2, 20), rightCutout: hits(width - 2, 20),
      bottomLeft: hits(17, height - 1), bottomRight: hits(width - 17, height - 1),
      center: hits(width / 2, height / 2),
    };
  })).toEqual({
    topLeft: true, topRight: true, leftCutout: false, rightCutout: false,
    bottomLeft: false, bottomRight: false, center: true,
  });
}

test('theme corner selector is searchable, switches immediately and survives restart', async ({ desktop }, testInfo) => {
  const page = desktop.main;
  const shell = page.locator('.island-shell');
  const mainWindow = await desktop.app.browserWindow(page);
  await expect.poll(() => mainWindow.evaluate((win: BrowserWindow) => win.isVisible())).toBe(true);
  await expect(shell).toHaveCSS('clip-path', 'none');
  await page.evaluate(() => window.api.maxexpandMouseleaveIdleSet(false));
  await desktop.app.evaluate(({ BrowserWindow }) => {
    const main = BrowserWindow.getAllWindows().find((win) => win.webContents.getURL().endsWith('DynamicIslandIndex.html'));
    main?.webContents.send('settings:changed', 'shortcut:open-clipboard-history', null);
  });
  await expect.poll(() => page.evaluate(() => innerHeight)).toBe(400);
  await page.getByRole('button', { name: en.maxExpand.nav.switchTo.replace('{{label}}', en.maxExpand.nav.settings), exact: true }).click();
  await page.getByPlaceholder(en.settings.index.searchPlaceholder).fill(en.settings.app.theme.cornerStyleTitle);
  await page.locator('.settings-index-search-dropdown').getByRole('button').filter({ hasText: en.settings.app.theme.cornerStyleTitle })
    .click();
  const rounded = page.getByRole('button', { name: en.settings.app.theme.cornerStyleRounded, exact: true });
  const concave = page.getByRole('button', { name: en.settings.app.theme.cornerStyleConcave, exact: true });
  await expect(rounded).toHaveAttribute('aria-pressed', 'true');
  const originalBounds = await page.evaluate(() => window.api.getWindowBounds());
  await concave.click();
  await expect(concave).toHaveAttribute('aria-pressed', 'true');
  await expectConcaveOutline(page);
  expect(await page.evaluate(() => window.api.getWindowBounds())).toEqual(originalBounds);
  await [50, 150, 100].reduce(async (previous, scale) => {
    await previous;
    await page.evaluate((value) => window.api.islandScaleSet(value), scale);
    await expectConcaveOutline(page);
    await expect(rounded).toBeInViewport();
    await expect(concave).toBeInViewport();
  }, Promise.resolve());
  await page.screenshot({ path: testInfo.outputPath('concave-settings.png') });
  await rounded.click();
  await expect(shell).toHaveCSS('clip-path', 'none');
  await concave.click();
  await expect.poll(async (): Promise<unknown> => JSON.parse(await readFile(join(desktop.userData, 'eIsland_store', 'island-corner-style.json'), 'utf8')) as unknown).toBe('concave');
  await page.evaluate(async () => {
    await window.api.idleClickExpandSet(true);
  });
  await desktop.restart();
  const restartedWindow = await desktop.app.browserWindow(desktop.main);
  await expect.poll(() => restartedWindow.evaluate((win: BrowserWindow) => win.isVisible())).toBe(true);
  await expectConcaveOutline(desktop.main);
  await desktop.main.screenshot({ path: testInfo.outputPath('concave-idle.png') });
  await restartedWindow.evaluate((win: BrowserWindow) => win.webContents.send('settings:changed', 'notification:show', {
    title: 'Corner regression', body: 'Notification uses the same concave outline.',
  }));
  await expect(desktop.main.locator('.island-shell')).toHaveClass(/\bnotification\b/);
  await expect.poll(() => desktop.main.evaluate(() => innerHeight)).toBe(88);
  await expectConcaveOutline(desktop.main);
  expect(desktop.rendererErrors).toEqual([]);
});

test('concave corners adapt to theme, media, zoom and pill with live cross-window updates', async ({ desktop }, testInfo) => {
  const page = desktop.main;
  const standalone = await desktop.openStandalone();
  // 使用真实 Agent 设置工具，确保已注册的通用配置广播也覆盖调用窗口。
  const result = await standalone.evaluate(() => window.api.executeAgentLocalTool({
    tool: 'island.settings.write', arguments: { key: 'island-corner-style', value: 'concave' },
  }));
  expect(result).toMatchObject({ success: true });
  await expectConcaveOutline(page);
  await (['light', 'dark'] as const).reduce(async (previous, mode) => {
    await previous;
    await standalone.evaluate((value) => window.api.themeModeSet(value), mode);
    await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
    await expectConcaveOutline(page);
  }, Promise.resolve());
  // 图片和视频均置于壳层内，统一裁切，无需为不同背景复制边角。
  await standalone.evaluate(async () => {
    await window.api.storeWrite('island-bg-media', { type: 'image', source: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><path fill="red" d="M0 0h2v2H0z"/></svg>')}` });
    await window.api.storeWrite('island-bg-opacity', 100);
  });
  await expect(page.locator('#island-bg-layer')).toHaveCSS('background-image', /data:image\/svg\+xml/);
  await expectConcaveOutline(page);
  await [50, 75, 150, 100].reduce(async (previous, scale) => {
    await previous;
    await page.evaluate((value) => window.api.islandScaleSet(value), scale);
    await expectConcaveOutline(page);
    await expect.poll(() => page.evaluate(() => window.api.getWindowBounds())).toMatchObject({ width: 260 * scale / 100 });
  }, Promise.resolve());
  await page.screenshot({ path: testInfo.outputPath('concave-media.png') });
  // 复用应用自带视频，避免依赖录制时序或外部网络。
  const videoSource = `data:video/webm;base64,${(await readFile(join(__dirname, '..', 'src', 'renderer', 'public', 'video', 'sign.webm'))).toString('base64')}`;
  await standalone.evaluate((source) => window.api.storeWrite('island-bg-media', { source, type: 'video' }), videoSource);
  const video = page.locator('.island-bg-video');
  await expect(video).toBeAttached();
  await expect.poll(() => video.evaluate((node: HTMLVideoElement) => ({
    ready: node.readyState >= 2, error: node.error?.message ?? null,
  }))).toEqual({ ready: true, error: null });
  await expectConcaveOutline(page);
  await page.evaluate(() => window.api.shapeModeSet('pill'));
  await expect(page.locator('.island-shell')).toHaveCSS('clip-path', 'none');
  await expect(page.locator('.island-shell')).toHaveCSS('padding-left', '0px');
  await page.evaluate(() => window.api.shapeModeSet('notch'));
  await expectConcaveOutline(page);
  await standalone.evaluate(() => window.api.storeWrite('island-corner-style', 'rounded'));
  await expect(page.locator('.island-shell')).toHaveCSS('clip-path', 'none');
  await standalone.evaluate(() => window.api.storeWrite('island-corner-style', 'unknown'));
  await expect(page.locator('.island-shell')).toHaveCSS('clip-path', 'none');
  expect(desktop.rendererErrors).toEqual([]);
});
