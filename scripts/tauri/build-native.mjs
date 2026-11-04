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
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
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
  // Reuse the volume helper's self-contained .NET runtime instead of bundling a third copy.
  // Intermediate/publish files live on the OS temp drive, where space is independent of the checkout.
  const temperatureStage = resolve(process.env.EISLAND_NATIVE_STAGING_DIR || tmpdir(), 'eisland-native-publish', rid, 'temperature');
  const temperatureSource = resolve(temperatureStage, 'source');
  mkdirSync(temperatureSource, { recursive: true });
  const temperatureProject = resolve(root, 'plugins/windows/eisland-windows-performance-monitor/temperature-helper');
  readdirSync(temperatureProject, { withFileTypes: true }).filter((file) => file.isFile() && /\.(cs|csproj)$/.test(file.name))
    .forEach((file) => copyFileSync(resolve(temperatureProject, file.name), resolve(temperatureSource, file.name)));
  const temperature = spawnSync('dotnet', ['publish', resolve(temperatureSource, 'eIslandTemperatureReader.csproj'),
    '-c', 'Release', '-r', rid, '--self-contained', 'true', '-o', resolve(temperatureStage, 'publish'),
    `-p:BaseIntermediateOutputPath=${resolve(temperatureStage, 'obj')}/`, `-p:BaseOutputPath=${resolve(temperatureStage, 'bin')}/`],
  { cwd: root, stdio: 'inherit', windowsHide: true });
  if (temperature.error) throw temperature.error;
  if (temperature.status !== 0) throw new Error('Native temperature collector publish failed');
  const shared = resolve(output, 'volume');
  const volumeDependencies = JSON.parse(readFileSync(resolve(shared, 'eIslandVolumeHelper.deps.json'), 'utf8'));
  const runtimeFiles = new Set(Object.values(volumeDependencies.targets).flatMap((target) =>
    Object.entries(target).filter(([name]) => name.startsWith('runtimepack.')).flatMap(([, dependency]) =>
      ['runtime', 'native', 'resources'].flatMap((kind) => Object.keys(dependency[kind] || {})))));
  const digest = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
  const copyShared = (source, destination) => {
    mkdirSync(destination, { recursive: true });
    readdirSync(source, { withFileTypes: true }).forEach((file) => {
      const from = resolve(source, file.name);
      const to = resolve(destination, file.name);
      if (file.isDirectory()) copyShared(from, to);
      else if (!existsSync(to) || !runtimeFiles.has(file.name)) copyFileSync(from, to);
      else if (digest(from) !== digest(to)) throw new Error(`Shared .NET runtime mismatch: ${file.name}; rebuild the volume runtime and temperature collector together`);
    });
  };
  copyShared(resolve(temperatureStage, 'publish'), shared);
  const smtc = resolve(output, 'smtc');
  const staging = resolve(root, 'src-tauri/target/native-publish', rid, 'smtc');
  publish('smtc-helper', 'eIslandSmtcHelper.csproj', staging);
  mkdirSync(smtc, { recursive: true });
  // dotnet publish's output contains the Native AOT library, not the intermediate managed DLL.
  copyFileSync(resolve(staging, 'eIslandSmtcHelper.dll'), resolve(smtc, 'eIslandSmtcHelper.dll'));
  const ffmpeg = resolve(root, 'src-tauri/resources/native/ffmpeg');
  mkdirSync(ffmpeg, { recursive: true });
  const ffmpegBinary = createRequire(import.meta.url)('ffmpeg-static');
  if (!ffmpegBinary || !existsSync(ffmpegBinary)) throw new Error('FFmpeg binary is missing; run node node_modules/ffmpeg-static/install.js before preparing native resources');
  copyFileSync(ffmpegBinary, resolve(ffmpeg, 'ffmpeg.exe'));
  ['LICENSE', 'README'].forEach((suffix) => {
    if (existsSync(`${ffmpegBinary}.${suffix}`)) copyFileSync(`${ffmpegBinary}.${suffix}`, resolve(ffmpeg, `ffmpeg.${suffix}`));
  });
  console.log(`Tauri native resources prepared: ${rid}`);
}
