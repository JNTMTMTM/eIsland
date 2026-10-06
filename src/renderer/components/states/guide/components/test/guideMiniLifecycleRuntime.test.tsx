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
 * @file guideMiniLifecycleRuntime.test.tsx
 * @description 真实迷你引导组件定时动画、图像颜色提取及主题原生设置联动测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { byClass, elements, invoke, text } from '../../../test/tree';
import { createHookReactMock, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../hooks/test/startupHookHarness';
import type { MiniIslandDemo, MiniMusicDemo, MiniSettingDemo } from '../../config/guideContentConfig';
let Island: typeof import('../MiniIsland').MiniIsland;
let Music: typeof import('../MiniMusicIsland').MiniMusicIsland;
let Setting: typeof import('../MiniSettingIsland').MiniSettingIsland;
let imageError: boolean;
let noContext: boolean;
let nextFrame: number;
const frames = new Map<number, FrameRequestCallback>();
const draw = vi.fn();
const attribute = vi.fn<(key: string, value: string) => void>();
const property = vi.fn<(key: string, value: string) => void>();
const native = {
  opacityGet: vi.fn<() => Promise<number>>(),
  opacitySet: vi.fn<(value: number) => Promise<void>>(),
  offsetGet: vi.fn<() => Promise<{
    x: number;
    y: number;
  }>>(),
  offsetSet: vi.fn<(value: {
    x: number;
    y: number;
  }) => Promise<void>>(),
  autostartGet: vi.fn<() => Promise<string>>(),
  autostartSet: vi.fn<(value: string) => Promise<void>>(),
  themeSet: vi.fn<(value: string) => Promise<void>>()
};
const request = vi.fn<(callback: FrameRequestCallback) => number>();
const cancel = vi.fn<(id: number) => void>();
/** 原生图片载入叶边界。
 * @returns 图片回调对象
 */
function nativeImage() {
  return {
    onload: () => {},
    onerror: () => {},
    set src(value: string) {
      void value;
      queueMicrotask(() => {
        if (imageError) this.onerror();else this.onload();
      });
    }
  };
}
/** 读取真实交互演示。
 * @param demo - 实际模式
 * @returns 元素树
 */
function island(demo: MiniIslandDemo) {
  return renderHook(Island, {
    demo
  });
}
/** 读取真实音乐演示。
 * @param demo - 实际模式
 * @returns 元素树
 */
function music(demo: MiniMusicDemo) {
  return renderHook(Music, {
    demo
  });
}
/** 读取真实设置演示。
 * @param demo - 实际模式
 * @returns 元素树
 */
function setting(demo: MiniSettingDemo) {
  return renderHook(Setting, {
    demo
  });
}
/** 定位设置原生按钮。
 * @param demo - 模式
 * @param index - 按钮序号
 * @returns 真实按钮
 */
function control(demo: MiniSettingDemo, index: number) {
  return elements(setting(demo)).filter((node) => node.type === 'button')[index];
}
beforeEach(async () => {
  unmountHook();
  resetHook();
  vi.resetModules();
  vi.resetAllMocks();
  vi.useFakeTimers();
  imageError = false;
  noContext = false;
  nextFrame = 0;
  frames.clear();
  native.opacityGet.mockResolvedValue(50);
  native.opacitySet.mockResolvedValue();
  native.offsetGet.mockResolvedValue({
    x: 20,
    y: -10
  });
  native.offsetSet.mockResolvedValue();
  native.autostartGet.mockResolvedValue('disabled');
  native.autostartSet.mockResolvedValue();
  native.themeSet.mockResolvedValue();
  request.mockImplementation((callback) => {
    nextFrame++;
    frames.set(nextFrame, callback);
    return nextFrame;
  });
  cancel.mockImplementation((id) => {
    frames.delete(id);
  });
  vi.stubGlobal('requestAnimationFrame', request);
  vi.stubGlobal('cancelAnimationFrame', cancel);
  vi.stubGlobal('Image', nativeImage);
  vi.stubGlobal('document', {
    documentElement: {
      setAttribute: attribute,
      style: {
        setProperty: property
      }
    },
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => noContext ? null : {
        drawImage: draw,
        getImageData: () => ({
          data: new Uint8ClampedArray([20, 40, 60, 255])
        })
      }
    })
  });
  vi.stubGlobal('window', {
    matchMedia: () => ({
      matches: false,
      addEventListener: vi.fn()
    }),
    api: {
      islandOpacityGet: native.opacityGet,
      islandOpacitySet: native.opacitySet,
      getIslandPositionOffset: native.offsetGet,
      setIslandPositionOffset: native.offsetSet,
      autostartGet: native.autostartGet,
      autostartSet: native.autostartSet,
      themeModeSet: native.themeSet
    }
  });
  vi.doMock('../../../../../i18n', () => ({
    default: {
      t: (key: string) => key
    }
  }));
  vi.doMock('react', async (original) => createHookReactMock(await original<typeof import('react')>()));
  Island = (await import('../MiniIsland')).MiniIsland;
  Music = (await import('../MiniMusicIsland')).MiniMusicIsland;
  Setting = (await import('../MiniSettingIsland')).MiniSettingIsland;
});
afterEach(() => {
  unmountHook();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('guide mini components actual lifecycle', () => {
  it('hover enter/leave and scroll interval run real state transitions then clear timers', () => {
    const tree = island('hover');
    flushHookEffects();
    invoke(byClass(tree, 'mini-island'), 'onMouseEnter');
    expect(byClass(island('hover'), 'mini-island').props.className).toContain('mini-island-hover');
    invoke(byClass(island('hover'), 'mini-island'), 'onMouseLeave');
    expect(byClass(island('hover'), 'mini-island').props.className).toContain('mini-island-idle');
    island('scroll');
    flushHookEffects();
    vi.advanceTimersByTime(1200);
    expect(byClass(island('scroll'), 'mini-island').props.className).toContain('mini-island-hover');
    vi.advanceTimersByTime(1200);
    expect(byClass(island('scroll'), 'mini-island').props.className).toContain('mini-island-expanded');
    vi.advanceTimersByTime(1200);
    expect(byClass(island('scroll'), 'mini-island').props.className).toContain('mini-island-idle');
    invoke(byClass(island('scroll'), 'mini-island'), 'onMouseEnter');
    invoke(byClass(island('scroll'), 'mini-island'), 'onMouseLeave');
    invoke(byClass(island('scroll'), 'mini-island'), 'onClick', {
      stopPropagation: vi.fn()
    });
    unmountHook();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('click expansion returns to hover after delay and pending click timer is cleared on unmount', () => {
    const tree = island('click');
    flushHookEffects();
    const stopPropagation = vi.fn();
    invoke(byClass(tree, 'mini-island'), 'onClick', {
      stopPropagation
    });
    expect(stopPropagation).toHaveBeenCalledOnce();
    expect(byClass(island('click'), 'mini-island').props.className).toContain('mini-island-expanded');
    vi.advanceTimersByTime(1500);
    expect(byClass(island('click'), 'mini-island').props.className).toContain('mini-island-hover');
    invoke(byClass(island('click'), 'mini-island'), 'onClick', {
      stopPropagation
    });
    unmountHook();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('retract starts expanded, renewed hover cancels scheduled collapse, leaving again collapses', () => {
    island('retract');
    flushHookEffects();
    invoke(byClass(island('retract'), 'mini-island'), 'onMouseLeave');
    vi.advanceTimersByTime(300);
    invoke(byClass(island('retract'), 'mini-island'), 'onMouseEnter');
    vi.advanceTimersByTime(600);
    expect(byClass(island('retract'), 'mini-island').props.className).toContain('mini-island-expanded');
    invoke(byClass(island('retract'), 'mini-island'), 'onMouseLeave');
    vi.advanceTimersByTime(600);
    expect(byClass(island('retract'), 'mini-island').props.className).toContain('mini-island-idle');
  });
  it('real color extractor and SMTC interval show playback then idle and remove timer', async () => {
    music('smtc');
    flushHookEffects();
    await settleHook();
    expect(byClass(music('smtc'), 'mini-marquee-frame').props.style).toEqual({
      '--marquee-rgb': '20, 40, 60'
    });
    expect(draw).toHaveBeenCalled();
    vi.advanceTimersByTime(1500);
    expect(text(music('smtc'))).toContain('guide.mini.music.playing');
    vi.advanceTimersByTime(1500);
    expect(byClass(music('smtc'), 'mini-island').props.className).toContain('mini-music-idle');
    unmountHook();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('real sample lyrics cycle through all lines and loop with interval cleanup', async () => {
    music('lyrics');
    flushHookEffects();
    await settleHook();
    expect(text(music('lyrics'))).toContain('sampleLyrics.0');
    vi.advanceTimersByTime(2000);
    expect(text(music('lyrics'))).toContain('sampleLyrics.1');
    vi.advanceTimersByTime(4000);
    expect(text(music('lyrics'))).toContain('sampleLyrics.0');
    unmountHook();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('real karaoke animation records elapsed progress and cancels most recently requested frame', async () => {
    music('karaoke');
    flushHookEffects();
    await settleHook();
    const callback = frames.get(1);
    expect(callback).toBeDefined();
    callback?.(performance.now() + 1500);
    expect(byClass(music('karaoke'), 'mini-music-sweep').props.style).toEqual({
      '--lrc-prog': '50.0%'
    });
    expect(request).toHaveBeenCalledTimes(2);
    unmountHook();
    expect(cancel).toHaveBeenCalledWith(2);
  });
  it.each(['image-error', 'missing-context'] as const)('real image color extraction %s keeps neutral fallback', async (kind) => {
    imageError = kind === 'image-error';
    noContext = kind === 'missing-context';
    music('lyrics');
    flushHookEffects();
    await settleHook();
    expect(byClass(music('lyrics'), 'mini-marquee-frame').props.style).toEqual({
      '--marquee-rgb': '100, 100, 100'
    });
  });
  it('theme buttons apply actual theme module visual mode and native persistence', async () => {
    setting('theme');
    flushHookEffects();
    [1, 2, 0].forEach((index) => {
      invoke(control('theme', index), 'onClick');
      expect(control('theme', index).props.className).toContain('active');
    });
    await settleHook();
    expect(native.themeSet.mock.calls.map(([mode]) => mode)).toEqual(['light', 'system', 'dark']);
    expect(attribute).toHaveBeenCalledWith('data-theme', 'light');
    expect(attribute).toHaveBeenCalledWith('data-theme', 'dark');
  });
  it('opacity reads real value, all public increments clamp and native rejected saves are contained', async () => {
    setting('opacity');
    flushHookEffects();
    await settleHook();
    expect(text(setting('opacity'))).toContain('50%');
    native.opacitySet.mockRejectedValue(new Error('native'));
    [0, 1, 2, 3].forEach((index) => {
      invoke(control('opacity', index), 'onClick');
    });
    await settleHook();
    expect(native.opacitySet.mock.calls.map(([value]) => value)).toEqual([40, 35, 40, 50]);
    for (let i = 0; i < 10; i++) invoke(control('opacity', 0), 'onClick');
    expect(text(setting('opacity'))).toContain('10%');
    for (let i = 0; i < 10; i++) invoke(control('opacity', 3), 'onClick');
    await settleHook();
    expect(text(setting('opacity'))).toContain('100%');
    expect(property).toHaveBeenCalledWith('--island-opacity', '100');
  });
  it('position reads native offsets and all directional/reset controls persist real derived coordinates', async () => {
    setting('position');
    flushHookEffects();
    await settleHook();
    expect(text(setting('position'))).toContain('x:20 y:-10');
    native.offsetSet.mockRejectedValue(new Error('native'));
    [0, 1, 3, 4, 2].forEach((index) => {
      invoke(control('position', index), 'onClick');
    });
    await settleHook();
    expect(native.offsetSet.mock.calls.map(([value]) => value)).toEqual([{
      x: 20,
      y: -20
    }, {
      x: 10,
      y: -20
    }, {
      x: 20,
      y: -20
    }, {
      x: 20,
      y: -10
    }, {
      x: 0,
      y: 0
    }]);
    expect(byClass(setting('position'), 'ms-position-island').props.style).toEqual({
      transform: 'translate(0px, 0px)'
    });
  });
  it('autostart native status and three controls render active and high-priority indicators', async () => {
    native.autostartGet.mockResolvedValue('enabled');
    setting('autostart');
    flushHookEffects();
    await settleHook();
    expect(byClass(setting('autostart'), 'ms-autostart-indicator').props.className).toContain('on');
    native.autostartSet.mockRejectedValue(new Error('native'));
    [2, 0, 1].forEach((index) => {
      invoke(control('autostart', index), 'onClick');
      expect(control('autostart', index).props.className).toContain('active');
    });
    await settleHook();
    expect(native.autostartSet.mock.calls.map(([value]) => value)).toEqual(['high-priority', 'disabled', 'enabled']);
  });
  it.each(['opacity', 'position', 'autostart'] as const)('native %s initial read rejection retains visible default', async (demo) => {
    native.opacityGet.mockRejectedValue(new Error('read'));
    native.offsetGet.mockRejectedValue(new Error('read'));
    native.autostartGet.mockRejectedValue(new Error('read'));
    setting(demo);
    flushHookEffects();
    await settleHook();
    expect(text(setting(demo))).toContain(({
      opacity: '100%',
      position: 'x:0 y:0',
      autostart: 'autostart.off'
    } as const)[demo]);
  });
  it('shortcut reference omits controls and lists all native hotkey labels', () => {
    setting('shortcut');
    flushHookEffects();
    expect(elements(setting('shortcut')).filter((node) => node.type === 'kbd')).toHaveLength(10);
    expect(elements(setting('shortcut')).filter((node) => node.type === 'button')).toHaveLength(0);
  });
});
