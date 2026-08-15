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
 * @file CalculatorSidebar.tsx
 * @description 计算器侧边栏 — 模式导航 + 展开/收起切换
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { CalculatorIcon } from '../../../../../../utils/SvgIcon';
import { CALC_SIDEBAR_NAV_ITEMS } from '../config/calculatorConfig';
import type { CalcMode } from '../types/calculatorTypes';

interface CalculatorSidebarProps {
  /** 当前选中模式 */
  activeMode: CalcMode;
  /** 侧边栏是否收起 */
  collapsed: boolean;
  /** 切换模式 */
  onSwitchMode: (mode: CalcMode) => void;
  /** 切换展开/收起 */
  onToggleCollapse: () => void;
}

/**
 * Calculator Sidebar — 左侧图标导航栏 + 可收起内容面板
 */
export function CalculatorSidebar({
  activeMode,
  collapsed,
  onSwitchMode,
  onToggleCollapse,
}: CalculatorSidebarProps): ReactElement {
  const { t } = useTranslation();

  const activeItem = CALC_SIDEBAR_NAV_ITEMS.find((i) => i.mode === activeMode);

  return (
    <>
      {/* 固定图标导航栏 */}
      <nav className="calc-sidebar-nav">
        {CALC_SIDEBAR_NAV_ITEMS.map((item) => (
          <button
            key={item.mode}
            type="button"
            className={`calc-sidebar-nav-btn${activeMode === item.mode ? ' calc-sidebar-nav-btn--active' : ''}`}
            onClick={() => onSwitchMode(item.mode)}
            title={t(item.labelKey, { defaultValue: item.defaultLabel })}
          >
            <img src={item.icon} alt={t(item.labelKey, { defaultValue: item.defaultLabel })} className="calc-sidebar-nav-icon" />
          </button>
        ))}

        {/* 展开/收起按钮 — 固定在底部 */}
        <button
          type="button"
          className="calc-sidebar-nav-btn calc-sidebar-toggle-btn"
          onClick={onToggleCollapse}
          title={collapsed
            ? t('calculator.sidebar.expand', { defaultValue: '展开' })
            : t('calculator.sidebar.collapse', { defaultValue: '收起' })
          }
        >
          <img
            src={collapsed ? CalculatorIcon.EXPAND : CalculatorIcon.COLLAPSE}
            alt=""
            className="calc-sidebar-nav-icon"
          />
        </button>
      </nav>

      {/* 可收起内容面板 */}
      <aside className={`calc-sidebar-panel${collapsed ? ' calc-sidebar-panel--collapsed' : ''}`}>
        {!collapsed && (
          <div className="calc-sidebar-panel-content">
            <div className="calc-sidebar-panel-label">
              {activeItem ? t(activeItem.labelKey, { defaultValue: activeItem.defaultLabel }) : ''}
            </div>
            <div className="calc-sidebar-panel-placeholder">
              {/* 后续拓展：科学计算 / 绘图 / 单位换算的内容区域 */}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
