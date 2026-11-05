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
 * @file test-signing.test.mjs
 * @description 验证 CI 临时签名身份隔离、无私钥输出与失败后的限定目录清理。
 * @author 鸡哥
 */
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { test } from 'node:test';
import withoutSigningSecrets from './environment.mjs';
import { cleanupTestSigning, prepareTestSigning } from './test-signing.mjs';

/** Create owned temporary fixture paths without any real signing key.
 * @param t - Node test lifecycle.
 * @returns Fixture root and environment.
 */
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'eisland-signing-contract-'));
  t.after(() => { assert(resolve(root).startsWith(resolve(tmpdir()) + sep)); rmSync(root, { recursive: true, force: true }); });
  return { root, env: { RUNNER_TEMP: root, GITHUB_ENV: join(root, 'github-env'), TAURI_SIGNING_PRIVATE_KEY: 'not-a-key', TAURI_SIGNING_PRIVATE_KEY_PATH: 'not-a-key-path', TAURI_SIGNING_PRIVATE_KEY_PASSWORD: 'not-a-password', TAURI_CONFIG: '{"identifier":"existing","plugins":{"updater":{"pubkey":"stale-public-value"}}}' } };
}

test('signing-secret stripping clones the input and retains only public configuration', () => {
  const env = { PATH: 'test', TAURI_UPDATER_PUBLIC_KEY: 'public', TAURI_SIGNING_PRIVATE_KEY: 'not-a-key', TAURI_SIGNING_PRIVATE_KEY_PATH: 'not-a-key-path', TAURI_SIGNING_PRIVATE_KEY_PASSWORD: 'not-a-password' };
  assert.deepEqual(withoutSigningSecrets(env), { PATH: 'test', TAURI_UPDATER_PUBLIC_KEY: 'public' });
  assert.equal(env.TAURI_SIGNING_PRIVATE_KEY, 'not-a-key');
});

test('CI preparation publishes only temporary paths and public key, then cleans its owned directory', (t) => {
  const f = fixture(t); const calls = [];
  const result = prepareTestSigning({ env: f.env, root: f.root, run: (binary, args, options) => {
    calls.push({ binary, args, options });
    const key = args.at(-1); writeFileSync(key, 'not-a-key'); writeFileSync(`${key}.pub`, Buffer.from('public-only-boundary').toString('base64')); return { status: 0 };
  } });
  const output = readFileSync(f.env.GITHUB_ENV, 'utf8');
  assert(output.includes(`TAURI_SIGNING_PRIVATE_KEY=${result.key}`)); assert(!output.includes('not-a-key'));
  assert.equal(calls[0].options.stdio, 'ignore'); assert.equal(calls[0].options.env.TAURI_SIGNING_PRIVATE_KEY, undefined);
  const config = JSON.parse(output.split('\n').find((line) => line.startsWith('TAURI_CONFIG=')).slice('TAURI_CONFIG='.length));
  assert.equal(config.identifier, 'com.pyisland.eisland.ci'); assert.equal(config.plugins.updater.requireSignedVersion, true); assert.notEqual(config.plugins.updater.pubkey, 'stale-public-value');
  cleanupTestSigning({ ...f.env, EISLAND_TEST_SIGNING_DIR: result.directory }); assert(!existsSync(result.directory));
});

test('failed test signer removes only its own temporary directory and requires CI output configuration', (t) => {
  const f = fixture(t);
  assert.throws(() => prepareTestSigning({ env: { RUNNER_TEMP: f.root }, run: () => assert.fail('must not start signer') }), /CI environment/);
  let directory;
  assert.throws(() => prepareTestSigning({ env: f.env, run: (_binary, args) => { directory = resolve(args.at(-1), '..'); return { status: 4 }; } }), /generation failed/);
  assert(!existsSync(directory));
  const userDirectory = join(f.root, 'user-files'); mkdirSync(userDirectory); writeFileSync(join(userDirectory, 'keep'), 'original');
  assert.throws(() => cleanupTestSigning({ ...f.env, EISLAND_TEST_SIGNING_DIR: userDirectory }), /Refusing/);
  assert.equal(readFileSync(join(userDirectory, 'keep'), 'utf8'), 'original'); cleanupTestSigning({});
});

test('cleanup rejects redirected temporary signing directories', (t) => {
  const f = fixture(t); const outside = mkdtempSync(join(tmpdir(), 'eisland-signing-outside-'));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  const link = join(f.root, 'eisland-updater-test-signing-link'); symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir');
  writeFileSync(join(outside, 'keep'), 'original');
  assert.throws(() => cleanupTestSigning({ ...f.env, EISLAND_TEST_SIGNING_DIR: link }), /redirected/);
  assert.equal(readFileSync(join(outside, 'keep'), 'utf8'), 'original');
});
