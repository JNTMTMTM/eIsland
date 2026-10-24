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
 * @file lyricsProgress.test.tsx
 * @description 歌词页进度条跟随真实 store 播放时钟、拖动预览与松手跳转、等待播放器回报与超时回退测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../../../../components/test/contentLifecycleHarness';
import { elements, findElement, hookMocks, invoke, textContent } from '../../../../../../test/elementHarness';
import useIslandStore from '../../../../../../../store/slices';
import { LyricsProgress } from '../LyricsProgress';
import type { TestElement } from '../../../../../../test/elementHarness';

vi.hoisted(() => {
  vi.stubGlobal('window', Object.assign(new EventTarget(), { location: { hostname: 'localhost' } }));
  vi.stubGlobal('localStorage', { getItem: () => null });
});
// Zustand 外部包的 React 订阅适配不参与局部调度；保留真实 selector 和原始 store。
vi.mock('zustand/react/shallow', () => ({ useShallow: <T,>(selector: T): T => selector }));
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
vi.mock('react-i18next', async (load) => ({
  ...(await load<typeof import('react-i18next')>()),
  useTranslation: () => ({
    t: (key: string, options?: { position?: string; duration?: string }) => (options?.position === undefined ? key : `${key}:${options.position}/${options.duration}`),
  }),
}));
vi.mock('../../../../../../../store/slices', async (load) => {
  const actual = await load<typeof import('../../../../../../../store/slices')>();
  const bound = Object.assign(<T,>(selector: (state: ReturnType<typeof actual.default.getState>) => T): T => selector(actual.default.getState()), actual.default);
  return { ...actual, default: bound };
});

/** 可派发原生 change 事件、带当前值的滑块 DOM 替身。 */
type SliderStub = EventTarget & { value: string };

let slider: SliderStub;
const mediaSeek = vi.fn<(positionMs: number) => Promise<void>>();

beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
  vi.useFakeTimers();
  mediaSeek.mockResolvedValue(undefined);
  slider = Object.assign(new EventTarget(), { value: '0' });
  vi.stubGlobal('window', Object.assign(new EventTarget(), {
    api: { mediaSeek },
    location: { hostname: 'localhost' },
    setTimeout: (callback: () => void, ms: number) => setTimeout(callback, ms),
    clearTimeout: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
  }));
  useIslandStore.setState({ currentPositionMs: 60000, currentDurationMs: 180000 });
});

afterEach(() => {
  unmountHooks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/**
 * 读取进度条中的滑块元素。
 * @param view - 进度条元素。
 * @returns 滑块元素。
 */
function input(view: TestElement): TestElement {
  return findElement(view, (node) => node.type === 'input');
}

/**
 * 渲染进度条，并把滑块 ref 绑定到 DOM 替身后执行待处理 effect。
 * @returns 进度条元素。
 */
function render(): TestElement {
  const view = renderWithHooks(LyricsProgress) as TestElement;
  const ref = input(view).props.ref as { current: unknown };
  ref.current = slider;
  runEffects();
  return view;
}

/**
 * 读取进度条下方的时间文本。
 * @param view - 进度条元素。
 * @returns [当前进度, 总时长]。
 */
function times(view: TestElement): string[] {
  return elements(view).filter((node) => node.type === 'span').map((node) => textContent(node));
}

/**
 * 拖动到目标位置后松手，派发原生 change 事件提交跳转。
 * @param value - 松手时滑块的值。
 */
function commit(value: string): void {
  invoke(input(render()), 'onChange', { currentTarget: { value } });
  slider.value = value;
  slider.dispatchEvent(new Event('change'));
}

describe('LyricsProgress', () => {
  it('shows the store position, the duration and the filled share of the track', () => {
    useIslandStore.setState({ currentPositionMs: 62500 });
    const view = render();
    expect(view.props.className).toBe('lrc-progress');
    expect(input(view).props).toMatchObject({
      className: 'lrc-progress-slider', type: 'range', min: 0, max: 180000, step: 'any', value: 62500,
      'aria-label': 'hover.music.seek', 'aria-valuetext': 'hover.music.seekValue:1:02/3:00',
    });
    expect(input(view).props.style).toEqual({ '--lrc-progress': `${(62500 / 180000) * 100}%` });
    expect(times(view)).toEqual(['1:02', '3:00']);
  });

  it('follows the playback clock in the store and never passes the duration', () => {
    render();
    useIslandStore.setState({ currentPositionMs: 61000 });
    expect(input(render()).props.value).toBe(61000);
    useIslandStore.setState({ currentPositionMs: 200000 });
    const ended = render();
    expect(input(ended).props.value).toBe(180000);
    expect(times(ended)).toEqual(['3:00', '3:00']);
  });

  it('previews while dragging and seeks only when the native change commits', () => {
    invoke(input(render()), 'onChange', { currentTarget: { value: '120000' } });
    const dragging = render();
    expect(input(dragging).props.value).toBe(120000);
    expect(times(dragging)).toEqual(['2:00', '3:00']);
    expect(mediaSeek).not.toHaveBeenCalled();
    slider.value = '120000.4';
    slider.dispatchEvent(new Event('change'));
    expect(mediaSeek).toHaveBeenCalledExactlyOnceWith(120000);
  });

  it('holds the seek target until the player reports the new position, then follows the store', () => {
    commit('120000');
    expect(input(render()).props.value).toBe(120000);
    useIslandStore.setState({ currentPositionMs: 120400 });
    expect(input(render()).props.value).toBe(120400);
    vi.advanceTimersByTime(1000);
    useIslandStore.setState({ currentPositionMs: 125000 });
    expect(input(render()).props.value).toBe(125000);
  });

  it('returns to the real position when the player never reports the seek', () => {
    commit('120000');
    render();
    vi.advanceTimersByTime(999);
    expect(input(render()).props.value).toBe(120000);
    vi.advanceTimersByTime(1);
    expect(input(render()).props.value).toBe(60000);
  });

  it('ignores a rejected seek request', async () => {
    mediaSeek.mockRejectedValueOnce(new Error('seek unavailable'));
    commit('120000');
    await Promise.resolve();
    expect(mediaSeek).toHaveBeenCalledExactlyOnceWith(120000);
  });

  it('releases the slider listener and the settle timer on unmount', () => {
    commit('120000');
    render();
    expect(vi.getTimerCount()).toBe(1);
    unmountHooks();
    expect(vi.getTimerCount()).toBe(0);
    slider.dispatchEvent(new Event('change'));
    expect(mediaSeek).toHaveBeenCalledOnce();
  });
});
