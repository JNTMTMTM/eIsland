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
 */

/**
 * @file calculator.spec.ts
 * @description 在真实 Electron 中验证计算器排版、历史与剪贴板、绘图及新增数学功能。
 * @author 鸡哥
 */

import en from '../i18n/en-US.json';
import type { ElectronApplication, Page } from '@playwright/test';
import { test, expect } from './fixtures';

/** 打开计算器并固定独立测试窗口的布局环境。
 * @param desktop - Electron 测试会话
 */
async function showCalculator(desktop: { main: Page; app: ElectronApplication }): Promise<void> {
  const page = desktop.main;
  await expect(page.locator('.island-shell')).toBeVisible();
  await page.evaluate(() => window.api.maxexpandMouseleaveIdleSet(false));
  await desktop.app.evaluate(({ BrowserWindow }) => {
    const main = BrowserWindow.getAllWindows().find((win) => win.webContents.getURL().endsWith('DynamicIslandIndex.html'));
    main?.webContents.send('settings:changed', 'i18n:language', 'en-US');
    main?.webContents.send('settings:changed', 'shortcut:open-clipboard-history', null);
  });
  await expect(page.locator('.settings-content')).toBeVisible();
  await page.getByRole('button', { name: en.maxExpand.nav.switchTo.replace('{{label}}', en.maxExpand.nav.calculator), exact: true }).click();
  await expect(page.locator('.calculator-panel')).toBeVisible();
  // 固定 Chromium 视口，隔离 Windows 原生裁剪区域和鼠标探测对布局断言的影响。
  const mainWindow = await desktop.app.browserWindow(page);
  await mainWindow.evaluate((win) => win.setSize(860, 400));
  await page.evaluate(() => document.fonts.ready);
}

test.beforeEach(async ({ desktop }) => showCalculator(desktop));

test('arithmetic preserves calculation and keeps all four keypad columns aligned', async ({ desktop }, testInfo) => {
  const page = desktop.main;
  const display = page.getByRole('textbox', { name: en.calculator.display.expression });
  await display.pressSequentially('12+3');
  await display.press('Enter');
  await expect(page.locator('.calc-value')).toHaveText('15');
  const columns = await page.locator('.calc-btn').evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().width));
  expect(Math.max(...columns) - Math.min(...columns)).toBeLessThan(1);
  await page.locator('.calculator-panel').screenshot({ path: testInfo.outputPath('arithmetic.png') });
  expect(desktop.rendererErrors).toEqual([]);
});

