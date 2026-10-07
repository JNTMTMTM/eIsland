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
 * @file build-windows-native.mjs
 * @description 编译 Windows E2E 使用的真实插件并检查加载器要求的产物路径。
 * @author 鸡哥
 */

import { spawnSync } from 'node:child_process';
import { accessSync } from 'node:fs';
import { resolve } from 'node:path';

if (process.platform !== 'win32' || process.arch !== 'x64') {
  throw new Error('Windows native E2E requires Windows x64, matching the application-icon plugin.');
}

const helpers = [
  { plugin: 'volume', project: 'eIslandVolumeHelper', native: false, framework: 'net10.0' },
  { plugin: 'brightness', project: 'eIslandBrightnessReader', native: false, framework: 'net10.0' },
  { plugin: 'smtc', project: 'eIslandSmtcHelper', native: true, framework: 'net10.0-windows10.0.19041.0' },
  { plugin: 'application-icon', project: 'eIslandAppIconHelper', native: true, framework: 'net10.0-windows10.0.19041.0' },
];

helpers.forEach(({ plugin, project, native, framework }) => {
  const directory = resolve(`plugins/eisland-windows-${plugin}-helper/src`);
  const args = [native ? 'publish' : 'build', resolve(directory, `${project}.csproj`), '-c', 'Release'];
  // EXE 加载器查找无 RID 的 net10.0 目录；DLL 必须使用 Native AOT，不能加载托管程序集。
  args.push(...(native ? ['-r', 'win-x64'] : ['-p:RuntimeIdentifier=', '-p:SelfContained=false']));
  const result = spawnSync('dotnet', args, { stdio: 'inherit', windowsHide: true });
  if (result.error || result.status !== 0) {
    throw result.error ?? new Error(`Failed to build ${plugin}: exit ${result.status}`);
  }
  const artifact = native
    ? resolve(directory, 'bin/Release', framework, 'win-x64/native', `${project}.dll`)
    : resolve(directory, 'bin/Release', framework, `${project}.exe`);
  accessSync(artifact);
});
