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
 * @file useQuestionnaireNavigation.test.ts
 * @description 问卷导航 Hook 的真实滚动状态、交集观察、程序滚动抑制与 effect 清理测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks } from '../../../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../../../test/elementHarness';
import { renderWithHooks, resetBrowser, runEffects, unmountHooks } from '../../../register/hooks/test/authHookHarness';
import { useQuestionnaireNavigation } from '../useQuestionnaireNavigation';
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
let notify: IntersectionObserverCallback;
const observed = { observe: vi.fn(), disconnect: vi.fn() };
const constructor = vi.fn<(callback: IntersectionObserverCallback, options: IntersectionObserverInit) => typeof observed>(
  // eslint-disable-next-line prefer-arrow-callback -- 浏览器构造函数叶边界必须允许 new 调用。
  function createObserver(callback, options) {
    notify = callback; void options; return observed;
  },
);
beforeEach(() => { vi.useFakeTimers(); resetBrowser(); vi.stubGlobal('IntersectionObserver', constructor); });
afterEach(() => { unmountHooks(); vi.useRealTimers(); vi.unstubAllGlobals(); });
/**
 * 创建只提供滚动与事件接口的浏览器元素叶边界。
 * @returns 滚动容器与三个题目引用。
 */
function nodes() {
  const container = Object.assign(new EventTarget(), { scrollTop: 0, scrollHeight: 1000, clientHeight: 200, scrollTo: vi.fn() });
  const questions = Array.from({ length: 3 }, () => ({ scrollIntoView: vi.fn() }));
  return { container, questions };
}
/**
 * 向真实观察者回调发送浏览器交集记录。
 * @param target - 浏览器观察目标叶边界。
 * @param isIntersecting - 是否相交。
 * @returns 无返回值。
 */
function intersection(target: object, isIntersecting: boolean): void {
  notify([{ target, isIntersecting } as IntersectionObserverEntry], observed as unknown as IntersectionObserver);
}
describe('useQuestionnaireNavigation 真实导航与 effect', () => {
  it('未绑定容器或题目时安全返回，不创建观察者', () => {
    const result = renderWithHooks(() => useQuestionnaireNavigation(3, null));
    result.scrollToQuestion(0); runEffects(); expect(constructor).not.toHaveBeenCalled();
    expect(result.activeIndex).toBe(0);
  });
  it('零题目仅重置滚动位置，不创建观察者', () => {
    const { container } = nodes(); const result = renderWithHooks(() => useQuestionnaireNavigation(0, 1));
    result.scrollRef.current = container as unknown as HTMLDivElement;
    runEffects(); expect(container.scrollTo).toHaveBeenCalledWith({ top: 0 }); expect(constructor).not.toHaveBeenCalled();
  });
  it('观察有效节点，根据交集更新题号并忽略无交集和未知目标', () => {
    const { container, questions } = nodes(); let result = renderWithHooks(() => useQuestionnaireNavigation(3, 1));
    result.scrollRef.current = container as unknown as HTMLDivElement;
    result.questionRefs.current = [questions[0] as unknown as HTMLElement, null, questions[2] as unknown as HTMLElement];
    runEffects();
    expect(constructor.mock.calls[0][1]).toEqual({ root: container, rootMargin: '-10% 0px -80% 0px', threshold: 0 });
    expect(observed.observe.mock.calls).toEqual([[questions[0]], [questions[2]]]);
    intersection(questions[2], false); intersection({}, true); result = renderWithHooks(() => useQuestionnaireNavigation(3, 1));
    expect(result.activeIndex).toBe(0);
    intersection(questions[2], true); result = renderWithHooks(() => useQuestionnaireNavigation(3, 1)); expect(result.activeIndex).toBe(2);
  });
  it('点击导航期间忽略交集与滚动，600ms后恢复并识别底部', () => {
    const { container, questions } = nodes(); let result = renderWithHooks(() => useQuestionnaireNavigation(3, 1));
    result.scrollRef.current = container as unknown as HTMLDivElement;
    result.questionRefs.current = questions as unknown as HTMLElement[]; runEffects();
    result.scrollToQuestion(1); expect(questions[1].scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    intersection(questions[0], true); container.scrollTop = 800; container.dispatchEvent(new Event('scroll'));
    result = renderWithHooks(() => useQuestionnaireNavigation(3, 1)); expect(result.activeIndex).toBe(1);
    vi.advanceTimersByTime(599); intersection(questions[0], true); expect(renderWithHooks(() => useQuestionnaireNavigation(3, 1)).activeIndex).toBe(1);
    vi.advanceTimersByTime(1); container.scrollTop = 500; container.dispatchEvent(new Event('scroll'));
    expect(renderWithHooks(() => useQuestionnaireNavigation(3, 1)).activeIndex).toBe(1);
    container.scrollTop = 798; container.dispatchEvent(new Event('scroll'));
    result = renderWithHooks(() => useQuestionnaireNavigation(3, 1)); expect(result.activeIndex).toBe(2);
    intersection(questions[0], true); expect(renderWithHooks(() => useQuestionnaireNavigation(3, 1)).activeIndex).toBe(0);
  });
  it('切换问卷重置题号与滚动，题数变化清理观察者和事件，卸载不再响应滚动', () => {
    const { container, questions } = nodes(); let result = renderWithHooks(() => useQuestionnaireNavigation(3, 1));
    result.scrollRef.current = container as unknown as HTMLDivElement; result.questionRefs.current = questions as unknown as HTMLElement[]; runEffects();
    intersection(questions[2], true); result = renderWithHooks(() => useQuestionnaireNavigation(2, 2)); runEffects();
    result = renderWithHooks(() => useQuestionnaireNavigation(2, 2)); expect(result.activeIndex).toBe(0);
    expect(container.scrollTo).toHaveBeenCalledTimes(2); expect(observed.disconnect).toHaveBeenCalledOnce();
    container.scrollTop = 800; container.dispatchEvent(new Event('scroll')); expect(renderWithHooks(() => useQuestionnaireNavigation(2, 2)).activeIndex).toBe(1);
    unmountHooks(); expect(observed.disconnect).toHaveBeenCalledTimes(2);
    container.scrollTop = 0; container.dispatchEvent(new Event('scroll')); expect(renderWithHooks(() => useQuestionnaireNavigation(2, 2)).activeIndex).toBe(1);
  });
});
