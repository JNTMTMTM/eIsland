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

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerMailIpcHandlers } from '../mail';
import { MAIL_INBOX_CACHE_MAX_ITEMS, MAIL_INBOX_CACHE_STORE_KEY } from '../config/mail';
import type { MailAccountConfig, MailInboxItem } from '../types';

interface MessageFixture {
  uid?: number;
  source?: Buffer;
  size?: number;
  envelope?: { subject?: string; from?: unknown; to?: unknown; date?: Date };
}
interface ParsedFixture {
  text?: string;
  html?: string | false;
  textAsHtml?: string;
  subject?: string;
  from?: { text: string };
  to?: { text: string };
  date?: Date;
}
type HandlerFixture = (event: object, configOrLimit?: unknown, limit?: number) => Promise<unknown>;
const io = vi.hoisted(() => ({
  files: new Map<string, string>(),
  handle: vi.fn<(channel: string, handler: HandlerFixture) => void>(),
  options: vi.fn<(options: Record<string, unknown>) => void>(),
  read: vi.fn<(path: string) => string>(),
  write: vi.fn<(path: string, data: string, encoding: string) => void>(),
  connect: vi.fn<() => Promise<void>>(),
  logout: vi.fn<() => Promise<void>>(),
  close: vi.fn<() => void>(),
  lock: vi.fn<() => Promise<{ release: () => void }>>(),
  release: vi.fn<() => void>(),
  search: vi.fn<() => Promise<number[] | false>>(),
  fetch: vi.fn<() => Promise<MessageFixture | false>>(),
  parse: vi.fn<() => Promise<ParsedFixture>>(),
}));
vi.mock('electron', () => ({ ipcMain: { handle: io.handle } }));
vi.mock('fs', () => ({
  existsSync: (path: string) => io.files.has(path),
  readFileSync: io.read,
  writeFileSync: io.write,
}));
vi.mock('mailparser', () => ({ simpleParser: io.parse }));
vi.mock('imapflow', () => ({
  ImapFlow: class {
    connect = io.connect;

    logout = io.logout;

    close = io.close;

    getMailboxLock = io.lock;

    search = io.search;

    fetchOne = io.fetch;

    /**
     * 记录模拟 IMAP 客户端构造配置。
     * @param options - 网络连接选项。
     */
    constructor(options: Record<string, unknown>) { io.options(options); }
  },
}));

const config: MailAccountConfig = {
  emailAddress: 'fixture@example.test', imapHost: 'imap.fixture.test', imapPort: '993',
  imapSecure: true, authUser: 'fixture-user', authSecret: 'fixture-secret',
};
const storeDir = 'fixture-store';
const configPath = 'fixture-store\\fixture-config.json';
const cachePath = `fixture-store\\${MAIL_INBOX_CACHE_STORE_KEY}.json`;
const cacheKey = 'imap.fixture.test|993|tls|fixture-user';

/**
 * 构造完整缓存项，可覆盖兼容性关键字段。
 * @param patch - 修改字段。
 * @returns 缓存项。
 */
function cached(patch: Partial<MailInboxItem> = {}): MailInboxItem {
  return { uid: '1', subject: 'cached', from: 'sender', to: 'receiver', date: '2026-01-01',
    size: 1, preview: 'cached preview', body: '<p>cached</p>', ...patch };
}
/**
 * 注册并调用真实邮件 IPC。
 * @param value - 配置或列表数量。
 * @param limit - 数量。
 * @returns IPC 响应。
 */
function list(value: unknown = config, limit?: number): Promise<unknown> {
  registerMailIpcHandlers({ storeDir, mailConfigStoreKey: 'fixture-config' });
  const handler = io.handle.mock.calls.at(-1)?.[1];
  return handler?.({}, value, limit) ?? Promise.resolve(undefined);
}
/**
 * 写入模拟磁盘配置或缓存内容。
 * @param path - 模拟路径。
 * @param value - JSON 内容。
 */
