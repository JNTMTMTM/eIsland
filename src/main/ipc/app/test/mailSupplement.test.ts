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
 * @file mailSupplement.test.ts
 * @description 邮件真实 IPC 的配置、端口、缓存兼容、MIME 内容与连接清理边界测试。
 * @author 鸡哥
 */

import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerMailIpcHandlers } from '../mail';
import type { MailAccountConfig, MailInboxItem } from '../types';

const io = vi.hoisted(() => ({
  handlers: new Map<string, (...args: unknown[]) => Promise<{ ok: boolean; items: MailInboxItem[]; message: string }>>(),
  fetch: vi.fn(), download: vi.fn(), connect: vi.fn(), logout: vi.fn(), close: vi.fn(), release: vi.fn(),
  exists: 100000, validity: 1n,
}));
vi.mock('electron', () => ({ ipcMain: { handle: (name: string, fn: never) => io.handlers.set(name, fn) } }));
vi.mock('fs', () => ({ existsSync: () => false, readFileSync: () => { throw new Error('No legacy cache should be read'); } }));
vi.mock('imapflow', () => ({ ImapFlow: class {
  mailbox = { exists: io.exists, uidValidity: io.validity };

  connect = io.connect;

  logout = io.logout;

  close = io.close;

  fetchOne = io.fetch;

  download = io.download;

  /** 模拟已经持有的收件箱锁。
   * @returns 已获得的锁
   */
  getMailboxLock() { return Promise.resolve({ release: io.release }); }
} }));
const config: MailAccountConfig = { emailAddress: 'a@test', imapHost: 'imap.test', imapPort: '993', imapSecure: true, authUser: 'a', authSecret: 'secret' };
/** 调用已注册的 IPC 并返回业务结果。
 * @param channel - IPC 通道
 * @param args - 请求参数
 * @returns 业务处理结果
 */
