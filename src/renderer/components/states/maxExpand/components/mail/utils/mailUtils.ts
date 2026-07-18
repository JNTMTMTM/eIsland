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
 * @file mailUtils.ts
 * @description Mail 模块纯工具函数：HTML 判断与转义、邮件正文构建、账户校验、存储读取等。
 * @author 鸡哥
 */

import type { SyntheticEvent } from 'react';
import {
  DEFAULT_MAIL_FETCH_LIMIT,
  MAIL_CONFIG_STORE_KEY,
  MAIL_ACCOUNTS_STORE_KEY,
  MAIL_FETCH_LIMIT_STORE_KEY,
  MAIL_INBOX_REFRESH_TIMEOUT_MS,
  MAIL_INJECT_HEAD,
  MAIL_WRAP_STYLE,
  MAX_MAIL_FETCH_LIMIT,
  MIN_MAIL_FETCH_LIMIT,
} from '../config/mailConfig';
import type { MailAccountConfig, MailAccountState, MailInboxItem } from '../types/mailTypes';

/** 模块级内存缓存，跨渲染保持收件箱数据 */
let mailTabInboxMemoryCache: MailInboxItem[] = [];

/**
 * 判断内容是否包含 HTML 标签
 * @param content - 待检测文本
 * @returns 是否为 HTML 内容
 */
export function isHtmlContent(content: string): boolean {
  return /<\s*(html|head|body|div|p|table|br|span|a|img|ul|ol|li|h[1-6])\b/i.test(content);
}

/**
 * 转义 HTML 特殊字符
 * @param text - 原始文本
 * @returns 转义后的文本
 */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * 构建邮件正文 srcDoc：注入 base / style / 脚本，处理纯文本降级
 * @param content - 原始邮件正文
 * @returns 可直接赋值给 iframe srcDoc 的完整 HTML
 */
export function buildMailSrcDoc(content: string): string {
  if (/<html[\s>]/i.test(content)) {
    if (/<head[\s>]/i.test(content)) {
      return content.replace(/(<head[^>]*>)/i, `$1${MAIL_INJECT_HEAD}`);
    }
    return content.replace(/(<html[^>]*>)/i, `$1<head>${MAIL_INJECT_HEAD}</head>`);
  }

  const bodyContent = isHtmlContent(content)
    ? content
    : `<pre style="white-space:pre-wrap;word-break:break-word;margin:0;font-family:inherit;">${escapeHtml(content)}</pre>`;

  return MAIL_WRAP_STYLE + bodyContent + '</body></html>';
}

/**
 * 判断账户是否已完成 IMAP 配置
 * @param account - 账户配置对象
 * @returns 是否已配置
 */
export function isAccountConfigured(account: MailAccountConfig): boolean {
  return Boolean(account.imapHost?.trim() && account.authUser?.trim() && account.authSecret);
}

/**
 * 校验并规范化存储中的拉取数量
 * @param value - 存储中读取的原始值
 * @returns 合法的拉取数量
 */
export function getStoredFetchLimit(value: unknown): number {
  if (typeof value === 'number' && value >= MIN_MAIL_FETCH_LIMIT && value <= MAX_MAIL_FETCH_LIMIT) {
    return value;
  }
  return DEFAULT_MAIL_FETCH_LIMIT;
}

/**
 * 从持久化存储读取拉取数量
 * @returns 合法的拉取数量
 */
export async function readStoredFetchLimit(): Promise<number> {
  const value = await window.api.storeRead(MAIL_FETCH_LIMIT_STORE_KEY).catch(() => DEFAULT_MAIL_FETCH_LIMIT);
  return getStoredFetchLimit(value);
}

/**
 * 将旧版单账户配置规范化为新格式
 * @param raw - 存储中读取的原始数据
 * @returns 规范化后的账户配置，无效时返回 null
 */
