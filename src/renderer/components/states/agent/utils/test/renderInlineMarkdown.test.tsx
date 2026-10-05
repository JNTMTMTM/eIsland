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
 * @file renderInlineMarkdown.test.tsx
 * @description renderInlineMarkdown 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { elements } from '../../../test/tree';

import { renderInlineMarkdown } from '../renderInlineMarkdown';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));
describe('renderInlineMarkdown', () => {
  it('renders strong, emphasis and deletion while preserving surrounding text', () => { const nodes = renderInlineMarkdown('before **bold** and *italic* plus ~~deleted~~ after'); const markup = renderToStaticMarkup(createElement('div', {}, nodes)); expect(markup).toBe('<div>before <strong>bold</strong> and <em>italic</em> plus <del>deleted</del> after</div>'); });
  it('leaves unmatched markdown and HTML as escaped text', () => { expect(renderInlineMarkdown('plain **unfinished')).toEqual(['plain **unfinished']); const markup = renderToStaticMarkup(createElement('div', {}, renderInlineMarkdown('<script>bad</script>'))); expect(markup).toContain('&lt;script&gt;'); expect(markup).not.toContain('<script>'); });
  it('handles empty and adjacent formatted segments', () => { expect(renderInlineMarkdown('')).toEqual([]); const nodes = renderInlineMarkdown('**one***two*'); expect(elements(createElement('div', {}, nodes)).filter((node) => node.type === 'strong' || node.type === 'em').map((node) => node.type)).toEqual(['strong', 'em']); });
});
