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
 * @file windows-native.spec.ts
 * @description 在真实原生插件构建中验证图标、SMTC、音量与亮度的 preload/IPC 链路。
 * @author 鸡哥
 */

import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { test, expect } from './fixtures';

const execFileAsync = promisify(execFile);

/**
 * 独立调用真实 EXE，区分设备不可用与启动失败、异常 JSON 或 IPC 回退。
 * @param plugin - 音量或亮度插件名。
 * @param executable - 插件可执行文件名。
 * @returns 设备查询的原始结果；设备不可用时为 null。
 */
async function probeDevice(plugin: string, executable: string): Promise<Record<string, unknown> | null> {
  const { stdout } = await execFileAsync(resolve(`plugins/windows/eisland-windows-${plugin}-helper/src/bin/Release/net10.0/${executable}.exe`), ['get'], {
    windowsHide: true, timeout: 10_000,
  });
  const result = JSON.parse(stdout) as Record<string, unknown> | null;
  if (result !== null) expect(result).not.toHaveProperty('error');
  return result;
}

test.skip(process.platform !== 'win32', 'Requires Windows native plugins.');
test.beforeEach(async ({ desktop }) => {
  const native = await desktop.app.evaluate(({ app }) => app.commandLine.getSwitchValue('eisland-e2e-native'));
  test.skip(native !== '1', 'Build with npm run build:e2e:windows to load real native helpers.');
  // 缺失 helper 属于构建失败，不能被误报为 runner 没有硬件而跳过。
  await Promise.all([
    access(resolve('plugins/windows/eisland-windows-volume-helper/src/bin/Release/net10.0/eIslandVolumeHelper.exe')),
    access(resolve('plugins/windows/eisland-windows-brightness-helper/src/bin/Release/net10.0/eIslandBrightnessReader.exe')),
  ]);
});

test('extracts an executable icon through the real native DLL and IPC', async ({ desktop }) => {
  const executable = resolve('e2e/fixtures/icon-probe/bin/Release/net10.0/IconProbe.exe');
  await access(executable);
  const icon = await desktop.main.evaluate((path) => window.api.getFileIcon(path), executable);
  expect(icon).toBeTruthy();
  const bytes = Buffer.from(icon!, 'base64');
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(bytes.readUInt32BE(16)).toBeGreaterThan(0);
  expect(bytes.readUInt32BE(20)).toBeGreaterThan(0);
  // 比较解码后的全部 RGBA 像素，通用 PNG 和错误程序图标都不能通过。
  const extracted = await desktop.main.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    return { width: canvas.width, height: canvas.height, pixels: Array.from(context.getImageData(0, 0, canvas.width, canvas.height).data) };
  }, icon!);
  expect(extracted.width).toBe(32);
  expect(extracted.height).toBe(32);
  const colors = [[255, 0, 0, 255], [0, 255, 0, 255], [0, 0, 255, 255], [255, 255, 0, 255]];
  const expected = Array.from({ length: 32 * 32 }, (...[, index]) =>
    colors[(Math.floor(index / 32) >= 16 ? 2 : 0) + (index % 32 >= 16 ? 1 : 0)]).flat();
  expect(extracted.pixels).toEqual(expected);
  const missing = await desktop.main.evaluate((path) => window.api.getFileIcon(`${path}.missing`), executable);
  expect(missing).toBeNull();
  expect(desktop.rendererErrors).toEqual([]);
});

test('queries the real SMTC DLL with or without a Windows media session', async ({ desktop }, testInfo) => {
  const status = await desktop.main.evaluate(() => window.api.smtcGetTimestamp());
  await testInfo.attach('smtc-status', { body: JSON.stringify(status), contentType: 'application/json' });
  expect(typeof status.isAvailable).toBe('boolean');
  expect(typeof status.playbackStatus).toBe('string');
  if (status.isAvailable) {
    expect(status.timeline).toEqual(expect.objectContaining({ position: expect.any(Number), endTime: expect.any(Number) }));
  } else {
    expect(status.timeline).toBeNull();
    expect(status.playbackStatus).toBe('unknown');
  }
  expect(desktop.rendererErrors).toEqual([]);
});

test('reads and writes the current volume through the real Windows audio helper', async ({ desktop }, testInfo) => {
  const probe = await probeDevice('volume', 'eIslandVolumeHelper');
  const level = await desktop.main.evaluate(() => window.api.getVolume());
  const muted = await desktop.main.evaluate(() => window.api.mediaGetMuted());
  await testInfo.attach('audio-device', { body: JSON.stringify({ probe, level, muted }), contentType: 'application/json' });
  expect(level === null).toBe(probe === null);
  test.skip(level === null && process.env.EISLAND_E2E_REQUIRE_DEVICES !== '1', 'Windows has no default playback endpoint; volume control requires an audio device.');
  expect(level, 'EISLAND_E2E_REQUIRE_DEVICES=1 requires a working playback endpoint').not.toBeNull();
  expect(level).toBeGreaterThanOrEqual(0);
  expect(level).toBeLessThanOrEqual(100);
  expect(typeof muted).toBe('boolean');
  // 写回原值验证控制链路，避免测试改变用户的音量。
  expect(await desktop.main.evaluate((value) => window.api.setVolume(value), level!)).toBe(true);
  await expect.poll(() => desktop.main.evaluate(() => window.api.getVolume())).toBeCloseTo(level!, 0);
  expect(desktop.rendererErrors).toEqual([]);
});

test('reads and writes the current brightness through the real Windows display helper', async ({ desktop }, testInfo) => {
  const probe = await probeDevice('brightness', 'eIslandBrightnessReader');
  const level = await desktop.main.evaluate(() => window.api.getBrightness());
  await testInfo.attach('display-device', { body: JSON.stringify({ probe, level }), contentType: 'application/json' });
  expect(level === null).toBe(probe === null);
  test.skip(level === null && process.env.EISLAND_E2E_REQUIRE_DEVICES !== '1', 'Windows has no WMI/DDC-CI brightness device; control requires a supported display.');
  expect(level, 'EISLAND_E2E_REQUIRE_DEVICES=1 requires a working brightness device').not.toBeNull();
  expect(level).toBeGreaterThanOrEqual(0);
  expect(level).toBeLessThanOrEqual(100);
  expect(await desktop.main.evaluate((value) => window.api.setBrightness(value), level!)).toBe(true);
  await expect.poll(() => desktop.main.evaluate(() => window.api.getBrightness())).toBe(level);
  expect(desktop.rendererErrors).toEqual([]);
});
