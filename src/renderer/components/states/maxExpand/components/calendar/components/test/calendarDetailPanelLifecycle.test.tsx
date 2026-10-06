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
 * @file calendarDetailPanelLifecycle.test.tsx
 * @description 验证真实日历筛选、农历分支和图片 IPC 异步加载、日期切换与卸载清理。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../../../../components/test/contentLifecycleHarness';
import { elements, hookMocks, textContent } from '../../../../../../test/elementHarness';
import { CalendarDetailPanel } from '../CalendarDetailPanel';
import type { CalendarDetailPanelProps } from '../../types/calendarTypes';
import type { CalendarTimelineEvent } from '../../types/calendarTimelineTypes';

vi.mock('react', async (load) => ({
  ...await load<typeof import('react')>(), ...hookMocks, ...lifecycleHooks,
}));
vi.mock('react-i18next', async (load) => ({
  ...await load<typeof import('react-i18next')>(),
  useTranslation: () => ({ t: (key: string) => key }),
}));

const loadWallpaperFile = vi.fn<(path: string) => Promise<string | null>>();
const date = new Date(2026, 9, 6, 12);
const formats = {
  full: new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }),
  month: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }),
  weekday: new Intl.DateTimeFormat('en-US', { weekday: 'short' }),
  lunar: new Intl.DateTimeFormat('zh-CN-u-ca-chinese'),
  lunarDay: new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { day: 'numeric' }),
};
const props: CalendarDetailPanelProps = {
  formats, selectedDate: date, selectedDay: 6, relativeLabel: 'Today', locale: 'en-US', events: [],
  holidayInfo: {
    holidays: new Map(), countryCode: 'US', subdivisionCode: '', subdivisionCodes: [],
    status: 'ready', retry: vi.fn(), selectSubdivision: vi.fn(),
  },
};
/** 构造公开倒数日事件。
 * @param backgroundImage - 本地路径或图片地址。
 * @returns 所选日的合法事件。
 */
function event(backgroundImage?: string): CalendarTimelineEvent {
  return { backgroundImage, id: 'release', kind: 'countdown', label: 'Release', start: '2026-10-06', end: '2026-10-06' };
}
/** 执行真实组件及 effect。
 * @param overrides - 本轮公开属性变更。
 * @returns 实际 JSX 元素树。
 */
function render(overrides: Partial<CalendarDetailPanelProps> = {}) {
  // 属性更新必须覆盖初始值。
  // eslint-disable-next-line prefer-object-spread -- 保留初始属性后应用本轮覆盖值。
  const input = Object.assign({}, props, overrides);
  const tree = renderWithHooks(() => CalendarDetailPanel(input));
  runEffects();
  return tree;
}
/** 结算本地加载 Promise 链。
 * @returns 无返回值。
 */
async function settle(): Promise<void> {
  // eslint-disable-next-line no-await-in-loop -- 逐轮结算实际 Promise 后续回调，并行 await 无法推进链。
  for (let index = 0; index < 8; index++) await Promise.resolve();
}
/** 提取真实背景元素。
 * @param tree - 实际元素树。
 * @returns 背景元素集合。
 */
function backgrounds(tree: ReturnType<typeof render>) {
  return elements(tree).filter(({ props: attributes }) => attributes.className === 'calendar-details-background');
}

