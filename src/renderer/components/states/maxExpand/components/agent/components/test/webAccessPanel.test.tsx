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
 * @file webAccessPanel.test.tsx
 * @description WebAccessPanel 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, trigger, text } from '../../../../test/componentHarness';
import { WebAccessPanel as Component, LocalToolAccessPanel  } from '../WebAccessPanel';
describe('WebAccessPanel', () => {
  it('uses fallback metadata and routes policy and independent decisions', () => {
    const onResolve = vi.fn(); const onPolicyChange = vi.fn();
    const props = {
      onResolve,
      onPolicyChange,
      url: 'https://site.test',
      message: '',
      resolving: false,
      resolveError: ''
    };
    const tree = render(Component, props);
    expect(text(tree)).toContain('?');
    expect(value(tree, 'select', 'value')).toBe('ask');
    trigger(tree, '.deny', 'onClick'); trigger(tree, '.allow', 'onClick');
    trigger(tree, 'select', 'onChange', { target: { value: 'deny' } });
    expect(onResolve.mock.calls).toEqual([[false], [true]]);
    expect(onPolicyChange).toHaveBeenCalledWith('deny');
    const busy = render(Component, { ...props, iconUrl: 'icon', siteName: 'Site', hostname: 'site.test', message: 'Approve', domainPolicy: 'allow', resolving: true, resolveError: 'Denied' });
    expect(nodes(busy, 'img')).toHaveLength(1);
    expect(value(busy, '.allow', 'disabled')).toBe(true);
    expect(value(busy, 'select', 'disabled')).toBe(true);
    expect(text(busy)).toContain('Denied');
  });
  it('renders local risks, JSON arguments and disabled/error boundaries', () => {
    const onResolve = vi.fn();
    const props = {
      onResolve,
      prompt: {
        tool: 'delete',
        message: '',
        riskLevel: 'high',
        purpose: 'cleanup',
        argumentsPayload: {
          path: 'tmp'
        }
      },
      resolving: false,
      resolveError: ''
    };
    const tree = render(LocalToolAccessPanel, props);
    expect(text(tree)).toContain('HIGH'); expect(text(tree)).toContain('cleanup');
    expect(text(nodes(tree, 'pre')[0])).toContain('"path": "tmp"');
    trigger(tree, '.deny', 'onClick'); trigger(tree, '.allow', 'onClick');
    expect(onResolve.mock.calls).toEqual([[false], [true]]);
    const busy = render(LocalToolAccessPanel, { ...props, prompt: { tool: 'run' }, resolving: true, resolveError: 'failed' });
    expect(text(busy)).toContain('aiChat.localToolAccess.purposeFallback');
    expect(value(busy, '.deny', 'disabled')).toBe(true);
    expect(text(busy)).toContain('failed');
  });
});
