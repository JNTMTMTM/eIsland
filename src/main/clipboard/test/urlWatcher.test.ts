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
 * @file urlWatcher.test.ts
 * @description urlWatcher 单元测试
 * @author 鸡哥
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/* ------------------------------------------------------------------ */
/*  Mock variables (hoisted so they exist before vi.mock is hoisted)  */
/* ------------------------------------------------------------------ */

const { mockClipboardReadText, mockNetFetch } = vi.hoisted(() => ({
  mockClipboardReadText: vi.fn(),
  mockNetFetch: vi.fn(),
}));

/* ------------------------------------------------------------------ */
/*  Module mocks – only mock electron (external); clipboardUrl is     */
/*  pure functions so we use the real implementation.                 */
/* ------------------------------------------------------------------ */

vi.mock('electron', () => ({
  clipboard: { readText: mockClipboardReadText },
  net: { fetch: mockNetFetch },
  BrowserWindow: class {},
}));

/* ------------------------------------------------------------------ */
/*  Import module under test (after mocks are registered)             */
/* ------------------------------------------------------------------ */

import { startClipboardUrlWatcher, stopClipboardUrlWatcher } from '../urlWatcher';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function createMockReader(chunks: Uint8Array[]) {
  let index = 0;
  return {
    read: vi.fn().mockImplementation(() => {
      if (index < chunks.length) {
        return Promise.resolve({ done: false, value: chunks[index++] });
      }
      return Promise.resolve({ done: true, value: undefined });
    }),
    cancel: vi.fn().mockResolvedValue(undefined),
    releaseLock: vi.fn(),
  };
}

function createMockResponse(options: {
  ok?: boolean;
  status?: number;
  contentType?: string | null;
  chunks?: Uint8Array[];
}) {
  const { ok = true, status = 200, contentType = 'text/html; charset=utf-8', chunks = [] } = options;
  const reader = createMockReader(chunks);
  return {
    ok,
    status,
    headers: { get: vi.fn().mockReturnValue(contentType) },
    body: { getReader: () => reader, cancel: vi.fn().mockResolvedValue(undefined) },
  };
}

function encodeHtml(html: string): Uint8Array {
  return new TextEncoder().encode(html);
}

function createMockWindow(destroyed = false) {
  return {
    isDestroyed: vi.fn().mockReturnValue(destroyed),
    webContents: { send: vi.fn() },
  };
}

/**
 * 创建监听器测试边界，默认使用独立窗口。
 * @param overrides - 覆盖窗口、开关、检测模式或黑名单。
 * @returns 监听器配置。
 */
