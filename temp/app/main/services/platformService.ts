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
import { access, lstat, readdir, realpath, stat } from 'node:fs/promises';
import { basename, dirname, join, resolve, relative, isAbsolute } from 'node:path';
import withoutSigningSecrets from '../../../../scripts/native/environment.mjs';
import { TAURI_APP_ID } from '../../shared/config/adapterConfig';
import { fail } from '../../shared/utils/adapterErrors';
import type { Inspection, Installation, RunningApp } from '../../shared/types/adapterTypes';
import type { ServiceConfig } from '../types/serviceTypes';

const execute = promisify(execFile);
// 只把路径作为 Base64 环境变量传入；从文件逐级向上检查，非管理员可写、可替换或可改权限时视为不可信。
const ACL_PROBE = `$ErrorActionPreference='Stop';$path=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($env:EISLAND_ACL_REQUEST));$me=[Security.Principal.WindowsIdentity]::GetCurrent();$untrusted=@($me.User.Value)+@($me.Groups|ForEach-Object{$_.Value}|Where-Object{$_ -ne 'S-1-5-32-544'})+@('S-1-1-0','S-1-5-11','S-1-5-32-545','S-1-5-4');$safe=$true;$level=0;$current=$path;while($current){$acl=Get-Acl -LiteralPath $current;$mask=if($level -lt 2){0x500D0156}else{0x100D0040};if($untrusted -contains $acl.GetOwner([Security.Principal.SecurityIdentifier]).Value){$safe=$false};foreach($rule in $acl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier])){if($rule.AccessControlType -eq 'Allow' -and -not ([int]$rule.PropagationFlags -band 2) -and ($untrusted -contains $rule.IdentityReference.Value) -and ([int]$rule.FileSystemRights -band $mask)){$safe=$false}};$current=[IO.Path]::GetDirectoryName($current);$level++};if($safe){'protected'}else{'writable'}`;
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

/** 规范化目录及其尚未创建的后缀，统一处理短路径和目录链接。
 * @param directory - 待比较的目录。
 * @returns 规范绝对路径。
 */
async function canonicalDirectory(directory: string): Promise<string> {
  let parent = resolve(directory);
  const parts: string[] = [];
  while (true) {
    try { return join(await realpath(parent), ...parts.reverse()); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT' || dirname(parent) === parent) throw error;
      parts.push(basename(parent));
      parent = dirname(parent);
    }
  }
}

/** 校验用户选择的安装位置，避免覆盖旧程序、自身、用户数据或备份。
 * @param directory - 用户选择的目标目录。
 * @param inspection - 最新的系统检测结果。
 * @param config - 适配器工作目录与自身路径。
 * @returns 经规范化的可用安装目录。
 */
export async function validateTargetDirectory(directory: string, inspection: Inspection, config: ServiceConfig): Promise<string> {
  if (!isAbsolute(directory) || /["\r\n\0]/.test(directory) || dirname(resolve(directory)) === resolve(directory)) fail('invalidDirectory');
  const target = await canonicalDirectory(directory);
  const protectedRoots = [dirname(config.ownExecutable), config.workRoot, ...inspection.dataRoots,
    ...inspection.installations.filter((entry) => entry.runtime !== 'tauri').map((entry) => entry.directory)];
  const canonicalRoots = await Promise.all(protectedRoots.map(canonicalDirectory));
  if (canonicalRoots.some((root) => directoriesOverlap(root, target))) fail('installOverlap');
  const knownTargets = await Promise.all(inspection.installations.filter((entry) => entry.runtime === 'tauri').map((entry) => canonicalDirectory(entry.directory)));
  const known = knownTargets.some((entry) => entry.toLowerCase() === target.toLowerCase());
  // 只允许原位覆盖已登记的 Tauri 目录，嵌套在其内外的位置会形成第二套安装。
  if (!known && knownTargets.some((entry) => directoriesOverlap(entry, target))) fail('installOverlap');
  const info = await lstat(target).catch((error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return null; throw error; });
  if (info && !info.isDirectory()) fail('invalidDirectory');
  if (info && !known && (await readdir(target)).length) fail('directoryNotEmpty');
  return target;
}

/** 找到唯一可由官方卸载器移除的旧版：优先选择迁移助手所在目录，多个候选且无法确定时不选择。
 * @param installations - 已检测的安装项。
 * @param ownExecutable - 迁移助手程序路径。
 * @returns 明确的 Electron 安装项；存在歧义时为空。
 */
export function legacyInstallation(installations: Installation[], ownExecutable: string): Installation | undefined {
  const entries = installations.filter((entry) => entry.runtime === 'electron' && entry.uninstaller);
  const own = entries.find((entry) => resolve(entry.directory).toLowerCase() === dirname(resolve(ownExecutable)).toLowerCase());
  return own || (entries.length === 1 ? entries[0] : undefined);
}

/** 确认旧版卸载器及其所在路径只能由管理员修改，非 Windows 或检查失败时一律视为不可信。
 * @param file - 待运行的旧版卸载器。
 * @returns 文件、安装目录及上级目录均不可被当前用户或普通用户组写入、替换或改权限时为 true。
 */
export async function uninstallerProtected(file: string): Promise<boolean> {
  if (process.platform !== 'win32') return false;
  try {
    const env = { ...withoutSigningSecrets(process.env) as NodeJS.ProcessEnv, EISLAND_ACL_REQUEST: Buffer.from(file).toString('base64') };
    const output = await execute('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(ACL_PROBE, 'utf16le').toString('base64')], { env, windowsHide: true, timeout: 15000, maxBuffer: 64 * 1024 });
    return output.stdout.trim() === 'protected';
  } catch { return false; }
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
    if (!known && installations.some((entry) => entry.runtime === 'tauri' && directoriesOverlap(entry.directory, directory))) return true;
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
    const uninstaller = join(entry.directory, 'Uninstall eIsland.exe');
    const uninstallInfo = electron ? await lstat(uninstaller).catch(() => null) : null;
    return { runtime, directory: resolve(entry.directory), version: entry.version,
      ...(uninstallInfo?.isFile() && !uninstallInfo.isSymbolicLink() ? { uninstaller } : {}) };
  }));
  const candidates = detected.filter((entry): entry is Installation => entry !== null);
  // 只向界面暴露唯一且受管理员保护的卸载器，避免选错安装项或运行可被替换的程序。
  const legacy = legacyInstallation(candidates, config.ownExecutable);
  const trusted = legacy?.uninstaller && await uninstallerProtected(legacy.uninstaller) ? legacy : undefined;
  const installations = candidates.map((entry) => (entry === trusted ? entry : { directory: entry.directory, version: entry.version, runtime: entry.runtime }));
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
