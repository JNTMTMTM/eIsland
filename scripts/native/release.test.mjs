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
 * @file release.test.mjs
 * @description 使用真实临时安装包与隔离 AWS、ESA 边界验证原生发布顺序、失败与配置契约。
 * @author 鸡哥
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadEnvFile, resolveAws, uploadTargets } from './aws-upload.mjs';
import { installerDirectory, nativeManifest, releaseArtifact, releaseOptions } from './release-artifacts.mjs';
import { objectPrefix, purgePlan, uploadRelease } from './upload-release.mjs';

const version = '27.0.1';
const name = `eIsland_${version}_x64-setup.exe`;
const bytes = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(131072, 0x51)]);

/** 创建完全独立的仓库与安装包，不读取真实仓库的 .env。
 * @param t - Node 测试生命周期。
 * @returns 临时仓库和发布配置。
 */
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'eisland-release-test-'));
  t.after(() => {
    assert.equal(dirname(root), resolve(tmpdir()));
    assert(root.startsWith(join(tmpdir(), 'eisland-release-test-')));
    rmSync(root, { recursive: true, force: true });
  });
  mkdirSync(join(root, 'src-tauri'), { recursive: true });
  writeFileSync(join(root, 'package.json'), JSON.stringify({ version, name: 'native-release-fixture' }));
  writeFileSync(join(root, 'src-tauri', 'tauri.conf.json'), JSON.stringify({ version }));
  writeFileSync(join(root, 'src-tauri', 'Cargo.toml'), '[package]\nname="native-release-fixture"\nversion="27.0.1"\nedition="2021"\n');
  mkdirSync(join(root, 'src-tauri', 'src'));
  writeFileSync(join(root, 'src-tauri', 'src', 'main.rs'), 'fn main() {}\n');
  const dist = join(root, 'native-dist');
  mkdirSync(dist);
  const file = join(dist, name);
  writeFileSync(file, bytes);
  writeFileSync(join(root, 'RELEASE_NOTES.md'), 'Fixture native release notes.');
  const env = {
    COS_REGION: 'ap-fixture', COS_BUCKET_NAME: 'fixture-cos', COS_SECRET_ID: 'fixture-cos-id', COS_SECRET_KEY: 'fixture-cos-secret',
    OSS_REGION: 'fixture', OSS_BUCKET_NAME: 'fixture-oss', OSS_ACCESS_KEY_ID: 'fixture-oss-id', OSS_ACCESS_KEY_SECRET: 'fixture-oss-secret',
    ESA_ACCESS_KEY_ID: 'fixture-esa-id', ESA_ACCESS_KEY_SECRET: 'fixture-esa-secret', ESA_ZONE_ID: '123',
    ESA_PURGE_URL: 'https://cdn.example.test/eisland-update/latest.yml',
  };
  return { root, dist, file, env, args: ['--dist', dist] };
}

/** 只模拟进程与 CDN 边界，真实读取此次发布文件并模拟写入临时 AWS 配置。
 * @param f - 临时发布仓库。
 * @param failure - 可选的进程失败边界。
 * @returns 可注入的发布依赖与调用记录。
 */
function boundaries(f, failure = () => null) {
  const calls = []; const uploads = []; const purges = []; const logs = [];
  const run = (binary, args, options) => {
    const call = { binary, options, args: [...args], env: { ...options.env } };
    calls.push(call);
    assert.notEqual(binary, 'cargo', 'explicit --dist must not invoke Cargo');
    if (args[0] !== '--version') {
      assert(existsSync(call.env.AWS_CONFIG_FILE));
      assert(existsSync(call.env.AWS_SHARED_CREDENTIALS_FILE));
    }
    const failed = failure(call, { calls, uploads });
    if (failed) return failed;
    if (args[0] === 'configure') appendFileSync(call.env.AWS_CONFIG_FILE, `${args[2]}=${args[3]}\n`);
    if (args[0] === 's3') {
      const content = readFileSync(args[2]);
      uploads.push({ content, ...call, manifest: args[3].endsWith('/latest.json') ? JSON.parse(content) : null });
    }
    return { status: 0 };
  };
  return { run, calls, uploads, purges, logs, root: f.root, env: f.env, purge: async (plan) => { purges.push(plan); }, log: (line) => logs.push(line) };
}

