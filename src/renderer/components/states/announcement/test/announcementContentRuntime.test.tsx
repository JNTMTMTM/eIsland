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
 * @file announcementContentRuntime.test.tsx
 * @description 公告页真实数据 Hook、广告轮播淡出、媒体互斥切换与卸载清理测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../maxExpand/components/calendar/hooks/test/calendarHookHarness';
import { byClass, elements, find, invoke, text, type TreeElement } from '../../test/tree';
import { AnnouncementContent } from '../AnnouncementContent';
import { AnnouncementHeader } from '../components/AnnouncementHeader';
import { AnnouncementBody } from '../components/AnnouncementBody';
import { QuestionnaireBanner } from '../../../components/DynamicIslandQuestionnaireBanner';
import type * as QuestionnaireApi from '../../../../api/questionnaire/questionnaireApi';
import type * as AnnouncementApi from '../../../../api/announcement/announcementApi';
import type { ReactElement } from 'react';
const leaves = vi.hoisted(() => ({
  hover: vi.fn(),
  questionnaire: vi.fn(),
  announcements: vi.fn<typeof AnnouncementApi.fetchAnnouncements>(),
  social: vi.fn<typeof AnnouncementApi.fetchAnnouncementSocialConfig>(),
  slides: vi.fn<typeof AnnouncementApi.fetchAdSlides>(),
  questionnaires: vi.fn<typeof QuestionnaireApi.fetchActiveQuestionnaires>(),
  completed: vi.fn<typeof QuestionnaireApi.isQuestionnaireCompleted>(),
  dismissed: vi.fn<typeof QuestionnaireApi.isQuestionnaireReminderDismissed>(),
  dismiss: vi.fn<typeof QuestionnaireApi.dismissQuestionnaireReminder>(),
  open: vi.fn()
}));
vi.mock('../../../../store/slices', () => ({
  default: () => ({
    setHover: leaves.hover,
    setQuestionnaire: leaves.questionnaire
  })
}));
vi.mock('../../../../utils/userAccount', () => ({
  readLocalToken: () => null
}));
vi.mock('../../../../api/announcement/announcementApi', () => ({
  fetchAnnouncements: leaves.announcements,
  fetchAnnouncementSocialConfig: leaves.social,
  fetchAdSlides: leaves.slides
}));
vi.mock('../../../../api/questionnaire/questionnaireApi', () => ({
  fetchActiveQuestionnaires: leaves.questionnaires,
  isQuestionnaireCompleted: leaves.completed,
  isQuestionnaireReminderDismissed: leaves.dismissed,
  dismissQuestionnaireReminder: leaves.dismiss
}));
/** 读取真实公告页。
 * @returns 公告树
 */
function run(): ReactElement {
  return renderHook(AnnouncementContent);
}
/** 提交真实数据读取与后续 effect。
 * @returns 公告树
 */
async function mount(): Promise<ReactElement> {
  run();
  flushHookEffects();
  await settleHook();
  run();
  flushHookEffects();
  return run();
}
/** 获取真实头部上的父页回调。
 * @returns 头部节点
 */
function head(): TreeElement {
  return find(run(), (node) => node.type === AnnouncementHeader);
}
/** 获取公告页构造的真实列表。
 * @returns 列表元素
 */
function list(): ReactElement {
  return find(run(), (node) => node.type === AnnouncementBody).props.announcementList as ReactElement;
}
/** 获取广告位。
 * @returns 广告元素
 */
function ad(): TreeElement {
  return byClass(list(), 'announcement-ad-space');
}
/** 创建服务器广告数据。
 * @param count - 广告数量
 * @returns 广告数组
 */
