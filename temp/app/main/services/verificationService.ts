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
 * @file verificationService.ts
 * @description 调用随适配器构建的可信验证器，不执行下载得到的二进制来验证其自身。
 * @author 鸡哥
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { open, writeFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import withoutSigningSecrets from '../../../../scripts/native/environment.mjs';
import { MAX_INSTALLER_BYTES } from '../../shared/config/adapterConfig';
import { fail } from '../../shared/utils/adapterErrors';
import type { Release } from '../../shared/types/adapterTypes';

const execute = promisify(execFile);
/** 用与官方更新器同版本的 minisign-verify 验证文件和受签名约束的版本号。
 * @param verifier - 打包的可信验证器。
 * @param publicKey - 发布者的公开验证密钥。
 * @param release - 目标版本和签名。
 * @param file - 主进程暂存文件。
 * @param signal - 仅用于取消适配器拥有的验证进程。
 */
export async function verifyInstaller(verifier: string, publicKey: string, release: Release, file: string, signal: AbortSignal): Promise<void> {
  const info = await stat(file);
  if (!info.isFile() || info.size < 2 || info.size > MAX_INSTALLER_BYTES || (release.size !== undefined && release.size !== info.size)) fail('invalidInstaller');
  const descriptor = await open(file, 'r');
  const magic = Buffer.alloc(2);
  try { await descriptor.read(magic, 0, 2, 0); } finally { await descriptor.close(); }
  if (magic.toString('ascii') !== 'MZ') fail('invalidInstaller');
  const request = join(dirname(file), 'verification.json');
  await writeFile(request, JSON.stringify({ file, publicKey, signature: release.signature, version: release.version }), { mode: 0o600 });
  try {
    await execute(verifier, [request], { signal, env: withoutSigningSecrets(process.env) as NodeJS.ProcessEnv, windowsHide: true, timeout: 120000, maxBuffer: 8192 });
  } catch { if (signal.aborted) signal.throwIfAborted(); fail('signatureRejected'); }
  const after = await stat(file);
  if (after.size !== info.size || after.mtimeMs !== info.mtimeMs) fail('dataChanged');
}
