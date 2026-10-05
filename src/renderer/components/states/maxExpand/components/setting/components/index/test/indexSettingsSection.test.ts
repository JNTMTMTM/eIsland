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
 * @file indexSettingsSection.test.ts
 * @description IndexSettingsSection 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IndexSettingsSection } from '../IndexSettingsSection';
import { elementProps, elements, findElement, invoke, resetState, textContent } from '../../../../../../../test/elementHarness';
import type { ReactElement, ComponentProps } from 'react';
const render = (props: ComponentProps<typeof IndexSettingsSection>): ReactElement => (IndexSettingsSection as unknown as {
  type: (value: ComponentProps<typeof IndexSettingsSection>) => ReactElement;
}).type(props);
const store = vi.hoisted(() => ({ setQuestionnaire: vi.fn() }));
const reminder = vi.hoisted(() => ({ questionnaire: null, count: 0, dismiss: vi.fn() }));
/**
 * 构造隔离设置状态和可观察回调的完整配置。
 * @returns 配置状态及可观察回调。
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
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
vi.mock('../../../../../../../../store/slices', () => ({ default: (selector: (value: typeof store) => unknown) => selector(store) }));
vi.mock('../../../../../../../../components/components/DynamicIslandQuestionnaireBanner', () => ({ QuestionnaireBanner: vi.fn(), useAnnouncementQuestionnaire: () => reminder }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('IndexSettingsSection', () => {
  it.each([{ card: { id: 'a', label: 'A', desc: 'D', tab: 'app', appPage: 'theme' }, callback: 'setAppSettingsPage', value: 'theme' }, { card: { id: 'a', label: 'A', desc: 'D', tab: 'music', musicPage: 'lyrics' }, callback: 'setMusicSettingsPage', value: 'lyrics' }, { card: { id: 'a', label: 'A', desc: 'D', tab: 'index', actionId: 'open' }, callback: 'onAction', value: 'open' }] as const)('routes card $callback', ({ card, callback, value }) => {
    const props = { ...makeProps(), visibleCards: [card] };
    const tree = render(props);
    invoke(findElement(tree, (n) => elementProps(n).className === 'settings-index-card'), 'onClick');
    expect(props[callback]).toHaveBeenCalledWith(value);
  });
  it('reorders drag cards, hides/restores cards and persists completed edit', () => {
    const props = { ...makeProps(), visibleCards: [{ id: 'a', label: 'A', desc: '', tab: 'app' as const }, { id: 'b', label: 'B', desc: '', tab: 'music' as const }], navOrder: ['a', 'b'], hiddenCards: [{ id: 'c', label: 'C' }], hiddenNavOrder: ['c'], navEditMode: true };
    const tree = render(props);
    const cards = elements(tree).filter((n) => elementProps(n).draggable === true);
    invoke(cards[0], 'onDragStart', { dataTransfer: { effectAllowed: '' } });
    invoke(cards[1], 'onDrop', { preventDefault: vi.fn() });
    expect(props.setNavOrder).toHaveBeenCalledWith(['b', 'a']);
    invoke(findElement(tree, (n) => elementProps(n).className === 'settings-index-card-remove'), 'onClick');
    expect(props.setHiddenNavOrder).toHaveBeenCalledWith(['c', 'a']);
    invoke(findElement(tree, (n) => elementProps(n).className === 'settings-nav-add-item'), 'onClick');
    expect(props.setNavOrder).toHaveBeenLastCalledWith(['a', 'b', 'c']);
    invoke(findElement(tree, (n) => n.type === 'button' && textContent(n) === 'settings.index.done'), 'onClick');
    expect(props.persistNavConfig).toHaveBeenCalledWith(['a', 'b'], ['c']);
    expect(props.setNavEditMode).toHaveBeenCalledWith(false);
  });
  it('ignores missing drag origin and renders empty addable state', () => {
    const props = { ...makeProps(), visibleCards: [{ id: 'a', label: 'A', desc: '', tab: 'app' as const }], navEditMode: true };
    const tree = render(props);
    invoke(findElement(tree, (n) => elementProps(n).draggable === true), 'onDrop', { preventDefault: vi.fn() });
    expect(props.setNavOrder).not.toHaveBeenCalled();
    expect(textContent(tree)).toContain('settings.index.emptyAddable');
    invoke(findElement(tree, (n) => n.type === 'button' && textContent(n) === 'settings.index.reset'), 'onClick');
    expect(props.resetNavConfig).toHaveBeenCalledOnce();
  });
});
