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
 * @file interactiveApp.tsx
 * @description 交互模式根组件：主菜单与各功能界面之间切换
 * @author 鸡哥
 */

import useAppScreen from '../hooks/useAppScreen';
import Dashboard from './dashboard';
import LocalTest from './localTest';
import Welcome from './welcome';

import type { DashboardProps } from '../types/uiTypes';

/**
 * 交互模式根组件
 * @description 任务管理器在各界面之间共享，返回主菜单后运行中的任务继续保留
 * @param props - 与任务界面相同的入参
 * @param props.manager - 任务管理器
 * @param props.root - 仓库根目录
 * @param props.skipConfirm - 是否跳过危险脚本确认
 * @param props.passthrough - 透传给脚本的参数
 * @param props.onQuit - 退出回调
 * @returns 当前界面
 */
export default function InteractiveApp({ manager, root, skipConfirm, passthrough, onQuit }: DashboardProps): React.JSX.Element {
  const { screen, open, back } = useAppScreen();
  if (screen === 'repo') {
    return <Dashboard manager={manager} root={root} skipConfirm={skipConfirm} passthrough={passthrough} onQuit={onQuit} onBack={back} />;
  }
  if (screen === 'localTest') return <LocalTest root={root} onBack={back} />;
  return <Welcome manager={manager} onSelect={open} onQuit={onQuit} />;
}
