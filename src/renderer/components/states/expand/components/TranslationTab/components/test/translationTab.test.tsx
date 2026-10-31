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
 * @file translationTab.test.tsx
 * @description 展开翻译页输入、按钮边界、语言菜单定位及外部点击清理测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type ReactElement, type ReactNode } from 'react';
import { flushEffects, nodes, render, text, value } from '../../../maxExpand/test/componentHarness';
import { fire } from '../../../maxExpand/components/tools/components/test/toolTestEvents';
import { TranslationTab } from '../TranslationTab';
import type { UseTranslateToolResult } from '../../../maxExpand/components/tools/hooks/useTranslateTool';

const hook = vi.hoisted(() => vi.fn<() => UseTranslateToolResult>());
vi.mock('../../../maxExpand/components/tools/hooks/useTranslateTool', () => ({ useTranslateTool: hook }));
vi.mock('react-dom', () => ({ createPortal: (children: ReactNode) => children }));

interface LanguageProps { value: string; options: readonly { code: string; labelKey: string }[]; onChange: (code: string) => void; }

/**
 * 提取真实私有语言菜单。
 * @returns 来源菜单组件及输入。
 */
function dropdown(): ReactElement<LanguageProps> {
  const [{ props }] = nodes(render(TranslationTab), '.translation-language-block');
  return props.children as ReactElement<LanguageProps>;
}

describe('TranslationTab', () => {
  let state: UseTranslateToolResult;
  beforeEach(() => {
    state = { sourceLang: 'auto', targetLang: 'en', sourceText: '', resultText: '', translating: false,
      setSourceLang: vi.fn(), setTargetLang: vi.fn(), setSourceText: vi.fn(), handleSwapLanguages: vi.fn(),
      handleTranslate: vi.fn(), handleCopyResult: vi.fn(), handleClearAll: vi.fn() };
    hook.mockImplementation(() => state);
    vi.stubGlobal('document', Object.assign(new EventTarget(), { body: {} }));
    vi.stubGlobal('window', { innerHeight: 200 });
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it.each([
    { sourceText: '', translating: false, disabled: true },
    { sourceText: '  ', translating: false, disabled: true },
    { sourceText: 'hello', translating: false, disabled: false },
    { sourceText: 'hello', translating: true, disabled: true },
  ])('翻译按钮依输入和忙碌状态禁用：$sourceText/$translating', ({ sourceText, translating, disabled }) => {
    Object.assign(state, { sourceText, translating });
    const tree = render(TranslationTab);
    expect(value(tree, '.translation-primary-btn', 'disabled')).toBe(disabled);
    expect(value(tree, '.translation-swap-btn', 'disabled')).toBe(true);
    expect(value(tree, '.translation-copy-btn', 'disabled')).toBe(true);
    expect(value(tree, '.translation-secondary-btn', 'disabled')).toBe(!sourceText);
    expect(value(tree, 'textarea', 'readOnly', 1)).toBe(true);
    if (translating) expect(value(tree, '.translation-primary-btn', 'title')).toContain('translating');
  });

  it('输入、交换、翻译、复制、清空转发，两个文本区阻止滚轮冒泡', () => {
    Object.assign(state, { sourceLang: 'zh', sourceText: '你好', resultText: 'hello' });
    const tree = render(TranslationTab);
    fire(tree, 'textarea', 'onChange', 0, { target: { value: 'next' } });
    fire(tree, '.translation-primary-btn', 'onClick');
    fire(tree, '.translation-swap-btn', 'onClick');
    fire(tree, '.translation-secondary-btn', 'onClick');
    fire(tree, '.translation-copy-btn', 'onClick');
    expect(state.setSourceText).toHaveBeenCalledWith('next');
    [state.handleTranslate, state.handleSwapLanguages, state.handleClearAll, state.handleCopyResult].forEach((fn) => { expect(fn).toHaveBeenCalledOnce(); });
    const event = { stopPropagation: vi.fn() };
    [0, 1].forEach((index) => {
      fire(tree, 'textarea', 'onWheel', index, event);
      fire(tree, 'textarea', 'onWheelCapture', index, event);
    });
    expect(event.stopPropagation).toHaveBeenCalledTimes(4);
    expect(dropdown().props.onChange).toBe(state.setSourceLang);
  });

  it('菜单打开、选择语言关闭，未知语言显示原值与占位图标', () => {
    state.sourceLang = 'unknown';
    const { type, props } = dropdown();
    let tree = render(type, props);
    expect(text(tree)).toContain('unknown');
    expect(nodes(tree, '.translation-lang-flag-placeholder')).toHaveLength(1);
    fire(tree, '.translation-lang-dropdown-trigger', 'onClick');
    tree = render(type, props);
    expect(nodes(tree, '.translation-lang-dropdown-item')).toHaveLength(props.options.length);
    fire(tree, '.translation-lang-dropdown-item', 'onClick', 1);
    expect(state.setSourceLang).toHaveBeenCalledWith(props.options[1].code);
    expect(value(render(type, props), '.translation-lang-dropdown-trigger', 'aria-expanded')).toBe(false);
  });

  it('菜单按容器余量定位，外部点击关闭且卸载清理监听', () => {
    const { type, props } = dropdown();
    fire(render(type, props), '.translation-lang-dropdown-trigger', 'onClick');
    const tree = render(type, props);
    const contains = vi.fn(() => false);
    const wrapper = value(tree, '.translation-lang-dropdown', 'ref') as { current: unknown };
    wrapper.current = { contains, getBoundingClientRect: () => ({ bottom: 100, left: 12, width: 90 }),
      closest: () => ({ getBoundingClientRect: () => ({ bottom: 150 }) }) };
    const cleanups = flushEffects();
    expect(value(render(type, props), '.translation-lang-dropdown-menu', 'style')).toEqual({ position: 'fixed', top: 104, left: 12, width: 90, maxHeight: 80 });
    document.dispatchEvent(new Event('mousedown'));
    expect(value(render(type, props), '.translation-lang-dropdown-trigger', 'aria-expanded')).toBe(false);
    const remove = vi.spyOn(document, 'removeEventListener');
    cleanups.forEach((cleanup) => cleanup());
    expect(remove).toHaveBeenCalledWith('mousedown', expect.any(Function));
  });
});