function store(path: string, value: unknown): void { io.files.set(path, JSON.stringify(value)); }

beforeEach(() => {
  vi.resetAllMocks();
  io.files.clear();
  io.read.mockImplementation((path) => io.files.get(path) ?? '');
  io.connect.mockResolvedValue();
  io.logout.mockResolvedValue();
  io.lock.mockImplementation(() => Promise.resolve({ release: io.release }));
  io.search.mockResolvedValue([1]);
  io.fetch.mockResolvedValue({ uid: 1, source: Buffer.from('raw'), size: 3 });
  io.parse.mockResolvedValue({ text: 'hello', html: '<p>hello</p>' });
});

describe('邮件配置与端口规范化', () => {
  it.each([null, 1, false, 'fixture'])('磁盘配置 %s 非对象时返回配置错误', async (value) => {
    store(configPath, value);
    await expect(list(10)).resolves.toMatchObject({ ok: false, message: '未检测到邮箱配置，请先在设置中完成 IMAP 参数填写' });
  });
  it('磁盘解析/读取失败与缺失配置返回一致错误', async () => {
    await expect(list(10)).resolves.toMatchObject({ ok: false });
    io.files.set(configPath, '{broken');
    await expect(list(10)).resolves.toMatchObject({ ok: false });
    io.read.mockImplementationOnce(() => { throw new Error('read denied'); });
    await expect(list(10)).resolves.toMatchObject({ ok: false });
  });
  it.each([
    { imapHost: '', authUser: 'user', authSecret: 'secret' },
    { imapHost: 'host', authUser: '', authSecret: 'secret' },
    { imapHost: 'host', authUser: 'user', authSecret: '' },
    { imapHost: 1, authUser: 1, authSecret: 1 },
  ])('不完整配置 %s 被拒绝', async (value) => {
    store(configPath, value);
    await expect(list(false)).resolves.toMatchObject({ ok: false });
    expect(io.connect).not.toHaveBeenCalled();
  });
  it('磁盘配置各字段去空白，非字符串邮箱和端口使用默认', async () => {
    store(configPath, { ...config, emailAddress: 1, imapHost: ' imap.fixture.test ', imapPort: 1, authUser: ' fixture-user ' });
    await expect(list()).resolves.toMatchObject({ ok: true });
    await expect(list(2)).resolves.toMatchObject({ ok: true });
    expect(io.options).toHaveBeenLastCalledWith(expect.objectContaining({ host: 'imap.fixture.test', port: 993, secure: true }));
  });
  it.each(['abc', 'Infinity', '0', '-1', '65536', '65535', '143.9'])('端口 %s 限幅并兼容明文默认端口', async (port) => {
    await expect(list({ ...config, imapPort: port, imapSecure: false })).resolves.toMatchObject({ ok: true });
    const parsed = Number(port);
    const expected = Number.isFinite(parsed) && Math.floor(parsed) >= 1 && Math.floor(parsed) <= 65535 ? Math.floor(parsed) : 143;
    expect(io.options).toHaveBeenCalledWith(expect.objectContaining({ port: expected, secure: false }));
  });
  it('直传配置默认端口与可选邮箱规范化，数量超出上下限被限制', async () => {
    const minimal = { imapHost: ' host ', authUser: ' user ', authSecret: 'secret', emailAddress: 1, imapPort: 1 };
    io.search.mockResolvedValue(Array.from({ length: 35 }, (entry, index) => { void entry; return index + 1; }));
    await expect(list(minimal, 99)).resolves.toMatchObject({ ok: true });
    expect(io.fetch).toHaveBeenCalledTimes(30);
    io.fetch.mockClear();
    await expect(list(minimal, -5)).resolves.toMatchObject({ ok: true });
    expect(io.fetch).toHaveBeenCalledTimes(1);
  });
  it('完整磁盘配置字符串字段及未传数量的直传配置均正常读取', async () => {
    store(configPath, config);
    await expect(list(null)).resolves.toMatchObject({ ok: true });
    await expect(list({ ...config, emailAddress: undefined })).resolves.toMatchObject({ ok: true });
  });
  it('直传空服务器/认证字段按具体业务错误拒绝', async () => {
    await expect(list({ ...config, imapHost: ' ' })).resolves.toMatchObject({ ok: false, message: 'IMAP 服务器不能为空' });
    await expect(list({ ...config, authUser: '' })).resolves.toMatchObject({ ok: false, message: '邮箱认证信息不完整，请检查认证用户名和密钥' });
  });
});

