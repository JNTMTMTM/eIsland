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
 * @file markdownCodeBlock.test.tsx
 * @description MarkdownCodeBlock 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, nodes, value, trigger, text } from '../../../../test/componentHarness';
import { MarkdownCodeBlock as Component } from '../MarkdownCodeBlock';

describe('MarkdownCodeBlock', () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
  it.each([['language-js', 'JAVASCRIPT'], ['language-tsx', 'REACT'], ['language-py', 'PYTHON'], ['language-sh', 'BASH'], [undefined, 'TEXT'], ['language-unknown', 'UNKNOWN']])('normalizes %s language labels and trims only one trailing newline', (className, label) => {
    const tree = render(Component, { className, children: 'code\n\n' });
    expect(text(nodes(tree, '.max-expand-chat-code-lang')[0])).toBe(label);
    expect(value(tree, 'code', 'children')).toBe('code\n');
    if (!className || className === 'language-unknown') expect(nodes(tree, '.max-expand-chat-code-lang-dot')).toHaveLength(1);
  });
  it('copies the code, shows success and resets feedback after the timeout', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    vi.stubGlobal('window', { setTimeout });
    trigger(render(Component, { children: 'answer\n' }), 'button', 'onClick');
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith('answer');
    expect(text(render(Component, { children: 'answer\n' }))).toContain('aiChat.codeBlock.copied');
    vi.advanceTimersByTime(1200);
    expect(text(render(Component, { children: 'answer\n' }))).toContain('aiChat.codeBlock.copy:');
  });
  it('keeps the copy action available when clipboard access fails', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    trigger(render(Component, { children: null }), 'button', 'onClick');
    await Promise.resolve(); await Promise.resolve();
    expect(text(render(Component, { children: null }))).toContain('aiChat.codeBlock.copy:');
  });
});
