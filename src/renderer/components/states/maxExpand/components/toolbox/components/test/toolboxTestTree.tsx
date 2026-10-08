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
 * @file toolboxTestTree.tsx
 * @description 展开工具箱纯展示组件供无 DOM 测试读取，不执行真实工具子组件。
 * @author 鸡哥
 */

import { cloneElement, isValidElement } from 'react';
import { ToolboxIndex } from '../ToolboxIndex';
import { ToolboxPanel } from '../ToolboxPanel';
import { ToolboxSidebar } from '../ToolboxSidebar';
import type { ReactNode } from 'react';
import type { ToolboxNavigationProps, ToolboxPanelProps } from '../../types';

/**
 * 展开工具箱模块的纯展示层，保留工具组件边界和原有事件处理器。
 * @param tree - 真实工具箱渲染结果。
 * @returns 可供既有元素树断言遍历的展示树。
 */
export function expandToolboxTree(tree: ReactNode): ReactNode {
  if (Array.isArray(tree)) return tree.map(expandToolboxTree);
  if (!isValidElement<{ children?: ReactNode }>(tree)) return tree;
  if (tree.type === ToolboxSidebar) return expandToolboxTree(ToolboxSidebar(tree.props as ToolboxNavigationProps));
  if (tree.type === ToolboxPanel) return expandToolboxTree(ToolboxPanel(tree.props as ToolboxPanelProps));
  if (tree.type === ToolboxIndex) return expandToolboxTree(ToolboxIndex(tree.props as ToolboxNavigationProps));
  if (!('children' in tree.props)) return tree;
  return cloneElement(tree, undefined, expandToolboxTree(tree.props.children));
}