test('history survives restart, restores editable formulas and clipboard actions retain error feedback', async ({ desktop }) => {
  let page = desktop.main;
  let display = page.getByRole('textbox', { name: en.calculator.display.expression });
  await display.pressSequentially('1/3'); await display.press('Enter');
  await display.press('*'); await display.press('3'); await display.press('Enter');
  await expect(page.locator('.calc-value')).toHaveText('1');
  await page.getByRole('button', { name: en.calculator.answer.label, exact: true }).click();
  await expect(display).toHaveAttribute('aria-description', '(1)');
  await display.press('Enter'); await expect(page.locator('.calc-value')).toHaveText('1');
  await expect.poll(() => page.evaluate(async () => (await window.api.storeRead('calculator-history') as unknown[]).length)).toBe(3);
  await desktop.restart(); await showCalculator(desktop); page = desktop.main;
  display = page.getByRole('textbox', { name: en.calculator.display.expression });
  await expect.poll(() => page.getByRole('button', { name: en.calculator.history.title, exact: true }).locator('img').evaluate((icon: HTMLImageElement) => icon.complete && icon.naturalWidth > 0)).toBe(true);
  await page.getByRole('button', { name: en.calculator.history.title, exact: true }).click();
  await expect(page.locator('.calc-history-restore')).toHaveCount(3);
  await page.locator('.calc-history-restore').filter({ hasText: '1÷3' }).click();
  await expect(display).toHaveAttribute('aria-description', '1÷3');
  await display.press('Enter'); await expect(page.locator('.calc-value')).toHaveText('0.333333333333');
  await page.getByRole('button', { name: en.calculator.history.title, exact: true }).click();
  await page.getByRole('button', { name: en.calculator.history.remove }).first().click();
  await expect(page.locator('.calc-history-restore')).toHaveCount(2);
  await page.getByRole('button', { name: en.calculator.history.clear, exact: true }).click();
  await expect(page.locator('.calc-history-restore')).toHaveCount(0);
  await page.getByRole('button', { name: en.calculator.modes.arithmetic, exact: true }).click();
  await display.press('Enter');
  await page.getByRole('button', { name: en.calculator.history.title, exact: true }).click();
  await expect(page.locator('.calc-history-restore')).toHaveCount(1);
  await page.getByRole('button', { name: en.calculator.modes.arithmetic, exact: true }).click();
  // 隔离剪贴板 IPC 的数据，避免覆盖用户桌面上的剪贴板内容。
  await desktop.app.evaluate(({ ipcMain }) => {
    let clipboard = '2 * 3 / 2';
    ipcMain.removeHandler('clipboard:read-text'); ipcMain.removeHandler('clipboard:write-text');
    ipcMain.handle('clipboard:read-text', () => clipboard);
    ipcMain.handle('clipboard:write-text', (_, value: string) => { clipboard = value; return true; });
  });
  await page.getByRole('button', { name: 'C', exact: true }).click();
  await page.getByRole('button', { name: en.calculator.clipboard.paste, exact: true }).click();
  await expect(display).toHaveAttribute('aria-description', '2*3/2');
  await display.press('Enter'); await expect(page.locator('.calc-value')).toHaveText('3');
  await page.getByRole('button', { name: en.calculator.clipboard.copyResult, exact: true }).click();
  expect(await page.evaluate(() => window.api.clipboardReadText())).toBe('3');
  await page.getByRole('button', { name: 'C', exact: true }).click();
  await display.evaluate((element) => {
    const data = new DataTransfer(); data.setData('text/plain', '1/0');
    element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  });
  await display.press('Enter'); await expect(page.locator('.calc-value')).toHaveText(en.calculator.errors.divisionByZero);
  await expect(display).toHaveAttribute('aria-invalid', 'true');
  expect(desktop.rendererErrors).toEqual([]);
});

