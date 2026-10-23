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
 * @file agent-scroll.spec.ts
 * @description 真实 Electron 长会话的无按钮虚拟滚动、动态行高、会话切换和流式跟随回归。
 * @author 鸡哥
 */

import en from '../i18n/en-US.json';
import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import type { AiChatMessage, AiChatSession } from '../src/renderer/store/types';

const MESSAGES = '.max-expand-chat-messages';
const ROWS = `${MESSAGES} [data-chat-index]`;
const HISTORY_SIZE = 300;

interface VisibleAnchor {
  index: number;
  top: number;
}

declare global {
  interface Window {
    agentScrollEmit?: (type: string, payload: unknown) => void;
    agentScrollFinish?: () => void;
    agentScrollSelectedRow?: HTMLElement;
  }
}

/**
 * 保存迁移前的真实会话，首次打开 Agent 时由生产仓储载入 IndexedDB。
 * @param page - Electron 主窗口。
 */
async function seedHistory(page: Page): Promise<void> {
  const messages = Array.from({ length: HISTORY_SIZE }, (value, index): AiChatMessage => ({
    role: index % 2 ? 'assistant' : 'user',
    content: `History message ${index}. ${Array.from({ length: index % 5 + 1 }, (value, paragraph) =>
      `Paragraph ${paragraph}: variable height content verifies scroll anchoring while older messages are measured.`).join('\n\n')}`,
    ...(index % 2 ? {
      finalized: true,
      toolCalls: [{
        turn: 1, tool: 'fs.read', pending: false, success: true,
        result: { index, details: Array.from({ length: 15 }, (value, line) => `Tool result line ${line}`) },
      }],
    } : {}),
  }));
  const sessions: AiChatSession[] = [
    { messages, id: 'long-history', title: 'Long history', updatedAt: 2 },
    { id: 'short-history', title: 'Short history', updatedAt: 1,
      messages: [{ role: 'assistant', content: 'Short session answer', finalized: true }] },
  ];
  await page.evaluate(async (sessions) => {
    localStorage.setItem('eIsland_aiChatSessions', JSON.stringify(sessions));
    localStorage.setItem('eIsland_aiActiveChatSessionId', 'long-history');
    localStorage.setItem('user-account-token', `header.${btoa(JSON.stringify({ role: 'pro' }))}.signature`);
    window.dispatchEvent(new Event('user-account-session-changed'));
    await window.api.maxexpandMouseleaveIdleSet(false);
  }, sessions);
}

/**
 * 记录视口最上方实际可见消息的位置，避免依赖未测量消息的估算高度。
 * @param page - Electron 主窗口。
 * @returns 可见消息绝对索引和相对滚动区的位置。
 */
async function readAnchor(page: Page): Promise<VisibleAnchor> {
  return page.locator(MESSAGES).evaluate((container) => {
    const bounds = container.getBoundingClientRect();
    const row = Array.from(container.querySelectorAll<HTMLElement>('[data-chat-index]'))
      .find((element) => {
        const rect = element.getBoundingClientRect();
        return rect.bottom > bounds.top + 1 && rect.top < bounds.bottom;
      });
    if (!row) throw new Error('No message occupies the scroll viewport');
    return { index: Number(row.dataset.chatIndex), top: row.getBoundingClientRect().top - bounds.top };
  });
}

/**
 * 等待真实渲染及 ResizeObserver 有机会提交测量。
 * @param page - Electron 主窗口。
 */
async function waitForMeasurements(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  });
}

/**
 * 检查虚拟化边界与贴底位置，既验证内容又验证 DOM 不随历史规模增长。
 * @param page - Electron 主窗口。
 * @param index - 会话末尾的绝对消息索引。
 */
async function expectBottom(page: Page, index: number): Promise<void> {
  await expect(page.locator(`${ROWS}[data-chat-index="${index}"]`)).toBeVisible();
  await expect.poll(() => page.locator(MESSAGES).evaluate((element) =>
    element.scrollHeight - element.clientHeight - element.scrollTop)).toBeLessThan(3);
  expect(await page.locator(ROWS).count()).toBeLessThan(80);
}

