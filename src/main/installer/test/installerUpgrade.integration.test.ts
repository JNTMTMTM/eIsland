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
 */

/**
 * @file installerUpgrade.integration.test.ts
 * @description 通过真实 NSIS 旧卸载器验证直接升级的长路径兼容、环境恢复和失败回滚。
 * @author 鸡哥
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const cache = join(process.env.ELECTRON_BUILDER_CACHE ?? join(process.env.LOCALAPPDATA ?? '', 'electron-builder', 'Cache'), 'nsis');
const cachedDirectories = process.platform === 'win32' && existsSync(cache) ? readdirSync(cache).map((entry) => join(cache, entry)) : [];
const compiler = process.env.EISLAND_NSIS_EXECUTABLE ?? cachedDirectories.map((entry) => join(entry, 'makensis.exe')).find(existsSync);
const plugins = cachedDirectories.map((entry) => join(entry, 'plugins', 'x86-unicode')).find((entry) => existsSync(join(entry, 'StdUtils.dll')));
const registryKey = `Software\\eIslandUpgradeTest-${randomUUID()}`;

function nsisString(value: string): string {
  return value.replaceAll('$', '$$').replaceAll('"', '$\\"');
}

function execute(executable: string, args: string[] = [], env = process.env): void {
  execFileSync(executable, args, { env, windowsHide: true, timeout: 20_000, stdio: 'pipe' });
}

function readValues(file: string): Record<string, string> {
  return Object.fromEntries(readFileSync(file, 'utf8').trim().split(/\r?\n/)
    .map((line) => {
      const separator = line.indexOf('=');
      return [line.slice(0, separator), line.slice(separator + 1)];
    }));
}

function oldUninstallerSource(output: string): string {
  const upstream = readFileSync(resolve('node_modules/app-builder-lib/templates/nsis/uninstaller.nsh'), 'utf8');
  // 保留已经发布的旧实现；测试必须证明新安装器能兼容它，不能先修补旧卸载器。
  const functions = ['un.atomicRMDir', 'un.restoreFiles'].map((name) => {
    const start = upstream.indexOf(`Function ${name}\r\n`) >= 0
      ? upstream.indexOf(`Function ${name}\r\n`)
      : upstream.indexOf(`Function ${name}\n`);
    if (start < 0) throw new Error(`Upstream NSIS function missing: ${name}`);
    return upstream.slice(start, upstream.indexOf('FunctionEnd', start) + 'FunctionEnd'.length);
  }).join('\n');
  return `
Unicode true
RequestExecutionLevel user
SilentInstall silent
SilentUnInstall silent
OutFile "${nsisString(output)}"
!include "LogicLib.nsh"
!define UNINSTALL_FILENAME "\\old-uninstaller.exe"
Var TestLog
Var TestFile
Var TestLongName
Var TestLock
Var TestHandle
Var TestFailure
${functions}
Section
  WriteUninstaller "$EXEDIR\\old-uninstaller.exe"
SectionEnd
Section "Uninstall"
  InitPluginsDir
  ReadEnvStr $TestLog EISLAND_TEST_OLD_LOG
  ReadEnvStr $TestLongName EISLAND_TEST_LONG_NAME
  ReadEnvStr $TestLock EISLAND_TEST_LOCK
  FileOpen $TestFile "$TestLog" a
  FileSeek $TestFile 0 END
  FileWrite $TestFile "temp=$TEMP$\\r$\\nplugins=$PLUGINSDIR$\\r$\\n"
  StrLen $0 "$PLUGINSDIR\\old-install\\$TestLongName"
  FileWrite $TestFile "backupLength=$0$\\r$\\n"
  StrCpy $TestHandle 0
  \${If} $TestLock == 1
    System::Call 'kernel32::CreateFileW(w "$INSTDIR\\z-locked.txt", i 0x80000000, i 0, p 0, i 3, i 0, p 0) p.s'
    Pop $TestHandle
    FileWrite $TestFile "lockHandle=$TestHandle$\\r$\\n"
  \${EndIf}
  CreateDirectory "$PLUGINSDIR\\old-install"
  Push ""
  Call un.atomicRMDir
  Pop $TestFailure
  \${If} $TestFailure != 0
    Push ""
    Call un.restoreFiles
    Pop $0
    FileWrite $TestFile "result=failed$\\r$\\nfailed=$TestFailure$\\r$\\n"
    SetErrorLevel 37
  \${Else}
    FileWrite $TestFile "result=success$\\r$\\n"
    SetErrorLevel 0
  \${EndIf}
  \${If} $TestHandle != 0
    System::Call 'kernel32::CloseHandle(p $TestHandle)'
  \${EndIf}
  FileClose $TestFile
SectionEnd
`;
}

function installerSource(output: string): string {
  return `
Unicode true
RequestExecutionLevel user
SilentInstall silent
OutFile "${nsisString(output)}"
!include "LogicLib.nsh"
!include "FileFunc.nsh"
!addincludedir "${nsisString(resolve('node_modules/app-builder-lib/templates/nsis/include'))}"
!addplugindir "${nsisString(plugins!)}"
!include "StdUtils.nsh"
!define PROJECT_DIR "${nsisString(process.cwd())}"
!define UNINSTALL_REGISTRY_KEY "${registryKey}"
!define INSTALL_REGISTRY_KEY "${registryKey}"
!define isUpdated '1 == 1'
!define isDeleteAppData '0 == 1'
Var installMode
Var appExe
Var TestMode
Var TestLog
Var TestFile
Var TestExit
Var TestErrors
Var TestTemp
Var TestTmp
!include "${nsisString(resolve('resources/nsis/installUtil.nsh'))}"
LangString uninstallFailed 1033 "Fixture uninstall failed"
LangString appCannotBeClosed 1033 "Fixture uninstall could not finish"
Section
  InitPluginsDir
  SetShellVarContext current
  ReadEnvStr $INSTDIR EISLAND_TEST_INSTALL_DIR
  ReadEnvStr $TestMode EISLAND_TEST_MODE
  ReadEnvStr $TestLog EISLAND_TEST_LOG
  StrCpy $installMode CurrentUser
  StrCpy $appExe "$INSTDIR\\fixture.exe"
  WriteRegStr HKCU "\${UNINSTALL_REGISTRY_KEY}" UninstallString '$\\"$INSTDIR\\old-uninstaller.exe$\\"'
  WriteRegStr HKCU "\${INSTALL_REGISTRY_KEY}" InstallLocation "$INSTDIR"
  ReadEnvStr $TestErrors EISLAND_TEST_ABSENT_TEMP
  \${If} $TestErrors == 1
    System::Call 'kernel32::SetEnvironmentVariableW(w "TEMP", p 0)'
  \${EndIf}
  \${If} $TestMode == baseline
    Push SHELL_CONTEXT
    Call uninstallOldVersion
  \${Else}
    !insertmacro uninstallOldVersion SHELL_CONTEXT
  \${EndIf}
  StrCpy $TestExit $R0
  StrCpy $TestErrors 0
  \${If} \${Errors}
    StrCpy $TestErrors 1
  \${EndIf}
  ReadEnvStr $TestTemp TEMP
  ReadEnvStr $TestTmp TMP
  DeleteRegKey HKCU "\${UNINSTALL_REGISTRY_KEY}"
  FileOpen $TestFile "$TestLog" w
  FileWrite $TestFile "exit=$TestExit$\\r$\\nerrors=$TestErrors$\\r$\\ntemp=$TestTemp$\\r$\\ntmp=$TestTmp$\\r$\\n"
  FileClose $TestFile
SectionEnd
`;
}

describe.skipIf(process.platform !== 'win32' || !compiler || !plugins)('NSIS upgrade integration (Windows and cached NSIS required)', () => {
  let root: string;
  let installer: string;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'eisland-upgrade-'));
    [
      ['old-builder', oldUninstallerSource(join(root, 'old-builder.exe'))],
      ['installer', installerSource(join(root, 'installer.exe'))],
    ].forEach(([name, source]) => {
      const path = join(root, `${name}.nsi`);
      writeFileSync(path, source);
      execute(compiler!, ['/V2', path]);
    });
    execute(join(root, 'old-builder.exe'));
    installer = join(root, 'installer.exe');
  }, 30_000);

  afterAll(() => {
    // 超时或断言失败也只清理本次随机注册表键和 mkdtemp 创建的目录。
    spawnSync('reg.exe', ['delete', `HKCU\\${registryKey}`, '/f', '/reg:32'], { windowsHide: true, stdio: 'ignore' });
    if (root && dirname(resolve(root)) === resolve(tmpdir()) && basename(root).startsWith('eisland-upgrade-')) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  function scenario(name: string): { installed: string; longName: string; env: NodeJS.ProcessEnv } {
    const directory = join(root, name);
    const installed = join(directory, 'installed');
    const temporary = join(directory, `temporary-${'t'.repeat(60)}`);
    const alternateTemporary = `${temporary}-temp`;
    mkdirSync(installed, { recursive: true });
    mkdirSync(temporary);
    mkdirSync(alternateTemporary);
    const longName = `m-${'f'.repeat(232 - installed.length)}.dat`;
    expect(join(installed, longName).length).toBeLessThan(260);
    copyFileSync(join(root, 'old-uninstaller.exe'), join(installed, 'old-uninstaller.exe'));
    writeFileSync(join(installed, 'a-short.txt'), 'rollback sentinel');
    writeFileSync(join(installed, longName), 'deep file preserved');
    writeFileSync(join(installed, 'z-locked.txt'), 'locked file preserved');
    return {
      installed,
      longName,
      env: {
        ...process.env,
        TEMP: alternateTemporary,
        TMP: temporary,
        EISLAND_TEST_INSTALL_DIR: installed,
        EISLAND_TEST_LONG_NAME: longName,
        EISLAND_TEST_LOG: join(directory, 'installer.log'),
        EISLAND_TEST_OLD_LOG: join(directory, 'old.log'),
      },
    };
  }

  it('reproduces legacy long-path rollback and upgrades the same files with the production wrapper', () => {
    const { installed, longName, env } = scenario('upgrade');
    execute(installer, [], { ...env, EISLAND_TEST_MODE: 'baseline' });
    const baseline = readValues(env.EISLAND_TEST_OLD_LOG!);
    expect(Number(baseline.backupLength)).toBeGreaterThanOrEqual(260);
    expect(baseline.failed).toBe(join(installed, longName));
    expect(readValues(env.EISLAND_TEST_LOG!)).toMatchObject({ exit: '37', errors: '0', temp: env.TEMP, tmp: env.TMP });
    expect(readFileSync(join(installed, 'a-short.txt'), 'utf8')).toBe('rollback sentinel');
    expect(readFileSync(join(installed, longName), 'utf8')).toBe('deep file preserved');

    execute(installer, [], { ...env, EISLAND_TEST_MODE: 'fixed' });
    const fixed = readValues(env.EISLAND_TEST_OLD_LOG!);
    expect(fixed.result, JSON.stringify({ fixed, installer: readValues(env.EISLAND_TEST_LOG!) })).toBe('success');
    expect(Number(fixed.backupLength)).toBeLessThan(260);
    expect(readValues(env.EISLAND_TEST_LOG!)).toMatchObject({ exit: '0', errors: '0', temp: env.TEMP, tmp: env.TMP });
    expect(existsSync(join(installed, longName))).toBe(false);
    expect(existsSync(join(installed, 'a-short.txt'))).toBe(false);
  }, 20_000);

  it('preserves an actual sharing violation and rolls files back after shortening TEMP', () => {
    const { installed, longName, env } = scenario('locked');
    execute(installer, [], { ...env, EISLAND_TEST_MODE: 'fixed', EISLAND_TEST_LOCK: '1' });
    const old = readValues(env.EISLAND_TEST_OLD_LOG!);
    expect(Number(old.backupLength)).toBeLessThan(260);
    expect(old.lockHandle).not.toBe('-1');
    expect(old.lockHandle).not.toBe('0');
    expect(old.failed).toBe(join(installed, 'z-locked.txt'));
    expect(readValues(env.EISLAND_TEST_LOG!)).toMatchObject({ exit: '37', errors: '0', temp: env.TEMP, tmp: env.TMP });
    expect(readFileSync(join(installed, 'a-short.txt'), 'utf8')).toBe('rollback sentinel');
    expect(readFileSync(join(installed, longName), 'utf8')).toBe('deep file preserved');
    expect(readFileSync(join(installed, 'z-locked.txt'), 'utf8')).toBe('locked file preserved');
  }, 20_000);

  it.each([false, true])('preserves launch errors and the original environment (TEMP absent: %s)', (absentTemp) => {
    const { installed, longName, env } = scenario(`missing-${absentTemp}`);
    rmSync(join(installed, 'old-uninstaller.exe'));
    execute(installer, [], { ...env, EISLAND_TEST_ABSENT_TEMP: absentTemp ? '1' : '0', EISLAND_TEST_MODE: 'fixed' });
    expect(readValues(env.EISLAND_TEST_LOG!)).toMatchObject({
      exit: '0', errors: '1', temp: absentTemp ? '' : env.TEMP, tmp: env.TMP,
    });
    expect(existsSync(env.EISLAND_TEST_OLD_LOG!)).toBe(false);
    expect(readFileSync(join(installed, longName), 'utf8')).toBe('deep file preserved');
    expect(readFileSync(join(installed, 'a-short.txt'), 'utf8')).toBe('rollback sentinel');
  });
});
