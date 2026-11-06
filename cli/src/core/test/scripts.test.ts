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
 * @file scripts.test.ts
 * @description 验证脚本读取、分组、名称解析、模糊建议与关键词过滤
 * @author 鸡哥
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { filterScripts, groupScripts, loadScripts, resolveScript } from '../scripts';

const root = mkdtempSync(join(tmpdir(), 'eisland-cli-scripts-'));
writeFileSync(join(root, 'package.json'), JSON.stringify({
  name: 'eisland',
  scripts: {
    dev: 'tauri dev',
    test: 'vitest run',
    'test:main': 'npm run test:rust',
    'plugin:build:smtc': 'cd smtc && npm run build',
    'plugin:build:wifi': 'cd wifi && npm run build',
    'release:upload': 'node upload.ts',
    'esa:purge-all': 'node purge.ts --purge-all',
    postinstall: 'npm ci --prefix cli --ignore-scripts',
  },
}));
const entries = loadScripts(root);

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe('loadScripts', () => {
  it('按声明顺序读取脚本并标记分组', () => {
    expect(entries.map((entry) => entry.name)).toEqual([
      'dev', 'test', 'test:main', 'plugin:build:smtc', 'plugin:build:wifi', 'release:upload', 'esa:purge-all', 'postinstall',
    ]);
    expect(entries.find((entry) => entry.name === 'plugin:build:smtc')?.group).toBe('plugin');
  });

  it('将发布上传与 CDN 清理标记为危险脚本', () => {
    expect(entries.filter((entry) => entry.dangerous).map((entry) => entry.name)).toEqual(['release:upload', 'esa:purge-all']);
  });

  it('隐藏 npm 生命周期脚本', () => {
    expect(entries.filter((entry) => entry.hidden).map((entry) => entry.name)).toEqual(['postinstall']);
  });

  it('发布别名与其生命周期保持危险标记，构建和发布说明不触发确认', () => {
    const releaseRoot = mkdtempSync(join(root, 'native-release-'));
    writeFileSync(join(releaseRoot, 'package.json'), JSON.stringify({ scripts: {
      package: 'node scripts/native/package-release.mjs',
      release: 'npm run package && npm run release:upload-only',
      'release:upload': 'npm run release',
      'release:upload-only': 'node native-upload.mjs',
      'release:upload-minio': 'node native-upload.mjs --minio',
      'release:notes': 'node release-notes.mjs',
      'release:uploadation': 'node unrelated.mjs',
      prerelease: 'node prepare-release.mjs',
      postrelease: 'node finish-release.mjs',
      prepackage: 'node prepare-package.mjs',
      preview: 'vite preview',
    } }));
    const releaseEntries = loadScripts(releaseRoot);
    expect(releaseEntries.filter((entry) => entry.dangerous).map((entry) => entry.name)).toEqual([
      'release', 'release:upload', 'release:upload-only', 'release:upload-minio', 'prerelease', 'postrelease',
    ]);
    expect(releaseEntries.filter((entry) => entry.hidden).map((entry) => entry.name)).toEqual([
      'prerelease', 'postrelease', 'prepackage',
    ]);
    expect([...groupScripts(releaseEntries).values()].flat().map((entry) => entry.name)).not.toContain('prerelease');
    expect(filterScripts(releaseEntries, 'release', () => '').map((entry) => entry.name)).not.toContain('postrelease');
    expect(resolveScript(releaseEntries, ['release'])).toMatchObject({ kind: 'found', entry: { name: 'release', dangerous: true } });
    expect(resolveScript(releaseEntries, ['prerelease'])).toMatchObject({ kind: 'found', entry: { hidden: true, dangerous: true } });
  });
});

describe('groupScripts', () => {
  it('按首段分组并排除隐藏脚本', () => {
    const groups = groupScripts(entries);
    expect([...groups.keys()]).toEqual(['dev', 'test', 'plugin', 'release', 'esa']);
    expect(groups.get('test')?.map((entry) => entry.name)).toEqual(['test', 'test:main']);
  });
});

describe('resolveScript', () => {
  it('以 : 拼接分段精确匹配', () => {
    expect(resolveScript(entries, ['plugin', 'build', 'smtc'])).toMatchObject({ kind: 'found', entry: { name: 'plugin:build:smtc' } });
  });

  it('接受完整脚本名', () => {
    expect(resolveScript(entries, ['test:main'])).toMatchObject({ kind: 'found', entry: { name: 'test:main' } });
  });

  it('仍可显式解析隐藏脚本', () => {
    expect(resolveScript(entries, ['postinstall'])).toMatchObject({ kind: 'found' });
  });

  it('分段不完整时返回前缀候选', () => {
    const result = resolveScript(entries, ['plugin', 'build']);
    expect(result.kind).toBe('prefix');
    expect(result.kind === 'prefix' && result.matches.map((entry) => entry.name)).toEqual(['plugin:build:smtc', 'plugin:build:wifi']);
  });

  it('拼写错误时给出相近建议', () => {
    expect(resolveScript(entries, ['tset', 'main'])).toEqual({ kind: 'unknown', suggestions: ['test:main'] });
  });

  it('差异过大时不给建议', () => {
    expect(resolveScript(entries, ['completely-unrelated'])).toEqual({ kind: 'unknown', suggestions: [] });
  });
});

describe('filterScripts', () => {
  const describe = (name: string): string => (name === 'dev' ? 'Start development mode' : '');

  it('空关键词返回全部可见脚本', () => {
    expect(filterScripts(entries, '', describe)).toHaveLength(7);
  });

  it('所有关键词需同时命中名称或说明且大小写不敏感', () => {
    expect(filterScripts(entries, 'BUILD wifi', describe).map((entry) => entry.name)).toEqual(['plugin:build:wifi']);
    expect(filterScripts(entries, 'development', describe).map((entry) => entry.name)).toEqual(['dev']);
  });
});
