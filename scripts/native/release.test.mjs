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
import packageRelease from './package-release.mjs';
import { packagePaired, uploadPaired } from './paired-release.mjs';
import { advertisedVersion, isNewerVersion, objectPrefix, purgePlan, uploadRelease, githubTarget, mirrorBase, mirrorKey } from './upload-release.mjs';

const version = '27.0.1';
const name = `eIsland_${version}_x64-setup.exe`;
const bytes = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(131072, 0x51)]);

/** 创建完全独立的仓库与安装包，不读取真实仓库的 .env。
 * @param t - Node 测试生命周期。
 * @param fixtureVersion - 此隔离发行版的版本。
 * @returns 临时仓库和发布配置。
 */
function fixture(t, fixtureVersion = version) {
  const root = mkdtempSync(join(tmpdir(), 'eisland-release-test-'));
  t.after(() => {
    assert.equal(dirname(root), resolve(tmpdir()));
    assert(root.startsWith(join(tmpdir(), 'eisland-release-test-')));
    rmSync(root, { recursive: true, force: true });
  });
  mkdirSync(join(root, 'src-tauri'), { recursive: true });
  writeFileSync(join(root, 'package.json'), JSON.stringify({ version: fixtureVersion, name: 'native-release-fixture' }));
  writeFileSync(join(root, 'src-tauri', 'tauri.conf.json'), JSON.stringify({ version: fixtureVersion }));
  writeFileSync(join(root, 'src-tauri', 'Cargo.toml'), `[package]\nname="native-release-fixture"\nversion="${fixtureVersion}"\nedition="2021"\n`);
  mkdirSync(join(root, 'src-tauri', 'src'));
  writeFileSync(join(root, 'src-tauri', 'src', 'main.rs'), 'fn main() {}\n');
  const dist = join(root, 'target/release/bundle/nsis');
  mkdirSync(dist, { recursive: true });
  const file = join(dist, `eIsland_${fixtureVersion}_x64-setup.exe`);
  writeFileSync(file, bytes);
  writeFileSync(`${file}.sig`, Buffer.from('adapter-boundary-signature-only').toString('base64'));
  writeFileSync(join(root, 'target/release/eisland.exe'), bytes);
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
  // 远端已有对象，键为 s3://bucket/key；默认为空，即各更新源尚无清单。
  const remote = new Map(); const removals = [];
  const run = (binary, args, options) => {
    const call = { binary, options, args: [...args], env: { ...options.env } };
    calls.push(call);
    if (args[0] === '--verify-update-artifact') return failure(call, { calls, uploads }) || { status: 0 };
    if (binary === 'gh') {
      const failed = failure(call, { calls, uploads }); if (failed) return failed;
      let stdout = '';
      if (args[0] === 'repo') stdout = JSON.stringify({ isPrivate: false });
      else if (args[1] === 'view') stdout = JSON.stringify({ isDraft: false, isPrerelease: false, tagName: `v${version}` });
      return { stdout, status: 0 };
    }
    assert.notEqual(binary, 'cargo', 'explicit --dist must not invoke Cargo');
    if (args[0] !== '--version') {
      assert(existsSync(call.env.AWS_CONFIG_FILE));
      assert(existsSync(call.env.AWS_SHARED_CREDENTIALS_FILE));
    }
    const failed = failure(call, { calls, uploads });
    if (failed) return failed;
    if (args[0] === 's3api') return remote.has(`s3://${args[3]}/${args[5]}`) ? { status: 0 } : { status: 254, stderr: 'An error occurred (404) when calling the HeadObject operation: Not Found' };
    if (args[0] === 's3' && args[1] === 'rm') { removals.push(args[2]); return { status: 0 }; }
    if (args[0] === 's3' && args[2].startsWith('s3://')) { writeFileSync(args[3], remote.get(args[2])); return { status: 0 }; }
    if (args[0] === 'configure') appendFileSync(call.env.AWS_CONFIG_FILE, `${args[2]}=${args[3]}\n`);
    if (args[0] === 's3') {
      const content = readFileSync(args[2]);
      uploads.push({ content, ...call, manifest: args[3].endsWith('/latest.json') ? JSON.parse(content) : null });
    }
    return { status: 0 };
  };
  return { run, calls, uploads, purges, logs, remote, removals, root: f.root, env: f.env, purge: async (plan) => { purges.push(plan); }, log: (line) => logs.push(line) };
}

/** 检查发布结束后每个临时 AWS 会话都已释放。
 * @param calls - 进程调用记录。
 */
