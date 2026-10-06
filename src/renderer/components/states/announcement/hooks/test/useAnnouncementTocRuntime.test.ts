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
 * @file useAnnouncementTocRuntime.test.ts
 * @description 公告目录提取、真实滚动高亮、平滑跳转与定时器清理边界测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushHookEffects, renderHook, resetHook, unmountHook } from './announcementHookHarness';
const purified = vi.hoisted(() => ({
  sanitize: vi.fn((html: string) => html.replace('<script>bad</script>', ''))
}));
vi.mock('dompurify', () => ({
  default: purified
}));
const {
  useAnnouncementToc
} = await import('../useAnnouncementToc');
type Result = ReturnType<typeof useAnnouncementToc>;
/** 创建浏览器章节叶节点。
 * @param label - 标题文字
 * @param top - 正文位置
 * @param tagName - 标题级别
 * @returns 浏览器节点叶实现
 */
function heading(label: string | null, top: number, tagName = 'H2') {
  return {
    tagName,
    textContent: label,
    getBoundingClientRect: vi.fn(() => ({
      top,
      height: 24
    })),
    scrollIntoView: vi.fn()
  };
}
let headings: ReturnType<typeof heading>[];
let sanitized = '';
/** 挂载正文与目录原生节点。
 * @param result - 真实 Hook
 * @returns 叶节点与真实注册监听器触发入口
 */
function attach(result: Result) {
  let scroll: (() => void) | undefined;
  const body = {
    querySelectorAll: vi.fn(() => headings),
    getBoundingClientRect: vi.fn(() => ({
      top: 100
    })),
    addEventListener: vi.fn((...[, handler]: [string, () => void]) => {
      scroll = handler;
    }),
    removeEventListener: vi.fn()
  };
  const {
    bodyRef,
    tocRef,
    itemRefs
  } = result;
  bodyRef.current = body as unknown as HTMLDivElement;
  tocRef.current = {
    scrollTop: 8,
    getBoundingClientRect: () => ({
      top: 10
    })
  } as HTMLDivElement;
  itemRefs.current = headings.map((...[, index]) => ({
    getBoundingClientRect: () => ({
      top: 20 + index * 30,
      height: 24
    })
  })) as HTMLDivElement[];
  return {
    body,
    scroll: () => scroll?.()
  };
}
/** 保留同一实例并读取真实状态。
 * @param contentHtml - 正文
 * @param showVideo - 视频模式
 * @returns Hook 状态
 */
