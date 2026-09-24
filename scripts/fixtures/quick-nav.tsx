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
 * @file quick-nav.tsx
 * @description 使用真实导航组件、配置和中英文资源验证交互，并统计翻译及主体渲染次数。
 * @author 鸡哥
 */

import { useCallback, useMemo, useRef, useState, type ComponentProps, type ComponentType, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from '../../i18n/zh-CN.json';
import enUS from '../../i18n/en-US.json';
import { IndexSettingsSection } from '../../src/renderer/components/states/maxExpand/components/setting/components/index/IndexSettingsSection';
import { DEFAULT_NAV_ORDER, NAV_CARDS_MAP, SEARCHABLE_SETTINGS, type SearchableSettingItem } from '../../src/renderer/components/states/maxExpand/components/setting/utils/settingsConfig';
import useFixtureStore, { counters } from './quick-nav-mocks';

const root = createRoot(document.getElementById('root')!);
const translations = new Map<string, number>();
const routeEvents: string[] = [];
const persisted: Array<{ visible: string[]; hidden: string[] }> = [];
const checks: string[] = [];
let currentOrder = DEFAULT_NAV_ORDER;
let parentRenders = 0;
// 旧版基线从父组件读取拖拽反馈；当前组件忽略这两个兼容属性并在内部维护状态。
const CompatibleIndexSettingsSection = IndexSettingsSection as ComponentType<ComponentProps<typeof IndexSettingsSection> & {
  dragOverIdx: number | null;
  setDragOverIdx: (index: number | null) => void;
}>;
const searchKeys = new Set(SEARCHABLE_SETTINGS.flatMap((item) => [item.labelKey, item.descKey]).filter((key): key is string => Boolean(key)));
const indexTranslationCount = SEARCHABLE_SETTINGS.reduce((count, item) => count + Number(Boolean(item.labelKey)) + Number(Boolean(item.descKey)), 0);
const translate = i18n.t.bind(i18n);

const routeHandlers = {
  app: (page: string): void => { routeEvents.push(`app:${page}`); },
  music: (page: string): void => { routeEvents.push(`music:${page}`); },
  ai: (page: string): void => { routeEvents.push(`ai:${page}`); },
  network: (page: string): void => { routeEvents.push(`network:${page}`); },
  tab: (tab: string): void => { routeEvents.push(`tab:${tab}`); },
  action: (action: string): void => { routeEvents.push(`action:${action}`); },
};

/**
 * 仅提供真实组件需要的稳定导航状态；父组件可独立刷新以检查 memo 边界。
 * @param props - 合成父组件参数。
 * @param props.revision - 无关父组件更新编号。
 * @returns 隔离导航页面。
 */
function Fixture({ revision }: { revision: number }): ReactElement {
  parentRenders += 1;
  const [navOrder, setNavOrder] = useState(DEFAULT_NAV_ORDER);
  const [hiddenNavOrder, setHiddenNavOrder] = useState<string[]>([]);
  const [navEditMode, setNavEditMode] = useState(false);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragIdxRef = useRef<number | null>(null);
  const visibleCards = useMemo(() => navOrder.map((id) => NAV_CARDS_MAP.get(id)!), [navOrder]);
  const hiddenCards = useMemo(() => hiddenNavOrder.map((id) => NAV_CARDS_MAP.get(id)!), [hiddenNavOrder]);
  const resetNavConfig = useCallback((): void => {
    setNavOrder(DEFAULT_NAV_ORDER);
    setHiddenNavOrder([]);
    setNavEditMode(false);
  }, []);
  const persistNavConfig = useCallback((visible: string[], hidden: string[]): void => {
    persisted.push({ visible: [...visible], hidden: [...hidden] });
  }, []);
  currentOrder = navOrder;
  return (
    <div data-fixture-revision={revision}>
      <CompatibleIndexSettingsSection visibleCards={visibleCards} hiddenCards={hiddenCards} navEditMode={navEditMode}
        dragOverIdx={dragOverIdx} navOrder={navOrder} hiddenNavOrder={hiddenNavOrder} dragIdxRef={dragIdxRef}
        setDragOverIdx={setDragOverIdx} setNavOrder={setNavOrder} setHiddenNavOrder={setHiddenNavOrder}
        setNavEditMode={setNavEditMode} resetNavConfig={resetNavConfig} persistNavConfig={persistNavConfig}
        setAppSettingsPage={routeHandlers.app} setMusicSettingsPage={routeHandlers.music}
        setAiSettingsPage={routeHandlers.ai} setNetworkSettingsPage={routeHandlers.network}
        setActiveTab={routeHandlers.tab} onAction={routeHandlers.action} />
    </div>
  );
}

/**
 * 用确定性的行为与工作量断言替代机器相关的耗时门槛。
 * @param condition - 待验证条件。
 * @param message - 条件不满足时的错误。
 * @returns 无返回值。
 */
function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

/**
 * 等待输入事件触发的 React 提交与 Effect。
 * @returns 下一事件循环后的 Promise。
 */
function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * 顺序提交依赖前一次页面状态的交互，避免并发输入互相覆盖。
 * @param items - 顺序执行的测试数据。
 * @param action - 每项交互及其验证。
 * @returns 全部交互完成后的 Promise。
 */
async function sequence<T>(items: T[], action: (item: T, index: number) => Promise<void>): Promise<void> {
  await items.reduce(async (previous, item, index) => {
    await previous;
    await action(item, index);
  }, Promise.resolve());
}

/**
 * 通过原生输入事件驱动受控输入，不调用组件内部方法。
 * @param query - 要输入的查询文本。
 * @returns 提交完成后的 Promise。
 */
async function search(query: string): Promise<void> {
  const input = document.querySelector<HTMLInputElement>('.settings-index-search-input')!;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, query);
  flushSync(() => input.dispatchEvent(new Event('input', { bubbles: true })));
  await settle();
  assert(input.value === query, 'Controlled search input lost its value.');
}

