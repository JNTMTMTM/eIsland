/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM / pyisland.com
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
/**
 * @file nativeLoaderRuntime.test.mjs
 * @description 验证平台限制、架构选择、缺失预编译文件与 Electron ASAR 路径。
 * @author 鸡哥
 */
import { join, resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import loadCommonJs from './loadCommonJs.mjs';

/**
 * 为实际加载器提供可观测的文件查询和原生加载替身。
 * @param options - 模拟平台、架构、预编译文件是否存在以及虚拟 ASAR 目录。
 * @returns 加载器与原生调用记录。
 */
function fixture(options = {}) {
  const native = { create: vi.fn(() => ({ marker: 'native client' })) };
  const exists = vi.fn(() => options.exists !== false);
  const binary = vi.fn(() => native);
  const loader = loadCommonJs('native-loader.js', {
    ...options,
    require: (id) => {
      if (id === 'node:fs') return { existsSync: exists };
      if (id.endsWith('.node')) return binary(id);
      return undefined;
    },
  });
  return { loader, native, exists, binary };
}

const call = (loader) => loader.loadNative();

describe('native module loading', () => {
  it.each(['linux', 'win32'])('rejects %s before checking files', (platform) => {
    const { loader, exists, binary } = fixture({ platform });
    expect(() => call(loader)).toThrow(/only supports macOS/);
    expect(exists).not.toHaveBeenCalled();
    expect(binary).not.toHaveBeenCalled();
  });
  it('rejects unsupported architectures before checking files', () => {
    const { loader, exists } = fixture({ arch: 'ia32' });
    expect(() => call(loader)).toThrow(/Unsupported macOS architecture: ia32/);
    expect(exists).not.toHaveBeenCalled();
  });
  it('reports a missing prebuild before loading a binary', () => {
    const { loader, binary } = fixture({ exists: false });
    expect(() => call(loader)).toThrow(/prebuild is missing/);
    expect(binary).not.toHaveBeenCalled();
  });
  it.each(['arm64', 'x64'])('selects the %s binary', (arch) => {
    const { loader, binary } = fixture({ arch });
    call(loader);
    expect(binary.mock.calls[0][0]).toContain(join('prebuilds', `darwin-${arch}`));
  });
  it('uses the unpacked ASAR directory', () => {
    const { loader, binary } = fixture({ directory: resolve('/fixture/app.asar/node_modules/helper') });
    call(loader);
    expect(binary.mock.calls[0][0]).toContain(join('app.asar.unpacked', 'node_modules', 'helper'));
  });
  it('propagates binary load failures without returning an invalid module', () => {
    const { loader, binary } = fixture();
    binary.mockImplementationOnce(() => { throw new Error('Invalid binary signature'); });
    expect(() => call(loader)).toThrow('Invalid binary signature');
    expect(call(loader)).toBeDefined();
  });
});

it('caches successful binary loads', () => {
  const { loader, exists, binary } = fixture();
  expect(loader.loadNative()).toBe(loader.loadNative());
  expect(exists).toHaveBeenCalledTimes(1);
  expect(binary).toHaveBeenCalledTimes(1);
});
