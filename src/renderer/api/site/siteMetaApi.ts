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
 * @file siteMetaApi.ts
 * @description 网站元信息接口模块（标题、图标）
 * @author 鸡哥
 */

const SITE_AUTH_POLICY_KEY = 'eIsland_siteAuthorizationPolicies';

export type SiteAuthorizationPolicy = 'ask' | 'allow' | 'deny';

interface SiteAuthorizationPolicyMap {
  [hostname: string]: SiteAuthorizationPolicy;
}

function normalizePolicy(value: unknown): SiteAuthorizationPolicy {
  return value === 'allow' || value === 'deny' ? value : 'ask';
}

function normalizeHostname(rawHostname: string): string {
  return rawHostname.trim().toLowerCase();
}

function loadSiteAuthorizationPolicies(): SiteAuthorizationPolicyMap {
  try {
    const raw = localStorage.getItem(SITE_AUTH_POLICY_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }
    const next: SiteAuthorizationPolicyMap = {};
    Object.entries(parsed).forEach(([hostname, value]) => {
      const key = normalizeHostname(hostname);
      if (!key) {
        return;
      }
      next[key] = normalizePolicy(value);
    });
    return next;
  } catch {
    return {};
  }
}

function saveSiteAuthorizationPolicies(policies: SiteAuthorizationPolicyMap): void {
  try {
    localStorage.setItem(SITE_AUTH_POLICY_KEY, JSON.stringify(policies));
  } catch {
    // ignore
  }
}

/**
 * 解析网页 HTML 中的标题
 * @param html - 原始 HTML 字符串
 * @returns 标题，失败返回空字符串
 */
export function parseHtmlTitle(html: string): string {
  const matched = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!matched || !matched[1]) return '';
  return matched[1]
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .trim();
}

/**
 * 获取网站 favicon 候选地址列表
 * @param rawUrl - 网站 URL
 * @returns favicon 候选地址数组，失败返回空数组
 */
export function getWebsiteFaviconUrls(rawUrl: string): string[] {
  try {
    const parsed = new URL(rawUrl);
    const googleFavicon = `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(parsed.origin)}`;
    const duckduckgoFavicon = `https://icons.duckduckgo.com/ip3/${parsed.hostname}.ico`;
    const originFavicon = `${parsed.origin.replace(/\/$/, '')}/favicon.ico`;
    return Array.from(new Set([googleFavicon, duckduckgoFavicon, originFavicon].filter(Boolean)));
  } catch {
    return [];
  }
}

/**
 * 获取网站 favicon 地址
 * @param rawUrl - 网站 URL
 * @returns favicon 地址，失败返回空字符串
 */
export function getWebsiteFaviconUrl(rawUrl: string): string {
  return getWebsiteFaviconUrls(rawUrl)[0] ?? '';
}

/**
 * 解析网站主机名
 * @param rawUrl - 网站 URL
 * @returns 主机名，失败返回空字符串
 */
export function getWebsiteHostname(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname;
  } catch {
    return '';
  }
}

/**
 * 读取域名授权策略（本地）
 * @param rawUrl - 网站 URL
 * @returns 授权策略
 */
export function getWebsiteAuthorizationPolicy(rawUrl: string): SiteAuthorizationPolicy {
  const hostname = normalizeHostname(getWebsiteHostname(rawUrl));
  if (!hostname) {
    return 'ask';
  }
  const policies = loadSiteAuthorizationPolicies();
  return normalizePolicy(policies[hostname]);
}

/**
 * 保存域名授权策略（本地）
 * @param rawUrl - 网站 URL
 * @param policy - 授权策略
 */
export function setWebsiteAuthorizationPolicy(rawUrl: string, policy: SiteAuthorizationPolicy): void {
  const hostname = normalizeHostname(getWebsiteHostname(rawUrl));
  if (!hostname) {
    return;
  }
  const normalizedPolicy = normalizePolicy(policy);
  const policies = loadSiteAuthorizationPolicies();
  if (normalizedPolicy === 'ask') {
    delete policies[hostname];
  } else {
    policies[hostname] = normalizedPolicy;
  }
  saveSiteAuthorizationPolicies(policies);
}

/**
 * 请求网页并解析标题
 * @param url - 目标网址
 * @param timeoutMs - 超时时间（毫秒）
 * @returns 网页标题，失败返回空字符串
 */
export async function fetchWebsiteTitle(url: string, timeoutMs = 8000): Promise<string> {
  try {
    const resp = await window.api.netFetch(url, {
      method: 'GET',
      timeoutMs,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!resp.ok || !resp.body) return '';
    return parseHtmlTitle(resp.body);
  } catch {
    return '';
  }
}
