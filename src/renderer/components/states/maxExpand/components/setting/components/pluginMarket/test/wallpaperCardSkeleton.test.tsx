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
 * @file wallpaperCardSkeleton.test.tsx
 * @description 综合市场壁纸卡片骨架屏结构与缩略图扫光占位加载生命周期测试。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { elements, find, render, resetLifecycle, trigger } from '../../about/test/settingsLifecycleHarness';
import type { ReactElement } from 'react';
const {
  WallpaperCardSkeletonList,
  WallpaperCardThumb
} = await import('../wallpaperCardSkeleton');

/** 按类名筛选元素。
 * @param tree - 元素树
 * @param className - 完整类名
 * @returns 匹配元素
 */
function byClass(tree: ReactElement, className: string): ReactElement<Record<string, unknown>>[] {
  return elements(tree).filter((node) => node.props.className === className);
}

beforeEach(() => {
  resetLifecycle();
});

describe('wallpaper card skeleton list', () => {
  it.each([[8, 2], [6, 1]])('renders %i hidden placeholder cards with %i meta rows inside one status region', (count, metaRows) => {
    const tree = render(WallpaperCardSkeletonList, { count, metaRows });
    expect(tree.props).toMatchObject({
      role: 'status',
      'aria-busy': 'true',
      'aria-label': 'settings.pluginMarket.wallpaper.feedback.loading'
    });
    const cards = byClass(tree, 'settings-plugin-market-card settings-plugin-market-card-skeleton settings-skeleton-sweep');
    expect(cards).toHaveLength(count);
    expect(new Set(cards.map((card) => card.key)).size).toBe(count);
    cards.forEach((card) => {
      expect(card.props['aria-hidden']).toBe('true');
      expect(byClass(card, 'settings-plugin-market-card-media')).toHaveLength(1);
      expect(byClass(card, 'settings-skeleton-block settings-plugin-market-skeleton-title')).toHaveLength(1);
      expect(byClass(card, 'settings-skeleton-block settings-plugin-market-skeleton-meta')).toHaveLength(metaRows);
    });
  });
});

describe('wallpaper card thumb', () => {
  /** 渲染缩略图。
   * @param src - 缩略图地址
   * @returns 当前元素树
   */
  function thumb(src: string): ReactElement {
    return render(WallpaperCardThumb, { src, alt: 'Ocean' });
  }
  /** 查找缩略图元素。
   * @param tree - 元素树
   * @returns 图片元素
   */
  function img(tree: ReactElement): ReactElement<Record<string, unknown>> {
    return find(tree, (node) => node.type === 'img');
  }

  it.each(['onLoad', 'onError'])('shows the shimmer until %s, then reveals the image', (event) => {
    let tree = thumb('https://asset/320');
    expect(byClass(tree, 'settings-plugin-market-card-shimmer settings-skeleton-sweep')).toHaveLength(1);
    expect(img(tree).props).toMatchObject({
      className: 'settings-plugin-market-card-img is-loading',
      src: 'https://asset/320',
      alt: 'Ocean'
    });
    trigger(img(tree), event);
    tree = thumb('https://asset/320');
    expect(byClass(tree, 'settings-plugin-market-card-shimmer settings-skeleton-sweep')).toHaveLength(0);
    expect(img(tree).props.className).toBe('settings-plugin-market-card-img');
  });

  it('returns to the loading state when the thumbnail source changes', () => {
    trigger(img(thumb('https://asset/a')), 'onLoad');
    expect(byClass(thumb('https://asset/a'), 'settings-plugin-market-card-shimmer settings-skeleton-sweep')).toHaveLength(0);
    const tree = thumb('https://asset/b');
    expect(byClass(tree, 'settings-plugin-market-card-shimmer settings-skeleton-sweep')).toHaveLength(1);
    expect(img(tree).props.className).toBe('settings-plugin-market-card-img is-loading');
  });
});
