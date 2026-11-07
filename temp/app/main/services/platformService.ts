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
 * @file platformService.ts
 * @description 只读检测安装位置及运行实例；安装只使用经过签名验证的主进程暂存路径。
 * @author 鸡哥
 */
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { access, stat } from 'node:fs/promises';
import { dirname, join, resolve, relative, isAbsolute } from 'node:path';
import withoutSigningSecrets from '../../../../scripts/native/environment.mjs';
import { TAURI_APP_ID } from '../../shared/config/adapterConfig';
import { fail } from '../../shared/utils/adapterErrors';
import type { Inspection, Installation, RunningApp } from '../../shared/types/adapterTypes';
import type { ServiceConfig } from '../types/serviceTypes';

const execute = promisify(execFile);
const PROBE = `$ErrorActionPreference='Stop';$items=@();foreach($root in @('HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall','HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall','HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall')){if(Test-Path $root){foreach($item in Get-ItemProperty ($root+'\\*') -ErrorAction SilentlyContinue){if($item.DisplayName -eq 'eIsland'){$items+=@{directory=[string]$item.InstallLocation;version=[string]$item.DisplayVersion;key=[string]$item.PSChildName}}}}};$running=@(Get-CimInstance Win32_Process -Filter "Name='eisland.exe'" | ForEach-Object {@{pid=[int]$_.ProcessId;path=[string]$_.ExecutablePath}});@{installations=@($items);running=@($running)}|ConvertTo-Json -Depth 4 -Compress`;

/** 判断目标与旧安装目录是否互相包含，避免跨框架覆盖同一目录。
 * @param first - 第一个绝对目录。
 * @param second - 第二个绝对目录。
 * @returns 是否重叠。
 */
export function directoriesOverlap(first: string, second: string): boolean {
  const inside = (parent: string, child: string): boolean => {
    const value = relative(resolve(parent).toLowerCase(), resolve(child).toLowerCase());
    return !value || (!value.startsWith('..') && !isAbsolute(value));
  };
  return inside(first, second) || inside(second, first);
}

/** 查询存在的目录，不把权限错误当作数据不存在。
 * @param path - 候选目录。
 * @returns 是否存在。
 */
export async function directoryExists(path: string): Promise<boolean> {
  try { return (await stat(path)).isDirectory(); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; }
}

/** 只复用明确识别的 Tauri 目录，保护适配器自身及没有注册信息的旧目录。
 * @param installations - 已检测的安装项。
 * @param localData - 当前用户应用目录。
 * @param ownExecutable - 适配器自身程序。
 * @returns 不覆盖原程序的计划目录。
 */
export async function selectTargetDirectory(installations: Installation[], localData: string, ownExecutable: string): Promise<string> {
  const unsafe = async (directory: string): Promise<boolean> => {
    if (directoriesOverlap(dirname(ownExecutable), directory)) return true;
    if (installations.some((entry) => entry.runtime !== 'tauri' && directoriesOverlap(entry.directory, directory))) return true;
    const known = installations.some((entry) => entry.runtime === 'tauri' && resolve(entry.directory).toLowerCase() === resolve(directory).toLowerCase());
    return !known && await directoryExists(directory);
  };
  let directory = installations.find((entry) => entry.runtime === 'tauri')?.directory || join(localData, 'eIsland');
  if (await unsafe(directory)) directory = join(localData, 'eIsland-Tauri');
  if (await unsafe(directory)) fail('installOverlap');
  return directory;
}

/** 读取固定 Windows 系统接口，不拼接用户提供的 PowerShell 源码。
 * @param config - 本机路径和适配器自身路径。
 * @returns 安装、运行和数据选择信息。
 */
export async function inspectSystem(config: ServiceConfig): Promise<Inspection> {
  if (process.platform !== 'win32') fail('windowsOnly');
  const script = `[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false);${PROBE}`;
  const output = await execute('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { env: withoutSigningSecrets(process.env) as NodeJS.ProcessEnv, windowsHide: true, timeout: 15000, maxBuffer: 1024 * 1024 });
  const result = JSON.parse(output.stdout.trim().replace(/^\uFEFF/, '')) as { installations: (Installation & { key: string })[]; running: RunningApp[] };
  const detected = await Promise.all(result.installations.map(async (entry): Promise<Installation | null> => {
    if (!entry.directory || !isAbsolute(entry.directory) || !(await directoryExists(entry.directory))) return null;
    const electron = await access(join(entry.directory, 'resources/app.asar')).then(() => true, () => false);
    const tauri = ['eIsland', TAURI_APP_ID].includes(entry.key) && await access(join(entry.directory, 'eisland.exe')).then(() => true, () => false);
    let runtime: Installation['runtime'] = 'unknown';
    if (electron) runtime = 'electron';
    else if (tauri) runtime = 'tauri';
    return { runtime, directory: resolve(entry.directory), version: entry.version };
  }));
  const installations = detected.filter((entry): entry is Installation => entry !== null);
  const ownPath = resolve(config.ownExecutable).toLowerCase();
  const running = result.running.filter((entry) => !entry.path || resolve(entry.path).toLowerCase() !== ownPath);
  const legacyRoot = join(config.appData, 'eIsland');
  const tauriRoot = join(config.appData, TAURI_APP_ID);
  const roots = [legacyRoot, tauriRoot];
  const present = await Promise.all(roots.map((root) => directoryExists(root)));
  const dataRoots = roots.filter((root, index) => present[index]);
  const legacyStore = join(legacyRoot, 'eIsland_store');
  const tauriStore = join(tauriRoot, 'eIsland_store');
  const selectedStore = (await directoryExists(tauriStore)) || !(await directoryExists(legacyStore)) ? tauriStore : legacyStore;
  const targetDirectory = await selectTargetDirectory(installations, config.localData, config.ownExecutable);
  return { installations, running, dataRoots, legacyStore, tauriStore, selectedStore, targetDirectory };
}

/** 交接给交互式 NSIS；/D 必须位于命令行末尾且不能加引号，禁止 shell 插值和静默安装。
 * @param file - 已重新验证的暂存安装器。
 * @param directory - 主进程检测并规划的独立 Tauri 安装目录。
 * @returns 安装器退出后完成，不把退出码当作安装成功的唯一证据。
 */
export async function runInstaller(file: string, directory: string): Promise<void> {
  if (!isAbsolute(file) || !isAbsolute(directory) || /["\r\n\0]/.test(directory)) fail('invalidInstaller');
  await new Promise<void>((resolveExit, reject) => {
    // NSIS 把 /D= 之后的整段命令行当作目录，带空格的路径必须原样传入；
    // 逐字模式下 libuv 也不会为程序路径加引号，因此显式引用 argv0，避免暂存目录中的空格拆分命令行。
    const child = spawn(file, [`/D=${directory}`], { argv0: `"${file}"`, env: withoutSigningSecrets(process.env) as NodeJS.ProcessEnv, shell: false, windowsVerbatimArguments: true, stdio: 'ignore' });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolveExit() : reject(new Error('installerFailed')));
  });
}