test('scrolls a long history without pagination and preserves anchors through dynamic layout and session changes', async ({ desktop }) => {
  const page = desktop.main;
  await seedHistory(page);
  await desktop.app.evaluate(({ BrowserWindow }) => {
    const main = BrowserWindow.getAllWindows().find((win) => win.webContents.getURL().endsWith('DynamicIslandIndex.html'));
    main?.webContents.send('settings:changed', 'shortcut:open-clipboard-history', null);
  });
  await page.getByRole('button', { name: en.maxExpand.nav.switchTo.replace('{{label}}', en.maxExpand.nav.aiChat), exact: true }).click();
  await expectBottom(page, HISTORY_SIZE - 1);
  await expect(page.locator('.max-expand-chat-history-load-more')).toHaveCount(0);

  await page.locator(MESSAGES).evaluate((element) => { element.scrollTo(0, 0); });
  await expect(page.locator(`${ROWS}[data-chat-index="0"]`)).toContainText('History message 0.');
  await expect.poll(() => readAnchor(page)).toMatchObject({ index: 0 });
  expect(await page.locator(ROWS).count()).toBeLessThan(80);

  await page.locator(MESSAGES).evaluate((element) => { element.scrollTo(0, (element.scrollHeight - element.clientHeight) / 2); });
  await waitForMeasurements(page);
  await expect.poll(async () => (await readAnchor(page)).index).toBeGreaterThan(30);
  await waitForMeasurements(page);
  const middle = await readAnchor(page);
  expect(middle.index).toBeLessThan(HISTORY_SIZE - 30);
  const middleRow = page.locator(`${ROWS}[data-chat-index="${middle.index}"]`);
  const toolIndex = await page.locator(ROWS).locator('details').first()
    .evaluate((element) => element.closest<HTMLElement>('[data-chat-index]')?.dataset.chatIndex);
  const details = page.locator(`${ROWS}[data-chat-index="${toolIndex}"] details`);
  await details.locator('summary').evaluate((element) => (element as HTMLElement).click());
  await expect(details).toHaveAttribute('open', '');
  await waitForMeasurements(page);
  await expect.poll(async () => Math.abs(await middleRow.evaluate((element) => {
    const container = element.closest('.max-expand-chat-messages');
    if (!container) throw new Error('Message lost its scroll container');
    return element.getBoundingClientRect().top - container.getBoundingClientRect().top;
  }) - middle.top)).toBeLessThan(3);

  const expandedScrollTop = await page.locator(MESSAGES).evaluate((element) => element.scrollTop);
  await page.locator(MESSAGES).evaluate((element) => { element.scrollTo(0, element.scrollHeight); });
  await expectBottom(page, HISTORY_SIZE - 1);
  await expect(details).toHaveCount(0);
  await page.locator(MESSAGES).evaluate((element, top) => { element.scrollTo(0, top); }, expandedScrollTop);
  await expect(details).toHaveAttribute('open', '');
  await expect(details).toContainText('Tool result line 14');
  await waitForMeasurements(page);

  // 侧栏是真实的宽度变化入口；行内文本重新换行时保留阅读位置。
  await page.locator(MESSAGES).evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const row = Array.from(element.querySelectorAll<HTMLElement>('[data-chat-index]'))
      .find((item) => item.getBoundingClientRect().bottom > bounds.top + 1);
    if (!row) throw new Error('Missing history anchor before resizing');
    element.scrollBy(0, row.getBoundingClientRect().top - bounds.top);
  });
  await waitForMeasurements(page);
  const beforeResize = await readAnchor(page);
  await page.getByRole('button', { name: en.aiChat.session.toggleHistory, exact: true }).click();
  await page.locator('.max-expand-chat-session-sidebar').evaluate(async (element) => {
    element.getBoundingClientRect();
    await Promise.all(element.getAnimations().map((animation) => animation.finished));
  });
  await waitForMeasurements(page);
  await expect.poll(async () => (await readAnchor(page)).index).toBe(beforeResize.index);
  await expect.poll(async () => Math.abs((await readAnchor(page)).top - beforeResize.top)).toBeLessThan(3);

  await page.locator('.max-expand-chat-session-item').filter({ hasText: 'Short history' }).click();
  await expect(page.locator(MESSAGES)).toContainText('Short session answer');
  await expect(page.locator(ROWS)).toHaveCount(1);
  await expectBottom(page, 0);
  await page.locator('.max-expand-chat-session-item').filter({ hasText: 'Long history' }).click();
  await expectBottom(page, HISTORY_SIZE - 1);
  expect(desktop.rendererErrors).toEqual([]);
});