/** 检查发布结束后每个临时 AWS 会话都已释放。
 * @param calls - 进程调用记录。
 */
function closedSessions(calls) {
  calls.filter((call) => call.args[0] !== '--version').forEach((call) => {
    assert(!existsSync(call.env.AWS_CONFIG_FILE), 'temporary AWS config must be removed');
    assert(!existsSync(call.env.AWS_SHARED_CREDENTIALS_FILE), 'temporary credentials must be removed');
  });
}

/** 添加可选的 MinIO 目标。
 * @param env - 仅用于本次测试的环境。
 */
function minio(env) {
  Object.assign(env, { MINIO_ENDPOINT: 'https://minio.example.test:9000', MINIO_ACCESS_KEY: 'fixture-minio-id', MINIO_SECRET_KEY: 'fixture-minio-secret', MINIO_BUCKET: 'fixture-minio' });
}

test('native artifact uses real MZ bytes, streamed SHA-512 and matching stable versions', async (t) => {
  const f = fixture(t);
  const artifact = await releaseArtifact(f.root, { dist: f.dist }, {}, () => assert.fail('unexpected process'));
  assert.equal(artifact.size, bytes.length);
  assert.equal(artifact.sha512, createHash('sha512').update(bytes).digest('base64'));
  assert.equal(artifact.name, name);
  assert.equal(artifact.notes, 'Fixture native release notes.');
  assert.equal(artifact.file, f.file);
  const manifest = nativeManifest(artifact);
  assert.equal(manifest.runtime, 'tauri');
  assert.equal(manifest.platforms['windows-x86_64'].sha512, artifact.sha512);
  assert.equal(manifest.platforms['windows-x86_64'].format, 'nsis');
  const absolute = nativeManifest(artifact, 'https://downloads.example.test/tauri');
  assert.equal(absolute.platforms['windows-x86_64'].url, `https://downloads.example.test/tauri/${name}`);
  ['http://example.test', 'https://user:password@example.test', 'https://example.test/path?signature=value'].forEach((url) => assert.throws(() => nativeManifest(artifact, url), /plain HTTPS/));
});

test('invalid bytes, unsupported sizes and version mismatch stop before AWS or ESA', async (t) => {
  const f = fixture(t); const boundary = boundaries(f);
  writeFileSync(f.file, 'not a Windows executable');
  await assert.rejects(uploadRelease(f.args, boundary), /Windows executable/);
  writeFileSync(f.file, 'M');
  await assert.rejects(uploadRelease(f.args, boundary), /installer size/);
  writeFileSync(f.file, bytes);
  writeFileSync(join(f.root, 'src-tauri', 'tauri.conf.json'), JSON.stringify({ version: '27.0.2' }));
  await assert.rejects(uploadRelease(f.args, boundary), /versions must match/);
  writeFileSync(join(f.root, 'package.json'), JSON.stringify({ version: '27.0.1-beta' }));
  writeFileSync(join(f.root, 'src-tauri', 'tauri.conf.json'), JSON.stringify({ version: '27.0.1-beta' }));
  await assert.rejects(uploadRelease(f.args, boundary), /stable x.y.z/);
  assert.equal(boundary.calls.length, 0);
  assert.equal(boundary.purges.length, 0);
});