test('unit conversion, equations, complex arithmetic and matrices work through the real interface', async ({ desktop }, testInfo) => {
  const page = desktop.main;
  await page.getByRole('button', { name: en.calculator.modes.unitConversion, exact: true }).click();
  await expect(page.locator('.calc-feature-result')).toHaveText('100 cm');
  await page.getByRole('combobox', { name: en.calculator.units.category, exact: true }).selectOption('temperature');
  await page.getByRole('textbox', { name: en.calculator.units.value, exact: true }).fill('0');
  await expect(page.locator('.calc-feature-result')).toHaveText('32 °F');
  await page.locator('.calculator-panel').screenshot({ path: testInfo.outputPath('units.png') });
  await page.getByRole('button', { name: en.calculator.equation.title, exact: true }).click();
  await page.getByRole('textbox', { name: en.calculator.equation.expression, exact: true }).fill('x^2=9');
  await page.getByRole('button', { name: en.calculator.equation.solve, exact: true }).click();
  await expect(page.locator('.calc-feature-result')).toHaveText('x = -3, 3');
  await page.locator('.calculator-panel').screenshot({ path: testInfo.outputPath('equations.png') });
  await page.getByRole('button', { name: en.calculator.complex.title, exact: true }).click();
  await page.getByRole('textbox', { name: en.calculator.complex.expression, exact: true }).fill('(2+3i)*(4-i)');
  await page.getByRole('button', { name: en.calculator.complex.calculate, exact: true }).click();
  await expect(page.locator('.calc-feature-result')).toHaveText('11 + 10i');
  await page.locator('.calculator-panel').screenshot({ path: testInfo.outputPath('complex.png') });
  await page.getByRole('button', { name: en.calculator.matrix.title, exact: true }).click();
  await page.getByRole('combobox', { name: en.calculator.matrix.operation, exact: true }).selectOption('inverse');
  await page.getByRole('button', { name: en.calculator.matrix.calculate, exact: true }).click();
  await expect(page.locator('.calc-matrix-result td')).toHaveText(['-2', '1', '1.5', '-0.5']);
  await page.getByRole('combobox', { name: en.calculator.matrix.operation, exact: true }).selectOption('solve');
  await page.getByRole('textbox', { name: en.calculator.matrix.a, exact: true }).fill('2 1\n1 3');
  await page.getByRole('textbox', { name: en.calculator.matrix.b, exact: true }).fill('1\n2');
  await page.getByRole('button', { name: en.calculator.matrix.calculate, exact: true }).click();
  await expect(page.locator('.calc-matrix-result td')).toHaveText(['0.2', '0.6']);
  await page.locator('.calculator-panel').screenshot({ path: testInfo.outputPath('matrices.png') });
  const overflow = await page.locator('.calc-main').evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: en.calculator.history.title, exact: true }).click();
  await expect(page.locator('.calc-history-row[data-mode="unitConversion"]')).toHaveCount(2);
  await expect(page.locator('.calc-history-row[data-mode="equation"]')).toHaveCount(1);
  await expect(page.locator('.calc-history-row[data-mode="complex"]')).toHaveCount(1);
  await expect(page.locator('.calc-history-row[data-mode="matrix"]')).toHaveCount(2);
  await expect.poll(() => page.evaluate(async () => (await window.api.storeRead('calculator-history') as unknown[]).length)).toBe(6);
  await desktop.restart(); await showCalculator(desktop);
  const restoredPage = desktop.main;
  await restoredPage.getByRole('button', { name: en.calculator.history.title, exact: true }).click();
  await expect(restoredPage.locator('.calc-history-restore')).toHaveCount(6);
  await restoredPage.locator('.calculator-panel').screenshot({ path: testInfo.outputPath('history.png') });
  await restoredPage.locator('.calc-history-row[data-mode="unitConversion"] .calc-history-restore').filter({ hasText: '0 °C' }).click();
  await expect(restoredPage.getByRole('textbox', { name: en.calculator.units.value, exact: true })).toHaveValue('0');
  await expect(restoredPage.locator('.calc-feature-result')).toHaveText('32 °F');
  await restoredPage.getByRole('button', { name: en.calculator.history.title, exact: true }).click();
  await restoredPage.locator('.calc-history-row[data-mode="equation"] .calc-history-restore').click();
  await expect(restoredPage.getByRole('textbox', { name: en.calculator.equation.expression, exact: true })).toHaveValue('x^2=9');
  await restoredPage.getByRole('button', { name: en.calculator.history.title, exact: true }).click();
  await restoredPage.locator('.calc-history-row[data-mode="complex"] .calc-history-restore').click();
  await expect(restoredPage.getByRole('textbox', { name: en.calculator.complex.expression, exact: true })).toHaveValue('(2+3i)*(4-i)');
  await restoredPage.getByRole('button', { name: en.calculator.history.title, exact: true }).click();
  await restoredPage.locator('.calc-history-row[data-mode="matrix"] .calc-history-restore').filter({ hasText: '0.2' }).click();
  await expect(restoredPage.getByRole('combobox', { name: en.calculator.matrix.operation, exact: true })).toHaveValue('solve');
  await expect(restoredPage.getByRole('textbox', { name: en.calculator.matrix.a, exact: true })).toHaveValue('2 1\n1 3');
  await expect(restoredPage.getByRole('textbox', { name: en.calculator.matrix.b, exact: true })).toHaveValue('1\n2');
  expect(desktop.rendererErrors).toEqual([]);
});

