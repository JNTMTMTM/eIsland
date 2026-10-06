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
 * @file settingsIpcSupplement.test.ts
 * @description 剪贴板 URL 与岛屿布尔、动画、形态设置 IPC 的真实规范化及持久化失败测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerClipboardIpcHandlers } from '../clipboard';
import { registerIslandIpcHandlers } from '../island';
import type { ClipboardUrlDetectMode } from '../../../utils/clipboardUrl';

type HandlerFixture = (...arguments_: unknown[]) => unknown;
const io = vi.hoisted(() => ({
  handlers: new Map<string, HandlerFixture>(),
  exists: vi.fn<() => boolean>(),
  read: vi.fn<() => string>(),
  write: vi.fn<(path: string, data: string, encoding: string) => void>(),
  clipRead: vi.fn<() => string>(),
  clipWrite: vi.fn<(text: string) => void>(),
  open: vi.fn<(url: string) => Promise<void>>(),
  broadcast: vi.fn(),
  login: vi.fn(),
  shapeRead: vi.fn<() => 'notch' | 'pill'>(),
  shapeWrite: vi.fn<(mode: 'notch' | 'pill') => boolean>(),
}));
vi.mock('electron', () => ({
  clipboard: { readText: io.clipRead, writeText: io.clipWrite },
  shell: { openExternal: io.open },
  app: { setLoginItemSettings: io.login },
  ipcMain: { handle: (channel: string, handler: HandlerFixture) => io.handlers.set(channel, handler) },
}));
vi.mock('fs', () => ({ existsSync: io.exists, readFileSync: io.read, writeFileSync: io.write }));
vi.mock('../../../utils/broadcast', () => ({ broadcastSettingChange: io.broadcast }));
vi.mock('../../../config/storeConfig', () => ({ readIslandShapeModeConfig: io.shapeRead, writeIslandShapeModeConfig: io.shapeWrite }));

/**
 * 使用真实剪贴板规范化函数注册设置 IPC。
 * @returns 可观测状态和 watcher 回调。
 */
function clipboardFixture() {
  let blacklist: string[] = [];
  let mode: ClipboardUrlDetectMode = 'http-https';
  let enabled = true;
  const start = vi.fn();
  const stop = vi.fn();
  registerClipboardIpcHandlers({
    storeDir: 'fixture-store', monitorEnabledStoreKey: 'monitor', detectModeStoreKey: 'mode', blacklistStoreKey: 'blacklist',
    defaultDetectMode: 'domain-only', getMonitorEnabled: () => enabled, setMonitorEnabled: (value) => { enabled = value; },
    getDetectMode: () => mode, setDetectMode: (value) => { mode = value; }, getBlacklist: () => blacklist, setBlacklist: (value) => { blacklist = value; },
    startWatcher: start, stopWatcher: stop,
  });
  return { start, stop };
}

/**
 * 注册岛屿设置处理器并注入形态变更回调。
 * @param changed - 可选窗口重定位回调。
 */
function islandFixture(changed?: () => void): void {
  registerIslandIpcHandlers({
    storeDir: 'fixture-store', islandOpacityStoreKey: 'opacity', expandMouseleaveIdleStoreKey: 'expand',
    maxExpandMouseleaveIdleStoreKey: 'max', idleClickExpandStoreKey: 'idle', autostartModeStoreKey: 'auto', navOrderStoreKey: 'nav',
    onShapeModeChanged: changed,
  });
}

/**
 * 通过真实 IPC 执行查询或修改。
 * @param channel - 完整 IPC 通道。
 * @param payload - 外部数据。
 * @returns 响应。
 */
function invoke(channel: string, payload?: unknown): unknown {
  return io.handlers.get(channel)?.({ sender: { id: 7 } }, payload);
}

