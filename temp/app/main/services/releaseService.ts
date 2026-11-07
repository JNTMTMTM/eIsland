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
 * @file releaseService.ts
 * @description 读取官方 Tauri 清单，按 HTTPS 重定向和流式边界下载，签名由成熟 Rust 库验证。
 * @author 鸡哥
 */
import { createHash } from 'node:crypto';
import { open, rename, rm, stat, copyFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { isIP } from 'node:net';
import { valid, prerelease, gte } from 'semver';
import { FEEDS, GITHUB_ASSET_HOSTS, MAX_INSTALLER_BYTES, MINIMUM_TAURI_VERSION } from '../../shared/config/adapterConfig';
import { fail } from '../../shared/utils/adapterErrors';
import type { Progress, Release } from '../../shared/types/adapterTypes';

/** 只接受发布源的 HTTPS 域名地址，测试可显式允许自己的 loopback 服务。
 * @param value - 原始地址。
 * @param loopback - 仅供隔离测试的本机 HTTP 边界。
 * @returns 已校验地址。
 */
export function releaseUrl(value: string, loopback = false): URL {
  const url = new URL(value);
  const testLoopback = loopback && url.hostname === '127.0.0.1';
  if (url.username || url.password || (url.protocol !== 'https:' && !(testLoopback && url.protocol === 'http:'))) fail('invalidManifest');
  // 官方源都使用域名；拒绝 IP 字面量，避免清单把请求指向本机、链路本地或内网地址。
  if (isIP(url.hostname.replace(/^\[|\]$/g, '')) && !testLoopback) fail('invalidManifest');
  return url;
}

/** 汇总允许连接的主机：已配置清单所在域名及 GitHub Release 的资源跳转域名。
 * @param feeds - 构建时配置的清单地址。
 * @returns 小写主机名白名单。
 */
export function trustedHosts(feeds: Partial<Record<string, string>>): string[] {
  const hosts = Object.values(feeds).filter((value): value is string => Boolean(value)).map((value) => new URL(value).hostname.toLowerCase());
  return [...new Set([...hosts, ...GITHUB_ASSET_HOSTS])];
}

/** 兼容官方及现有混合清单，不将旧 Electron YAML 误认为 Tauri 安装器。
 * @param raw - 已受大小限制的 JSON 对象。
 * @returns 可供下载和验证的 Windows x64 发布信息。
 */
export function parseRelease(raw: unknown): Release {
  if (!raw || typeof raw !== 'object') fail('invalidManifest');
  const item = raw as Record<string, unknown>;
  const {version} = item;
  if (typeof version !== 'string' || valid(version) !== version || prerelease(version) !== null) fail('invalidManifest');
  if (!gte(version, MINIMUM_TAURI_VERSION)) fail('targetTooOld');
  if (item.runtime !== undefined && item.runtime !== 'tauri') fail('invalidManifest');
  const platforms = item.platforms as Record<string, Record<string, unknown>> | undefined;
  const asset = platforms?.['windows-x86_64'];
  if (!asset || typeof asset.url !== 'string' || typeof asset.signature !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(asset.signature) || asset.signature.length > 16384) fail('invalidManifest');
  if (asset.format !== undefined && asset.format !== 'nsis') fail('invalidManifest');
  const url = releaseUrl(asset.url);
  if (!url.pathname.toLowerCase().endsWith('.exe')) fail('invalidManifest');
  if (asset.size !== undefined && (!Number.isSafeInteger(asset.size) || Number(asset.size) <= 0 || Number(asset.size) > MAX_INSTALLER_BYTES)) fail('invalidManifest');
  if (asset.sha512 !== undefined && (typeof asset.sha512 !== 'string' || !/^[A-Za-z0-9+/]{86}==$/.test(asset.sha512))) fail('invalidManifest');
  return { version, url: url.toString(), signature: asset.signature, notes: typeof item.notes === 'string' ? item.notes.slice(0, 16000) : '', size: asset.size as number | undefined, sha512: asset.sha512 };
}

/** 复用有界下载协议，验证与安装职责仍留在独立服务。 */
export class ReleaseService {
  /** 注入请求边界；正式程序使用独立 Electron session 的系统代理策略。
   * @param fetcher - fetch 兼容请求实现。
   * @param loopback - 仅在测试中允许本机 HTTP。
   * @param hosts - 清单、安装包及重定向允许到达的主机，默认取内置官方源。
   */
  constructor(private readonly fetcher: (address: URL, options: RequestInit) => Promise<Response> = fetch, private readonly loopback = false, private readonly hosts: readonly string[] = trustedHosts(FEEDS)) {}

  /** 限制每次响应头等待和重定向数量，阻止 HTTPS 降级及跳转到白名单外主机。
   * @param address - 起始 URL。
   * @param signal - 本次操作取消信号。
   * @returns HTTP 响应。
   */
  async request(address: string, signal: AbortSignal): Promise<Response> {
    const allowed = (value: string): URL => {
      const url = releaseUrl(value, this.loopback);
      if (!this.hosts.includes(url.hostname.toLowerCase())) fail('network');
      return url;
    };
    let url = allowed(address);
    for (let redirects = 0; redirects <= 5; redirects += 1) {
      const timeout = new AbortController();
      const timer = setTimeout(() => timeout.abort(), 30000);
      let response: Response;
      try {
        response = await this.fetcher(url, { signal: AbortSignal.any([signal, timeout.signal]), redirect: 'manual', credentials: 'omit', headers: { 'Accept-Encoding': 'identity' } });
      } finally { clearTimeout(timer); }
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        await response.body?.cancel();
        const location = response.headers.get('location');
        if (!location) fail('network');
        url = allowed(new URL(location, url).toString());
      } else {
        if (!response.ok) { await response.body?.cancel(); fail('network'); }
        return response;
      }
    }
    return fail('network');
  }

  /** 读取有界更新清单。
   * @param address - 已配置的官方源。
   * @param signal - 取消信号。
   * @returns 已校验清单。
   */
  async manifest(address: string, signal: AbortSignal): Promise<Release> {
    const timeout = new AbortController();
    const combined = AbortSignal.any([signal, timeout.signal, AbortSignal.timeout(120000)]);
    const response = await this.request(address, combined);
    const reader = response.body?.getReader();
    if (!reader) fail('network');
    const chunks: Uint8Array[] = [];
    let size = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      while (true) {
        combined.throwIfAborted();
        timer = setTimeout(() => timeout.abort(), 30000);
        const result = await reader.read();
        clearTimeout(timer);
        if (result.done) break;
        size += result.value.length;
        if (size > 1024 * 1024) fail('invalidManifest');
        chunks.push(result.value);
      }
    } finally { clearTimeout(timer); await reader.cancel().catch(() => {}); }
    return parseRelease(JSON.parse(Buffer.concat(chunks).toString('utf8')));
  }

  /** 流式写入本次专属 .part 文件，仅完成全部检查后提交，不修改用户下载历史。
   * @param release - 发布信息。
   * @param destination - 本次专属暂存路径。
   * @param signal - 取消信号。
   * @param progress - 有界进度回调。
   * @param localFile - 用户选择的离线清单旁安装器。
   * @returns 暂存文件提交到 destination 后完成。
   */
  async download(release: Release, destination: string, signal: AbortSignal, progress: (value: Progress) => void, localFile?: string): Promise<void> {
    if (localFile) {
      const info = await stat(localFile);
      if (!info.isFile() || info.size > MAX_INSTALLER_BYTES) fail('invalidInstaller');
      signal.throwIfAborted();
      await copyFile(localFile, destination, constants.COPYFILE_EXCL);
      signal.throwIfAborted();
      progress({ done: info.size, total: info.size });
      return;
    }
    const idle = new AbortController();
    const combined = AbortSignal.any([signal, idle.signal, AbortSignal.timeout(30 * 60 * 1000)]);
    const response = await this.request(release.url, combined);
    const reader = response.body?.getReader();
    if (!reader) fail('network');
    const part = `${destination}.part`;
    const file = await open(part, 'wx');
    const hash = createHash('sha512');
    let done = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      while (true) {
        combined.throwIfAborted();
        timer = setTimeout(() => idle.abort(), 30000);
        const result = await reader.read();
        clearTimeout(timer);
        if (result.done) break;
        done += result.value.length;
        if (done > MAX_INSTALLER_BYTES || (release.size !== undefined && done > release.size)) fail('invalidInstaller');
        hash.update(result.value);
        await file.writeFile(result.value);
        progress({ done, total: release.size ?? null });
      }
      if (!done || (release.size !== undefined && done !== release.size) || (release.sha512 && release.sha512 !== hash.digest('base64'))) fail('invalidInstaller');
      await file.sync();
      await file.close();
      await rename(part, destination);
    } finally {
      clearTimeout(timer);
      await reader.cancel().catch(() => {});
      await file.close().catch(() => {});
      await rm(part, { force: true });
    }
  }
}
