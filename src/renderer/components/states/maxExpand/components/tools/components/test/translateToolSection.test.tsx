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
 * @file translateToolSection.test.tsx
 * @description 验证翻译输入、按钮状态、结果操作及内部语言菜单交互。
 * @author 鸡哥
 */

import { Children } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushEffects, nodes, render, text, value } from '../../../../test/componentHarness';
import { SvgIcon } from '../../../../../../../utils/SvgIcon';
import { TRANSLATE_LANGUAGES } from '../../config/translateToolConfig';
import { TranslateToolSection } from '../TranslateToolSection';
import { fire } from './toolTestEvents';
import type { ReactElement, ReactNode } from 'react';
import type { UseTranslateToolResult } from '../../hooks/useTranslateTool';

const hook = vi.hoisted(() => vi.fn<() => UseTranslateToolResult>());
vi.mock('../../hooks/useTranslateTool', () => ({ useTranslateTool: hook }));
interface DropdownProps { options: readonly { code: string; labelKey: string }[]; value: string; onChange: (code: string) => void; }

/**
 * 提取语言菜单的真实私有组件。
 * @param tree - 翻译组件元素树。
 * @returns 来源语言菜单。
 */
function sourceDropdown(tree: ReactNode): ReactElement<DropdownProps> {
  const [{ props }] = nodes(tree, '.translate-lang-row');
  return Children.toArray(props.children as ReactNode)[0] as ReactElement<DropdownProps>;
}

describe('TranslateToolSection', () => {
  let state: UseTranslateToolResult;
  beforeEach(() => {
    state = { sourceLang: 'auto', targetLang: 'en', sourceText: '', resultText: '', translating: false,
      setSourceLang: vi.fn(), setTargetLang: vi.fn(), setSourceText: vi.fn(), handleSwapLanguages: vi.fn(),
      handleTranslate: vi.fn(), handleCopyResult: vi.fn(), handleClearAll: vi.fn() };
    hook.mockImplementation(() => state);
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it.each([
    { sourceText: '', translating: false, disabled: true },
    { sourceText: '   ', translating: false, disabled: true },
    { sourceText: 'hello', translating: false, disabled: false },
    { sourceText: 'hello', translating: true, disabled: true },
  ])('翻译按钮对应输入 "$sourceText" 与忙碌状态 $translating', ({ sourceText, translating, disabled }) => {
    Object.assign(state, { sourceText, translating });
    const tree = render(TranslateToolSection);
    expect(value(tree, '.download-start-btn-full', 'disabled')).toBe(disabled);
    expect(value(tree, '.translate-swap-btn', 'disabled')).toBe(true);
    expect(value(tree, '.translate-char-count', 'children')).toBe(sourceText.length);
    expect(value(tree, 'textarea', 'readOnly', 1)).toBe(true);
    expect(nodes(tree, '.translate-inline-btn')).toHaveLength(sourceText ? 1 : 0);
    if (translating) expect(text(tree)).toContain('translate.translating');
  });

  it('输入、交换、翻译、清空与复制分别转发给对应操作', () => {
    Object.assign(state, { sourceLang: 'zh', sourceText: '你好', resultText: 'hello' });
    const tree = render(TranslateToolSection);
    fire(tree, 'textarea', 'onChange', 0, { target: { value: 'next' } });
    fire(tree, '.translate-swap-btn', 'onClick');
    fire(tree, '.download-start-btn-full', 'onClick');
    fire(tree, '.translate-inline-btn', 'onClick', 0);
    fire(tree, '.translate-inline-btn', 'onClick', 1);
    expect(state.setSourceText).toHaveBeenCalledWith('next');
    expect(state.handleSwapLanguages).toHaveBeenCalledOnce();
    expect(state.handleTranslate).toHaveBeenCalledOnce();
    expect(state.handleClearAll).toHaveBeenCalledOnce();
    expect(state.handleCopyResult).toHaveBeenCalledOnce();
    const { props } = sourceDropdown(tree);
    expect(props.options).toBe(TRANSLATE_LANGUAGES);
    expect(props.onChange).toBe(state.setSourceLang);
  });

  it('自动识别菜单显示AI图标，打开后选择语言并关闭菜单', () => {
    const { type, props } = sourceDropdown(render(TranslateToolSection));
    let tree = render(type, props);
    expect(value(tree, 'img', 'src')).toBe(SvgIcon.AI);
    expect(nodes(tree, '.translate-lang-dropdown-menu')).toHaveLength(0);
    fire(tree, '.translate-lang-dropdown-trigger', 'onClick');
    tree = render(type, props);
    expect(nodes(tree, '.translate-lang-dropdown-item')).toHaveLength(TRANSLATE_LANGUAGES.length);
    fire(tree, '.translate-lang-dropdown-item', 'onClick', 1);
    expect(state.setSourceLang).toHaveBeenCalledWith(TRANSLATE_LANGUAGES[1].code);
    expect(nodes(render(type, props), '.translate-lang-dropdown-menu')).toHaveLength(0);
  });

  it('未知语言使用原值，外部点击关闭菜单并清理监听', () => {
    Object.assign(state, { sourceLang: 'unknown-language' });
    const { type, props } = sourceDropdown(render(TranslateToolSection));
    let tree = render(type, props);
    expect(text(tree)).toContain('unknown-language');
    expect(nodes(tree, '.translate-lang-flag-placeholder')).toHaveLength(1);
    fire(tree, '.translate-lang-dropdown-trigger', 'onClick');
    tree = render(type, props);
    const ref = value(tree, '.translate-lang-dropdown', 'ref') as { current: { contains: () => boolean } | null };
    ref.current = { contains: () => false };
    const documentTarget = new EventTarget();
    const remove = vi.spyOn(documentTarget, 'removeEventListener');
    vi.stubGlobal('document', documentTarget);
    const cleanups = flushEffects();
    documentTarget.dispatchEvent(new Event('mousedown'));
    expect(nodes(render(type, props), '.translate-lang-dropdown-menu')).toHaveLength(0);
    cleanups.forEach((cleanup) => { cleanup(); });
    expect(remove).toHaveBeenCalledWith('mousedown', expect.any(Function));
  });
});