test('explicit target directory wins over CARGO_TARGET_DIR and --dist remains compatible', (t) => {
  const f = fixture(t); const noCargo = () => assert.fail('explicit target must not invoke Cargo');
  assert.equal(installerDirectory(f.root, { targetDir: 'explicit' }, { CARGO_TARGET_DIR: 'other' }, noCargo), join(f.root, 'src-tauri', 'explicit', 'release', 'bundle', 'nsis'));
  assert.equal(installerDirectory(f.root, {}, { CARGO_TARGET_DIR: join(f.root, 'environment-target') }, noCargo), join(f.root, 'environment-target', 'release', 'bundle', 'nsis'));
  assert.equal(installerDirectory(f.root, { dist: 'native-dist' }, { CARGO_TARGET_DIR: 'other' }, noCargo), f.dist);
  assert.deepEqual(releaseOptions(['-d', 'native-dist', '--minio-only', '--dry-run']), { dryRun: true, minioOnly: true, help: false, dist: 'native-dist' });
  assert.throws(() => releaseOptions(['--target-dir', 'one', '--dist', 'two']), /either/);
  assert.throws(() => releaseOptions(['--target-dir']), /requires a directory/);
  assert.throws(() => releaseOptions(['--typo']), /Unknown release option/);
});

test('Cargo metadata is the config parser and process failure cannot select a guessed build', (t) => {
  const f = fixture(t); const target = join(f.root, 'cargo-config-target'); let calls = 0;
  const run = (binary, args, options) => {
    calls += 1;
    assert.equal(binary, 'cargo');
    assert.deepEqual(args.slice(0, 5), ['metadata', '--no-deps', '--format-version', '1', '--offline']);
    assert.equal(options.cwd, join(f.root, 'src-tauri'));
    assert.equal(args.at(-1), join(f.root, 'src-tauri', 'Cargo.toml'));
    return { status: 0, stdout: JSON.stringify({ target_directory: target }) };
  };
  assert.equal(installerDirectory(f.root, {}, {}, run), join(target, 'release', 'bundle', 'nsis'));
  assert.equal(calls, 1);
  assert.throws(() => installerDirectory(f.root, {}, {}, () => ({ status: 1 })), /Cannot resolve Cargo/);
  assert.throws(() => installerDirectory(f.root, {}, {}, () => ({ status: 0, stdout: '{"target_directory":"relative"}' })), /invalid target/);
});

test('real Cargo config target-dir is respected without builds or dependencies', (t) => {
  const available = spawnSync('cargo', ['--version'], { stdio: 'ignore', windowsHide: true });
  if (available.error || available.status !== 0) { t.skip('Cargo is not installed; metadata boundary is covered separately'); return; }
  const f = fixture(t); const target = join(f.root, 'configured-output');
  mkdirSync(join(f.root, 'src-tauri', '.cargo'));
  writeFileSync(join(f.root, 'src-tauri', '.cargo', 'config.toml'), `[build]\ntarget-dir = "${target.replaceAll('\\', '/')}"\n`);
  const env = { ...process.env }; delete env.CARGO_TARGET_DIR;
  assert.equal(installerDirectory(f.root, {}, env, spawnSync), join(target, 'release', 'bundle', 'nsis'));
  assert(!existsSync(join(target, 'release')), 'metadata must not compile an installer');
});

test('.env fills only missing variables and uploadRelease leaves caller environment unchanged', async (t) => {
  const f = fixture(t);
  writeFileSync(join(f.root, '.env'), '# test only\nCOS_BUCKET_NAME=wrong-bucket\nEXISTING_EMPTY=replacement\nNEW_VALUE="hello=world"\nSINGLE=\'quoted\'\n');
  const env = { COS_BUCKET_NAME: 'existing-bucket', EXISTING_EMPTY: '' };
  loadEnvFile(join(f.root, '.env'), env);
  assert.deepEqual(env, { COS_BUCKET_NAME: 'existing-bucket', EXISTING_EMPTY: '', NEW_VALUE: 'hello=world', SINGLE: 'quoted' });
  const before = { ...f.env }; const boundary = boundaries(f);
  const plan = await uploadRelease([...f.args, '--dry-run'], boundary);
  assert.equal(plan.targets[0].bucket, f.env.COS_BUCKET_NAME);
  assert.deepEqual(f.env, before);
  assert.equal(boundary.calls.length, 0);
});

