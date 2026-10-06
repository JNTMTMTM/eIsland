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
 * @file wallpaperMarketLifecycle.test.tsx
 * @description 壁纸市场真实加载、分页、请求竞争、应用、评分、举报及视频交互生命周期测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deferred, elements, find, flushEffects, render, resetLifecycle, settle, text, trigger, unmount } from '../../about/test/settingsLifecycleHarness';
import type { ReactElement } from 'react';
import type * as UserApi from '../../../../../../../../api/user/userAccountApi';
const {
  WallpaperMarketSection
} = await import('../WallpaperMarketSection');
const io = vi.hoisted(() => ({
  token: ((): string | null => 'token')(),
  list: vi.fn<typeof UserApi.listUserWallpapers>(),
  detail: vi.fn<typeof UserApi.getUserWallpaperDetail>(),
  apply: vi.fn<typeof UserApi.applyUserWallpaper>(),
  rate: vi.fn<typeof UserApi.rateUserWallpaper>(),
  report: vi.fn<typeof UserApi.reportUserWallpaper>(),
  store: vi.fn<(key: string) => Promise<unknown>>()
}));
vi.mock('../../../../../../../../api/user/userAccountApi', async () => ({
  ...(await import('../../../../../../../../api/user/userAccountApi.wallpaper')),
  listUserWallpapers: io.list,
  getUserWallpaperDetail: io.detail,
  applyUserWallpaper: io.apply,
  rateUserWallpaper: io.rate,
  reportUserWallpaper: io.report
}));
vi.mock('../../../../../../../../utils/userAccount', () => ({
  readLocalToken: () => io.token
}));
const onApply = vi.fn<(url: string, options?: {
  type?: 'image' | 'video';
}) => void>();
const onSearch = vi.fn<(next: boolean | ((previous: boolean) => boolean)) => void>();
const onDetail = vi.fn<(open: boolean) => void>();
let searchExpanded = false;
let withDetailListener = true;
/** 创建服务端返回的真实结构壁纸。
 * @param fields - 服务端字段差异
 * @returns 壁纸项目
 */
function item(fields: Partial<UserApi.WallpaperMarketItem> = {}): UserApi.WallpaperMarketItem {
  return {
    id: 1,
    ownerUsername: 'author',
    title: 'Ocean',
    description: 'Calm',
    type: 'image',
    status: 'approved',
    originalUrl: 'https://asset/original',
    thumb320Url: 'https://asset/320',
    thumb720Url: 'https://asset/720',
    thumb1280Url: 'https://asset/1280',
    tagsText: ' blue，sea ',
    copyrightInfo: 'Original',
    ratingAvg: 3,
    ratingCount: 2,
    applyCount: 4,
    ...fields
  };
}
/** 渲染真实市场组件。
 * @returns 当前元素树
 */
function view(): ReactElement {
  return render(WallpaperMarketSection, {
    searchExpanded,
    onApplyBackground: onApply,
    onSearchExpandedChange: onSearch,
    onDetailOpenChange: withDetailListener ? onDetail : undefined
  });
}
/** 运行真实 effect，保留组件状态和依赖。
 * @returns 完成更新的元素树
 */
async function commit(): Promise<ReactElement> {
  view();
  flushEffects();
  await settle();
  view();
  flushEffects();
  await settle();
  return view();
}
/** 查找真实动作按钮。
 * @param name - 翻译键末尾
 * @returns 动作按钮
 */
function button(name: string): ReactElement<Record<string, unknown>> {
  return find(view(), (node) => node.type === 'button' && text(node).endsWith(`.${name}`));
}
/** 查找真实列表卡片。
 * @param id - 壁纸标识
 * @returns 卡片
 */
function card(id = 1): ReactElement<Record<string, unknown>> {
  return find(view(), (node) => node.type === 'button' && String(node.props.className).startsWith('settings-plugin-market-card ') && String(node.key).endsWith(`$${id}`));
}
/** 触发真实详情加载。
 * @param wallpaper - 服务端详情
 */
