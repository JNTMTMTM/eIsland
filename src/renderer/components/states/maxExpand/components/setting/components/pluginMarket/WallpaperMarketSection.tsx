import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  applyUserWallpaper,
  deleteUserWallpaper,
  getUserWallpaperDetail,
  listUserWallpapers,
  rateUserWallpaper,
  reportUserWallpaper,
  updateUserWallpaperMetadata,
  type WallpaperMarketItem,
} from '../../../../../../../api/userAccountApi';
import { readLocalProfile, readLocalToken } from '../../../../../../../utils/userAccount';

interface WallpaperMarketSectionProps {
  onApplyBackground: (imageUrl: string) => void;
  onGoContribution: () => void;
}

export function WallpaperMarketSection({ onApplyBackground, onGoContribution }: WallpaperMarketSectionProps) {
  const { t } = useTranslation();
  const [list, setList] = useState<WallpaperMarketItem[]>([]);
  const [selected, setSelected] = useState<WallpaperMarketItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'rating' | 'apply'>('newest');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [message, setMessage] = useState('');
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingExpanded, setRatingExpanded] = useState(false);
  const [reportReasonType, setReportReasonType] = useState('copyright');
  const [reportReasonDetail, setReportReasonDetail] = useState('');
  const [reportExpanded, setReportExpanded] = useState(false);
  const [editingMetadata, setEditingMetadata] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTags, setEditTags] = useState('');

  const currentUsername = readLocalProfile()?.username || '';

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
      const result = await listUserWallpapers(token, {
        keyword: keyword.trim() || undefined,
        sort: sortBy,
        page: 1,
        pageSize: 50,
      });
      if (result.ok && Array.isArray(result.data)) {
        setList(result.data);
        if (result.data.length === 0) {
          setSelected(null);
        } else if (!selected) {
          setSelected(result.data[0]);
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
  }, [sortBy]);

  const handleSearch = (): void => {
    loadList().catch(() => {});
  };

  const handleApply = async (): Promise<void> => {
    const token = readLocalToken();
    if (!token || !selected) return;
    const result = await applyUserWallpaper(token, selected.id);
    if (!result.ok) {
      setMessage(result.message || t('settings.pluginMarket.wallpaper.feedback.applyFailed', { defaultValue: '应用失败' }));
      return;
    }
    if (selectedPreviewUrl) {
      onApplyBackground(selectedPreviewUrl);
    }
    setMessage(t('settings.pluginMarket.wallpaper.feedback.applySuccess', { defaultValue: '已应用壁纸背景' }));
    await loadDetail(selected.id);
  };

  const handleRate = async (): Promise<void> => {
    const token = readLocalToken();
    if (!token || !selected) return;
    const result = await rateUserWallpaper(token, selected.id, ratingScore);
    if (!result.ok) {
      setMessage(result.message || t('settings.pluginMarket.wallpaper.feedback.rateFailed', { defaultValue: '评分失败' }));
      return;
    }
    setMessage(t('settings.pluginMarket.wallpaper.feedback.rateSuccess', { defaultValue: '评分成功' }));
    await loadDetail(selected.id);
  };

  const handleReport = async (): Promise<void> => {
    const token = readLocalToken();
    if (!token || !selected) return;
    const result = await reportUserWallpaper(token, {
      id: selected.id,
      reasonType: reportReasonType,
      reasonDetail: reportReasonDetail,
    });
    if (!result.ok) {
      setMessage(result.message || t('settings.pluginMarket.wallpaper.feedback.reportFailed', { defaultValue: '举报失败' }));
      return;
    }
    setReportReasonDetail('');
    setMessage(t('settings.pluginMarket.wallpaper.feedback.reportSuccess', { defaultValue: '举报已提交' }));
  };

  const handleDelete = async (): Promise<void> => {
    const token = readLocalToken();
    if (!token || !selected) return;
    const confirmText = t('settings.pluginMarket.wallpaper.actions.confirmDelete', { defaultValue: '确认删除该壁纸？' });
    if (!window.confirm(confirmText)) return;
    const result = await deleteUserWallpaper(token, selected.id);
    if (!result.ok) {
      setMessage(result.message || t('settings.pluginMarket.wallpaper.feedback.deleteFailed', { defaultValue: '删除失败' }));
      return;
    }
    setSelected(null);
    setMessage(t('settings.pluginMarket.wallpaper.feedback.deleteSuccess', { defaultValue: '删除成功' }));
    await loadList();
  };

  const handleSaveMetadata = async (): Promise<void> => {
    const token = readLocalToken();
    if (!token || !selected) return;
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
  };

  return (
    <div className="settings-plugin-market-wallpaper">
      {message && <div className="settings-plugin-market-message">{message}</div>}

      <div className="settings-plugin-market-layout">
        <div className="settings-plugin-market-list">
          {loading ? (
            <div className="settings-plugin-market-empty">{t('settings.pluginMarket.wallpaper.feedback.loading', { defaultValue: '加载中…' })}</div>
          ) : list.length === 0 ? (
            <div className="settings-plugin-market-empty">{t('settings.pluginMarket.wallpaper.feedback.empty', { defaultValue: '暂无壁纸' })}</div>
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
                    <div className="settings-plugin-market-card-meta">@{item.ownerUsername}</div>
                    <div className="settings-plugin-market-card-meta">
                      ★ {Number(item.ratingAvg ?? 0).toFixed(1)} · {item.applyCount ?? 0}
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
            <button className="settings-hotkey-btn" type="button" onClick={onGoContribution}>
              {t('settings.pluginMarket.wallpaper.actions.goContribution', { defaultValue: '前往贡献' })}
            </button>
          </div>

          {searchExpanded && (
            <div className="settings-plugin-market-toolbar">
              <input
                className="settings-field-input"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={t('settings.pluginMarket.wallpaper.searchPlaceholder', { defaultValue: '搜索标题/作者/描述/标签' })}
              />
              <select
                className="settings-field-input"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'rating' | 'apply')}
              >
                <option value="newest">{t('settings.pluginMarket.wallpaper.sort.newest', { defaultValue: '最新' })}</option>
                <option value="rating">{t('settings.pluginMarket.wallpaper.sort.rating', { defaultValue: '评分最高' })}</option>
                <option value="apply">{t('settings.pluginMarket.wallpaper.sort.apply', { defaultValue: '应用最多' })}</option>
              </select>
              <button className="settings-hotkey-btn" type="button" onClick={handleSearch}>
                {t('settings.pluginMarket.wallpaper.actions.search', { defaultValue: '搜索' })}
              </button>
            </div>
          )}

          {!selected ? (
            <div className="settings-plugin-market-empty">{t('settings.pluginMarket.wallpaper.feedback.selectHint', { defaultValue: '请选择左侧壁纸查看详情' })}</div>
          ) : (
            <div className="settings-plugin-market-detail-content">
              <div className="settings-plugin-market-detail-preview">
                {selectedPreviewUrl ? <img src={selectedPreviewUrl} alt={selected.title} className="settings-plugin-market-detail-img" /> : null}
              </div>

              <div className="settings-plugin-market-detail-meta-panel">
                <div className="settings-plugin-market-detail-title">{selected.title}</div>
                <div className="settings-plugin-market-detail-meta">@{selected.ownerUsername}</div>
                <div className="settings-plugin-market-detail-meta">{selected.description || '-'}</div>
                <div className="settings-plugin-market-detail-meta">{selected.tagsText || '-'}</div>
                <div className="settings-plugin-market-detail-meta">
                  {t('settings.pluginMarket.wallpaper.meta.rating', { defaultValue: '评分' })}: {Number(selected.ratingAvg ?? 0).toFixed(1)} ({selected.ratingCount ?? 0})
                </div>
                <div className="settings-plugin-market-detail-meta">
                  {t('settings.pluginMarket.wallpaper.meta.apply', { defaultValue: '应用次数' })}: {selected.applyCount ?? 0}
                </div>

                <div className="settings-plugin-market-actions">
                  <button className="settings-hotkey-btn" type="button" onClick={() => { handleApply().catch(() => {}); }}>
                    {t('settings.pluginMarket.wallpaper.actions.apply', { defaultValue: '应用为背景' })}
                  </button>
                  <button
                    className="settings-hotkey-btn"
                    type="button"
                    onClick={() => setRatingExpanded((prev) => !prev)}
                  >
                    {ratingExpanded
                      ? t('settings.pluginMarket.wallpaper.actions.collapseRate', { defaultValue: '收起评分' })
                      : t('settings.pluginMarket.wallpaper.actions.expandRate', { defaultValue: '评分' })}
                  </button>
                  {ratingExpanded && (
                    <div className="settings-plugin-market-rating-row">
                      <select
                        className="settings-field-input"
                        value={ratingScore}
                        onChange={(e) => setRatingScore(Math.max(1, Math.min(5, Number(e.target.value) || 5)))}
                      >
                        {[1, 2, 3, 4, 5].map((score) => (
                          <option key={score} value={score}>{score}</option>
                        ))}
                      </select>
                      <button className="settings-hotkey-btn" type="button" onClick={() => { handleRate().catch(() => {}); }}>
                        {t('settings.pluginMarket.wallpaper.actions.rate', { defaultValue: '提交评分' })}
                      </button>
                    </div>
                  )}
                  <button
                    className="settings-hotkey-btn"
                    type="button"
                    onClick={() => setReportExpanded((prev) => !prev)}
                  >
                    {reportExpanded
                      ? t('settings.pluginMarket.wallpaper.actions.collapseReport', { defaultValue: '收起举报' })
                      : t('settings.pluginMarket.wallpaper.actions.expandReport', { defaultValue: '举报' })}
                  </button>
                  {reportExpanded && (
                    <div className="settings-plugin-market-report-row">
                      <select
                        className="settings-field-input"
                        value={reportReasonType}
                        onChange={(e) => setReportReasonType(e.target.value)}
                      >
                        <option value="copyright">{t('settings.pluginMarket.wallpaper.report.copyright', { defaultValue: '版权问题' })}</option>
                        <option value="illegal">{t('settings.pluginMarket.wallpaper.report.illegal', { defaultValue: '违规内容' })}</option>
                        <option value="other">{t('settings.pluginMarket.wallpaper.report.other', { defaultValue: '其他' })}</option>
                      </select>
                      <input
                        className="settings-field-input"
                        value={reportReasonDetail}
                        onChange={(e) => setReportReasonDetail(e.target.value)}
                        placeholder={t('settings.pluginMarket.wallpaper.report.detailPlaceholder', { defaultValue: '举报补充说明（可选）' })}
                      />
                      <button className="settings-hotkey-btn" type="button" onClick={() => { handleReport().catch(() => {}); }}>
                        {t('settings.pluginMarket.wallpaper.actions.submitReport', { defaultValue: '提交举报' })}
                      </button>
                    </div>
                  )}
                </div>

                {selected.ownerUsername === currentUsername && (
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
                    <button className="settings-hotkey-btn" type="button" onClick={() => { handleDelete().catch(() => {}); }}>
                      {t('settings.pluginMarket.wallpaper.actions.delete', { defaultValue: '删除壁纸' })}
                    </button>

                    {editingMetadata && (
                      <div className="settings-plugin-market-edit-box">
                        <input className="settings-field-input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                        <textarea className="settings-field-input" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                        <input className="settings-field-input" value={editTags} onChange={(e) => setEditTags(e.target.value)} />
                        <button className="settings-hotkey-btn" type="button" onClick={() => { handleSaveMetadata().catch(() => {}); }}>
                          {t('settings.pluginMarket.wallpaper.actions.saveMetadata', { defaultValue: '保存元数据' })}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
