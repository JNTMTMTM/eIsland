/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM / pyisland.com
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
/**
 * @file loadCommonJs.mjs
 * @description 隔离 CommonJS 模块以测试真实加载器分支，避免操作用户媒体或亮度。
 * @author 鸡哥
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

/**
 * 隔离执行原始 CommonJS 文件，注入原生依赖且保留真实源码路径供 V8 统计。
 * @param file - 插件根目录下的 JS 文件名。
 * @param options - 依赖替身、模拟平台与 ASAR 目录；不修改生产模块缓存。
 * @returns 真实源码的导出对象。
 */
export default function loadCommonJs(file, options = {}) {
  const filename = fileURLToPath(new URL(`../${file}`, import.meta.url));
  const require = createRequire(filename);
  const loaded = { exports: {} };
  runInNewContext(readFileSync(filename, 'utf8'), {
    Date, setTimeout, clearTimeout, setInterval, clearInterval,
    module: loaded,
    exports: loaded.exports,
    require: (id) => options.require?.(id) ?? require(id),
    __dirname: options.directory ?? dirname(filename),
    process: { platform: options.platform ?? 'darwin', arch: options.arch ?? 'arm64' },
  }, { filename });
  return loaded.exports;
}
