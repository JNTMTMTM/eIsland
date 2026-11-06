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
 * @file test-signing.mjs
 * @description 在 CI 临时目录生成隔离更新测试签名身份并安全清理，不用于正式发布。
 * @author 鸡哥
 */
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import withoutSigningSecrets from './environment.mjs';
import { projectRoot } from './release-artifacts.mjs';

/** Remove only an owned temporary signing directory inside the configured runner temp root.
 * @param env - CI environment containing the generated directory.
 */
export function cleanupTestSigning(env = process.env) {
  if (!env.EISLAND_TEST_SIGNING_DIR) return;
  const root = realpathSync(env.RUNNER_TEMP || tmpdir());
  const directory = resolve(env.EISLAND_TEST_SIGNING_DIR);
  const prefix = `${root}${sep}`.toLowerCase();
  if (!directory.toLowerCase().startsWith(prefix) || !basename(directory).startsWith('eisland-updater-test-signing-')) throw new Error('Refusing test-signing cleanup outside the owned temporary directory');
  if (existsSync(directory)) {
    if (!realpathSync(directory).toLowerCase().startsWith(prefix)) throw new Error('Refusing redirected test-signing cleanup');
    rmSync(directory, { recursive: true, force: true });
  }
}
/** Generate a fresh test-only key without returning or printing any private key contents.
 * @param dependencies - Local CLI/file boundaries.
 * @returns Owned temporary directory and public configuration paths.
 */
export function prepareTestSigning(dependencies = {}) {
  const env = dependencies.env || process.env; const root = dependencies.root || projectRoot; const run = dependencies.run || spawnSync;
  if (!env.GITHUB_ENV) throw new Error('Test-signing prepare requires a CI environment output file');
  const directory = mkdtempSync(join(env.RUNNER_TEMP || tmpdir(), 'eisland-updater-test-signing-'));
  const key = join(directory, 'test.key');
  try {
    const generated = run(process.execPath, [join(root, 'node_modules/@tauri-apps/cli/tauri.js'), 'signer', 'generate', '--ci', '--write-keys', key], { env: { ...withoutSigningSecrets(env), CI: 'true' }, windowsHide: true, stdio: 'ignore', timeout: 30000 });
    if (generated.error || generated.status !== 0) throw new Error('Temporary test signing identity generation failed');
    const pubkey = readFileSync(`${key}.pub`, 'utf8').trim();
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(pubkey)) throw new Error('Temporary test public-key format is invalid');
    const config = JSON.parse(env.TAURI_CONFIG || '{}');
    config.identifier = env.EISLAND_TEST_IDENTIFIER || 'com.pyisland.eisland.ci';
    const updater = { ...config.plugins?.updater }; delete updater.pubkey;
    config.plugins = { ...config.plugins, updater: { pubkey, ...updater, requireSignedVersion: true } };
    const values = { TAURI_SIGNING_PRIVATE_KEY: key, TAURI_SIGNING_PRIVATE_KEY_PASSWORD: '', TAURI_UPDATER_PUBLIC_KEY: pubkey, TAURI_CONFIG: JSON.stringify(config), EISLAND_TEST_SIGNING_DIR: directory };
    appendFileSync(env.GITHUB_ENV, `${Object.entries(values).map(([name, value]) => `${name}=${value}`).join('\n')}\n`);
    return { directory, key, publicKeyFile: `${key}.pub` };
  } catch (error) { cleanupTestSigning({ ...env, EISLAND_TEST_SIGNING_DIR: directory }); throw error; }
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    if (process.argv[2] === 'prepare') { prepareTestSigning(); console.log('Temporary test-only updater signing identity prepared.'); }
    else if (process.argv[2] === 'cleanup') cleanupTestSigning();
    else throw new Error('Usage: node scripts/native/test-signing.mjs prepare|cleanup');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
