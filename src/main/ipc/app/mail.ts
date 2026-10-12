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
 * @file mail.ts
 * @description 邮件收件箱 IPC 处理模块
 * @author 鸡哥
 */

import { existsSync, readFileSync } from 'fs';
import { buffer } from 'node:stream/consumers';
import { join } from 'path';
import { ipcMain } from 'electron';
import { IMAP_TIMEOUT_MS } from './config/mail';
import type { ImapFlow, MessageStructureObject } from 'imapflow';
import type { RegisterMailIpcHandlersOptions, MailAccountConfig, MailInboxItem } from './types';

function parsePort(raw: string, fallback: number): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  const intValue = Math.floor(value);
  if (intValue < 1 || intValue > 65535) return fallback;
  return intValue;
}

function readMailConfig(storeDir: string, key: string): MailAccountConfig | null {
  try {
    const filePath = join(storeDir, `${key}.json`);
    if (!existsSync(filePath)) return null;
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw) as Partial<MailAccountConfig>;
    if (!data || typeof data !== 'object') return null;
    return {
      emailAddress: typeof data.emailAddress === 'string' ? data.emailAddress.trim() : '',
      imapHost: typeof data.imapHost === 'string' ? data.imapHost.trim() : '',
      imapPort: typeof data.imapPort === 'string' ? data.imapPort.trim() : '993',
      imapSecure: data.imapSecure !== false,
      authUser: typeof data.authUser === 'string' ? data.authUser.trim() : '',
      authSecret: typeof data.authSecret === 'string' ? data.authSecret : '',
    };
  } catch {
    return null;
  }
}

function ensureMailConfig(config: MailAccountConfig | null): MailAccountConfig {
  if (!config) {
    throw new Error('未检测到邮箱配置，请先在设置中完成 IMAP 参数填写');
  }
  if (!config.imapHost) {
    throw new Error('IMAP 服务器不能为空');
  }
  if (!config.authUser || !config.authSecret) {
    throw new Error('邮箱认证信息不完整，请检查认证用户名和密钥');
  }
  return config;
}

function formatEnvelopeAddressList(value: unknown): string {
  if (!Array.isArray(value)) return '';
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return '';
      const normalized = entry as { name?: string; address?: string };
      if (normalized.name && normalized.address) return `${normalized.name} <${normalized.address}>`;
      return normalized.address || normalized.name || '';
    })
    .filter(Boolean)
    .join(', ');
}

function toIsoDateString(value: unknown): string {
  if (!(value instanceof Date)) return '';
  if (Number.isNaN(value.getTime())) return '';
  return value.toISOString();
}

/** 从 IMAP 包络创建轻量列表项；正文仅由详情请求填入。
 * @param uid - 消息序号回退值
 * @param message - IMAP 返回的消息包络
 * @param validity - 邮箱代次
 * @returns 摘要条目；消息不存在时返回 null
 */
function toMailInboxItem(uid: number, message: Awaited<ReturnType<ImapFlow['fetchOne']>>, validity: string): MailInboxItem | null {
  if (!message) return null;
  return {
    uid: String(message.uid ?? uid), uidValidity: validity,
    subject: (message.envelope?.subject || '(无主题)').slice(0, 2048),
    from: formatEnvelopeAddressList(message.envelope?.from).slice(0, 2048),
    to: formatEnvelopeAddressList(message.envelope?.to).slice(0, 2048),
    date: toIsoDateString(message.envelope?.date),
    size: typeof message.size === 'number' ? message.size : 0,
    preview: '', body: '',
  };
}

/** 找出正文 MIME 部分；不访问附件或作为附件的转发邮件。
 * @param node - 邮件 MIME 结构
 * @returns 可读取的正文部分
 */
function bodyParts(node: MessageStructureObject | undefined): MessageStructureObject[] {
  if (!node || node.disposition?.toLowerCase() === 'attachment' || node.type === 'message/rfc822') return [];
  if (node.type === 'text/html' || node.type === 'text/plain') return [node];
  const children = (node.childNodes ?? []).flatMap(bodyParts);
  if (node.type === 'multipart/alternative') {
    const html = children.filter((part) => part.type === 'text/html');
    return html.length ? html : children.filter((part) => part.type === 'text/plain');
  }
  return children;
}

