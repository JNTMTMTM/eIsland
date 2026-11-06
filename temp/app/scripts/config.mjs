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
 * @file config.mjs
 * @description 仅读取公开验证密钥，不读取或传递更新私钥。
 * @author 鸡哥
 */
import { readFileSync } from 'node:fs';

/** 构建和正式打包采用相同公开信任配置。
 * @param env - 当前环境。
 * @returns 发布者公钥，缺失时为空。
 */
export function publicKey(env = process.env) {
  return (env.TAURI_UPDATER_PUBLIC_KEY || JSON.parse(readFileSync(new URL('../../../src-tauri/tauri.conf.json', import.meta.url), 'utf8')).plugins?.updater?.pubkey || '').trim();
}

/** 正式包不能使用空密钥或私钥文本冒充公钥。
 * @param key - 公开验证密钥。
 */
export function requirePublicKey(key) {
  if (!key || !/^[A-Za-z0-9+/]+={0,2}$/.test(key)) throw new Error('Configure TAURI_UPDATER_PUBLIC_KEY with the production Tauri public key');
  const text = Buffer.from(key, 'base64').toString('utf8').trim()
    .split(/\r?\n/);
  const value = text.at(-1) || '';
  if (text.length !== 2 || !text[0].startsWith('untrusted comment:') || Buffer.from(value, 'base64').length !== 42) throw new Error('TAURI_UPDATER_PUBLIC_KEY is not a Minisign public key');
}
