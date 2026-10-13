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
 * @file workerBuild.test.ts
 * @description 验证真实多入口构建的 Worker 隔离及 FFmpeg 安装目录定位。
 * @author 鸡哥
 */
import { resolve } from 'node:path';
import { resolveConfig } from 'electron-vite';
import { build } from 'vite';
import { expect, it } from 'vitest';

const root = resolve(__dirname, '../../..');
const workerEntries = ['smtcWorker', 'smtcCommandWorker', 'codexWorker', 'screenshotWorker'];

it.each(['production', 'development'])('%s worker bundles cannot reach the main-process entry', async (mode) => {
  const { config } = await resolveConfig({ mode, configFile: resolve(root, 'electron.vite.config.ts') }, 'build', mode);
  if (!config?.main) throw new Error('Missing Electron main build configuration');
  const result = await build({
    ...config.main,
    configFile: false,
    logLevel: 'silent',
    build: { ...config.main.build, write: false, sourcemap: false },
  });
  if (!('output' in result)) throw new Error('Expected one in-memory main build');
  const chunks = result.output.filter((output) => output.type === 'chunk');
  const byFile = new Map(chunks.map((chunk) => [chunk.fileName, chunk]));

  // 外部加载才能让 ffmpeg-static 的 __dirname 保持在实际安装目录。
  expect(chunks.some((chunk) => /require\(["']ffmpeg-static["']\)/.test(chunk.code))).toBe(true);
  expect(chunks.flatMap((chunk) => Object.keys(chunk.modules))
    .some((id) => id.replaceAll('\\', '/').includes('/node_modules/ffmpeg-static/'))).toBe(false);

  workerEntries.forEach((name) => {
    const entry = chunks.find((chunk) => chunk.isEntry && chunk.name === name);
    expect(entry, `Missing worker entry ${name}`).toBeDefined();
    const pending = [entry!.fileName];
    const visited = new Set<string>();
    while (pending.length) {
      const file = pending.pop()!;
      if (visited.has(file)) continue;
      visited.add(file);
      const chunk = byFile.get(file);
      if (!chunk) continue;
      // 检查完整依赖链，防止主入口藏在间接引用的共享 chunk 中。
      const loadsMain = Object.keys(chunk.modules).some((id) => id.replaceAll('\\', '/').endsWith('/src/main/index.ts'));
      expect(loadsMain, `${name} loads main-process code through ${file}`).toBe(false);
      pending.push(...chunk.imports, ...chunk.dynamicImports);
    }
  });
}, 30_000);
