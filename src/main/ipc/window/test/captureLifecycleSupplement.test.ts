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
 * @file captureLifecycleSupplement.test.ts
 * @description 截图保存失败、OCR来源验证及发送窗口销毁时的取消与监听清理测试。
 * @author 鸡哥
 */

import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerCaptureIpcHandlers } from '../capture';
import type { BrowserWindow } from 'electron';
type HandlerFixture = (...args: unknown[]) => unknown;
interface SenderFixture extends EventEmitter { id: number; }
interface ImageFixture { toPNG: () => Buffer; }
const io = vi.hoisted(() => ({
  handles: new Map<string, HandlerFixture>(), events: new Map<string, HandlerFixture>(),
  write: vi.fn(), clipboard: vi.fn(), screenshot: vi.fn<() => Buffer | null>(),
  sources: vi.fn<() => Promise<{ thumbnail: ImageFixture }[]>>(),
  image: vi.fn<(url: string) => ImageFixture>(),
  save: vi.fn<() => Promise<{ canceled: boolean; filePath?: string }>>(),
  local: vi.fn<(url: string, signal: AbortSignal) => Promise<unknown>>(),
  ocr: vi.fn<(token: string, url: string, signal: AbortSignal) => Promise<unknown>>(),
  translate: vi.fn<(token: string, url: string, source: string, target: string, signal: AbortSignal) => Promise<unknown>>(),
}));
vi.mock('electron', () => ({
  app: { getPath: () => 'C:/fixture-pictures' }, clipboard: { writeImage: io.clipboard },
  desktopCapturer: { getSources: io.sources }, dialog: { showSaveDialog: io.save },
  nativeImage: { createFromDataURL: io.image },
  ipcMain: { handle: (channel: string, handler: HandlerFixture) => io.handles.set(channel, handler), on: (channel: string, handler: HandlerFixture) => io.events.set(channel, handler) },
}));
vi.mock('fs', () => ({ writeFileSync: io.write }));
vi.mock('../../../window/screenshotHelper', () => ({ capturePrimaryDisplayPng: io.screenshot }));
vi.mock('../../../services/captureLocalOcrService', () => ({ recognizeCaptureTextLocally: io.local }));
vi.mock('../../../services/captureOcrService', () => ({ recognizeCaptureText: io.ocr }));
vi.mock('../../../services/imageTranslationService', () => ({ translateCaptureImage: io.translate }));
const win = { isDestroyed: vi.fn<() => boolean>(), hide: vi.fn(), webContents: { id: 7 } };
let currentWindow: BrowserWindow | null;
const close = vi.fn();
const start = vi.fn<() => Promise<void>>();
/**
 * 调用真实截图处理器，允许畸形 IPC 参数进入校验路径。
 * @param channel - 截图通道
 * @param payload - 请求载荷
 * @param sender - 请求来源窗口
 * @returns 真实处理器结果
 */
