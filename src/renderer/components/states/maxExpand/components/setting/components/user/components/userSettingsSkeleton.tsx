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
 * @file userSettingsSkeleton.tsx
 * @description 用户中心加载骨架屏：账号资料首屏、各子页面记录列表、PRO 方案详情与行内数值占位
 * @author 鸡哥
 */

/* eslint-disable better-tailwindcss/no-unknown-classes -- 骨架复用用户中心真实卡片的语义类名，尺寸才能与数据到达后保持一致。 */

import { useTranslation } from 'react-i18next';
import type { ReactElement } from 'react';

/** 用户信息页底部导航入口数量，骨架保持相同行数 */
const INFO_NAV_CARD_COUNT = 12;
/** 子页面记录骨架数量，足以填满首屏 */
const RECORD_SKELETON_COUNT = 3;
/** PRO 方案卡片中的权益占位行数，与默认权益条数一致 */
const PLAN_FEATURE_SKELETON_COUNT = 3;

interface UserRecordSkeletonListProps {
  /** 读屏播报的加载文案 */
  label: string;
  /** 详情区的标签/数值行数，0 表示不渲染详情区 */
  rows: number;
  /** 是否渲染左右两张图片位，对应图片翻译与 OCR 记录 */
  media?: boolean;
}

interface UserValueSkeletonProps {
  /** 读屏播报的加载文案 */
  label: string;
}

/**
 * 生成固定数量占位元素的 key。
 * @param prefix - key 前缀
 * @param count - 占位数量
 * @returns key 列表
 */
function placeholderKeys(prefix: string, count: number): string[] {
  // 占位元素不会增删重排，按序号生成的 key 始终稳定。
  return Array.from(Array(count).keys(), (index) => `${prefix}-${index}`);
}

/**
 * 渲染一组标签/数值占位行。
 * @param prefix - key 前缀
 * @param count - 行数
 * @param rowClassName - 行容器类名，复用真实行的布局
 * @returns 占位行列表
 */
function renderLabelValueRows(prefix: string, count: number, rowClassName: string): ReactElement[] {
  return placeholderKeys(prefix, count).map((key) => (
    <div key={key} className={rowClassName}>
      <span className="settings-skeleton-block settings-user-skeleton-label" />
      <span className="settings-skeleton-block settings-user-skeleton-value" />
    </div>
  ));
}

/**
 * 渲染账号资料首次加载时的用户信息页骨架。
 * @description 复用信息页摘要卡与导航卡片的容器类名，资料到达后布局不跳动。
 * @returns 用户信息页骨架
 */
export function UserProfileSkeleton(): ReactElement {
  const { t } = useTranslation();
  const loadingLabel = t('settings.user.feedback.loadingProfile', { defaultValue: '加载账号资料中…' });
  return (
    <div className="settings-user-profile settings-user-profile-paged" role="status" aria-busy="true" aria-label={loadingLabel}>
      <div className="settings-user-profile-main" aria-hidden="true">
        <div className="settings-user-page-panel settings-user-info-panel">
          <div className="settings-user-info-summary-card settings-user-skeleton settings-skeleton-sweep">
            <div className="settings-user-info-summary-header">
              <span className="settings-user-info-summary-avatar" />
              <div className="settings-user-info-summary-identity">
                <span className="settings-skeleton-block settings-user-skeleton-name" />
                <span className="settings-skeleton-block settings-user-skeleton-email" />
              </div>
              <div className="settings-user-info-summary-meta">
                {renderLabelValueRows('meta', 2, 'settings-user-info-summary-meta-row')}
              </div>
            </div>
            <div className="settings-user-info-summary-divider" />
            <div className="settings-user-info-summary-bottom">
              <div className="settings-user-info-summary-balance-card">
                <span className="settings-skeleton-block settings-user-skeleton-label" />
                <span className="settings-skeleton-block settings-user-skeleton-figure" />
              </div>
              <div className="settings-user-info-summary-extra-card">
                {renderLabelValueRows('extra', 2, 'settings-user-info-summary-row')}
              </div>
              <div className="settings-user-info-summary-login-card">
                <div className="settings-user-info-summary-login-stat">
                  <span className="settings-skeleton-block settings-user-skeleton-label" />
                  <span className="settings-skeleton-block settings-user-skeleton-figure" />
                </div>
                <span className="settings-skeleton-block settings-user-skeleton-toggle" />
              </div>
            </div>
          </div>
          {/* 收起态热力图容器参与间距计算，导航卡片的负外边距依赖它才能与摘要卡保持真实间隔。 */}
          <div className="settings-user-info-heatmap" />
          <div className="settings-user-info-nav-cards">
            {placeholderKeys('nav', INFO_NAV_CARD_COUNT).map((key) => (
              <div key={key} className="settings-index-card settings-user-skeleton settings-skeleton-sweep">
                <span className="settings-skeleton-block settings-user-skeleton-title" />
                <span className="settings-skeleton-block settings-user-skeleton-desc" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 渲染子页面记录列表首次加载时的骨架卡片。
 * @param props - 骨架配置
 * @param props.label - 读屏播报的加载文案
 * @param props.rows - 详情区的标签/数值行数，0 表示不渲染详情区
 * @param props.media - 是否渲染左右两张图片位
 * @returns 记录骨架列表
 */
export function UserRecordSkeletonList({ label, rows, media = false }: UserRecordSkeletonListProps): ReactElement {
  return (
    <div className="settings-user-skeleton-list" role="status" aria-busy="true" aria-label={label}>
      {placeholderKeys('record', RECORD_SKELETON_COUNT).map((recordKey) => (
        <div key={recordKey} className="settings-user-card settings-user-skeleton settings-skeleton-sweep" aria-hidden="true">
          <div className="settings-user-skeleton-head">
            <span className="settings-skeleton-block settings-user-skeleton-title" />
            <span className="settings-skeleton-block settings-user-skeleton-tag" />
          </div>
          {rows > 0 && (
            <div className="settings-user-skeleton-rows">
              {renderLabelValueRows('row', rows, 'settings-user-skeleton-row')}
            </div>
          )}
          {media && (
            <div className="settings-user-image-translation-images">
              {placeholderKeys('media', 2).map((mediaKey) => (
                <div key={mediaKey} className="settings-user-image-translation-image-card">
                  <span className="settings-skeleton-block settings-user-skeleton-label" />
                  <div className="settings-user-image-translation-image-wrap" />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * 渲染 PRO 方案卡片中描述与权益列表的加载占位。
 * @returns 方案详情骨架
 */
export function UserPlanDetailSkeleton(): ReactElement {
  return (
    <div className="settings-user-skeleton settings-skeleton-sweep settings-user-skeleton-plan" aria-hidden="true">
      <span className="settings-skeleton-block settings-user-skeleton-desc" />
      <span className="settings-skeleton-block settings-user-skeleton-desc-short" />
      {placeholderKeys('feature', PLAN_FEATURE_SKELETON_COUNT).map((key) => (
        <span key={key} className="settings-skeleton-block settings-user-skeleton-feature" />
      ))}
    </div>
  );
}

/**
 * 渲染价格、余额等单个数值的行内加载占位。
 * @param props - 占位配置
 * @param props.label - 读屏播报的加载文案
 * @returns 行内数值骨架
 */
export function UserValueSkeleton({ label }: UserValueSkeletonProps): ReactElement {
  return (
    <span className="settings-skeleton-block settings-skeleton-sweep settings-user-skeleton settings-user-skeleton-figure" role="status" aria-label={label} />
  );
}

/* eslint-enable better-tailwindcss/no-unknown-classes -- 例外仅适用于上面的骨架组件。 */
