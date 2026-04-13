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
 * @file clipboardUrl.ts
 * @description 剪贴板 URL 工具模块
 * @description 提供 URL 检测、提取、规范化和黑名单验证功能
 * @author 鸡哥
 */

export type ClipboardUrlDetectMode = 'https-only' | 'http-https' | 'domain-only';

const URL_REGEX_HTTPS_ONLY = /https:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
const URL_REGEX_HTTP_HTTPS = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
const URL_REGEX_DOMAIN_ONLY = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(?:\/[^\s<>"{}|\\^`\[\]]*)?/gi;

/**
 * 规范化剪贴板 URL 检测模式
 * @description 验证并返回有效的检测模式，无效时返回 null
 * @param mode - 原始模式值
 * @returns 有效的检测模式或 null
 */
export function normalizeClipboardUrlDetectMode(mode: unknown): ClipboardUrlDetectMode | null {
  if (mode === 'https-only' || mode === 'http-https' || mode === 'domain-only') {
    return mode;
  }
  return null;
}

/**
 * 规范化黑名单域名
 * @description 将域名格式化为标准的主机名格式
 * @param domain - 原始域名字符串
 * @returns 规范化后的主机名，无效时返回空字符串
 */
export function normalizeClipboardUrlBlacklistDomain(domain: string): string {
  const trimmed = domain.trim().toLowerCase();
  if (!trimmed) return '';
  try {
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const hostname = new URL(withScheme).hostname.toLowerCase().replace(/\.$/, '');
    return hostname;
  } catch {
    return '';
  }
}

/**
 * 清理剪贴板 URL 黑名单
 * @description 规范化黑名单数组，去除重复和无效项
 * @param raw - 原始黑名单数据
 * @returns 清理后的域名数组
 */
export function sanitizeClipboardUrlBlacklist(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const unique = (raw as unknown[]).reduce<Set<string>>((acc, item) => {
    if (typeof item !== 'string') return acc;
    const normalized = normalizeClipboardUrlBlacklistDomain(item);
    if (normalized) acc.add(normalized);
    return acc;
  }, new Set<string>());
  return [...unique.values()];
}

function normalizeDomainOnlyUrl(url: string): string {
  const trimmed = url.replace(/[),.;!?]+$/g, '');
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * 从文本中提取 URL
 * @description 根据检测模式从文本中提取 URL 列表
 * @param text - 要搜索的文本
 * @param mode - URL 检测模式
 * @returns 提取的 URL 数组
 */
export function extractUrls(text: string, mode: ClipboardUrlDetectMode): string[] {
  let matches: string[] = [];

  if (mode === 'https-only') {
    matches = text.match(URL_REGEX_HTTPS_ONLY) || [];
  } else if (mode === 'domain-only') {
    matches = (text.match(URL_REGEX_DOMAIN_ONLY) || []).map(normalizeDomainOnlyUrl).filter(Boolean);
  } else {
    matches = text.match(URL_REGEX_HTTP_HTTPS) || [];
  }

  if (matches.length === 0) return [];

  const unique = matches.reduce<Map<string, string>>((acc, item) => {
    const key = item.toLowerCase();
    if (!acc.has(key)) acc.set(key, item);
    return acc;
  }, new Map<string, string>());
  return [...unique.values()];
}

/**
 * 检查 URL 是否在黑名单中
 * @description 验证给定 URL 是否匹配黑名单中的域名
 * @param url - 要检查的 URL
 * @param blacklist - 黑名单域名数组
 * @returns 是否被阻止
 */
export function isUrlBlacklisted(url: string, blacklist: string[]): boolean {
  if (blacklist.length === 0) return false;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return blacklist.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}
