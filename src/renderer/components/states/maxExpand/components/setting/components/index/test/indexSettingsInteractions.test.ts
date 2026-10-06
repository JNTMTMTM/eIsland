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
 * @file indexSettingsInteractions.test.ts
 * @description 快速导航真实拖拽、问卷、重复隐藏与恢复边界回归。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IndexSettingsSection } from '../IndexSettingsSection';
import { elementProps, elements, findElement, invoke, textContent } from '../../../../../../../test/elementHarness';
import { renderWithHooks, resetLifecycle } from '../../app/components/test/themeHookHarness';
import type { ComponentProps, ReactElement } from 'react';
const { store, reminder } = vi.hoisted(() => ({ store: { setQuestionnaire: vi.fn() }, reminder: { questionnaire: null as object | null, count: 0, dismiss: vi.fn() } }));
vi.mock('react', async (original) => ({ ...(await original<typeof import('react')>()), ...(await import('../../../../../../../test/elementHarness')).hookMocks, ...(await import('../../app/components/test/themeHookHarness')).lifecycleHooks }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../../../../../../store/slices', () => ({ default: (selector: (value: typeof store) => unknown) => selector(store) }));
vi.mock('../../../../../../../../components/components/DynamicIslandQuestionnaireBanner', () => ({ QuestionnaireBanner: vi.fn(), useAnnouncementQuestionnaire: () => reminder }));
/**
 * 创建符合公开契约的导航状态。
 * @returns 导航输入及可观察回调。
 */
function makeProps(): ComponentProps<typeof IndexSettingsSection> {
  return {
    visibleCards: [],
    hiddenCards: [],
    navEditMode: false,
    navOrder: [],
    hiddenNavOrder: [],
    dragIdxRef: { current: null },
    setNavOrder: vi.fn(),
    setHiddenNavOrder: vi.fn(),
    setNavEditMode: vi.fn(),
    resetNavConfig: vi.fn(),
    persistNavConfig: vi.fn(),
    setAppSettingsPage: vi.fn(),
    setMusicSettingsPage: vi.fn(),
    setAiSettingsPage: vi.fn(),
    setNetworkSettingsPage: vi.fn(),
    setActiveTab: vi.fn(),
    onAction: vi.fn(),
  };
}

/**
 * 执行真实 memo 内层函数并保留状态。
 * @param props - 公开导航输入。
 * @returns 实际元素树。
 */
function render(props: ComponentProps<typeof IndexSettingsSection>) {
  const { type } = IndexSettingsSection as unknown as { type: (input: ComponentProps<typeof IndexSettingsSection>) => ReactElement };
  return renderWithHooks(() => type(props));
}
beforeEach(() => { resetLifecycle(); vi.clearAllMocks(); reminder.questionnaire = null; });
describe('实际导航完整交互', () => {
  it('Pro 与充值卡片保留特殊边框，普通卡片和缺失 action 回调转交分类', () => {
    const props = makeProps(); props.visibleCards = [{ id: 'user-pro', label: 'Pro', desc: 'Plan', tab: 'user', icon: 'pro.svg' }, { id: 'user-recharge', label: 'Recharge', desc: 'Credit', tab: 'user', icon: 'recharge.svg', actionId: 'recharge' }]; props.onAction = undefined;
    const cards = elements(render(props)).filter((node) => node.type === 'button' && String(elementProps(node).className).startsWith('settings-index-card'));
    expect(elementProps(cards[0]).className).toContain('settings-user-pro-nav-card--outline'); expect(elementProps(cards[1]).className).toContain('settings-user-recharge-nav-card--outline');
    cards.forEach((node) => invoke(node, 'onClick')); expect(props.setActiveTab).toHaveBeenCalledTimes(2); expect(props.setActiveTab).toHaveBeenCalledWith('user'); expect(elements(cards[0]).some((node) => node.type === 'img')).toBe(true);
  });
  it('问卷叶服务返回提醒时真实 Banner 接收到打开和忽略回调', () => {
    reminder.questionnaire = {}; reminder.count = 2; const props = makeProps(); const banner = findElement(render(props), (node) => typeof elementProps(node).onDismiss === 'function');
    expect(elementProps(banner).count).toBe(2); invoke(banner, 'onOpen', {}); invoke(banner, 'onDismiss'); expect(store.setQuestionnaire).toHaveBeenCalledOnce(); expect(reminder.dismiss).toHaveBeenCalledOnce();
  });
  it('拖拽经过、离开、同源放置与结束均更新实际高亮及公开 ref', () => {
    const props = makeProps(); props.navEditMode = true; props.visibleCards = [{ id: 'a', label: 'A', desc: '', tab: 'app', icon: 'a.svg' }, { id: 'b', label: 'B', desc: '', tab: 'music' }]; props.navOrder = ['a','b'];
    const getCards = () => elements(render(props)).filter((node) => elementProps(node).draggable === true); const [first, second] = getCards(); const preventDefault = vi.fn();
    invoke(second, 'onDragOver', { preventDefault }); expect(elementProps(getCards()[1]).className).toContain('drag-over');
    invoke(second, 'onDragLeave'); expect(elementProps(getCards()[1]).className).not.toContain('drag-over');
    invoke(first, 'onDragStart', { dataTransfer: { effectAllowed: '' } }); invoke(first, 'onDrop', { preventDefault }); expect(props.setNavOrder).not.toHaveBeenCalled();
    invoke(second, 'onDragOver', { preventDefault }); invoke(second, 'onDragEnd'); expect(props.dragIdxRef.current).toBeNull(); expect(elementProps(getCards()[1]).className).not.toContain('drag-over');
  });
  it('已隐藏卡片再次删除不重复，已显示卡片再次恢复不重复', () => {
    const props = makeProps(); props.navEditMode = true; props.visibleCards = [{ id: 'a', label: 'A', desc: '', tab: 'app' }]; props.navOrder = ['a']; props.hiddenNavOrder = ['a']; props.hiddenCards = [{id:'a',label:'A'}];
    const tree = render(props); invoke(findElement(tree,(node)=>elementProps(node).className === 'settings-index-card-remove'),'onClick'); expect(props.setHiddenNavOrder).toHaveBeenCalledWith(['a']);
    invoke(findElement(tree,(node)=>elementProps(node).className === 'settings-nav-add-item'),'onClick'); expect(props.setNavOrder).toHaveBeenLastCalledWith(['a']); expect(props.setHiddenNavOrder).toHaveBeenLastCalledWith([]);
  });
  it('进入编辑模式无需保存当前配置', () => {
    const props = makeProps(); invoke(findElement(render(props),(node)=>node.type === 'button' && textContent(node) === 'settings.index.edit'),'onClick'); expect(props.setNavEditMode).toHaveBeenCalledWith(true); expect(props.persistNavConfig).not.toHaveBeenCalled();
  });
});