test('COS and OSS preserve endpoint, credentials, checksum and multipart transport options', async (t) => {
  const f = fixture(t); const boundary = boundaries(f);
  await uploadRelease(f.args, boundary);
  const expected = [
    { bucket: 'fixture-cos', endpoint: 'https://cos.ap-fixture.myqcloud.com', region: 'ap-fixture', id: 'fixture-cos-id', secret: 'fixture-cos-secret' },
    { bucket: 'fixture-oss', endpoint: 'https://oss-fixture.aliyuncs.com', region: 'fixture', id: 'fixture-oss-id', secret: 'fixture-oss-secret' },
  ];
  expected.forEach((target) => {
    const calls = boundary.calls.filter((call) => call.env.AWS_ACCESS_KEY_ID === target.id);
    const config = Object.fromEntries(calls.filter((call) => call.args[0] === 'configure').map((call) => [call.args[2], call.args[3]]));
    assert.deepEqual(config, { 'default.s3.addressing_style': 'virtual', 'default.s3.payload_signing_enabled': 'false', 'default.s3.multipart_threshold': '5GB', 'default.s3.multipart_chunksize': '8MB', 'default.request_checksum_calculation': 'when_required', 'default.response_checksum_validation': 'when_required' });
    calls.forEach((call) => {
      assert.equal(call.env.AWS_SECRET_ACCESS_KEY, target.secret);
      assert.equal(call.env.AWS_REQUEST_CHECKSUM_CALCULATION, 'WHEN_REQUIRED');
      assert.equal(call.env.AWS_RESPONSE_CHECKSUM_VALIDATION, 'WHEN_REQUIRED');
      assert.equal(call.options.windowsHide, true);
    });
    const uploads = boundary.uploads.filter((call) => call.args[3].startsWith(`s3://${target.bucket}/`));
    assert.equal(uploads.length, 2);
    uploads.forEach((call) => { assert.equal(call.args[call.args.indexOf('--endpoint-url') + 1], target.endpoint); assert.equal(call.args[call.args.indexOf('--region') + 1], target.region); });
    assert.equal(uploads[0].args[uploads[0].args.indexOf('--content-type') + 1], 'application/vnd.microsoft.portable-executable');
    assert.equal(uploads[1].args[uploads[1].args.indexOf('--content-type') + 1], 'application/json');
    assert.equal(uploads[1].args[uploads[1].args.indexOf('--cache-control') + 1], 'no-cache, no-store, must-revalidate');
  });
  assert.equal(boundary.purges.length, 1);
  closedSessions(boundary.calls);
});

test('all mirror installers precede every manifest and manifest bytes match the real installer', async (t) => {
  const f = fixture(t); minio(f.env); const boundary = boundaries(f);
  const plan = await uploadRelease(f.args, boundary);
  assert.equal(boundary.uploads.length, 6);
  assert(boundary.uploads.slice(0, 3).every((call) => !call.manifest));
  assert(boundary.uploads.slice(3).every((call) => call.manifest));
  boundary.uploads.slice(0, 3).forEach((call) => assert.deepEqual(call.content, bytes));
  boundary.uploads.slice(3).forEach((call) => {
    const artifact = call.manifest.platforms['windows-x86_64'];
    assert.equal(artifact.sha512, createHash('sha512').update(bytes).digest('base64'));
    assert.equal(artifact.size, bytes.length);
    assert.equal(call.manifest.version, version);
    const manifestUrl = `https://example.test/${plan.manifestKey}`;
    assert.equal(new URL(artifact.url, manifestUrl).pathname, `/${plan.installerKey}`);
  });
  assert.equal(boundary.purges.length, 1);
  closedSessions(boundary.calls);
});

[1, 2].forEach((position) => {
  test(`installer failure on mirror ${position} prevents all manifests and CDN purge`, async (t) => {
    const f = fixture(t); let installers = 0;
    const boundary = boundaries(f, (call) => call.args[0] === 's3' && !call.args[3].endsWith('/latest.json') && ++installers === position ? { status: 7 } : null);
    await assert.rejects(uploadRelease(f.args, boundary), /AWS .* command failed/);
    assert(boundary.uploads.every((call) => !call.manifest));
    assert.equal(boundary.purges.length, 0);
    closedSessions(boundary.calls);
  });
});

