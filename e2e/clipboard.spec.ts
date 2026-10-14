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
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 */

/**
 * @file clipboard.spec.ts
 * @description 使用真实 Electron 剪贴板验证文本 IPC、Agent 图片读取、截图复制及异步 URL 监听。
 * @author 鸡哥
 */

import { test, expect } from './fixtures';

test('uses the asynchronous clipboard API for text, images, Agent tools and URL monitoring', async ({ desktop }, testInfo) => {
  const version = await desktop.app.evaluate(() => process.versions.electron);
  await testInfo.attach('electron-version', { body: version, contentType: 'text/plain' });
  // 保存全部 MIME 数据；测试只使用固定内容，结束后恢复原剪贴板。
  const previous = await desktop.app.evaluate(async ({ clipboard }) => {
    const items = await clipboard.read();
    return Promise.all(items.map((item) => Promise.all(item.types.map(async (type) => {
      const payload = await item.getType(type);
      return { type, data: 'arrayBuffer' in payload
        ? Buffer.from(await payload.arrayBuffer()).toString('base64') : JSON.stringify(payload) };
    }))));
  });

  try {
    await desktop.main.evaluate(() => window.api.clipboardUrlMonitorSet(false));
    expect(await desktop.main.evaluate(() => window.api.clipboardWriteText('clipboard IPC fixture'))).toBe(true);
    expect(await desktop.main.evaluate(() => window.api.clipboardReadText())).toBe('clipboard IPC fixture');
    const text = await desktop.main.evaluate(() => window.api.executeAgentLocalTool({ tool: 'clipboard.read' }));
    expect(text).toMatchObject({ success: true, result: { text: 'clipboard IPC fixture', hasImage: false } });
    const write = await desktop.main.evaluate(() => window.api.executeAgentLocalTool({
      tool: 'clipboard.write', arguments: { text: 'clipboard Agent fixture' },
    }));
    expect(write.success).toBe(true);
    expect(await desktop.main.evaluate(() => window.api.clipboardReadText())).toBe('clipboard Agent fixture');

    const dataURL = await desktop.app.evaluate(({ nativeImage }) =>
      nativeImage.createFromBitmap(Buffer.from([0, 0, 255, 255, 0, 255, 0, 255]), { width: 2, height: 1 }).toDataURL());
    await desktop.app.evaluate(async ({ clipboard, ClipboardItem, nativeImage }, url) => {
      const bytes = nativeImage.createFromDataURL(url).toPNG();
      await clipboard.write([new ClipboardItem({
        'text/plain': 'clipboard rich fixture',
        'image/png': new Blob([new Uint8Array(bytes)], { type: 'image/png' }),
      })]);
    }, dataURL);
    const rich = await desktop.main.evaluate(() => window.api.executeAgentLocalTool({ tool: 'clipboard.read' }));
    expect(rich).toMatchObject({ success: true, result: { text: 'clipboard rich fixture', hasImage: true, imageWidth: 2, imageHeight: 1 } });

    await desktop.main.evaluate((url) => window.electron.ipcRenderer.send('capture-complete', { dataURL: url }), dataURL);
    await expect.poll(async () => {
      const result = await desktop.main.evaluate(() => window.api.executeAgentLocalTool({ tool: 'clipboard.read' }));
      return result.result;
    }).toMatchObject({ text: null, hasImage: true, imageWidth: 2, imageHeight: 1 });
    const copied = await desktop.main.evaluate(() => window.api.executeAgentLocalTool({ tool: 'clipboard.read' }));
    const image = copied.result as { imageBase64: string };
    const pixels = await desktop.app.evaluate(({ nativeImage }, base64) =>
      Array.from(nativeImage.createFromBuffer(Buffer.from(base64, 'base64')).toBitmap()), image.imageBase64);
    expect(pixels).toEqual([0, 0, 255, 255, 0, 255, 0, 255]);

    await desktop.main.evaluate(async () => {
      window.api.onClipboardUrlsDetected(({ urls }) => {
        document.documentElement.dataset.clipboardUrls = JSON.stringify(urls);
      });
      await window.api.clipboardUrlDetectModeSet('https-only');
      await window.api.clipboardUrlBlacklistSet([]);
      await window.api.clipboardUrlMonitorSet(true);
    });
    let sequence = 0;
    await expect.poll(async () => {
      sequence += 1;
      await desktop.main.evaluate((url) => window.api.clipboardWriteText(url), `https://clipboard-fixture.test/${sequence}`);
      return desktop.main.locator('html').getAttribute('data-clipboard-urls');
    }).toMatch(/https:\/\/clipboard-fixture\.test\/\d+/);
    expect(desktop.rendererErrors).toEqual([]);
  } finally {
    await desktop.main.evaluate(() => window.api.clipboardUrlMonitorSet(false));
    await desktop.app.evaluate(async ({ clipboard, ClipboardItem }, saved) => {
      if (saved.length === 0) { clipboard.clear(); return; }
      await clipboard.write(saved.map((item) => new ClipboardItem(Object.fromEntries(
        item.map(({ type, data }): [string, Blob | Electron.ClipboardBookmark] => [type,
          type === 'electron application/bookmark'
            ? JSON.parse(data) as Electron.ClipboardBookmark
            : new Blob([new Uint8Array(Buffer.from(data, 'base64'))], { type }),
        ]),
      ))));
    }, previous);
  }
});
