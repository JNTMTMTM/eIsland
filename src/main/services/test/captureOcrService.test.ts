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
 * @file captureOcrService.test.ts
 * @description 云端OCR输入校验、尺寸容量边界、请求协议、失败与取消清理回归。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { recognizeCaptureText } from '../captureOcrService';

const mocks = vi.hoisted(() => ({
  size: {
    width: 100,
    height: 100
  },
  fetch: vi.fn<typeof fetch>()
}));

vi.mock('electron', () => ({
  app: {
    getVersion: () => '1.2.3'
  },
  nativeImage: {
    createFromBuffer: () => ({
      getSize: () => mocks.size
    })
  }
}));

const image = `data:image/png;base64,${Buffer.from('image').toString('base64')}`;

beforeEach(() => {
  mocks.size = {
    width: 100,
    height: 100
  };
  mocks.fetch.mockReset();
  mocks.fetch.mockResolvedValue(new Response(JSON.stringify({
    code: 200,
    data: {
      text: 'recognized',
      requestId: 'r1'
    }
  }), {
    status: 200
  }));
  vi.stubGlobal('fetch', mocks.fetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('recognizeCaptureText', () => {
  it.each(['', '  '])('无token %j拒绝且不发送请求', async (token) => {
    expect(await recognizeCaptureText(token, image, new AbortController().signal)).toMatchObject({
      success: false,
      code: 'ocrLoginRequired'
    });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it.each(['', 'text', 'data:text/plain;base64,YQ==', 'data:image/png;base64,', 'data:image/svg+xml;base64,YQ=='])('无效截图格式 %s 拒绝', async (data) => {
    expect(await recognizeCaptureText('token', data, new AbortController().signal)).toMatchObject({
      success: false,
      code: 'invalidData'
    });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it.each([[14, 100], [100, 14], [8193, 100], [100, 8193], [750, 15], [15, 750]])('尺寸%d x %d 超出限制', async (width, height) => {
    mocks.size = {
      width,
      height
    };
    expect(await recognizeCaptureText('token', image, new AbortController().signal)).toMatchObject({
      success: false,
      code: 'invalidImageDimensions'
    });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it.each([[15, 15], [8192, 8192], [749, 15]])('合法尺寸边界%d x %d 使用multipart协议', async (width, height) => {
    mocks.size = {
      width,
      height
    };
    const {
      signal
    } = new AbortController();
    const cleanup = vi.spyOn(signal, 'removeEventListener');
    expect(await recognizeCaptureText('token', image, signal)).toEqual({
      success: true,
      text: 'recognized',
      requestId: 'r1'
    });
    const [[url, options]] = mocks.fetch.mock.calls;
    expect(url instanceof Request ? url.url : url.toString()).toMatch(/\/api\/v1\/toolbox\/ocr$/);
    expect(options?.method).toBe('POST');
    expect(options?.headers).toMatchObject({
      Authorization: 'Bearer token',
      'X-App-Name': 'eisland',
      'X-Client-Version': '1.2.3'
    });
    expect(options?.body).toBeInstanceOf(FormData);
    const form = options?.body as FormData;
    const file = form.get('image') as File;
    expect(file.name).toBe('capture.png');
    expect(file.type).toBe('image/png');
    expect(await file.text()).toBe('image');
    expect(cleanup).toHaveBeenCalledWith('abort', expect.any(Function));
  });

  it('超10MiB拒绝，避免发送巨大图片', async () => {
    const large = `data:image/png;base64,${Buffer.alloc(10 * 1024 * 1024 + 1).toString('base64')}`;
    expect(await recognizeCaptureText('token', large, new AbortController().signal)).toMatchObject({
      success: false,
      code: 'imageTooLarge'
    });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it.each([{
    status: 400,
    body: {
      code: 400,
      errorCode: 'limit',
      message: 'too many'
    },
    expected: {
      success: false,
      code: 'limit',
      message: 'too many'
    }
  }, {
    status: 500,
    body: {},
    expected: {
      success: false,
      code: 'ocrFailed',
      message: 'HTTP 500'
    }
  }, {
    status: 200,
    body: {
      code: 200,
      data: {
        text: 123
      }
    },
    expected: {
      success: true,
      text: '',
      requestId: undefined
    }
  }])('服务端状态$status及不完整payload得到稳定结果', async ({
    status,
    body,
    expected
  }) => {
    mocks.fetch.mockResolvedValueOnce(new Response(JSON.stringify(body), {
      status
    }));
    expect(await recognizeCaptureText('token', image, new AbortController().signal)).toEqual(expected);
  });

  it.each([new Error('network'), 'opaque'])('网络失败转换为错误结果', async (error) => {
    mocks.fetch.mockRejectedValueOnce(error);
    expect(await recognizeCaptureText('token', image, new AbortController().signal)).toMatchObject({
      success: false,
      code: 'ocrFailed',
      message: error instanceof Error ? 'network' : '文字识别失败'
    });
  });

  it('无效响应JSON同样转换为错误，不泄漏监听', async () => {
    mocks.fetch.mockResolvedValueOnce(new Response('invalid'));
    const {
      signal
    } = new AbortController();
    const cleanup = vi.spyOn(signal, 'removeEventListener');
    expect(await recognizeCaptureText('token', image, signal)).toMatchObject({
      success: false,
      code: 'ocrFailed'
    });
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it.each(['already', 'cancel', 'timeout'] as const)('%s中断请求并清理timeout和监听', async (mode) => {
    vi.useFakeTimers();
    const controller = new AbortController();
    if (mode === 'already') {
      controller.abort();
    }
    mocks.fetch.mockImplementationOnce((url, options) => {
      void url;
      const signal = options?.signal;
      return new Promise<Response>((resolve, reject) => {
        void resolve;
        const rejectAbort = (): void => reject(new DOMException('abort', 'AbortError'));
        if (signal?.aborted) {
          rejectAbort();
        } else {
          signal?.addEventListener('abort', rejectAbort, {
            once: true
          });
        }
      });
    });
    const cleanup = vi.spyOn(controller.signal, 'removeEventListener');
    const pending = recognizeCaptureText('token', image, controller.signal);
    if (mode === 'cancel') {
      controller.abort();
    }
    if (mode === 'timeout') {
      await vi.advanceTimersByTimeAsync(30000);
    }
    expect(await pending).toMatchObject({
      success: false,
      code: 'ocrTimeout'
    });
    expect(vi.getTimerCount()).toBe(0);
    expect(cleanup).toHaveBeenCalledOnce();
  });
});
