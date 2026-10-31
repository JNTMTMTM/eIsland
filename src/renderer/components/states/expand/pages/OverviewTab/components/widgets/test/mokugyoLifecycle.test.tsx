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
 * @file mokugyoLifecycle.test.tsx
 * @description 木鱼真实音量工具、音频叶边界、动画计时器、重复敲击和卸载清理测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MokugyoWidget } from '../MokugyoWidget';
import { byClass, elements, invoke, text } from '../../../../../../test/tree';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../../../../maxExpand/components/setting/hooks/test/settingsCoverageHarness';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../../test/elementHarness')).hookMocks,
  ...(await import('../../../../../../maxExpand/components/setting/hooks/test/settingsCoverageHarness')).lifecycleHooks
}));
const play = vi.fn<() => Promise<void>>();
const pause = vi.fn<() => void>();
const storeRead = vi.fn<Window['api']['storeRead']>();
const frames: FrameRequestCallback[] = [];
let seekThrows: boolean;
let audio: { src: string; preload: string; volume: number; pause: typeof pause; play: typeof play; currentTime: number };
/**
 * 渲染真实木鱼组件，保留交互状态。
 * @returns 组件树。
 */
function view() {
  return renderWithHooks(MokugyoWidget);
}
/**
 * 等待实际音量读取与音频反馈。
 * @returns 回调消费完成。
 */
async function settle(): Promise<void> {
  await Array.from({ length: 12 }).reduce<Promise<void>>((previous) => previous.then(() => undefined), Promise.resolve());
}
beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
  vi.useFakeTimers();
  seekThrows = false;
  frames.length = 0;
  play.mockResolvedValue(undefined);
  storeRead.mockImplementation((key) => Promise.resolve(key === 'sound-volume-global' ? 0.5 : 0.4));
  audio = {
    pause,
    play,
    src: '',
    preload: '',
    volume: 1,
    /**
     * 读取音频叶模拟的当前播放时间。
     * @returns 当前播放时间。
     */
    get currentTime(): number { return 0; },
    /**
     * 模拟原生 seek 操作及其失败。
     * @param value - seek 时间。
     */
    set currentTime(value: number) {
      void value;
      if (seekThrows) throw new Error('seek failed');
    }
  };
  vi.stubGlobal('Audio', class AudioBoundary {
    constructor(src: string) {
      audio.src = src;
      return audio;
    }
  });
  vi.stubGlobal('window', { setTimeout, clearTimeout, api: { storeRead }, requestAnimationFrame: (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; } });
});
afterEach(() => {
  unmountHooks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('MokugyoWidget audio lifecycle', () => {
  it('loads actual effect volume, restarts animations and removes individual floating merits', async () => {
    view();
    runEffects();
    expect(audio.preload).toBe('auto');
    invoke(byClass(view(), 'ov-dash-mokugyo-hit-btn'), 'onClick');
    frames.splice(0).forEach((callback) => callback(0));
    await settle();
    expect(audio.volume).toBe(0.2);
    vi.advanceTimersByTime(1);
    invoke(byClass(view(), 'ov-dash-mokugyo-hit-btn'), 'onClick');
    frames.splice(0).forEach((callback) => callback(0));
    expect(text(byClass(view(), 'ov-dash-mokugyo-count'))).toContain('2');
    expect(byClass(view(), 'ov-dash-mokugyo-icon').props.className).toContain('--hit');
    expect(elements(view()).filter((node) => node.props.className === 'ov-dash-mokugyo-float')).toHaveLength(2);
    vi.advanceTimersByTime(220);
    expect(byClass(view(), 'ov-dash-mokugyo-icon').props.className).not.toContain('--hit');
    vi.advanceTimersByTime(680);
    expect(elements(view()).filter((node) => node.props.className === 'ov-dash-mokugyo-float')).toHaveLength(0);
    unmountHooks();
    expect(pause).toHaveBeenCalledOnce();
    expect(audio.src).toBe('');
    expect(vi.getTimerCount()).toBe(0);
  });
  it('cleans active hit and floating timers when unmounted early', () => {
    view();
    runEffects();
    invoke(byClass(view(), 'ov-dash-mokugyo-hit-btn'), 'onClick');
    unmountHooks();
    expect(vi.getTimerCount()).toBe(0);
    expect(pause).toHaveBeenCalledOnce();
  });
  it('contains audio seek/play failures and sync native volume errors', async () => {
    view();
    runEffects();
    seekThrows = true;
    play.mockRejectedValueOnce(new Error('blocked'));
    invoke(byClass(view(), 'ov-dash-mokugyo-hit-btn'), 'onClick');
    await settle();
    storeRead.mockImplementation(() => { throw new Error('bridge failed'); });
    invoke(byClass(view(), 'ov-dash-mokugyo-hit-btn'), 'onClick');
    await settle();
    expect(audio.volume).toBe(1);
    expect(text(byClass(view(), 'ov-dash-mokugyo-count'))).toContain('2');
  });
});
