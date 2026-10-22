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

test('agent theme tools apply immediately to the invoking window and other open windows', async ({ desktop }) => {
  const standalone = await desktop.openStandalone();
  const commands = [desktop.main, standalone].flatMap((page) => (['light', 'dark'] as const).map((mode) => ({ page, mode })));
  await commands.reduce(async (previous, { page, mode }) => {
    await previous;
    const result = await page.evaluate((mode) => window.api.executeAgentLocalTool({
      tool: 'island.theme.set', arguments: { mode },
    }), mode);
    expect(result).toMatchObject({ success: true, result: { mode, applied: true } });
    await expect(desktop.main.locator('html')).toHaveAttribute('data-theme', mode);
    await expect(standalone.locator('html')).toHaveAttribute('data-theme', mode);
    expect(await page.evaluate(() => window.api.themeModeGet())).toBe(mode);
  }, Promise.resolve());
  expect(desktop.rendererErrors).toEqual([]);
});

(['normal', 'missed-broadcast', 'apply-failed', 'result-retry'] as const).forEach((scenario) => {
  test(`agent authorization confirms the theme before submitting results (${scenario})`, async ({ desktop }) => {
    const page = desktop.main;
    if (scenario === 'missed-broadcast') {
      await desktop.app.evaluate(({ BrowserWindow }) => {
        const main = BrowserWindow.getAllWindows().find((win) => win.webContents.getURL().endsWith('DynamicIslandIndex.html'));
        if (!main) throw new Error('Main test window not found');
        const send = main.webContents.send.bind(main.webContents);
        main.webContents.send = (channel: string, ...args: unknown[]): void => {
          if (channel === 'settings:changed' && args[0] === 'theme:mode') return;
          send(channel, ...args);
        };
      });
    }
    await page.evaluate(async (scenario) => {
      localStorage.setItem('user-account-token', `header.${btoa(JSON.stringify({ role: 'pro' }))}.signature`);
      window.dispatchEvent(new Event('user-account-session-changed'));
      await window.api.maxexpandMouseleaveIdleSet(false);
      const originalFetch = window.fetch.bind(window);
      let stream: ReadableStreamDefaultController<Uint8Array>;
      let resultSubmissions = 0;
      const emit = (type: string, payload: unknown): void => {
        stream.enqueue(new TextEncoder().encode(`event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`));
      };
      window.fetch = async (input, init) => {
        const url = typeof input === 'string' ? input : '';
        if (url.endsWith('/ai/agent/stream')) {
          return new Response(new ReadableStream<Uint8Array>({ start(controller) {
            stream = controller;
            emit('tool_call_request', {
              requestId: 'theme-request', turn: 1, tool: 'island.theme.set',
              arguments: { mode: 'light' }, authorizationRequired: true, purpose: 'Change theme',
            });
          } }), { headers: { 'Content-Type': 'text/event-stream' } });
        }
        if (url.endsWith('/ai/agent/local-tool/resolve')) return new Response('{}');
        if (url.endsWith('/ai/agent/tool-result')) {
          if (typeof init?.body !== 'string') throw new Error('Expected a JSON local-tool submission');
          const submission = JSON.parse(init.body) as Record<string, unknown>;
          resultSubmissions += 1;
          Object.assign(window, { agentThemeSubmission: submission, agentThemeSubmissionCount: resultSubmissions });
          if (scenario === 'result-retry' && resultSubmissions === 1) return new Response('temporary failure', { status: 503 });
          emit('tool_call_result', { ...submission, turn: 1, tool: 'island.theme.set' });
          emit('chunk', { text: 'Theme changed' });
          emit('final', { done: true, traceId: 'theme-test' });
          stream.close();
          return new Response('{}');
        }
        return originalFetch(input, init);
      };
    }, scenario);
    if (scenario === 'apply-failed') {
      await page.evaluate(() => {
        const root = document.documentElement;
        const setAttribute = root.setAttribute.bind(root);
        root.setAttribute = (name, value): void => {
          if (name !== 'data-theme') setAttribute(name, value);
        };
      });
    }
    await desktop.app.evaluate(({ BrowserWindow }) => {
      const main = BrowserWindow.getAllWindows().find((win) => win.webContents.getURL().endsWith('DynamicIslandIndex.html'));
      main?.webContents.send('settings:changed', 'shortcut:open-clipboard-history', null);
    });
    await page.getByRole('button', { name: en.maxExpand.nav.switchTo.replace('{{label}}', en.maxExpand.nav.aiChat), exact: true }).click();
    await page.locator('.max-expand-chat-input').fill('Change to light theme');
    await page.locator('.max-expand-chat-input').press('Enter');
    await expect(page.locator('.max-expand-chat-access-drawer')).toBeVisible();
    await page.getByRole('button', { name: en.aiChat.localToolAccess.allow, exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', scenario === 'apply-failed' ? 'dark' : 'light');
    await expect.poll(() => page.evaluate(() => (window as typeof window & { agentThemeSubmission?: unknown }).agentThemeSubmission))
      .toMatchObject({ success: scenario !== 'apply-failed', result: { mode: 'light', applied: scenario !== 'apply-failed' } });
    expect(await page.evaluate(() => window.api.themeModeGet())).toBe('light');
    if (scenario === 'result-retry') {
      expect(await page.evaluate(() => (window as typeof window & { agentThemeSubmissionCount?: number }).agentThemeSubmissionCount)).toBe(2);
    }
    await expect(page.locator('.max-expand-chat-access-drawer')).toHaveCount(0);
    expect(desktop.rendererErrors).toEqual([]);
  });
});

test('duplicate local tool deliveries execute once across concurrent windows and later retries', async ({ desktop }) => {
  const standalone = await desktop.openStandalone();
  const request = { requestId: 'create-once', tool: 'todolist.create', arguments: { text: 'one persisted task' } };
  const results = await Promise.all([desktop.main, standalone].map((page) =>
    page.evaluate((request) => window.api.executeAgentLocalTool(request), request)));
  expect(results[0]).toEqual(results[1]);
  expect(results[0].success).toBe(true);
  await standalone.evaluate((request) => window.api.executeAgentLocalTool(request), request);
  await expect.poll(() => readTodos(desktop.userData)).toEqual([
    expect.objectContaining({ text: 'one persisted task' }),
  ]);
  const conflict = await desktop.main.evaluate((request) => window.api.executeAgentLocalTool({
    ...request, arguments: { text: 'unexpected duplicate' },
  }), request);
  expect(conflict).toMatchObject({ success: false, error: 'TOOL_REQUEST_ID_CONFLICT' });
  const next = await desktop.main.evaluate((request) => window.api.executeAgentLocalTool({
    ...request, requestId: 'new-user-request',
  }), request);
  expect(next.success).toBe(true);
  await expect.poll(() => readTodos(desktop.userData)).toHaveLength(2);
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
