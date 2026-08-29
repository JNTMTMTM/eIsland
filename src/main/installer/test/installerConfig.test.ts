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
 * @description Tests the NSIS overwrite-install process detection configuration.
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

  it('matches the installed executable by exact path in PowerShell', () => {
    expect(installerScript).toContain('$_.ExecutablePath -ieq [System.IO.Path]::GetFullPath');
    expect(installerScript).not.toContain('$_.Path.StartsWith');
  });

  it('uses path-aware process detection in the wmic fallback', () => {
    expect(installerScript).toContain("wmic process where \"ExecutablePath='");
    expect(installerScript).not.toContain('tasklist /FI "IMAGENAME eq');
    expect(installerScript).toContain('taskkill /T /F /PID');
    expect(installerScript).not.toContain('taskkill /T /F /IM "${APP_EXECUTABLE_FILENAME}"');
  });

  it('does not define a second current-process name check', () => {
    expect(installerScript).toContain('${GetProcessInfo} 0 $pid $1 $2 $3 $4');
    // eslint-disable-next-line eqeqeq -- `!=` is NSIS script content, not a JS comparison
    expect(installerScript).toContain('$3 != "${APP_EXECUTABLE_FILENAME}"');
  });
});
