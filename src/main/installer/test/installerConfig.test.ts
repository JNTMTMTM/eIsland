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
 * @file installerConfig.test.ts
 * @description NSIS 覆盖安装进程检测配置测试。
 * @author 鸡哥
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const installerScript = readFileSync(resolve(process.cwd(), 'resources', 'installer.nsh'), 'utf8');
const builderConfig = JSON.parse(readFileSync(resolve(process.cwd(), 'electron-builder.json'), 'utf8')) as {
  nsis?: { include?: string };
};

describe('NSIS overwrite-install process detection', () => {
  it('uses the configured custom installer include', () => {
    expect(builderConfig.nsis?.include).toBe('installer.nsh');
  });

  it('queries native executable paths without a shell or WMIC dependency', () => {
    expect(installerScript).toContain('kernel32::QueryFullProcessImageNameW');
    expect(installerScript).toContain('GetFullPathName $8 "$INSTDIR\\${PRODUCT_FILENAME}.exe"');
    expect(installerScript).not.toMatch(/nsExec::|Get-CimInstance|wmic|IS_POWERSHELL_AVAILABLE/);
  });

  it.each([
    { name: 'LF', newline: '\n' },
    { name: 'CRLF', newline: '\r\n' },
  ])('queries and terminates through the same process handle with $name line endings', ({ newline }) => {
    const script = installerScript.replace(/\r?\n/g, newline);
    expect(script).toContain('QueryFullProcessImageNameW(p r6,');
    expect(script).toMatch(/Push \$6\r?\n[ \t]+Call \$\{EISLAND_TREE_FUNCTION\}/);
    expect(script).toContain('TerminateProcess(p r0,');
    expect(script).toContain('WaitForSingleObject(p r0, i 5000)');
    expect(script).toContain('CloseHandle(p r6)');
  });

  it('compares Windows paths ordinally and rechecks at both mutation boundaries', () => {
    expect(installerScript).toContain('CompareStringOrdinal(w r5, i -1, w r8, i -1, i 1)');
    expect(installerScript).toContain('Call un.eIslandFinalProcessCheck');
    const extraction = readFileSync(resolve('resources/nsis/installer.nsh'), 'utf8');
    expect(extraction).toMatch(/Call eIslandFinalProcessCheck\s+Call eIslandInstallApplicationFiles/);
  });

  it('builds native detection into both installers and uninstallers', () => {
    expect(installerScript).toContain('!ifdef BUILD_UNINSTALLER');
    expect(installerScript).toContain('!define EISLAND_PROCESS_FUNCTION un.eIslandProcessAction');
    expect(installerScript).toContain('!define EISLAND_PROCESS_FUNCTION eIslandProcessAction');
  });

  it('does not let query failure continue installation or report success on cancellation', () => {
    expect(installerScript).toContain('${elseif} $R0 == 2');
    expect(installerScript).toContain('Goto eIslandCheckFailed');
    expect(installerScript).toMatch(/SetErrorLevel 2\s+Quit/g);
  });
});
