import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  deleteUserWallpaper,
  getUserWallpaperDetail,
  listMyUserWallpapers,
  updateUserWallpaperMetadata,
  type WallpaperMarketItem,
} from '../../../../../../../api/userAccountApi';
import { readLocalToken } from '../../../../../../../utils/userAccount';
import { SvgIcon } from '../../../../../../../utils/SvgIcon';
import { TagInput } from './TagInput';

interface WallpaperEditSectionProps {
  onGoWallpaper: () => void;
}

export function WallpaperEditSection({ onGoWallpaper }: WallpaperEditSectionProps) {
  const { t } = useTranslation();
  const [list, setList] = useState<WallpaperMarketItem[]>([]);
  const [selected, setSelected] = useState<WallpaperMarketItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [message, setMessage] = useState('');
  const [editingMetadata, setEditingMetadata] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTags, setEditTags] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [savingMetadata, setSavingMetadata] = useState(false);
  const [deleteConfirming, setDeleteConfirming] = useState(false);

  const selectedPreviewUrl = useMemo(() => (
    selected?.thumb1280Url || selected?.thumb720Url || selected?.thumb320Url || selected?.originalUrl || ''
  ), [selected]);

  const loadList = async (): Promise<void> => {
    const token = readLocalToken();
    if (!token) {
      setList([]);
      setSelected(null);
      return;
    }
    setLoading(true);
    try {
      const result = await listMyUserWallpapers(token, {
        keyword: keyword.trim() || undefined,
        page: 1,
        pageSize: 100,
      });
      if (result.ok && Array.isArray(result.data)) {
        setList(result.data);
        if (result.data.length === 0) {
          setSelected(null);
        } else if (!selected || !result.data.find((w) => w.id === selected.id)) {
          setSelected(result.data[0]);
          setEditTitle(result.data[0].title || '');
          setEditDescription(result.data[0].description || '');
          setEditTags(result.data[0].tagsText || '');
        }
        return;
      }
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
      return;
    }
    setMessage(result.message || t('settings.pluginMarket.wallpaper.feedback.detailFailed', { defaultValue: '加载详情失败' }));
  };

  useEffect(() => {
    loadList().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setDeleteConfirming(false);
  }, [selected?.id]);

  const handleSearch = (): void => {
    loadList().catch(() => {});
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
      await loadList();
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
        type: 'image',
      });
      if (!result.ok) {
        setMessage(result.message || t('settings.pluginMarket.wallpaper.feedback.updateFailed', { defaultValue: '保存失败' }));
        return;
      }
      setEditingMetadata(false);
      setMessage(t('settings.pluginMarket.wallpaper.feedback.updateSuccess', { defaultValue: '已保存，等待审核' }));
      await loadDetail(selected.id);
      await loadList();
    } finally {
      setSavingMetadata(false);
    }
  };

  return (
    <div className="settings-plugin-market-wallpaper">
      {message && <div className="settings-plugin-market-message">{message}</div>}

      <div className="settings-plugin-market-layout">
        <div className="settings-plugin-market-list">
          {loading ? (
            <div className="settings-plugin-market-empty">{t('settings.pluginMarket.wallpaper.feedback.loading', { defaultValue: '加载中…' })}</div>
          ) : list.length === 0 ? (
            <div className="settings-plugin-market-empty">{t('settings.pluginMarket.edit.feedback.emptyMine', { defaultValue: '你还没有上传过壁纸' })}</div>
          ) : (
            list.map((item) => {
              const preview = item.thumb320Url || item.thumb720Url || item.thumb1280Url || item.originalUrl || '';
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`settings-plugin-market-card ${selected?.id === item.id ? 'active' : ''}`}
                  onClick={() => { loadDetail(item.id).catch(() => {}); }}
                >
                  {preview ? <img src={preview} alt={item.title} className="settings-plugin-market-card-img" /> : null}
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
                {selectedPreviewUrl ? <img src={selectedPreviewUrl} alt={selected.title} className="settings-plugin-market-detail-img" /> : null}
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
