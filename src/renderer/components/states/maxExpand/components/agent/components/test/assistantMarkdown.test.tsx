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
 * @file assistantMarkdown.test.tsx
 * @description AssistantMarkdown 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import ReactMarkdown from 'react-markdown';
import { render, value, text } from '../../../../test/componentHarness';
import { AssistantMarkdown as Component } from '../AssistantMarkdown';
import { MarkdownCodeBlock } from '../MarkdownCodeBlock';
import { MarkdownSiteLink } from '../MarkdownSiteLink';
import type { ReactElement } from 'react';
describe('AssistantMarkdown', () => {
  it('passes content and GFM and distinguishes inline code, fenced code and links', () => {
    const tree = render(Component, { content: '**answer**' });
    expect(value(tree, ReactMarkdown, 'children')).toBe('**answer**');
    expect(value(tree, ReactMarkdown, 'remarkPlugins')).toHaveLength(1);
    const mapping = value(tree, ReactMarkdown, 'components') as Record<string, (props: { className?: string; children?: string; href?: string }) => ReactElement<{ href?: string }>>;
    expect(mapping.code({ children: 'x' }).type).toBe('code');
    expect(mapping.code({ className: 'language-ts', children: 'x' }).type).toBe(MarkdownCodeBlock);
    expect(mapping.a({ children: 'link' }).props.href).toBe('');
    expect(mapping.a({ href: 'https://example.com', children: 'link' }).type).toBe(MarkdownSiteLink);
    expect(text(mapping.pre({ children: 'body' }))).toBe('body');
  });
});