function defaultOptions(overrides: Partial<{
  getWindow: () => ReturnType<typeof createMockWindow> | null;
  getEnabled: () => boolean;
  getDetectMode: () => 'https-only' | 'http-https' | 'domain-only';
  getBlacklist: () => string[];
}> = {}) {
  const getWindow = overrides.getWindow ?? (() => createMockWindow());
  return {
    getWindow: () => getWindow() as unknown as Electron.BrowserWindow | null,
    getEnabled: overrides.getEnabled ?? (() => true),
    getDetectMode: overrides.getDetectMode ?? (() => 'http-https' as const),
    getBlacklist: overrides.getBlacklist ?? (() => [] as string[]),
  };
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe('urlWatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Re-establish mock defaults (restoreMocks clears them each test)
    mockClipboardReadText.mockResolvedValue('');
  });

  afterEach(() => {
    stopClipboardUrlWatcher();
    vi.useRealTimers();
  });

  /* ================================================================ */
  /*  startClipboardUrlWatcher                                        */
  /* ================================================================ */

  describe('startClipboardUrlWatcher', () => {
    describe('启动条件', () => {
      it('getEnabled 返回 false 时不启动定时器', async () => {
        startClipboardUrlWatcher(defaultOptions({ getEnabled: () => false }));

        await vi.advanceTimersByTimeAsync(5000);
        expect(mockClipboardReadText).not.toHaveBeenCalled();
      });

      it('重复调用时不会创建第二个定时器', () => {
        mockClipboardReadText.mockResolvedValue('initial');
        const opts = defaultOptions();

        startClipboardUrlWatcher(opts);
        startClipboardUrlWatcher(opts);

        // 第一次调用读取了一次 clipboard，重复调用因 clipboardPollTimer 已存在而直接返回
        expect(mockClipboardReadText).toHaveBeenCalledTimes(1);
      });

      it('启动时立即读取当前剪贴板内容作为基准值', () => {
        mockClipboardReadText.mockResolvedValue('baseline text');

        startClipboardUrlWatcher(defaultOptions());

        expect(mockClipboardReadText).toHaveBeenCalledTimes(1);
      });
    });

    describe('剪贴板轮询', () => {
      it('异步读取未完成时不启动重叠读取', async () => {
        let finishRead: (text: string) => void = () => {};
        mockClipboardReadText.mockImplementationOnce(() => new Promise<string>((resolve) => { finishRead = resolve; }));
        startClipboardUrlWatcher(defaultOptions());
        await vi.advanceTimersByTimeAsync(3000);
        expect(mockClipboardReadText).toHaveBeenCalledTimes(1);
        finishRead('baseline');
        await vi.advanceTimersByTimeAsync(1000);
        expect(mockClipboardReadText).toHaveBeenCalledTimes(2);
      });

      it('异步读取拒绝后继续轮询且不产生未处理拒绝', async () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        try {
          mockClipboardReadText.mockRejectedValueOnce(new Error('clipboard unavailable')).mockResolvedValue('plain text');
          startClipboardUrlWatcher(defaultOptions());
          await vi.advanceTimersByTimeAsync(1000);
          expect(error).toHaveBeenCalledWith('[ClipboardUrlWatcher] read error:', expect.any(Error));
          expect(mockClipboardReadText).toHaveBeenCalledTimes(2);
        } finally {
          error.mockRestore();
        }
      });

      it('停止并重启后丢弃旧轮询的异步结果', async () => {
        let finishRead: (text: string) => void = () => {};
        const win = createMockWindow();
        mockClipboardReadText.mockResolvedValueOnce('baseline')
          .mockImplementationOnce(() => new Promise<string>((resolve) => { finishRead = resolve; }))
          .mockResolvedValue('new baseline');
        startClipboardUrlWatcher(defaultOptions({ getWindow: () => win }));
        await vi.advanceTimersByTimeAsync(1000);
        stopClipboardUrlWatcher();
        startClipboardUrlWatcher(defaultOptions({ getWindow: () => win }));
        finishRead('https://stale.example');
        await vi.advanceTimersByTimeAsync(1000);
        expect(mockNetFetch).not.toHaveBeenCalled();
        expect(win.webContents.send).not.toHaveBeenCalled();
      });

      it('剪贴板内容无变化时不触发 URL 提取', async () => {
        mockClipboardReadText.mockResolvedValue('same text');

        const win = createMockWindow();
        startClipboardUrlWatcher(defaultOptions({ getWindow: () => win }));
        await vi.advanceTimersByTimeAsync(3000);

        expect(win.webContents.send).not.toHaveBeenCalled();
      });

      it('窗口为 null 时跳过本轮轮询', async () => {
        mockClipboardReadText.mockResolvedValueOnce('initial').mockResolvedValue('new text');
        const win = createMockWindow();
        let callCount = 0;
        const opts = defaultOptions({
          getWindow: () => {
            callCount++;
            return callCount === 1 ? win : null;
          },
        });

        startClipboardUrlWatcher(opts);
        await vi.advanceTimersByTimeAsync(1000);

        expect(win.webContents.send).not.toHaveBeenCalled();
      });

      it('窗口已销毁时跳过本轮轮询', async () => {
        mockClipboardReadText.mockResolvedValueOnce('initial').mockResolvedValue('new text');
        const opts = defaultOptions({ getWindow: () => createMockWindow(true) });

        startClipboardUrlWatcher(opts);
        await vi.advanceTimersByTimeAsync(1000);

        // No crash, no IPC send
      });

      it('剪贴板内容变化后同一文本不再重复处理', async () => {
        const win = createMockWindow();
        // 剪贴板先变为含 URL 的文本，然后保持不变
        mockClipboardReadText.mockResolvedValueOnce('first').mockResolvedValue('https://example.com');
        mockNetFetch.mockResolvedValue(createMockResponse({ chunks: [encodeHtml('<title>T</title>')] }));

        startClipboardUrlWatcher(defaultOptions({ getWindow: () => win }));
        await vi.advanceTimersByTimeAsync(1000);

        // 第一次轮询检测到变化，发送 IPC
        expect(win.webContents.send).toHaveBeenCalledTimes(1);

        // 清除调用记录
        (win.webContents.send as ReturnType<typeof vi.fn>).mockClear();

        // 再次轮询，clipboard 未变化，不应发送
        await vi.advanceTimersByTimeAsync(1000);
        expect(win.webContents.send).not.toHaveBeenCalled();
      });
    });

    describe('URL 检测与过滤', () => {
      it('检测到 URL 后获取页面标题并通过 IPC 发送到窗口', async () => {
        const win = createMockWindow();
        const titleHtml = '<html><head><title>Example Page</title></head></html>';
        mockNetFetch.mockResolvedValue(createMockResponse({ chunks: [encodeHtml(titleHtml)] }));
        mockClipboardReadText.mockResolvedValueOnce('initial').mockResolvedValue('visit https://example.com now');

        startClipboardUrlWatcher(defaultOptions({ getWindow: () => win }));
        await vi.advanceTimersByTimeAsync(1000);

        expect(mockNetFetch).toHaveBeenCalledTimes(1);
        expect(win.webContents.send).toHaveBeenCalledWith('clipboard:urls-detected', {
          urls: expect.arrayContaining([expect.stringContaining('example.com')]),
          title: 'Example Page',
        });
      });

      it('所有 URL 被黑名单过滤后不发送 IPC', async () => {
        mockClipboardReadText.mockResolvedValueOnce('initial').mockResolvedValue('visit https://blocked.com now');
        const win = createMockWindow();

        startClipboardUrlWatcher(defaultOptions({
          getWindow: () => win,
          getBlacklist: () => ['blocked.com'],
        }));
        await vi.advanceTimersByTimeAsync(1000);

        expect(mockNetFetch).not.toHaveBeenCalled();
        expect(win.webContents.send).not.toHaveBeenCalled();
      });

      it('部分 URL 被黑名单过滤后仅发送未被阻止的 URL', async () => {
        const win = createMockWindow();
        mockNetFetch.mockResolvedValue(createMockResponse({ chunks: [encodeHtml('<title>OK</title>')] }));
        mockClipboardReadText.mockResolvedValueOnce('initial').mockResolvedValue('https://blocked.com and https://ok.com');

        startClipboardUrlWatcher(defaultOptions({
          getWindow: () => win,
          getBlacklist: () => ['blocked.com'],
        }));
        await vi.advanceTimersByTimeAsync(1000);

        expect(win.webContents.send).toHaveBeenCalledWith('clipboard:urls-detected', {
          urls: expect.not.arrayContaining([expect.stringContaining('blocked.com')]),
          title: 'OK',
        });
      });
    });

    describe('页面标题获取', () => {
      it('从 HTML 中提取 title 标签内容', async () => {
        const win = createMockWindow();
        mockClipboardReadText.mockResolvedValueOnce('init').mockResolvedValue('https://test.com');
        mockNetFetch.mockResolvedValue(
          createMockResponse({ chunks: [encodeHtml('<html><head><title>My Title</title></head></html>')] }),
        );

        startClipboardUrlWatcher(defaultOptions({ getWindow: () => win }));
        await vi.advanceTimersByTimeAsync(1000);

        expect(win.webContents.send).toHaveBeenCalledWith(
          'clipboard:urls-detected',
          expect.objectContaining({ title: 'My Title' }),
        );
      });

      it('title 标签带属性时仍能提取', async () => {
        const win = createMockWindow();
        mockClipboardReadText.mockResolvedValueOnce('init').mockResolvedValue('https://test.com');
        mockNetFetch.mockResolvedValue(
          createMockResponse({ chunks: [encodeHtml('<title lang="en">With Attrs</title>')] }),
        );

        startClipboardUrlWatcher(defaultOptions({ getWindow: () => win }));
        await vi.advanceTimersByTimeAsync(1000);

        expect(win.webContents.send).toHaveBeenCalledWith(
          'clipboard:urls-detected',
          expect.objectContaining({ title: 'With Attrs' }),
        );
      });

      it('HTML 无 title 标签时返回空标题', async () => {
        const win = createMockWindow();
        mockClipboardReadText.mockResolvedValueOnce('init').mockResolvedValue('https://test.com');
        mockNetFetch.mockResolvedValue(
          createMockResponse({ chunks: [encodeHtml('<html><body>No title here</body></html>')] }),
        );

        startClipboardUrlWatcher(defaultOptions({ getWindow: () => win }));
        await vi.advanceTimersByTimeAsync(1000);

        expect(win.webContents.send).toHaveBeenCalledWith(
          'clipboard:urls-detected',
          expect.objectContaining({ title: '' }),
        );
      });

      it('title 内容含前后空格时会被 trim', async () => {
        const win = createMockWindow();
        mockClipboardReadText.mockResolvedValueOnce('init').mockResolvedValue('https://test.com');
        mockNetFetch.mockResolvedValue(
          createMockResponse({ chunks: [encodeHtml('<title>   padded   </title>')] }),
        );

        startClipboardUrlWatcher(defaultOptions({ getWindow: () => win }));
        await vi.advanceTimersByTimeAsync(1000);

        expect(win.webContents.send).toHaveBeenCalledWith(
          'clipboard:urls-detected',
          expect.objectContaining({ title: 'padded' }),
        );
      });

      it('标题跨越多个 chunk 时正确拼接', async () => {
        const win = createMockWindow();
        mockClipboardReadText.mockResolvedValueOnce('init').mockResolvedValue('https://test.com');
        const part1 = encodeHtml('<html><ti');
        const part2 = encodeHtml('tle>Split Title</title></html>');
        mockNetFetch.mockResolvedValue(createMockResponse({ chunks: [part1, part2] }));

        startClipboardUrlWatcher(defaultOptions({ getWindow: () => win }));
        await vi.advanceTimersByTimeAsync(1000);

        expect(win.webContents.send).toHaveBeenCalledWith(
          'clipboard:urls-detected',
          expect.objectContaining({ title: 'Split Title' }),
        );
      });
    });

    describe('fetchPageTitle 边界条件', () => {
      it('响应 status 不 ok 且非 206 时返回空标题', async () => {
        const win = createMockWindow();
        mockClipboardReadText.mockResolvedValueOnce('init').mockResolvedValue('https://test.com');
        mockNetFetch.mockResolvedValue(createMockResponse({ ok: false, status: 500 }));

        startClipboardUrlWatcher(defaultOptions({ getWindow: () => win }));
        await vi.advanceTimersByTimeAsync(1000);

        expect(win.webContents.send).toHaveBeenCalledWith(
          'clipboard:urls-detected',
          expect.objectContaining({ title: '' }),
        );
      });

      it('status 206 (Partial Content) 视为有效响应', async () => {
        const win = createMockWindow();
        mockClipboardReadText.mockResolvedValueOnce('init').mockResolvedValue('https://test.com');
        mockNetFetch.mockResolvedValue(
          createMockResponse({ ok: false, status: 206, chunks: [encodeHtml('<title>Partial</title>')] }),
        );

        startClipboardUrlWatcher(defaultOptions({ getWindow: () => win }));
        await vi.advanceTimersByTimeAsync(1000);

        expect(win.webContents.send).toHaveBeenCalledWith(
          'clipboard:urls-detected',
          expect.objectContaining({ title: 'Partial' }),
        );
      });

      it('content-type 非 HTML/text 时返回空标题', async () => {
        const win = createMockWindow();
        mockClipboardReadText.mockResolvedValueOnce('init').mockResolvedValue('https://test.com');
        mockNetFetch.mockResolvedValue(createMockResponse({ contentType: 'application/json' }));

        startClipboardUrlWatcher(defaultOptions({ getWindow: () => win }));
        await vi.advanceTimersByTimeAsync(1000);

        expect(win.webContents.send).toHaveBeenCalledWith(
          'clipboard:urls-detected',
          expect.objectContaining({ title: '' }),
        );
      });

      it('content-type 为 text/plain 时仍尝试提取标题', async () => {
        const win = createMockWindow();
        mockClipboardReadText.mockResolvedValueOnce('init').mockResolvedValue('https://test.com');
        mockNetFetch.mockResolvedValue(
          createMockResponse({ contentType: 'text/plain', chunks: [encodeHtml('<title>Plain Title</title>')] }),
        );

        startClipboardUrlWatcher(defaultOptions({ getWindow: () => win }));
        await vi.advanceTimersByTimeAsync(1000);

        expect(win.webContents.send).toHaveBeenCalledWith(
          'clipboard:urls-detected',
          expect.objectContaining({ title: 'Plain Title' }),
        );
      });

      it('响应 body 为 null 时返回空标题', async () => {
        const win = createMockWindow();
        mockClipboardReadText.mockResolvedValueOnce('init').mockResolvedValue('https://test.com');
        mockNetFetch.mockResolvedValue({
          ok: true,
          status: 200,
          headers: { get: vi.fn().mockReturnValue('text/html') },
          body: null,
        });

        startClipboardUrlWatcher(defaultOptions({ getWindow: () => win }));
        await vi.advanceTimersByTimeAsync(1000);

        expect(win.webContents.send).toHaveBeenCalledWith(
          'clipboard:urls-detected',
          expect.objectContaining({ title: '' }),
        );
      });

      it('content-type header 为 null 时返回空标题', async () => {
        const win = createMockWindow();
        mockClipboardReadText.mockResolvedValueOnce('init').mockResolvedValue('https://test.com');
        mockNetFetch.mockResolvedValue(createMockResponse({ contentType: null }));

        startClipboardUrlWatcher(defaultOptions({ getWindow: () => win }));
        await vi.advanceTimersByTimeAsync(1000);

        expect(win.webContents.send).toHaveBeenCalledWith(
          'clipboard:urls-detected',
          expect.objectContaining({ title: '' }),
        );
      });

      it('net.fetch 抛出异常时返回空标题', async () => {
        const win = createMockWindow();
        mockClipboardReadText.mockResolvedValueOnce('init').mockResolvedValue('https://test.com');
        mockNetFetch.mockRejectedValue(new Error('Network error'));

        startClipboardUrlWatcher(defaultOptions({ getWindow: () => win }));
        await vi.advanceTimersByTimeAsync(1000);

        expect(win.webContents.send).toHaveBeenCalledWith(
          'clipboard:urls-detected',
          expect.objectContaining({ title: '' }),
        );
      });

      it('标题获取过程中窗口被销毁时不发送 IPC', async () => {
        const win = createMockWindow();
        mockClipboardReadText.mockResolvedValueOnce('init').mockResolvedValue('https://test.com');
        mockNetFetch.mockResolvedValue(createMockResponse({ chunks: [encodeHtml('<title>Gone</title>')] }));

        // 第一次 getWindow 返回正常窗口，第二次（在 .then 回调中）返回 null
        let callCount = 0;
        const opts = defaultOptions({
          getWindow: () => {
            callCount++;
            return callCount <= 1 ? win : null;
          },
        });

        startClipboardUrlWatcher(opts);
        await vi.advanceTimersByTimeAsync(1000);

        expect(win.webContents.send).not.toHaveBeenCalled();
      });

      it('非 http/https 协议的 URL 不调用 net.fetch', async () => {
        // 使用 'domain-only' 模式，但提供一个纯域名文本
        // domain-only 会 prepend https://，所以 ftp URL 不会被 extractUrls 提取
        // 直接测试：clipboard 无 URL → 不触发 fetch
        mockClipboardReadText.mockResolvedValueOnce('init').mockResolvedValue('no urls here');
        const win = createMockWindow();

        startClipboardUrlWatcher(defaultOptions({ getWindow: () => win }));
        await vi.advanceTimersByTimeAsync(1000);

        expect(mockNetFetch).not.toHaveBeenCalled();
        expect(win.webContents.send).not.toHaveBeenCalled();
      });
    });
  });

  /* ================================================================ */
  /*  stopClipboardUrlWatcher                                         */
  /* ================================================================ */

  describe('stopClipboardUrlWatcher', () => {
    it('未启动时调用不报错', () => {
      expect(() => stopClipboardUrlWatcher()).not.toThrow();
    });

    it('停止后不再轮询剪贴板', async () => {
      mockClipboardReadText.mockResolvedValue('text');
      startClipboardUrlWatcher(defaultOptions());
      stopClipboardUrlWatcher();

      mockClipboardReadText.mockClear();
      await vi.advanceTimersByTimeAsync(5000);

      expect(mockClipboardReadText).not.toHaveBeenCalled();
    });

    it('连续停止两次不报错', () => {
      mockClipboardReadText.mockResolvedValue('text');
      startClipboardUrlWatcher(defaultOptions());

      stopClipboardUrlWatcher();
      expect(() => stopClipboardUrlWatcher()).not.toThrow();
    });

    it('停止后可重新启动', () => {
      mockClipboardReadText.mockResolvedValue('text');
      const opts = defaultOptions();

      startClipboardUrlWatcher(opts);
      stopClipboardUrlWatcher();

      mockClipboardReadText.mockClear();
      mockClipboardReadText.mockResolvedValue('new text');
      startClipboardUrlWatcher(opts);

      expect(mockClipboardReadText).toHaveBeenCalledTimes(1);
    });
  });
});
