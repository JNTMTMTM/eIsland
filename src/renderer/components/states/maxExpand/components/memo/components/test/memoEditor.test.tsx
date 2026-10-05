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
 * @file memoEditor.test.tsx
 * @description MemoEditor 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import ReactMarkdown from 'react-markdown';
import { render, nodes, value, trigger } from '../../../../test/componentHarness';
import { MemoEditor as Component } from '../MemoEditor';
describe('MemoEditor', () => {
  const selectedMemo = { id: 1, title: 'Title', content: '# Content', tags: [], bookmarked: false, pinned: false, createdAt: 1, updatedAt: 2 };
  const props = { selectedMemo, viewMode: 'edit', viewModes: [{ id: 'edit', label: 'Edit' }, { id: 'preview', label: 'Preview' }], editorScroll: { left: 3, top: 5 }, handleTitleChange: vi.fn(), handleContentChange: vi.fn(), setEditorScroll: vi.fn(), handleRemoveTag: vi.fn(), handleAddTag: vi.fn(), handleDelete: vi.fn(), handleTogglePin: vi.fn(), handleToggleBookmark: vi.fn() };
  it('shows editor, preview or both and empty versus populated tags', () => {
    const edit = render(Component, props);
    expect(nodes(edit, 'textarea')).toHaveLength(1);
    expect(nodes(edit, ReactMarkdown)).toHaveLength(0);
    expect(nodes(edit, '.memo-tab-editor-tag-empty')).toHaveLength(1);
    expect(value(edit, '.memo-tab-markdown-editor-mirror', 'style')).toEqual({ transform: 'translate(-3px, -5px)' });
    const preview = render(Component, { ...props, viewMode: 'preview' });
    expect(nodes(preview, 'textarea')).toHaveLength(0);
    expect(nodes(preview, ReactMarkdown)).toHaveLength(1);
    const split = render(Component, { ...props, viewMode: 'split', selectedMemo: { ...selectedMemo, tags: ['work'], bookmarked: true, pinned: true } });
    expect(nodes(split, 'textarea')).toHaveLength(1);
    expect(nodes(split, ReactMarkdown)).toHaveLength(1);
    expect(nodes(split, '.memo-tab-editor-bookmark--active')).toHaveLength(1);
    trigger(split, '.memo-tab-editor-tag', 'onClick');
    expect(props.handleRemoveTag).toHaveBeenCalledWith(1, 'work');
  });
  it('routes title, content, scroll, tags and toolbar mutations to the selected ID', () => {
    const tree = render(Component, props);
    trigger(tree, '.memo-tab-editor-title', 'onChange', { target: { value: 'New' } });
    trigger(tree, 'textarea', 'onChange', { target: { value: 'Updated' } });
    trigger(tree, 'textarea', 'onScroll', { currentTarget: { scrollLeft: 10, scrollTop: 20 } });
    trigger(tree, '.memo-tab-tag-input', 'onKeyDown', { key: 'Enter', preventDefault: vi.fn() });
    trigger(tree, '.memo-tab-editor-delete', 'onClick');
    trigger(tree, '.memo-tab-editor-pin', 'onClick');
    trigger(tree, '.memo-tab-editor-bookmark', 'onClick');
    expect(props.handleTitleChange).toHaveBeenCalledWith(1, 'New');
    expect(props.handleContentChange).toHaveBeenCalledWith(1, 'Updated');
    expect(props.setEditorScroll).toHaveBeenCalledWith({ left: 10, top: 20 });
    [props.handleAddTag, props.handleDelete, props.handleTogglePin, props.handleToggleBookmark].forEach((callback) => expect(callback).toHaveBeenCalledWith(1));
  });
});
