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
 * @file songTabRuntime.test.tsx
 * @description 歌曲页真实歌词滚动、逐字进度、Canvas 绘制、媒体回调和生命周期清理测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../maxExpand/components/calendar/hooks/test/calendarHookHarness';
import { byClass, elements, find, invoke, text, type TreeElement } from '../../../test/tree';
import { SongTab } from '../SongTab';
import type { IIslandStore } from '../../../../../store/types';
import type { ReactElement, RefObject } from 'react';
type SongState = Pick<IIslandStore, 'isMusicPlaying' | 'isPlaying' | 'mediaInfo' | 'syncedLyrics' | 'lyricsLoading' | 'coverImage' | 'dominantColor' | 'countdown' | 'timerData' | 'currentPositionMs'> & {
  weather: {
    temperature: number;
    description: string;
  } | null;
};
const leaves = vi.hoisted(() => ({
  state: {} as SongState,
  karaoke: vi.fn<() => Promise<boolean>>(),
  prev: vi.fn(),
  next: vi.fn(),
  play: vi.fn()
}));
vi.mock('../../../../../store/slices', () => ({
  default: (selector: (state: SongState) => unknown) => selector(leaves.state)
}));
let resize: (() => void) | undefined;
let raf: Map<number, FrameRequestCallback>;
let nextFrame: number;
const observe = vi.fn();
const disconnect = vi.fn();
const cancel = vi.fn<(id: number) => void>();
/** 读取实际歌词/波形内部组件，调用模块中的原函数。
 * @param name - 函数名
 * @returns 真实组件节点
 */
function child(name: string): TreeElement {
  return find(renderHook(SongTab), (node) => typeof node.type === 'function' && node.type.name === name);
}
/** 执行已读取的实际组件，保留其状态。
 * @param node - 真实节点
 * @returns 内部组件元素树
 */
function runChild(node: TreeElement): ReactElement {
  return renderHook(node.type as (props: Record<string, unknown>) => ReactElement, node.props);
}
/** 提交下一帧原生回调，避免同步 RAF 循环。
 */
function tick(): void {
  const first = raf.entries().next().value;
  expect(first).toBeDefined();
  if (!first) return;
  const [id, callback] = first;
  raf.delete(id);
  callback(0);
}
/** 将原生对象接入真实 ref。
 * @param node - 节点
 * @param value - 原生对象或卸载后的 null
 */
function attach(node: TreeElement, value: unknown): void {
  const ref = node.props.ref as RefObject<unknown>;
  ref.current = value;
}
/** 创建原生 Canvas 边界，真实绘制算法仍在被测模块运行。
 * @returns 可观测原生画布与上下文
 */