/** 对纯文本正文转义后包裹为 HTML，保持完整邮件可读。
 * @param text - 解码后的纯文本正文
 * @returns 转义后的 HTML 正文
 */
function plainHtml(text: string): string {
  return `<pre>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`;
}

async function withImapClient<T>(config: MailAccountConfig, task: (client: ImapFlow) => Promise<T>): Promise<T> {
  // 邮件库及其 MIME 解析依赖只在实际访问邮箱时加载，避免常驻岛屿为空闲功能付出启动内存。
  const { ImapFlow } = await import('imapflow');
  const client = new ImapFlow({
    host: config.imapHost,
    port: parsePort(config.imapPort, config.imapSecure ? 993 : 143),
    secure: config.imapSecure,
    auth: {
      user: config.authUser,
      pass: config.authSecret,
    },
    tls: {
      rejectUnauthorized: false,
    },
    logger: false,
    disableAutoIdle: true,
    socketTimeout: IMAP_TIMEOUT_MS,
    greetingTimeout: IMAP_TIMEOUT_MS,
    connectionTimeout: IMAP_TIMEOUT_MS,
  });

  try {
    await client.connect();
    const result = await task(client);
    return result;
  } finally {
    await client.logout().catch(() => {
      client.close();
    });
  }
}

/** 按消息序号读取末页包络，避免 SEARCH ALL 与完整邮件下载。
 * @param config - 邮箱连接配置
 * @param limit - 最大摘要数量
 * @returns 按最新消息排序的摘要列表
 */
async function listInbox(config: MailAccountConfig, limit: number): Promise<MailInboxItem[]> {
  return withImapClient(config, async (client) => {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const count = client.mailbox ? client.mailbox.exists : 0;
      const validity = client.mailbox ? String(client.mailbox.uidValidity) : '';
      const items: MailInboxItem[] = [];
      const sequences = Array.from({ length: Math.min(count, limit) }, (value, index) => {
        void value;
        return count - index;
      });
      await sequences.reduce(async (previous, sequence) => {
        await previous;
        const message = await client.fetchOne(sequence, { uid: true, size: true, envelope: true, flags: true });
        const item = toMailInboxItem(sequence, message, validity);
        if (item) items.push(item);
      }, Promise.resolve());
      return items;
    } finally { lock.release(); }
  });
}

/** 只下载用户打开的正文 MIME 部分；IMAP 流负责传输编码及字符集解码。
 * @param config - 邮箱连接配置
 * @param uid - 消息 UID
 * @param expectedValidity - 列表读取时的邮箱代次
 * @returns 包含正文的邮件条目
 */
async function readMailBody(config: MailAccountConfig, uid: string, expectedValidity?: string): Promise<MailInboxItem> {
  return withImapClient(config, async (client) => {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const validity = client.mailbox ? String(client.mailbox.uidValidity) : '';
      if (expectedValidity && expectedValidity !== validity) throw new Error('Mailbox changed; refresh the inbox.');
      const message = await client.fetchOne(uid, { uid: true, size: true, envelope: true, bodyStructure: true }, { uid: true });
      const item = toMailInboxItem(Number(uid), message, validity);
      if (!item || !message) throw new Error('Message no longer exists.');
      const bodies: string[] = [];
      await bodyParts(message.bodyStructure).reduce(async (previous, part) => {
        // 同一 IMAP 连接按顺序下载，避免交错读取响应。
        await previous;
        const { content } = await client.download(uid, part.part || '1', { uid: true, chunkSize: 64 * 1024 });
        if (!content) throw new Error('Message no longer exists.');
        try {
          const body = (await buffer(content)).toString('utf8');
          bodies.push(part.type === 'text/html' ? body : plainHtml(body));
        } finally { content.destroy(); }
      }, Promise.resolve());
      return { ...item, body: bodies.join('\n') };
    } finally { lock.release(); }
  });
}

