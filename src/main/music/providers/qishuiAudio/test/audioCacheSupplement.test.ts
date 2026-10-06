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
 * @file audioCacheSupplement.test.ts
 * @description 汽水音频真实解密、缓存范围、磁盘失败、取消与队列限额边界测试。
 * @author 鸡哥
 */

import { createCipheriv } from 'node:crypto';
import { Readable } from 'node:stream';
import { setImmediate } from 'node:timers/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupQishuiAudioSources, handleQishuiAudioRequest, registerQishuiAudioSource } from '../index';
interface FileFixture { length: number; bytes: Buffer; }
const io = vi.hoisted(() => ({
  files: new Map<string, FileFixture>(), write: vi.fn<(file: string, data: Buffer) => Promise<void>>(),
  rm: vi.fn<(file: string, options: unknown) => Promise<void>>(), directory: vi.fn<() => Promise<string>>(),
  stream: vi.fn<(file: string, options: { start: number; end: number }) => Readable>(), open: vi.fn<() => number>(),
}));
vi.mock('fs', () => ({ createReadStream: io.stream, openSync: io.open }));
vi.mock('fs/promises', () => ({ writeFile: io.write, rm: io.rm, mkdtemp: io.directory }));
const fetchAudio = vi.fn<typeof fetch>();
const keyHex = '00112233445566778899aabbccddeeff';
/**
 * 构造单个 AES-CTR 样本的真实 MP4 容器。
 * @param type - MP4 box 标识
 * @param parts - box 载荷
 * @returns 标准 box 数据
 */
function box(type: string, ...parts: Buffer[]): Buffer {
  const data = Buffer.concat(parts); const header = Buffer.alloc(8);
  header.writeUInt32BE(data.length + 8); header.write(type, 4, 'ascii'); return Buffer.concat([header, data]);
}
/**
 * 生成有效加密输入，保持解密依赖为真实模块。
 * @returns CENC MP4 音频
 */
function encrypted(): Buffer {
  const sizes = Buffer.alloc(12); sizes.writeUInt32BE(6, 4); sizes.writeUInt32BE(1, 8);
  const vectors = Buffer.alloc(16); vectors.writeUInt32BE(1, 4);
  const cipher = createCipheriv('aes-128-ctr', Buffer.from(keyHex, 'hex'), Buffer.alloc(16));
  const stbl = box('stbl', box('stsd', Buffer.from('enca')), box('stsz', sizes), box('senc', vectors));
  return Buffer.concat([box('moov', box('trak', box('mdia', box('minf', stbl)))), box('mdat', cipher.update('abcdef'), cipher.final())]);
}
/**
 * 创建代理的 Range 或 HEAD 请求。
 * @param url - 注册的代理地址
 * @param range - Range 请求头
 * @param method - HTTP 方法
 * @returns 真实请求处理 Promise
 */
