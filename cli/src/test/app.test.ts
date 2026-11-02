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
 * @file app.test.ts
 * @description 基于真实仓库 package.json 验证命令分发、危险脚本保护与错误提示
 * @author 鸡哥
 */

import { stripVTControlCharacters } from 'node:util';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import runCli from '../app';
import runScript from '../core/runner';
import { confirm, runDashboard } from '../ui';

vi.mock('../core/runner', () => ({ default: vi.fn() }));
vi.mock('../ui', () => ({ confirm: vi.fn(), runDashboard: vi.fn() }));

const runMock = vi.mocked(runScript);
const confirmMock = vi.mocked(confirm);
const dashboardMock = vi.mocked(runDashboard);
let output: string[];
let errors: string[];

/**
 * 模拟终端是否可交互
 * @param interactive - true 表示 stdin 与 stdout 均为 TTY
 */
function setInteractive(interactive: boolean): void {
  Object.defineProperty(process.stdin, 'isTTY', { value: interactive, configurable: true });
  Object.defineProperty(process.stdout, 'isTTY', { value: interactive, configurable: true });
}

/**
 * 以英文执行 CLI
 * @param argv - 命令行参数
 * @returns 退出码
 */
const cli = (...argv: string[]): Promise<number> => runCli([...argv, '--lang', 'en-US']);

beforeEach(() => {
  output = [];
  errors = [];
  vi.spyOn(console, 'log').mockImplementation((line: string) => output.push(line));
  vi.spyOn(console, 'error').mockImplementation((line: string) => errors.push(line));
  runMock.mockResolvedValue(0);
  setInteractive(false);
});

afterEach(() => setInteractive(false));

describe('runCli', () => {
  it('简写分段拼接为脚本名并透传参数与退出码', async () => {
    runMock.mockResolvedValue(2);
    expect(await runCli(['test', 'main', '--lang', 'en-US', '--', '--watch'])).toBe(2);
    expect(runMock).toHaveBeenCalledWith(expect.any(String), 'test:main', ['--watch']);
  });

  it('run 子命令按完整名称执行', async () => {
    expect(await cli('run', 'lint:css')).toBe(0);
    expect(runMock).toHaveBeenCalledWith(expect.any(String), 'lint:css', []);
  });

  it('非交互终端下危险脚本未加 --yes 时拒绝执行', async () => {
    expect(await cli('esa', 'purge-all')).toBe(1);
    expect(runMock).not.toHaveBeenCalled();
    expect(errors.join('\n')).toContain('--yes');
  });

  it('--yes 跳过危险脚本确认', async () => {
    expect(await cli('release', 'upload-only', '--yes')).toBe(0);
    expect(confirmMock).not.toHaveBeenCalled();
    expect(runMock).toHaveBeenCalledWith(expect.any(String), 'release:upload-only', []);
  });

  it('交互终端下拒绝确认则取消执行', async () => {
    setInteractive(true);
    confirmMock.mockResolvedValue(false);
    expect(await cli('esa', 'purge')).toBe(130);
    expect(runMock).not.toHaveBeenCalled();
  });

  it('无参数的交互终端打开分栏界面并返回其退出码', async () => {
    setInteractive(true);
    dashboardMock.mockResolvedValue(0);
    expect(await runCli(['--yes', '--lang', 'en-US', '--', '--watch'])).toBe(0);
    expect(dashboardMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ yes: true, passthrough: ['--watch'] }));
    expect(runMock).not.toHaveBeenCalled();
  });

  it('直接执行命令在交互终端中也不进入分栏界面', async () => {
    setInteractive(true);
    expect(await cli('test', 'main')).toBe(0);
    expect(dashboardMock).not.toHaveBeenCalled();
    expect(runMock).toHaveBeenCalledWith(expect.any(String), 'test:main', []);
  });

  it('非交互终端无参数时打印帮助', async () => {
    expect(await cli()).toBe(0);
    expect(output.join('\n')).toContain('eisland-cli list [group]');
  });

  it('list 按分组打印并隐藏生命周期脚本', async () => {
    expect(await cli('list')).toBe(0);
    const text = output.join('\n');
    expect(text).toContain('test:main');
    expect(text).not.toContain('postinstall');
  });

  it('list 将危险标记放在说明之前', async () => {
    expect(await cli('list', 'release')).toBe(0);
    expect(stripVTControlCharacters(output.join('\n'))).toMatch(/release:upload\s+\[dangerous\] \S/);
  });

  it('list 未知分组时报错', async () => {
    expect(await cli('list', 'nope')).toBe(1);
    expect(errors.join('\n')).toContain('Unknown group "nope"');
  });

  it('分段不完整时列出候选', async () => {
    expect(await cli('plugin', 'build')).toBe(1);
    expect(errors.join('\n')).toContain('plugin:build:smtc');
  });

  it('拼写错误时给出建议', async () => {
    expect(await cli('tset', 'main')).toBe(1);
    expect(errors.join('\n')).toContain('Did you mean:');
  });

  it('run 缺少脚本名时报错', async () => {
    expect(await cli('run')).toBe(1);
    expect(errors.join('\n')).toContain('Missing script name');
  });

  it('未知选项提示使用 -- 透传', async () => {
    expect(await cli('test', '--watch')).toBe(1);
    expect(errors.join('\n')).toContain('"--"');
  });

  it('npm 启动失败时返回 1', async () => {
    runMock.mockRejectedValue(new Error('spawn npm ENOENT'));
    expect(await cli('dev')).toBe(1);
    expect(errors.join('\n')).toContain('spawn npm ENOENT');
  });
});
