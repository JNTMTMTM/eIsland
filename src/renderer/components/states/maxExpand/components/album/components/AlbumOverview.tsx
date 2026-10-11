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
 * @file AlbumOverview.tsx
 * @description 相册总览网格：空态提示 + 分组网格列表。
 * @author 鸡哥
 */

import { useEffect, type ReactElement } from 'react';
import { useAlbumVirtualGrid } from '../hooks/useAlbumVirtualGrid';
import { useTranslation } from 'react-i18next';
import type { AlbumOverviewProps } from '../types/albumTypes';
import { AlbumGridItem } from './AlbumGridItem';

/**
 * 相册总览网格。
 */
export function AlbumOverview({
  totalCount, filteredCount, columns, groupMode, groupedItems,
  metaCache, selectedIds, selectMode,
  onToggleSelection, onOpen, onRemove, onMouseEnter, onMouseLeave,
  gridVideoRefs, onPickFiles, onVisibleItemsChange,
}: AlbumOverviewProps): ReactElement {
  const { t } = useTranslation();
  const grid = useAlbumVirtualGrid(groupedItems, columns, groupMode);
  useEffect(() => { onVisibleItemsChange?.(grid.visibleItems); }, [grid.visibleItems, onVisibleItemsChange]);
  useEffect(() => () => onVisibleItemsChange?.([]), [onVisibleItemsChange]);

  return (
    <div
      className="album-overview"
      style={{ ['--album-columns' as string]: String(columns) } as React.CSSProperties}
    >
      {totalCount === 0 ? (
        <div className="album-empty">
          <div className="album-empty-title">{t('albumTab.empty.title')}</div>
          <div className="album-empty-desc">{t('albumTab.empty.desc')}</div>
          <button className="album-primary-btn" type="button" onClick={onPickFiles}>
            {t('albumTab.actions.add')}
          </button>
        </div>
      ) : filteredCount === 0 ? (
        <div className="album-empty">
          <div className="album-empty-title">{t('albumTab.empty.filteredTitle')}</div>
          <div className="album-empty-desc">{t('albumTab.empty.filteredDesc')}</div>
        </div>
      ) : (
        <div ref={grid.scrollRef} className="album-group-list" onScroll={grid.onScroll} onWheelCapture={(event) => event.stopPropagation()}>
          <div style={{ position: 'relative', height: grid.totalHeight, flex: 'none' }}>
          {grid.visibleGroups.map(({ group, top, height, headerHeight, items, paddingTop, paddingBottom }) => (
            <section key={group.key} className="album-group-section" style={{ position: 'absolute', top, height, width: '100%' }}>
              {groupMode !== 'none' ? (
                <div className="album-group-header" style={{ height: headerHeight, flexShrink: 0 }}>
                  <div className="album-group-title-wrap">
                    <span className="album-group-title" title={group.subtitle || group.title}>{group.title}</span>
                    {group.subtitle ? <span className="album-group-subtitle" title={group.subtitle}>{group.subtitle}</span> : null}
                  </div>
                  <span className="album-group-count">
                    {t('albumTab.group.count', { count: group.items.length })}
                  </span>
                </div>
              ) : null}
              <div className="album-grid" style={{ paddingTop, paddingBottom, gridAutoRows: grid.rowHeight, flexShrink: 0 }}>
                {items.map((item) => (
                  <AlbumGridItem
                    key={item.id}
                    item={item}
                    meta={metaCache[item.id]}
                    selected={selectedIds.has(item.id)}
                    selectMode={selectMode}
                    onToggleSelection={onToggleSelection}
                    onOpen={onOpen}
                    onRemove={onRemove}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    gridVideoRefs={gridVideoRefs}
                  />
                ))}
              </div>
            </section>
          ))}
          </div>
        </div>
      )}
    </div>
  );
}