function invoke(channel: string, ...args: unknown[]) { return io.handlers.get(channel)!({}, ...args); }
beforeEach(() => {
  vi.resetAllMocks(); io.handlers.clear(); io.exists = 100000; io.validity = 1n;
  io.connect.mockResolvedValue(undefined); io.logout.mockResolvedValue(undefined);
  io.fetch.mockImplementation((uid: number) => Promise.resolve({ uid, size: 100 * 1024 * 1024, envelope: { subject: 'subject' }, bodyStructure: {
    type: 'multipart/mixed', childNodes: [
      { type: 'multipart/alternative', childNodes: [{ type: 'text/plain', part: '1.1' }, { type: 'text/html', part: '1.2' }] },
      { type: 'application/octet-stream', part: '2', disposition: 'attachment', size: 100 * 1024 * 1024 },
    ],
  } }));
  io.download.mockImplementation(() => Promise.resolve({ content: Readable.from([Buffer.from('<p>完整正文</p>')]) }));
  registerMailIpcHandlers({ storeDir: 'fixture-store', mailConfigStoreKey: 'mail-config' });
});
describe('摘要列表与按需邮件正文', () => {
  it('十万封邮箱只取指定末页的包络，100MB 附件不会下载或进入 IPC', async () => {
    const result = await invoke('mail:inbox:list', config, 3);
    expect(result.ok).toBe(true);
    expect(result.items.map((item) => item.uid)).toEqual(['100000', '99999', '99998']);
    expect(result.items.every((item) => item.body === '' && item.uidValidity === '1')).toBe(true);
    expect(io.fetch).toHaveBeenCalledTimes(3);
    expect(io.fetch).toHaveBeenCalledWith(100000, { uid: true, size: true, envelope: true, flags: true });
    expect(io.download).not.toHaveBeenCalled();
  });
  it('打开邮件只取 HTML 正文部分并完整返回，跳过纯文本替代体与附件', async () => {
    const result = await invoke('mail:message:get', config, '3', '1');
    expect(result.items[0]?.body).toBe('<p>完整正文</p>');
    expect(io.download).toHaveBeenCalledOnce();
    expect(io.download).toHaveBeenCalledWith('3', '1.2', { uid: true, chunkSize: 65536 });
    expect(io.release).toHaveBeenCalledOnce(); expect(io.logout).toHaveBeenCalledOnce();
  });
  it('纯文本编码由下载流解码，HTML 字符不会解释为标签', async () => {
    io.fetch.mockResolvedValue({ uid: 1, bodyStructure: { type: 'text/plain' } });
    io.download.mockResolvedValue({ content: Readable.from(['你好 <tag> &']) });
    const result = await invoke('mail:message:get', config, '1', '1');
    expect(result.items[0]?.body).toBe('<pre>你好 &lt;tag&gt; &amp;</pre>');
  });
  it('正文下载返回空对象时报告邮件已不存在，并释放锁和连接', async () => {
    io.download.mockResolvedValue({});
    const result = await invoke('mail:message:get', config, '3', '1');
    expect(result).toEqual({ ok: false, items: [], message: 'Message no longer exists.' });
    expect(io.release).toHaveBeenCalledOnce(); expect(io.logout).toHaveBeenCalledOnce();
  });
  it('相同详情请求合并，列表不保存正文；不同邮箱代次不会命中旧详情', async () => {
    const [first, second] = await Promise.all([invoke('mail:message:get', config, '3', '1'), invoke('mail:message:get', config, '3', '1')]);
    expect(first).toEqual(second); expect(io.download).toHaveBeenCalledOnce();
    await invoke('mail:message:get', config, '3', '1');
    expect(io.download).toHaveBeenCalledOnce();
    io.validity = 2n;
    await invoke('mail:message:get', config, '3', '2');
    expect(io.download).toHaveBeenCalledTimes(2);
    expect((await invoke('mail:message:get', config, '4', '1')).ok).toBe(false);
  });
  it('8MB 字节 LRU 淘汰旧正文，超预算邮件完整返回但不缓存', async () => {
    io.download.mockImplementation(() => Promise.resolve({ content: Readable.from(['x'.repeat(3 * 1024 * 1024)]) }));
    await invoke('mail:message:get', config, '1', '1');
    await invoke('mail:message:get', config, '2', '1');
    await invoke('mail:message:get', config, '1', '1');
    expect(io.download).toHaveBeenCalledTimes(3);
    io.download.mockImplementation(() => Promise.resolve({ content: Readable.from(['y'.repeat(5 * 1024 * 1024)]) }));
    expect((await invoke('mail:message:get', config, '9', '1')).items[0]?.body.length).toBe(5 * 1024 * 1024);
    await invoke('mail:message:get', config, '9', '1');
    expect(io.download).toHaveBeenCalledTimes(5);
  });
  it.each(['connect', 'fetch', 'download'] as const)('%s 失败仍回收连接和已获得的锁', async (stage) => {
    io[stage].mockRejectedValueOnce(new Error(stage));
    expect((await invoke('mail:message:get', config, '4', '1')).ok).toBe(false);
    expect(io.logout).toHaveBeenCalledOnce(); expect(io.release).toHaveBeenCalledTimes(stage === 'connect' ? 0 : 1);
  });
  it('流错误销毁正文流并释放锁；退出失败关闭连接', async () => {
    const stream = new Readable({ read() { this.destroy(new Error('broken')); } });
    io.download.mockResolvedValue({ content: stream }); io.logout.mockRejectedValue(new Error('logout'));
    expect((await invoke('mail:message:get', config, '4', '1')).ok).toBe(false);
    expect(stream.destroyed).toBe(true); expect(io.release).toHaveBeenCalledOnce(); expect(io.close).toHaveBeenCalledOnce();
  });
  it('空邮箱、非数字数量与非法 UID 不会展开成全量读取', async () => {
    io.exists = 0;
    expect((await invoke('mail:inbox:list', config, NaN)).items).toEqual([]);
    expect((await invoke('mail:message:get', config, '1:*')).ok).toBe(false);
    expect(io.fetch).not.toHaveBeenCalled();
  });
});