test('terminated and spawn-error AWS operations stop publication and clean temporary credentials', async (t) => {
  const f = fixture(t);
  await Promise.all([{ status: null, signal: 'SIGTERM' }, { status: null, error: new Error('fixture process killed') }].map(async (result) => {
    const boundary = boundaries(f, (call) => call.args[0] === 's3' ? result : null);
    await assert.rejects(uploadRelease(f.args, boundary), /command failed.*terminated/);
    assert.equal(boundary.uploads.length, 0); assert.equal(boundary.purges.length, 0);
    closedSessions(boundary.calls);
  }));
});

test('configuration and manifest failures do not continue publication or trigger purge', async (t) => {
  const f = fixture(t);
  const configFailure = boundaries(f, (call) => call.args[0] === 'configure' && call.env.AWS_ACCESS_KEY_ID === 'fixture-oss-id' ? { status: 9 } : null);
  await assert.rejects(uploadRelease(f.args, configFailure), /AWS oss command failed/);
  assert.equal(configFailure.uploads.length, 0); assert.equal(configFailure.purges.length, 0); closedSessions(configFailure.calls);
  const manifestFailure = boundaries(f, (call) => call.args[0] === 's3' && call.args[3].endsWith('/latest.json') ? { status: 4 } : null);
  await assert.rejects(uploadRelease(f.args, manifestFailure), /command failed/);
  assert.equal(manifestFailure.uploads.filter((call) => !call.manifest).length, 2);
  assert.equal(manifestFailure.uploads.filter((call) => call.manifest).length, 0);
  assert.equal(manifestFailure.purges.length, 0); closedSessions(manifestFailure.calls);
});

test('AWS configuration is isolated from existing config, profiles and session credentials', async (t) => {
  const f = fixture(t);
  const existingConfig = join(f.root, 'existing-aws-config'); const existingCredentials = join(f.root, 'existing-aws-credentials');
  writeFileSync(existingConfig, 'original user configuration'); writeFileSync(existingCredentials, 'original user credentials');
  Object.assign(f.env, { AWS_CONFIG_FILE: existingConfig, AWS_SHARED_CREDENTIALS_FILE: existingCredentials, AWS_PROFILE: 'existing-profile', AWS_DEFAULT_PROFILE: 'default-profile', AWS_SESSION_TOKEN: 'fixture-session-token', AWS_SECURITY_TOKEN: 'fixture-security-token' });
  const before = { ...f.env }; const boundary = boundaries(f);
  await uploadRelease(f.args, boundary);
  assert.equal(readFileSync(existingConfig, 'utf8'), 'original user configuration');
  assert.equal(readFileSync(existingCredentials, 'utf8'), 'original user credentials');
  assert.deepEqual(f.env, before);
  boundary.calls.filter((call) => call.args[0] !== '--version').forEach((call) => {
    assert.notEqual(call.env.AWS_CONFIG_FILE, existingConfig);
    assert.notEqual(call.env.AWS_SHARED_CREDENTIALS_FILE, existingCredentials);
    ['AWS_PROFILE', 'AWS_DEFAULT_PROFILE', 'AWS_SESSION_TOKEN', 'AWS_SECURITY_TOKEN'].forEach((key) => assert.equal(call.env[key], undefined));
  });
  assert.equal(new Set(boundary.uploads.map((call) => call.env.AWS_CONFIG_FILE)).size, 2);
  closedSessions(boundary.calls);
});

test('dry-run and help invoke no AWS process, write no manifest and perform no purge', async (t) => {
  const f = fixture(t); const boundary = boundaries(f);
  const plan = await uploadRelease([...f.args, '--dry-run'], boundary);
  assert.equal(plan.manifest.runtime, 'tauri');
  assert.equal(boundary.calls.length, 0); assert.equal(boundary.purges.length, 0);
  assert(!existsSync(join(f.root, 'tauri-latest.json')));
  assert.equal(await uploadRelease(['--help'], boundary), null);
  assert.equal(boundary.calls.length, 0);
});