function request(url: string, range = 'bytes=0-0', method = 'GET'): Promise<Response> {
  return handleQishuiAudioRequest(new Request(url, { method, headers: { range } }));
}
beforeEach(() => {
  vi.resetAllMocks(); io.files.clear();
  vi.stubGlobal('fetch', fetchAudio);
  io.directory.mockResolvedValue('C:/fixture-audio-cache'); io.open.mockReturnValue(12);
  io.rm.mockResolvedValue(undefined);
  io.write.mockImplementation((file, data) => {
    io.files.set(file, { length: data.length, bytes: Buffer.from(data.subarray(0, data.length > 1024 ? 1 : data.length)) });
    return Promise.resolve();
  });
  io.stream.mockImplementation((file, options) => {
    const data = io.files.get(file)?.bytes ?? Buffer.alloc(0);
    return Readable.from([data.subarray(options.start, options.end + 1)], { objectMode: false });
  });
  fetchAudio.mockImplementation(() => Promise.resolve(new Response(new TextEncoder().encode('abcdef'))));
});
afterEach(async () => { await cleanupQishuiAudioSources(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('真实音频缓存与原生 I/O 失败边界', () => {
  it('上游流已经错误时读取与重复取消拒绝都返回 502', async () => {
    fetchAudio.mockImplementation(() => Promise.resolve(new Response(new ReadableStream({
      start: (controller) => controller.error(new Error('stream unavailable')),
    }))));
    const url = registerQishuiAudioSource('https://audio.invalid/error-stream');
    expect((await request(url)).status).toBe(502);
    expect(io.write).not.toHaveBeenCalled();
    await cleanupQishuiAudioSources();
  });
  it('未加密 HEAD 保留上游内容类型并不创建本地缓存', async () => {
    fetchAudio.mockImplementation(() => Promise.resolve(new Response(null, { headers: { 'content-type': 'audio/flac' } })));
    const url = registerQishuiAudioSource('https://audio.invalid/plain');
    const response = await handleQishuiAudioRequest(new Request(url, { method: 'HEAD' }));
    expect(response.body).toBeNull(); expect(response.headers.get('content-type')).toBe('audio/flac');
    expect(fetchAudio.mock.calls[0]?.[1]?.method).toBe('HEAD'); expect(io.write).not.toHaveBeenCalled();
  });
  it('共享回退读取取消失败仍收束等待者及后台清理', async () => {
    const cancel = vi.fn<() => void>().mockImplementation(() => { throw new Error('cancel unavailable'); });
    fetchAudio.mockImplementation(() => Promise.resolve(new Response(new ReadableStream({ cancel }))));
    const url = registerQishuiAudioSource('https://audio.invalid/plain');
    const controller = new AbortController();
    const pending = handleQishuiAudioRequest(new Request(url, { signal: controller.signal, headers: { range: 'bytes=0-0' } }));
    await setImmediate(); controller.abort();
    expect((await pending).status).toBe(502);
    const firstCleanup = cleanupQishuiAudioSources(); const secondCleanup = cleanupQishuiAudioSources();
    await Promise.all([firstCleanup, secondCleanup]);
    expect(cancel).toHaveBeenCalledOnce(); expect(io.write).not.toHaveBeenCalled();
  });
  it('真实 CENC 解密缓存支持 HEAD，延迟消费者触发流缓存策略', async () => {
    fetchAudio.mockImplementation(() => Promise.resolve(new Response(new Uint8Array(encrypted()))));
    const url = registerQishuiAudioSource('https://audio.invalid/encrypted', keyHex);
    const response = await handleQishuiAudioRequest(new Request(url));
    await setImmediate();
    const content = Buffer.from(await response.arrayBuffer());
    expect(content.subarray(content.indexOf(Buffer.from('mdat')) + 4).toString()).toBe('abcdef');
    const head = await request(url, 'bytes=0-', 'HEAD');
    expect(head.body).toBeNull(); expect(head.headers.get('content-type')).toBe('audio/mp4');
    expect(fetchAudio).toHaveBeenCalledOnce();
  });
  it.each(['bytes=99-', `bytes=${  '9'.repeat(400)  }-`])('缓存 Range %s 超出边界返回 416', async (range) => {
    const url = registerQishuiAudioSource('https://audio.invalid/plain');
    expect((await request(url)).status).toBe(206);
    const response = await request(url, range);
    expect(response.status).toBe(416); expect(response.headers.get('content-range')).toBe('bytes */6');
  });
  it('缓存写入失败删除半成品并返回 502', async () => {
    io.write.mockRejectedValue(new Error('disk full'));
    const url = registerQishuiAudioSource('https://audio.invalid/plain');
    expect((await request(url)).status).toBe(502);
    expect(io.rm).toHaveBeenCalledWith(expect.stringContaining('fixture-audio-cache'), { force: true });
  });
  it.each([204, 206, 503])('加密来源 HTTP %s 无效时不写缓存', async (status) => {
    fetchAudio.mockImplementation(() => Promise.resolve(new Response(status === 204 ? null : 'upstream', { status })));
    const url = registerQishuiAudioSource('https://audio.invalid/encrypted', keyHex);
    expect((await request(url)).status).toBe(502); expect(io.write).not.toHaveBeenCalled();
  });
  it('未加密错误响应返回 502 并取消上游 body', async () => {
    const cancel = vi.fn();
    fetchAudio.mockImplementation(() => Promise.resolve(new Response(new ReadableStream({ cancel }), { status: 503 })));
    const url = registerQishuiAudioSource('https://audio.invalid/plain');
    expect((await request(url)).status).toBe(502); expect(cancel).toHaveBeenCalledOnce();
  });
  it('未加密直传的请求取消传到 fetch 信号', async () => {
    let signal: AbortSignal | null | undefined;
    let finish: ((response: Response) => void) | undefined;
    fetchAudio.mockImplementation((...fetchArguments) => {
      const [, init] = fetchArguments;
      signal = init?.signal;
      return new Promise<Response>((resolve) => { finish = resolve; });
    });
    const controller = new AbortController();
    const url = registerQishuiAudioSource('https://audio.invalid/plain');
    const pending = handleQishuiAudioRequest(new Request(url, { signal: controller.signal }));
    controller.abort(); expect(signal?.aborted).toBe(true);
    finish?.(new Response('upstream', { status: 503 }));
    expect((await pending).status).toBe(502);
  });
  it('多个未加密回退共享下载并吞掉第二个上游取消错误', async () => {
    const cancel = vi.fn<() => void>().mockImplementation(() => { throw new Error('cancel unavailable'); });
    fetchAudio.mockResolvedValueOnce(new Response('abcdef')).mockResolvedValueOnce(new Response(new ReadableStream({ cancel })));
    const url = registerQishuiAudioSource('https://audio.invalid/plain');
    const [first, second] = await Promise.all([request(url, 'bytes=0-2'), request(url, 'bytes=3-5')]);
    expect(await first.text()).toBe('abc'); expect(await second.text()).toBe('def');
    expect(io.write).toHaveBeenCalledOnce(); expect(cancel).toHaveBeenCalledOnce();
  });
  it('八个排队加载之外立即返回繁忙，清理取消全部真实等待者', async () => {
    fetchAudio.mockImplementation(() => Promise.resolve(new Response(new ReadableStream({ start: () => {} }))));
    const urls = Array.from({ length: 9 }, (...indices) => registerQishuiAudioSource(`https://audio.invalid/${indices[1]}`, keyHex));
    const requests = urls.map((url) => request(url));
    expect((await requests[8]).status).toBe(502);
    await cleanupQishuiAudioSources();
    const responses = await Promise.all(requests);
    expect(responses.every((response) => response.status === 502)).toBe(true);
    expect(fetchAudio).toHaveBeenCalledOnce();
  });
  it('真实字节缓存超过 256 MiB 时淘汰最旧的磁盘缓存，删除拒绝不会破坏新响应', async () => {
    registerQishuiAudioSource('https://audio.invalid/unloaded');
    const chunk = new Uint8Array(90 * 1024 * 1024); chunk[0] = 65;
    fetchAudio.mockImplementation(() => Promise.resolve(new Response(new ReadableStream<Uint8Array>({
      start: (controller) => { controller.enqueue(chunk); controller.close(); },
    }))));
    io.rm.mockRejectedValueOnce(new Error('unlink unavailable'));
    const urls = Array.from({ length: 3 }, (...indices) => registerQishuiAudioSource(`https://audio.invalid/large${indices[1]}`));
    await urls.reduce<Promise<void>>(async (previous, url) => {
      await previous; const response = await request(url);
      expect(response.status).toBe(206); expect(await response.text()).toBe('A');
      io.write.mockClear();
    }, Promise.resolve());
    expect(io.rm).toHaveBeenCalledWith(expect.stringContaining('fixture-audio-cache'), { force: true });
  });
});
