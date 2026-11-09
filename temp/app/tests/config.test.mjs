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
 * @file config.test.mjs
 * @description 验证开发和构建共用根环境公钥，且不把文件中的私钥注入进程环境。
 * @author 鸡哥
 */
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { publicKey } from '../scripts/config.mjs';

const directories = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

it('loads the public key from the root environment file without exporting signing secrets', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'adapter-config-')); directories.push(directory);
  const file = join(directory, '.env');
  await writeFile(file, "TAURI_UPDATER_PUBLIC_KEY='  fixture-public-key  '\nTAURI_SIGNING_PRIVATE_KEY=fixture-private-key\nTAURI_SIGNING_PRIVATE_KEY_PASSWORD=fixture-password\n");
  const env = {};
  const privateKey = process.env.TAURI_SIGNING_PRIVATE_KEY;
  const password = process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD;
  expect(publicKey(env, file)).toBe('fixture-public-key');
  expect(env).toEqual({});
  expect(process.env.TAURI_SIGNING_PRIVATE_KEY).toBe(privateKey);
  expect(process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD).toBe(password);
});

it('prefers the CI environment public key over the local environment file', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'adapter-config-ci-')); directories.push(directory);
  const file = join(directory, '.env');
  await writeFile(file, 'TAURI_UPDATER_PUBLIC_KEY=local-public-key\n');
  expect(publicKey({ TAURI_UPDATER_PUBLIC_KEY: 'ci-public-key' }, file)).toBe('ci-public-key');
});