function closedSessions(calls) {
  calls.filter((call) => !['--version', '--verify-update-artifact'].includes(call.args[0]) && call.binary !== 'gh').forEach((call) => {
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
  const artifact = await releaseArtifact(f.root, { dist: f.dist }, {}, boundaries(f).run);
  assert.equal(artifact.size, bytes.length);
  assert.equal(artifact.sha512, createHash('sha512').update(bytes).digest('base64'));
  assert.equal(artifact.name, name);
  assert.equal(artifact.notes, 'Fixture native release notes.');
  assert.equal(artifact.file, f.file);
  const manifest = nativeManifest(artifact, 'https://downloads.example.test/eisland-update/tauri');
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
  assert.equal(boundary.calls.filter((call) => call.args[0] !== '--verify-update-artifact').length, 0);
  assert.equal(boundary.purges.length, 0);
});

test('explicit target directory wins over CARGO_TARGET_DIR and --dist remains compatible', (t) => {
  const f = fixture(t); const noCargo = () => assert.fail('explicit target must not invoke Cargo');
  assert.equal(installerDirectory(f.root, { targetDir: 'explicit' }, { CARGO_TARGET_DIR: 'other' }, noCargo), join(f.root, 'src-tauri', 'explicit', 'release', 'bundle', 'nsis'));
  assert.equal(installerDirectory(f.root, {}, { CARGO_TARGET_DIR: join(f.root, 'environment-target') }, noCargo), join(f.root, 'environment-target', 'release', 'bundle', 'nsis'));
  assert.equal(installerDirectory(f.root, { dist: f.dist }, { CARGO_TARGET_DIR: 'other' }, noCargo), f.dist);
  assert.deepEqual(releaseOptions(['-d', 'native-dist', '--minio-only', '--dry-run']), { dryRun: true, minioOnly: true, r2Only: false, help: false, dist: 'native-dist' });
  assert.equal(releaseOptions(['--r2-only']).r2Only, true);
  assert.throws(() => releaseOptions(['--r2-only', '--minio-only']), /either/);
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
  assert.equal(boundary.calls.filter((call) => call.args[0] !== '--verify-update-artifact').length, 0);
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
    assert.equal(uploads.length, 4);
    uploads.forEach((call) => { assert.equal(call.args[call.args.indexOf('--endpoint-url') + 1], target.endpoint); assert.equal(call.args[call.args.indexOf('--region') + 1], target.region); });
    assert.equal(uploads[0].args[uploads[0].args.indexOf('--content-type') + 1], 'application/vnd.microsoft.portable-executable');
    assert.equal(uploads[1].args[uploads[1].args.indexOf('--content-type') + 1], 'text/plain; charset=utf-8');
    assert.equal(uploads[2].args[uploads[2].args.indexOf('--content-type') + 1], 'application/json');
    assert.equal(uploads[2].args[uploads[2].args.indexOf('--cache-control') + 1], 'no-cache, no-store, must-revalidate');
  });
  assert.equal(boundary.purges.length, 1);
  closedSessions(boundary.calls);
});

test('all mirror installers precede every manifest and manifest bytes match the real installer', async (t) => {
  const f = fixture(t); minio(f.env); const boundary = boundaries(f);
  const plan = await uploadRelease(f.args, boundary);
  assert.equal(boundary.uploads.length, 12);
  assert(boundary.uploads.slice(0, 6).every((call) => !call.manifest));
  assert(boundary.uploads.slice(6).every((call) => call.manifest));
  boundary.uploads.slice(0, 6).filter((call) => call.args[3].endsWith('.exe')).forEach((call) => assert.deepEqual(call.content, bytes));
  boundary.uploads.slice(6).forEach((call) => {
    const artifact = call.manifest.platforms['windows-x86_64'];
    assert.equal(artifact.sha512, createHash('sha512').update(bytes).digest('base64'));
    assert.equal(artifact.size, bytes.length);
    assert.equal(call.manifest.version, version);
    const manifestUrl = `https://example.test/${plan.manifestKey}`;
    assert(new URL(artifact.url, manifestUrl).pathname.endsWith(`/${plan.installerKey}`));
    assert.equal(artifact.signature, readFileSync(`${f.file}.sig`, 'utf8'));
  });
  assert.equal(boundary.purges.length, 1);
  closedSessions(boundary.calls);
});

