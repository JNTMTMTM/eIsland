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

import { ipcMain } from 'electron';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { join } from 'path';

interface RegisterMailIpcHandlersOptions {
  storeDir: string;
  mailConfigStoreKey: string;
}

interface MailAccountConfig {
  emailAddress: string;
  imapHost: string;
  imapPort: string;
  imapSecure: boolean;
  authUser: string;
  authSecret: string;
}

interface MailInboxItem {
  uid: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  size: number;
  preview: string;
  body: string;
}

interface MailInboxCacheStore {
  accounts: Record<string, Record<string, MailInboxItem>>;
}

const IMAP_TIMEOUT_MS = 15000;
const MAIL_INBOX_CACHE_STORE_KEY = 'mail-inbox-cache';
const MAIL_INBOX_CACHE_MAX_ITEMS = 200;

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

function normalizeMailText(value: string): string {
  return value.replace(/\r\n?/g, '\n').trim();
}

function toMailPreview(value: string, maxLength = 180): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function ensureMailInboxItemCompatibility(item: MailInboxItem): MailInboxItem {
  return {
    uid: item.uid,
    subject: item.subject || '(无主题)',
    from: item.from || '',
    to: item.to || '',
    date: item.date || '',
    size: Number.isFinite(item.size) ? item.size : 0,
    preview: typeof item.preview === 'string' ? item.preview : '',
    body: typeof item.body === 'string' ? item.body : '',
  };
}

function hasMailContent(item: MailInboxItem): boolean {
  if (!item.preview?.trim() && !item.body?.trim()) return false;
  if (item.body && !/<[a-z][\s\S]*>/i.test(item.body)) return false;
  return true;
}

function getInboxCacheFilePath(storeDir: string): string {
  return join(storeDir, `${MAIL_INBOX_CACHE_STORE_KEY}.json`);
}

function toAccountCacheKey(config: MailAccountConfig): string {
  return [
    config.imapHost.trim().toLowerCase(),
    parsePort(config.imapPort, config.imapSecure ? 993 : 143),
    config.imapSecure ? 'tls' : 'plain',
    config.authUser.trim().toLowerCase(),
  ].join('|');
}

function readInboxCache(storeDir: string): MailInboxCacheStore {
  try {
    const filePath = getInboxCacheFilePath(storeDir);
    if (!existsSync(filePath)) return { accounts: {} };
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<MailInboxCacheStore>;
    if (!parsed || typeof parsed !== 'object' || !parsed.accounts || typeof parsed.accounts !== 'object') {
      return { accounts: {} };
    }
    return { accounts: parsed.accounts as Record<string, Record<string, MailInboxItem>> };
  } catch {
    return { accounts: {} };
  }
}

function writeInboxCache(storeDir: string, value: MailInboxCacheStore): void {
  try {
    const filePath = getInboxCacheFilePath(storeDir);
    writeFileSync(filePath, JSON.stringify(value), 'utf-8');
  } catch {
    // ignore cache write errors
  }
}

async function toMailInboxItem(uid: number, message: Awaited<ReturnType<ImapFlow['fetchOne']>>): Promise<MailInboxItem | null> {
  if (!message) return null;
  const parsed = message.source ? await simpleParser(message.source) : null;
  const plainText = normalizeMailText(typeof parsed?.text === 'string' ? parsed.text : '');
  const body = typeof parsed?.html === 'string' && parsed.html.trim()
    ? parsed.html
    : typeof parsed?.textAsHtml === 'string' && parsed.textAsHtml.trim()
      ? parsed.textAsHtml
      : plainText;
  return {
    uid: String(message.uid ?? uid),
    subject: parsed?.subject || message.envelope?.subject || '(无主题)',
    from: parsed?.from?.text || formatEnvelopeAddressList(message.envelope?.from),
    to: parsed?.to?.text || formatEnvelopeAddressList(message.envelope?.to),
    date: toIsoDateString(parsed?.date) || toIsoDateString(message.envelope?.date),
    size: typeof message.size === 'number'
      ? message.size
      : (Buffer.isBuffer(message.source) ? message.source.length : 0),
    preview: toMailPreview(plainText),
    body,
  };
}

async function withImapClient<T>(config: MailAccountConfig, task: (client: ImapFlow) => Promise<T>): Promise<T> {
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
    return await task(client);
  } finally {
    await client.logout().catch(() => {
      client.close();
    });
  }
}

async function listInbox(config: MailAccountConfig, limit: number, storeDir: string): Promise<MailInboxItem[]> {
  const cacheStore = readInboxCache(storeDir);
  const accountCacheKey = toAccountCacheKey(config);
  const accountCache = cacheStore.accounts[accountCacheKey] || {};

  return withImapClient(config, async (client) => {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const searchResult = await client.search({ all: true }, { uid: true });
      const uids = Array.isArray(searchResult) ? searchResult : [];
      const selectedUids = uids.slice(-limit).reverse();
      const items: MailInboxItem[] = [];

      for (let uidIdx = 0; uidIdx < selectedUids.length; uidIdx++) {
        const uid = selectedUids[uidIdx];
        const cacheKey = String(uid);
        const cached = accountCache[cacheKey];
        if (cached) {
          const normalizedCached = ensureMailInboxItemCompatibility(cached);
          if (hasMailContent(normalizedCached)) {
            items.push(normalizedCached);
            accountCache[cacheKey] = normalizedCached;
            continue;
          }
        }

        const message = await client.fetchOne(
          uid,
          {
            uid: true,
            source: true,
            size: true,
            envelope: true,
          },
          { uid: true },
        );
        const item = await toMailInboxItem(uid, message);
        if (!item) continue;
        const normalizedItem = ensureMailInboxItemCompatibility(item);
        items.push(normalizedItem);
        accountCache[cacheKey] = normalizedItem;
        accountCache[normalizedItem.uid] = normalizedItem;
      }

      const keepUidKeys = uids.slice(-MAIL_INBOX_CACHE_MAX_ITEMS).map((uid) => String(uid));
      const nextAccountCache: Record<string, MailInboxItem> = {};
      keepUidKeys.forEach((uid) => {
        const cached = accountCache[uid];
        if (cached) {
          nextAccountCache[uid] = cached;
        }
      });
      cacheStore.accounts[accountCacheKey] = nextAccountCache;
      writeInboxCache(storeDir, cacheStore);

      return items;
    } finally {
      lock.release();
    }
  });
}

function isMailAccountConfigLike(value: unknown): value is MailAccountConfig {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.imapHost === 'string'
    && typeof obj.authUser === 'string'
    && typeof obj.authSecret === 'string';
}

/** 注册所有邮件相关的 IPC handler（收件箱列表、邮件详情、账户配置等）。 */
export function registerMailIpcHandlers(options: RegisterMailIpcHandlersOptions): void {
  ipcMain.handle('mail:inbox:list', async (_event, configOrLimit?: unknown, limitRaw?: number) => {
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
        limit = Math.max(1, Math.min(30, Math.floor(typeof limitRaw === 'number' ? limitRaw : 10)));
      } else {
        config = ensureMailConfig(readMailConfig(options.storeDir, options.mailConfigStoreKey));
        limit = Math.max(1, Math.min(30, Math.floor(typeof configOrLimit === 'number' ? configOrLimit : 10)));
      }

      const items = await listInbox(config, limit, options.storeDir);
      return { ok: true, items, message: '' };
    } catch (error) {
      return {
        ok: false,
        items: [] as MailInboxItem[],
        message: error instanceof Error ? error.message : '收件箱读取失败',
      };
    }
  });
}
