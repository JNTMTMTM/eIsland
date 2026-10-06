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
 * @file cliProviderSwitch.test.tsx
 * @description CliProviderSwitch 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value } from '../../../../test/componentHarness';
import { CliProviderSwitch as Component } from '../CliProviderSwitch';

describe('CliProviderSwitch', () => {
  it('marks the selected provider and forwards both choices in compact mode', () => {
    const onChange = vi.fn();
    const tree = render(Component, {
      onChange,
      provider: 'claude',
      compact: true
    });
    expect(value(tree, 'button', 'aria-pressed')).toBe(true);
    expect(value(tree, 'button', 'aria-pressed', 1)).toBe(false);
    expect(nodes(tree, '.cli-provider-switch--compact')).toHaveLength(1);
    nodes(tree, 'button').forEach((node) => (node.props.onClick as () => void)());
    expect(onChange.mock.calls).toEqual([['claude'], ['codex']]);
    expect(value(render(Component, {
      onChange,
      provider: 'codex'
    }), 'button', 'aria-pressed', 1)).toBe(true);
  });
});