test('streams while reading history without jumping and follows new output after returning to the bottom', async ({ desktop }) => {
  const page = desktop.main;
  await seedHistory(page);
  await page.evaluate(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : '';
      if (!url.endsWith('/ai/agent/stream')) return originalFetch(input, init);
      return new Response(new ReadableStream<Uint8Array>({ start(controller) {
        window.agentScrollEmit = (type, payload): void => {
          controller.enqueue(new TextEncoder().encode(`event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`));
        };
        window.agentScrollFinish = (): void => {
          window.agentScrollEmit?.('final', { done: true, traceId: 'scroll-test' });
          controller.close();
        };
      } }), { headers: { 'Content-Type': 'text/event-stream' } });
    };
  });
  await desktop.app.evaluate(({ BrowserWindow }) => {
    const main = BrowserWindow.getAllWindows().find((win) => win.webContents.getURL().endsWith('DynamicIslandIndex.html'));
    main?.webContents.send('settings:changed', 'shortcut:open-clipboard-history', null);
  });
  await page.getByRole('button', { name: en.maxExpand.nav.switchTo.replace('{{label}}', en.maxExpand.nav.aiChat), exact: true }).click();
  await expectBottom(page, HISTORY_SIZE - 1);
  await page.locator('.max-expand-chat-input').fill('Continue the conversation');
  await page.locator('.max-expand-chat-input').press('Enter');
  await expect.poll(() => page.evaluate(() => typeof window.agentScrollEmit)).toBe('function');
  await page.evaluate(() => window.agentScrollEmit?.('chunk', { text: 'First streamed paragraph.\n\n' }));
  await expectBottom(page, HISTORY_SIZE + 1);

  await page.locator(MESSAGES).evaluate((element) => { element.scrollTo(0, (element.scrollHeight - element.clientHeight) / 2); });
  await waitForMeasurements(page);
  await expect.poll(async () => (await readAnchor(page)).index).toBeLessThan(HISTORY_SIZE - 30);
  await waitForMeasurements(page);
  const historyAnchor = await readAnchor(page);
  const selectedText = await page.locator(`${ROWS}[data-chat-index="${historyAnchor.index}"]`).evaluate((element, index) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const expected = `History message ${index}.`;
    let node = walker.nextNode();
    while (node && !node.textContent?.includes(expected)) node = walker.nextNode();
    if (!node) throw new Error('Visible history message has no selectable content');
    const range = document.createRange();
    const start = node.textContent?.indexOf(expected) ?? 0;
    range.setStart(node, start);
    range.setEnd(node, start + expected.length);
    const selection = window.getSelection();
    if (!selection) throw new Error('Selection is unavailable');
    selection.removeAllRanges();
    selection.addRange(range);
    window.agentScrollSelectedRow = element as HTMLElement;
    document.dispatchEvent(new Event('selectionchange'));
    return selection.toString();
  }, historyAnchor.index);
  expect(selectedText).toBe(`History message ${historyAnchor.index}.`);
  await page.evaluate(() => window.agentScrollEmit?.('chunk', {
    text: Array.from({ length: 25 }, (value, index) => `Background stream paragraph ${index}.`).join('\n\n'),
  }));
  await waitForMeasurements(page);
  await expect.poll(async () => (await readAnchor(page)).index).toBe(historyAnchor.index);
  await expect.poll(async () => Math.abs((await readAnchor(page)).top - historyAnchor.top)).toBeLessThan(3);
  expect(await page.locator(ROWS).count()).toBeLessThan(80);
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe(selectedText);
  expect(await page.locator(`${ROWS}[data-chat-index="${historyAnchor.index}"]`).evaluate((element) =>
    element === window.agentScrollSelectedRow && element.isConnected)).toBe(true);

  await page.evaluate(() => {
    window.getSelection()?.removeAllRanges();
    document.dispatchEvent(new Event('selectionchange'));
  });
  await page.locator(MESSAGES).evaluate((element) => { element.scrollTo(0, element.scrollHeight); });
  await expect(page.locator(`${ROWS}[data-chat-index="${HISTORY_SIZE + 1}"]`)).toContainText('Background stream paragraph 24.');
  await expectBottom(page, HISTORY_SIZE + 1);
  await page.evaluate(() => window.agentScrollEmit?.('chunk', {
    text: `\n\n${Array.from({ length: 15 }, (value, index) => `Following stream paragraph ${index}.`).join('\n\n')}`,
  }));
  await expect(page.locator(`${ROWS}[data-chat-index="${HISTORY_SIZE + 1}"]`)).toContainText('Following stream paragraph 14.');
  await expectBottom(page, HISTORY_SIZE + 1);
  const motion = await page.evaluate(async () => {
    const list = document.querySelector<HTMLElement>('.max-expand-chat-messages');
    const paragraph = list?.querySelector('[data-chat-index="301"] p');
    if (!list || !paragraph) throw new Error('Missing streamed paragraph');
    const origin = paragraph.getBoundingClientRect().top + list.scrollTop;
    let previous = list.scrollTop;
    let largestStep = 0;
    let smallestStep = 0;
    let drift = 0;
    let watching = true;
    const sample = (): void => {
      const delta = list.scrollTop - previous;
      largestStep = Math.max(largestStep, delta);
      smallestStep = Math.min(smallestStep, delta);
      previous = list.scrollTop;
      drift = Math.max(drift, Math.abs(paragraph.getBoundingClientRect().top + list.scrollTop - origin));
      if (watching) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
    for (let index = 0; index < 6; index++) {
      window.agentScrollEmit?.('chunk', { text: `\n\nNew output line ${index}: additional streamed paragraph.` });
      // eslint-disable-next-line no-await-in-loop -- 按实际分片间隔逐次输出，检验跨帧连续跟随。
      await new Promise<void>((resolve) => setTimeout(resolve, 70));
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 400));
    watching = false;
    return { largestStep, smallestStep, drift };
  });
  expect(motion.largestStep).toBeGreaterThan(0);
  expect(motion.largestStep).toBeLessThan(30);
  expect(motion.smallestStep).toBeGreaterThanOrEqual(-1);
  expect(motion.drift).toBeLessThan(1);
  await page.evaluate(() => window.agentScrollFinish?.());
  await expect(page.locator('.max-expand-chat-send').filter({ hasText: en.aiChat.actions.stop })).toHaveCount(0);
  await expectBottom(page, HISTORY_SIZE + 1);
  expect(desktop.rendererErrors).toEqual([]);
});
