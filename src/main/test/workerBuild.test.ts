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
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolveConfig } from 'electron-vite';
import { build } from 'vite';
import { expect, it } from 'vitest';

const root = resolve(__dirname, '../../..');
const workerEntries = ['smtcWorker', 'smtcCommandWorker', 'codexWorker', 'screenshotWorker'];

/** 构建产物中用于检查引用图的字段。 */
interface BuildChunk {
  name: string;
  isEntry: boolean;
  fileName: string;
  code: string;
  modules: Record<string, unknown>;
  imports: string[];
  dynamicImports: string[];
}

/**
 * 检查 Worker 的共享 chunk、外部引用及保留的 CommonJS 引用均不加载主入口。
 * @param chunks - 真实构建产物或用于验证检查器的恶意引用夹具。
 * @param outDir - 主进程输出目录的绝对路径。
 */
function assertWorkerIsolation(chunks: BuildChunk[], outDir: string): void {
  const byFile = new Map(chunks.map((chunk) => [chunk.fileName, chunk]));
  const mainOutput = resolve(outDir, chunks.find((chunk) => chunk.isEntry && chunk.name === 'index')?.fileName ?? 'index.js');
  workerEntries.forEach((name) => {
    const entry = chunks.find((chunk) => chunk.isEntry && chunk.name === name);
    expect(entry, `Missing worker entry ${name}`).toBeDefined();
    const pending = [entry!.fileName];
    const visited = new Set<string>();
    while (pending.length) {
      const file = pending.pop()!;
      if (visited.has(file)) continue;
      visited.add(file);
      const chunk = byFile.get(file)!;
      const loadsMain = Object.keys(chunk.modules).some((id) => id.replaceAll('\\', '/').split(/[?#]/)[0].endsWith('/src/main/index.ts'));
      expect(loadsMain, `${name} loads main-process code through ${file}`).toBe(false);
      const literals = Array.from(chunk.code.matchAll(/\b(?:require|import)\(\s*(['"])([^'"]+)\1\s*\)/g), (match) => match[2]);
      [...chunk.imports, ...chunk.dynamicImports, ...literals].forEach((reference) => {
        const [id] = (reference.startsWith('file:') ? fileURLToPath(reference) : reference).replaceAll('\\', '/').split(/[?#]/);
        const target = resolve(outDir, dirname(file), id);
        const reachesMain = id === 'src/main/index.ts' || id.endsWith('/src/main/index.ts') || target === mainOutput;
        expect(reachesMain, `${name} loads main-process code through external reference ${reference}`).toBe(false);
        const dependency = byFile.get(id) ?? byFile.get(relative(outDir, target).replaceAll('\\', '/'));
        if (dependency) pending.push(dependency.fileName);
      });
    }
  });
}

it.each(['production', 'development'])('%s worker bundles cannot reach the main-process entry', async (mode) => {
  const { config } = await resolveConfig({ mode, configFile: resolve(root, 'electron.vite.config.ts') }, 'build', mode);
  if (!config?.main) throw new Error('Missing Electron main build configuration');
  const mainConfig = { ...config.main };
  mainConfig.mode = mode;
  const result = await build({
    ...mainConfig,
    configFile: false,
    logLevel: 'silent',
    build: { ...config.main.build, write: false },
  });
  if (!('output' in result)) throw new Error('Expected one in-memory main build');
  const chunks = result.output.filter((output) => output.type === 'chunk');

  // 外部加载才能让 ffmpeg-static 的 __dirname 保持在实际安装目录。
  expect(chunks.some((chunk) => /require\(["']ffmpeg-static["']\)/.test(chunk.code))).toBe(true);
  expect(chunks.flatMap((chunk) => Object.keys(chunk.modules))
    .some((id) => id.replaceAll('\\', '/').includes('/node_modules/ffmpeg-static/'))).toBe(false);

  assertWorkerIsolation(chunks, resolve(root, config.main.build?.outDir ?? 'out/main'));
}, 30_000);

it.each([
  ['static', resolve(root, 'src/main/index.ts')],
  ['static', './index.js'],
  ['dynamic', '../main/index.js'],
  ['dynamic', pathToFileURL(resolve(root, 'src/main/index.ts')).href],
  ['commonjs', './index.js'],
])('rejects a %s external main entry reference: %s', (kind, reference) => {
  const chunks: BuildChunk[] = workerEntries.map((name) => ({
    name, isEntry: true, fileName: `${name}.js`, code: '', modules: {}, imports: [], dynamicImports: [],
  }));
  if (kind === 'static') chunks[0].imports.push(reference);
  else if (kind === 'dynamic') chunks[0].dynamicImports.push(reference);
  else chunks[0].code = `require(${JSON.stringify(reference)});`;
  expect(() => assertWorkerIsolation(chunks, resolve(root, 'out/main'))).toThrow('loads main-process code');
});