describe('邮件缓存完整性与清理', () => {
  it.each([null, 1, {}, { accounts: null }, { accounts: 1 }])('无效缓存 %s 忽略并重新获取', async (value) => {
    store(cachePath, value);
    await expect(list()).resolves.toMatchObject({ ok: true });
    expect(io.fetch).toHaveBeenCalledOnce();
  });
  it('缓存 JSON 损坏或磁盘读取失败不阻止邮箱获取', async () => {
    io.files.set(cachePath, '{invalid');
    await expect(list()).resolves.toMatchObject({ ok: true });
    io.read.mockImplementationOnce(() => { throw new Error('read error'); });
    await expect(list()).resolves.toMatchObject({ ok: true });
  });
  it('有效 HTML 缓存直接返回，不联网获取具体邮件', async () => {
    store(cachePath, { accounts: { [cacheKey]: { 1: cached() } } });
    await expect(list()).resolves.toEqual({ ok: true, items: [cached()], message: '' });
    expect(io.fetch).not.toHaveBeenCalled();
    expect(io.write).toHaveBeenCalledWith(cachePath, expect.stringContaining('cached preview'), 'utf-8');
  });
  it.each([
    { preview: '', body: '' },
    { preview: '', body: 'plain legacy text' },
    { preview: 'preview', body: 'plain legacy text' },
    { preview: false, body: false },
  ])('不完整缓存 %s 重新解析源内容', async (patch) => {
    store(cachePath, { accounts: { [cacheKey]: { 1: { ...cached(), ...patch, subject: '', from: '', to: '', date: '', size: null } } } });
    await expect(list()).resolves.toMatchObject({ ok: true, items: [{ subject: '(无主题)', preview: 'hello', body: '<p>hello</p>' }] });
    expect(io.fetch).toHaveBeenCalledOnce();
  });
  it('只有 preview 的兼容缓存保留默认主题、空地址日期和无效数值默认', async () => {
    store(cachePath, { accounts: { [cacheKey]: { 1: { ...cached(), subject: '', from: '', to: '', date: '', size: null, preview: 'preview only', body: '' } } } });
    await expect(list()).resolves.toMatchObject({ ok: true, items: [{ subject: '(无主题)', size: 0, body: '' }] });
    expect(io.fetch).not.toHaveBeenCalled();
  });
  it('缓存写入失败忽略，搜索不是数组时结果为空', async () => {
    io.search.mockResolvedValue(false);
    io.write.mockImplementation(() => { throw new Error('cache write'); });
    await expect(list()).resolves.toEqual({ ok: true, items: [], message: '' });
    expect(io.release).toHaveBeenCalledOnce();
    expect(io.logout).toHaveBeenCalledOnce();
  });
  it('缓存只保留服务端最新上限 UID，不保留已经删除项', async () => {
    const uids = Array.from({ length: MAIL_INBOX_CACHE_MAX_ITEMS + 2 }, (entry, index) => { void entry; return index + 1; });
    const items = Object.fromEntries(uids.map((uid) => [String(uid), cached({ uid: String(uid) })]));
    store(cachePath, { accounts: { [cacheKey]: items } });
    io.search.mockResolvedValue(uids);
    await expect(list(config, 1)).resolves.toMatchObject({ ok: true });
    const persisted: unknown = JSON.parse(io.write.mock.calls[0]?.[1] ?? '{}');
    expect(persisted).toHaveProperty(['accounts', cacheKey, '3']);
    expect(persisted).not.toHaveProperty(['accounts', cacheKey, '1']);
  });
});

