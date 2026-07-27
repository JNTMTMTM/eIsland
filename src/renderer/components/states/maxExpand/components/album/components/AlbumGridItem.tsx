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
 * @file AlbumGridItem.tsx
 * @description 相册网格中的单个缩略图项：图片/视频预览、选中态、删除按钮。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../../../../utils/SvgIcon';
import type { AlbumGridItemProps } from '../types/albumTypes';
import { formatDuration } from '../utils/albumUtils';

/**
 * 控制按钮内部图标。
 */
function AlbumControlIcon({ src }: { src: string }): ReactElement {
  return <img className="album-svg-icon-img" src={src} alt="" aria-hidden="true" draggable={false} />;
}

/**
 * 相册网格中的单个缩略图项。
 */
export function AlbumGridItem({
  item, meta, selected, selectMode,
  onToggleSelection, onOpen, onRemove,
  onMouseEnter, onMouseLeave, gridVideoRefs,
}: AlbumGridItemProps): ReactElement {
  const { t } = useTranslation();

  return (
    <div className={`album-grid-item${selected ? ' album-grid-item--selected' : ''}${selectMode ? ' album-grid-item--selectable' : ''}`}>
      <label className="album-selection-check" title={t('albumTab.selection.toggle', { name: item.name })}>
        <input
          className="album-selection-input"
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelection(item.id)}
          aria-label={t('albumTab.selection.toggle', { name: item.name })}
        />
      </label>
      <button
        className="album-thumb"
        type="button"
        onClick={() => (selectMode ? onToggleSelection(item.id) : onOpen(item))}
        onMouseEnter={() => onMouseEnter(item)}
        onMouseLeave={() => onMouseLeave(item)}
        title={item.name}
      >
        {item.mediaType === 'video' ? (
          meta?.videoUrl ? (
            <>
              <video
                className="album-thumb-video"
                src={meta.videoUrl}
                muted
                loop
                playsInline
                preload="metadata"
                ref={(el) => { gridVideoRefs.current[item.id] = el; }}
              />
              <span className="album-thumb-badge">{formatDuration(meta?.durationSec)}</span>
            </>
          ) : meta?.loadFailed ? (
            <span className="album-thumb-fallback">{t('albumTab.thumb.failed')}</span>
          ) : (
            <span className="album-thumb-fallback">{t('albumTab.thumb.loading')}</span>
          )
        ) : meta?.thumbnailUrl ? (
          <img className="album-thumb-img" src={meta.thumbnailUrl} alt={item.name} loading="lazy" />
        ) : meta?.loadFailed ? (
          <span className="album-thumb-fallback">{t('albumTab.thumb.failed')}</span>
        ) : (
          <span className="album-thumb-fallback">{t('albumTab.thumb.loading')}</span>
        )}
      </button>
      <div className="album-grid-meta">
        <span className="album-grid-name" title={item.name}>{item.name}</span>
        <button
          className="album-grid-remove"
          type="button"
          onClick={() => onRemove(item.id)}
          title={t('albumTab.actions.remove')}
          aria-label={t('albumTab.actions.removeAria', { name: item.name })}
        >
          <AlbumControlIcon src={SvgIcon.DELETE} />
        </button>
      </div>
    </div>
  );
}
