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
 * @file trayMusicSeekBar.test.tsx
 * @description 托盘音乐进度条的连续推进、仅在菜单显示时计时、拖动预览与松手跳转测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../test/contentLifecycleHarness';
import { elements, findElement, hookMocks, invoke, textContent } from '../../../../test/elementHarness';
import { TrayMusicSeekBar } from '../TrayMusicSeekBar';
import type { TestElement } from '../../../../test/elementHarness';
import type { TrayNowPlaying } from '../../types';

vi.mock('react', async (load) => ({
  ...(await load<typeof import('react')>()),
  ...hookMocks,
  ...lifecycleHooks,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { position?: string; duration?: string }) => (options ? `${key}:${options.position}/${options.duration}` : key),
  }),
}));

const SONG: TrayNowPlaying = {
  title: 'Song', artist: 'Singer', isPlaying: true, thumbnail: null,
  durationMs: 180000, positionMs: 60000, positionTimestampMs: 10000, playbackRate: 1,
};

/** 可派发原生 change 事件、带当前值的滑块 DOM 替身。 */
type SliderStub = EventTarget & { value: string };

let slider: SliderStub;
const onSeek = vi.fn<(positionMs: number) => void>();

beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
  vi.useFakeTimers({ now: 10000 });
  slider = Object.assign(new EventTarget(), { value: '0' });
  vi.stubGlobal('window', Object.assign(new EventTarget(), {
    setInterval: (callback: () => void, ms: number) => setInterval(callback, ms),
    clearInterval: (id: ReturnType<typeof setInterval>) => clearInterval(id),
  }));
});

afterEach(() => {
  unmountHooks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/**
 * 渲染进度条，并把滑块 ref 绑定到 DOM 替身后执行待处理 effect。
 * @param nowPlaying - 当前播放信息。
 * @param active - 菜单是否正在显示。
 * @returns 进度条元素。
 */
function render(nowPlaying: TrayNowPlaying = SONG, active = true): TestElement {
  const view = renderWithHooks(() => TrayMusicSeekBar({ nowPlaying, active, onSeek })) as TestElement;
  const ref = findElement(view, (node) => node.type === 'input').props.ref as { current: unknown };
  ref.current = slider;
  runEffects();
  return view;
}

/**
 * 读取进度条中的滑块元素。
 * @param view - 进度条元素。
 * @returns 滑块元素。
 */
function input(view: TestElement): TestElement {
  return findElement(view, (node) => node.type === 'input');
}

/**
 * 读取进度条两侧的时间文本。
 * @param view - 进度条元素。
 * @returns [当前进度, 总时长]。
 */
function times(view: TestElement): string[] {
  return elements(view).filter((node) => node.type === 'span').map((node) => textContent(node));
}

describe('TrayMusicSeekBar', () => {
  it('shows the estimated position, the duration and the filled share of the track', () => {
    vi.setSystemTime(12500);
    const view = render();
    expect(view.props.className).toBe('tray-music-seek');
    expect(input(view).props).toMatchObject({
      className: 'tray-music-seek-slider', type: 'range', min: 0, max: 180000, step: 'any', value: 62500,
      'aria-label': 'tray.music.seek', 'aria-valuetext': 'tray.music.seekValue:1:02/3:00',
    });
    expect(input(view).props.style).toEqual({ '--tray-seek-progress': `${(62500 / 180000) * 100}%` });
    expect(times(view)).toEqual(['1:02', '3:00']);
  });

  it('moves continuously every quarter second while playing and stops at the duration', () => {
    render();
    vi.advanceTimersByTime(250);
    expect(input(render()).props.value).toBe(60250);
    vi.advanceTimersByTime(1250);
    expect(times(render())).toEqual(['1:01', '3:00']);
    expect(input(render()).props.value).toBe(61500);
    vi.advanceTimersByTime(500000);
    expect(times(render())).toEqual(['3:00', '3:00']);
  });

  it('stays still when mounted behind a hidden menu and ticks only while the menu is showing', () => {
    render(SONG, false);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(5000);
    expect(input(render(SONG, false)).props.value).toBe(60000);
    render(SONG, true);
    expect(input(render(SONG, true)).props.value).toBe(65000);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(1000);
    expect(input(render(SONG, true)).props.value).toBe(66000);
    render(SONG, false);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(5000);
    expect(input(render(SONG, false)).props.value).toBe(66000);
  });

  it.each([
    { name: 'paused', nowPlaying: { ...SONG, isPlaying: false } },
    { name: 'playing at rate 0', nowPlaying: { ...SONG, playbackRate: 0 } },
  ])('holds the sampled position when $name', ({ nowPlaying }) => {
    render(nowPlaying);
    vi.advanceTimersByTime(5000);
    expect(input(render(nowPlaying)).props.value).toBe(60000);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('previews while dragging and seeks only when the native change commits', () => {
    const view = render();
    invoke(input(view), 'onChange', { currentTarget: { value: '120000' } });
    vi.advanceTimersByTime(3000);
    const dragging = render();
    expect(input(dragging).props.value).toBe(120000);
    expect(times(dragging)).toEqual(['2:00', '3:00']);
    expect(onSeek).not.toHaveBeenCalled();
    slider.value = '120000.4';
    slider.dispatchEvent(new Event('change'));
    expect(onSeek).toHaveBeenCalledExactlyOnceWith(120000);
    expect(input(render()).props.value).toBe(63000);
  });

  it('leaves window focus to the menu state and releases the slider and timer listeners on unmount', () => {
    const addWindowListener = vi.spyOn(window, 'addEventListener');
    render();
    expect(addWindowListener).not.toHaveBeenCalled();
    unmountHooks();
    expect(vi.getTimerCount()).toBe(0);
    slider.dispatchEvent(new Event('change'));
    expect(onSeek).not.toHaveBeenCalled();
  });
});
