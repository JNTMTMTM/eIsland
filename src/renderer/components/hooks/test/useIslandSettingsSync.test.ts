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
 * @file useIslandSettingsSync.test.ts
 * @description 灵动岛设置真实初始化、IPC 与本地广播、形态窗口动画及卸载竞争测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useIslandSettingsSync } from '../useIslandSettingsSync';
import { ISLAND_WIDTH } from '../../../../shared/islandDimensions';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../components/test/contentLifecycleHarness';
import type useIslandStore from '../../../store/isLandStore';

type Store = ReturnType<typeof useIslandStore.getState>;
const io = vi.hoisted(() => ({
  state: ((): Store['state'] => 'idle')(),
  animationSpeed: ((): Store['animationSpeed'] => 'medium')(),
  shapeMode: ((): Store['shapeMode'] => 'notch')(),
  setSpringAnimation: vi.fn<Store['setSpringAnimation']>(),
  setAnimationSpeed: vi.fn<Store['setAnimationSpeed']>(),
  setShapeMode: vi.fn<Store['setShapeMode']>(),
  setMaxExpandTab: vi.fn<Store['setMaxExpandTab']>(),
  setMaxExpand: vi.fn<Store['setMaxExpand']>(),
  toggleUiStateLock: vi.fn<Store['toggleUiStateLock']>()
}));
vi.mock('../../../store/isLandStore', () => ({ default: { getState: () => io } }));
vi.mock('../../config/dynamicIslandConfig', async () => ({
  ...(await import('../../config/dynamicIslandStorageKeys')),
  ...(await import('../../config/dynamicIslandBackgroundMedia'))
}));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../test/elementHarness')).hookMocks,
  ...(await import('../../components/test/contentLifecycleHarness')).lifecycleHooks
}));

type Options = Parameters<typeof useIslandSettingsSync>[0];
type Bounds = Awaited<ReturnType<Window['api']['getWindowBounds']>>;
const api = {
  enableMousePassthrough: vi.fn<Window['api']['enableMousePassthrough']>(),
  expandMouseleaveIdleGet: vi.fn<Window['api']['expandMouseleaveIdleGet']>(),
  maxexpandMouseleaveIdleGet: vi.fn<Window['api']['maxexpandMouseleaveIdleGet']>(),
  idleClickExpandGet: vi.fn<Window['api']['idleClickExpandGet']>(),
  springAnimationGet: vi.fn<Window['api']['springAnimationGet']>(),
  animationSpeedGet: vi.fn<Window['api']['animationSpeedGet']>(),
  shapeModeGet: vi.fn<Window['api']['shapeModeGet']>(),
  storeRead: vi.fn<Window['api']['storeRead']>(),
  loadWallpaperFile: vi.fn<Window['api']['loadWallpaperFile']>(),
  setIslandPositionOffset: vi.fn<Window['api']['setIslandPositionOffset']>(),
  onSettingsChanged: vi.fn<Window['api']['onSettingsChanged']>(),
  onShapeModeChanged: vi.fn<Window['api']['onShapeModeChanged']>(),
  getWindowBounds: vi.fn<Window['api']['getWindowBounds']>(),
  moveWindowDelta: vi.fn<Window['api']['moveWindowDelta']>(),
  expandWindow: vi.fn<Window['api']['expandWindow']>(),
  expandWindowNotification: vi.fn<Window['api']['expandWindowNotification']>(),
  expandWindowLyrics: vi.fn<Window['api']['expandWindowLyrics']>(),
  expandWindowLyricsTranslation: vi.fn<Window['api']['expandWindowLyricsTranslation']>(),
  expandWindowFull: vi.fn<Window['api']['expandWindowFull']>(),
  expandWindowSettings: vi.fn<Window['api']['expandWindowSettings']>(),
  collapseWindow: vi.fn<Window['api']['collapseWindow']>()
};
const unsubscribeSettings = vi.fn<() => void>();
const unsubscribeShape = vi.fn<() => void>();
const setProperty = vi.fn<(key: string, value: string) => void>();
const getLayer = vi.fn<(id: string) => { style: { opacity: string; filter: string } } | null>();
const layer = { style: { opacity: '', filter: '' } };
const values = new Map<string, unknown>();
const frames = new Map<number, FrameRequestCallback>();
const cancelFrame = vi.fn<typeof cancelAnimationFrame>();
let frameId = 0;
let options: Options;
let surface: EventTarget;