/**
 * 点击实际 DOM 控件并等待 React 更新。
 * @param element - 应存在的交互元素。
 * @returns 提交完成后的 Promise。
 */
async function click(element: Element | null | undefined): Promise<void> {
  assert(element instanceof HTMLElement, 'Expected an interactive element.');
  flushSync(() => (element as HTMLElement).click());
  await settle();
}

/**
 * 累计指定部分的翻译工作量。
 * @param part - 卡片翻译或搜索索引翻译。
 * @returns 该部分的翻译调用次数。
 */
function translationCount(part: 'cards' | 'search'): number {
  return [...translations].reduce((count, [key, calls]) => count + ((part === 'cards' ? key.startsWith('settings.nav.') : searchKeys.has(key)) ? calls : 0), 0);
}

/**
 * 按真实配置及翻译匹配搜索结果，验证各路由及搜索后的清空行为。
 * @param item - 需要命中的真实配置项。
 * @param expected - 应发生的路由事件。
 * @returns 验证完成后的 Promise。
 */
async function assertSearchRoute(item: SearchableSettingItem, expected: string[]): Promise<void> {
  const label = item.labelKey ? translate(item.labelKey, { defaultValue: item.label }) : item.label;
  await search(`  ${label.toUpperCase()}  `);
  const result = [...document.querySelectorAll('.settings-index-search-dropdown-item')].find((element) =>
    element.querySelector('.settings-index-search-dropdown-title')?.textContent === label);
  routeEvents.length = 0;
  await click(result);
  assert(JSON.stringify(routeEvents) === JSON.stringify(expected), `Incorrect search route for ${label}: ${routeEvents.join(', ')}.`);
  assert(document.querySelector<HTMLInputElement>('.settings-index-search-input')!.value === '', 'Search must clear after navigation.');
  assert(!document.querySelector('.settings-index-search-dropdown'), 'Search results remained after navigation.');
}

/**
 * 验证索引缓存、搜索状态隔离、Zustand 订阅和父组件 memo 边界。
 * @param expectOptimized - 当前工作树必须满足优化门槛，旧版基线只记录工作量。
 * @returns 确定性的性能统计。
 */