describe('CalendarDetailPanel 背景生命周期与日期展示', () => {
  beforeEach(() => {
    resetLifecycle();
    loadWallpaperFile.mockReset().mockResolvedValue('data:image/png;base64,loaded');
    vi.stubGlobal('window', { api: { loadWallpaperFile } });
  });
  afterEach(() => { unmountHooks(); vi.unstubAllGlobals(); });

  it.each(['en-US', 'zh-CN', 'ja-JP'])('执行 %s 真实日期格式与农历分支', (locale) => {
    const tree = render({ locale });
    expect(textContent(tree)).toContain('Today');
    expect(textContent(tree)).toContain(formats.full.format(date));
    const lunar = elements(tree).filter(({ props: attributes }) => attributes.className === 'calendar-lunar-details');
    expect(lunar).toHaveLength(locale === 'en-US' ? 0 : 1);
    expect(backgrounds(tree)).toHaveLength(0);
  });

  it('筛选跨日待办、年度倒数日及未完成标记，并保留真实假日子组件', () => {
    const events: CalendarTimelineEvent[] = [
      { id: 'done', kind: 'todo', label: 'Done', start: '2026-10-01', end: '2026-10-10', done: true },
      { id: 'open', kind: 'todo', label: 'Open', start: '2026-10-06', end: '2026-10-06', done: false },
      { id: 'past', kind: 'todo', label: 'Past', start: '2026-10-01', end: '2026-10-05' },
      { id: 'future', kind: 'todo', label: 'Future', start: '2026-10-07', end: '2026-10-10' },
      { ...event(), start: '2020-10-06', end: '2020-10-06', repeat: 'yearly' },
      { ...event(), id: 'other', start: '2026-10-07', end: '2026-10-07' },
    ];
    const tree = render({ events });
    expect(textContent(tree)).toContain('Release');
    expect(textContent(tree)).toContain('Done · maxExpand.calendar.eventCompleted');
    expect(textContent(tree)).toContain('Open');
    expect(textContent(tree)).not.toContain('Past');
    expect(textContent(tree)).not.toContain('Future');
    const todos = elements(tree).filter(({ props: attributes }) => 'data-done' in attributes);
    expect(todos.map(({ props: attributes }) => attributes['data-done'])).toEqual([true, undefined]);
    const child = elements(tree).find(({ type }) => typeof type === 'function');
    expect(child?.props.info).toBe(props.holidayInfo);
  });

  it('远程背景直接标准化，本地背景通过真实 normalizeImageSource 调用 IPC', async () => {
    const remote = [event('https://example.test/bg.png')];
    render({ events: remote });
    await settle();
    const tree = render({ events: remote });
    expect(backgrounds(tree)[0]?.props.style).toEqual({ backgroundImage: 'url("https://example.test/bg.png")' });
    expect(loadWallpaperFile).not.toHaveBeenCalled();
    const local = [event('C:/wallpaper.png')];
    expect(backgrounds(render({ events: local }))).toHaveLength(0);
    await settle();
    expect(loadWallpaperFile).toHaveBeenCalledWith('C:/wallpaper.png');
    expect(backgrounds(render({ events: local }))[0]?.props.style).toEqual({ backgroundImage: 'url("data:image/png;base64,loaded")' });
    expect(backgrounds(render({ events: [] }))).toHaveLength(0);
  });

  it('日期切换与卸载后忽略旧加载结果', async () => {
    let resolve!: (value: string | null) => void;
    loadWallpaperFile.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    render({ events: [event('C:/old.png')] });
    render({ events: [] });
    resolve('data:image/png;base64,old');
    await settle();
    expect(backgrounds(render())).toHaveLength(0);
    loadWallpaperFile.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    render({ events: [event('C:/pending.png')] });
    unmountHooks();
    resolve('data:image/png;base64,pending');
    await settle();
    expect(backgrounds(render({ events: [event('C:/pending.png')] }))).toHaveLength(0);
  });

  it('IPC 拒绝时保留真实路径回退，桥接同步失败清理旧背景', async () => {
    const local = [event('C:/fallback.png')];
    loadWallpaperFile.mockRejectedValueOnce(new Error('unavailable'));
    render({ events: local });
    await settle();
    expect(backgrounds(render({ events: local }))[0]?.props.style).toEqual({ backgroundImage: 'url("C:/fallback.png")' });
    loadWallpaperFile.mockImplementationOnce(() => { throw new Error('bridge unavailable'); });
    const failed = [event('C:/broken.png')];
    render({ events: failed });
    await settle();
    expect(backgrounds(render({ events: failed }))).toHaveLength(0);
  });

  it('卸载后的桥接异常不会提交背景状态', async () => {
    loadWallpaperFile.mockImplementationOnce(() => { throw new Error('bridge unavailable'); });
    const failed = [event('C:/broken.png')];
    render({ events: failed });
    unmountHooks();
    await settle();
    expect(backgrounds(render({ events: failed }))).toHaveLength(0);
  });
});
