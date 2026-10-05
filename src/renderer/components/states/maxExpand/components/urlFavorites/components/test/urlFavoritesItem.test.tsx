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
 * @file urlFavoritesItem.test.tsx
 * @description UrlFavoritesItem 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, trigger, text } from '../../../../test/componentHarness';
import { UrlFavoritesItem as Component } from '../UrlFavoritesItem';

describe('UrlFavoritesItem', () => {
  const item = { id: 1, url: 'https://example.com', title: 'Example', note: 'notes', folder: 'Work' };
  const props = { item, isExpanded: false, isFocused: false, isDragOver: false, isDragging: false, dragMovedRef: { current: false }, onToggleExpand: vi.fn(), onOpen: vi.fn(), onSaveEdit: vi.fn(), onRemove: vi.fn(), onDragOver: vi.fn(), onDrop: vi.fn(), setEditUrlInput: vi.fn(), setEditNoteInput: vi.fn(), setEditFolderInput: vi.fn() };
  it('renders metadata and state flags and suppresses activation after a drag', () => {
    const tree = render(Component, props);
    expect(text(tree)).toContain('ExamplenotesWork');
    trigger(tree, '.url-favorites-summary', 'onClick');
    expect(props.onToggleExpand).toHaveBeenCalledWith(item);
    props.dragMovedRef.current = true;
    trigger(tree, '.url-favorites-summary', 'onClick');
    expect(props.onToggleExpand).toHaveBeenCalledTimes(1);
    props.dragMovedRef.current = false;
    const expanded = render(Component, { ...props, isExpanded: true, isFocused: true, isDragging: true, isDragOver: true, item: { ...item, title: item.url, note: '', folder: '' } });
    expect(nodes(expanded, '.url-favorites-editor-wrapper--open')).toHaveLength(1);
    expect(text(expanded)).toContain('urlFavoritesTab.resolvingTitle');
    expect(text(expanded)).toContain('urlFavoritesTab.noNote');
  });
  it('opens the website without toggling and routes edit, remove and drop actions', () => {
    const tree = render(Component, props);
    const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() };
    trigger(tree, '.url-favorites-site-name', 'onClick', event);
    expect(props.onOpen).toHaveBeenCalledWith(item.url);
    expect(event.stopPropagation).toHaveBeenCalledOnce();
    trigger(tree, '.url-favorites-save', 'onClick');
    trigger(tree, '.url-favorites-remove', 'onClick');
    trigger(tree, '.url-favorites-item', 'onDrop', event);
    expect(props.onSaveEdit).toHaveBeenCalledWith(1);
    expect(props.onRemove).toHaveBeenCalledWith(1);
    expect(props.onDrop).toHaveBeenCalledWith(event, 1);
    trigger(tree, '.url-favorites-note-input', 'onKeyDown', { ...event, key: 'Enter' });
    expect(props.onSaveEdit).toHaveBeenCalledTimes(2);
    trigger(tree, '.url-favorites-url-input', 'onChange', { target: { value: 'new' } });
    expect(props.setEditUrlInput).toHaveBeenCalledWith('new');
  });
});