async function testRendering(expectOptimized: boolean): Promise<Record<string, number>> {
  assert(translationCount('search') === 0, 'Empty initial search translated the entire index.');
  const firstCards = translationCount('cards');
  const firstSection = counters.sectionRenders;
  await search('动');
  const firstSearch = translationCount('search');
  assert(firstSearch === indexTranslationCount, `First search must translate each index field once (${firstSearch} vs ${indexTranslationCount}).`);
  const inputStarted = performance.now();
  await sequence(['动画', '动画速', '动画速度', '', '动画'], search);
  const metrics = {
    searchableItems: SEARCHABLE_SETTINGS.length,
    firstSearchTranslations: firstSearch,
    subsequentInputTranslations: translationCount('search') - firstSearch,
    inputCardTranslations: translationCount('cards') - firstCards,
    inputSectionRenders: counters.sectionRenders - firstSection,
    inputMilliseconds: Number((performance.now() - inputStarted).toFixed(2)),
  };
  if (expectOptimized) {
    assert(metrics.subsequentInputTranslations === 0, 'Typing or clearing search rebuilt the translated index.');
    assert(metrics.inputCardTranslations === 0 && metrics.inputSectionRenders === 0, 'Typing search rerendered navigation cards.');
  }
  let previousRenders = counters.sectionRenders;
  await sequence(Array.from({ length: 20 }, (value, index) => index + 1), async (tick) => {
    flushSync(() => useFixtureStore.setState({ unrelatedTick: tick }));
    await settle();
  });
  const unrelatedStoreRenders = counters.sectionRenders - previousRenders;
  previousRenders = counters.sectionRenders;
  flushSync(() => root.render(<Fixture revision={1} />));
  await settle();
  const unrelatedParentRenders = counters.sectionRenders - previousRenders;
  if (expectOptimized) assert(unrelatedStoreRenders === 0 && unrelatedParentRenders === 0, 'Unrelated state rerendered navigation.');
  checks.push('lazy localized index, repeated search, unrelated store and parent updates');
  return { unrelatedStoreRenders, unrelatedParentRenders, ...metrics };
}

/**
 * 验证中文、英文、描述搜索、无结果与清空，以及全部类型的搜索路由。
 * @param expectOptimized - 当前工作树必须满足语言缓存门槛。
 * @returns 验证完成后的 Promise。
 */
async function testSearch(expectOptimized: boolean): Promise<void> {
  await assertSearchRoute(SEARCHABLE_SETTINGS[0], ['app:layout-preview', 'tab:app']);
  const beforeLanguage = translationCount('search');
  await i18n.changeLanguage('en-US');
  await settle();
  await search('alarm');
  if (expectOptimized) assert(translationCount('search') - beforeLanguage === indexTranslationCount, 'Language change must refresh the index once.');
  assert(document.querySelector('.settings-index-search-dropdown-item'), 'English search returned no results.');
  const routes: Array<[SearchableSettingItem | undefined, string[]]> = [
    [SEARCHABLE_SETTINGS.find((item) => item.musicPage === 'lyrics'), ['music:lyrics', 'tab:music']],
    [SEARCHABLE_SETTINGS.find((item) => item.aiPage === 'ollama'), ['ai:ollama', 'tab:ai']],
    [SEARCHABLE_SETTINGS.find((item) => item.networkPage === 'data-center'), ['network:data-center', 'tab:network']],
    [SEARCHABLE_SETTINGS.find((item) => item.actionId === 'user-questionnaire'), ['action:user-questionnaire']],
    [SEARCHABLE_SETTINGS.find((item) => item.tab === 'mail'), ['tab:mail']],
  ];
  await sequence(routes, async ([item, expected]) => {
    assert(Boolean(item), 'Missing real configuration for route test.');
    await assertSearchRoute(item!, expected);
  });
  const descriptionItem = SEARCHABLE_SETTINGS.find((item) => item.appPage === 'language')!;
  const description = translate(descriptionItem.descKey!, { defaultValue: descriptionItem.desc });
  await search(description);
  assert(Boolean(document.querySelector('.settings-index-search-dropdown-item')), 'Description search returned no results.');
  await search('not-a-real-setting-987654321');
  assert(Boolean(document.querySelector('.settings-index-search-dropdown-empty')), 'No-result message is missing.');
  await click(document.querySelector('.settings-index-search-clear'));
  assert(!document.querySelector('.settings-index-search-dropdown'), 'Clear button did not close results.');
  await search('   ');
  assert(!document.querySelector('.settings-index-search-dropdown'), 'Whitespace query must not show results.');
  await search('');
  checks.push('Chinese and English, case and whitespace normalization, description/empty search, six search route types');
}

/**
 * 验证普通卡片路由及原生拖拽、隐藏、添加、完成保存和恢复默认。
 * @param expectOptimized - 当前组件的拖拽反馈不应刷新父组件。
 * @returns 拖拽反馈期间父组件的渲染次数。
 */
