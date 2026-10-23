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
 * @file virtualChatResizingBrowser.test.ts
 * @description 真实 Electron 长消息宽度变化的行内阅读锚点、可见区域与选区连续滚动回归。
 * @author 鸡哥
 */
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { build } from 'esbuild';
import { expect, it } from 'vitest';

it('preserves an anchor inside a tall message when widening and keeps rendering while text is selected', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eisland-chat-resize-'));
  try {
    const entry = `import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { flushSync } from 'react-dom';
      import { VirtualChatMessages } from './src/renderer/components/states/maxExpand/components/agent/components/virtualChatMessages';
      window.layoutErrors = [];
      window.addEventListener('error', event => window.layoutErrors.push(event.message));
      window.addEventListener('unhandledrejection', event => window.layoutErrors.push(String(event.reason)));
      const messages = Array.from({ length: 300 }, (_, index) => ({
        role: 'user', content: 'Message ' + index + ': ' + 'word '.repeat(450)
      }));
      const noop = () => {};
      const hasActiveTextSelection = () => {
        const selection = window.getSelection();
        return Boolean(selection && !selection.isCollapsed && String(selection).length);
      };
      const root = createRoot(document.getElementById('root'));
      flushSync(() => root.render(<React.StrictMode>
        <VirtualChatMessages messages={messages} emptyContent={null}
          agentMode="mihtnelis" isStreaming={false} showThinking={false}
          hasActiveTextSelection={hasActiveTextSelection} userAvatarUrl={null}
          onQuote={noop} onReportIssue={noop} navigateToSettingsTab={noop} />
      </React.StrictMode>));`;
    const bundle = await build({
      stdin: { contents: entry, resolveDir: process.cwd(), loader: 'tsx' },
      bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic',
      plugins: [{ name: 'plain-message-layout-boundary', setup(builder) {
        // 保留生产虚拟列表，只隔离 Markdown/工具内容解析，使用真实文本换行产生变高消息。
        builder.onResolve({ filter: /^\.\/chatMessage$/ }, ({ path }) => ({ path, namespace: 'plain-message' }));
        builder.onLoad({ filter: /.*/, namespace: 'plain-message' }, () => ({
          resolveDir: process.cwd(), loader: 'tsx',
          contents: `export default function Message({ msg }) {
            return <div className="max-expand-chat-bubble">{msg.content}</div>;
          }`,
        }));
      } }],
    });
    await writeFile(join(directory, 'chat.js'), bundle.outputFiles[0].text);
    await writeFile(join(directory, 'index.html'), `<style>
      * { box-sizing: border-box; }
      body { margin: 0; }
      #root { display: flex; width: 360px; height: 360px; }
      .max-expand-chat-messages { flex: 1; min-height: 0; overflow-y: auto; overflow-anchor: none; padding: 12px 16px; }
      .max-expand-chat-virtual-row { display: flex; flex-direction: column; padding-bottom: 8px; }
      .max-expand-chat-bubble { width: 100%; font-size: 16px; line-height: 20px; overflow-wrap: anywhere; }
      </style><div id="root"></div><script src="chat.js"></script>`);
    const checks = `(async () => {
      const assert = (condition, message) => { if (!condition) throw new Error(message); };
      const failures = [];
      const check = (condition, message) => { if (!condition) failures.push(message); };
      const afterPaint = () => new Promise(resolve => {
        // 隐藏的 Electron 窗口可能暂停 rAF；超时兜底与现有浏览器回归夹具一致。
        const timer = setTimeout(resolve, 50);
        requestAnimationFrame(() => setTimeout(() => { clearTimeout(timer); resolve(); }, 0));
      });
      const settle = async () => { for (let index = 0; index < 12; index++) await afterPaint(); };
      const list = document.querySelector('.max-expand-chat-messages');
      const rows = () => Array.from(list.querySelectorAll('[data-chat-index]'));
      const visible = () => {
        const bounds = list.getBoundingClientRect();
        return rows().find(row => {
          const rect = row.getBoundingClientRect();
          return rect.bottom > bounds.top + 1 && rect.top < bounds.bottom;
        });
      };
      const read = () => {
        const row = visible();
        assert(row, 'No mounted message covers the viewport');
        return { index: Number(row.dataset.chatIndex),
          offset: list.getBoundingClientRect().top - row.getBoundingClientRect().top,
          height: row.offsetHeight };
      };
      await settle();
      list.scrollTop = list.scrollHeight / 2;
      await settle();
      const mounted = rows();
      const target = mounted[Math.floor(mounted.length / 2)];
      const deepOffset = Math.floor(target.offsetHeight * 0.8);
      list.scrollTop += target.getBoundingClientRect().top - list.getBoundingClientRect().top + deepOffset;
      await settle();
      const before = read();
      assert(before.index > 20 && before.index < 280, 'Expected a history anchor, away from either edge');
      assert(before.offset > 800, 'Fixture must start deep inside a tall message: ' + JSON.stringify(before));
      document.getElementById('root').style.width = '800px';
      const frames = [];
      for (let index = 0; index < 18; index++) {
        await afterPaint();
        frames.push(read());
      }
      check(frames.every(current => current.index === before.index),
        'Widening replaced the visible message: ' + JSON.stringify({ before, frames }));
      check(frames.every(current => current.offset >= -1 && current.offset < current.height),
        'Reading offset escaped the shortened message: ' + JSON.stringify(frames));
      const after = read();
      assert(after.height < before.offset, 'Fixture must shrink below the old reading offset');
      assert(rows().length < 80, 'Width correction mounted the complete history');

      const selectedRow = visible();
      const selectedIndex = Number(selectedRow.dataset.chatIndex);
      const text = selectedRow.querySelector('.max-expand-chat-bubble').firstChild;
      const selection = window.getSelection();
      const range = document.createRange();
      range.setStart(text, 0);
      range.setEnd(text, 12);
      selection.removeAllRanges();
      selection.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
      const selectedText = String(selection);
      assert(selectedText.length > 0, 'Fixture must contain an active native text selection');
      const firstMountedIndex = Number(rows()[0].dataset.chatIndex);
      list.scrollBy(0, -3000);
      await settle();
      const selectedScroll = read();
      assert(selectedScroll.index < firstMountedIndex,
        'Selected-text scrolling must mount history beyond the previous range');
      assert(list.contains(selectedRow) && String(selection) === selectedText,
        'Scrolling discarded the selected DOM or native selection');
      assert(rows().length < 80, 'Selection protection mounted the complete history');
      selection.removeAllRanges();
      document.dispatchEvent(new Event('selectionchange'));
      await settle();
      read();
      check(!list.querySelector('[data-chat-index="' + selectedIndex + '"]'),
        'Clearing the selection must release the old offscreen message');
      assert(rows().length < 80, 'Clearing the selection must restore the bounded range');
      check(window.layoutErrors.length === 0, 'Browser layout errors: ' + window.layoutErrors.join('; '));
      assert(failures.length === 0, failures.join('; '));
      return 'VIRTUAL_CHAT_RESIZE_PASS: tall anchor, painted viewport, selection scroll, no layout errors';
    })()`;
    const script = `const { app, BrowserWindow } = require('electron');
      app.setPath('userData', ${JSON.stringify(join(directory, 'profile'))});
      app.disableHardwareAcceleration();
      app.whenReady().then(async () => { try {
        const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true, backgroundThrottling: false, offscreen: true } });
        await win.loadFile(${JSON.stringify(join(directory, 'index.html'))});
        console.log(await win.webContents.executeJavaScript(${JSON.stringify(checks)}));
        win.destroy(); app.exit(0);
      } catch (error) { console.error(error); app.exit(1); } });`;
    await writeFile(join(directory, 'main.cjs'), script);
    const environment = { ...process.env };
    delete environment.ELECTRON_RUN_AS_NODE;
    const electron = createRequire(import.meta.url)('electron') as string;
    const result = await promisify(execFile)(electron, [join(directory, 'main.cjs')], {
      env: environment, windowsHide: true, timeout: 20000,
    }).catch((error: unknown) => {
      const failure = error as { stdout?: string; stderr?: string; killed?: boolean };
      throw new Error(`Virtual chat resize check failed (killed=${String(failure.killed)}): ${failure.stdout ?? ''} ${failure.stderr ?? ''}`, { cause: error });
    });
    expect(result.stdout).toContain('VIRTUAL_CHAT_RESIZE_PASS');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 25000);