test('scientific switches angle units, lays out nested formulas and scrolls long expressions', async ({ desktop }, testInfo) => {
  const page = desktop.main;
  const display = page.getByRole('textbox', { name: en.calculator.display.expression });
  await page.getByRole('button', { name: en.calculator.modes.scientific, exact: true }).click();
  const degree = page.getByRole('button', { name: en.calculator.angleUnit.degree, exact: true });
  const radian = page.getByRole('button', { name: en.calculator.angleUnit.radian, exact: true });
  await expect(degree).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'sin', exact: true }).click();
  await display.pressSequentially('30');
  await display.press('Enter');
  await expect(page.locator('.calc-value')).toHaveText('0.5');
  await expect(page.locator('.calc-history')).toHaveCount(0);
  await radian.click();
  await expect(radian).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.calc-value')).toHaveText('-0.988031624093');
  await expect(display).toHaveAttribute('aria-description', 'sin(30)');
  await degree.click();
  await expect(page.locator('.calc-value')).toHaveText('0.5');
  await page.locator('.calculator-panel').screenshot({ path: testInfo.outputPath('angles.png') });
  await page.getByRole('button', { name: 'C', exact: true }).click();
  await page.getByRole('button', { name: en.calculator.functions.fraction, exact: true }).click();
  await page.getByRole('button', { name: '√', exact: true }).click();
  await display.press('9');
  await display.press('ArrowRight');
  await display.press('ArrowRight');
  await display.press('2');
  await expect(display).toHaveAttribute('aria-description', 'frac(sqrt(9),2)');
  await expect(page.locator('.katex-error')).toHaveCount(0);
  const bounds = await page.locator('.calc-katex-expression').evaluate((formula) => {
    const rect = formula.getBoundingClientRect();
    const viewport = formula.closest('.calc-expression')!.getBoundingClientRect();
    return { top: rect.top - viewport.top, bottom: viewport.bottom - rect.bottom };
  });
  expect(bounds.top).toBeGreaterThanOrEqual(0);
  expect(bounds.bottom).toBeGreaterThanOrEqual(0);
  const digit = page.locator('.calc-katex-render [data-formula-anchor]').filter({ hasText: /^9$/ }).last();
  const digitBounds = await digit.boundingBox();
  if (!digitBounds) throw new Error('Missing rendered numerator');
  await digit.click({ position: { x: digitBounds.width * .8, y: digitBounds.height / 2 } });
  await display.press('Backspace');
  await display.press('4');
  await expect(display).toHaveAttribute('aria-description', 'frac(sqrt(4),2)');
  await page.locator('.calculator-panel').screenshot({ path: testInfo.outputPath('scientific.png') });
  await display.press('Enter');
  await expect(page.locator('.calc-value')).toHaveText('1');
  await page.getByRole('button', { name: 'C', exact: true }).click();
  await display.pressSequentially('1234567890'.repeat(12));
  await expect.poll(() => page.locator('.calc-expression').evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await display.press('Home');
  await expect.poll(() => page.locator('.calc-expression').evaluate((element) => element.scrollLeft)).toBe(0);
  await page.locator('.calc-expression').dispatchEvent('wheel', { deltaY: 100, bubbles: true });
  await expect(page.locator('.calculator-panel-scientific')).toBeVisible();
  expect(desktop.rendererErrors).toEqual([]);
});

