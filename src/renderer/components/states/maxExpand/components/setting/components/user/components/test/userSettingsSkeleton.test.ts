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
 * @file userSettingsSkeleton.test.ts
 * @description 用户中心资料首屏、子页面记录、PRO 方案与行内数值骨架屏的结构与读屏语义测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { UserPlanDetailSkeleton, UserProfileSkeleton, UserRecordSkeletonList, UserValueSkeleton } from '../userSettingsSkeleton';
import { elementProps, elements, type TestElement } from '../../../../../../../../test/elementHarness';
import type { ReactNode } from 'react';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

/**
 * 按类名片段筛选元素。
 * @param tree - 元素树
 * @param className - 需包含的完整类名
 * @returns 匹配元素
 */
function withClass(tree: ReactNode, className: string): TestElement[] {
  return elements(tree).filter((node) => String(elementProps(node).className).split(' ').includes(className));
}

describe('UserProfileSkeleton', () => {
  it('mirrors the info page summary card and twelve nav cards inside one status region', () => {
    const tree = UserProfileSkeleton();
    expect(elementProps(tree)).toMatchObject({
      role: 'status',
      'aria-busy': 'true',
      'aria-label': 'settings.user.feedback.loadingProfile'
    });
    expect(elementProps(withClass(tree, 'settings-user-profile-main')[0])['aria-hidden']).toBe('true');
    expect(withClass(tree, 'settings-user-info-summary-card')).toHaveLength(1);
    expect(withClass(tree, 'settings-index-card')).toHaveLength(12);
    expect(withClass(tree, 'settings-skeleton-sweep')).toHaveLength(13);
    expect(withClass(tree, 'settings-user-info-summary-meta-row')).toHaveLength(2);
    expect(withClass(tree, 'settings-user-info-summary-row')).toHaveLength(2);
  });
});

describe('UserRecordSkeletonList', () => {
  it.each([[3, false], [1, false], [0, true]])('renders three hidden cards with %i detail rows and media=%s', (rows, media) => {
    const tree = UserRecordSkeletonList({ rows, media, label: 'loading' });
    expect(elementProps(tree)).toMatchObject({ role: 'status', 'aria-busy': 'true', 'aria-label': 'loading' });
    const cards = withClass(tree, 'settings-user-card');
    expect(cards).toHaveLength(3);
    expect(new Set(cards.map((card) => card.key)).size).toBe(3);
    cards.forEach((card) => {
      expect(elementProps(card)['aria-hidden']).toBe('true');
      expect(withClass(card, 'settings-user-skeleton-rows')).toHaveLength(rows > 0 ? 1 : 0);
      expect(withClass(card, 'settings-user-skeleton-row')).toHaveLength(rows);
      expect(withClass(card, 'settings-user-image-translation-image-wrap')).toHaveLength(media ? 2 : 0);
    });
  });
});

describe('UserPlanDetailSkeleton', () => {
  it('renders hidden description and feature placeholders', () => {
    const tree = UserPlanDetailSkeleton();
    expect(elementProps(tree)['aria-hidden']).toBe('true');
    expect(withClass(tree, 'settings-user-skeleton-feature')).toHaveLength(3);
  });
});

describe('UserValueSkeleton', () => {
  it('announces its loading label as an inline status', () => {
    const tree = UserValueSkeleton({ label: 'settings.user.recharge.balanceLoading' });
    expect(elementProps(tree)).toMatchObject({ role: 'status', 'aria-label': 'settings.user.recharge.balanceLoading' });
    expect(String(elementProps(tree).className)).toContain('settings-skeleton-sweep');
  });
});
