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
import { existsSync, readFileSync } from 'fs';
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
}

const IMAP_TIMEOUT_MS = 15000;

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

async function listInbox(config: MailAccountConfig, limit: number): Promise<MailInboxItem[]> {
  return withImapClient(config, async (client) => {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const searchResult = await client.search({ all: true }, { uid: true });
      const uids = Array.isArray(searchResult) ? searchResult : [];
      const selectedUids = uids.slice(-limit).reverse();
      const items: MailInboxItem[] = [];

      for (const uid of selectedUids) {
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
        if (!message) continue;

        const parsed = message.source ? await simpleParser(message.source) : null;
        items.push({
          uid: String(message.uid ?? uid),
          subject: parsed?.subject || message.envelope?.subject || '(无主题)',
          from: parsed?.from?.text || formatEnvelopeAddressList(message.envelope?.from),
          to: parsed?.to?.text || formatEnvelopeAddressList(message.envelope?.to),
          date: toIsoDateString(parsed?.date) || toIsoDateString(message.envelope?.date),
          size: typeof message.size === 'number'
            ? message.size
            : (Buffer.isBuffer(message.source) ? message.source.length : 0),
        });
      }

      return items;
    } finally {
      lock.release();
    }
  });
}

export function registerMailIpcHandlers(options: RegisterMailIpcHandlersOptions): void {
  ipcMain.handle('mail:inbox:list', async (_event, limitRaw?: number) => {
    try {
      const config = ensureMailConfig(readMailConfig(options.storeDir, options.mailConfigStoreKey));
      const limit = Math.max(1, Math.min(30, Math.floor(typeof limitRaw === 'number' ? limitRaw : 10)));
      const items = await listInbox(config, limit);
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
