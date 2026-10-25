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
import { hookMocks, elements, findElement, invoke, textContent, type TestElement } from '../../../../../../test/elementHarness';
import { lifecycleHooks, renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../../../../components/test/contentLifecycleHarness';
import SongTab from '../SongTab';

const model = vi.hoisted(() => ({
  store: {
    mediaInfo: { title: 'Song', artist: 'Artist', album: 'Album' }, coverImage: 'cover.jpg', dominantColor: [30, 50, 80],
    isMusicPlaying: true, isPlaying: true, lyricsLoading: false, currentPositionMs: 1500, currentDurationMs: 60000,
    syncedLyrics: [{ time_ms: 1000, text: 'First' }, { time_ms: 2000, text: 'Second' }, { time_ms: 3000, text: 'Third' }],
    translationLyrics: { status: 'available', lines: [{ time_ms: 1000, text: '第一句' }] },
  },
  mediaSeek: vi.fn(),
}));
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
vi.mock('zustand/react/shallow', () => ({ useShallow: <T,>(selector: T): T => selector }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../../../../../store/slices', () => ({ default: (selector: (store: typeof model.store) => unknown) => selector(model.store) }));
const scrollTo = vi.fn();
let active: object | null;

/**
 * 绑定歌词滚动容器并执行真实 effect。
 * @returns 歌曲页元素树。
 */
function render(): TestElement {
  const tree = renderWithHooks(SongTab) as TestElement;
  const viewport = elements(tree).find((node) => node.props.className === 'song-lyrics');
  if (viewport) {
    (viewport.props.ref as { current: unknown }).current = { scrollTo, offsetTop: 10, clientHeight: 400, querySelector: () => active };
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
  Object.assign(model.store, { isMusicPlaying: true, lyricsLoading: false, currentPositionMs: 1500, currentDurationMs: 60000 });
  model.mediaSeek.mockResolvedValue({ success: true });
  active = { offsetTop: 500, offsetHeight: 100 };
  vi.stubGlobal('ResizeObserver', class {
    observe = vi.fn();

    disconnect = vi.fn();
  });
  vi.stubGlobal('window', { setTimeout, clearTimeout, api: { mediaSeek: model.mediaSeek, onNowPlayingInfo: () => () => {} }, matchMedia: () => ({ matches: false }) });
});
afterEach(() => { unmountHooks(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('maxExpand SongTab', () => {
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
    const tree = render();
    vi.advanceTimersByTime(0);
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 350, behavior: 'smooth' });
    scrollTo.mockClear();
    invoke(findElement(tree, (node) => node.props.className === 'song-lyrics'), 'onWheel');
    model.store.currentPositionMs = 2500;
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
    expect(textContent(render())).toContain('songTab.lyrics.loading');
    model.store.isMusicPlaying = false;
    expect(textContent(render())).toContain('songTab.onboarding.hint');
  });
});