async function select(wallpaper = item()): Promise<void> {
  io.detail.mockResolvedValue({
    ok: true,
    code: 200,
    message: '',
    data: wallpaper
  });
  if (String(card(wallpaper.id).props.className).endsWith('active')) {
    trigger(card(wallpaper.id), 'onClick');
    await commit();
  }
  trigger(card(wallpaper.id), 'onClick');
  await settle();
  await commit();
}
/** 点击真实动作并等待副作用。
 * @param name - 动作键
 */
async function click(name: string): Promise<void> {
  trigger(button(name), 'onClick');
  await settle();
  await commit();
}
beforeEach(() => {
  vi.useFakeTimers();
  resetLifecycle();
  io.token = 'token';
  searchExpanded = false;
  withDetailListener = true;
  onApply.mockReset();
  onSearch.mockReset();
  onDetail.mockReset();
  io.list.mockReset();
  io.list.mockResolvedValue({
    ok: true,
    code: 200,
    message: '',
    data: {
      items: [item()],
      total: 1
    }
  });
  io.detail.mockReset();
  io.detail.mockResolvedValue({
    ok: true,
    code: 200,
    message: '',
    data: item()
  });
  io.apply.mockReset();
  io.apply.mockResolvedValue({
    ok: true,
    code: 200,
    message: ''
  });
  io.rate.mockReset();
  io.rate.mockResolvedValue({
    ok: true,
    code: 200,
    message: ''
  });
  io.report.mockReset();
  io.report.mockResolvedValue({
    ok: true,
    code: 200,
    message: ''
  });
  io.store.mockReset();
  io.store.mockResolvedValue('integrated');
  vi.stubGlobal('window', {
    api: {
      storeRead: io.store
    },
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout
  });
});
afterEach(() => {
  unmount();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe('Wallpaper market requests, search and pagination', () => {
  it.each([{
    mode: 'standalone',
    legacy: '',
    size: 18
  }, {
    mode: 'integrated',
    legacy: '',
    size: 8
  }, {
    mode: undefined,
    legacy: 'standalone',
    size: 18
  }, {
    mode: undefined,
    legacy: 'unknown',
    size: 8
  }])('uses current and legacy window mode $mode/$legacy', async ({
    mode,
    legacy,
    size
  }) => {
    io.store.mockImplementation((key) => Promise.resolve(key === 'standalone-window-mode' ? mode : legacy));
    await commit();
    expect(io.list).toHaveBeenLastCalledWith('token', {
      keyword: undefined,
      sort: 'newest',
      page: 1,
      pageSize: size
    });
  });
  it('falls back after both store reads reject and ignores a delayed mode response after unmount', async () => {
    io.store.mockRejectedValue(new Error('store unavailable'));
    await commit();
    expect(io.list.mock.calls[0][1]?.pageSize).toBe(8);
    resetLifecycle();
    const task = deferred<unknown>();
    io.store.mockReturnValue(task.promise);
    view();
    flushEffects();
    unmount();
    task.resolve('standalone');
    await settle();
    expect(io.list.mock.calls.every(([, params]) => params?.pageSize === 8)).toBe(true);
  });
  it('clears list and detail when a refresh finds no token', async () => {
    io.token = null;
    await commit();
    expect(io.list).not.toHaveBeenCalled();
    expect(text(view())).toContain('.feedback.empty');
    io.token = 'token';
    await click('search');
    await select();
    io.token = null;
    await click('search');
    expect(text(view())).toContain('.feedback.selectHint');
    expect(button('nextPage').props.disabled).toBe(true);
  });
  it('shows in-flight loading, updates keyword and sorting and trims search parameters', async () => {
    const task = deferred<Awaited<ReturnType<typeof UserApi.listUserWallpapers>>>();
    io.list.mockReturnValueOnce(task.promise);
    view();
    flushEffects();
    expect(text(view())).toContain('.feedback.loading');
    task.resolve({
      ok: true,
      code: 200,
      message: '',
      data: {
        items: [item()],
        total: 1
      }
    });
    await settle();
    trigger(find(view(), (node) => node.type === 'input' && node.props.placeholder === 'settings.pluginMarket.wallpaper.searchPlaceholder'), 'onChange', {
      target: {
        value: ' ocean '
      }
    });
    searchExpanded = true;
    await click('search');
    expect(io.list).toHaveBeenLastCalledWith('token', {
      keyword: 'ocean',
      sort: 'newest',
      page: 1,
      pageSize: 8
    });
    trigger(find(view(), (node) => node.type === 'select' && node.props.value === 'newest'), 'onChange', {
      target: {
        value: 'rating'
      }
    });
    await commit();
    expect(io.list.mock.calls.at(-1)?.[1]?.sort).toBe('rating');
    expect(find(view(), (node) => typeof node.props.className === 'string' && node.props.className.startsWith('settings-plugin-market-search-panel')).props.className).toContain('--open');
  });
  it.each(['server denied', ''])('renders list failure %s and clears the toast with timer and cleanup', async (message) => {
    io.list.mockResolvedValue({
      message,
      ok: false,
      code: 500
    });
    await commit();
    expect(text(view())).toContain(message || '.feedback.loadFailed');
    await vi.advanceTimersByTimeAsync(1800);
    await commit();
    expect(text(view())).not.toContain(message || '.feedback.loadFailed');
    io.list.mockResolvedValue({
      ok: false,
      code: 500,
      message: 'again'
    });
    await click('search');
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('catches rejected mount, search, previous and next page requests and resets loading', async () => {
    io.list.mockRejectedValueOnce(new Error('offline'));
    await commit();
    expect(button('prevPage').props.disabled).toBe(true);
    io.list.mockRejectedValueOnce(new Error('offline'));
    await click('search');
    io.list.mockResolvedValue({
      ok: true,
      code: 200,
      message: '',
      data: {
        items: [item()],
        total: 24
      }
    });
    await click('search');
    io.list.mockRejectedValueOnce(new Error('offline'));
    await click('nextPage');
    await click('nextPage');
    io.list.mockRejectedValueOnce(new Error('offline'));
    await click('prevPage');
    expect(button('nextPage').props.disabled).toBe(false);
  });
  it('ignores older list results and preserves the newer loading ownership', async () => {
    const first = deferred<Awaited<ReturnType<typeof UserApi.listUserWallpapers>>>();
    const second = deferred<Awaited<ReturnType<typeof UserApi.listUserWallpapers>>>();
    io.list.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    view();
    flushEffects();
    trigger(button('search'), 'onClick');
    first.resolve({
      ok: true,
      code: 200,
      message: '',
      data: {
        items: [item({
          title: 'stale'
        })],
        total: 1
      }
    });
    await settle();
    expect(text(view())).toContain('.feedback.loading');
    second.resolve({
      ok: true,
      code: 200,
      message: '',
      data: {
        items: [item({
          title: 'fresh'
        })],
        total: 1
      }
    });
    await settle();
    expect(text(view())).toContain('fresh');
    expect(text(view())).not.toContain('stale');
  });
  it('uses explicit totals for previous/next pages, respects busy guards and clears a missing selection', async () => {
    io.list.mockResolvedValue({
      ok: true,
      code: 200,
      message: '',
      data: {
        items: [item()],
        total: 24
      }
    });
    await commit();
    trigger(button('prevPage'), 'onClick');
    expect(io.list).toHaveBeenCalledOnce();
    await select();
    await click('nextPage');
    expect(io.list.mock.calls.at(-1)?.[1]?.page).toBe(2);
    expect(text(view())).toContain('Ocean');
    await click('prevPage');
    const task = deferred<Awaited<ReturnType<typeof UserApi.listUserWallpapers>>>();
    io.list.mockReturnValueOnce(task.promise);
    trigger(button('nextPage'), 'onClick');
    const calls = io.list.mock.calls.length;
    trigger(button('nextPage'), 'onClick');
    trigger(button('prevPage'), 'onClick');
    expect(io.list).toHaveBeenCalledTimes(calls);
    task.resolve({
      ok: true,
      code: 200,
      message: '',
      data: {
        items: [item({
          id: 2
        })],
        total: 24
      }
    });
    await settle();
    expect(text(view())).toContain('.feedback.selectHint');
  });
  it('infers total pages for legacy arrays and stops on a short final page', async () => {
    io.list.mockResolvedValue({
      ok: true,
      code: 200,
      message: '',
      data: Array.from({
        length: 8
      }, (unused, index) => {
        void unused;
        return item({ id: index + 1 });
      })
    });
    await commit();
    expect(button('nextPage').props.disabled).toBe(false);
    await click('nextPage');
    expect(io.list.mock.calls.at(-1)?.[1]).toMatchObject({ page: 2 });
    io.list.mockResolvedValue({
      ok: true,
      code: 200,
      message: '',
      data: [item()]
    });
    await click('nextPage');
    expect(button('nextPage').props.disabled).toBe(true);
    const calls = io.list.mock.calls.length;
    trigger(button('nextPage'), 'onClick');
    expect(io.list).toHaveBeenCalledTimes(calls);
    io.list.mockResolvedValue({
      ok: true,
      code: 200,
      message: '',
      data: []
    });
    await click('search');
    expect(text(view())).toContain('.feedback.empty');
  });
  it.each(['detail rejected', ''])('handles detail error %s and permits no-token card events', async (message) => {
    await commit();
    io.token = null;
    trigger(card(), 'onClick');
    await settle();
    expect(io.detail).not.toHaveBeenCalled();
    io.token = 'token';
    io.detail.mockResolvedValue({
      message,
      ok: false,
      code: 500
    });
    trigger(card(), 'onClick');
    await settle();
    expect(text(view())).toContain(message || '.feedback.detailFailed');
    io.detail.mockRejectedValueOnce(new Error('offline'));
    trigger(card(), 'onClick');
    await settle();
    expect(io.detail).toHaveBeenCalledTimes(2);
  });
  it('ignores details invalidated by refreshing the list and toggles a selected card closed', async () => {
    await commit();
    const task = deferred<Awaited<ReturnType<typeof UserApi.getUserWallpaperDetail>>>();
    io.detail.mockReturnValueOnce(task.promise);
    trigger(card(), 'onClick');
    await click('search');
    task.resolve({
      ok: true,
      code: 200,
      message: '',
      data: item({
        title: 'stale detail'
      })
    });
    await settle();
    expect(text(view())).toContain('.feedback.selectHint');
    await select();
    expect(onDetail).toHaveBeenCalledWith(true);
    trigger(card(), 'onClick');
    await commit();
    expect(onDetail).toHaveBeenLastCalledWith(false);
    withDetailListener = false;
    await commit();
  });
});
describe('Wallpaper market actions and rendering', () => {
  it.each(['image', 'video'] as const)('applies %s and refreshes the selected detail', async (type) => {
    await commit();
    await select(item({
      type
    }));
    await click('apply');
    expect(io.apply).toHaveBeenCalledWith('token', 1);
    expect(onApply).toHaveBeenCalledWith(type === 'video' ? 'https://asset/original' : 'https://asset/1280', {
      type
    });
    expect(text(view())).toContain('.feedback.applySuccess');
  });
  it.each([{
    action: 'apply',
    pending: 'applying',
    fail: 'applyFailed'
  }, {
    action: 'rate',
    pending: 'rating',
    fail: 'rateFailed'
  }, {
    action: 'submitReport',
    pending: 'reporting',
    fail: 'reportFailed'
  }])('handles $action login and busy guards, error and rejected promise', async ({
    action,
    pending,
    fail
  }) => {
    await commit();
    await select();
    if (action === 'rate') await click('expandRate');
    if (action === 'submitReport') await click('expandReport');
    const methods = {
      apply: io.apply,
      rate: io.rate,
      submitReport: io.report
    };
    const method = methods[action as keyof typeof methods];
    io.token = null;
    trigger(button(action), 'onClick');
    await settle();
    expect(method).not.toHaveBeenCalled();
    io.token = 'token';
    const task = deferred<Awaited<ReturnType<typeof UserApi.applyUserWallpaper>>>();
    method.mockReturnValueOnce(task.promise);
    trigger(button(action), 'onClick');
    await settle();
    expect(button(pending).props.disabled).toBe(true);
    trigger(button(pending), 'onClick');
    await settle();
    expect(method).toHaveBeenCalledOnce();
    task.resolve({
      ok: false,
      code: 500,
      message: ''
    });
    await settle();
    expect(text(view())).toContain(`.feedback.${fail}`);
    method.mockResolvedValueOnce({
      ok: false,
      code: 500,
      message: 'server rejected'
    });
    await click(action);
    expect(text(view())).toContain('server rejected');
    method.mockRejectedValueOnce(new Error('offline'));
    await click(action);
    expect(button(action).props.disabled).toBe(false);
  });
  it('applies empty image/video URLs safely and falls back from missing video original to preview', async () => {
    await commit();
    await select(item({
      type: 'video',
      originalUrl: ''
    }));
    await click('apply');
    expect(onApply).toHaveBeenCalledWith('https://asset/1280', {
      type: 'video'
    });
    await select(item({
      originalUrl: '',
      thumb320Url: '',
      thumb720Url: '',
      thumb1280Url: ''
    }));
    onApply.mockClear();
    await click('apply');
    expect(onApply).not.toHaveBeenCalled();
  });
  it('selects a star, submits rating, expands and collapses the rating panel', async () => {
    await commit();
    await select();
    await click('expandRate');
    trigger(find(view(), (node) => node.props.role === 'radio' && node.props['aria-label'] === '2 settings.pluginMarket.wallpaper.ratingLevels.2'), 'onClick');
    await click('rate');
    expect(io.rate).toHaveBeenCalledWith('token', 1, 2);
    expect(text(view())).toContain('.feedback.rateSuccess');
    await click('collapseRate');
    expect(elements(view()).some((node) => node.props.role === 'radiogroup')).toBe(false);
  });
  it('reports selected reason and detail, clears detail on success and collapses the panel', async () => {
    await commit();
    await select();
    await click('expandReport');
    trigger(find(view(), (node) => node.type === 'select' && node.props.value === 'copyright'), 'onChange', {
      target: {
        value: 'other'
      }
    });
    trigger(find(view(), (node) => node.type === 'input' && node.props.placeholder === 'settings.pluginMarket.wallpaper.report.detailPlaceholder'), 'onChange', {
      target: {
        value: 'reason'
      }
    });
    await click('submitReport');
    expect(io.report).toHaveBeenCalledWith('token', {
      id: 1,
      reasonType: 'other',
      reasonDetail: 'reason'
    });
    expect(text(view())).toContain('.feedback.reportSuccess');
    expect(find(view(), (node) => node.type === 'input' && node.props.placeholder === 'settings.pluginMarket.wallpaper.report.detailPlaceholder').props.value).toBe('');
    await click('collapseReport');
    expect(elements(view()).some((node) => node.props.placeholder === 'settings.pluginMarket.wallpaper.report.detailPlaceholder')).toBe(false);
  });
  it.each([{
    thumb320Url: '',
    thumb720Url: 'https://asset/720',
    thumb1280Url: '',
    originalUrl: ''
  }, {
    thumb320Url: '',
    thumb720Url: '',
    thumb1280Url: 'https://asset/1280',
    originalUrl: ''
  }, {
    thumb320Url: '',
    thumb720Url: '',
    thumb1280Url: '',
    originalUrl: 'https://asset/original'
  }, {
    thumb320Url: '',
    thumb720Url: '',
    thumb1280Url: '',
    originalUrl: ''
  }])('uses thumbnail and original fallbacks $thumb720Url/$thumb1280Url/$originalUrl', async (fields) => {
    const wallpaper = item({
      ...fields,
      ownerAvatar: 'https://asset/avatar',
      description: '',
      tagsText: '',
      copyrightInfo: '',
      ratingAvg: undefined,
      ratingCount: undefined,
      applyCount: undefined
    });
    io.list.mockResolvedValue({
      ok: true,
      code: 200,
      message: '',
      data: [wallpaper]
    });
    await commit();
    await select(wallpaper);
    const preview = fields.thumb720Url || fields.thumb1280Url || fields.originalUrl;
    expect(elements(view()).filter((node) => node.props.className === 'settings-plugin-market-detail-img')).toHaveLength(preview ? 1 : 0);
    expect(text(view())).toContain('-');
  });
  it.each([undefined, 0, -1, Number.POSITIVE_INFINITY, 65000])('renders video duration %s and hover playback/loading events', async (durationMs) => {
    const wallpaper = item({
      durationMs,
      type: 'video'
    });
    io.list.mockResolvedValue({
      ok: true,
      code: 200,
      message: '',
      data: [wallpaper]
    });
    await commit();
    trigger(card(), 'onMouseEnter');
    let video = find(view(), (node) => node.props.className === 'settings-plugin-market-card-video is-loading');
    trigger(video, 'onLoadStart');
    const play = vi.fn<() => Promise<void>>().mockRejectedValue(new Error('blocked'));
    trigger(video, 'onCanPlay', {
      currentTarget: {
        play
      }
    });
    await settle();
    expect(play).toHaveBeenCalledOnce();
    expect(elements(view()).some((node) => node.props.className === 'settings-plugin-market-card-loading')).toBe(false);
    trigger(video, 'onError');
    trigger(card(), 'onMouseLeave');
    trigger(card(), 'onFocus');
    video = find(view(), (node) => node.props.className === 'settings-plugin-market-card-video is-loading');
    trigger(video, 'onError');
    trigger(card(), 'onBlur');
    expect(elements(view()).some((node) => node.type === 'video')).toBe(false);
  });
  it('ignores late hover events for an earlier video and clears image hover state', async () => {
    const videos = [item({
      type: 'video'
    }), item({
      id: 2,
      type: 'video'
    }), item({
      id: 3,
      type: 'image'
    }), item({
      id: 4,
      type: 'video',
      originalUrl: ''
    })];
    io.list.mockResolvedValue({
      ok: true,
      code: 200,
      message: '',
      data: videos
    });
    await commit();
    trigger(card(1), 'onMouseEnter');
    const oldVideo = find(view(), (node) => node.type === 'video');
    trigger(card(2), 'onMouseEnter');
    trigger(oldVideo, 'onCanPlay', {
      currentTarget: {
        play: () => Promise.resolve()
      }
    });
    trigger(oldVideo, 'onError');
    expect(elements(view()).some((node) => node.props.className === 'settings-plugin-market-card-loading')).toBe(true);
    trigger(card(3), 'onMouseEnter');
    expect(elements(view()).some((node) => node.type === 'video')).toBe(false);
    trigger(card(4), 'onMouseEnter');
    expect(elements(view()).some((node) => node.type === 'video')).toBe(false);
  });
  it('renders a video without thumbnail cover using an undefined poster', async () => {
    await commit();
    await select(item({
      type: 'video',
      thumb320Url: '',
      thumb720Url: '',
      thumb1280Url: ''
    }));
    expect(find(view(), (node) => node.props.className === 'settings-plugin-market-detail-video').props.poster).toBeUndefined();
  });
  it('runs detail playback, volume, mute and speed effects against an attached video ref', async () => {
    await commit();
    await select(item({
      type: 'video'
    }));
    const videoNode = find(view(), (node) => node.props.className === 'settings-plugin-market-detail-video');
    const video = {
      muted: true,
      volume: 0.6,
      playbackRate: 1,
      play: vi.fn<() => Promise<void>>().mockRejectedValue(new Error('blocked')),
      pause: vi.fn<() => void>()
    };
    (videoNode.props.ref as {
      current: unknown;
    }).current = video;
    await click('pause');
    expect(video.pause).toHaveBeenCalledOnce();
    await click('play');
    expect(video.play).toHaveBeenCalledOnce();
    await click('unmute');
    expect(video.muted).toBe(false);
    await click('mute');
    expect(video.muted).toBe(true);
    const range = find(view(), (node) => node.props.type === 'range');
    await ['0.2', '2', '-1', 'invalid'].reduce<Promise<void>>((previous, value) => previous.then(async () => {
      trigger(range, 'onChange', {
        target: {
          value
        }
      });
      await commit();
    }), Promise.resolve());
    expect(video.volume).toBe(0);
    const rate = find(view(), (node) => node.type === 'select' && node.props.value === 1);
    await ['invalid', '0', '2'].reduce<Promise<void>>((previous, value) => previous.then(async () => {
      trigger(rate, 'onChange', {
        target: {
          value
        }
      });
      await commit();
    }), Promise.resolve());
    expect(video.playbackRate).toBe(2);
    trigger(videoNode, 'onPause');
    await commit();
    trigger(videoNode, 'onPlay');
    await commit();
    trigger(videoNode, 'onEnded');
    await commit();
    expect(button('pause')).toBeDefined();
  });
});
