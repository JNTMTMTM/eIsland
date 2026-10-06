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
 * @file imageTranslationProtocolSupplement.test.ts
 * @description 图片翻译提交与轮询失败、结果下载 MIME、超时和取消竞态协议测试。
 * @author 鸡哥
 */

import { getEventListeners } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { translateCaptureImage } from '../imageTranslationService';
vi.mock('electron', () => ({ app: { getVersion: () => 'fixture-version' } }));
const fetchImage = vi.fn<typeof fetch>();
const image = 'data:image/png;base64,aW1hZ2U=';
/**
 * 生成任务协议响应，使用真实 JSON 响应体。
 * @param status - 服务端任务状态
 * @param extra - 任务字段覆盖
 * @returns HTTP 响应
 */
function task(status: string, extra: Record<string, unknown> = {}): Response {
  return new Response(JSON.stringify({ data: { status, taskId: 'fixture/task', ...extra } }));
}
/**
 * 执行翻译并推进确定的轮询次数。
 * @param milliseconds - 推进时间
 * @returns 完整翻译结果
 */
async function run(milliseconds = 1500): Promise<Awaited<ReturnType<typeof translateCaptureImage>>> {
  const pending = translateCaptureImage('fixture-token', image, '', '', new AbortController().signal);
  await vi.advanceTimersByTimeAsync(milliseconds); return pending;
}
beforeEach(() => { vi.resetAllMocks(); vi.useFakeTimers(); vi.stubGlobal('fetch', fetchImage); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('图片翻译提交、轮询与结果下载边界', () => {
  it('缺少登录 Token 或非图片输入时不发送网络请求', async () => {
    await expect(translateCaptureImage(' ', image, '', '', new AbortController().signal)).resolves.toMatchObject({ code: 'loginRequired' });
    await expect(translateCaptureImage('fixture-token', 'text', '', '', new AbortController().signal)).resolves.toMatchObject({ code: 'invalidData' });
    expect(fetchImage).not.toHaveBeenCalled();
  });
  it('缺少 taskId 返回提交失败的默认文案并不轮询', async () => {
    fetchImage.mockResolvedValue(task('PENDING', { taskId: '' }));
    await expect(run(0)).resolves.toMatchObject({ success: false, code: 'submitFailed', message: '图片翻译任务提交失败' });
    expect(fetchImage).toHaveBeenCalledOnce();
  });
  it.each([[200, '响应解析失败'], [503, 'HTTP 503']])('提交 HTTP %d 返回畸形 JSON 时保留解析文案', async (status, message) => {
    fetchImage.mockImplementation(() => Promise.resolve(new Response('{broken', { status })));
    await expect(run(0)).resolves.toMatchObject({ message, success: false, code: 'submitFailed' });
  });
  it('提交成功 JSON 缺少 data 时使用 HTTP 文案', async () => {
    fetchImage.mockResolvedValue(new Response('{}'));
    await expect(run(0)).resolves.toMatchObject({ code: 'submitFailed', message: 'HTTP 200' });
  });
  it('前两次查询失败可恢复，默认语言、请求头和任务 ID 编码正确', async () => {
    fetchImage.mockResolvedValueOnce(task('PENDING')).mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(new Response('{broken'))
      .mockResolvedValueOnce(task('SUCCEEDED', { resultUrl: image }));
    await expect(run(4500)).resolves.toEqual({ success: true, translatedImage: image });
    const form = fetchImage.mock.calls[0]?.[1]?.body as FormData;
    expect(form.get('sourceLanguage')).toBe('auto'); expect(form.get('targetLanguage')).toBe('zh');
    expect(fetchImage.mock.calls[0]?.[1]?.headers).toMatchObject({ Authorization: 'Bearer fixture-token', 'X-Client-Version': 'fixture-version', 'X-Static-Asset-Node': 'r2' });
    expect(fetchImage.mock.calls[1]?.[0]).toContain('fixture%2Ftask'); expect(fetchImage).toHaveBeenCalledTimes(4);
  });
  it('第三次查询失败返回明确上游消息并结束轮询', async () => {
    fetchImage.mockResolvedValueOnce(task('PENDING')).mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ message: 'query unavailable' }), { status: 503 })));
    await expect(run(4500)).resolves.toMatchObject({ code: 'queryFailed', message: 'query unavailable' });
    expect(fetchImage).toHaveBeenCalledTimes(4); expect(vi.getTimerCount()).toBe(0);
  });
  it.each([undefined, 'upstream failed'])('FAILED 状态错误信息 %s 使用原文或默认值', async (errorMessage) => {
    fetchImage.mockResolvedValueOnce(task('PENDING')).mockResolvedValueOnce(task('FAILED', { errorMessage }));
    await expect(run()).resolves.toMatchObject({ code: 'translationFailed', message: errorMessage ?? '图片翻译失败' });
  });
  it('SUCCEEDED 但缺少译图 URL 返回 noResultUrl', async () => {
    fetchImage.mockResolvedValueOnce(task('PENDING')).mockResolvedValueOnce(task('SUCCEEDED'));
    await expect(run()).resolves.toMatchObject({ code: 'noResultUrl' });
  });
  it.each([[null, 'image/png'], ['image/jpeg; charset=utf8', 'image/jpeg'], ['; charset=utf8', 'image/png']])('下载 Content-Type %s 使用 MIME %s', async (header, mime) => {
    const bytes = new TextEncoder().encode('translated');
    const headers: HeadersInit = header === null ? {} : { 'content-type': header };
    fetchImage.mockResolvedValueOnce(task('PENDING')).mockResolvedValueOnce(task('SUCCEEDED', { resultUrl: 'https://images.invalid/result' }))
      .mockResolvedValueOnce(new Response(bytes, { headers }));
    await expect(run()).resolves.toEqual({ success: true, translatedImage: `data:${mime};base64,${Buffer.from(bytes).toString('base64')}` });
  });
  it('下载译图失败不返回空图片', async () => {
    fetchImage.mockResolvedValueOnce(task('PENDING')).mockResolvedValueOnce(task('SUCCEEDED', { resultUrl: 'https://images.invalid/result' }))
      .mockResolvedValueOnce(new Response(null, { status: 503 }));
    await expect(run()).resolves.toMatchObject({ code: 'translationFailed', message: '下载翻译图片失败: HTTP 503' });
  });
  it('八十次未完成查询后超时并清空定时器', async () => {
    fetchImage.mockImplementation(() => Promise.resolve(task('PROCESSING')));
    await expect(run(120_000)).resolves.toMatchObject({ code: 'timeout' });
    expect(fetchImage).toHaveBeenCalledTimes(81); expect(vi.getTimerCount()).toBe(0);
  });
  it.each([new Error('transport failed'), 'transport failed'])('网络异常 %s 转成翻译失败', async (failure) => {
    fetchImage.mockRejectedValue(failure);
    await expect(run(0)).resolves.toMatchObject({ code: 'translationFailed', message: failure instanceof Error ? failure.message : '图片翻译失败' });
  });
  it('响应体 AbortError 透传为取消，其他 DOMException 作为解析失败', async () => {
    fetchImage.mockImplementation(() => Promise.resolve(new Response(new ReadableStream({ start: (controller) => controller.error(new DOMException('closed', 'AbortError')) }))));
    await expect(run(0)).resolves.toMatchObject({ code: 'aborted' });
    fetchImage.mockImplementation(() => Promise.resolve(new Response(new ReadableStream({ start: (controller) => controller.error(new DOMException('malformed', 'DataError')) }))));
    await expect(run(0)).resolves.toMatchObject({ code: 'submitFailed', message: '响应解析失败' });
  });
  it('提交响应消费完成后调用方取消，delay 不创建轮询计时器', async () => {
    const controller = new AbortController(); const response = task('PENDING'); const parse = response.json.bind(response);
    vi.spyOn(response, 'json').mockImplementation(async () => { const payload: unknown = await parse(); controller.abort(); return payload; });
    fetchImage.mockResolvedValue(response);
    await expect(translateCaptureImage('fixture-token', image, 'en', 'fr', controller.signal)).resolves.toMatchObject({ code: 'aborted' });
    expect(vi.getTimerCount()).toBe(0); expect(getEventListeners(controller.signal, 'abort')).toHaveLength(0);
  });
  it('预先取消的请求向 fetch 传递已取消信号', async () => {
    const controller = new AbortController(); controller.abort();
    fetchImage.mockImplementation((...args) => {
      expect(args[1]?.signal?.aborted).toBe(true);
      return Promise.reject(new DOMException('closed', 'AbortError'));
    });
    await expect(translateCaptureImage('fixture-token', image, '', '', controller.signal)).resolves.toMatchObject({ code: 'aborted' });
  });
  it('development 初始化使用测试 API，缺少编码数据仍由提交结果处理', async () => {
    vi.stubEnv('NODE_ENV', 'development'); vi.resetModules();
    const target = await import('../imageTranslationService');
    fetchImage.mockResolvedValue(task('PENDING', { taskId: '' }));
    await expect(target.translateCaptureImage('fixture-token', 'data:image/png', '', '', new AbortController().signal)).resolves.toMatchObject({ code: 'submitFailed' });
    expect(fetchImage.mock.calls[0]?.[0]).toBe('https://test.server.pyisland.com/api/v1/toolbox/image-translations');
    const form = fetchImage.mock.calls[0]?.[1]?.body as FormData;
    expect((form.get('file') as File).size).toBe(0);
  });
});
