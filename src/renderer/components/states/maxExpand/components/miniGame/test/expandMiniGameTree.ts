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
 * @file expandMiniGameTree.ts
 * @description 展开小游戏纯展示组件，保留游戏引擎边界和原有行为断言。
 * @author 鸡哥
 */

import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { MiniGameSidebar } from '../components/MiniGameSidebar';
import { MiniGameIndex } from '../components/MiniGameIndex';
import { MiniGameGamePanel } from '../components/MiniGameGamePanel';
import { Game2048Information } from '../components/Game2048Information';
import { GomokuInformation } from '../components/GomokuInformation';
import { MiniGameLeaderboard } from '../components/MiniGameLeaderboard';

const PRESENTATION_COMPONENTS = new Set<unknown>([
  MiniGameSidebar, MiniGameIndex, MiniGameGamePanel,
  Game2048Information, GomokuInformation, MiniGameLeaderboard,
]);

/**
 * 展开不含 Hook 的展示组件，使现有测试仍验证完整页面的真实事件。
 * @param tree - 真实页面返回的元素树。
 * @returns 展开的展示元素树，游戏组件仍作为边界保留。
 */
export function expandMiniGameTree(tree: ReactNode): ReactNode {
  if (Array.isArray(tree)) return tree.map(expandMiniGameTree);
  if (!isValidElement<{ children?: ReactNode }>(tree)) return tree;
  if (PRESENTATION_COMPONENTS.has(tree.type)) {
    const component = tree.type as (props: object) => ReactElement;
    return expandMiniGameTree(component(tree.props));
  }
  if (!Object.prototype.hasOwnProperty.call(tree.props, 'children')) return tree;
  return cloneElement(tree, { children: expandMiniGameTree(tree.props.children) });
}
