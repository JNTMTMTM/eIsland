/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * Licensed under the GNU General Public License, version 3 or later.
 */

/**
 * @file songTab.test.tsx
 * @description 验证最大展开歌曲页完整双语歌词、跳转与播放反馈、滚动跟随及空状态。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cloneElement, isValidElement, type ReactNode } from 'react';
import { elements, findElement, invoke, textContent, type TestElement } from '../../../../../../test/elementHarness';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../../../../components/test/contentLifecycleHarness';
import SongTab from '../SongTab';
import SongArtwork from '../SongArtwork';
import SongLyricsPanel from '../SongLyricsPanel';
import SongLyricsSkeleton from '../SongLyricsSkeleton';
import SongPlayerBar from '../SongPlayerBar';
import { KaraokeSyllableLine } from '../../../../../lyrics/components/KaraokeSyllableLine';
import type { SyncedLyricLine } from '../../../../../../../store/types';
import type { SongArtworkProps, SongLyricsPanelProps, SongPlayerBarProps } from '../../types/songTypes';

const model = vi.hoisted(() => ({
  karaokeEnabled: false,
  store: {
    mediaInfo: { title: 'Song', artist: 'Artist', album: 'Album' }, coverImage: 'cover.jpg', dominantColor: [30, 50, 80],
    isMusicPlaying: true, isPlaying: true, lyricsLoading: false, currentPositionMs: 1500, currentDurationMs: 60000,
    syncedLyrics: [{ time_ms: 1000, text: 'First' }, { time_ms: 2000, text: 'Second' }, { time_ms: 3000, text: 'Third' }] as SyncedLyricLine[],
    translationLyrics: { status: 'available', lines: [{ time_ms: 1000, text: '第一句' }] },
  },
  mediaSeek: vi.fn(),
}));
vi.mock('react', async (load) => {
  const actual = await load<typeof import('react')>();
  // Mock 会提升到导入之前；动态读取调度器，避免 React 导入先于其初始化。
  const harness = await import('../../../../../../test/elementHarness');
  const lifecycle = await import('../../../../../../components/test/contentLifecycleHarness');
  return { ...actual, ...harness.hookMocks, ...lifecycle.lifecycleHooks, useLayoutEffect: lifecycle.lifecycleHooks.useEffect };
});
vi.mock('zustand/react/shallow', () => ({ useShallow: <T,>(selector: T): T => selector }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../../../lyrics/hooks/useLyricsSettings', () => ({ useLyricsSettings: () => ({ karaokeEnabled: model.karaokeEnabled }) }));
vi.mock('../../hooks/useSongLyricsWheel', () => ({ default: () => undefined }));
vi.mock('../../../../../../../store/slices', () => ({ default: (selector: (store: typeof model.store) => unknown) => selector(model.store) }));
const scrollTo = vi.fn();
let active: object | null;
let slider: EventTarget & { value: string };
let sliderKey: string | null;

/**
 * 展开拆出的纯展示组件，共享逐字及轮播控件继续作为原有叶节点边界。
 * @param value - 真实入口返回的组件树。
 * @returns 可断言交互与文案的完整歌曲展示树。
 */
function expandSongViews(value: ReactNode): ReactNode {
  if (Array.isArray(value)) return value.map(expandSongViews);
  if (!isValidElement(value)) return value;
  const element = value as TestElement;
  if (element.type === SongArtwork) return expandSongViews(SongArtwork(element.props as unknown as SongArtworkProps));
  if (element.type === SongLyricsPanel) return expandSongViews(SongLyricsPanel(element.props as unknown as SongLyricsPanelProps));
  if (element.type === SongLyricsSkeleton) return expandSongViews(SongLyricsSkeleton());
  if (element.type === SongPlayerBar) return expandSongViews(SongPlayerBar(element.props as unknown as SongPlayerBarProps));
  return cloneElement(element, undefined, expandSongViews(element.props.children));
}

/**
 * 绑定歌词滚动容器并执行真实 effect。
 * @returns 歌曲页元素树。
 */
function render(): TestElement {
  const tree = renderWithHooks(() => expandSongViews(SongTab())) as TestElement;
  const viewport = elements(tree).find((node) => node.props.className === 'song-lyrics');
  if (viewport) {
    (viewport.props.ref as { current: unknown }).current = { scrollTo, offsetTop: 10, clientHeight: 400, querySelector: () => active };
  }
  const progress = elements(tree).find((node) => node.props.className === 'song-progress-slider');
  if (progress) {
    if (sliderKey !== progress.key) {
      slider = Object.assign(new EventTarget(), { value: '0' });
      sliderKey = progress.key;
    }
    slider.value = String(progress.props.value);
    (progress.props.ref as { current: unknown }).current = slider;
  }
  runEffects();
  return tree;
}