function canvas() {
  const context = {
    beginPath: vi.fn(),
    moveTo: vi.fn<(x: number, y: number) => void>(),
    lineTo: vi.fn<(x: number, y: number) => void>(),
    stroke: vi.fn(),
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    strokeStyle: '',
    lineWidth: 0
  };
  const native = {
    width: 0,
    height: 0,
    style: {
      width: '',
      height: ''
    },
    parentElement: {
      clientWidth: 6,
      clientHeight: 20
    } as {
      clientWidth: number;
      clientHeight: number;
    } | null,
    getContext: vi.fn<() => CanvasRenderingContext2D | null>().mockReturnValue(context as unknown as CanvasRenderingContext2D)
  };
  return {
    context,
    native
  };
}
beforeEach(() => {
  unmountHook();
  resetHook();
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 6, 12));
  resize = undefined;
  raf = new Map();
  nextFrame = 0;
  leaves.state = {
    isMusicPlaying: false,
    isPlaying: false,
    mediaInfo: {
      title: '',
      artist: '',
      album: '',
      duration_ms: 0
    },
    syncedLyrics: null,
    lyricsLoading: false,
    coverImage: null,
    dominantColor: [20, 30, 40],
    weather: null,
    countdown: {
      enabled: false,
      label: '',
      targetDate: ''
    },
    timerData: {
      state: 'idle',
      remainingSeconds: 0,
      inputHours: '',
      inputMinutes: '',
      inputSeconds: ''
    },
    currentPositionMs: 0
  };
  leaves.karaoke.mockResolvedValue(false);
  vi.stubGlobal('window', {
    devicePixelRatio: 2,
    api: {
      musicLyricsKaraokeGet: leaves.karaoke,
      mediaPrev: leaves.prev,
      mediaNext: leaves.next,
      mediaPlayPause: leaves.play
    }
  });
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) {
      resize = callback;
    }

    observe = observe;

    disconnect = disconnect;
  });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = ++nextFrame;
    raf.set(id, callback);
    return id;
  });
  cancel.mockImplementation((id) => {
    raf.delete(id);
  });
  vi.stubGlobal('cancelAnimationFrame', cancel);
});
afterEach(() => {
  unmountHook();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('SongTab runtime', () => {
  it('clock ticks and unmount clears interval while rejected karaoke settings are contained', async () => {
    leaves.karaoke.mockRejectedValue(new Error('settings'));
    renderHook(SongTab);
    flushHookEffects();
    await settleHook();
    const before = text(byClass(renderHook(SongTab), 'ov-time-clock'));
    vi.advanceTimersByTime(60000);
    expect(text(byClass(renderHook(SongTab), 'ov-time-clock'))).not.toBe(before);
    expect(vi.getTimerCount()).toBe(1);
    unmountHook();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('optional bridge omission keeps clock and event handlers safe', () => {
    vi.stubGlobal('window', {
      devicePixelRatio: 2
    });
    const tree = renderHook(SongTab);
    flushHookEffects();
    const stopPropagation = vi.fn();
    elements(tree).filter((node) => node.type === 'button').forEach((node) => invoke(node, 'onClick', {
      stopPropagation
    }));
    expect(stopPropagation).toHaveBeenCalledTimes(3);
  });
  it('empty lyrics, lyrics boundaries and running timer render through real binary search and nearby padding', () => {
    leaves.state.syncedLyrics = [];
    expect(text(renderHook(SongTab))).toContain('songTab.onboarding.title');
    leaves.state.isMusicPlaying = true;
    leaves.state.syncedLyrics = [{
      time_ms: 1000,
      text: 'one'
    }, {
      time_ms: 2000,
      text: 'two'
    }, {
      time_ms: 3000,
      text: 'three'
    }, {
      time_ms: 4000,
      text: 'four'
    }, {
      time_ms: 5000,
      text: 'five'
    }];
    leaves.state.currentPositionMs = 1000;
    expect(text(byClass(renderHook(SongTab), 'current'))).toBe('one');
    leaves.state.currentPositionMs = 3500;
    expect(text(byClass(renderHook(SongTab), 'current'))).toBe('three');
    leaves.state.currentPositionMs = 9999;
    expect(text(byClass(renderHook(SongTab), 'current'))).toBe('five');
    leaves.state.timerData.state = 'running';
    leaves.state.timerData.remainingSeconds = 61;
    expect(text(byClass(renderHook(SongTab), 'ov-timer'))).toBe('01:01');
  });
  it('karaoke renders absent/empty syllables as text and computes before, active, completed and zero duration progress', async () => {
    leaves.karaoke.mockResolvedValue(true);
    leaves.state.syncedLyrics = [{
      time_ms: 1000,
      text: 'plain',
      syllables: []
    }];
    leaves.state.currentPositionMs = 1000;
    renderHook(SongTab);
    flushHookEffects();
    await settleHook();
    expect(text(byClass(renderHook(SongTab), 'current'))).toBe('plain');
    leaves.state.syncedLyrics = [{
      time_ms: 1000,
      text: 'abcd',
      syllables: [{
        text: 'a',
        start_offset_ms: 1000,
        duration_ms: 1000
      }, {
        text: 'b',
        start_offset_ms: 0,
        duration_ms: 1000
      }, {
        text: 'c',
        start_offset_ms: 0,
        duration_ms: 100
      }, {
        text: 'd',
        start_offset_ms: 1000,
        duration_ms: 0
      }]
    }];
    leaves.state.currentPositionMs = 1500;
    const current = byClass(renderHook(SongTab), 'current');
    const marquee = current.props.children as ReactElement<{
      children: ReactElement<Record<string, unknown>>;
    }>;
    const inner = marquee.props.children;
    unmountHook();
    resetHook();
    const tree = renderHook(inner.type as (props: Record<string, unknown>) => ReactElement, inner.props);
    expect(elements(tree).filter((node) => node.props.className === 'ov-lrc-syllable').map((node) => node.props.style)).toEqual([{
      '--syl-prog': '0.00%'
    }, {
      '--syl-prog': '50.00%'
    }, {
      '--syl-prog': '100.00%'
    }, {
      '--syl-prog': '0.00%'
    }]);
  });
  it('Marquee missing refs and late missing inner remain safe; observers resize and disconnect', () => {
    leaves.state.syncedLyrics = [{
      time_ms: 0,
      text: 'long'
    }];
    const node = child('MarqueeLyricText');
    resetHook();
    let tree = runChild(node);
    flushHookEffects();
    expect(elements(tree).some((element) => String(element.props.className).includes('scrolling'))).toBe(false);
    unmountHook();
    resetHook();
    tree = runChild(node);
    const outer = {
      clientWidth: 100
    };
    const inner = {
      scrollWidth: 160
    };
    attach(byClass(tree, 'ov-lrc-marquee-wrap'), outer);
    attach(byClass(tree, 'ov-lrc-marquee-inner'), inner);
    flushHookEffects();
    expect(observe).toHaveBeenCalledWith(outer);
    tree = runChild(node);
    expect(byClass(tree, 'scrolling').props.style).toEqual({
      '--marquee-dist': '-60px',
      '--marquee-dur': '3s'
    });
    inner.scrollWidth = 250;
    resize?.();
    expect(byClass(runChild(node), 'scrolling').props.style).toEqual({
      '--marquee-dist': '-150px',
      '--marquee-dur': '5s'
    });
    inner.scrollWidth = 101;
    resize?.();
    expect(elements(runChild(node)).some((element) => String(element.props.className).includes('scrolling'))).toBe(false);
    attach(byClass(tree, 'ov-lrc-marquee-inner'), null);
    resize?.();
    expect(elements(runChild(node)).some((element) => String(element.props.className).includes('scrolling'))).toBe(false);
    unmountHook();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
  it.each(['playing', 'paused'] as const)('wave %s sizes real canvas, draws all layers and cleans latest frame', (playing) => {
    leaves.state.isPlaying = playing === 'playing';
    const node = child('WaveCanvas');
    resetHook();
    const tree = runChild(node);
    const {
      context,
      native
    } = canvas();
    attach(byClass(tree, 'ov-wave-canvas'), native);
    flushHookEffects();
    expect(raf.size).toBe(1);
    tick();
    expect(native).toMatchObject({
      width: 12,
      height: 40,
      style: {
        width: '6px',
        height: '20px'
      }
    });
    expect(context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 6, 20);
    expect(context.moveTo).toHaveBeenCalledTimes(3);
    expect(context.lineTo).toHaveBeenCalledTimes(9);
    expect(context.stroke).toHaveBeenCalledTimes(3);
    const firstY = context.moveTo.mock.calls[0]?.[1];
    tick();
    expect(context.setTransform).toHaveBeenCalledTimes(1);
    expect(context.moveTo.mock.calls[3]?.[1] === firstY).toBe(playing === 'paused');
    expect(context.strokeStyle).toBe('rgba(20, 30, 40, 0.07)');
    unmountHook();
    expect(cancel).toHaveBeenCalledWith(nextFrame);
    expect(raf.size).toBe(0);
  });
  it.each(['missing-canvas', 'missing-parent', 'missing-context'] as const)('wave native %s defensive edge executes without controls', (stage) => {
    const node = child('WaveCanvas');
    resetHook();
    const tree = runChild(node);
    const {
      context,
      native
    } = canvas();
    if (stage === 'missing-parent') native.parentElement = null;
    if (stage === 'missing-context') native.getContext.mockReturnValue(null);
    if (stage !== 'missing-canvas') attach(byClass(tree, 'ov-wave-canvas'), native);
    flushHookEffects();
    tick();
    expect(context.setTransform).not.toHaveBeenCalled();
    if (stage !== 'missing-parent') expect(context.stroke).not.toHaveBeenCalled();else expect(context.stroke).toHaveBeenCalledTimes(3);
  });
});