function slides(count: number): AnnouncementApi.AdSlideData[] {
  return Array.from({
    length: count
  }, (...[, index]) => ({
    id: index,
    title: index === 0 ? '' : 'Second',
    imageUrl: `slide${  index  }.png`,
    linkUrl: ` https://ads.test/${  index  } `,
    sortOrder: index
  }));
}
beforeEach(() => {
  unmountHook();
  resetHook();
  vi.resetAllMocks();
  vi.useFakeTimers();
  leaves.announcements.mockResolvedValue([{
    title: '',
    content: 'body'
  }, {
    id: 2,
    updatedAt: 'today',
    title: 'Second',
    content: 'second',
    sortOrder: 2
  }]);
  leaves.social.mockResolvedValue({
    githubUrl: '',
    bilibiliUrl: '',
    qqInviteUrl: '',
    qqQrImageUrl: 'qr.png'
  });
  leaves.slides.mockResolvedValue([]);
  leaves.questionnaires.mockResolvedValue([]);
  leaves.completed.mockReturnValue(false);
  leaves.dismissed.mockReturnValue(false);
  vi.stubGlobal('window', {
    api: {
      clipboardOpenUrl: leaves.open
    }
  });
});
afterEach(() => {
  unmountHook();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('AnnouncementContent runtime', () => {
  it('loading and empty data suppress selectable list then no-ad data renders safe placeholder', async () => {
    run();
    expect(head().props.canToggleList).toBe(false);
    expect(find(run(), (node) => node.type === AnnouncementBody).props.announcementList).toBeUndefined();
    await mount();
    expect(byClass(list(), 'announcement-ad-placeholder')).toBeDefined();
    expect(ad().props.onClick).toBeUndefined();
    expect(ad().props.style).toEqual({
      cursor: 'default'
    });
    const stopPropagation = vi.fn();
    invoke(byClass(run(), 'announcement-state-content'), 'onClick', {
      stopPropagation
    });
    expect(stopPropagation).toHaveBeenCalledTimes(1);
    invoke(head(), 'onClose');
    expect(leaves.hover).toHaveBeenCalledTimes(1);
  });
  it('empty server announcements finish loading but leave list unavailable', async () => {
    leaves.announcements.mockResolvedValue([]);
    await mount();
    expect(head().props.canToggleList).toBe(false);
    expect(find(run(), (node) => node.type === AnnouncementBody).props.loading).toBe(false);
    expect(find(run(), (node) => node.type === AnnouncementBody).props.announcementList).toBeUndefined();
  });
  it('real data sorts announcement orders/id fallbacks and selected identity; updatedAt keys have real fallback', async () => {
    leaves.announcements.mockResolvedValue([{
      title: '',
      content: 'body'
    }, {
      id: 5,
      title: 'Five',
      content: '5',
      sortOrder: 1
    }, {
      id: 2,
      title: 'Two',
      content: '2',
      sortOrder: 1
    }, {
      updatedAt: 'yesterday',
      title: 'Updated',
      content: 'u',
      sortOrder: 1
    }]);
    await mount();
    const buttons = elements(list()).filter((node) => node.type === 'button' && String(node.props.className).startsWith('announcement-list-item'));
    expect(buttons.map(text)).toEqual(['Updated', 'Two', 'Five', 'announcement.defaultTitle']);
    expect(buttons[0].props['aria-current']).toBe('true');
    expect(buttons[1].props['aria-current']).toBeUndefined();
    expect(buttons[0].key).toContain('yesterday-0');
    expect(buttons[3].key).toContain('announcement-3');
    invoke(buttons[1], 'onClick');
    expect(head().props.announcement).toMatchObject({
      id: 2
    });
  });
  it('video, QR and list controls mutually reset state through real setters and selected changes', async () => {
    await mount();
    invoke(head(), 'onToggleVideo');
    expect(head().props).toMatchObject({
      showVideo: true,
      showQr: false,
      listExpanded: false
    });
    invoke(head(), 'onToggleVideo');
    expect(head().props.showVideo).toBe(false);
    invoke(head(), 'onToggleQr');
    expect(head().props).toMatchObject({
      showVideo: false,
      showQr: true,
      listExpanded: false
    });
    invoke(head(), 'onToggleQr');
    expect(head().props.showQr).toBe(false);
    invoke(head(), 'onToggleVideo');
    invoke(head(), 'onToggleQr');
    expect(head().props).toMatchObject({
      showVideo: false,
      showQr: true
    });
    invoke(head(), 'onToggleList');
    expect(head().props).toMatchObject({
      showVideo: false,
      showQr: false,
      listExpanded: true
    });
    invoke(head(), 'onToggleList');
    expect(byClass(list(), 'announcement-list').props['aria-hidden']).toBe(true);
    expect(elements(list()).filter((node) => String(node.props.className).includes('announcement-list-item')).every((node) => node.props.tabIndex === -1)).toBe(true);
    invoke(head(), 'onToggleVideo');
    invoke(byClass(list(), 'announcement-list-item'), 'onClick');
    expect(head().props).toMatchObject({
      showVideo: false,
      showQr: false
    });
  });
  it.each(['', 'file:///private', 'data:text/plain,blocked', ' HTTPS://ads.test/x '])('only HTTP ad links are forwarded: %s', async (link) => {
    const data = slides(1);
    data[0].linkUrl = link;
    leaves.slides.mockResolvedValue(data);
    await mount();
    invoke(ad(), 'onClick');
    if (link.startsWith(' HTTPS')) expect(leaves.open).toHaveBeenCalledWith('HTTPS://ads.test/x');else expect(leaves.open).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    expect(byClass(list(), 'announcement-ad-image').props.alt).toBe('announcement.adSpace');
  });
  it('automatic rotation pauses on hover/fade, prev/next wrap and reject overlapping transition', async () => {
    leaves.slides.mockResolvedValue(slides(2));
    await mount();
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(5000);
    run();
    flushHookEffects();
    expect(String(byClass(list(), 'announcement-ad-image').props.className)).toContain('fade-out');
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(300);
    run();
    flushHookEffects();
    expect(byClass(list(), 'announcement-ad-image').props.src).toBe('slide1.png');
    invoke(ad(), 'onMouseEnter');
    run();
    flushHookEffects();
    expect(vi.getTimerCount()).toBe(0);
    const stopPropagation = vi.fn();
    invoke(byClass(list(), 'prev'), 'onClick', {
      stopPropagation
    });
    run();
    flushHookEffects();
    invoke(byClass(list(), 'next'), 'onClick', {
      stopPropagation
    });
    vi.advanceTimersByTime(300);
    run();
    flushHookEffects();
    expect(byClass(list(), 'announcement-ad-image').props.src).toBe('slide0.png');
    invoke(byClass(list(), 'prev'), 'onClick', {
      stopPropagation
    });
    vi.advanceTimersByTime(300);
    run();
    flushHookEffects();
    expect(byClass(list(), 'announcement-ad-image').props.src).toBe('slide1.png');
    invoke(byClass(list(), 'next'), 'onClick', {
      stopPropagation
    });
    vi.advanceTimersByTime(300);
    run();
    flushHookEffects();
    expect(byClass(list(), 'announcement-ad-image').props.src).toBe('slide0.png');
    invoke(ad(), 'onMouseLeave');
    run();
    flushHookEffects();
    expect(vi.getTimerCount()).toBe(1);
    expect(stopPropagation).toHaveBeenCalledTimes(4);
  });
  it('unmount clears live fade and periodic timers', async () => {
    leaves.slides.mockResolvedValue(slides(2));
    await mount();
    vi.advanceTimersByTime(5000);
    run();
    flushHookEffects();
    expect(vi.getTimerCount()).toBe(1);
    unmountHook();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('cancelled announcement/social/ads/questionnaires complete without mutating late view', async () => {
    const announcements = deferred<AnnouncementApi.AnnouncementData[]>();
    const ads = deferred<AnnouncementApi.AdSlideData[]>();
    const questionnaires = deferred<QuestionnaireApi.QuestionnaireData[]>();
    leaves.announcements.mockReturnValue(announcements.promise);
    leaves.slides.mockReturnValue(ads.promise);
    leaves.questionnaires.mockReturnValue(questionnaires.promise);
    run();
    flushHookEffects();
    unmountHook();
    announcements.resolve([{
      title: 'late',
      content: 'late'
    }]);
    ads.resolve(slides(2));
    questionnaires.resolve([]);
    await settleHook();
    expect(find(run(), (node) => node.type === AnnouncementBody).props.loading).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('real questionnaire filters completed/dismissed, forwards banner open and removes selected reminder', async () => {
    leaves.questionnaires.mockResolvedValue([1, 2, 3, 4].map((id) => ({
      id,
      title: `Questionnaire${  id}`,
      description: '',
      rewardProDays: null,
      startsAt: '',
      endsAt: '',
      questions: []
    })));
    leaves.completed.mockImplementation((id) => id === 1);
    leaves.dismissed.mockImplementation((id) => id === 2);
    await mount();
    let banner = find(run(), (node) => node.type === AnnouncementBody).props.questionnaireBanner as ReactElement<Record<string, unknown>>;
    expect(banner.type).toBe(QuestionnaireBanner);
    expect(banner.props.count).toBe(2);
    invoke(banner as TreeElement, 'onOpen');
    expect(leaves.questionnaire).toHaveBeenCalledTimes(1);
    invoke(banner as TreeElement, 'onDismiss');
    expect(leaves.dismiss).toHaveBeenCalledWith(3);
    banner = find(run(), (node) => node.type === AnnouncementBody).props.questionnaireBanner as ReactElement<Record<string, unknown>>;
    expect(banner.props.count).toBe(1);
    invoke(banner as TreeElement, 'onDismiss');
    expect(leaves.dismiss).toHaveBeenCalledWith(4);
    expect(find(run(), (node) => node.type === AnnouncementBody).props.questionnaireBanner).toBeUndefined();
  });
  it('sort comparator handles two records lacking sortOrder and id', async () => {
    leaves.announcements.mockResolvedValue([{
      title: 'Earlier',
      content: '1'
    }, {
      title: 'Later',
      content: '2'
    }]);
    await mount();
    expect(elements(list()).filter((node) => String(node.props.className).includes('announcement-list-item')).map(text)).toEqual(['Earlier', 'Later']);
  });
});