export function normalizeLegacyAccount(raw: unknown): MailAccountConfig | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const cfg = raw as Record<string, unknown>;
  const hasConfig = Boolean(
    typeof cfg.imapHost === 'string' && cfg.imapHost.trim()
    && typeof cfg.authUser === 'string' && cfg.authUser.trim()
    && typeof cfg.authSecret === 'string' && cfg.authSecret,
  );

  if (!hasConfig) {
    return null;
  }

  return {
    id: 'legacy',
    label: typeof cfg.emailAddress === 'string' ? cfg.emailAddress : '',
    emailAddress: typeof cfg.emailAddress === 'string' ? cfg.emailAddress : '',
    imapHost: typeof cfg.imapHost === 'string' ? cfg.imapHost : '',
    imapPort: typeof cfg.imapPort === 'string' ? cfg.imapPort : '993',
    imapSecure: typeof cfg.imapSecure === 'boolean' ? cfg.imapSecure : true,
    authUser: typeof cfg.authUser === 'string' ? cfg.authUser : '',
    authSecret: typeof cfg.authSecret === 'string' ? cfg.authSecret : '',
  };
}

/**
 * 读取邮箱账户配置状态（优先多账户，降级旧版单账户）
 * @returns 账户状态：是否已配置、账户列表、当前活跃账户
 */
export async function readMailAccountState(): Promise<MailAccountState> {
  try {
    const accountsRaw = await window.api.storeRead(MAIL_ACCOUNTS_STORE_KEY);
    if (Array.isArray(accountsRaw) && accountsRaw.length > 0) {
      const accounts = accountsRaw as MailAccountConfig[];
      const activeAccount = accounts.find(isAccountConfigured) || null;

      return {
        configured: Boolean(activeAccount),
        accounts,
        activeAccount,
      };
    }

    const legacyAccount = normalizeLegacyAccount(await window.api.storeRead(MAIL_CONFIG_STORE_KEY));
    if (legacyAccount) {
      return {
        configured: true,
        accounts: [legacyAccount],
        activeAccount: legacyAccount,
      };
    }
  } catch {
    return {
      configured: false,
      accounts: [],
      activeAccount: null,
    };
  }

  return {
    configured: false,
    accounts: [],
    activeAccount: null,
  };
}

/**
 * 拉取指定账户的收件箱（带超时保护）
 * @param account - 目标账户配置
 * @param fetchLimit - 拉取数量上限
 * @param timeoutMessage - 超时错误信息
 * @returns 邮件列表，超时或失败返回 null
 */
export async function fetchInbox(
  account: MailAccountConfig,
  fetchLimit: number,
  timeoutMessage: string,
): Promise<MailInboxItem[] | null> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, MAIL_INBOX_REFRESH_TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([
      window.api.mailInboxList({
        emailAddress: account.emailAddress,
        imapHost: account.imapHost,
        imapPort: account.imapPort,
        imapSecure: account.imapSecure,
        authUser: account.authUser,
        authSecret: account.authSecret,
      }, fetchLimit),
      timeoutPromise,
    ]);

    if (!result.ok) {
      return null;
    }

    return result.items || [];
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * 清空收件箱内存缓存
 */
export function clearInboxMemoryCache(): void {
  mailTabInboxMemoryCache = [];
}

/**
 * 更新收件箱内存缓存
 * @param inbox - 最新收件箱数据
 */
export function updateInboxMemoryCache(inbox: MailInboxItem[]): void {
  mailTabInboxMemoryCache = inbox;
}

/**
 * 阻止事件冒泡（用于滚动容器隔离）
 * @param event - React 合成事件
 */
export function stopEventPropagation(event: SyntheticEvent): void {
  event.stopPropagation();
}

/**
 * 格式化邮件日期为本地化字符串
 * @param date - ISO 日期字符串
 * @returns 本地化日期字符串
 */
export function formatMailDate(date: string): string {
  return new Date(date).toLocaleString();
}

/**
 * 获取当前内存缓存的收件箱数据
 * @returns 缓存的邮件列表
 */
export function getInboxMemoryCache(): MailInboxItem[] {
  return mailTabInboxMemoryCache;
}