test('ESA legacy latest.yml URL selects native manifest and matching installer without credentials in URLs', (t) => {
  const f = fixture(t);
  const plan = purgePlan(f.env, 'tauri', name);
  assert.equal(plan.siteId, 123);
  assert.deepEqual(plan.files, [`https://cdn.example.test/eisland-update/tauri/latest.json`, `https://cdn.example.test/eisland-update/tauri/${name}`]);
  assert.deepEqual(purgePlan({ ...f.env, ESA_PURGE_URL: 'https://cdn.example.test/eisland-update' }, 'tauri', name).files, plan.files);
  assert.deepEqual(purgePlan({ ...f.env, ESA_PURGE_URL: plan.files[0] }, 'tauri', name).files, plan.files);
  const explicit = purgePlan({ ...f.env, EISLAND_TAURI_UPDATE_ESA_URL: 'https://other.example.test/native/latest.json' }, 'tauri', name);
  assert.equal(explicit.files[0], 'https://other.example.test/native/latest.json');
  assert.throws(() => purgePlan({ ...f.env, ESA_ZONE_ID: 'not-numeric' }, 'tauri', name), /positive integer/);
  assert.throws(() => purgePlan({ ...f.env, EISLAND_TAURI_UPDATE_ESA_URL: 'http://cdn.example.test/latest.json' }, 'tauri', name), /plain HTTPS/);
  ['../outside', 'tauri/../outside', 'tauri//nested'].forEach((prefix) => assert.throws(() => objectPrefix(prefix), /Invalid native upload prefix/));
});

test('optional MinIO retains path addressing and minio-only needs no COS, OSS or ESA configuration', async (t) => {
  const f = fixture(t); f.env = {}; minio(f.env);
  const boundary = boundaries(f);
  const plan = await uploadRelease([...f.args, '--minio-only'], boundary);
  assert.deepEqual(plan.targets, [{ provider: 'minio', bucket: 'fixture-minio' }]);
  assert.equal(boundary.uploads.length, 2); assert.equal(boundary.purges.length, 0);
  const config = Object.fromEntries(boundary.calls.filter((call) => call.args[0] === 'configure').map((call) => [call.args[2], call.args[3]]));
  assert.equal(config['default.s3.addressing_style'], 'path'); assert.equal(config['default.s3.multipart_threshold'], '8MB');
  assert(boundary.uploads.every((call) => call.args[call.args.indexOf('--region') + 1] === 'us-east-1'));
  const incomplete = { ...f.env }; delete incomplete.MINIO_SECRET_KEY;
  assert.throws(() => uploadTargets(incomplete, true), /MINIO_SECRET_KEY/);
  closedSessions(boundary.calls);
});

test('AWS discovery failure stops before session creation, upload or purge', async (t) => {
  const f = fixture(t); const boundary = boundaries(f, () => ({ status: null, error: new Error('fixture binary missing') }));
  await assert.rejects(uploadRelease(f.args, boundary), /AWS CLI v2 not found/);
  assert(boundary.calls.every((call) => call.args[0] === '--version'));
  assert.equal(boundary.uploads.length, 0); assert.equal(boundary.purges.length, 0);
  assert.throws(() => resolveAws({ AWS_CLI_PATH: join(f.root, 'missing-aws') }, () => ({ status: 1 })), /AWS CLI v2 not found/);
});

test('package and release command contract uses canonical native scripts', () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert.match(pkg.scripts.package, /plugins:build/); assert.match(pkg.scripts.package, /tauri build/);
  assert.equal(pkg.scripts.release, 'npm run package && npm run release:upload-only');
  assert.equal(pkg.scripts['release:upload-only'], 'node scripts/native/upload-release.mjs');
  assert.equal(pkg.scripts['release:upload-minio'], 'node scripts/native/upload-release.mjs --minio-only');
  Object.entries(pkg.scripts).forEach(([script, command]) => { assert(!script.includes(':tauri')); assert(!command.includes(':tauri')); assert(!/electron-builder|electron-vite|upload-release-to-cos-oss\.ts/.test(command)); });
});
