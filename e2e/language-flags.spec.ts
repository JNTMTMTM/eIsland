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
 * @file language-flags.spec.ts
 * @description 验证打包后的国旗 SVG 资源、旗面完整性及明暗主题显示。
 * @author 鸡哥
 */

import en from '../i18n/en-US.json';
import { test, expect } from './fixtures';

test('language flags load as full rectangular SVGs in both themes', async ({ desktop }, testInfo) => {
  const page = await desktop.openStandalone();
  await page.getByRole('button', { name: en.standalone.tabs.settings, exact: true }).click();
  await page.getByPlaceholder(en.settings.index.searchPlaceholder).fill(en.settings.language.title);
  await page.locator('.settings-index-search-dropdown').getByRole('button').filter({ hasText: en.settings.language.title })
    .click();
  const flags = page.locator('.settings-language-flag-icon');
  await expect(flags).toHaveCount(4);
  await (['dark', 'light'] as const).reduce(async (previous, theme) => {
    await previous;
    await desktop.main.evaluate((mode) => window.api.themeModeSet(mode), theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const results = await flags.evaluateAll(async (nodes) => Promise.all(nodes.map(async (node) => {
      const image = node as HTMLImageElement;
      await image.decode();
      const style = getComputedStyle(image);
      return { ratio: image.naturalWidth / image.naturalHeight, filter: style.filter, opacity: style.opacity };
    })));
    results.forEach((result) => {
      expect(result.ratio).toBeCloseTo(4 / 3);
      expect(result.filter).toBe('none');
      expect(result.opacity).toBe('1');
    });
    await page.locator('.settings-card').filter({ has: page.getByText(en.settings.language.title, { exact: true }) })
      .screenshot({ path: testInfo.outputPath(`flags-${theme}.png`) });
  }, Promise.resolve());
  const images = await page.evaluate(async () => Promise.all(['CHN', 'USA', 'JP', 'KR', 'FR', 'DE', 'ES', 'RU'].map(async (code) => {
    const image = new Image();
    image.src = `../svg/countries/${code}.svg`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 48;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas context is required');
    context.drawImage(image, 0, 0, 64, 48);
    const alpha = [[1, 24], [62, 24], [32, 1], [32, 46]].map(([x, y]) => context.getImageData(x, y, 1, 1).data[3]);
    return { code, alpha };
  })));
  images.forEach(({ code, alpha }) => expect(alpha, code).toEqual([255, 255, 255, 255]));
  expect(desktop.rendererErrors).toEqual([]);
});
