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
 * @file desktop.spec.ts
 * @description 验证真实 Electron 启动、待办 UI 的持久化和跨窗口 IPC 同步。
 * @author 鸡哥
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import en from '../i18n/en-US.json';
import { test, expect } from './fixtures';
import type { BrowserWindow } from 'electron';

/** 从实际磁盘读取待办，避免 localStorage 兜底掩盖 IPC 写入失败。
 * @param userData - 当前测试的数据目录。
 * @returns 主进程持久化的待办数组。
 */
async function readTodos(userData: string): Promise<unknown> {
  const raw = await readFile(join(userData, 'eIsland_store', 'todos.json'), 'utf8');
  return JSON.parse(raw) as unknown;
}

test('starts the real main process and opens a usable standalone window', async ({ desktop }) => {
  const profile = await desktop.app.evaluate(({ app }) => app.getPath('userData'));
  expect(profile).toBe(desktop.userData);
  expect(await desktop.main.evaluate(() => typeof window.api.storeRead)).toBe('function');

  const page = await desktop.openStandalone();
  await expect(page.getByRole('textbox', { name: en.todo.addPlaceholder })).toBeVisible();
  await page.getByRole('button', { name: en.standalone.tabs.countdown, exact: true }).click();
  await expect(page.locator('.cw-tab--active')).toHaveText(en.standalone.tabs.countdown);
  await page.getByRole('button', { name: en.standalone.tabs.todo, exact: true }).click();
  await expect(page.getByRole('textbox', { name: en.todo.addPlaceholder })).toBeVisible();
  expect(desktop.rendererErrors).toEqual([]);
});

test('adds, edits and completes a todo, restores it after restart, then deletes it', async ({ desktop }) => {
  let page = await desktop.openStandalone();
  await page.getByRole('textbox', { name: en.todo.addPlaceholder }).fill('E2E persistent task');
  await page.getByRole('button', { name: en.todo.add, exact: true }).click();
  const title = page.getByRole('textbox', { name: en.todo.editTitle, exact: true });
  await expect(title).toHaveValue('E2E persistent task');
  await title.fill('E2E edited task');
  await title.press('Enter');
  await page.getByRole('button', { name: en.todo.markDone, exact: true }).click();
  await expect.poll(() => readTodos(desktop.userData)).toEqual([
    expect.objectContaining({ text: 'E2E edited task', done: true }),
  ]);

  await desktop.restart();
  page = await desktop.openStandalone();
  await expect(page.getByRole('textbox', { name: en.todo.editTitle, exact: true })).toHaveValue('E2E edited task');
  await expect(page.getByRole('button', { name: en.todo.markUndone, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('textbox', { name: en.todo.editTitle, exact: true }).hover();
  await page.getByRole('button', { name: en.todo.delete, exact: true }).click();
  await expect(page.getByRole('textbox', { name: en.todo.editTitle, exact: true })).toHaveCount(0);
  await expect.poll(() => readTodos(desktop.userData)).toEqual([]);
  expect(desktop.rendererErrors).toEqual([]);
});

test('broadcasts a main-window store write to the standalone todo UI', async ({ desktop }) => {
  const page = await desktop.openStandalone();
  await expect(page.getByRole('textbox', { name: en.todo.addPlaceholder })).toBeVisible();
  const todo = { id: 1, text: 'E2E synchronized task', done: false, createdAt: Date.now(), description: '', subTodos: [] };
  const saved = await desktop.main.evaluate((item) => window.api.storeWrite('todos', [item]), todo);
  expect(saved).toBe(true);
  await expect(page.getByRole('textbox', { name: en.todo.editTitle, exact: true })).toHaveValue(todo.text);
  await expect.poll(() => readTodos(desktop.userData)).toEqual([todo]);
  expect(desktop.rendererErrors).toEqual([]);
});

test('preserves todos when closing and reopening the standalone window', async ({ desktop }) => {
  let page = await desktop.openStandalone();
  await page.getByRole('textbox', { name: en.todo.addPlaceholder }).fill('E2E reopened task');
  await page.getByRole('button', { name: en.todo.add, exact: true }).click();
  await expect.poll(() => readTodos(desktop.userData)).toEqual([
    expect.objectContaining({ text: 'E2E reopened task' }),
  ]);
  const closed = page.waitForEvent('close');
  const standalone = await desktop.app.browserWindow(page);
  await standalone.evaluate((win: BrowserWindow) => win.close());
  await closed;
  page = await desktop.openStandalone();
  await expect(page.getByRole('textbox', { name: en.todo.editTitle, exact: true })).toHaveValue('E2E reopened task');
  expect(desktop.rendererErrors).toEqual([]);
});

test('adds and edits a countdown, restores it after restart, and deletes it', async ({ desktop }) => {
  const readEvents = async (): Promise<unknown> => JSON.parse(await readFile(join(desktop.userData, 'eIsland_store', 'countdown-dates.json'), 'utf8')) as unknown;
  let page = await desktop.openStandalone();
  await page.getByRole('button', { name: en.standalone.tabs.countdown, exact: true }).click();
  await page.getByRole('button', { name: en.countdown.manage.new, exact: true }).click();
  let editor = page.getByRole('dialog');
  await editor.getByRole('textbox', { name: en.countdown.namePlaceholder, exact: true }).fill('E2E countdown event');
  await editor.getByLabel(en.countdown.manage.date, { exact: true }).fill('2099-12-31');
  await editor.getByRole('textbox', { name: en.countdown.descPlaceholder, exact: true }).fill('Persisted through IPC');
  await editor.getByRole('button', { name: en.countdown.actions.add, exact: true }).click();
  await expect(editor).not.toBeVisible();
  await expect.poll(readEvents).toEqual([
    expect.objectContaining({ name: 'E2E countdown event', date: '2099-12-31', description: 'Persisted through IPC' }),
  ]);
  await page.getByRole('button').filter({ hasText: 'E2E countdown event' }).click();
  editor = page.getByRole('dialog');
  await editor.getByRole('textbox', { name: en.countdown.namePlaceholder, exact: true }).fill('E2E edited countdown');
  await editor.getByRole('button', { name: en.countdown.actions.save, exact: true }).click();
  await expect(editor).not.toBeVisible();
  await expect.poll(readEvents).toEqual([expect.objectContaining({ name: 'E2E edited countdown', date: '2099-12-31' })]);

  await desktop.restart();
  page = await desktop.openStandalone();
  // 最近使用的独立窗口 tab 也应随重启恢复。
  await expect(page.locator('.cw-tab--active')).toHaveText(en.standalone.tabs.countdown);
  await page.getByRole('button').filter({ hasText: 'E2E edited countdown' }).click();
  editor = page.getByRole('dialog');
  await expect(editor.getByLabel(en.countdown.manage.date, { exact: true })).toHaveValue('2099-12-31');
  await expect(editor.getByRole('textbox', { name: en.countdown.descPlaceholder, exact: true })).toHaveValue('Persisted through IPC');
  await editor.getByRole('button', { name: en.countdown.manage.delete, exact: true }).click();
  await expect.poll(readEvents).toEqual([]);
  await expect(page.locator('button.cd-card')).toHaveCount(0);
  expect(desktop.rendererErrors).toEqual([]);
});
