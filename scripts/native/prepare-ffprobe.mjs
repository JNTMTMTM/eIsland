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

/** @file prepare-ffprobe.mjs
 * @description 准备与现有 FFmpeg 同版本的固定来源 ffprobe，并校验摘要和 PE 架构。
 * @author 鸡哥
 */
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';

export const FFMPEG_RELEASE = 'b6.1.1';
export const FFPROBE_SHA256 = '3a7e2dc003dc2cd1472827e4c7c4f056ae1ae0ae7c5bbc580c99b49827351ba4';
const upstream = `https://github.com/eugeneware/ffmpeg-static/releases/download/${FFMPEG_RELEASE}/ffprobe-win32-x64.gz`;
const machines = { x64: 0x8664, x86_64: 0x8664, arm64: 0xaa64, aarch64: 0xaa64, ia32: 0x14c, x86: 0x14c };
/** 校验可执行文件确为目标架构，不将 x64 工具静默打入 ARM/x86 包。
 * @param bytes - PE 文件内容。
 * @param architecture - Tauri/Node 目标架构。
 * @returns PE 检查成功时无返回值。
 */
export function verifyArchitecture(bytes, architecture) {
  const machine = machines[architecture];
  if (!machine) throw new Error(`Unsupported media tool architecture: ${architecture}`);
  if (bytes.length < 64 || bytes.toString('ascii', 0, 2) !== 'MZ') throw new Error('ffprobe is not a PE executable');
  const offset = bytes.readUInt32LE(0x3c);
  if (offset + 6 > bytes.length || bytes.toString('binary', offset, offset + 4) !== 'PE\0\0' || bytes.readUInt16LE(offset + 4) !== machine) throw new Error(`ffprobe architecture mismatch: ${architecture}`);
}
/** 验证固定下载内容摘要，篡改与截断都不得写入资源目录。
 * @param bytes - 完整工具内容。
 * @param expected - 固定上游构建的 SHA256。
 * @returns 验证成功的摘要。
 */
export function verifyDigest(bytes, expected = FFPROBE_SHA256) {
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (digest !== expected) throw new Error('ffprobe SHA256 mismatch');
  return digest;
}
/** 从受控来源或显式离线工具准备 ffprobe；不搜索全局 PATH。
 * @param options - 媒体资源准备输入。
 * @param options.root - 本地工程根目录。
 * @param options.ffmpeg - 已准备的 FFmpeg 路径。
 * @param options.architecture - 目标 CPU 架构。
 * @param options.override - 显式离线 ffprobe 路径。
 * @param options.fetcher - 有限下载边界，供本地夹具替换。
 * @param options.stagingDirectory - 当前构建使用的缓存目录。
 * @returns 已准备工具的绝对路径。
 */
export async function prepareFfprobe({ root, ffmpeg, architecture = process.arch, override = process.env.FFPROBE_BIN, fetcher = fetch, stagingDirectory = process.env.EISLAND_NATIVE_STAGING_DIR || tmpdir() }) {
  const output = resolve(root, 'src-tauri/resources/native/ffmpeg/ffprobe.exe');
  const pinned = readFileSync(resolve(root, 'node_modules/ffmpeg-static/package.json'), 'utf8');
  const tag = JSON.parse(pinned)['ffmpeg-static']['binary-release-tag'];
  if (tag !== FFMPEG_RELEASE && !override) throw new Error(`FFmpeg ${tag} needs a matching ffprobe pin or explicit FFPROBE_BIN`);
  let source = override;
  if (!source) {
    if (!['x64', 'x86_64'].includes(architecture)) throw new Error(`No pinned ffprobe for ${architecture}; set FFPROBE_BIN to a matching native build`);
    source = resolve(stagingDirectory, 'eisland-media-tools', FFMPEG_RELEASE, 'ffprobe.exe');
    if (!existsSync(source)) {
      const response = await fetcher(upstream, { signal: AbortSignal.timeout(120000) });
      if (!response.ok) throw new Error(`ffprobe download failed: ${response.status}`);
      if (Number(response.headers.get('content-length') || 0) > 64 * 1024 * 1024) throw new Error('ffprobe archive exceeds limit');
      const chunks = []; let size = 0;
      // eslint-disable-next-line no-restricted-syntax -- 流式计数必须逐块停止，避免超限响应先整体分配内存。
      for await (const chunk of response.body) { size += chunk.byteLength; if (size > 64 * 1024 * 1024) throw new Error('ffprobe archive exceeds limit'); chunks.push(chunk); }
      const bytes = gunzipSync(Buffer.concat(chunks), { maxOutputLength: 128 * 1024 * 1024 });
      verifyDigest(bytes); verifyArchitecture(bytes, architecture);
      mkdirSync(dirname(source), { recursive: true });
      const temporary = `${source}.${randomUUID()}.tmp`;
      try { writeFileSync(temporary, bytes); renameSync(temporary, source); } finally { rmSync(temporary, { force: true }); }
    }
  }
  const bytes = readFileSync(source);
  verifyArchitecture(bytes, architecture);
  if (!override) verifyDigest(bytes);
  const version = (binary, name) => {
    const text = execFileSync(binary, ['-version'], { encoding: 'utf8', windowsHide: true, timeout: 15000, maxBuffer: 65536 });
    const value = text.match(new RegExp(`${name} version (?:n)?(\\d+)\\.`))?.[1];
    if (!value) throw new Error(`Cannot determine ${name} major version`);
    return value;
  };
  if (version(source, 'ffprobe') !== version(ffmpeg, 'ffmpeg')) throw new Error('FFmpeg/ffprobe major version mismatch');
  mkdirSync(dirname(output), { recursive: true });
  if (resolve(source).toLowerCase() !== output.toLowerCase()) copyFileSync(source, output);
  const license = resolve(root, 'src-tauri/resources/native/ffmpeg/ffmpeg.LICENSE');
  if (existsSync(license)) copyFileSync(license, resolve(dirname(output), 'ffprobe.LICENSE'));
  writeFileSync(resolve(dirname(output), 'ffprobe-provenance.json'), `${JSON.stringify({ architecture, release: tag, source: override ? 'explicit FFPROBE_BIN' : upstream, sha256: createHash('sha256').update(bytes).digest('hex') }, null, 2)}\n`);
  return output;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const ffmpeg = process.env.FFMPEG_BIN || resolve(root, 'src-tauri/resources/native/ffmpeg/ffmpeg.exe');
  await prepareFfprobe({ root, ffmpeg, architecture: process.env.TAURI_ENV_ARCH || process.arch });
  console.log('Bundled ffprobe prepared and verified');
}