function isMailAccountConfigLike(value: unknown): value is MailAccountConfig {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.imapHost === 'string'
    && typeof obj.authUser === 'string'
    && typeof obj.authSecret === 'string';
}

/** 注册所有邮件相关的 IPC handler（收件箱列表、邮件详情、账户配置等）。
 * @param options - 邮件配置的存储位置
 */
export function registerMailIpcHandlers(options: RegisterMailIpcHandlersOptions): void {
  // 详情独立的字节 LRU；超预算正文仍可完整阅读，但不会在列表/缓存重复驻留。
  const bodyCache = new Map<string, MailInboxItem>();
  const pending = new Map<string, Promise<MailInboxItem>>();
  let cacheBytes = 0;
  let detailQueue: Promise<unknown> = Promise.resolve();
  ipcMain.handle('mail:message:get', async (event, rawConfig: unknown, uid: string, validity?: string) => {
    void event;
    try {
      if (!isMailAccountConfigLike(rawConfig) || !/^\d+$/.test(uid)) throw new Error('Invalid mail request.');
      const config = ensureMailConfig(rawConfig);
      const key = JSON.stringify([config.imapHost, config.imapPort, config.imapSecure, config.authUser, validity, uid]);
      const cached = bodyCache.get(key);
      if (cached) {
        bodyCache.delete(key); bodyCache.set(key, cached);
        return { ok: true, items: [cached], message: '' };
      }
      let request = pending.get(key);
      if (!request) {
        if (pending.size >= 8) throw new Error('Mail reader is busy; retry shortly.');
        const previousRequest = detailQueue;
        request = (async () => {
          try {
            await previousRequest;
            const item = await readMailBody(config, uid, validity);
            const bytes = item.body.length * 2;
            const budget = 8 * 1024 * 1024;
            if (bytes <= budget) {
              while (cacheBytes + bytes > budget && bodyCache.size) {
                const oldest = bodyCache.keys().next().value!;
                cacheBytes -= bodyCache.get(oldest)!.body.length * 2;
                bodyCache.delete(oldest);
              }
              bodyCache.set(key, item); cacheBytes += bytes;
            }
            return item;
          } finally {
            pending.delete(key);
          }
        })();
        pending.set(key, request);
        const currentRequest = request;
        detailQueue = (async () => {
          try {
            await currentRequest;
          } catch {
            // 单条邮件失败后仍允许队列继续处理后续请求。
          }
        })();
      }
      return { ok: true, items: [await request], message: '' };
    } catch (error) {
      return { ok: false, items: [], message: error instanceof Error ? error.message : 'Mail body could not be loaded.' };
    }
  });
  ipcMain.handle('mail:inbox:list', async (event, configOrLimit?: unknown, limitRaw?: number) => {
    void event;
    try {
      let config: MailAccountConfig;
      let limit: number;

      if (isMailAccountConfigLike(configOrLimit)) {
        config = ensureMailConfig({
          emailAddress: typeof configOrLimit.emailAddress === 'string' ? configOrLimit.emailAddress.trim() : '',
          imapHost: configOrLimit.imapHost.trim(),
          imapPort: typeof configOrLimit.imapPort === 'string' ? configOrLimit.imapPort.trim() : '993',
          imapSecure: configOrLimit.imapSecure !== false,
          authUser: configOrLimit.authUser.trim(),
          authSecret: configOrLimit.authSecret,
        });
        limit = Math.max(1, Math.min(30, Math.floor(typeof limitRaw === 'number' && Number.isFinite(limitRaw) ? limitRaw : 10)));
      } else {
        config = ensureMailConfig(readMailConfig(options.storeDir, options.mailConfigStoreKey));
        limit = Math.max(1, Math.min(30, Math.floor(typeof configOrLimit === 'number' && Number.isFinite(configOrLimit) ? configOrLimit : 10)));
      }

      const items = await listInbox(config, limit);
      return { items, ok: true, message: '' };
    } catch (error) {
      return {
        ok: false,
        items: [] as MailInboxItem[],
        message: error instanceof Error ? error.message : '收件箱读取失败',
      };
    }
  });
}

export default registerMailIpcHandlers;