beforeEach(() => {
  vi.resetAllMocks();
  io.handlers.clear();
  io.exists.mockReturnValue(true);
  io.read.mockReturnValue('true');
  io.clipRead.mockReturnValue('fixture');
  io.open.mockResolvedValue();
  io.shapeRead.mockReturnValue('pill');
  io.shapeWrite.mockReturnValue(true);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('剪贴板设置真实规范化与边界', () => {
  it('原生 read 返回空值或异常均返回空字符串，非法写入值规范为空', () => {
    clipboardFixture();
    io.clipRead.mockReturnValueOnce('').mockImplementationOnce(() => { throw new Error('clipboard read'); });
    expect(invoke('clipboard:read-text')).toBe('');
    expect(invoke('clipboard:read-text')).toBe('');
    expect(invoke('clipboard:write-text', null)).toBe(true);
    expect(io.clipWrite).toHaveBeenCalledExactlyOnceWith('');
    io.clipWrite.mockImplementationOnce(() => { throw new Error('clipboard write'); });
    expect(invoke('clipboard:write-text', 'fixture')).toBe(false);
  });
  it('黑名单 set 清洗域名，add-domain 去重并拒绝非法域名', () => {
    clipboardFixture();
    expect(invoke('clipboard:url-blacklist:set', [' https://Example.test/path ', 'example.test', '', null])).toBe(true);
    expect(invoke('clipboard:url-blacklist:get')).toEqual(['example.test']);
    expect(io.broadcast).toHaveBeenCalledWith(7, 'clipboard:url-blacklist', ['example.test']);
    expect(invoke('clipboard:url-blacklist:add-domain', 'EXAMPLE.test')).toBe(true);
    expect(invoke('clipboard:url-blacklist:get')).toEqual(['example.test']);
    expect(invoke('clipboard:url-blacklist:add-domain', 'next.test')).toBe(true);
    expect(invoke('clipboard:url-blacklist:get')).toEqual(['example.test', 'next.test']);
    expect(invoke('clipboard:url-blacklist:add-domain', '')).toBe(false);
  });
  it('检测模式保留合法值且无效值采用配置默认', () => {
    clipboardFixture();
    expect(invoke('clipboard:url-detect-mode:get')).toBe('http-https');
    expect(invoke('clipboard:url-detect-mode:set', 'domain-only')).toBe(true);
    expect(invoke('clipboard:url-detect-mode:get')).toBe('domain-only');
    expect(invoke('clipboard:url-detect-mode:set', 'invalid')).toBe(true);
    expect(io.write).toHaveBeenLastCalledWith(expect.stringContaining('mode.json'), '"domain-only"', 'utf-8');
  });
  it('监听开关 false 停止 watcher，true 启动 watcher 并广播真实状态', () => {
    const state = clipboardFixture();
    expect(invoke('clipboard:url-monitor:get')).toBe(true);
    expect(invoke('clipboard:url-monitor:set', false)).toBe(true);
    expect(state.stop).toHaveBeenCalledOnce();
    expect(invoke('clipboard:url-monitor:get')).toBe(false);
    expect(invoke('clipboard:url-monitor:set', true)).toBe(true);
    expect(state.start).toHaveBeenCalledOnce();
    expect(io.broadcast).toHaveBeenLastCalledWith(7, 'clipboard:url-monitor', true);
  });
  it.each([
    ['clipboard:url-blacklist:set', ['fixture.test']],
    ['clipboard:url-blacklist:add-domain', 'fixture.test'],
    ['clipboard:url-detect-mode:set', 'http-https'],
    ['clipboard:url-monitor:set', true],
  ] as const)('频道 %s 持久化失败返回 false 不广播成功', (channel, value) => {
    clipboardFixture();
    io.write.mockImplementationOnce(() => { throw new Error('disk full'); });
    expect(invoke(channel, value)).toBe(false);
    expect(io.broadcast).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });
  it.each([null, 'invalid', 'ftp://fixture.test'])('外部地址 %s 未通过验证不调用系统浏览器', async (url) => {
    clipboardFixture();
    await expect(invoke('clipboard:open-url', url)).resolves.toBe(false);
    expect(io.open).not.toHaveBeenCalled();
  });
  it('合法 HTTP/HTTPS 地址传给 shell，打开失败返回 false', async () => {
    clipboardFixture();
    await expect(invoke('clipboard:open-url', 'http://fixture.test')).resolves.toBe(true);
    expect(io.open).toHaveBeenCalledWith('http://fixture.test/');
    io.open.mockRejectedValueOnce(new Error('shell failed'));
    await expect(invoke('clipboard:open-url', 'https://fixture.test')).resolves.toBe(false);
  });
});

describe('岛屿布尔设置、动画速度和形态配置', () => {
  it.each(['expand-mouseleave-idle', 'maxexpand-mouseleave-idle', 'idle-click-expand', 'spring-animation'])('布尔设置 %s 非布尔与解析错误按默认回退', (setting) => {
    islandFixture();
    io.read.mockReturnValueOnce('"invalid"').mockReturnValueOnce('{invalid');
    const fallback = setting === 'spring-animation';
    expect(invoke(`island:${setting}:get`)).toBe(fallback);
    expect(invoke(`island:${setting}:get`)).toBe(fallback);
  });
  it.each(['expand-mouseleave-idle', 'maxexpand-mouseleave-idle', 'idle-click-expand', 'spring-animation', 'animation-speed'])('设置 %s 写入失败不广播且返回 false', (setting) => {
    islandFixture();
    io.write.mockImplementationOnce(() => { throw new Error('persist failure'); });
    expect(invoke(`island:${setting}:set`, true)).toBe(false);
    expect(io.broadcast).not.toHaveBeenCalled();
  });
  it.each(['slow', 'medium', 'fast', 'invalid'])('动画速度 %s 被规范化、保存并广播', (speed) => {
    islandFixture();
    const expected = speed === 'invalid' ? 'medium' : speed;
    expect(invoke('island:animation-speed:set', speed)).toBe(true);
    expect(io.broadcast).toHaveBeenCalledWith(7, 'island:animation-speed', expected);
    expect(io.write).toHaveBeenCalledWith(expect.stringContaining('animation-speed.json'), JSON.stringify(expected), 'utf-8');
  });
  it.each(['pill', 'notch', 'invalid'])('形态 %s 规范化并通知窗口重定位', (mode) => {
    const changed = vi.fn();
    islandFixture(changed);
    expect(invoke('island:shape-mode:get')).toBe('pill');
    expect(invoke('island:shape-mode:set', mode)).toBe(true);
    expect(io.shapeWrite).toHaveBeenCalledWith(mode === 'pill' ? 'pill' : 'notch');
    expect(changed).toHaveBeenCalledOnce();
    expect(io.broadcast).toHaveBeenCalledWith(7, 'island:shape-mode', mode === 'pill' ? 'pill' : 'notch');
  });
  it('形态写入失败不广播，成功未设置回调也可完成', () => {
    islandFixture();
    io.shapeWrite.mockReturnValueOnce(false);
    expect(invoke('island:shape-mode:set', 'pill')).toBe(false);
    expect(io.broadcast).not.toHaveBeenCalled();
    expect(invoke('island:shape-mode:set', 'pill')).toBe(true);
  });
});