function invoke(channel: string, payload?: unknown, sender: SenderFixture = Object.assign(new EventEmitter(), { id: 7 })): unknown {
  return io.handles.get(channel)?.({ sender }, payload);
}
beforeEach(() => {
  vi.resetAllMocks(); io.handles.clear(); io.events.clear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  win.isDestroyed.mockReturnValue(false);
  currentWindow = win as unknown as BrowserWindow;
  start.mockResolvedValue(undefined); io.screenshot.mockReturnValue(null); io.sources.mockResolvedValue([]);
  io.image.mockReturnValue({ toPNG: () => Buffer.from('png') }); io.save.mockResolvedValue({ canceled: true });
  io.local.mockResolvedValue({ success: true, text: 'local' }); io.ocr.mockResolvedValue({ success: true, text: 'remote' });
  io.translate.mockResolvedValue({ success: true, text: 'translated' });
  registerCaptureIpcHandlers({ getCaptureWindow: () => currentWindow, closeCaptureWindow: close, startRegionScreenshot: start });
});
afterEach(() => vi.restoreAllMocks());
describe('截图图像来源及保存清理', () => {
  it('原生屏幕截图优先于 desktopCapturer', async () => {
    io.screenshot.mockReturnValue(Buffer.from('native'));
    await expect(invoke('system:screenshot')).resolves.toBe(Buffer.from('native').toString('base64'));
    expect(io.sources).not.toHaveBeenCalled();
  });
  it('无屏幕来源时返回 null', async () => { await expect(invoke('system:screenshot')).resolves.toBeNull(); });
  it('屏幕捕获失败返回 null 并记录错误', async () => {
    io.sources.mockRejectedValue(new Error('capture failed'));
    await expect(invoke('system:screenshot')).resolves.toBeNull(); expect(console.error).toHaveBeenCalled();
  });
  it('剪贴板失败仍关闭截图窗口', () => {
    io.clipboard.mockImplementation(() => { throw new Error('clipboard failed'); });
    io.events.get('capture-complete')?.({}, { dataURL: 'data:image/png;base64,AA==' });
    expect(close).toHaveBeenCalledOnce(); expect(console.error).toHaveBeenCalled();
  });
  it.each(['canceled', 'no-path', 'failure', 'absent-window', 'destroyed-window'])('%s 保存边界仍关闭窗口', async (scenario) => {
    if (scenario === 'no-path') io.save.mockResolvedValue({ canceled: false });
    if (scenario === 'failure') io.save.mockRejectedValue(new Error('dialog failed'));
    if (scenario === 'absent-window') currentWindow = null;
    if (scenario === 'destroyed-window') win.isDestroyed.mockReturnValue(true);
    await io.events.get('capture-save')?.({}, { dataURL: 'data:image/png;base64,AA==' });
    expect(io.write).not.toHaveBeenCalled(); expect(close).toHaveBeenCalledOnce();
    if (scenario === 'absent-window' || scenario === 'destroyed-window') expect(win.hide).not.toHaveBeenCalled();
    if (scenario === 'failure') expect(console.error).toHaveBeenCalled();
  });
});
describe('截图 OCR 和翻译来源校验、参数回退和取消清理', () => {
  it.each(['capture-ocr-local', 'capture-ocr', 'capture-translate'])('%s 拒绝关闭、销毁和错误来源窗口', async (channel) => {
    currentWindow = null;
    await expect(invoke(channel)).resolves.toEqual({ success: false, code: 'captureWindowClosed' });
    currentWindow = win as unknown as BrowserWindow; win.isDestroyed.mockReturnValue(true);
    await expect(invoke(channel)).resolves.toEqual({ success: false, code: 'captureWindowClosed' });
    win.isDestroyed.mockReturnValue(false);
    await expect(invoke(channel, {}, Object.assign(new EventEmitter(), { id: 9 }))).resolves.toEqual({ success: false, code: 'captureWindowClosed' });
    expect(io.local).not.toHaveBeenCalled(); expect(io.ocr).not.toHaveBeenCalled(); expect(io.translate).not.toHaveBeenCalled();
  });
  it.each([undefined, { token: 4, dataURL: null, sourceLanguage: 3, targetLanguage: false }, { sourceLanguage: '', targetLanguage: '' }])('缺失或非法参数 %s 采用既有默认值', async (payload) => {
    await expect(invoke('capture-ocr-local', payload)).resolves.toEqual({ success: true, text: 'local' });
    await expect(invoke('capture-ocr', payload)).resolves.toEqual({ success: true, text: 'remote' });
    await expect(invoke('capture-translate', payload)).resolves.toEqual({ success: true, text: 'translated' });
    expect(io.local).toHaveBeenCalledWith('', expect.any(AbortSignal));
    expect(io.ocr).toHaveBeenCalledWith('', '', expect.any(AbortSignal));
    expect(io.translate).toHaveBeenCalledWith('', '', 'auto', 'zh', expect.any(AbortSignal));
  });
  it.each(['capture-ocr-local', 'capture-ocr', 'capture-translate'])('%s 成功和失败都移除 destroyed 监听，发送方销毁触发 abort', async (channel) => {
    const sender = Object.assign(new EventEmitter(), { id: 7 });
    const payload = { token: 'fixture-token', dataURL: 'fixture-data', sourceLanguage: 'en', targetLanguage: 'fr' };
    const result = invoke(channel, payload, sender);
    expect(sender.listenerCount('destroyed')).toBe(1);
    sender.emit('destroyed');
    await expect(result).resolves.toMatchObject({ success: true });
    const signals: Record<string, AbortSignal | undefined> = { 'capture-ocr-local': io.local.mock.calls[0]?.[1], 'capture-ocr': io.ocr.mock.calls[0]?.[2], 'capture-translate': io.translate.mock.calls[0]?.[4] };
    const signal = signals[channel];
    expect(signal?.aborted).toBe(true); expect(sender.listenerCount('destroyed')).toBe(0);
    if (channel === 'capture-translate') expect(io.translate).toHaveBeenCalledWith('fixture-token', 'fixture-data', 'en', 'fr', expect.any(AbortSignal));
    else if (channel === 'capture-ocr') expect(io.ocr).toHaveBeenCalledWith('fixture-token', 'fixture-data', expect.any(AbortSignal));
    else expect(io.local).toHaveBeenCalledWith('fixture-data', expect.any(AbortSignal));
    const failure = new Error('provider failed');
    io.local.mockRejectedValue(failure); io.ocr.mockRejectedValue(failure); io.translate.mockRejectedValue(failure);
    await expect(invoke(channel, payload, sender)).rejects.toThrow('provider failed');
    expect(sender.listenerCount('destroyed')).toBe(0);
  });
});