async function testNavigation(expectOptimized: boolean): Promise<number> {
  const cards = [...document.querySelectorAll('.settings-index-card')];
  await sequence(DEFAULT_NAV_ORDER, async (id, index) => {
    const card = NAV_CARDS_MAP.get(id)!;
    let expected = [`tab:${card.tab}`];
    if (card.actionId) expected = [`action:${card.actionId}`];
    else if (card.appPage) expected = [`app:${card.appPage}`, 'tab:app'];
    else if (card.musicPage) expected = [`music:${card.musicPage}`, 'tab:music'];
    routeEvents.length = 0;
    await click(cards[index]);
    assert(JSON.stringify(routeEvents) === JSON.stringify(expected), `Incorrect card route for ${card.id}.`);
  });
  await click(document.querySelectorAll('.settings-nav-edit-btn')[1]);
  const editing = [...document.querySelectorAll('.settings-index-card.editing')];
  const dataTransfer = new DataTransfer();
  flushSync(() => editing[0].dispatchEvent(new DragEvent('dragstart', { dataTransfer, bubbles: true })));
  const beforeDrag = parentRenders;
  flushSync(() => editing[1].dispatchEvent(new DragEvent('dragover', { dataTransfer, bubbles: true, cancelable: true })));
  await settle();
  const dragParentRenders = parentRenders - beforeDrag;
  if (expectOptimized) assert(dragParentRenders === 0, 'Drag hover rerendered the settings parent.');
  assert(Boolean(document.querySelector('.drag-over')), 'Drag hover indicator did not appear.');
  flushSync(() => editing[1].dispatchEvent(new DragEvent('drop', { dataTransfer, bubbles: true, cancelable: true })));
  flushSync(() => editing[0].dispatchEvent(new DragEvent('dragend', { dataTransfer, bubbles: true })));
  await settle();
  assert(currentOrder[0] === DEFAULT_NAV_ORDER[1] && currentOrder[1] === DEFAULT_NAV_ORDER[0], 'Drag did not reorder cards.');
  assert(!document.querySelector('.drag-over'), 'Drag hover indicator did not clear.');
  const [hiddenId] = currentOrder;
  await click(document.querySelector('.settings-index-card-remove'));
  assert(!currentOrder.includes(hiddenId), 'Remove did not hide the card.');
  await click(document.querySelector('.settings-nav-add-item'));
  assert(currentOrder[currentOrder.length - 1] === hiddenId, 'Add did not restore the hidden card at the end.');
  await click(document.querySelectorAll('.settings-nav-edit-btn')[1]);
  assert(persisted.length === 1 && JSON.stringify(persisted[0].visible) === JSON.stringify(currentOrder) && persisted[0].hidden.length === 0, 'Done did not persist the edited navigation.');
  await click(document.querySelectorAll('.settings-nav-edit-btn')[0]);
  assert(JSON.stringify(currentOrder) === JSON.stringify(DEFAULT_NAV_ORDER), 'Reset did not restore defaults.');
  assert(!document.querySelector('.settings-index-card.editing'), 'Reset left navigation in edit mode.');
  checks.push(`all ${cards.length} card routes; drag, hide, add, persist and reset`);
  return dragParentRenders;
}

declare global {
  interface Window {
    runQuickNavTests: (expectOptimized: boolean) => Promise<Record<string, unknown>>;
  }
}

window.runQuickNavTests = async (expectOptimized) => {
  await i18n.use(initReactI18next).init({
    resources: { 'zh-CN': { translation: zhCN }, 'en-US': { translation: enUS } },
    lng: 'zh-CN', fallbackLng: 'zh-CN', interpolation: { escapeValue: false }, react: { useSuspense: false },
  });
  i18n.t = ((...args: Parameters<typeof i18n.t>) => {
    const key = String(args[0]);
    translations.set(key, (translations.get(key) ?? 0) + 1);
    return translate(...args);
  }) as typeof i18n.t;
  flushSync(() => root.render(<Fixture revision={0} />));
  await settle();
  const metrics = await testRendering(expectOptimized);
  await testSearch(expectOptimized);
  metrics.dragParentRenders = await testNavigation(expectOptimized);
  flushSync(() => root.unmount());
  return { checks, metrics, passed: checks.length };
};
