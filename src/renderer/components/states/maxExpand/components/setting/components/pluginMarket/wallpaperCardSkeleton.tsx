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
 * @file wallpaperCardSkeleton.tsx
 * @description 综合市场壁纸卡片加载态：列表请求中的骨架卡片，以及缩略图到达前的扫光占位
 * @author 鸡哥
 */

/* eslint-disable better-tailwindcss/no-unknown-classes -- 骨架复用壁纸卡片真实的语义类名，尺寸才能与数据到达后保持一致。 */

import { useCallback, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

interface WallpaperCardSkeletonListProps {
  /** 骨架卡片数量，取当前分页大小 */
  count: number;
  /** 标题下方的元信息行数，与对应真实卡片保持一致 */
  metaRows: number;
}

interface WallpaperCardThumbProps {
  /** 缩略图地址 */
  src: string;
  /** 图片替代文本 */
  alt: string;
}

/**
 * 渲染壁纸列表加载骨架屏。
 * @description 复用真实卡片的类名与尺寸，数据到达后替换不会产生明显位移。
 * @param props - 骨架卡片配置
 * @param props.count - 骨架卡片数量，取当前分页大小
 * @param props.metaRows - 标题下方的元信息行数，与对应真实卡片保持一致
 * @returns 骨架卡片列表
 */
export function WallpaperCardSkeletonList({ count, metaRows }: WallpaperCardSkeletonListProps): ReactElement {
  const { t } = useTranslation();
  // 占位卡片不会增删重排，按序号生成的 key 始终稳定。
  const cardKeys = Array.from(Array(count).keys(), (index) => `card-${index}`);
  const metaKeys = Array.from(Array(metaRows).keys(), (index) => `meta-${index}`);
  const loadingLabel = t('settings.pluginMarket.wallpaper.feedback.loading', { defaultValue: '加载中…' });
  return (
    <div className="settings-plugin-market-skeleton-list" role="status" aria-busy="true" aria-label={loadingLabel}>
      {cardKeys.map((cardKey) => (
        <div key={cardKey} className="settings-plugin-market-card settings-plugin-market-card-skeleton settings-skeleton-sweep" aria-hidden="true">
          <div className="settings-plugin-market-card-media" />
          <div className="settings-plugin-market-card-body">
            <span className="settings-skeleton-block settings-plugin-market-skeleton-title" />
            {metaKeys.map((metaKey) => (
              <span key={metaKey} className="settings-skeleton-block settings-plugin-market-skeleton-meta" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 渲染壁纸卡片缩略图，图片到达前显示扫光占位。
 * @param props - 缩略图配置
 * @param props.src - 缩略图地址
 * @param props.alt - 图片替代文本
 * @returns 缩略图及其加载占位
 */
export function WallpaperCardThumb({ src, alt }: WallpaperCardThumbProps): ReactElement {
  // 记录已结束加载的地址而非布尔值：src 变化时自动回到加载态，无需额外 effect 重置。
  const [settledSrc, setSettledSrc] = useState('');
  const loading = settledSrc !== src;
  const handleSettled = useCallback((): void => setSettledSrc(src), [src]);
  return (
    <>
      {loading && <span className="settings-plugin-market-card-shimmer settings-skeleton-sweep" aria-hidden="true" />}
      <img className={`settings-plugin-market-card-img${loading ? ' is-loading' : ''}`}
        src={src}
        alt={alt}
        onLoad={handleSettled}
        onError={handleSettled}
      />
    </>
  );
}

/* eslint-enable better-tailwindcss/no-unknown-classes -- 例外仅适用于上面的骨架组件。 */
