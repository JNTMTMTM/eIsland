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

  it('queries and terminates through the same process handle', () => {
    expect(installerScript).toContain('QueryFullProcessImageNameW(p r6,');
    expect(installerScript).toContain('TerminateProcess(p r6,');
    expect(installerScript).toContain('CloseHandle(p r6)');
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
