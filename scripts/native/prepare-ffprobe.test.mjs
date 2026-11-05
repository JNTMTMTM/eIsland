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

/** @file prepare-ffprobe.test.mjs
 * @description 验证媒体资源来源摘要、目标架构和准备失败边界，不执行安装器。
 * @author 鸡哥
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { gzipSync } from 'node:zlib';
import { FFMPEG_RELEASE, FFPROBE_SHA256, prepareFfprobe, verifyArchitecture, verifyDigest } from './prepare-ffprobe.mjs';
/** 构造只用于格式检查的 PE 头，不执行该夹具。
 * @param machine - Windows PE 架构字段。
 * @returns 格式夹具。
 */
function pe(machine = 0x8664) {
  const bytes = Buffer.alloc(256);
  bytes.write('MZ'); bytes.writeUInt32LE(0x80, 0x3c); bytes.write('PE\0\0', 0x80, 'binary'); bytes.writeUInt16LE(machine, 0x84);
  return bytes;
}
/** 独立资源目录，在测试结束后清理自身夹具。
 * @param t - Node 测试上下文。
 * @param tag - 假的 FFmpeg metadata 固定标签。
 * @returns 假项目路径和输出位置。
 */
function fixture(t, tag = FFMPEG_RELEASE) {
  const root = mkdtempSync(join(tmpdir(), 'eisland-media-resource-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const packageDir = join(root, 'node_modules/ffmpeg-static'); mkdirSync(packageDir, { recursive: true });
  writeFileSync(join(packageDir, 'package.json'), JSON.stringify({ 'ffmpeg-static': { 'binary-release-tag': tag } }));
  return { root, ffmpeg: join(root, 'ffmpeg.exe'), stagingDirectory: join(root, 'cache'), override: '', architecture: 'x64' };
}

test('PE validation distinguishes x64, x86 and ARM without running fixtures', () => {
  ['x64', 'x86_64'].forEach((architecture) => verifyArchitecture(pe(), architecture));
  verifyArchitecture(pe(0xaa64), 'arm64'); verifyArchitecture(pe(0x14c), 'ia32');
  assert.throws(() => verifyArchitecture(pe(), 'arm64'), /mismatch/);
  assert.throws(() => verifyArchitecture(pe(), 'unknown'), /Unsupported/);
  assert.throws(() => verifyArchitecture(Buffer.from('short'), 'x64'), /not a PE/);
  const wrong = pe(); wrong.write('NO', 0x80); assert.throws(() => verifyArchitecture(wrong, 'x64'), /mismatch/);
  const overflow = pe(); overflow.writeUInt32LE(65535, 0x3c); assert.throws(() => verifyArchitecture(overflow, 'x64'), /mismatch/);
});
test('pinned digest rejects changed or truncated files', () => {
  assert.match(FFPROBE_SHA256, /^[a-f0-9]{64}$/u);
  const bytes = Buffer.from('fixture'); const digest = createHash('sha256').update(bytes).digest('hex');
  assert.equal(verifyDigest(bytes, digest), digest);
  assert.throws(() => verifyDigest(Buffer.from('tampered'), digest), /SHA256/);
  assert.throws(() => verifyDigest(bytes), /SHA256/);
});
test('unsupported architectures need an explicit native ffprobe binary', async (t) => {
  await assert.rejects(prepareFfprobe({ ...fixture(t), architecture: 'arm64' }), /FFPROBE_BIN/);
});
test('an FFmpeg version-pin change cannot silently reuse a mismatching ffprobe', async (t) => {
  await assert.rejects(prepareFfprobe(fixture(t, 'b99.0')), /matching ffprobe pin/);
});
test('download errors cannot publish a resource', async (t) => {
  const options = fixture(t);
  await assert.rejects(prepareFfprobe({ ...options, fetcher: () => Promise.resolve(new Response('', { status: 503 })) }), /503/);
  assert.equal(existsSync(join(options.root, 'src-tauri/resources/native/ffmpeg/ffprobe.exe')), false);
});
test('oversized downloads are rejected before decompression or execution', async (t) => {
  await assert.rejects(prepareFfprobe({ ...fixture(t), fetcher: () => Promise.resolve(new Response('', { headers: { 'Content-Length': String(65 * 1024 * 1024) } })) }), /exceeds limit/);
});
test('corrupt downloaded content never enters the cache or resource directory', async (t) => {
  const options = fixture(t);
  await assert.rejects(prepareFfprobe({ ...options, fetcher: () => Promise.resolve(new Response(gzipSync(pe()))) }), /SHA256/);
  assert.equal(existsSync(join(options.root, 'src-tauri/resources/native/ffmpeg/ffprobe.exe')), false);
  assert.equal(existsSync(join(options.stagingDirectory, 'eisland-media-tools', FFMPEG_RELEASE, 'ffprobe.exe')), false);
});
