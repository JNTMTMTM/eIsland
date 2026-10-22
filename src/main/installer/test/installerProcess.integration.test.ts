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
import { once } from 'node:events';
import { copyFileSync, existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

type ProbeMode = 'installer' | 'uninstaller';
type ProbeVariant = 'normal' | 'snapshot-failure' | 'process-exit' | 'query-failure' | 'late-start' | 'wait-failure' | 'ancestry-cycle' | 'ancestry-snapshot-count';

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
// 原生整机快照耗时受系统负载影响；用例预算还需容纳 fixture 启动和多个探针。
const PROBE_TIMEOUT_MS = 60_000;
const TEST_TIMEOUT_MS = 120_000;
const FIXTURE_READY_TIMEOUT_MS = 15_000;
const BARRIER_TIMEOUT_MS = 30_000;
const CLEANUP_TIMEOUT_MS = 15_000;
// 仅防测试运行器崩溃，必须晚于用例和清理预算，且不能被误认为 NSIS 成功终止。
const FIXTURE_WATCHDOG_MS = TEST_TIMEOUT_MS + CLEANUP_TIMEOUT_MS + PROBE_TIMEOUT_MS;

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
  StrCmp $TestAction "handoff" check_handoff
  !insertmacro EISLAND_FIND_PROCESS $TestResult
  Goto finished
kill_process:
  !insertmacro EISLAND_KILL_PROCESS $TestResult
  Goto finished
check_running:
  !insertmacro customCheckAppRunning
  StrCpy $TestResult "checked"
  Goto finished
check_handoff:
  Call ${mode === 'uninstaller' ? 'un.' : ''}eIslandFinalProcessCheck
  FileOpen $TestFile "$INSTDIR\\before-files" w
  FileClose $TestFile
  StrCpy $TestExitPid 0
  wait_for_files:
  \${IfNot} \${FileExists} "$INSTDIR\\files-ready"
    Sleep 10
    IntOp $TestExitPid $TestExitPid + 1
    IntCmp $TestExitPid ${BARRIER_TIMEOUT_MS / 10} 0 wait_for_files
    Abort
  \${EndIf}
  Call ${mode === 'uninstaller' ? 'un.' : ''}eIslandFinalProcessCheck
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
!define BUILD_RESOURCES_DIR "${nsisString(resolve('resources'))}"
!define PROJECT_DIR "${nsisString(process.cwd())}"
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
Var TestSnapshotCount
!include "${nsisString(include)}"
!define APP_EXECUTABLE_FILENAME "eIsland.exe"
LangString appRunning 1033 "Close fixture app"
LangString appClosing 1033 "Closing fixture app"
LangString appCannotBeClosed 1033 "Fixture app could not be closed"
!insertmacro EISLAND_DECLARE_FINAL_CHECK
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
    let failure: Error | null = null;
    child.stdout.on('data', (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr.on('data', (chunk: Buffer) => { output += chunk.toString(); });
    const timeout = setTimeout(() => {
      const trace = env.EISLAND_TEST_OUTPUT ? `${env.EISLAND_TEST_OUTPUT}.trace` : '';
      failure = new Error(`Process timed out: ${executable} (exit=${child.exitCode}, signal=${child.signalCode})\n${output}\n${trace && existsSync(trace) ? readFileSync(trace, 'utf8').slice(-16_384) : ''}`);
      child.kill();
    }, PROBE_TIMEOUT_MS);
    child.once('error', (error) => { clearTimeout(timeout); reject(error); });
    child.once('close', (code) => {
      clearTimeout(timeout);
      if (failure) reject(failure);
      else if (code === 0) resolveRun();
      else reject(new Error(`Process exited with ${code}: ${executable}\n${output}`));
    });
  });
}

