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
 * @file countdownForm.test.tsx
 * @description CountdownForm 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, trigger } from '../../../../test/componentHarness';
import { CountdownForm as Component } from '../CountdownForm';

describe('CountdownForm', () => {
  const draft = { name: '', date: '2026-10-06', type: 'event', color: '#abcdef', mode: 'down', repeat: 'none' };
  const props = {
    draft,
    formId: 'editor',
    setDraft: vi.fn(),
    editing: false,
    saving: false,
    resolvedCoverImage: null,
    onSave: vi.fn(),
    onCancel: vi.fn()
  };
  it('disables blank or saving submission and changes modes with normalized rules', () => {
    const tree = render(Component, props);
    expect(value(tree, '.save', 'disabled')).toBe(true);
    expect(value(tree, '.cd-custom-color', 'aria-pressed')).toBe(true);
    trigger(tree, 'input', 'onChange', { target: { value: 'Release' } });
    const update = props.setDraft.mock.calls[0][0] as (value: typeof draft) => typeof draft;
    expect(update(draft).name).toBe('Release');
    (value(tree, 'select', 'onChange', 1) as (event: unknown) => void)({ target: { value: 'up' } });
    const modeUpdate = props.setDraft.mock.calls[1][0] as (value: typeof draft) => typeof draft;
    expect(modeUpdate(draft)).toMatchObject({ mode: 'up', repeat: 'none', expiryAction: 'continue' });
    const up = render(Component, { ...props, draft: { ...draft, name: 'Release', mode: 'up', includeToday: true }, editing: true, onDelete: vi.fn() });
    expect(nodes(up, 'select')).toHaveLength(2);
    expect(nodes(up, '.danger')).toHaveLength(1);
    expect(value(up, '.save', 'disabled')).toBe(false);
    trigger(up, 'form', 'onSubmit', { preventDefault: vi.fn() });
    expect(props.onSave).toHaveBeenCalledOnce();
  });
  it('shows image opacity only with a background and provides removal', () => {
    const tree = render(Component, { ...props, draft: { ...draft, backgroundImage: 'data:image/png;base64,abc', backgroundOpacity: 0.8 }, resolvedCoverImage: 'cover' });
    const range = nodes(tree, 'input').find((node) => node.props.type === 'range');
    expect(range?.props.value).toBe(0.8);
    expect(range?.props.style).toEqual({ '--cd-range-progress': '80%' });
    (range!.props.onChange as (event: unknown) => void)({ target: { value: '0.5' } });
    const update = props.setDraft.mock.calls[0][0] as (value: typeof draft) => object;
    expect(update(draft)).toMatchObject({ backgroundOpacity: 0.5 });
  });
});
