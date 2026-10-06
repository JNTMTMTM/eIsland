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
 * @file feedbackTransport.test.ts
 * @description 反馈上传的真实 FormData、XHR 进度及失败响应、QQ群配置字段清洗测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchFeedbackQqGroupConfig, uploadUserFeedbackLog, uploadUserFeedbackScreenshot } from '../userAccountApi.feedback';
import type { UserFeedbackUploadOptions } from '../userAccountApi.types';

const leaf = vi.hoisted(() => ({ headers: vi.fn(), net: vi.fn() }));
vi.mock('../userAccountApi.client', async (importOriginal) => {
  const original = await importOriginal<typeof import('../userAccountApi.client')>();
  return { ...original, buildUploadHeaders: leaf.headers };
});

class XhrFixture {
  static instances: XhrFixture[] = [];

  status = 200;

  responseText = '{"code":200,"data":"https://cdn/asset"}';

  onerror: (() => void) | null = null;

  onabort: (() => void) | null = null;

  onload: (() => void) | null = null;

  upload = { onprogress: null as ((event: Pick<ProgressEvent, 'lengthComputable' | 'loaded' | 'total'>) => void) | null };

  open = vi.fn();

  setRequestHeader = vi.fn();

  send = vi.fn();

  /** 记录真实上传模块创建的请求对象。 */
  constructor() {
    XhrFixture.instances.push(this);
  }
}

const log = new File(['log-content'], 'DEBUG.LOG', { type: 'text/plain' });
const screenshot = new File(['image-content'], 'shot.png', { type: 'image/png' });

/**
 * 启动真实上传并等待头部异步加载，响应由测试浏览器边界提供。
 * @param file - 真实文件，不复制或模拟生产验证算法。
 * @param options - 进度回调，省略时覆盖默认参数。
 * @returns 真实上传 Promise 与对应 XHR。
 */
async function begin(file: File = log, options?: UserFeedbackUploadOptions): Promise<{ result: Promise<string>; xhr: XhrFixture }> {
  const upload = file === screenshot ? uploadUserFeedbackScreenshot : uploadUserFeedbackLog;
  const result = options === undefined ? upload(file, 'token') : upload(file, 'token', options);
  await new Promise<void>((resolve) => setImmediate(resolve));
  const [xhr] = XhrFixture.instances;
  return { result, xhr };
}

beforeEach(() => {
  XhrFixture.instances = [];
  leaf.headers.mockReset().mockResolvedValue({ Authorization: 'Bearer token' });
  leaf.net.mockReset();
  vi.stubGlobal('XMLHttpRequest', XhrFixture);
  vi.stubGlobal('window', { api: { netFetch: leaf.net } });
});
afterEach(() => vi.unstubAllGlobals());

describe('feedback asset runtime transport', () => {
  it.each([{ file: log, path: 'feedback-log', content: 'log-content' }, { file: screenshot, path: 'feedback-screenshot', content: 'image-content' }])('uploads actual file content to $path without progress callback', async ({ file, path, content }) => {
    const { result, xhr } = await begin(file);
    expect(xhr.open).toHaveBeenCalledExactlyOnceWith('POST', expect.stringContaining(`/v1/upload/${  path}`), true);
    expect(xhr.setRequestHeader).toHaveBeenCalledWith('Authorization', 'Bearer token');
    const form = xhr.send.mock.calls[0][0] as FormData;
    expect([...form.keys()]).toEqual(['file']);
    expect(await (form.get('file') as File).text()).toBe(content);
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 1, total: 2 });
    xhr.onload?.();
    expect(await result).toBe('https://cdn/asset');
  });
  it('reports computable, rounded and clamped progress plus final completion', async () => {
    const progress = vi.fn();
    const { result, xhr } = await begin(log, { onUploadProgress: progress });
    xhr.upload.onprogress?.({ lengthComputable: false, loaded: 50, total: 100 });
    expect(progress).not.toHaveBeenCalled();
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 0, total: 100 });
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 101 });
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 200, total: 100 });
    xhr.onload?.();
    await result;
    expect(progress.mock.calls).toEqual([[0], [50], [100], [100]]);
  });
  it.each([{ event: 'error', status: 0 }, { event: 'abort', status: 0 }])('rejects $event status $status with HTTP fallback', async ({ event, status }) => {
    const { result, xhr } = await begin();
    xhr.status = status;
    if (event === 'error') {
      xhr.onerror?.();
    } else {
      xhr.onabort?.();
    }
    await expect(result).rejects.toThrow(`上传失败：HTTP ${  status}`);
  });
  it.each([
    { status: 199, body: '{}', message: 'failed' },
    { status: 300, body: '{}', message: 'failed' },
    { status: 403, body: '{"code":403,"message":"denied"}', message: 'denied' },
    { status: 200, body: 'invalid json', message: '响应解析失败' },
    { status: 200, body: '{"code":200,"data":7}', message: 'success' },
    { status: 200, body: '{"code":200,"data":""}', message: 'success' },
    { status: 200, body: '{"code":400,"message":"bad file"}', message: 'bad file' },
  ])('rejects upload status $status body $body', async ({ status, body, message }) => {
    const { result, xhr } = await begin();
    xhr.status = status;
    xhr.responseText = body;
    xhr.onload?.();
    await expect(result).rejects.toThrow(message);
  });
  it('rejects screenshots without MIME type and propagates upload header failure', async () => {
    await expect(uploadUserFeedbackScreenshot(new File(['x'], 'shot.png'), 'token')).rejects.toThrow('仅支持上传图片截图');
    const error = new Error('headers unavailable');
    leaf.headers.mockRejectedValueOnce(error);
    await expect(uploadUserFeedbackLog(log, 'token')).rejects.toBe(error);
    expect(XhrFixture.instances).toHaveLength(0);
  });
});

describe('feedback QQ group public configuration', () => {
  it.each([
    { response: undefined, expected: null },
    { response: { ok: false, body: '{}' }, expected: null },
    { response: { ok: true, body: 'not json' }, expected: null },
    { response: { ok: true, body: 'null' }, expected: null },
    { response: { ok: true, body: '{"code":500,"data":{}}' }, expected: null },
    { response: { ok: true, body: '{"code":200,"data":null}' }, expected: null },
    { response: { ok: true, body: '{"code":200,"data":"url"}' }, expected: null },
    { response: { ok: true, body: '{"code":200,"data":{"qqInviteUrl":7}}' }, expected: { qqInviteUrl: '' } },
    { response: { ok: true, body: '{"code":200,"data":{"qqInviteUrl":"https://qq/group"}}' }, expected: { qqInviteUrl: 'https://qq/group' } },
  ])('normalizes public response $response', async ({ response, expected }) => {
    leaf.net.mockResolvedValueOnce(response);
    expect(await fetchFeedbackQqGroupConfig()).toEqual(expected);
    expect(leaf.net).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('/v1/feedback/qq-group'), { method: 'GET', timeoutMs: 8000 });
  });
  it('contains bridge failures as unavailable configuration', async () => {
    leaf.net.mockRejectedValueOnce(new Error('offline'));
    expect(await fetchFeedbackQqGroupConfig()).toBeNull();
  });
});