/**
 * 查找歌曲页中的歌词按钮。
 * @param tree - 歌曲页元素树。
 * @returns 所有完整歌词块。
 */
function blocks(tree: TestElement): TestElement[] {
  return elements(tree).filter((node) => node.props.className === 'song-lyric-block');
}

beforeEach(() => {
  resetLifecycle();
  vi.useFakeTimers();
  vi.clearAllMocks();
  model.karaokeEnabled = false;
  model.store.mediaInfo = { title: 'Song', artist: 'Artist', album: 'Album' };
  model.store.syncedLyrics = [{ time_ms: 1000, text: 'First' }, { time_ms: 2000, text: 'Second' }, { time_ms: 3000, text: 'Third' }];
  Object.assign(model.store, { isMusicPlaying: true, lyricsLoading: false, currentPositionMs: 1500, currentDurationMs: 60000 });
  model.mediaSeek.mockResolvedValue({ success: true });
  slider = Object.assign(new EventTarget(), { value: '0' });
  sliderKey = null;
  active = { offsetTop: 500, offsetHeight: 100 };
  vi.stubGlobal('ResizeObserver', class {
    observe = vi.fn();

    disconnect = vi.fn();
  });
  vi.stubGlobal('window', { setTimeout, clearTimeout, api: { mediaSeek: model.mediaSeek, onNowPlayingInfo: () => () => {} }, matchMedia: () => ({ matches: false }) });
});
afterEach(() => { unmountHooks(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('maxExpand SongTab', () => {
  it('底部进度条跟随播放时间，时长未知时禁用拖动', () => {
    let tree = render();
    const progress = (): TestElement => findElement(tree, (node) => node.props.className === 'song-progress-slider');
    expect(progress().props).toMatchObject({ value: 1500, max: 60000, disabled: false });
    expect(textContent(findElement(tree, (node) => node.props.className === 'song-player-times'))).toBe('00:01 / 01:00');
    model.store.currentPositionMs = 20000;
    tree = render();
    expect(progress().props.value).toBe(20000);
    model.store.currentDurationMs = 0;
    render(); tree = render();
    expect(progress().props).toMatchObject({ value: 0, max: 1, disabled: true });
  });
  it('拖动进度只预览，松手后跳转；失败时恢复实际播放位置', async () => {
    model.mediaSeek.mockResolvedValue({ success: false });
    let tree = render();
    invoke(findElement(tree, (node) => node.props.className === 'song-progress-slider'), 'onChange', { currentTarget: { value: '45000' } });
    tree = render();
    expect(model.mediaSeek).not.toHaveBeenCalled();
    expect(findElement(tree, (node) => node.props.className === 'song-progress-slider').props.value).toBe(45000);
    slider.dispatchEvent(new Event('change'));
    tree = render();
    expect(model.mediaSeek).toHaveBeenCalledExactlyOnceWith(45000);
    expect(findElement(tree, (node) => node.props.className === 'song-progress-slider').props.value).toBe(45000);
    await Promise.resolve(); await Promise.resolve();
    tree = render();
    expect(findElement(tree, (node) => node.props.className === 'song-progress-slider').props.value).toBe(1500);
  });
  it('换歌丢弃未完成的进度预览，旧滑块不再提交跳转', () => {
    const tree = render();
    invoke(findElement(tree, (node) => node.props.className === 'song-progress-slider'), 'onChange', { currentTarget: { value: '45000' } });
    render();
    const oldSlider = slider;
    model.store.mediaInfo = { title: 'New song', artist: 'Artist', album: '' };
    model.store.currentPositionMs = 5000;
    render();
    const updated = render();
    oldSlider.dispatchEvent(new Event('change'));
    expect(model.mediaSeek).not.toHaveBeenCalled();
    expect(findElement(updated, (node) => node.props.className === 'song-progress-slider').props.value).toBe(5000);
  });
  it('首次显示和更换歌词都默认归顶，下一次播放切行恢复居中', () => {
    render();
    vi.advanceTimersByTime(0);
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: 'instant' });
    expect(scrollTo).toHaveBeenCalledOnce();
    model.store.currentPositionMs = 2500;
    render(); vi.advanceTimersByTime(0);
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 350, behavior: 'smooth' });
    model.store.syncedLyrics = model.store.syncedLyrics.map((line) => ({ ...line, text: `${line.text} new` }));
    render(); vi.advanceTimersByTime(0);
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: 'instant' });
  });
  it('切歌后异步歌词显示时重新归顶，并清除上一首的浏览定时器', () => {
    const tree = render();
    invoke(findElement(tree, (node) => node.props.className === 'song-lyrics'), 'onWheel');
    model.store.mediaInfo = { title: 'New song', artist: 'Artist', album: '' };
    model.store.lyricsLoading = true;
    render();
    model.store.lyricsLoading = false;
    model.store.syncedLyrics = [{ time_ms: 0, text: 'New first' }, { time_ms: 3000, text: 'New second' }];
    scrollTo.mockClear();
    render(); vi.advanceTimersByTime(5000);
    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 0, behavior: 'instant' });
  });
  it('仅当前句使用原始音节与播放进度扫光，关闭逐字或遇到普通行时回退整行文字', () => {
    model.karaokeEnabled = true;
    const syllables = [{ text: 'First', start_offset_ms: 0, duration_ms: 1000 }];
    model.store.syncedLyrics = [{ syllables, time_ms: 1000, text: 'First', duration_ms: 1000 }, { time_ms: 2000, text: 'Second' }];
    let tree = render();
    const karaoke = findElement(tree, (node) => node.type === KaraokeSyllableLine);
    expect(karaoke.props).toMatchObject({ syllables, lineStartMs: 1000, posMs: 1500 });
    model.store.currentPositionMs = 2500;
    tree = render();
    expect(elements(tree).filter((node) => node.type === KaraokeSyllableLine)).toHaveLength(0);
    expect(blocks(tree)[1].props['aria-current']).toBe('true');
    expect(textContent(blocks(tree)[1])).toBe('Second');
    model.store.currentPositionMs = 1500;
    model.karaokeEnabled = false;
    tree = render();
    expect(elements(tree).filter((node) => node.type === KaraokeSyllableLine)).toHaveLength(0);
    expect(textContent(blocks(tree)[0])).toBe('First第一句');
  });
  it('展示完整歌词、封面与翻译，并随实际进度高亮当前句', () => {
    let tree = render();
    expect(blocks(tree).map(textContent)).toEqual(['First第一句', 'Second', 'Third']);
    expect(findElement(tree, (node) => node.type === 'img' && node.props.src === 'cover.jpg').props.alt).toBe('Song');
    expect(blocks(tree)[0].props['aria-current']).toBe('true');
    model.store.currentPositionMs = 2500;
    tree = render();
    expect(blocks(tree)[1].props['aria-current']).toBe('true');
  });
  it('点击歌词跳转对应时间并立即高亮；失败后恢复实际位置', async () => {
    model.mediaSeek.mockResolvedValue({ success: false });
    invoke(blocks(render())[2], 'onClick', { currentTarget: { dataset: { time: '3000' } } });
    expect(model.mediaSeek).toHaveBeenCalledWith(3000);
    expect(blocks(render())[2].props['aria-current']).toBe('true');
    await Promise.resolve(); await Promise.resolve();
    expect(blocks(render())[0].props['aria-current']).toBe('true');
  });
  it('未知时长仍展示歌词，但不允许跳转', () => {
    model.store.currentDurationMs = 0;
    const tree = render();
    expect(blocks(tree)).toHaveLength(3);
    expect(blocks(tree).every((block) => block.props.disabled === true)).toBe(true);
    invoke(blocks(tree)[1], 'onClick', { currentTarget: { dataset: { time: '2000' } } });
    expect(model.mediaSeek).not.toHaveBeenCalled();
  });
  it('手动浏览暂停自动居中，停止操作四秒后恢复；卸载清理定时器', () => {
    render();
    model.store.currentPositionMs = 2500;
    const tree = render();
    vi.advanceTimersByTime(0);
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 350, behavior: 'smooth' });
    scrollTo.mockClear();
    invoke(findElement(tree, (node) => node.props.className === 'song-lyrics'), 'onWheel');
    model.store.currentPositionMs = 3500;
    render();
    vi.advanceTimersByTime(3999);
    expect(scrollTo).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(scrollTo).toHaveBeenCalledOnce();
    unmountHooks();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('前奏不高亮，加载中或停止播放时提供对应提示', () => {
    model.store.currentPositionMs = 0;
    expect(blocks(render()).every((block) => block.props['aria-current'] === undefined)).toBe(true);
    model.store.lyricsLoading = true;
    let tree = render();
    expect(findElement(tree, (node) => node.props.role === 'status').props).toMatchObject({ 'aria-label': 'songTab.lyrics.loading', 'aria-busy': 'true' });
    expect(blocks(tree)).toHaveLength(0);
    model.store.lyricsLoading = false;
    tree = render();
    expect(blocks(tree)).toHaveLength(3);
    expect(elements(tree).some((node) => node.props.className === 'song-lyrics-skeleton')).toBe(false);
    model.store.lyricsLoading = true;
    model.store.isMusicPlaying = false;
    tree = render();
    expect(textContent(tree)).toContain('songTab.onboarding.hint');
    expect(elements(tree).some((node) => node.props.className === 'song-lyrics-skeleton')).toBe(false);
  });
});
