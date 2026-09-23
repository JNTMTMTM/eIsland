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
 * @file ActivityHeatmap.tsx
 * @description Claude Code 活动热力图（独立组件，CLI 面板与用户中心共享）
 * @author 鸡哥
 */

import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { HEATMAP_MONTH_KEYS } from '../utils/heatmapGrid';
import { useHeatmapGrid } from '../hooks/useHeatmapGrid';
import { useHeatmapScroll } from '../hooks/useHeatmapScroll';
import useCollapsibleContent from '../hooks/useCollapsibleContent';
import type { ActivityHeatmapProps, HeatmapMetric } from '../types/types';

interface ActivityHeatmapContentProps extends ActivityHeatmapProps {
  metric: HeatmapMetric;
  setMetric: (metric: HeatmapMetric) => void;
}

/**
 * 渲染可见热力图的网格和指标，隐藏后随内容一起释放。
 * @param props - 热力图数据、展示状态和指标控制方法
 * @param props.heatmap - 按日期汇总的活动量
 * @param props.compact - 是否采用紧凑布局
 * @param props.visible - 面板是否展开
 * @param props.metric - 当前活动指标
 * @param props.setMetric - 切换活动指标的方法
 * @returns 热力图内容
 */
function ActivityHeatmapContent({ heatmap, compact, visible = true, metric, setMetric }: ActivityHeatmapContentProps): ReactElement {
  const { t } = useTranslation();
  const grid = useHeatmapGrid(heatmap, metric);
  const { scrollRef, todayRef } = useHeatmapScroll(visible, metric);

  const variantClass = compact ? ' cli-tab-heatmap--compact' : '';

  return (
    <>
      <div className={`cli-tab-heatmap-metrics${variantClass}`}>
        <button
          type="button"
          className={`cli-tab-heatmap-metric ${metric === 'session' ? 'active' : ''}`}
          onClick={() => setMetric('session')}
        >
          {t('maxExpand.cli.heatmap.session', { defaultValue: '会话开始' })} {grid.totals.session}
        </button>
        <button
          type="button"
          className={`cli-tab-heatmap-metric ${metric === 'tool' ? 'active' : ''}`}
          onClick={() => setMetric('tool')}
        >
          {t('maxExpand.cli.heatmap.tool', { defaultValue: '工具调用' })} {grid.totals.tool}
        </button>
        <button
          type="button"
          className={`cli-tab-heatmap-metric ${metric === 'prompt' ? 'active' : ''}`}
          onClick={() => setMetric('prompt')}
        >
          {t('maxExpand.cli.heatmap.prompt', { defaultValue: '提示词输入' })} {grid.totals.prompt}
        </button>
      </div>
      <div className={`cli-tab-heatmap-grid${variantClass}`}>
        <div className="cli-tab-heatmap-scroll" ref={scrollRef}>
          <div className="cli-tab-heatmap-cells">
            {grid.months.map((month) => (
              <div key={month.key} className="cli-tab-heatmap-month-block">
                <span className="cli-tab-heatmap-month-label">
                  {t(`maxExpand.cli.heatmap.month.${HEATMAP_MONTH_KEYS[month.month]}`, { defaultValue: HEATMAP_MONTH_KEYS[month.month] })}
                </span>
                <div className="cli-tab-heatmap-month">
                  {month.cells.map((cell, idx) => {
                    const pos = month.offset + idx;
                    return (
                      <span
                        key={cell.key}
                        ref={cell.isToday ? todayRef : undefined}
                        className={`cli-tab-heatmap-cell${cell.future ? ' cli-tab-heatmap-cell--future' : ` level-${grid.levelOf(cell.count)}`}${cell.isToday ? ' cli-tab-heatmap-cell--today' : ''}`}
                        style={{ gridColumnStart: Math.floor(pos / 7) + 1, gridRowStart: (pos % 7) + 1 }}
                        title={cell.future ? '' : `${cell.label}: ${cell.count}`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Claude Code 活动热力图组件
 * @param props - 组件属性
 * @param props.heatmap - 按日期汇总的活动量
 * @param props.compact - 是否采用紧凑布局
 * @param props.visible - 面板是否展开
 * @returns 热力图 React 元素，完全收起后不创建内容
 */
export function ActivityHeatmap({ heatmap, compact = false, visible = true }: ActivityHeatmapProps): ReactElement | null {
  const [metric, setMetric] = useState<HeatmapMetric>('session');
  const contentMounted = useCollapsibleContent(visible, 240);

  // 保留用户选择的指标，但不在隐藏时计算全年网格或创建数百个格子。
  if (!contentMounted) return null;
  return (
    <ActivityHeatmapContent heatmap={heatmap}
      compact={compact}
      visible={visible}
      metric={metric}
      setMetric={setMetric}
    />
  );
}