/**
 * 等待初始化、资源解析和窗口动画 Promise 回调。
 * @returns 真实异步队列处理完成。
 */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

/**
 * 提交真实 Hook 的新渲染与 effect。
 * @returns 初始化异步读取完成。
 */
async function commit(): Promise<void> {
  renderWithHooks(() => useIslandSettingsSync(options));
  runEffects();
  await settle();
}

/**
 * 通过真实注册的 IPC 回调广播设置。
 * @param channel - 广播通道。
 * @param value - 原生设置数据。
 */
function broadcast(channel: string, value: unknown): void {
  const [listener] = api.onSettingsChanged.mock.calls.at(-1) ?? [];
  if (!listener) throw new Error('settings listener missing');
  listener(channel, value);
}

/**
 * 发送真实注册的形态变更事件。
 * @param mode - 原生形态。
 * @param x - 最终窗口水平位置。
 * @param y - 最终窗口垂直位置。
 */
function shape(mode = 'pill', x = 0, y = 0): void {
  const [[listener]] = api.onShapeModeChanged.mock.calls;
  listener(mode, x, y);
}

/**
 * 驱动已经安排的真实动画帧，保持原生帧的一次性语义。
 * @param now - 帧时间。
 */
function tick(now: number): void {
  const pending = [...frames];
  frames.clear();
  pending.forEach(([, callback]) => callback(now));
}

/**
 * 通过 EventTarget 发出本地自定义事件。
 * @param type - 本地事件名称。
 * @param detail - 同步数据。
 */
function local(type: string, detail: unknown): void {
  surface.dispatchEvent(new CustomEvent(type, { detail }));
}

beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
  values.clear();
  frames.clear();
  frameId = 0;
  io.state = 'idle';
  io.animationSpeed = 'medium';
  io.shapeMode = 'notch';
  io.setShapeMode.mockImplementation((mode) => { io.shapeMode = mode; });
  api.storeRead.mockReset().mockImplementation((key) => Promise.resolve(values.get(key)));
  api.loadWallpaperFile.mockReset().mockResolvedValue('data:image/png;base64,preview');
  api.expandMouseleaveIdleGet.mockReset().mockResolvedValue(true);
  api.maxexpandMouseleaveIdleGet.mockReset().mockResolvedValue(false);
  api.idleClickExpandGet.mockReset().mockResolvedValue(true);
  api.springAnimationGet.mockReset().mockResolvedValue(false);
  api.animationSpeedGet.mockReset().mockResolvedValue('medium');
  api.shapeModeGet.mockReset().mockResolvedValue('notch');
  api.onSettingsChanged.mockReset().mockReturnValue(unsubscribeSettings);
  api.onShapeModeChanged.mockReset().mockReturnValue(unsubscribeShape);
  api.getWindowBounds.mockReset().mockResolvedValue({ x: 0, y: 0, width: ISLAND_WIDTH, height: 40 });
  api.setIslandPositionOffset.mockReset().mockResolvedValue(true);
  cancelFrame.mockReset().mockImplementation((id) => { frames.delete(id); });
  getLayer.mockReset().mockReturnValue(layer);
  layer.style.opacity = '';
  layer.style.filter = '';
  options = {
    language: 'en-US',
    initRef: { current: false },
    setNotificationRef: { current: vi.fn<Options['setNotificationRef']['current']>() },
    applyBgMedia: vi.fn<Options['applyBgMedia']>(),
    expandLeaveIdleRef: { current: false },
    maxExpandLeaveIdleRef: { current: true },
    idleClickExpandRef: { current: false },
    bgOpacityRef: { current: 75 },
    bgBlurRef: { current: 0 },
    setBgVideoFit: vi.fn<Options['setBgVideoFit']>(),
    setBgVideoMuted: vi.fn<Options['setBgVideoMuted']>(),
    setBgVideoLoop: vi.fn<Options['setBgVideoLoop']>(),
    setBgVideoVolume: vi.fn<Options['setBgVideoVolume']>(),
    setBgVideoRate: vi.fn<Options['setBgVideoRate']>(),
    setBgVideoHwDecode: vi.fn<Options['setBgVideoHwDecode']>(),
    autoDimEnabledRef: { current: false },
    autoDimDelayRef: { current: 10 },
    positionLockedRef: { current: false }
  };
  surface = new EventTarget();
  vi.stubGlobal('window', Object.assign(surface, { api }));
  vi.stubGlobal('document', { getElementById: getLayer, documentElement: { style: { setProperty } } });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frameId += 1;
    frames.set(frameId, callback);
    return frameId;
  });
  vi.stubGlobal('cancelAnimationFrame', cancelFrame);
  vi.spyOn(performance, 'now').mockReturnValue(0);
});
afterEach(() => {
  unmountHooks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Island native initialization', () => {
  it.each([
    { speed: 'slow', shapeMode: 'notch', fit: 'cover', boolean: true, number: 300 },
    { speed: 'medium', shapeMode: 'pill', fit: 'contain', boolean: false, number: -30 },
    { speed: 'fast', shapeMode: 'invalid', fit: 'invalid', boolean: 'true', number: NaN },
    { speed: 'invalid', shapeMode: 'notch', fit: undefined, boolean: undefined, number: '1' }
  ])('validates saved settings $speed/$shapeMode/$fit', async ({ speed, shapeMode, fit, boolean, number }) => {
    api.animationSpeedGet.mockResolvedValue(speed);
    api.shapeModeGet.mockResolvedValue(shapeMode);
    values.set('island-position-locked', boolean);
    values.set('island-auto-dim-enabled', boolean);
    values.set('island-auto-dim-delay', number);
    values.set('island-bg-video-fit', fit);
    ['muted', 'loop', 'hw-decode'].forEach((key) => values.set(`island-bg-video-${key}`, boolean));
    ['opacity', 'blur', 'video-volume', 'video-rate'].forEach((key) => values.set(`island-bg-${key}`, number));
    await commit();
    expect(api.enableMousePassthrough).toHaveBeenCalledOnce();
    expect(options.initRef.current).toBe(true);
    expect(options.expandLeaveIdleRef.current).toBe(true);
    expect(options.maxExpandLeaveIdleRef.current).toBe(false);
    expect(options.idleClickExpandRef.current).toBe(true);
    expect(io.setSpringAnimation).toHaveBeenCalledWith(false);
    expect(io.setAnimationSpeed).toHaveBeenCalledWith(speed === 'invalid' ? 'medium' : speed);
    expect(io.setShapeMode).toHaveBeenCalledWith(shapeMode === 'invalid' ? 'notch' : shapeMode);
    expect(options.positionLockedRef.current).toBe(boolean === true);
    expect(options.autoDimEnabledRef.current).toBe(boolean === true);
    expect(options.autoDimDelayRef.current).toBe(typeof number === 'number' && Number.isFinite(number) ? Math.max(1, number) : 10);
    if (typeof number === 'number' && Number.isFinite(number)) {
      expect(options.bgOpacityRef.current).toBe(number > 100 ? 100 : 0);
      expect(options.bgBlurRef.current).toBe(number > 20 ? 20 : 0);
      expect(options.setBgVideoVolume).toHaveBeenCalledWith(number > 1 ? 1 : 0);
      expect(options.setBgVideoRate).toHaveBeenCalledWith(number > 3 ? 3 : 0.25);
    } else {
      expect(options.setBgVideoVolume).not.toHaveBeenCalled();
      expect(options.setBgVideoRate).not.toHaveBeenCalled();
      expect(options.bgOpacityRef.current).toBe(75);
    }
    if (fit === 'cover' || fit === 'contain') expect(options.setBgVideoFit).toHaveBeenCalledWith(fit);
    else expect(options.setBgVideoFit).not.toHaveBeenCalled();
    if (typeof boolean === 'boolean') {
      expect(options.setBgVideoMuted).toHaveBeenCalledWith(boolean);
      expect(options.setBgVideoLoop).toHaveBeenCalledWith(boolean);
      expect(options.setBgVideoHwDecode).toHaveBeenCalledWith(boolean);
    } else expect(options.setBgVideoMuted).not.toHaveBeenCalled();
    expect(layer.style.filter).toBe(options.bgBlurRef.current > 0 ? 'blur(20px)' : 'none');
    const reads = api.storeRead.mock.calls.length;
    options.language = 'zh-CN';
    await commit();
    expect(api.storeRead).toHaveBeenCalledTimes(reads);
    expect(unsubscribeSettings).toHaveBeenCalledOnce();
  });

  it.each([
    { media: 'https://current', legacy: null, source: 'https://current' },
    { media: null, legacy: 'https://legacy', source: 'https://legacy' },
    { media: null, legacy: '', source: null },
    { media: null, legacy: 1, source: null }
  ])('restores current and legacy backgrounds', async ({ media, legacy, source }) => {
    values.set('island-bg-media', media);
    values.set('island-bg-image', legacy);
    await commit();
    if (source) expect(options.applyBgMedia).toHaveBeenCalledWith({ source, type: 'image' }, source);
    else {
      expect(options.applyBgMedia).not.toHaveBeenCalled();
      expect(layer.style.opacity).toBe('0.75');
    }
  });

  it('does not apply a missing file preview or update a missing background element', async () => {
    values.set('island-bg-media', 'C:/image.png');
    api.loadWallpaperFile.mockResolvedValue(null);
    await commit();
    expect(options.applyBgMedia).not.toHaveBeenCalled();
    resetLifecycle();
    options.initRef.current = false;
    getLayer.mockReturnValue(null);
    await commit();
    expect(options.setBgVideoFit).not.toHaveBeenCalled();
  });

  it('absorbs all native initialization request failures', async () => {
    api.storeRead.mockRejectedValue(new Error('store failure'));
    api.expandMouseleaveIdleGet.mockRejectedValue(new Error('expand failure'));
    api.maxexpandMouseleaveIdleGet.mockRejectedValue(new Error('max failure'));
    api.idleClickExpandGet.mockRejectedValue(new Error('idle failure'));
    api.springAnimationGet.mockRejectedValue(new Error('spring failure'));
    api.animationSpeedGet.mockRejectedValue(new Error('speed failure'));
    api.shapeModeGet.mockRejectedValue(new Error('shape failure'));
    await commit();
    expect(options.expandLeaveIdleRef.current).toBe(false);
    expect(options.maxExpandLeaveIdleRef.current).toBe(true);
    expect(io.setAnimationSpeed).not.toHaveBeenCalled();
  });

  it('registers and cleans up local listeners with no native bridge', async () => {
    Reflect.deleteProperty(surface, 'api');
    vi.stubGlobal('window', surface);
    const remove = vi.spyOn(surface, 'removeEventListener');
    await commit();
    unmountHooks();
    expect(remove).toHaveBeenCalledTimes(3);
    expect(unsubscribeSettings).not.toHaveBeenCalled();
    expect(unsubscribeShape).not.toHaveBeenCalled();
  });

  it('supports older bridges with absent optional getters and subscribers', async () => {
    vi.stubGlobal('window', Object.assign(surface, { api: { enableMousePassthrough: api.enableMousePassthrough } }));
    await commit();
    unmountHooks();
    expect(api.enableMousePassthrough).toHaveBeenCalledOnce();
    expect(api.storeRead).not.toHaveBeenCalled();
  });
});

