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
 * @file legacyUninstallService.ts
 * @description 用户选择卸载后，等待助手退出，再运行旧版官方卸载程序并启动新版。
 * @author 鸡哥
 */
import { spawn } from 'node:child_process';
import { lstat, realpath, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import withoutSigningSecrets from '../../../../scripts/native/environment.mjs';
import { fail } from '../../shared/utils/adapterErrors';
import { directoriesOverlap } from './platformService';
import type { Installation } from '../../shared/types/adapterTypes';

// 路径只通过环境中的 JSON 传入，禁止把目录或卸载命令拼接进 PowerShell 源码。
const CLEANUP = `$ErrorActionPreference='Stop';$request=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($env:EISLAND_LEGACY_UNINSTALL_REQUEST))|ConvertFrom-Json;$owner=Get-Process -Id $request.pid -ErrorAction SilentlyContinue;if($owner -and $owner.Path -eq $request.ownExecutable){$owner.WaitForExit()};try{if((Test-Path -LiteralPath $request.uninstaller -PathType Leaf) -and (Test-Path -LiteralPath $request.marker -PathType Leaf)){Start-Process -FilePath $request.uninstaller -Wait -PassThru|Out-Null}}finally{Start-Process -FilePath $request.executable|Out-Null}`;

/** 仅为真实旧版安装项构建卸载计划，不接受注册表中的任意命令行。
 * @param legacy - 已识别的旧版安装项。
 * @param targetDirectory - 已确认安装成功的新目录。
 * @param ownExecutable - 当前助手的程序路径。
 * @returns 经过目录和文件校验的隐藏辅助进程参数。
 */
export async function legacyUninstallPlan(legacy: Installation, targetDirectory: string, ownExecutable: string) {
  if (legacy.runtime !== 'electron' || !legacy.uninstaller) fail('legacyUnavailable');
  const directory = await realpath(legacy.directory);
  const expected = join(directory, 'Uninstall eIsland.exe');
  const uninstaller = await realpath(legacy.uninstaller);
  const info = await lstat(legacy.uninstaller);
  if (!info.isFile() || info.isSymbolicLink() || uninstaller.toLowerCase() !== expected.toLowerCase()) fail('legacyUnavailable');
  const marker = join(directory, 'resources/app.asar');
  if (!(await stat(marker).catch(() => null))?.isFile()) fail('legacyUnavailable');
  const target = await realpath(targetDirectory);
  if (directoriesOverlap(directory, target)) fail('installOverlap');
  const executable = await realpath(join(target, 'eisland.exe'));
  if (dirname(executable).toLowerCase() !== target.toLowerCase() || !(await stat(executable)).isFile()) fail('installNotConfirmed');
  const request = { uninstaller, marker, executable, pid: process.pid, ownExecutable: resolve(ownExecutable) };
  const env: NodeJS.ProcessEnv = { ...withoutSigningSecrets(process.env) as NodeJS.ProcessEnv, EISLAND_LEGACY_UNINSTALL_REQUEST: Buffer.from(JSON.stringify(request)).toString('base64') };
  return { env, args: ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-EncodedCommand', Buffer.from(CLEANUP, 'utf16le').toString('base64')] };
}

/** 交接给等待助手退出的进程，不在助手内删除旧安装目录。
 * @param legacy - 已确认的旧版安装项。
 * @param targetDirectory - 已确认的新版本目录。
 * @param ownExecutable - 当前助手程序。
 * @returns 辅助进程成功启动后完成。
 */
export default async function scheduleLegacyUninstall(legacy: Installation, targetDirectory: string, ownExecutable: string): Promise<void> {
  const plan = await legacyUninstallPlan(legacy, targetDirectory, ownExecutable);
  await new Promise<void>((resolveStarted, reject) => {
    const child = spawn('powershell.exe', plan.args, { env: plan.env, detached: true, windowsHide: true, stdio: 'ignore' });
    child.once('error', reject);
    child.once('spawn', () => { child.unref(); resolveStarted(); });
  });
}
