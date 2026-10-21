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
 * @file build-windows-plugins.mjs
 * @description 编译插件集成测试的全部 Windows 原生依赖，并验证加载器需要的产物。
 * @author 鸡哥
 */

import { spawnSync } from 'node:child_process';
import { accessSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { basename, resolve } from 'node:path';

if (process.platform !== 'win32' || process.arch !== 'x64') {
  throw new Error('Windows plugin integration tests require Windows x64.');
}
if (!process.env.npm_execpath) {
  throw new Error('Run this builder with npm run test:plugins:build.');
}

const root = fileURLToPath(new URL('../../', import.meta.url));
const framework = 'net10.0-windows10.0.19041.0';
const builds = [
  ['application-icon-helper', `src/bin/Release/${framework}/win-x64/native/eIslandAppIconHelper.dll`],
  ['bluetooth-helper', `src/bin/Release/${framework}/win-x64/native/eIslandBluetoothHelper.dll`],
  ['brightness-helper', 'src/bin/Release/net10.0/eIslandBrightnessReader.exe'],
  ['fullscreen-detector', 'build/Release/windows_fullscreen_detector.node'],
  ['hardware-info-helper', 'src/bin/Release/net10.0/eIslandHardwareInfoReader.exe'],
  ['performance-monitor', 'build/Release/windows_performance_monitor.node'],
  ['power-helper', `src/bin/Release/${framework}/win-x64/native/eIslandPowerHelper.dll`],
  ['screenshot-helper', `src/bin/Release/${framework}/win-x64/native/eIslandScreenshotHelper.dll`],
  ['smtc-helper', `src/bin/Release/${framework}/win-x64/native/eIslandSmtcHelper.dll`],
  ['toast-listener', 'build/Release/eisland_windows_toast_listener.node'],
  ['volume-analyzer', 'src/bin/Release/net10.0/eIslandVolumeAnalyzer.exe'],
  ['volume-helper', 'src/bin/Release/net10.0/eIslandVolumeHelper.exe'],
  ['wifi-helper', `src/bin/Release/${framework}/win-x64/native/eIslandWifiHelper.dll`],
];

builds.forEach(([name, artifact]) => {
  const directory = resolve(root, 'plugins/windows', `eisland-windows-${name}`);
  // EXE 加载器查找无 RID 的目录；与 Windows E2E 构建保持一致。
  const executable = artifact.endsWith('.exe') ? 'dotnet' : process.execPath;
  const args = artifact.endsWith('.exe')
    ? ['build', resolve(directory, 'src', `${basename(artifact, '.exe')}.csproj`), '-c', 'Release', '-p:RuntimeIdentifier=', '-p:SelfContained=false']
    : [process.env.npm_execpath, '--prefix', directory, 'run', 'build'];
  const result = spawnSync(executable, args, {
    cwd: root, stdio: 'inherit', windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    throw result.error ?? new Error(`Failed to build ${name}: exit ${result.status}`);
  }
  // 缺失产物必须使准备阶段失败，不能由原生测试的可用性判断静默跳过。
  accessSync(resolve(directory, artifact));
});