describe('Island IPC and local settings', () => {
  it('handles navigation, locking, validated notifications and basic appearance channels', async () => {
    await commit();
    broadcast('shortcut:open-clipboard-history', undefined);
    broadcast('shortcut:toggle-ui-lock', undefined);
    expect(io.setMaxExpandTab).toHaveBeenCalledWith('clipboardHistory');
    expect(io.setMaxExpand).toHaveBeenCalledOnce();
    expect(io.toggleUiStateLock).toHaveBeenCalledOnce();
    [null, 1, {}, { title: 'missing body' }, { body: 'missing title' }].forEach((value) => broadcast('notification:show', value));
    expect(options.setNotificationRef.current).not.toHaveBeenCalled();
    const notification = { title: 'hello', body: 'world' };
    broadcast('notification:show', notification);
    expect(options.setNotificationRef.current).toHaveBeenCalledWith(notification);
    [1, 120, 55.5, 'invalid'].forEach((value) => broadcast('island:opacity', value));
    expect(setProperty).toHaveBeenLastCalledWith('--island-opacity', '100');
    broadcast('island:expand-mouseleave-idle', 1);
    broadcast('island:maxexpand-mouseleave-idle', 0);
    broadcast('island:idle-click-expand', true);
    expect(options.expandLeaveIdleRef.current).toBe(true);
    expect(options.maxExpandLeaveIdleRef.current).toBe(false);
    expect(options.idleClickExpandRef.current).toBe(true);
    broadcast('store:island-position-locked', true);
    broadcast('store:island-auto-dim-enabled', true);
    [0, 'invalid', Infinity, 23].forEach((value) => broadcast('store:island-auto-dim-delay', value));
    expect(options.positionLockedRef.current).toBe(true);
    expect(options.autoDimEnabledRef.current).toBe(true);
    expect(options.autoDimDelayRef.current).toBe(23);
    broadcast('island:spring-animation', false);
    ['slow', 'medium', 'fast', 'invalid'].forEach((value) => broadcast('island:animation-speed', value));
    ['notch', 'pill', 'invalid'].forEach((value) => broadcast('island:shape-mode', value));
    expect(io.setSpringAnimation).toHaveBeenLastCalledWith(false);
    expect(io.setAnimationSpeed).toHaveBeenLastCalledWith('medium');
    expect(io.setShapeMode).toHaveBeenLastCalledWith('notch');
  });

  it('normalizes background messages, missing previews and rejects native image failures', async () => {
    await commit();
    broadcast('store:island-bg-media', null);
    expect(options.applyBgMedia).toHaveBeenLastCalledWith(null, null);
    broadcast('store:island-bg-media', 'https://preview');
    await settle();
    expect(options.applyBgMedia).toHaveBeenLastCalledWith({ type: 'image', source: 'https://preview' }, 'https://preview');
    api.loadWallpaperFile.mockResolvedValue(null);
    broadcast('store:island-bg-media', 'C:/missing.png');
    await settle();
    expect(options.applyBgMedia).toHaveBeenLastCalledWith(null, null);
    api.loadWallpaperFile.mockRejectedValue(new Error('native load failed'));
    broadcast('store:island-bg-media', 'C:/error.png');
    await settle();
    expect(options.applyBgMedia).toHaveBeenCalledTimes(3);
  });

  it('clamps background opacity and blur, respects missing layers and video input types', async () => {
    await commit();
    [-2, 150, 'invalid', Infinity, 32].forEach((value) => broadcast('store:island-bg-opacity', value));
    [-2, 30, 'invalid', Infinity, 4.4].forEach((value) => broadcast('store:island-bg-blur', value));
    expect(options.bgOpacityRef.current).toBe(32);
    expect(layer.style.opacity).toBe('0.32');
    expect(options.bgBlurRef.current).toBe(4);
    expect(layer.style.filter).toBe('blur(4px)');
    getLayer.mockReturnValue(null);
    broadcast('store:island-bg-opacity', 50);
    broadcast('store:island-bg-blur', 8);
    expect(options.bgOpacityRef.current).toBe(32);
    ['cover', 'contain', 'invalid'].forEach((value) => broadcast('store:island-bg-video-fit', value));
    [true, false, 'invalid'].forEach((value) => {
      broadcast('store:island-bg-video-muted', value);
      broadcast('store:island-bg-video-loop', value);
      broadcast('store:island-bg-video-hw-decode', value);
    });
    [-1, 8, 'invalid', Infinity].forEach((value) => {
      broadcast('store:island-bg-video-volume', value);
      broadcast('store:island-bg-video-rate', value);
    });
    expect(options.setBgVideoFit).toHaveBeenLastCalledWith('contain');
    expect(options.setBgVideoMuted).toHaveBeenLastCalledWith(false);
    expect(options.setBgVideoLoop).toHaveBeenLastCalledWith(false);
    expect(options.setBgVideoHwDecode).toHaveBeenLastCalledWith(false);
    expect(options.setBgVideoVolume).toHaveBeenLastCalledWith(1);
    expect(options.setBgVideoRate).toHaveBeenLastCalledWith(3);
  });

  it('validates position messages, catches movement failures and supports an absent optional setter', async () => {
    await commit();
    [null, {}, { x: '1', y: 2 }, { x: 1, y: '2' }].forEach((value) => broadcast('island:position', value));
    expect(api.setIslandPositionOffset).not.toHaveBeenCalled();
    api.setIslandPositionOffset.mockRejectedValue(new Error('window closed'));
    broadcast('island:position', { x: 1, y: 2 });
    await settle();
    expect(api.setIslandPositionOffset).toHaveBeenCalledWith({ x: 1, y: 2 });
    vi.stubGlobal('window', Object.assign(surface, { api: { ...api, setIslandPositionOffset: undefined } }));
    broadcast('island:position', { x: 3, y: 4 });
    Reflect.deleteProperty(surface, 'api');
    vi.stubGlobal('window', surface);
    broadcast('island:position', { x: 5, y: 6 });
    expect(api.setIslandPositionOffset).toHaveBeenCalledOnce();
  });

  it('applies only validated local background, dim and position lock event details', async () => {
    await commit();
    ['island-bg-local-sync', 'island-auto-dim-local-sync', 'island-position-lock-local-sync'].forEach((type) => {
      local(type, null);
      local(type, 'invalid');
      local(type, {});
    });
    local('island-bg-local-sync', { media: { type: 'video', source: 'https://movie' }, previewUrl: 'blob:preview', videoFit: 'cover', videoMuted: true, videoLoop: false, videoVolume: 3, videoRate: -1, videoHwDecode: true });
    expect(options.applyBgMedia).toHaveBeenLastCalledWith({ type: 'video', source: 'https://movie' }, 'blob:preview');
    local('island-bg-local-sync', { media: null });
    expect(options.applyBgMedia).toHaveBeenLastCalledWith(null, null);
    local('island-bg-local-sync', { previewUrl: 'blob:only' });
    expect(options.applyBgMedia).toHaveBeenLastCalledWith(null, 'blob:only');
    local('island-bg-local-sync', { videoFit: 'contain', videoVolume: -1, videoRate: 6 });
    local('island-bg-local-sync', { videoFit: 'invalid', videoMuted: 1, videoLoop: 1, videoVolume: '1', videoRate: '1', videoHwDecode: 1 });
    local('island-bg-local-sync', { videoVolume: Infinity, videoRate: NaN });
    expect(options.setBgVideoFit).toHaveBeenLastCalledWith('contain');
    expect(options.setBgVideoMuted).toHaveBeenLastCalledWith(true);
    expect(options.setBgVideoLoop).toHaveBeenLastCalledWith(false);
    expect(options.setBgVideoHwDecode).toHaveBeenLastCalledWith(true);
    expect(options.setBgVideoVolume).toHaveBeenLastCalledWith(0);
    expect(options.setBgVideoRate).toHaveBeenLastCalledWith(3);
    local('island-auto-dim-local-sync', { autoDimEnabled: true, autoDimDelaySec: 0 });
    expect(options.autoDimEnabledRef.current).toBe(true);
    expect(options.autoDimDelayRef.current).toBe(1);
    local('island-auto-dim-local-sync', { autoDimEnabled: 1, autoDimDelaySec: '1' });
    local('island-auto-dim-local-sync', { autoDimDelaySec: Infinity });
    expect(options.autoDimDelayRef.current).toBe(1);
    local('island-position-lock-local-sync', { locked: 'invalid' });
    local('island-position-lock-local-sync', { locked: true });
    expect(options.positionLockedRef.current).toBe(true);
  });
});

