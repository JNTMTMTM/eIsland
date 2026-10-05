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
 * @file dynamicIsland.test.ts
 * @description DynamicIsland 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DynamicIsland from '../DynamicIsland';
import { elementProps, findElement, invoke, resetState } from './elementHarness';
const store = vi.hoisted(() => ({ state: 'idle', animationSpeed: 'medium', springAnimation: true, weather: {}, timerData: null as null | {
  state: string;
  remainingSeconds: number;
}, notification: { title: 'Title', body: 'Body' }, pomodoroRunning: false, pomodoroRemaining: 0 }));
const shell = vi.hoisted(() => ({ handleIslandClick: vi.fn(), shellClassName: 'island-test', shellStyle: { opacity: 0.5 }, timeStr: '12:00', dayStr: 'Tuesday', fullTimeStr: '12:00:00', lunarStr: 'Lunar', bgMedia: null, bgVideoElementRef: { current: null }, bgVideoHwDecode: true, bgVideoMuted: true, bgVideoVolume: 0.6, bgVideoFit: 'cover', handleVideoLoadedMetadata: vi.fn(), handleVideoCanPlay: vi.fn() }));
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('./elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
vi.mock('zustand/react/shallow', () => ({ useShallow: (selector: unknown) => selector }));
vi.mock('../../store/isLandStore', () => ({ default: () => store }));
vi.mock('../hooks/useDynamicIslandCoordinator', () => ({ useDynamicIslandCoordinator: () => shell }));
vi.mock('../states/maxExpand/hooks/usePerformanceMode', () => ({ usePerformanceMode: () => true }));
vi.mock('../components/DynamicIslandStateContent', () => ({ DynamicIslandStateContent: vi.fn() }));
vi.mock('../states/maxExpand/maxExpandTransitionLoading', () => ({ default: vi.fn() }));
vi.mock('../states/expand/expandedTransitionLoading', () => ({ default: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
  store.timerData = null;
  store.state = 'idle';
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('DynamicIsland', () => {
  it('renders shell interaction and supplies idle timer defaults when no timer exists', () => {
    const tree = DynamicIsland();
    expect(elementProps(tree)).toMatchObject({ className: 'island-test', style: { opacity: 0.5 } });
    invoke(findElement(tree, (node) => elementProps(node).className === 'island-test'), 'onClick');
    expect(shell.handleIslandClick).toHaveBeenCalledOnce();
    const content = findElement(tree, (node) => 'timerState' in elementProps(node));
    expect(elementProps(content)).toMatchObject({ state: 'idle', timerState: 'idle', remainingSeconds: 0, fullTimeStr: '12:00:00' });
  });
  it.each(['expanded', 'maxExpand'])('selects loading fallback for %s and forwards active timer', (state) => {
    store.state = state;
    store.timerData = { state: 'running', remainingSeconds: 15 };
    const tree = DynamicIsland();
    const transition = findElement(tree, (node) => 'fallback' in elementProps(node));
    expect(elementProps(transition).fallback).not.toBeNull();
    expect(elementProps(transition).performanceModeEnabled).toBe(true);
    expect(elementProps(findElement(tree, (node) => 'timerState' in node.props))).toMatchObject({ timerState: 'running', remainingSeconds: 15 });
  });
});