test('a feed advertising a newer version stops publication before any upload', async (t) => {
  const f = fixture(t); const boundary = boundaries(f);
  boundary.remote.set('s3://fixture-oss/tauri/latest.json', JSON.stringify({ version: '99.0.0' }));
  await assert.rejects(uploadRelease(f.args, boundary), /Refusing to replace oss tauri\/latest\.json \(99\.0\.0\) with older/);
  assert.equal(boundary.uploads.length, 0); assert.equal(boundary.purges.length, 0); closedSessions(boundary.calls);
  assert.equal(isNewerVersion('v27.0.10', '27.0.9'), true);
  assert.equal(isNewerVersion('27.0.2', '27.0.2'), false);
  assert.equal(advertisedVersion('version: 26.4.0\npath: setup.exe\n', 'latest.yml'), '26.4.0');
  assert.throws(() => advertisedVersion('{}', 'latest.json'), /Cannot read the version/);
});

test('a failed feed write restores every feed already written across destinations', async (t) => {
  const f = fixture(t); const previous = JSON.stringify({ version: '1.0.0' });
  const boundary = boundaries(f, (call) => call.args[0] === 's3' && call.args[1] === 'cp' && call.args[3] === 's3://fixture-oss/eisland-update/tauri/latest.json' ? { status: 6 } : null);
  boundary.remote.set('s3://fixture-cos/eisland-update/tauri/latest.json', previous);
  await assert.rejects(uploadRelease(f.args, boundary), /command failed.*restored to their previous state/);
  const restored = boundary.uploads.filter((upload) => upload.args[3] === 's3://fixture-cos/eisland-update/tauri/latest.json');
  assert.equal(restored.length, 2); assert.equal(restored[1].content.toString(), previous);
  assert.deepEqual(boundary.removals, ['s3://fixture-oss/eisland-update/tauri/latest.json', 's3://fixture-cos/tauri/latest.json']);
  assert.equal(boundary.purges.length, 0); closedSessions(boundary.calls);
});