describe('Island shape transitions and window animations', () => {
  it.each([
    ['hover', 'expandWindow'], ['notification', 'expandWindowNotification'], ['agent', 'expandWindowNotification'],
    ['stt', 'expandWindowNotification'], ['cli', 'expandWindowNotification'], ['lyrics', 'expandWindowLyrics'],
    ['agentVoiceInput', 'expandWindowLyrics'], ['lyricsTranslation', 'expandWindowLyricsTranslation'],
    ['expanded', 'expandWindowFull'], ['maxExpand', 'expandWindowSettings'], ['guide', 'expandWindowSettings'],
    ['login', 'expandWindowSettings'], ['register', 'expandWindowSettings'], ['resetPassword', 'expandWindowSettings'],
    ['setPassword', 'expandWindowSettings'], ['bindOAuth', 'expandWindowSettings'], ['bindEmail', 'expandWindowSettings'],
    ['payment', 'expandWindowSettings'], ['announcement', 'expandWindowSettings'], ['questionnaire', 'expandWindowSettings'],
    ['musicProvidersLogin', 'expandWindowSettings'], ['idle', 'collapseWindow']
  ] as const)('resizes state %s through %s', async (state, method) => {
    io.state = state;
    await commit();
    shape();
    await settle();
    tick(700);
    await settle();
    expect(api[method]).toHaveBeenCalledWith(700);
    expect(io.setShapeMode).toHaveBeenLastCalledWith('pill');
    expect(api.moveWindowDelta).not.toHaveBeenCalled();
  });

  it('animates rounded incremental movement and corrects settled window bounds', async () => {
    await commit();
    api.getWindowBounds.mockResolvedValueOnce({ x: 0, y: 0, width: ISLAND_WIDTH, height: 40 })
      .mockResolvedValueOnce({ x: 90, y: 45, width: ISLAND_WIDTH, height: 40 });
    shape('pill', 100, 50);
    await settle();
    tick(0);
    expect(api.moveWindowDelta).not.toHaveBeenCalled();
    tick(350);
    expect(api.moveWindowDelta).toHaveBeenLastCalledWith(88, 44);
    tick(700);
    await settle();
    expect(api.moveWindowDelta.mock.calls).toEqual([[88, 44], [12, 6], [10, 5]]);
    expect(api.getWindowBounds).toHaveBeenCalledTimes(2);
  });

  it('normalizes unknown shapes and leaves an unchanged shape untouched', async () => {
    await commit();
    io.setShapeMode.mockClear();
    shape('invalid');
    await settle();
    tick(700);
    await settle();
    expect(io.setShapeMode).not.toHaveBeenCalled();
    expect(api.collapseWindow).toHaveBeenCalledWith(700);
  });

  it('absorbs bounds failures and handles missing initial and settled bounds', async () => {
    await commit();
    api.getWindowBounds.mockRejectedValueOnce(new Error('window disappeared'));
    shape();
    await settle();
    expect(frames.size).toBe(0);
    api.getWindowBounds.mockResolvedValueOnce(null as unknown as Bounds);
    shape();
    await settle();
    expect(frames.size).toBe(0);
    api.getWindowBounds.mockResolvedValueOnce({ x: 0, y: 0, width: ISLAND_WIDTH, height: 40 }).mockResolvedValueOnce(null as unknown as Bounds);
    shape();
    await settle();
    tick(700);
    await settle();
    expect(api.moveWindowDelta).not.toHaveBeenCalled();
  });

  it('discards stale initial bounds and cancels already scheduled frames on newer shape changes', async () => {
    await commit();
    let resolve: ((value: Bounds) => void) | undefined;
    api.getWindowBounds.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    shape('pill', 100, 50);
    shape('notch', 0, 0);
    await settle();
    resolve?.({ x: 0, y: 0, width: ISLAND_WIDTH, height: 40 });
    await settle();
    expect(frames.size).toBe(1);
    shape('pill', 5, 5);
    expect(cancelFrame).toHaveBeenCalled();
    await settle();
    expect(frames.size).toBe(1);
    unmountHooks();
    expect(frames.size).toBe(0);
    expect(unsubscribeShape).toHaveBeenCalledOnce();
  });

  it('discards an animation completion superseded before its Promise continuation', async () => {
    await commit();
    shape('pill', 0, 0);
    await settle();
    tick(700);
    shape('notch', 0, 0);
    await settle();
    expect(api.getWindowBounds).toHaveBeenCalledTimes(2);
  });

  it('discards settled bounds superseded while their native request is pending', async () => {
    await commit();
    let resolve: ((value: Bounds) => void) | undefined;
    api.getWindowBounds.mockResolvedValueOnce({ x: 0, y: 0, width: ISLAND_WIDTH, height: 40 })
      .mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    shape('pill', 0, 0);
    await settle();
    tick(700);
    await settle();
    shape('notch', 0, 0);
    resolve?.({ x: 100, y: 100, width: ISLAND_WIDTH, height: 40 });
    await settle();
    expect(api.moveWindowDelta).not.toHaveBeenCalled();
  });

  it('supports missing optional movement bridges during animation and correction', async () => {
    await commit();
    vi.stubGlobal('window', Object.assign(surface, { api: { ...api, moveWindowDelta: undefined } }));
    shape('pill', 100, 50);
    await settle();
    tick(700);
    await settle();
    expect(api.moveWindowDelta).not.toHaveBeenCalled();
    expect(api.getWindowBounds).toHaveBeenCalledTimes(2);
  });
});
