/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM / pyisland.com
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
/**
 * @file native-loader.js
 * @description 解析预编译模块与媒体桥接资源的真实文件路径。
 * @author 鸡哥
 */
const { existsSync } = require('node:fs');
const { join, resolve, sep } = require('node:path');

/**
 * 转换原生资源的 ASAR 解包路径。
 * @param path - Electron 包内路径。
 * @returns 原生加载器可使用的解包路径。
 */
function unpackedPath(path) {
  return path.replace(`${sep}app.asar${sep}`, `${sep}app.asar.unpacked${sep}`);
}

/**
 * 加载预编译模块并创建原生客户端。
 * @param options - 可指定解包后的桥接资源目录与请求超时毫秒数。
 * @returns 原生客户端。
 */
function createNativeClient(options = {}) {
  if (process.platform !== 'darwin') throw new Error('eisland-macos-media-helper only supports macOS.');
  if (!['arm64', 'x64'].includes(process.arch)) throw new Error(`Unsupported macOS architecture: ${process.arch}`);
  const binaryDirectory = unpackedPath(join(__dirname, 'prebuilds', `darwin-${process.arch}`));
  const binary = join(binaryDirectory, 'media.node');
  if (!existsSync(binary)) throw new Error('macOS media prebuild is missing. Run npm run build in eisland-macos-media-helper.');
  const resourceDirectory = options.resourceDirectory === undefined
    ? binaryDirectory
    : unpackedPath(resolve(options.resourceDirectory));
  const timeoutMs = options.timeoutMs ?? 4000;
  if (!Number.isFinite(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000) {
    throw new RangeError('timeoutMs must be between 100 and 30000.');
  }
  const native = require(binary);
  return native.create(join(resourceDirectory, 'mediaremote-adapter.pl'), join(resourceDirectory, 'MediaRemoteAdapter.framework'), timeoutMs / 1000);
}

module.exports = { createNativeClient };