describe('邮件内容解析与 IMAP 生命周期', () => {
  it('找不到邮件时跳过且无需加载解析器', async () => {
    io.fetch.mockResolvedValue(false);
    await expect(list()).resolves.toEqual({ ok: true, items: [], message: '' });
    expect(io.parse).not.toHaveBeenCalled();
  });
  it('无 source、无 envelope 的邮件使用空内容默认', async () => {
    io.fetch.mockResolvedValue({ uid: 1 });
    await expect(list()).resolves.toMatchObject({ ok: true, items: [{ uid: '1', subject: '(无主题)', from: '', to: '', date: '', size: 0, body: '', preview: '' }] });
    expect(io.parse).not.toHaveBeenCalled();
  });
  it('包络地址支持姓名地址组合、仅地址/姓名及非法空项', async () => {
    io.fetch.mockResolvedValue({ source: Buffer.from('raw'), envelope: {
      subject: 'fallback', from: [null, 1, {}, { name: 'A', address: 'a@test' }, { address: 'b@test' }, { name: 'C' }],
      to: 'not-array', date: new Date('2026-01-01T00:00:00Z'),
    } });
    io.parse.mockResolvedValue({});
    await expect(list()).resolves.toMatchObject({ ok: true, items: [{
      uid: '1', subject: 'fallback', from: 'A <a@test>, b@test, C', to: '', date: '2026-01-01T00:00:00.000Z', size: 3,
    }] });
  });
  it('解析器地址主题日期优先，正文 CRLF 规范化且长 preview 截断', async () => {
    const text = ` \r\n${'long '.repeat(50)}\rnext `;
    io.parse.mockResolvedValue({ text, subject: 'parsed', html: '<p>html</p>', from: { text: 'parsed from' }, to: { text: 'parsed to' }, date: new Date('2026-02-01T00:00:00Z') });
    await expect(list()).resolves.toMatchObject({ ok: true, items: [{
      subject: 'parsed', from: 'parsed from', to: 'parsed to', date: '2026-02-01T00:00:00.000Z',
      preview: `${'long '.repeat(36).trimEnd()}...`, body: '<p>html</p>',
    }] });
  });
  it.each([
    [{ text: 'plain', html: false, textAsHtml: '<p>derived</p>' }, '<p>derived</p>'],
    [{ text: 'plain', html: '  ', textAsHtml: '  ' }, 'plain'],
    [{ text: '', date: new Date('invalid') }, ''],
  ] as const)('解析正文 %s 使用有效 HTML 或文本回退', async (parsed, body) => {
    io.parse.mockResolvedValue(parsed);
    await expect(list()).resolves.toMatchObject({ ok: true, items: [{ body }] });
  });
  it.each(['connect', 'lock', 'search', 'fetch', 'parse'] as const)('阶段 %s 失败仍释放获得的锁及连接', async (stage) => {
    io[stage].mockRejectedValueOnce(new Error(`fixture ${stage} failed`));
    await expect(list()).resolves.toMatchObject({ ok: false, message: `fixture ${stage} failed` });
    expect(io.logout).toHaveBeenCalledOnce();
    expect(io.release).toHaveBeenCalledTimes(stage === 'connect' || stage === 'lock' ? 0 : 1);
  });
  it('非 Error 连接拒绝使用读取失败默认文案，logout 拒绝调用 close', async () => {
    io.connect.mockRejectedValueOnce('transport failure');
    io.logout.mockRejectedValueOnce(new Error('logout failed'));
    await expect(list()).resolves.toEqual({ ok: false, items: [], message: '收件箱读取失败' });
    expect(io.close).toHaveBeenCalledOnce();
  });
});