function run(contentHtml = '<h2>first</h2>', showVideo = false): Result {
  return renderHook(useAnnouncementToc, {
    contentHtml,
    showVideo
  });
}
beforeEach(() => {
  resetHook();
  vi.clearAllMocks();
  vi.useFakeTimers();
  sanitized = '';
  headings = [heading(' First ', 300, 'H1'), heading('Second', 110, 'H3'), heading('Third', 500)];
  vi.stubGlobal('document', {
    createElement: vi.fn(() => ({
      set innerHTML(value: string) {
        sanitized = value;
      },
      querySelectorAll: () => headings
    }))
  });
});
afterEach(() => {
  unmountHook();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('useAnnouncementToc real lifecycle', () => {
  it('extracts sanitized nonempty headings and memoizes unchanged content', () => {
    headings.push(heading(null, 0), heading('   ', 0));
    const initial = run('<h2>first</h2><script>bad</script>');
    expect(initial.headings).toEqual([{
      level: 1,
      text: 'First'
    }, {
      level: 3,
      text: 'Second'
    }, {
      level: 2,
      text: 'Third'
    }]);
    expect(sanitized).toBe('<h2>first</h2>');
    expect(run('<h2>first</h2><script>bad</script>').headings).toBe(initial.headings);
    expect(purified.sanitize).toHaveBeenCalledTimes(1);
  });
  it('empty content does not parse or subscribe even with a body', () => {
    const refs = attach(run(''));
    flushHookEffects();
    expect(run('').headings).toEqual([]);
    expect(refs.body.addEventListener).not.toHaveBeenCalled();
    expect(purified.sanitize).not.toHaveBeenCalled();
  });
  it('missing body skips effect and still records a requested selection safely', () => {
    const current = run();
    flushHookEffects();
    current.handleTocClick('missing', 9);
    expect(run().activeIndex).toBe(9);
    expect(run().indicatorTop).toBe(0);
    vi.advanceTimersByTime(1000);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('video mode skips the scroll listener', () => {
    const refs = attach(run(undefined, true));
    flushHookEffects();
    expect(refs.body.addEventListener).not.toHaveBeenCalled();
  });
  it('tracks the nearest heading and relative indicator geometry', () => {
    const refs = attach(run());
    flushHookEffects();
    expect(run().activeIndex).toBe(1);
    expect(run().indicatorTop).toBe(54);
    headings[0].getBoundingClientRect.mockReturnValue({
      top: 101,
      height: 24
    });
    refs.scroll();
    expect(run().activeIndex).toBe(0);
    expect(run().indicatorTop).toBe(24);
    expect(refs.body.addEventListener).toHaveBeenCalledWith('scroll', expect.any(Function), {
      passive: true
    });
  });
  it('empty heading lists preserve the initial highlight', () => {
    headings = [];
    const refs = attach(run());
    flushHookEffects();
    refs.scroll();
    expect(run().activeIndex).toBe(-1);
  });
  it('missing directory nodes do not prevent highlight updates', () => {
    const result = run();
    attach(result);
    const {
      tocRef
    } = result;
    tocRef.current = null;
    flushHookEffects();
    expect(run().activeIndex).toBe(1);
    expect(run().indicatorTop).toBe(0);
  });
  it('smooth clicks keep selected heading during scroll until idle, then follow position', () => {
    const refs = attach(run());
    flushHookEffects();
    run().handleTocClick('Third', 2);
    expect(headings[2].scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start'
    });
    expect(run().activeIndex).toBe(2);
    expect(run().indicatorTop).toBe(84);
    refs.scroll();
    vi.advanceTimersByTime(119);
    refs.scroll();
    vi.advanceTimersByTime(119);
    expect(run().activeIndex).toBe(2);
    vi.advanceTimersByTime(1);
    refs.scroll();
    expect(run().activeIndex).toBe(1);
  });
  it('missing and null-text headings are not scrolled into view', () => {
    headings.unshift(heading(null, 1000));
    attach(run());
    flushHookEffects();
    run().handleTocClick('absent', 30);
    expect(headings.every((item) => item.scrollIntoView.mock.calls.length === 0)).toBe(true);
    expect(run().activeIndex).toBe(30);
    expect(vi.getTimerCount()).toBe(1);
  });
  it('consecutive clicks replace timer and find trimmed heading text', () => {
    attach(run());
    flushHookEffects();
    run().handleTocClick('Third', 2);
    run().handleTocClick('First', 0);
    expect(headings[0].scrollIntoView).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(1000);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('unmount clears pending timer and unregisters the exact listener', () => {
    const refs = attach(run());
    flushHookEffects();
    run().handleTocClick('First', 0);
    unmountHook();
    expect(vi.getTimerCount()).toBe(0);
    const [[, callback]] = refs.body.addEventListener.mock.calls;
    expect(refs.body.removeEventListener).toHaveBeenCalledWith('scroll', callback);
  });
  it('video transitions remove the listener without a pending timer and restore following', () => {
    const refs = attach(run());
    flushHookEffects();
    run(undefined, true);
    flushHookEffects();
    expect(refs.body.removeEventListener).toHaveBeenCalledTimes(1);
    run();
    flushHookEffects();
    expect(refs.body.addEventListener).toHaveBeenCalledTimes(2);
    expect(run().activeIndex).toBe(1);
  });
});
