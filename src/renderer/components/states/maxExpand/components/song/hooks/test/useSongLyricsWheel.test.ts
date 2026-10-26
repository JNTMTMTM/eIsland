/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * Licensed under the GNU General Public License, version 3 or later.
 */

/**
 * @file useSongLyricsWheel.test.ts
 * @description 验证轮盘按真实滚动位置变化、滚动帧合并及卸载清理。
 * @author 鸡哥
 */
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../../../../components/test/contentLifecycleHarness';
import useSongLyricsWheel from '../useSongLyricsWheel';

vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...lifecycleHooks }));
const frames = new Map<number, FrameRequestCallback>();
const disconnect = vi.fn();
const lyrics = [{ time_ms: 0, text: 'First' }, { time_ms: 1000, text: 'Current' }, { time_ms: 2000, text: 'Next' }];
let nextFrame = 0;
let container: EventTarget & { scrollTop: number; clientHeight: number };
let styles: Map<string, string>[];
let ref: { current: HTMLDivElement | null };

beforeEach(() => {
  resetLifecycle(); vi.clearAllMocks(); frames.clear(); nextFrame = 0;
  styles = lyrics.map(() => new Map<string, string>());
  const rows = lyrics.map((line, index) => ({
    offsetTop: 170 + index * 100, offsetHeight: 60,
    getAttribute: () => line.time_ms === 1000 ? 'true' : null,
    style: { setProperty: (key: string, value: string) => styles[index].set(key, value) },
  }));
  container = Object.assign(new EventTarget(), { scrollTop: 100, clientHeight: 400, querySelectorAll: () => rows });
  ref = { current: container as unknown as HTMLDivElement };
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { const id = ++nextFrame; frames.set(id, callback); return id; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.stubGlobal('ResizeObserver', class {
    observe = vi.fn();

    disconnect = disconnect;
  });
});
afterEach(() => { unmountHooks(); vi.unstubAllGlobals(); });

/**
 * 提交真实轮盘 Hook 的显示状态。
 * @param enabled - 是否显示歌词。
 * @returns 无返回值。
 */
function commit(enabled = true): void {
  renderWithHooks(() => useSongLyricsWheel(ref, lyrics, 1, enabled));
  runEffects();
}

/**
 * 执行当前浏览器动画帧，保留一帧内的事件合并语义。
 * @returns 无返回值。
 */
function paint(): void {
  const pending = [...frames.values()]; frames.clear(); pending.forEach((callback) => callback(0));
}

it('中间歌词正对视线，上下歌词反向倾斜；手动滚动后轮盘跟随可视中心', () => {
  commit(); paint();
  expect(Number.parseFloat(styles[0].get('--song-wheel-angle')!)).toBeGreaterThan(0);
  expect(Number.parseFloat(styles[1].get('--song-wheel-angle')!)).toBe(0);
  expect(Number.parseFloat(styles[2].get('--song-wheel-angle')!)).toBeLessThan(0);
  expect(Number(styles[1].get('--song-wheel-scale'))).toBe(1);
  expect(Number(styles[1].get('--song-wheel-curve'))).toBe(1);
  expect(Number(styles[0].get('--song-wheel-curve'))).toBeLessThan(Number(styles[1].get('--song-wheel-curve')));
  expect(styles[0].get('--song-wheel-curve')).toBe(styles[2].get('--song-wheel-curve'));
  expect(Number(styles[0].get('--song-wheel-opacity'))).toBeLessThan(Number(styles[1].get('--song-wheel-opacity')));
  container.scrollTop = 200; container.dispatchEvent(new Event('scroll')); paint();
  expect(Number.parseFloat(styles[1].get('--song-wheel-angle')!)).toBeGreaterThan(0);
  expect(Number.parseFloat(styles[2].get('--song-wheel-angle')!)).toBe(0);
  expect(Number(styles[2].get('--song-wheel-curve'))).toBe(1);
});

it('连续滚动只请求一帧，隐藏或卸载时清理帧、尺寸观察及滚动监听', () => {
  commit();
  container.dispatchEvent(new Event('scroll')); container.dispatchEvent(new Event('scroll'));
  expect(frames.size).toBe(1);
  commit(false);
  expect(frames.size).toBe(0); expect(disconnect).toHaveBeenCalledOnce();
  container.dispatchEvent(new Event('scroll')); expect(frames.size).toBe(0);
  commit(); expect(frames.size).toBe(1);
  unmountHooks(); expect(frames.size).toBe(0); expect(disconnect).toHaveBeenCalledTimes(2);
});
