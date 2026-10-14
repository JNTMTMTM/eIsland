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
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 */

/**
 * @file installerProcess.integration.test.ts
 * @description 编译真实 NSIS 探针，回归 Windows 安装器的进程识别与安全终止。
 * @author 鸡哥
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { copyFileSync, existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

type ProbeMode = 'installer' | 'uninstaller';
type ProbeVariant = 'normal' | 'snapshot-failure' | 'process-exit' | 'query-failure';

const registerIndexes = Array.from(Array<number>(20).keys());
const registers = registerIndexes.map((index) => (index < 10 ? `$${index}` : `$R${index - 10}`));

function findCompiler(): string | undefined {
  if (process.platform !== 'win32') return undefined;
  if (process.env.EISLAND_NSIS_EXECUTABLE) return process.env.EISLAND_NSIS_EXECUTABLE;
  const cache = join(process.env.ELECTRON_BUILDER_CACHE ?? join(process.env.LOCALAPPDATA ?? '', 'electron-builder', 'Cache'), 'nsis');
  if (!existsSync(cache)) return undefined;
  return readdirSync(cache).map((entry) => join(cache, entry, 'makensis.exe')).find((entry) => existsSync(entry));
}

const compiler = findCompiler();

function nsisString(value: string): string {
  return value.replaceAll('$', '$$').replaceAll('"', '$\\"');
}

// BUILD_UNINSTALLER 会改变 include 中的函数命名，必须独立编译并实际执行卸载段。
function probeSource(mode: ProbeMode, output: string, include: string): string {
  const body = `
  ReadEnvStr $INSTDIR EISLAND_TEST_INSTALL_DIR
  ReadEnvStr $TestAction EISLAND_TEST_ACTION
  ReadEnvStr $TestOutput EISLAND_TEST_OUTPUT
  \${GetParameters} $TestArguments
  ClearErrors
  \${GetOptions} $TestArguments "--updated" $TestUpdated
  \${If} \${Errors}
    StrCpy $TestUpdated 0
  \${Else}
    StrCpy $TestUpdated 1
  \${EndIf}
  StrCpy $IsPowerShellAvailable 1
  StrCpy $PowerShellPath ""
  InitPluginsDir
  ${registers.map((register, index) => `StrCpy ${register} "register-${index}"`).join('\n  ')}
  Push "stack-sentinel"
  StrCpy $TestResult "kill"
  StrCmp $TestAction "kill" kill_process
  StrCmp $TestAction "check" check_running
  !insertmacro EISLAND_FIND_PROCESS $TestResult
  Goto finished
kill_process:
  !insertmacro EISLAND_KILL_PROCESS
  Goto finished
check_running:
  !insertmacro customCheckAppRunning
  StrCpy $TestResult "checked"
finished:
  Pop $TestStack
  FileOpen $TestFile "$TestOutput" w
  FileWrite $TestFile "$TestResult$\\r$\\n$TestStack$\\r$\\n"
  ${registers.map((register) => `FileWrite $TestFile "${register}$\\r$\\n"`).join('\n  ')}
  FileClose $TestFile
`;
  return `
Unicode true
RequestExecutionLevel user
SilentInstall silent
SilentUnInstall silent
SetCompress off
OutFile "${nsisString(output)}"
!include "LogicLib.nsh"
!include "FileFunc.nsh"
!addincludedir "${nsisString(resolve('node_modules/app-builder-lib/templates/nsis/include'))}"
!define PRODUCT_FILENAME "eIsland"
!define PRODUCT_NAME "eIsland"
!define isUpdated '$TestUpdated == 1'
${mode === 'uninstaller' ? '!define BUILD_UNINSTALLER' : ''}
Var IsPowerShellAvailable
Var PowerShellPath
Var TestAction
Var TestOutput
Var TestResult
Var TestStack
Var TestFile
Var TestArguments
Var TestUpdated
Var TestExitPid
!include "${nsisString(include)}"
!define APP_EXECUTABLE_FILENAME "eIsland.exe"
LangString appRunning 1033 "Close fixture app"
LangString appClosing 1033 "Closing fixture app"
LangString appCannotBeClosed 1033 "Fixture app could not be closed"
Section
${mode === 'uninstaller' ? 'WriteUninstaller "$EXEDIR\\uninstaller-probe.exe"' : body}
SectionEnd
${mode === 'uninstaller' ? `Section "Uninstall"\n${body}\nSectionEnd` : ''}
`;
}

async function runExecutable(executable: string, args: string[], env = process.env, rawArguments = false): Promise<void> {
  await new Promise<void>((resolveRun, reject) => {
    const child = spawn(executable, args, { env, windowsHide: true, windowsVerbatimArguments: rawArguments, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr.on('data', (chunk: Buffer) => { output += chunk.toString(); });
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`Process timed out: ${executable}\n${output}`));
    }, 20_000);
    child.once('error', (error) => { clearTimeout(timeout); reject(error); });
    child.once('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) resolveRun();
      else reject(new Error(`Process exited with ${code}: ${executable}\n${output}`));
    });
  });
}

describe.skipIf(!compiler)('NSIS native process integration (Windows and cached NSIS required)', () => {
  let root: string;
  let fixture: string;
  const children: ChildProcess[] = [];

  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), 'eisland-nsis-test-'));
    fixture = join(root, 'fixture-node.exe');
    // 只操作本次创建的进程；硬链接减少多场景复制 Node 可执行文件的磁盘开销。
    copyFileSync(process.execPath, fixture);
    const include = resolve('resources/installer.nsh');
    // 对测试副本注入不存在的模块快照 PID，验证原生 API 失败不会被当作未运行。
    const installerSource = readFileSync(include, 'utf8');
    const failureSource = installerSource.replace('CreateToolhelp32Snapshot(i 2, i 0)', 'CreateToolhelp32Snapshot(i 8, i -1)');
    expect(failureSource).not.toBe(installerSource);
    const queryCall = installerSource.split(/\r?\n/).find((line) => line.includes('kernel32::QueryFullProcessImageNameW'));
    expect(queryCall).toBeDefined();
    // 仅在打开指定 fixture 句柄后让它退出，避免依赖机器速度复现查询竞态。
    const exitBeforeQuery = [
      'ReadEnvStr $TestExitPid EISLAND_TEST_EXIT_PID',
      '${If} $4 == $TestExitPid',
      'FileOpen $TestFile "$INSTDIR\\exit-signal" w',
      'FileClose $TestFile',
      'Sleep 500',
      '${EndIf}',
      queryCall!,
    ].join('\n');
    const sources: Record<ProbeVariant, string> = {
      normal: installerSource,
      'snapshot-failure': failureSource,
      'process-exit': installerSource.replace(queryCall!, exitBeforeQuery),
      'query-failure': installerSource.replace(queryCall!, 'StrCpy $3 0'),
    };
    const builds = Object.entries(sources).map(([variant, contents]) => {
      const directory = join(root, variant);
      mkdirSync(directory);
      const variantInclude = join(directory, 'installer.nsh');
      writeFileSync(variantInclude, contents, 'utf8');
      return { directory, variantInclude };
    });
    await Promise.all((['installer', 'uninstaller'] as const).flatMap((mode) => builds.map(async ({ directory, variantInclude }) => {
      const source = join(directory, `${mode}.nsi`);
      const output = join(directory, `${mode === 'uninstaller' ? 'uninstaller-builder' : 'installer-probe'}.exe`);
      writeFileSync(source, probeSource(mode, output, variantInclude), 'utf8');
      await runExecutable(compiler!, ['/V2', '/INPUTCHARSET', 'UTF8', source]);
      if (mode === 'uninstaller') await runExecutable(output, ['/S']);
    })));
  }, 60_000);

  afterEach(async () => {
    await Promise.all(children.splice(0).map(async (child) => {
      if (child.pid === undefined || child.exitCode !== null || child.signalCode !== null) return;
      await new Promise<void>((resolveExit) => {
        child.once('close', () => resolveExit());
        child.kill();
      });
    }));
  });

  afterAll(() => {
    if (root) rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  async function startFixture(directory: string, name = 'eIsland.exe', exitOnSignal = false): Promise<ChildProcess> {
    mkdirSync(directory, { recursive: true });
    const executable = join(directory, name);
    if (!existsSync(executable)) linkSync(fixture, executable);
    const script = exitOnSignal
      ? 'const fs = require("node:fs"); process.stdout.write("ready"); setInterval(() => { if (fs.existsSync(process.argv[1])) process.exit(0); }, 10);'
      : 'process.stdout.write("ready"); setInterval(() => {}, 1000);';
    const child = spawn(executable, ['-e', script, join(directory, 'exit-signal')], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    children.push(child);
    await new Promise<void>((resolveReady, reject) => {
      child.once('error', reject);
      child.stdout.once('data', () => resolveReady());
      child.once('exit', (code) => reject(new Error(`Fixture exited before ready: ${code}`)));
    });
    return child;
  }

  async function probe(mode: ProbeMode, directory: string, options: {
    action?: 'find' | 'kill' | 'check'; updated?: boolean; variant?: ProbeVariant; exitPid?: number;
  } = {}): Promise<string> {
    const { action = 'find', updated = false, variant = 'normal', exitPid } = options;
    mkdirSync(directory, { recursive: true });
    // 探针本身就在安装目录内，确保安装器/卸载器不会被误判为运行中的应用。
    const executable = join(directory, `${mode}-probe.exe`);
    if (!existsSync(executable)) copyFileSync(join(root, variant, `${mode}-probe.exe`), executable);
    const output = join(root, 'probe-result.txt');
    if (existsSync(output)) rmSync(output);
    const args = ['/S', ...(updated ? ['--updated'] : []), ...(mode === 'uninstaller' ? [`_?=${directory}`] : [])];
    // NSIS 的 _?= 会读取命令行余下全部字符，目录含空格时也不能额外加引号。
    await runExecutable(executable, args, {
      ...process.env,
      EISLAND_TEST_INSTALL_DIR: directory,
      EISLAND_TEST_ACTION: action,
      EISLAND_TEST_OUTPUT: output,
      EISLAND_TEST_EXIT_PID: String(exitPid ?? ''),
      // 系统没有 PowerShell/WMIC 的环境也必须有相同结果。
      PATH: root,
    }, mode === 'uninstaller');
    const [result, stack, ...actualRegisters] = readFileSync(output, 'utf8').trimEnd().split(/\r?\n/);
    expect(stack, 'NSIS stack must remain balanced').toBe('stack-sentinel');
    if (action !== 'check') {
      expect(actualRegisters, 'process helpers must preserve caller registers').toEqual(registerIndexes.map((index) => `register-${index}`));
    }
    return result;
  }

  (['installer', 'uninstaller'] as const).forEach((mode) => {
    it(`${mode}: ignores helpers and the same executable in a different installation`, async () => {
      const directory = join(root, `${mode}-absent`);
      const unrelated = await startFixture(`${directory}-other`);
      const helper = await startFixture(directory, 'Uninstall eIsland.exe');
      expect(await probe(mode, directory)).toBe('1');
      expect(unrelated.exitCode).toBeNull();
      expect(helper.exitCode).toBeNull();
    }, 30_000);

    it.each(['ordinary', "中文 空格 O'Brien & $目录"])(`${mode}: finds and stops only the exact executable in %s`, async (name) => {
      const directory = join(root, `${mode}-${name}`);
      const target = await startFixture(directory);
      const secondTarget = await startFixture(directory);
      const unrelated = await startFixture(`${directory}-other`);
      const helper = await startFixture(directory, 'eIsland helper.exe');
      expect(await probe(mode, directory)).toBe('0');
      expect(await probe(mode, directory.toUpperCase())).toBe('0');
      expect(await probe(mode, directory, { action: 'kill' })).toBe('kill');
      await expect.poll(() => target.exitCode !== null || target.signalCode !== null).toBe(true);
      await expect.poll(() => secondTarget.exitCode !== null || secondTarget.signalCode !== null).toBe(true);
      expect(await probe(mode, directory)).toBe('1');
      expect(unrelated.exitCode).toBeNull();
      expect(unrelated.signalCode).toBeNull();
      expect(helper.exitCode).toBeNull();
      expect(helper.signalCode).toBeNull();
    }, 30_000);

    it.each([false, true])(`${mode}: completes the running-app check with updated=%s`, async (updated) => {
      const directory = join(root, `${mode}-check-${updated}`);
      expect(await probe(mode, directory, { updated, action: 'check' })).toBe('checked');
      const target = await startFixture(directory);
      expect(await probe(mode, directory, { updated, action: 'check' })).toBe('checked');
      await expect.poll(() => target.exitCode !== null || target.signalCode !== null).toBe(true);
      expect(await probe(mode, directory)).toBe('1');
    }, 30_000);

    it(`${mode}: fails closed when the native process snapshot fails`, async () => {
      const directory = join(root, `${mode}-failed-query`);
      expect(await probe(mode, directory, { variant: 'snapshot-failure' })).toBe('2');
      await expect(probe(mode, directory, { action: 'check', variant: 'snapshot-failure' })).rejects.toThrow('Process exited with 2');
      await expect(probe(mode, directory, { action: 'check', updated: true, variant: 'snapshot-failure' })).rejects.toThrow('Process exited with 2');
    }, 30_000);

    it(`${mode}: ignores a process that exits after its handle is opened`, async () => {
      const directory = join(root, `${mode}-exit-during-query`);
      const target = await startFixture(directory, 'eIsland.exe', true);
      expect(await probe(mode, directory, { variant: 'process-exit', exitPid: target.pid })).toBe('1');
      expect(target.exitCode).toBe(0);
    }, 30_000);

    it(`${mode}: reports a query failure for a process that is still alive`, async () => {
      const directory = join(root, `${mode}-live-query-failure`);
      const target = await startFixture(directory);
      expect(await probe(mode, directory, { variant: 'query-failure' })).toBe('2');
      expect(target.exitCode).toBeNull();
      expect(target.signalCode).toBeNull();
    }, 30_000);
  });
});
