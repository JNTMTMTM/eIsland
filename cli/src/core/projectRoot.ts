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
 * @file projectRoot.ts
 * @description 向上查找 eIsland 仓库根目录，使 CLI 在仓库任意子目录中均可执行
 * @author 鸡哥
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const ROOT_PACKAGE_NAME = 'eisland';

/**
 * 判断目录是否为仓库根目录
 * @param dir - 待检查目录
 * @returns package.json 存在且 name 为 eisland 时返回 true
 */
function isProjectRoot(dir: string): boolean {
  const file = join(dir, 'package.json');
  if (!existsSync(file)) return false;
  try {
    return (JSON.parse(readFileSync(file, 'utf8')) as { name?: unknown }).name === ROOT_PACKAGE_NAME;
  } catch {
    // 子包中损坏的 package.json 不应中断向上查找。
    return false;
  }
}

/**
 * 从起始目录逐级向上查找仓库根目录
 * @param startDir - 起始目录
 * @returns 仓库根目录绝对路径，到达文件系统根仍未找到时返回 null
 */
export default function findProjectRoot(startDir: string): string | null {
  let dir = resolve(startDir);
  while (!isProjectRoot(dir)) {
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return dir;
}
