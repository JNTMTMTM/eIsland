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

import { mkdir, readFile, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import en from '../i18n/en-US.json';
import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import type { BrowserWindow } from 'electron';

/**
 * 记录实际设置切换后的逐帧轮廓和内容间距，验证中间态而非仅检查最终类名。
 * @param page - 实际灵动岛页面。
 * @returns 默认动画时长内采集的样式样本。
 */
async function sampleCornerMorph(page: Page): Promise<Array<{ clip: string; padding: number }>> {
  return page.evaluate(async () => {
    const node = document.querySelector('.island-shell');
    if (!node) throw new Error('Island shell is required');
    const frames: Array<{ clip: string; padding: number }> = [];
    const start = performance.now();
    await new Promise<void>((resolve) => {
      const sample = (): void => {
        const style = getComputedStyle(node);
        frames.push({ clip: style.clipPath, padding: parseFloat(style.paddingInlineStart) });
        if (performance.now() - start < 800) requestAnimationFrame(sample);
        else resolve();
      };
      requestAnimationFrame(sample);
    });
    return frames;
  });
}

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

test('concave music glow follows both sides of the notch and pill outlines', async ({ desktop }) => {
  const page = desktop.main;
  const standalone = await desktop.openStandalone();
  await standalone.evaluate(() => window.api.storeWrite('island-corner-style', 'concave'));
  const shell = page.locator('.island-shell');
  await expectConcaveOutline(page);
  // 使用实色光带隔离旋转时序，像素断言仍经过真实壳层、遮罩和反弧裁切。
  await page.addStyleTag({ content: `
    .island-shell { --color-island-bg: #000; }
    .island-shell > * { visibility: hidden; }
    .island-shell.music-glow::after { background: #fff; animation: none; transition: none; }
  ` });
  await (['notch', 'pill'] as const).reduce(async (previous, shape) => {
    await previous;
    await page.evaluate((value) => window.api.shapeModeSet(value), shape);
    await expect(shell).toHaveCSS('padding-left', shape === 'notch' ? '16px' : '0px');
    await expect.poll(() => page.evaluate(() => innerHeight)).toBe(shape === 'notch' ? 42 : 52);
    await shell.evaluate((node) => node.classList.add('music-glow'));
    const screenshot = await shell.screenshot({ omitBackground: true, scale: 'css' });
    const pixels = await page.evaluate(async ({ encoded, shape }) => {
      const response = await fetch(`data:image/png;base64,${encoded}`);
      const bitmap = await createImageBitmap(await response.blob());
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas context is required');
      context.drawImage(bitmap, 0, 0);
      const brightness = (x: number, y: number): number => {
        const [red, , , alpha] = context.getImageData(x, y, 1, 1).data;
        return red * alpha / 255;
      };
      const side = shape === 'notch' ? 17 : 1;
      const result = {
        left: brightness(side, bitmap.height / 2),
        right: brightness(bitmap.width - side - 1, bitmap.height / 2),
        bottom: brightness(bitmap.width / 2, bitmap.height - 2),
        center: brightness(bitmap.width / 2, bitmap.height / 2),
        upperEdge: shape === 'notch' ? brightness(13, 5) : brightness(bitmap.width / 2, 1),
      };
      bitmap.close();
      return result;
    }, { shape, encoded: screenshot.toString('base64') });
    expect(pixels.left).toBeGreaterThan(200);
    expect(pixels.right).toBeGreaterThan(200);
    expect(pixels.bottom).toBeGreaterThan(200);
    expect(pixels.upperEdge).toBeGreaterThan(200);
    expect(pixels.center).toBeLessThan(10);
    await shell.evaluate((node) => node.classList.add('music-paused'));
    await expect.poll(() => shell.evaluate((node) => getComputedStyle(node, '::after').opacity)).toBe('0');
    await shell.evaluate((node) => node.classList.remove('music-glow', 'music-paused'));
  }, Promise.resolve());
  expect(desktop.rendererErrors).toEqual([]);
});

test('failed corner saves retain the committed choice and recover on retry', async ({ desktop }) => {
  const page = await desktop.openStandalone();
  await page.getByRole('button', { name: en.standalone.tabs.settings, exact: true }).click();
  await page.getByPlaceholder(en.settings.index.searchPlaceholder).fill(en.settings.app.theme.cornerStyleTitle);
  await page.locator('.settings-index-search-dropdown').getByRole('button').filter({ hasText: en.settings.app.theme.cornerStyleTitle })
    .click();
  const rounded = page.getByRole('button', { name: en.settings.app.theme.cornerStyleRounded, exact: true });
  const concave = page.getByRole('button', { name: en.settings.app.theme.cornerStyleConcave, exact: true });
  const settingFile = join(desktop.userData, 'eIsland_store', 'island-corner-style.json');
  // 空目录模拟真实写入失败；只影响此测试的临时配置目录。
  await mkdir(settingFile);
  await concave.click();
  await expect(page.getByRole('alert')).toHaveText(en.settings.app.theme.cornerStyleSaveError);
  await expect(rounded).toHaveAttribute('aria-pressed', 'true');
  await expect(desktop.main.locator('.island-shell')).toHaveClass(/\bcorners-rounded\b/);
  await rmdir(settingFile);
  await concave.click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(concave).toHaveAttribute('aria-pressed', 'true');
  await expectConcaveOutline(desktop.main);
  expect(JSON.parse(await readFile(settingFile, 'utf8'))).toBe('concave');
  await desktop.restart();
  await expectConcaveOutline(desktop.main);
  expect(desktop.rendererErrors).toEqual([]);
});

test('theme corner selector is searchable, morphs smoothly in both directions and survives restart', async ({ desktop }, testInfo) => {
  const page = desktop.main;
  const shell = page.locator('.island-shell');
  const mainWindow = await desktop.app.browserWindow(page);
  await expect.poll(() => mainWindow.evaluate((win: BrowserWindow) => win.isVisible())).toBe(true);
  await expect(shell).toHaveCSS('padding-left', '0px');
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
  const forward = await sampleCornerMorph(page);
  expect(forward.some(({ padding }) => padding > 1 && padding < 15)).toBe(true);
  expect(new Set(forward.map(({ clip }) => clip)).size).toBeGreaterThan(4);
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
  const backward = await sampleCornerMorph(page);
  expect(backward.some(({ padding }) => padding > 1 && padding < 15)).toBe(true);
  expect(new Set(backward.map(({ clip }) => clip)).size).toBeGreaterThan(4);
  await expect(shell).toHaveCSS('padding-left', '0px');
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
  await expect(page.locator('.island-shell')).toHaveCSS('clip-path', /^shape\(/);
  await expect(page.locator('.island-shell')).toHaveCSS('padding-left', '0px');
  await page.evaluate(() => window.api.shapeModeSet('notch'));
  await expectConcaveOutline(page);
  await standalone.evaluate(() => window.api.storeWrite('island-corner-style', 'rounded'));
  await expect(page.locator('.island-shell')).toHaveCSS('padding-left', '0px');
  await standalone.evaluate(() => window.api.storeWrite('island-corner-style', 'unknown'));
  await expect(page.locator('.island-shell')).toHaveCSS('padding-left', '0px');
  await page.evaluate(() => window.api.shapeModeSet('pill'));
  await expect(page.locator('.island-shell')).toHaveCSS('border-radius', '21px');
  expect(desktop.rendererErrors).toEqual([]);
});

test('pill to concave notch interpolates the outline and spacing and can reverse mid-flight', async ({ desktop }) => {
  const page = desktop.main;
  const standalone = await desktop.openStandalone();
  await standalone.evaluate(async () => {
    await window.api.storeWrite('island-corner-style', 'concave');
    await window.api.animationSpeedSet('slow');
  });
  await page.evaluate(() => window.api.shapeModeSet('pill'));
  const shell = page.locator('.island-shell');
  await expect(shell).toHaveCSS('padding-left', '0px');
  await expect.poll(() => page.evaluate(() => window.api.getWindowBounds())).toMatchObject({ y: 46, height: 52 });
  const samples = await page.evaluate(async () => {
    const node = document.querySelector<HTMLElement>('.island-shell');
    if (!node) throw new Error('Island shell is required');
    const frames: Array<{ clip: string; padding: number; height: number }> = [];
    await window.api.shapeModeSet('notch');
    const start = performance.now();
    await new Promise<void>((resolve) => {
      const sample = (): void => {
        const style = getComputedStyle(node);
        frames.push({ clip: style.clipPath, padding: parseFloat(style.paddingInlineStart), height: parseFloat(style.height) });
        if (performance.now() - start < 1200) requestAnimationFrame(sample);
        else resolve();
      };
      requestAnimationFrame(sample);
    });
    return frames;
  });
  expect(samples.some(({ padding }) => padding > 1 && padding < 15)).toBe(true);
  expect(samples.some(({ height }) => height > 43 && height < 51)).toBe(true);
  expect(new Set(samples.map(({ clip }) => clip)).size).toBeGreaterThan(4);
  await expectConcaveOutline(page);
  await expect.poll(() => page.evaluate(() => window.api.getWindowBounds())).toMatchObject({ y: 0, height: 42 });
  await page.evaluate(async () => {
    await window.api.shapeModeSet('pill');
    // 在形变实际开始后反向，覆盖从当前插值轮廓继续过渡的路径。
    await new Promise<void>((resolve) => {
      const waitForIntermediate = (): void => {
        const node = document.querySelector('.island-shell');
        if (node && parseFloat(getComputedStyle(node).paddingInlineStart) < 12) resolve();
        else requestAnimationFrame(waitForIntermediate);
      };
      requestAnimationFrame(waitForIntermediate);
    });
    await window.api.shapeModeSet('notch');
  });
  await expectConcaveOutline(page);
  await expect(shell).toHaveCSS('padding-left', '16px');
  await expect.poll(() => page.evaluate(() => window.api.getWindowBounds())).toMatchObject({ y: 0, height: 42 });
  expect(desktop.rendererErrors).toEqual([]);
});