test('graphing preserves the formula across modes and redraws after sidebar and panel changes', async ({ desktop }, testInfo) => {
  const page = desktop.main;
  const display = page.getByRole('textbox', { name: en.calculator.display.expression });
  await display.pressSequentially('2');
  await page.getByRole('button', { name: en.calculator.modes.coordinate, exact: true }).click();
  await expect(page.locator('.calc-function-label')).toContainText(en.calculator.angleUnit.radianShort);
  await expect(page.locator('.calc-angle-unit')).toHaveCount(0);
  await expect(display).toHaveAttribute('aria-description', '2');
  await page.getByRole('button', { name: en.calculator.coordinate.numericKeys, exact: true }).click();
  await page.getByRole('button', { name: 'C', exact: true }).click();
  await page.getByRole('button', { name: en.calculator.coordinate.scientificKeys, exact: true }).click();
  await page.getByRole('button', { name: en.calculator.functions.variable, exact: true }).click();
  await page.getByRole('button', { name: 'x²', exact: true }).click();
  await expect(display).toHaveAttribute('aria-description', 'x^2');
  await expect(page.locator('.coordinate-graph-canvas svg')).toBeVisible();
  const fitsCanvas = async (): Promise<number> => page.locator('.coordinate-graph-canvas').evaluate((canvas) => Math.abs(canvas.clientWidth - Number(canvas.querySelector('svg')?.getAttribute('width'))));
  await expect.poll(fitsCanvas).toBeLessThan(1);
  const graphSvg = await page.locator('.coordinate-graph-canvas svg').elementHandle();
  const graphWidth = await page.locator('.coordinate-graph-canvas svg').getAttribute('width');
  await page.getByRole('button', { name: en.calculator.coordinate.analysisKeys, exact: true }).click();
  await expect(page.locator('.calc-coordinate-controls .calc-graph-analysis')).toBeVisible();
  await expect(page.locator('.calc-coordinate-workspace .calc-graph-analysis')).toHaveCount(0);
  await expect(page.locator('.calc-coordinate-tabs button')).toHaveCount(3);
  await expect(page.locator('.calc-coordinate-controls .calc-buttons')).toHaveCount(0);
  const extraFunctions = 'x+2\n-x+2\nx';
  await page.getByRole('textbox', { name: en.calculator.graph.extra }).fill(extraFunctions);
  await page.getByRole('button', { name: en.calculator.graph.analyze, exact: true }).click();
  await expect(page.locator('.calc-graph-analysis')).toContainText('f1 ∩ f2');
  await page.locator('.calculator-panel').screenshot({ path: testInfo.outputPath('graph-analysis.png') });
  await page.getByRole('button', { name: en.calculator.coordinate.numericKeys, exact: true }).click();
  expect(await page.locator('.coordinate-graph-canvas svg').evaluate((svg, original) => svg === original, graphSvg)).toBe(true);
  await expect(page.locator('.coordinate-graph-canvas svg')).toHaveAttribute('width', graphWidth!);
  await page.getByRole('button', { name: en.calculator.coordinate.analysisKeys, exact: true }).click();
  await expect(page.getByRole('textbox', { name: en.calculator.graph.extra })).toHaveValue(extraFunctions);
  await expect(page.locator('.calc-graph-analysis')).toContainText('f1 ∩ f2');
  const analysisOverflow = await page.locator('.calc-graph-analysis').evaluate((element) => element.scrollHeight - element.clientHeight);
  expect(analysisOverflow).toBeGreaterThan(0);
  await page.locator('.calc-graph-analysis').evaluate((element) => element.scrollTop = element.scrollHeight);
  await expect.poll(() => page.locator('.calc-graph-analysis').evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: en.calculator.coordinate.analysisKeys, exact: true })).toBeInViewport();
  await page.getByRole('button', { name: en.calculator.sidebar.expand, exact: true }).click();
  await expect.poll(fitsCanvas).toBeLessThan(1);
  await page.getByRole('button', { name: en.calculator.coordinate.numericKeys, exact: true }).click();
  await expect(display).toHaveAttribute('aria-description', 'x^2');
  await page.locator('.coordinate-graph-canvas').dispatchEvent('wheel', { deltaY: 80, bubbles: true });
  await expect(page.locator('.calculator-panel-coordinate')).toBeVisible();
  await expect(page.locator('.coordinate-graph-error')).toHaveCount(0);
  await page.locator('.calculator-panel').screenshot({ path: testInfo.outputPath('graphing.png') });
  await page.getByRole('button', { name: en.calculator.history.title, exact: true }).click();
  await expect(page.locator('.calc-history-row[data-mode="coordinate"]')).toHaveCount(1);
  await page.locator('.calc-history-restore').click();
  await expect(display).toHaveAttribute('aria-description', 'x^2');
  await expect(page.getByRole('button', { name: en.calculator.coordinate.analysisKeys, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('textbox', { name: en.calculator.graph.extra })).toHaveValue(extraFunctions);
  expect(desktop.rendererErrors).toEqual([]);
});