describe.skipIf(!compiler)('NSIS native process integration (Windows and cached NSIS required)', () => {
  let root: string;
  let fixture: string;
  const children: ChildProcess[] = [];
  const descendantFixtures: { cleanup: string; expired: string; executables: string[] }[] = [];
  let probeSequence = 0;

  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), 'eisland-nsis-test-'));
    fixture = join(root, 'fixture-node.exe');
    // 只操作本次创建的进程；硬链接减少多场景复制 Node 可执行文件的磁盘开销。
    copyFileSync(process.execPath, fixture);
    const include = resolve('resources/installer.nsh');
    // 对测试副本注入不存在的模块快照 PID，验证原生 API 失败不会被当作未运行。
    // 注入模板使用 LF；统一检出时的换行，避免 Windows 的 CRLF 使竞态探针未被注入。
    const installerSource = readFileSync(include, 'utf8').replaceAll('\r\n', '\n');
    const failureSource = installerSource.replaceAll('CreateToolhelp32Snapshot(i 2, i 0)', 'CreateToolhelp32Snapshot(i 8, i -1)');
    expect(failureSource).not.toBe(installerSource);
    const queryCall = installerSource.split(/\r?\n/).find((line) => line.includes('kernel32::QueryFullProcessImageNameW'));
    expect(queryCall).toBeDefined();
    // 仅在打开指定 fixture 句柄后让它退出，避免依赖机器速度复现查询竞态。
    const exitBeforeQuery = [
      'ReadEnvStr $TestExitPid EISLAND_TEST_EXIT_PID',
      '${If} $4 == $TestExitPid',
      'FileOpen $TestFile "$INSTDIR\\exit-signal" w',
      'FileClose $TestFile',
      `System::Call 'kernel32::WaitForSingleObject(p r6, i ${FIXTURE_READY_TIMEOUT_MS}) i.s'`,
      'Pop $TestExitPid',
      '${If} $TestExitPid != 0',
      'SetErrorLevel 97',
      'Quit',
      '${EndIf}',
      '${EndIf}',
      queryCall!,
    ].join('\n');
    const sources: Record<ProbeVariant, string> = {
      normal: installerSource,
      // 模拟祖先进程退出后 PID 被复用，使安装器祖先链出现循环。
      'ancestry-cycle': installerSource.replace("System::Call '*$R1(p $R0, i r5, i r6)'", "System::Call '*$R1(p $R0, i r5, i r5)'"),
      // 直接验证每次祖先查询只枚举一次，避免用人工延时和墙钟耗时判断算法回退。
      'ancestry-snapshot-count': installerSource.replace(
        'Function ${EISLAND_CHILD_FUNCTION}',
        'Function ${EISLAND_CHILD_FUNCTION}\n  StrCpy $TestSnapshotCount 0',
      ).replaceAll(
        "System::Call 'kernel32::Process32FirstW(p r2, p r3)",
        [
          'IntOp $TestSnapshotCount $TestSnapshotCount + 1',
          '${If} $TestSnapshotCount > 1',
          'SetErrorLevel 98',
          'Quit',
          '${EndIf}',
          "System::Call 'kernel32::Process32FirstW(p r2, p r3)",
        ].join('\n  '),
      ).replace('eIslandChildDone:', [
        'eIslandChildDone:',
        'FileOpen $TestFile "$INSTDIR\\child-snapshot-counts" a',
        'FileSeek $TestFile 0 END',
        'FileWrite $TestFile "$TestSnapshotCount$\\r$\\n"',
        'FileClose $TestFile',
      ].join('\n  ')),
      'snapshot-failure': failureSource,
      'process-exit': installerSource.replace(queryCall!, exitBeforeQuery),
      'query-failure': installerSource.replace(queryCall!, 'StrCpy $3 0'),
      'wait-failure': installerSource.replace("System::Call 'kernel32::WaitForSingleObject(p r0, i 5000) i.r3'", 'StrCpy $3 258'),
      'late-start': installerSource.replace(
        "GetFullPathName $8 \"$INSTDIR\\${PRODUCT_FILENAME}.exe\"\n  System::Call 'kernel32::CreateToolhelp32Snapshot(i 2, i 0) p.r1'",
        [
          'GetFullPathName $8 "$INSTDIR\\${PRODUCT_FILENAME}.exe"',
          "System::Call 'kernel32::CreateToolhelp32Snapshot(i 2, i 0) p.r1'",
          '${IfNot} ${FileExists} "$INSTDIR\\first-snapshot"',
          'FileOpen $TestFile "$INSTDIR\\first-snapshot" w',
          'FileClose $TestFile',
          'StrCpy $TestExitPid 0',
          'wait_for_late_app:',
          '${IfNot} ${FileExists} "$INSTDIR\\late-ready"',
          'Sleep 10',
          'IntOp $TestExitPid $TestExitPid + 1',
          `IntCmp $TestExitPid ${BARRIER_TIMEOUT_MS / 10} 0 wait_for_late_app`,
          'Abort',
          '${EndIf}',
          '${EndIf}',
        ].join('\n'),
      ),
    };
    expect(sources['late-start']).not.toBe(installerSource);
    const builds = Object.entries(sources).map(([variant, contents]) => {
      if (variant !== 'normal') expect(contents, `${variant} injection must be applied`).not.toBe(installerSource);
      const directory = join(root, variant);
      mkdirSync(directory);
      const variantInclude = join(directory, 'installer.nsh');
      // 只在测试副本中记录阶段和系统时钟，让超时报告保留实际停留的位置。
      const traced = [
        'Function ${EISLAND_CHILD_FUNCTION}',
        'eIslandChildParent:',
        'eIslandChildDone:',
        'Function ${EISLAND_TREE_FUNCTION}',
        "System::Call 'kernel32::WaitForSingleObject(p r0, i 5000) i.r3'",
        'eIslandTreeDone:',
        'eIslandCheckRunning:',
      ].reduce((source, marker) => source.replaceAll(marker, [
        marker,
        'FileOpen $TestFile "$TestOutput.trace" a',
        'FileSeek $TestFile 0 END',
        "System::Call 'kernel32::GetTickCount() i.s'",
        'Pop $TestExitPid',
        `FileWrite $TestFile "$TestExitPid ${marker.replaceAll('"', '')}: 0=$0 1=$1 7=$7 R0=$R0$\\r$\\n"`,
        'FileClose $TestFile',
      ].join('\n  ')), contents);
      writeFileSync(variantInclude, traced, 'utf8');
      return { directory, variantInclude };
    });
    await Promise.all((['installer', 'uninstaller'] as const).flatMap((mode) => builds.map(async ({ directory, variantInclude }) => {
      const source = join(directory, `${mode}.nsi`);
      const output = join(directory, `${mode === 'uninstaller' ? 'uninstaller-builder' : 'installer-probe'}.exe`);
      writeFileSync(source, probeSource(mode, output, variantInclude), 'utf8');
      await runExecutable(compiler!, ['/V2', '/INPUTCHARSET', 'UTF8', source]);
      if (mode === 'uninstaller') await runExecutable(output, ['/S']);
    })));
  }, TEST_TIMEOUT_MS);

  afterEach(async () => {
    const descendants = descendantFixtures.splice(0);
    descendants.forEach(({ cleanup }) => writeFileSync(cleanup, ''));
    await Promise.all(children.splice(0).map(async (child) => {
      if (child.pid === undefined || child.exitCode !== null || child.signalCode !== null) return;
      child.kill();
      await expect.poll(() => child.exitCode !== null || child.signalCode !== null, { timeout: CLEANUP_TIMEOUT_MS }).toBe(true);
    }));
    await Promise.all(descendants.map(async ({ expired, executables }) => {
      // 先确认父进程释放映像，再删除孙进程入口，覆盖尚未 ready 就失败的迟到 spawn。
      await executables.reduce(async (previous, executable) => {
        await previous;
        await expect.poll(() => {
          try { rmSync(executable, { force: true }); return true; }
          catch (error) {
            if (['EBUSY', 'EPERM', 'EACCES'].includes((error as NodeJS.ErrnoException).code ?? '')) return false;
            throw error;
          }
        }, { timeout: CLEANUP_TIMEOUT_MS }).toBe(true);
      }, Promise.resolve());
      expect(existsSync(expired), 'fixture watchdog must not substitute for NSIS termination').toBe(false);
    }));
  }, CLEANUP_TIMEOUT_MS * 4);

  afterAll(() => {
    if (root) rmSync(root, { recursive: true, force: true, maxRetries: 200, retryDelay: 100 });
  }, 30_000);

  async function startFixture(directory: string, name = 'eIsland.exe', exitOnSignal = false, childTree = false, launchInstaller = false): Promise<ChildProcess> {
    mkdirSync(directory, { recursive: true });
    const executable = join(directory, name);
    if (!existsSync(executable)) linkSync(fixture, executable);
    let script = exitOnSignal
      ? 'const fs = require("node:fs"); process.stdout.write("ready"); setInterval(() => { if (fs.existsSync(process.argv[1])) process.exit(0); }, 10);'
      : 'process.stdout.write("ready"); setInterval(() => {}, 1000);';
    if (childTree) {
      const childPath = join(directory, 'ffmpeg.exe');
      const grandchildPath = join(directory, 'worker.exe');
      const cleanup = join(directory, 'tree-cleanup');
      const expired = join(directory, 'tree-expired');
      descendantFixtures.push({ cleanup, expired, executables: [childPath, grandchildPath] });
      linkSync(fixture, childPath); linkSync(fixture, grandchildPath);
      // detached 避免 Node 的 Windows Job 自动清理后代，确保验证的是 NSIS 的递归关闭。
      // 清理信号仅由 afterEach 发出；启动时也检查，避免失败后的迟到进程成为孤儿。
      const lifetime = `const fs=require('node:fs'); const stop=()=>{if(fs.existsSync(${JSON.stringify(cleanup)}))process.exit(0)}; stop(); setInterval(stop,50); setTimeout(()=>{fs.writeFileSync(${JSON.stringify(expired)},String(process.pid));process.exit(1)},${FIXTURE_WATCHDOG_MS});`;
      const grandchildScript = `${lifetime} process.stdout.write('ready');`;
      const childScript = `${lifetime} const child = require('node:child_process').spawn(${JSON.stringify(grandchildPath)}, ['-e', ${JSON.stringify(grandchildScript)}], {detached:true, windowsHide:true, stdio:['ignore','pipe','ignore']}); child.stdout.once('data', () => { fs.writeFileSync(${JSON.stringify(join(directory, 'tree-pids.json'))}, JSON.stringify([process.pid,child.pid])); process.stdout.write('ready'); });`;
      script = `const child = require('node:child_process').spawn(${JSON.stringify(childPath)}, ['-e', ${JSON.stringify(childScript)}], {detached:true, windowsHide:true, stdio:['ignore','pipe','ignore']}); child.stdout.once('data', () => process.stdout.write('ready')); setInterval(() => {},1000);`;
    }
    if (launchInstaller) {
      // 模拟 app → updater helper → NSIS，检查关闭应用树时不会杀掉安装器祖先。
      // 独立 helper 在应用退出后仍持有 NSIS 句柄，必须为失败路径设置自身的退出边界。
      const bridgeScript = `const request=JSON.parse(process.argv[1]); const child=require('node:child_process').spawn(request.executable,request.args,{env:{...process.env,...request.env},detached:true,windowsHide:true,windowsVerbatimArguments:request.rawArguments,stdio:'ignore'}); const timeout=setTimeout(()=>child.kill(),${PROBE_TIMEOUT_MS}); child.once('exit',code=>{clearTimeout(timeout);require('node:fs').writeFileSync(request.env.EISLAND_TEST_OUTPUT+'.exit',String(code));process.exit(code ?? 1)}); child.once('error',error=>{clearTimeout(timeout);require('node:fs').writeFileSync(request.env.EISLAND_TEST_OUTPUT+'.exit',error.stack);process.exit(1)});`;
      script = `process.on('message', request => { const fs=require('node:fs'); const log=${JSON.stringify(join(directory, 'launch-log'))}; fs.writeFileSync(log,'received\\n'); const bridge=require('node:child_process').spawn(${JSON.stringify(fixture)}, ['-e', ${JSON.stringify(bridgeScript)}, JSON.stringify(request)], {detached:true,windowsHide:true,stdio:['ignore','ignore','pipe']}); fs.appendFileSync(log,'spawned '+bridge.pid+'\\n'); bridge.stderr.on('data', data=>fs.appendFileSync(log,data)); bridge.once('error',error=>fs.appendFileSync(log,error.stack)); bridge.once('exit',(code,signal)=>fs.appendFileSync(log,'exit '+code+' '+signal)); }); process.stdout.write('ready'); setInterval(()=>{},1000);`;
    }
    const child = spawn(executable, ['-e', script, join(directory, 'exit-signal')], {
      windowsHide: true,
      stdio: launchInstaller ? ['ignore', 'pipe', 'ignore', 'ipc'] : ['ignore', 'pipe', 'ignore'],
    });
    children.push(child);
    const ready = new AbortController();
    const timeout = setTimeout(() => ready.abort(new Error(`Fixture readiness timed out: ${executable}`)), FIXTURE_READY_TIMEOUT_MS);
    try {
      await Promise.race([
        once(child.stdout!, 'data', { signal: ready.signal }),
        once(child, 'exit', { signal: ready.signal }).then(([code]) => {
          throw new Error(`Fixture exited before ready: ${code} (${executable})`);
        }),
      ]);
    } finally {
      clearTimeout(timeout);
      ready.abort();
    }
    return child;
  }

  async function probe(mode: ProbeMode, directory: string, options: {
    action?: 'find' | 'kill' | 'check' | 'handoff'; updated?: boolean; variant?: ProbeVariant; exitPid?: number; viaApp?: ChildProcess;
  } = {}): Promise<string> {
    const { action = 'find', updated = false, variant = 'normal', exitPid } = options;
    mkdirSync(directory, { recursive: true });
    // 探针本身就在安装目录内，确保安装器/卸载器不会被误判为运行中的应用。
    const executable = join(directory, `${mode}-probe.exe`);
    if (!existsSync(executable)) copyFileSync(join(root, variant, `${mode}-probe.exe`), executable);
    // 迟到的结果或 trace 不能污染后续探针，也不能被下一个查询误认为成功。
    const output = join(directory, `probe-result-${probeSequence++}.txt`);
    const args = ['/S', ...(updated ? ['--updated'] : []), ...(mode === 'uninstaller' ? [`_?=${directory}`] : [])];
    // NSIS 的 _?= 会读取命令行余下全部字符，目录含空格时也不能额外加引号。
    const env = {
      ...process.env,
      EISLAND_TEST_INSTALL_DIR: directory,
      EISLAND_TEST_ACTION: action,
      EISLAND_TEST_OUTPUT: output,
      EISLAND_TEST_EXIT_PID: String(exitPid ?? ''),
      // 系统没有 PowerShell/WMIC 的环境也必须有相同结果。
      PATH: root,
    };
    if (options.viaApp) {
      // 只传测试覆盖项，避免把完整环境重复编码进 Windows 的有限命令行。
      const overrides = Object.fromEntries(Object.entries(env).filter(([key]) => key.startsWith('EISLAND_TEST_') || key === 'PATH'));
      options.viaApp.send({ executable, args, env: overrides, rawArguments: mode === 'uninstaller' });
      try {
        await expect.poll(() => existsSync(`${output}.exit`), { timeout: PROBE_TIMEOUT_MS + 5000 }).toBe(true);
      } catch (error) {
        const log = join(directory, 'launch-log');
        throw new Error(`App-launched probe timed out (app exit=${options.viaApp.exitCode}, signal=${options.viaApp.signalCode}): ${existsSync(log) ? readFileSync(log, 'utf8') : 'no IPC message received'}`, { cause: error });
      }
      const exitResult = readFileSync(`${output}.exit`, 'utf8').trim();
      if (exitResult !== '0' || !existsSync(output)) throw new Error(`App-launched probe failed: ${exitResult}`);
    } else {
      await runExecutable(executable, args, env, mode === 'uninstaller');
    }
    const [result, stack, ...actualRegisters] = readFileSync(output, 'utf8').trimEnd().split(/\r?\n/);
    expect(stack, 'NSIS stack must remain balanced').toBe('stack-sentinel');
    if (action !== 'check' && action !== 'handoff') {
      expect(actualRegisters, 'process helpers must preserve caller registers').toEqual(registerIndexes.map((index) => `register-${index}`));
    }
    return result;
  }

  /**
   * 等待探针进入竞态窗口，并在准备失败时也释放、回收探针，保留原始失败。
   * @param mode - 安装或卸载探针。
   * @param directory - 本次场景目录。
   * @param options - 探针操作和双向握手文件。
   * @param options.action - 运行检查或文件变更交接检查。
   * @param options.variant - 注入的探针场景，默认为 normal。
   * @param options.marker - 探针到达屏障后写入的文件名。
   * @param options.ready - 准备完成后释放探针的文件名。
   * @param setup - 在探针暂停期间启动需要检查的进程。
   * @returns 已准备的测试进程及数据。
   */
  async function atProbeBarrier<T>(mode: ProbeMode, directory: string, options: {
    action: 'check' | 'handoff'; variant?: ProbeVariant; marker: string; ready: string;
  }, setup: () => Promise<T>): Promise<T> {
    const pending = probe(mode, directory, options);
    // 立即订阅拒绝；稍后仍通过 pending 抛出探针失败，避免等待标记期间产生未处理拒绝。
    const settled = (async () => {
      try { await pending; }
      catch { /* 原始失败由后续的 pending 断言传播。 */ }
    })();
    let result: T;
    try {
      await expect.poll(() => existsSync(join(directory, options.marker)), { timeout: BARRIER_TIMEOUT_MS }).toBe(true);
      result = await setup();
    } finally {
      writeFileSync(join(directory, options.ready), '');
      await settled;
    }
    expect(await pending).toBe('checked');
    return result;
  }

  (['installer', 'uninstaller'] as const).forEach((mode) => {
    it(`${mode}: preserves its own updater ancestry while closing the launching app`, async () => {
      const directory = join(root, `${mode}-app-launched`);
      const target = await startFixture(directory, 'eIsland.exe', false, false, true);
      expect(await probe(mode, directory, { action: 'check', viaApp: target })).toBe('checked');
      await expect.poll(() => target.exitCode !== null || target.signalCode !== null).toBe(true);
    }, TEST_TIMEOUT_MS);
    it(`${mode}: catches an app started after the first snapshot`, async () => {
      const directory = join(root, `${mode}-late-start`);
      const target = await atProbeBarrier(mode, directory, {
        action: 'check', variant: 'late-start', marker: 'first-snapshot', ready: 'late-ready',
      }, () => startFixture(directory));
      await expect.poll(() => target.exitCode !== null || target.signalCode !== null).toBe(true);
    }, TEST_TIMEOUT_MS);

    it.each(['normal', 'ancestry-cycle', 'ancestry-snapshot-count'] as const)(`${mode}: rechecks at file mutation and waits for children and grandchildren (%s)`, async (variant) => {
      const directory = join(root, `${mode}-handoff-tree-${variant}`);
      const { target, descendants, unrelated } = await atProbeBarrier(mode, directory, {
        variant, action: 'handoff', marker: 'before-files', ready: 'files-ready',
      }, async () => {
        const target = await startFixture(directory, 'eIsland.exe', false, true);
        const descendants = JSON.parse(readFileSync(join(directory, 'tree-pids.json'), 'utf8')) as number[];
        const unrelated = await startFixture(`${directory}-other`);
        return { target, descendants, unrelated };
      });
      await expect.poll(() => target.exitCode !== null || target.signalCode !== null).toBe(true);
      descendants.forEach((pid) => {
        expect(() => process.kill(pid, 0)).toThrow();
      });
      expect(unrelated.exitCode).toBeNull();
      expect(unrelated.signalCode).toBeNull();
      expect(existsSync(join(directory, 'tree-expired'))).toBe(false);
      if (variant === 'ancestry-snapshot-count') {
        expect(readFileSync(join(directory, 'child-snapshot-counts'), 'utf8').trim().split(/\r?\n/)).toEqual(['1', '1']);
      }
      // Windows 拒绝删除仍被运行进程映射的可执行文件。
      rmSync(join(directory, 'ffmpeg.exe'));
      rmSync(join(directory, 'worker.exe'));
    }, TEST_TIMEOUT_MS);

    it(`${mode}: matches executable filename case variants`, async () => {
      const directory = join(root, `${mode}-case-variant`);
      const target = await startFixture(directory, 'EISLAND.EXE');
      expect(await probe(mode, directory.toUpperCase())).toBe('0');
      expect(await probe(mode, directory.toUpperCase(), { action: 'check' })).toBe('checked');
      await expect.poll(() => target.exitCode !== null || target.signalCode !== null).toBe(true);
    }, TEST_TIMEOUT_MS);

    it(`${mode}: aborts if shutdown cannot be confirmed instead of proceeding with file changes`, async () => {
      const directory = join(root, `${mode}-wait-failure`);
      await startFixture(directory);
      await expect(probe(mode, directory, { action: 'check', variant: 'wait-failure' })).rejects.toThrow('Process exited with 2');
    }, TEST_TIMEOUT_MS);
    it(`${mode}: ignores helpers and the same executable in a different installation`, async () => {
      const directory = join(root, `${mode}-absent`);
      const unrelated = await startFixture(`${directory}-other`);
      const helper = await startFixture(directory, 'Uninstall eIsland.exe');
      expect(await probe(mode, directory)).toBe('1');
      expect(unrelated.exitCode).toBeNull();
      expect(helper.exitCode).toBeNull();
    }, TEST_TIMEOUT_MS);

    it.each(['ordinary', "中文 空格 O'Brien & $目录"])(`${mode}: finds and stops only the exact executable in %s`, async (name) => {
      const directory = join(root, `${mode}-${name}`);
      const target = await startFixture(directory);
      const secondTarget = await startFixture(directory);
      const unrelated = await startFixture(`${directory}-other`);
      const helper = await startFixture(directory, 'eIsland helper.exe');
      expect(await probe(mode, directory)).toBe('0');
      expect(await probe(mode, directory.toUpperCase())).toBe('0');
      expect(await probe(mode, directory, { action: 'kill' })).toBe('0');
      await expect.poll(() => target.exitCode !== null || target.signalCode !== null).toBe(true);
      await expect.poll(() => secondTarget.exitCode !== null || secondTarget.signalCode !== null).toBe(true);
      expect(await probe(mode, directory)).toBe('1');
      expect(unrelated.exitCode).toBeNull();
      expect(unrelated.signalCode).toBeNull();
      expect(helper.exitCode).toBeNull();
      expect(helper.signalCode).toBeNull();
    }, TEST_TIMEOUT_MS);

    it.each([false, true])(`${mode}: completes the running-app check with updated=%s`, async (updated) => {
      const directory = join(root, `${mode}-check-${updated}`);
      expect(await probe(mode, directory, { updated, action: 'check' })).toBe('checked');
      const target = await startFixture(directory);
      expect(await probe(mode, directory, { updated, action: 'check' })).toBe('checked');
      await expect.poll(() => target.exitCode !== null || target.signalCode !== null).toBe(true);
      expect(await probe(mode, directory)).toBe('1');
    }, TEST_TIMEOUT_MS);

    it(`${mode}: fails closed when the native process snapshot fails`, async () => {
      const directory = join(root, `${mode}-failed-query`);
      expect(await probe(mode, directory, { variant: 'snapshot-failure' })).toBe('2');
      await expect(probe(mode, directory, { action: 'check', variant: 'snapshot-failure' })).rejects.toThrow('Process exited with 2');
      await expect(probe(mode, directory, { action: 'check', updated: true, variant: 'snapshot-failure' })).rejects.toThrow('Process exited with 2');
    }, TEST_TIMEOUT_MS);

    it(`${mode}: ignores a process that exits after its handle is opened`, async () => {
      const directory = join(root, `${mode}-exit-during-query`);
      const target = await startFixture(directory, 'eIsland.exe', true);
      expect(await probe(mode, directory, { variant: 'process-exit', exitPid: target.pid })).toBe('1');
      expect(target.exitCode).toBe(0);
    }, TEST_TIMEOUT_MS);

    it(`${mode}: reports a query failure for a process that is still alive`, async () => {
      const directory = join(root, `${mode}-live-query-failure`);
      const target = await startFixture(directory);
      expect(await probe(mode, directory, { variant: 'query-failure' })).toBe('2');
      expect(target.exitCode).toBeNull();
      expect(target.signalCode).toBeNull();
    }, TEST_TIMEOUT_MS);
  });
});
