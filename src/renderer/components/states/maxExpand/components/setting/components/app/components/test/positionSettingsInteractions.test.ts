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
 * @file positionSettingsInteractions.test.ts
 * @description 位置设置实际方向操作、显示器切换、输入更新与回车分支回归。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { PositionSettingsPage } from '../PositionSettingsPage';
import { elementProps, elements, findElement, invoke, textContent } from '../../../../../../../../test/elementHarness';
import makeAppSettingsProps from './appSettingsFixture';
import type { AppPositionInput } from '../types';
import type { SetStateAction } from 'react';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
describe('实际位置设置所有操作', () => {
  it('四个方向保留另一轴并按十像素步进，重置回到原点', () => {
    const props = makeAppSettingsProps();
    props.islandPositionOffset = { x: 23, y: -5 };
    const tree = PositionSettingsPage(props);
    ['moveLeft', 'moveRight', 'moveUp', 'moveDown', 'resetDefault'].forEach((key) => {
      invoke(findElement(tree, (node) => node.type === 'button' && textContent(node) === `settings.app.position.${key}`), 'onClick');
    });
    expect(props.applyIslandPositionOffset).toHaveBeenNthCalledWith(1, 13, -5);
    expect(props.applyIslandPositionOffset).toHaveBeenNthCalledWith(2, 33, -5);
    expect(props.applyIslandPositionOffset).toHaveBeenNthCalledWith(3, 23, -15);
    expect(props.applyIslandPositionOffset).toHaveBeenNthCalledWith(4, 23, 5);
    expect(props.applyIslandPositionOffset).toHaveBeenNthCalledWith(5, 0, 0);
  });
  it('两个真实函数式输入更新保留另一轴，两个回车回调只处理 Enter', () => {
    const props = makeAppSettingsProps();
    let input = { x: '20', y: '30' };
    props.setIslandPositionInput = vi.fn((update: SetStateAction<AppPositionInput>) => { input = typeof update === 'function' ? update(input) : update; });
    const [horizontal, vertical] = elements(PositionSettingsPage(props)).filter((node) => node.type === 'input' && elementProps(node).type === 'number');
    invoke(horizontal, 'onChange', { target: { value: '-30' } });
    expect(input).toEqual({ x: '-30', y: '30' });
    invoke(vertical, 'onChange', { target: { value: '42' } });
    expect(input).toEqual({ x: '-30', y: '42' });
    const preventDefault = vi.fn();
    [horizontal, vertical].forEach((node) => invoke(node, 'onKeyDown', { preventDefault, key: 'Escape' }));
    expect(props.applyIslandPositionInput).not.toHaveBeenCalled();
    [horizontal, vertical].forEach((node) => invoke(node, 'onKeyDown', { preventDefault, key: 'Enter' }));
    expect(props.applyIslandPositionInput).toHaveBeenCalledTimes(2);
    expect(preventDefault).toHaveBeenCalledTimes(2);
    expect(elementProps(vertical)).toMatchObject({ min: -1200, max: 1200 });
  });
  it.each([false, true])('更改=%s时应用和取消保持可用性，显示器与锁定状态正确转交', (changed) => {
    const props = makeAppSettingsProps();
    props.islandPositionInputChanged = changed;
    props.islandDisplayOptions = [{ id: 'second', label: 'Second' }, { id: 'primary', label: 'Primary' }];
    props.islandDisplaySelection = 'second';
    const tree = PositionSettingsPage(props);
    const display = findElement(tree, (node) => node.type === 'select');
    expect(elementProps(display).value).toBe('second');
    expect(elements(tree).filter((node) => node.type === 'option').map((node) => elementProps(node).value)).toEqual(['second', 'primary']);
    invoke(display, 'onChange', { target: { value: 'primary' } });
    expect(props.setIslandDisplaySelection).toHaveBeenCalledWith('primary');
    invoke(findElement(tree, (node) => elementProps(node).type === 'checkbox'), 'onChange', { target: { checked: changed } });
    expect(props.onIslandPositionLockedChange).toHaveBeenCalledWith(changed);
    ['apply', 'cancel'].forEach((action) => {
      const button = findElement(tree, (node) => node.type === 'button' && textContent(node) === `settings.app.position.${action}`);
      expect(elementProps(button).disabled).toBe(!changed);
      if (changed) invoke(button, 'onClick');
    });
    expect(props.applyIslandPositionInput).toHaveBeenCalledTimes(changed ? 1 : 0);
    expect(props.cancelIslandPositionInput).toHaveBeenCalledTimes(changed ? 1 : 0);
  });
});
