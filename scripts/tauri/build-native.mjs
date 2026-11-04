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

/** @file build-native.mjs
 * @description 将现有 C# 插件发布到 Tauri 资源目录，不修改插件源码或 Electron 产物。
 * @author 鸡哥
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
if (process.platform === 'win32') {
  const architecture = process.env.TAURI_ENV_ARCH ?? process.arch;
  const rid = { x86_64: 'win-x64', x64: 'win-x64', aarch64: 'win-arm64', arm64: 'win-arm64', x86: 'win-x86', ia32: 'win-x86' }[architecture];
  if (!rid) throw new Error(`Unsupported native architecture: ${architecture}`);
  const output = resolve(root, 'src-tauri/resources/native', rid);
  /** 发布一个插件，失败时中断打包，避免发布缺失的原生功能。
   * @param name - 插件目录后缀。
   * @param project - C# 项目文件名。
   * @param destination - 发布目录。
   */
  const publish = (name, project, destination) => {
    const result = spawnSync('dotnet', ['publish', resolve(root, `plugins/windows/eisland-windows-${name}/src`, project),
      '-c', 'Release', '-r', rid, '--self-contained', 'true', '-o', destination], { cwd: root, stdio: 'inherit', windowsHide: true });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Native plugin publish failed: ${name}`);
  };
  publish('volume-helper', 'eIslandVolumeHelper.csproj', resolve(output, 'volume'));
  publish('brightness-helper', 'eIslandBrightnessReader.csproj', resolve(output, 'brightness'));
  const smtc = resolve(output, 'smtc');
  const staging = resolve(root, 'src-tauri/target/native-publish', rid, 'smtc');
  publish('smtc-helper', 'eIslandSmtcHelper.csproj', staging);
  mkdirSync(smtc, { recursive: true });
  // dotnet publish's output contains the Native AOT library, not the intermediate managed DLL.
  copyFileSync(resolve(staging, 'eIslandSmtcHelper.dll'), resolve(smtc, 'eIslandSmtcHelper.dll'));
  console.log(`Tauri native resources prepared: ${rid}`);
}
