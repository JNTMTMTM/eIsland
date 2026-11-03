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
 * @file projectRoot.test.ts
 * @description 验证仓库根目录的向上查找逻辑
 * @author 鸡哥
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import findProjectRoot from '../projectRoot';

const sandbox = mkdtempSync(join(tmpdir(), 'eisland-cli-root-'));
const root = join(sandbox, 'repo');
const nested = join(root, 'plugins', 'windows', 'helper');
mkdirSync(nested, { recursive: true });
writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'eisland' }));
writeFileSync(join(root, 'plugins', 'windows', 'helper', 'package.json'), JSON.stringify({ name: '@eisland/helper' }));
writeFileSync(join(root, 'plugins', 'package.json'), '{ broken json');

afterAll(() => rmSync(sandbox, { recursive: true, force: true }));

describe('findProjectRoot', () => {
  it('从根目录本身返回根目录', () => {
    expect(findProjectRoot(root)).toBe(root);
  });

  it('跳过子包与损坏的 package.json 继续向上查找', () => {
    expect(findProjectRoot(nested)).toBe(root);
  });

  it('不在仓库内时返回 null', () => {
    expect(findProjectRoot(sandbox)).toBeNull();
  });
});
