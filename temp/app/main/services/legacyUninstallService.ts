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
import { directoriesOverlap, uninstallerProtected } from './platformService';
import type { Installation, LegacyNotice } from '../../shared/types/adapterTypes';

// 路径只通过环境中的 JSON 传入，禁止把目录或卸载命令拼接进 PowerShell 源码。
// 卸载器非零退出、无法启动或旧版标记仍存在时视为失败；助手此时已退出，只能由该进程以本地化提示告知用户。
// NSIS 卸载器默认把自身复制到临时目录后立即退出，提权后 -Wait 无法跟踪该副本；_?= 令其原地同步运行（必须为最后一个参数且不加引号）。
const CLEANUP = `$ErrorActionPreference='Stop';$request=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($env:EISLAND_LEGACY_UNINSTALL_REQUEST))|ConvertFrom-Json;$owner=Get-Process -Id $request.pid -ErrorAction SilentlyContinue;if($owner -and $owner.Path -eq $request.ownExecutable){$owner.WaitForExit()};$failed=$false;try{if((Test-Path -LiteralPath $request.uninstaller -PathType Leaf) -and (Test-Path -LiteralPath $request.marker -PathType Leaf)){$process=Start-Process -FilePath $request.uninstaller -ArgumentList ('_?='+$request.directory) -Wait -PassThru;if($process.ExitCode -ne 0){$failed=$true}}}catch{$failed=$true};if(Test-Path -LiteralPath $request.marker){$failed=$true};try{Start-Process -FilePath $request.executable|Out-Null}finally{if($failed){Add-Type -AssemblyName PresentationFramework;[void][Windows.MessageBox]::Show($request.noticeBody,$request.noticeTitle,'OK','Warning')}}`;

/** 仅为真实旧版安装项构建卸载计划，不接受注册表中的任意命令行。
 * @param legacy - 已识别的旧版安装项。
 * @param targetDirectory - 已确认安装成功的新目录。
 * @param ownExecutable - 当前助手的程序路径。
 * @param notice - 卸载失败时显示的本地化提示。
 * @param isProtected - 卸载器可信性检查，测试可替换。
 * @returns 经过目录和文件校验的隐藏辅助进程参数。
 */
export async function legacyUninstallPlan(legacy: Installation, targetDirectory: string, ownExecutable: string, notice: LegacyNotice, isProtected = uninstallerProtected) {
  if (legacy.runtime !== 'electron' || !legacy.uninstaller) fail('legacyUnavailable');
  const directory = await realpath(legacy.directory);
  const expected = join(directory, 'Uninstall eIsland.exe');
  const uninstaller = await realpath(legacy.uninstaller);
  const info = await lstat(legacy.uninstaller);
  if (!info.isFile() || info.isSymbolicLink() || uninstaller.toLowerCase() !== expected.toLowerCase()) fail('legacyUnavailable');
  const marker = join(directory, 'resources/app.asar');
  if (!(await stat(marker).catch(() => null))?.isFile()) fail('legacyUnavailable');
  // 旧版未签名，只能依赖路径不可被普通用户替换来保证运行的是原卸载器。
  if (!(await isProtected(uninstaller))) fail('legacyUntrusted');
  const target = await realpath(targetDirectory);
  if (directoriesOverlap(directory, target)) fail('installOverlap');
  const executable = await realpath(join(target, 'eisland.exe'));
  if (dirname(executable).toLowerCase() !== target.toLowerCase() || !(await stat(executable)).isFile()) fail('installNotConfirmed');
  const request = { uninstaller, directory, marker, executable, pid: process.pid, ownExecutable: resolve(ownExecutable), noticeTitle: notice.title, noticeBody: notice.body };
  const env: NodeJS.ProcessEnv = { ...withoutSigningSecrets(process.env) as NodeJS.ProcessEnv, EISLAND_LEGACY_UNINSTALL_REQUEST: Buffer.from(JSON.stringify(request)).toString('base64') };
  return { env, args: ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-EncodedCommand', Buffer.from(CLEANUP, 'utf16le').toString('base64')] };
}

/** 交接给等待助手退出的进程，不在助手内删除旧安装目录。
 * @param legacy - 已确认的旧版安装项。
 * @param targetDirectory - 已确认的新版本目录。
 * @param ownExecutable - 当前助手程序。
 * @param notice - 卸载失败时由辅助进程显示的本地化提示。
 * @returns 辅助进程成功启动后完成；卸载结果由辅助进程在助手退出后检查并提示。
 */
export default async function scheduleLegacyUninstall(legacy: Installation, targetDirectory: string, ownExecutable: string, notice: LegacyNotice): Promise<void> {
  const plan = await legacyUninstallPlan(legacy, targetDirectory, ownExecutable, notice);
  await new Promise<void>((resolveStarted, reject) => {
    const child = spawn('powershell.exe', plan.args, { env: plan.env, detached: true, windowsHide: true, stdio: 'ignore' });
    child.once('error', reject);
    child.once('spawn', () => { child.unref(); resolveStarted(); });
  });
}