[1, 2].forEach((position) => {
  test(`installer failure on mirror ${position} prevents all manifests and CDN purge`, async (t) => {
    const f = fixture(t); let installers = 0;
    const boundary = boundaries(f, (call) => call.args[0] === 's3' && call.args[3].endsWith('.exe') && ++installers === position ? { status: 7 } : null);
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
  assert.equal(manifestFailure.uploads.filter((call) => !call.manifest).length, 4);
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
  boundary.calls.filter((call) => !['--version', '--verify-update-artifact'].includes(call.args[0]) && call.binary !== 'gh').forEach((call) => {
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
  assert.equal(boundary.calls.filter((call) => call.args[0] !== '--verify-update-artifact').length, 0); assert.equal(boundary.purges.length, 0);
  assert(!existsSync(join(f.root, 'tauri-latest.json')));
  assert.equal(await uploadRelease(['--help'], boundary), null);
  assert.equal(boundary.calls.filter((call) => call.args[0] !== '--verify-update-artifact').length, 0);
});

test('ESA legacy latest.yml URL selects native manifest and matching installer without credentials in URLs', (t) => {
  const f = fixture(t);
  const plan = purgePlan(f.env, 'tauri', name);
  assert.equal(plan.siteId, 123);
  assert.deepEqual(plan.files, [`https://cdn.example.test/eisland-update/tauri/latest.json`, `https://cdn.example.test/eisland-update/tauri/${name}`, `https://cdn.example.test/eisland-update/tauri/${name}.sig`]);
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
  assert.equal(boundary.uploads.length, 4); assert.equal(boundary.purges.length, 0);
  const config = Object.fromEntries(boundary.calls.filter((call) => call.args[0] === 'configure').map((call) => [call.args[2], call.args[3]]));
  assert.equal(config['default.s3.addressing_style'], 'path'); assert.equal(config['default.s3.multipart_threshold'], '8MB');
  assert(boundary.uploads.every((call) => call.args[call.args.indexOf('--region') + 1] === 'us-east-1'));
  const incomplete = { ...f.env }; delete incomplete.MINIO_SECRET_KEY;
  assert.throws(() => uploadTargets(incomplete, true), /MINIO_SECRET_KEY/);
  closedSessions(boundary.calls);
});

test('AWS discovery failure stops before session creation, upload or purge', async (t) => {
  const f = fixture(t); const boundary = boundaries(f, (call) => call.args[0] === '--verify-update-artifact' ? null : ({ status: null, error: new Error('fixture binary missing') }));
  await assert.rejects(uploadRelease(f.args, boundary), /AWS CLI v2 not found/);
  assert(boundary.calls.every((call) => ['--version', '--verify-update-artifact'].includes(call.args[0])));
  assert.equal(boundary.uploads.length, 0); assert.equal(boundary.purges.length, 0);
  assert.throws(() => resolveAws({ AWS_CLI_PATH: join(f.root, 'missing-aws') }, () => ({ status: 1 })), /AWS CLI v2 not found/);
});

test('package and release command contract uses canonical native scripts', () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.package, 'node scripts/native/package-release.mjs');
  const wrapper = readFileSync(join(root, 'scripts/native/package-release.mjs'), 'utf8');
  assert.match(wrapper, /build-native\.mjs/); assert.match(wrapper, /'build', '--bundles', 'nsis'/);
  assert.equal(pkg.scripts.release, 'npm run package && npm run release:upload-only');
  assert.equal(pkg.scripts['release:upload-only'], 'node scripts/native/upload-release.mjs');
  assert.equal(pkg.scripts['release:upload-minio'], 'node scripts/native/upload-release.mjs --minio-only');
  Object.entries(pkg.scripts).forEach(([script, command]) => { assert(!script.includes(':tauri')); assert(!command.includes(':tauri')); assert(!/electron-builder|electron-vite|upload-release-to-cos-oss\.ts/.test(command)); });
});

test('missing, malformed and rejected updater signatures fail before any AWS operation', async (t) => {
  const f = fixture(t); const boundary = boundaries(f);
  rmSync(`${f.file}.sig`);
  await assert.rejects(uploadRelease(f.args, boundary), /Missing Tauri updater signature/);
  writeFileSync(`${f.file}.sig`, 'not base64!');
  await assert.rejects(uploadRelease(f.args, boundary), /signature encoding/);
  writeFileSync(`${f.file}.sig`, Buffer.from('adapter-only').toString('base64'));
  const rejected = boundaries(f, (call) => call.args[0] === '--verify-update-artifact' ? { status: 1 } : null);
  await assert.rejects(uploadRelease(f.args, rejected), /signature rejected/);
  assert(rejected.calls.every((call) => call.args[0] === '--verify-update-artifact'));
  assert.equal(rejected.uploads.length, 0);
});

test('signature upload failure prevents every manifest and ESA purge', async (t) => {
  const f = fixture(t);
  const boundary = boundaries(f, (call) => call.args[0] === 's3' && call.args[3].endsWith('.sig') ? { status: 8 } : null);
  await assert.rejects(uploadRelease(f.args, boundary), /command failed/);
  assert(boundary.uploads.every((upload) => !upload.manifest)); assert.equal(boundary.purges.length, 0);
  closedSessions(boundary.calls);
});

test('R2 requires a complete explicit public configuration and uploads signed immutable artifacts first', async (t) => {
  const f = fixture(t); Object.assign(f.env, { R2_ENDPOINT: 'https://account.r2.cloudflarestorage.com' });
  assert.throws(() => uploadTargets(f.env, false, true), /R2_ACCESS_KEY_ID/);
  Object.assign(f.env, { R2_ACCESS_KEY_ID: 'fixture-r2-id', R2_SECRET_ACCESS_KEY: 'fixture-r2-secret', R2_BUCKET_NAME: 'fixture-r2', R2_PUBLIC_BASE_URL: 'https://public.example.test' });
  const boundary = boundaries(f); const plan = await uploadRelease([...f.args, '--r2-only'], boundary);
  assert.equal(plan.installerKey, `eisland-update/tauri/${name}`);
  assert.deepEqual(plan.legacyManifestKeys, ['tauri/latest.json']);
  assert.equal(boundary.uploads.length, 4);
  assert(boundary.uploads.slice(0, 2).every((upload) => !upload.manifest));
  const r2 = boundary.uploads.filter((upload) => upload.args[3].startsWith('s3://fixture-r2/'));
  assert(r2.some((upload) => upload.args[3] === 's3://fixture-r2/tauri/latest.json'));
  assert.equal(r2[2].manifest.platforms['windows-x86_64'].url, `https://public.example.test/eisland-update/tauri/${name}`);
  assert.equal(r2[0].env.AWS_DEFAULT_PROFILE, undefined);
  closedSessions(boundary.calls);
});

test('bridge discovery is required only for CI R2 publication and keeps the explicit operator override', async (t) => {
  const f = fixture(t, '27.0.2'); const local = boundaries(f);
  await uploadRelease(f.args, local);
  assert.deepEqual(uploadTargets(f.env).map((target) => target.provider), ['cos', 'oss']);
  assert.equal(local.uploads.length, 8); closedSessions(local.calls);
  Object.assign(f.env, { R2_ENDPOINT: 'https://account.r2.cloudflarestorage.com', R2_ACCESS_KEY_ID: 'fixture-r2-id', R2_SECRET_ACCESS_KEY: 'fixture-r2-secret', R2_BUCKET_NAME: 'fixture-r2', R2_PUBLIC_BASE_URL: 'https://public.example.test', EISLAND_TAURI_LEGACY_UPLOAD_PREFIXES: '' });
  await assert.rejects(uploadRelease([...f.args, '--r2-only'], boundaries(f)), /requires the tauri\/latest.json alias/);
  const skipped = boundaries(f);
  await uploadRelease([...f.args, '--r2-only', '--skip-legacy-bridge'], skipped);
  assert.equal(skipped.uploads.length, 3); closedSessions(skipped.calls);
  delete f.env.EISLAND_TAURI_LEGACY_UPLOAD_PREFIXES;
  const enabled = boundaries(f); await uploadRelease([...f.args, '--r2-only'], enabled);
  assert.equal(enabled.uploads.length, 4);
  assert(enabled.uploads.some((upload) => upload.args[3] === 's3://fixture-r2/tauri/latest.json'));
  assert(enabled.uploads.slice(0, 2).every((upload) => !upload.manifest)); closedSessions(enabled.calls);
});

test('GitHub stays disabled by default and refuses creation or draft publication', async (t) => {
  const f = fixture(t); assert.equal(githubTarget(f.env, version), null);
  Object.assign(f.env, { EISLAND_GITHUB_RELEASE_UPLOAD: '1', GITHUB_REPOSITORY: 'owner/repo', EISLAND_GITHUB_RELEASE_TAG: `v${version}` });
  const adapter = githubTarget(f.env, version);
  assert.throws(() => adapter.preflight((_binary, args) => ({ status: 0, stdout: JSON.stringify(args[0] === 'repo' ? { isPrivate: false } : { isDraft: true, isPrerelease: false, tagName: `v${version}` }) }), f.env), /already be published/);
  assert.throws(() => githubTarget({ ...f.env, EISLAND_GITHUB_RELEASE_TAG: 'v0.0.0' }, version), /does not match/);
  const calls = []; adapter.preflight((binary, args) => { calls.push(args); return { status: 0, stdout: JSON.stringify(args[0] === 'repo' ? { isPrivate: false } : { isDraft: false, isPrerelease: false, tagName: `v${version}` }) }; }, f.env);
  adapter.upload((_binary, args) => { calls.push(args); return { status: 0 }; }, f.env, [f.file, `${f.file}.sig`]);
  assert(calls.every((args) => args[0] === 'repo' || (args[0] === 'release' && ['view', 'upload'].includes(args[1]))));
  assert.throws(() => adapter.preflight(() => ({ status: 0, stdout: JSON.stringify({ isPrivate: true }) }), f.env), /public repository/);
  assert.throws(() => adapter.preflight((_binary, args) => ({ status: 0, stdout: JSON.stringify(args[0] === 'repo' ? { isPrivate: false } : { isDraft: false, isPrerelease: false, tagName: args[2] === '--repo' ? 'v99.0.0' : `v${version}` }) }), f.env), /GitHub latest is v99\.0\.0/);
  assert(!calls.some((args) => args.includes('create')));
});

test('package requires signing configuration before building and uses official version-bound signing', async (t) => {
  const f = fixture(t); const calls = [];
  await assert.rejects(packageRelease({ root: f.root, env: {}, run: () => assert.fail('missing keys must not build') }), /TAURI_SIGNING_PRIVATE_KEY/);
  const cliDirectory = join(f.root, 'node_modules/@tauri-apps/cli'); mkdirSync(cliDirectory, { recursive: true });
  writeFileSync(join(cliDirectory, 'package.json'), JSON.stringify({ version: '2.12.4', bin: { tauri: 'tauri.js' } }));
  const env = { CARGO_TARGET_DIR: join(f.root, 'target'), TAURI_SIGNING_PRIVATE_KEY: 'invalid-build-boundary-fixture', TAURI_UPDATER_PUBLIC_KEY: 'public-build-boundary-fixture' };
  const result = await packageRelease({ env, root: f.root, run: (binary, args, options) => { calls.push({ binary, args, options }); return { status: 0 }; } });
  assert.equal(calls.length, 3); assert(calls[0].args[0].endsWith('build-native.mjs')); assert.deepEqual(calls[1].args.slice(1, 5), ['build', '--bundles', 'nsis', '--config']);
  const config = JSON.parse(calls[1].options.env.TAURI_CONFIG);
  assert.deepEqual(JSON.parse(calls[1].args[5]), config);
  assert.equal(config.plugins.updater.requireSignedVersion, true); assert.equal(config.bundle.createUpdaterArtifacts, true);
  assert(calls.every((call) => !call.args.some((arg) => arg.includes(env.TAURI_SIGNING_PRIVATE_KEY))));
  assert.equal(calls[2].options.env.TAURI_SIGNING_PRIVATE_KEY, undefined);
  assert(existsSync(result.manifest)); assert(existsSync(result.signature));
});

test('GitHub payload failures stop all manifest writes across every selected destination', async (t) => {
  const f = fixture(t); Object.assign(f.env, { EISLAND_GITHUB_RELEASE_UPLOAD: '1', GITHUB_REPOSITORY: 'owner/repo', EISLAND_GITHUB_RELEASE_TAG: `v${version}` });
  Object.assign(f.env, { R2_ENDPOINT: 'https://fixture.r2.cloudflarestorage.com', R2_ACCESS_KEY_ID: 'fixture', R2_SECRET_ACCESS_KEY: 'fixture', R2_BUCKET_NAME: 'fixture-r2', R2_PUBLIC_BASE_URL: 'https://public.example.test' });
  const failure = boundaries(f, (call) => call.binary === 'gh' && call.args[1] === 'upload' ? { status: 5 } : null);
  await assert.rejects(uploadRelease([...f.args, '--r2-only'], failure), /GitHub existing Release operation failed/);
  assert(failure.uploads.every((upload) => !upload.manifest)); assert.equal(failure.purges.length, 0); closedSessions(failure.calls);
  const success = boundaries(f); await uploadRelease([...f.args, '--r2-only'], success);
  const githubPayload = success.calls.findIndex((call) => call.binary === 'gh' && call.args[1] === 'upload' && call.args.some((arg) => arg.endsWith('.sig')));
  const firstManifest = success.calls.findIndex((call) => call.args[0] === 's3' && call.args[3].endsWith('/latest.json'));
  assert(githubPayload >= 0 && githubPayload < firstManifest);
  const githubFeed = success.calls.find((call) => call.binary === 'gh' && call.args[1] === 'upload' && call.args.some((arg) => arg.endsWith('tauri-latest.json')));
  assert(githubFeed); assert.equal(success.purges.length, 0); closedSessions(success.calls);
});

/** 为原生发布 fixture 补齐同版本助手及公开信任配置。
 * @param f - 隔离发布 fixture。
 * @returns 助手文件路径。
 */
function companionFixture(f) {
  const releaseVersion = JSON.parse(readFileSync(join(f.root, 'package.json'), 'utf8')).version;
  const directory = join(f.root, 'temp/app/dist');
  mkdirSync(directory, { recursive: true });
  const installer = `eIsland-${releaseVersion}-Setup.exe`;
  const sha512 = createHash('sha512').update(bytes).digest('base64');
  const key = Buffer.from(`untrusted comment: fixture public key\n${Buffer.alloc(42).toString('base64')}\n`).toString('base64');
  writeFileSync(join(directory, installer), bytes);
  writeFileSync(join(directory, `${installer}.blockmap`), 'fixture blockmap');
  writeFileSync(join(directory, 'latest.yml'), `version: ${releaseVersion}\npath: ${installer}\nsha512: ${sha512}\nfiles:\n  - url: ${installer}\n    sha512: ${sha512}\n    size: ${bytes.length}\n`);
  writeFileSync(join(directory, 'adapter-build.json'), JSON.stringify({ sha512, version: releaseVersion, appId: 'com.eisland.app', publicKey: key }));
  Object.assign(f.env, { TAURI_UPDATER_PUBLIC_KEY: key, R2_ENDPOINT: 'https://fixture.r2.cloudflarestorage.com', R2_ACCESS_KEY_ID: 'fixture', R2_SECRET_ACCESS_KEY: 'fixture', R2_BUCKET_NAME: 'fixture-r2', R2_PUBLIC_BASE_URL: 'https://pub-4c1e73c3c2004901aecd6ca014cb16bd.r2.dev' });
  return { directory, installer };
}

test('paired release uploads both payloads before either feed and uses one GitHub release', async (t) => {
  const f = fixture(t); const adapter = companionFixture(f);
  Object.assign(f.env, { EISLAND_GITHUB_RELEASE_UPLOAD: '1', GITHUB_REPOSITORY: 'owner/repo', EISLAND_GITHUB_RELEASE_TAG: `v${version}` });
  const boundary = boundaries(f);
  const plan = await uploadPaired([...f.args, '--r2-only'], boundary);
  assert.equal(plan.adapterVersion, version);
  assert.equal(plan.tauriManifestKey, 'eisland-update/tauri/tauri-latest.yml');
  const firstFeed = boundary.uploads.findIndex((upload) => /\.(?:json|yml)$/.test(upload.args[3]));
  assert.equal(firstFeed, 6);
  assert(boundary.uploads.slice(0, firstFeed).some((upload) => upload.args[3].endsWith(adapter.installer)));
  const nativeFeed = boundary.uploads.find((upload) => upload.args[3].endsWith('/tauri-latest.yml'));
  assert.equal(JSON.parse(nativeFeed.content).version, version);
  const github = boundary.calls.filter((call) => call.binary === 'gh' && call.args[1] === 'upload');
  assert(github[0].args.includes(join(adapter.directory, adapter.installer)));
  assert(github[0].args.includes(f.file));
  assert(github.some((call) => call.args.some((arg) => arg.endsWith('tauri-latest.yml'))));
  assert(github.at(-1).args.includes(join(adapter.directory, 'latest.yml')));
  assert(github.every((call) => call.args[2] === `v${version}`));
  assert.equal(boundary.purges.length, 0);
  closedSessions(boundary.calls);
});

test('paired release rejects version or key mismatch and missing files before any upload', async (t) => {
  const f = fixture(t); const adapter = companionFixture(f); const boundary = boundaries(f);
  const metadata = join(adapter.directory, 'adapter-build.json');
  const original = JSON.parse(readFileSync(metadata, 'utf8'));
  writeFileSync(metadata, JSON.stringify({ ...original, version: '0.0.0' }));
  await assert.rejects(uploadPaired(f.args, boundary), /identity, version or public key/);
  writeFileSync(metadata, JSON.stringify({ ...original, publicKey: 'wrong key' }));
  await assert.rejects(uploadPaired(f.args, boundary), /identity, version or public key/);
  writeFileSync(metadata, JSON.stringify(original));
  rmSync(join(adapter.directory, adapter.installer));
  await assert.rejects(uploadPaired(f.args, boundary), /ENOENT/);
  assert.equal(boundary.calls.length, 0);
});

test('paired adapter upload failure leaves both update feeds untouched', async (t) => {
  const f = fixture(t); const adapter = companionFixture(f);
  const boundary = boundaries(f, (call) => call.args[0] === 's3' && call.args[3].endsWith(adapter.installer) ? { status: 9 } : null);
  await assert.rejects(uploadPaired(f.args, boundary), /command failed/);
  assert(boundary.uploads.every((upload) => !/\.(?:json|yml)$/.test(upload.args[3])));
  assert.equal(boundary.purges.length, 0);
  closedSessions(boundary.calls);
});

test('paired dry-run performs no remote writes and packaging isolates signing secrets', async (t) => {
  const f = fixture(t); companionFixture(f); const boundary = boundaries(f);
  await uploadPaired([...f.args, '--dry-run'], boundary);
  assert.equal(boundary.uploads.length, 0);
  assert.equal(boundary.purges.length, 0);
  const env = { ...f.env, npm_execpath: 'fixture-npm.cjs', TAURI_SIGNING_PRIVATE_KEY: 'fixture-private', TAURI_SIGNING_PRIVATE_KEY_PASSWORD: 'fixture-password' };
  let built = false;
  await packagePaired({ env, root: f.root, packageNative: async (input) => {
    assert.equal(input.env.TAURI_SIGNING_PRIVATE_KEY, env.TAURI_SIGNING_PRIVATE_KEY);
    return { installer: f.file };
  }, run: (_binary, args, options) => {
    built = true;
    assert.deepEqual(args, ['fixture-npm.cjs', 'run', 'package']);
    assert.equal(options.env.TAURI_SIGNING_PRIVATE_KEY, undefined);
    assert.equal(options.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD, undefined);
    assert.equal(options.env.TAURI_UPDATER_PUBLIC_KEY, f.env.TAURI_UPDATER_PUBLIC_KEY);
    return { status: 0 };
  } });
  assert(built);
});

test('local paired publication needs no R2 credentials and only updates COS, OSS, MinIO and ESA', async (t) => {
  const f = fixture(t, '27.0.2'); companionFixture(f); minio(f.env);
  Object.keys(f.env).filter((key) => key.startsWith('R2_')).forEach((key) => { delete f.env[key]; });
  Object.assign(f.env, { R2_ENDPOINT: 'unused-incomplete-ci-configuration', EISLAND_GITHUB_RELEASE_UPLOAD: '1' });
  const boundary = boundaries(f);
  const plan = await uploadPaired(f.args, boundary);
  assert.deepEqual(plan.targets.map((target) => target.provider), ['cos', 'oss', 'minio']);
  assert.equal(plan.github, null);
  assert(!boundary.calls.some((call) => call.binary === 'gh'));
  assert(boundary.uploads.every((upload) => /^s3:\/\/fixture-(?:cos|oss|minio)\//.test(upload.args[3])));
  assert.equal(boundary.purges.length, 1);
  assert(boundary.purges[0].files.some((url) => url.endsWith('/tauri-latest.yml')));
  assert(boundary.purges[0].files.some((url) => url.endsWith('/latest.yml')));
  const firstFeed = boundary.uploads.findIndex((upload) => /\.(?:json|yml)$/.test(upload.args[3]));
  assert(firstFeed > 0);
  assert(boundary.uploads.slice(firstFeed).every((upload) => /\.(?:json|yml)$/.test(upload.args[3])));
  closedSessions(boundary.calls);
});

test('CI publishes both applications to R2 and one GitHub release without local mirror credentials', async (t) => {
  const f = fixture(t); const adapter = companionFixture(f);
  const required = ['TAURI_UPDATER_PUBLIC_KEY', 'R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_BASE_URL'];
  f.env = Object.fromEntries(required.map((key) => [key, f.env[key]]));
  Object.assign(f.env, { EISLAND_GITHUB_RELEASE_UPLOAD: '1', GITHUB_REPOSITORY: 'owner/repo', EISLAND_GITHUB_RELEASE_TAG: `v${version}` });
  const boundary = boundaries(f);
  const plan = await uploadPaired([...f.args, '--r2-only'], boundary);
  assert.deepEqual(plan.targets, [{ provider: 'r2', bucket: 'fixture-r2' }]);
  assert.equal(boundary.purges.length, 0);
  assert(boundary.uploads.every((upload) => upload.args[3].startsWith('s3://fixture-r2/')));
  const nativeFeed = boundary.uploads.findIndex((upload) => upload.args[3].endsWith('/tauri-latest.yml'));
  const legacyFeed = boundary.uploads.findIndex((upload) => upload.args[3] === 's3://fixture-r2/latest.yml');
  assert(nativeFeed >= 0 && legacyFeed > nativeFeed);
  assert(boundary.calls.some((call) => call.binary === 'gh' && call.args.includes(f.file) && call.args.includes(join(adapter.directory, adapter.installer))));
  assert.throws(() => uploadTargets({}, false, true), /R2_ENDPOINT/);
  closedSessions(boundary.calls);
});

test('MinIO uses the existing ESA HTTPS endpoint and never duplicates the bucket in object keys', async (t) => {
  const f = fixture(t); companionFixture(f); minio(f.env);
  Object.assign(f.env, { MINIO_ENDPOINT: 'http://minio.internal:29000', MINIO_BUCKET: 'eisland-update' });
  const boundary = boundaries(f);
  await uploadPaired([...f.args, '--minio-only'], boundary);
  const manifest = boundary.uploads.find((upload) => upload.args[3] === 's3://eisland-update/tauri/tauri-latest.yml');
  assert(manifest);
  assert.equal(JSON.parse(manifest.content).platforms['windows-x86_64'].url, `https://cdn.example.test/eisland-update/tauri/${name}`);
  assert(boundary.uploads.some((upload) => upload.args[3] === `s3://eisland-update/tauri/${name}`));
  assert(!boundary.uploads.some((upload) => upload.args[3].includes('/eisland-update/eisland-update/')));
  assert(boundary.uploads.some((upload) => upload.args[3] === 's3://eisland-update/latest.yml'));
  const target = { provider: 'minio', bucket: 'eisland-update', endpoint: f.env.MINIO_ENDPOINT };
  assert.equal(mirrorBase(target, f.env, 'eisland-update/tauri'), 'https://cdn.example.test/eisland-update/tauri');
  assert.equal(mirrorKey({ ...target, provider: 'r2' }, 'eisland-update/tauri/latest.json'), 'eisland-update/tauri/latest.json');
  assert.equal(mirrorKey(target, 'eisland-update-other/file'), 'eisland-update-other/file');
  closedSessions(boundary.calls);
});
