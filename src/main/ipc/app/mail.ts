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
import { join } from 'path';
import { Socket } from 'net';
import { TLSSocket, connect as tlsConnect } from 'tls';

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
  if (!config.authUser || !config.authSecret) {
    throw new Error('邮箱认证信息不完整，请检查认证用户名和密钥');
  }
  return config;
}

function quoteImapString(value: string): string {
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}"`;
}

function decodeMimeHeader(value: string): string {
  const trimmed = value.trim();
  const regex = /=\?([^?]+)\?([BbQq])\?([^?]+)\?=/g;
  let matched = false;
  const decoded = trimmed.replace(regex, (_m, charsetRaw: string, encodingRaw: string, content: string) => {
    matched = true;
    const charset = String(charsetRaw || '').toLowerCase();
    const encoding = String(encodingRaw || '').toUpperCase();
    try {
      if (encoding === 'B') {
        const buf = Buffer.from(content, 'base64');
        if (charset === 'utf-8' || charset === 'utf8') return buf.toString('utf8');
        return buf.toString('utf8');
      }
      const q = content.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, (_s: string, hex: string) => {
        return String.fromCharCode(parseInt(hex, 16));
      });
      return Buffer.from(q, 'binary').toString('utf8');
    } catch {
      return content;
    }
  });
  return matched ? decoded : trimmed;
}

function parseHeaderBlock(headerRaw: string): { subject: string; from: string; to: string; date: string } {
  const unfolded = headerRaw.replace(/\r?\n[\t ]+/g, ' ');
  const subjectMatch = unfolded.match(/^Subject:\s*(.*)$/im);
  const fromMatch = unfolded.match(/^From:\s*(.*)$/im);
  const toMatch = unfolded.match(/^To:\s*(.*)$/im);
  const dateMatch = unfolded.match(/^Date:\s*(.*)$/im);
  return {
    subject: decodeMimeHeader(subjectMatch?.[1] || '(无主题)'),
    from: decodeMimeHeader(fromMatch?.[1] || ''),
    to: decodeMimeHeader(toMatch?.[1] || ''),
    date: dateMatch?.[1]?.trim() || '',
  };
}

class ImapSession {
  private socket: TLSSocket | Socket;

  private buffer = '';

  private readonly timeoutMs: number;

  private sequence = 1;

  constructor(socket: TLSSocket | Socket, timeoutMs: number) {
    this.socket = socket;
    this.timeoutMs = timeoutMs;
  }

  private nextTag(): string {
    const tag = `A${String(this.sequence).padStart(4, '0')}`;
    this.sequence += 1;
    return tag;
  }

  private waitLine(timeoutMs: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const cleanups: Array<() => void> = [];
      const cleanup = (): void => {
        cleanups.forEach((fn) => fn());
      };

      const tryResolve = (): boolean => {
        const idx = this.buffer.indexOf('\r\n');
        if (idx < 0) return false;
        const line = this.buffer.slice(0, idx);
        this.buffer = this.buffer.slice(idx + 2);
        cleanup();
        resolve(line);
        return true;
      };

      if (tryResolve()) return;

      const onData = (chunk: Buffer | string): void => {
        this.buffer += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk;
        void tryResolve();
      };
      const onError = (err: Error): void => {
        cleanup();
        reject(err);
      };
      const onClose = (): void => {
        cleanup();
        reject(new Error('IMAP 连接已关闭'));
      };

      this.socket.on('data', onData);
      this.socket.once('error', onError);
      this.socket.once('close', onClose);
      cleanups.push(() => this.socket.off('data', onData));
      cleanups.push(() => this.socket.off('error', onError));
      cleanups.push(() => this.socket.off('close', onClose));

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('IMAP 响应超时'));
      }, timeoutMs);
      cleanups.push(() => clearTimeout(timer));
    });
  }

  async readGreeting(): Promise<void> {
    const line = await this.waitLine(this.timeoutMs);
    if (!line.startsWith('* OK')) {
      throw new Error(`IMAP 握手失败: ${line}`);
    }
  }

  async command(commandText: string): Promise<string[]> {
    const tag = this.nextTag();
    this.socket.write(`${tag} ${commandText}\r\n`);
    const lines: string[] = [];
    for (;;) {
      const line = await this.waitLine(this.timeoutMs);
      lines.push(line);
      if (line.startsWith(`${tag} `)) {
        if (!line.includes(' OK')) {
          throw new Error(`IMAP 命令失败: ${line}`);
        }
        return lines;
      }
    }
  }

  close(): void {
    try {
      this.socket.end();
    } catch {
      // ignore
    }
  }
}

async function withImapSession<T>(config: MailAccountConfig, task: (session: ImapSession) => Promise<T>): Promise<T> {
  const host = config.imapHost;
  if (!host) throw new Error('IMAP 服务器不能为空');
  const port = parsePort(config.imapPort, config.imapSecure ? 993 : 143);

  const socket = config.imapSecure
    ? tlsConnect({ host, port, servername: host, rejectUnauthorized: false })
    : new Socket();

  if (!config.imapSecure) {
    (socket as Socket).connect(port, host);
  }

  const session = new ImapSession(socket, IMAP_TIMEOUT_MS);
  try {
    await session.readGreeting();
    await session.command(`LOGIN ${quoteImapString(config.authUser)} ${quoteImapString(config.authSecret)}`);
    const result = await task(session);
    await session.command('LOGOUT').catch(() => {});
    return result;
  } finally {
    session.close();
  }
}

function extractSearchUids(lines: string[]): string[] {
  const searchLine = lines.find((line) => line.startsWith('* SEARCH '));
  if (!searchLine) return [];
  const tokens = searchLine.slice('* SEARCH '.length).trim();
  if (!tokens) return [];
  return tokens.split(/\s+/).filter(Boolean);
}

function extractFetchInfo(lines: string[]): { size: number; headers: string } {
  let size = 0;
  const headerLines: string[] = [];
  let inHeader = false;

  lines.forEach((line) => {
    if (line.startsWith('* ') && line.includes(' RFC822.SIZE ')) {
      const sizeMatch = line.match(/RFC822\.SIZE\s+(\d+)/i);
      size = sizeMatch ? Number(sizeMatch[1]) : 0;
      const literalMatch = line.match(/\{\d+\}$/);
      if (literalMatch) inHeader = true;
      return;
    }

    if (inHeader) {
      if (line === ')') {
        inHeader = false;
        return;
      }
      headerLines.push(line);
    }
  });

  return {
    size,
    headers: headerLines.join('\r\n'),
  };
}

async function listInbox(config: MailAccountConfig, limit: number): Promise<MailInboxItem[]> {
  return withImapSession(config, async (session) => {
    await session.command('SELECT INBOX');
    const searchLines = await session.command('UID SEARCH ALL');
    const allUids = extractSearchUids(searchLines);
    const chosen = allUids.slice(-limit).reverse();
    const items: MailInboxItem[] = [];

    for (const uid of chosen) {
      const lines = await session.command(`UID FETCH ${uid} (BODY.PEEK[HEADER.FIELDS (FROM TO SUBJECT DATE)] RFC822.SIZE)`);
      const { size, headers } = extractFetchInfo(lines);
      const parsed = parseHeaderBlock(headers);
      items.push({
        uid,
        subject: parsed.subject,
        from: parsed.from,
        to: parsed.to,
        date: parsed.date,
        size,
      });
    }

    return items;
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
