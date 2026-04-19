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
 * @file WallpaperEditSection.tsx
 * @description 插件市场壁纸编辑组件
 * @author 鸡哥
 */

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  deleteUserWallpaper,
  getUserWallpaperDetail,
  listMyUserWallpapers,
  normalizeWallpaperMarketListData,
  updateUserWallpaperMetadata,
  type WallpaperMarketItem,
} from '../../../../../../../api/userAccountApi';
import { readLocalToken } from '../../../../../../../utils/userAccount';
import { SvgIcon } from '../../../../../../../utils/SvgIcon';
import { TagInput } from './TagInput';

function formatDuration(durationMs: number | undefined): string {
  if (!durationMs || !Number.isFinite(durationMs) || durationMs <= 0) return '--:--';
  const totalSec = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

interface WallpaperEditSectionProps {
  onGoWallpaper: () => void;
}

const MARKET_PAGE_SIZE = 6;

/**
 * 壁纸编辑内容区
 */
export function WallpaperEditSection({ onGoWallpaper }: WallpaperEditSectionProps) {
  const { t } = useTranslation();
  const [list, setList] = useState<WallpaperMarketItem[]>([]);
  const [selected, setSelected] = useState<WallpaperMarketItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [message, setMessage] = useState('');
  const [editingMetadata, setEditingMetadata] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editCopyrightInfo, setEditCopyrightInfo] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [savingMetadata, setSavingMetadata] = useState(false);
  const [deleteConfirming, setDeleteConfirming] = useState(false);

  const selectedPreviewUrl = useMemo(() => (
    selected?.thumb1280Url || selected?.thumb720Url || selected?.thumb320Url || selected?.originalUrl || ''
  ), [selected]);
  const selectedCoverUrl = useMemo(() => (
    selected?.thumb1280Url || selected?.thumb720Url || selected?.thumb320Url || ''
  ), [selected]);
  const selectedOriginalUrl = selected?.originalUrl || '';
  const selectedIsVideo = selected?.type === 'video';

  const loadList = async (targetPage: number = page): Promise<void> => {
    const token = readLocalToken();
    if (!token) {
      setList([]);
      setSelected(null);
      setTotalPages(1);
      setHasNextPage(false);
      return;
    }
    setLoading(true);
    try {
      const result = await listMyUserWallpapers(token, {
        keyword: keyword.trim() || undefined,
        page: targetPage,
        pageSize: MARKET_PAGE_SIZE,
      });
      if (result.ok) {
        const normalized = normalizeWallpaperMarketListData(result.data);
        const nextList = normalized.items;
        const hasMore = normalized.total !== null
          ? targetPage * MARKET_PAGE_SIZE < normalized.total
          : nextList.length >= MARKET_PAGE_SIZE;
        setPage(targetPage);
        setList(nextList);
        setHasNextPage(hasMore);
        if (normalized.total !== null) {
          setTotalPages(Math.max(1, Math.ceil(normalized.total / MARKET_PAGE_SIZE)));
        } else if (targetPage === 1) {
          setTotalPages(hasMore ? 2 : 1);
        } else {
          setTotalPages((prev) => Math.max(prev, targetPage, hasMore ? targetPage + 1 : targetPage));
        }
        if (nextList.length === 0) {
          setSelected(null);
        } else if (!selected || !nextList.find((w) => w.id === selected.id)) {
          setSelected(nextList[0]);
          setEditTitle(nextList[0].title || '');
          setEditDescription(nextList[0].description || '');
          setEditTags(nextList[0].tagsText || '');
          setEditCopyrightInfo(nextList[0].copyrightInfo || '');
        }
        return;
      }
      setHasNextPage(false);
      setMessage(result.message || t('settings.pluginMarket.wallpaper.feedback.loadFailed', { defaultValue: '加载失败' }));
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (id: number): Promise<void> => {
    const token = readLocalToken();
    if (!token) return;
    const result = await getUserWallpaperDetail(token, id);
    if (result.ok && result.data) {
      setSelected(result.data);
      setEditTitle(result.data.title || '');
      setEditDescription(result.data.description || '');
      setEditTags(result.data.tagsText || '');
      setEditCopyrightInfo(result.data.copyrightInfo || '');
      return;
    }
    setMessage(result.message || t('settings.pluginMarket.wallpaper.feedback.detailFailed', { defaultValue: '加载详情失败' }));
  };

  useEffect(() => {
    loadList(1).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setDeleteConfirming(false);
  }, [selected?.id]);

  const handleSearch = (): void => {
    loadList(1).catch(() => {});
  };

  const handlePrevPage = (): void => {
    if (loading || page <= 1) return;
    loadList(page - 1).catch(() => {});
  };

  const handleNextPage = (): void => {
    if (loading || !hasNextPage) return;
    loadList(page + 1).catch(() => {});
  };

  const handleDelete = async (): Promise<void> => {
    const token = readLocalToken();
    if (!token || !selected || deleting) return;
    setDeleting(true);
    setMessage(t('settings.pluginMarket.wallpaper.feedback.deleting', { defaultValue: '删除中…' }));
    try {
      const result = await deleteUserWallpaper(token, selected.id);
      if (!result.ok) {
        setMessage(result.message || t('settings.pluginMarket.wallpaper.feedback.deleteFailed', { defaultValue: '删除失败' }));
        return;
      }
      setSelected(null);
      setDeleteConfirming(false);
      setMessage(t('settings.pluginMarket.wallpaper.feedback.deleteSuccess', { defaultValue: '删除成功' }));
      await loadList(1);
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveMetadata = async (): Promise<void> => {
    const token = readLocalToken();
    if (!token || !selected || savingMetadata) return;
    setSavingMetadata(true);
    setMessage(t('settings.pluginMarket.wallpaper.feedback.saving', { defaultValue: '保存中…' }));
    try {
      const result = await updateUserWallpaperMetadata(token, {
        id: selected.id,
        title: editTitle,
        description: editDescription,
        tags: editTags,
        copyrightInfo: editCopyrightInfo,
        type: selected.type === 'video' ? 'video' : 'image',
      });
      if (!result.ok) {
        setMessage(result.message || t('settings.pluginMarket.wallpaper.feedback.updateFailed', { defaultValue: '保存失败' }));
        return;
      }
      setEditingMetadata(false);
      setMessage(t('settings.pluginMarket.wallpaper.feedback.updateSuccess', { defaultValue: '已保存，等待审核' }));
      await loadDetail(selected.id);
      await loadList(page);
    } finally {
      setSavingMetadata(false);
    }
  };

  return (
    <div className="settings-plugin-market-wallpaper">
      {message && <div className="settings-plugin-market-message">{message}</div>}

      <div className="settings-plugin-market-layout">
        <div className="settings-plugin-market-list-panel">
          <div className="settings-plugin-market-list">
            {loading ? (
              <div className="settings-plugin-market-empty">{t('settings.pluginMarket.wallpaper.feedback.loading', { defaultValue: '加载中…' })}</div>
            ) : list.length === 0 ? (
              <div className="settings-plugin-market-empty">{t('settings.pluginMarket.edit.feedback.emptyMine', { defaultValue: '你还没有上传过壁纸' })}</div>
            ) : (
              list.map((item) => {
                const preview = item.thumb320Url || item.thumb720Url || item.thumb1280Url || item.originalUrl || '';
                const isVideoCard = item.type === 'video';
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`settings-plugin-market-card ${selected?.id === item.id ? 'active' : ''}`}
                    onClick={() => { loadDetail(item.id).catch(() => {}); }}
                  >
                    <div className="settings-plugin-market-card-media">
                      {preview ? <img src={preview} alt={item.title} className="settings-plugin-market-card-img" /> : null}
                      {isVideoCard && (
                        <span className="settings-plugin-market-card-badge">
                          {t('settings.pluginMarket.wallpaper.badges.video', { defaultValue: '视频' })}
                          {item.durationMs ? ` · ${formatDuration(item.durationMs)}` : ''}
                        </span>
                      )}
                    </div>
                    <div className="settings-plugin-market-card-body">
                      <div className="settings-plugin-market-card-title">{item.title}</div>
                      <div className="settings-plugin-market-card-meta">
                        {t(`settings.pluginMarket.edit.status.${item.status}`, { defaultValue: item.status })}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <div className="settings-plugin-market-pagination">
            <button
              className="settings-hotkey-btn"
              type="button"
              onClick={handlePrevPage}
              disabled={loading || page <= 1}
            >
              {t('settings.pluginMarket.wallpaper.actions.prevPage', { defaultValue: '上一页' })}
            </button>
            <span className="settings-plugin-market-pagination-text">
              {t('settings.pluginMarket.wallpaper.pagination.page', {
                defaultValue: '第 {{page}} / {{total}} 页',
                page,
                total: totalPages,
              })}
            </span>
            <button
              className="settings-hotkey-btn"
              type="button"
              onClick={handleNextPage}
              disabled={loading || !hasNextPage}
            >
              {t('settings.pluginMarket.wallpaper.actions.nextPage', { defaultValue: '下一页' })}
            </button>
          </div>
        </div>

        <div className="settings-plugin-market-detail">
          <div className="settings-plugin-market-top-actions">
            <button className="settings-hotkey-btn" type="button" onClick={() => setSearchExpanded((prev) => !prev)}>
              {searchExpanded
                ? t('settings.pluginMarket.wallpaper.actions.collapseSearch', { defaultValue: '收起搜索' })
                : t('settings.pluginMarket.wallpaper.actions.expandSearch', { defaultValue: '展开搜索' })}
            </button>
            <button className="settings-hotkey-btn" type="button" onClick={onGoWallpaper}>
              {t('settings.pluginMarket.edit.actions.backToMarket', { defaultValue: '返回壁纸市场' })}
            </button>
          </div>

          {searchExpanded && (
            <div className="settings-plugin-market-toolbar">
              <input
                className="settings-field-input"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={t('settings.pluginMarket.edit.searchPlaceholder', { defaultValue: '搜索自己的壁纸' })}
              />
              <button className="settings-hotkey-btn" type="button" onClick={handleSearch}>
                {t('settings.pluginMarket.wallpaper.actions.search', { defaultValue: '搜索' })}
              </button>
            </div>
          )}

          {!selected ? (
            <div className="settings-plugin-market-empty">{t('settings.pluginMarket.edit.feedback.selectHint', { defaultValue: '请选择左侧壁纸查看元数据' })}</div>
          ) : (
            <div className="settings-plugin-market-detail-content">
              <div className="settings-plugin-market-detail-preview">
                {selectedIsVideo && selectedOriginalUrl ? (
                  <video
                    key={selectedOriginalUrl}
                    className="settings-plugin-market-detail-video"
                    src={selectedOriginalUrl}
                    poster={selectedCoverUrl || undefined}
                    autoPlay
                    loop
                    muted
                    playsInline
                    controls
                  />
                ) : selectedPreviewUrl ? (
                  <img src={selectedPreviewUrl} alt={selected.title} className="settings-plugin-market-detail-img" />
                ) : null}
              </div>

              <div className="settings-plugin-market-detail-meta-panel">
                <div className="settings-plugin-market-detail-title">{selected.title}</div>
                <div className="settings-plugin-market-detail-meta settings-plugin-market-owner-row">
                  {selected.ownerAvatar
                    ? <img src={selected.ownerAvatar} alt="" className="settings-plugin-market-owner-avatar large" />
                    : <img src={SvgIcon.USER} alt="" className="settings-plugin-market-owner-avatar large placeholder" />}
                  <span>@{selected.ownerUsername}</span>
                </div>
                <div className="settings-plugin-market-detail-meta">
                  {t('settings.pluginMarket.edit.meta.status', { defaultValue: '状态' })}:{' '}
                  {t(`settings.pluginMarket.edit.status.${selected.status}`, { defaultValue: selected.status })}
                </div>
                <div className="settings-plugin-market-detail-meta">{selected.description || '-'}</div>
                <div className="settings-plugin-market-detail-meta">
                  {t('settings.pluginMarket.edit.meta.copyrightInfo', { defaultValue: '版权声明信息' })}: {selected.copyrightInfo || '-'}
                </div>
                <div className="settings-plugin-market-detail-meta settings-plugin-market-detail-tags">
                  {(() => {
                    const chips = (selected.tagsText || '')
                      .split(/[,，]/)
                      .map((s) => s.trim())
                      .filter(Boolean);
                    if (chips.length === 0) return <span className="settings-plugin-market-detail-tags-empty">-</span>;
                    return chips.map((chip, idx) => (
                      <span key={`${chip}-${idx}`} className="settings-plugin-market-tag-chip readonly">
                        {chip}
                      </span>
                    ));
                  })()}
                </div>

                <div className="settings-plugin-market-owner-tools">
                  <button
                    className="settings-hotkey-btn"
                    type="button"
                    onClick={() => {
                      setEditingMetadata((prev) => !prev);
                      setEditTitle(selected.title || '');
                      setEditDescription(selected.description || '');
                      setEditTags(selected.tagsText || '');
                      setEditCopyrightInfo(selected.copyrightInfo || '');
                    }}
                  >
                    {editingMetadata
                      ? t('settings.pluginMarket.wallpaper.actions.cancelEdit', { defaultValue: '取消编辑' })
                      : t('settings.pluginMarket.wallpaper.actions.editMetadata', { defaultValue: '编辑元数据' })}
                  </button>
                  {!deleteConfirming ? (
                    <button
                      className="settings-hotkey-btn"
                      type="button"
                      onClick={() => setDeleteConfirming(true)}
                      disabled={deleting}
                    >
                      {deleting
                        ? t('settings.pluginMarket.wallpaper.actions.deleting', { defaultValue: '删除中…' })
                        : t('settings.pluginMarket.wallpaper.actions.delete', { defaultValue: '删除壁纸' })}
                    </button>
                  ) : (
                    <div className="settings-plugin-market-delete-confirm">
                      <button
                        className="settings-hotkey-btn settings-plugin-market-btn-danger"
                        type="button"
                        onClick={() => { handleDelete().catch(() => {}); }}
                        disabled={deleting}
                      >
                        {deleting
                          ? t('settings.pluginMarket.wallpaper.actions.deleting', { defaultValue: '删除中…' })
                          : t('settings.pluginMarket.wallpaper.actions.confirmDeleteBtn', { defaultValue: '确认删除' })}
                      </button>
                      <button
                        className="settings-hotkey-btn"
                        type="button"
                        onClick={() => setDeleteConfirming(false)}
                        disabled={deleting}
                      >
                        {t('settings.pluginMarket.wallpaper.actions.cancelDelete', { defaultValue: '取消' })}
                      </button>
                    </div>
                  )}

                  {editingMetadata && (
                    <div className="settings-plugin-market-edit-box">
                      <input
                        className="settings-field-input"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder={t('settings.pluginMarket.wallpaper.upload.titlePlaceholder', { defaultValue: '标题' })}
                      />
                      <textarea
                        className="settings-field-input"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder={t('settings.pluginMarket.wallpaper.upload.descriptionPlaceholder', { defaultValue: '描述' })}
                      />
                      <TagInput
                        value={editTags}
                        onChange={setEditTags}
                        placeholder={t('settings.pluginMarket.wallpaper.upload.tagsPlaceholder', { defaultValue: '标签（逗号分隔）' })}
                        disabled={savingMetadata}
                      />
                      <input
                        className="settings-field-input"
                        value={editCopyrightInfo}
                        onChange={(e) => setEditCopyrightInfo(e.target.value)}
                        placeholder={t('settings.pluginMarket.wallpaper.upload.copyrightInfoPlaceholder', { defaultValue: '声明版权信息（如原创、授权来源、授权编号）' })}
                        maxLength={500}
                      />
                      <button
                        className="settings-hotkey-btn"
                        type="button"
                        onClick={() => { handleSaveMetadata().catch(() => {}); }}
                        disabled={savingMetadata}
                      >
                        {savingMetadata
                          ? t('settings.pluginMarket.wallpaper.actions.savingMetadata', { defaultValue: '保存中…' })
                          : t('settings.pluginMarket.wallpaper.actions.saveMetadata', { defaultValue: '保存元数据' })}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
