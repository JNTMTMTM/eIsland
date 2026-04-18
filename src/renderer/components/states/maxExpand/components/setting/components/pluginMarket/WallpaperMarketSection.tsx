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
  uploadUserWallpaper,
  type WallpaperMarketItem,
} from '../../../../../../../api/userAccountApi';
import { readLocalProfile, readLocalToken } from '../../../../../../../utils/userAccount';

interface WallpaperMarketSectionProps {
  onApplyBackground: (imageUrl: string) => void;
}

const MAX_IMAGE_SIZE = 20 * 1024 * 1024;

async function createThumbnailFile(sourceFile: File, maxWidth: number): Promise<File> {
  const imageUrl = URL.createObjectURL(sourceFile);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('image load failed'));
      image.src = imageUrl;
    });
    const targetWidth = Math.max(1, Math.min(maxWidth, img.width));
    const targetHeight = Math.max(1, Math.round((img.height * targetWidth) / img.width));
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas context unavailable');
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('thumbnail encode failed'));
      }, 'image/jpeg', 0.9);
    });
    return new File([blob], `thumb-${maxWidth}.jpg`, { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export function WallpaperMarketSection({ onApplyBackground }: WallpaperMarketSectionProps) {
  const { t } = useTranslation();
  const [list, setList] = useState<WallpaperMarketItem[]>([]);
  const [selected, setSelected] = useState<WallpaperMarketItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'rating' | 'apply'>('newest');
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [copyrightDeclared, setCopyrightDeclared] = useState(false);
  const [ratingScore, setRatingScore] = useState(5);
  const [reportReasonType, setReportReasonType] = useState('copyright');
  const [reportReasonDetail, setReportReasonDetail] = useState('');
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

  const handleUpload = async (): Promise<void> => {
    const token = readLocalToken();
    if (!token) return;
    if (!uploadTitle.trim()) {
      setMessage(t('settings.pluginMarket.wallpaper.feedback.titleRequired', { defaultValue: '请填写标题' }));
      return;
    }
    if (!uploadFile) {
      setMessage(t('settings.pluginMarket.wallpaper.feedback.fileRequired', { defaultValue: '请选择图片文件' }));
      return;
    }
    if (!copyrightDeclared) {
      setMessage(t('settings.pluginMarket.wallpaper.feedback.copyrightRequired', { defaultValue: '请先勾选版权声明' }));
      return;
    }
    if (uploadFile.size > MAX_IMAGE_SIZE) {
      setMessage(t('settings.pluginMarket.wallpaper.feedback.fileTooLarge', { defaultValue: '图片不能超过 20MB' }));
      return;
    }
    setUploading(true);
    try {
      const thumb320 = await createThumbnailFile(uploadFile, 320);
      const thumb720 = await createThumbnailFile(uploadFile, 720);
      const thumb1280 = await createThumbnailFile(uploadFile, 1280);

      const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const url = URL.createObjectURL(uploadFile);
        const image = new Image();
        image.onload = () => {
          resolve({ width: image.width, height: image.height });
          URL.revokeObjectURL(url);
        };
        image.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('无法读取图片尺寸'));
        };
        image.src = url;
      });

      const result = await uploadUserWallpaper(token, {
        title: uploadTitle.trim(),
        description: uploadDescription.trim(),
        tags: uploadTags.trim(),
        type: 'image',
        copyrightDeclared,
        width: dimensions.width,
        height: dimensions.height,
        original: uploadFile,
        thumb320,
        thumb720,
        thumb1280,
      });

      if (!result.ok) {
        setMessage(result.message || t('settings.pluginMarket.wallpaper.feedback.uploadFailed', { defaultValue: '上传失败' }));
        return;
      }

      setMessage(t('settings.pluginMarket.wallpaper.feedback.uploadSuccess', { defaultValue: '上传成功，等待审核' }));
      setUploadTitle('');
      setUploadDescription('');
      setUploadTags('');
      setUploadFile(null);
      setCopyrightDeclared(false);
      await loadList();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('settings.pluginMarket.wallpaper.feedback.uploadFailed', { defaultValue: '上传失败' }));
    } finally {
      setUploading(false);
    }
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

      <div className="settings-plugin-market-upload">
        <div className="settings-plugin-market-upload-grid">
          <input
            className="settings-field-input"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            placeholder={t('settings.pluginMarket.wallpaper.upload.titlePlaceholder', { defaultValue: '标题' })}
          />
          <input
            className="settings-field-input"
            value={uploadTags}
            onChange={(e) => setUploadTags(e.target.value)}
            placeholder={t('settings.pluginMarket.wallpaper.upload.tagsPlaceholder', { defaultValue: '标签（逗号分隔）' })}
          />
          <textarea
            className="settings-field-input"
            value={uploadDescription}
            onChange={(e) => setUploadDescription(e.target.value)}
            placeholder={t('settings.pluginMarket.wallpaper.upload.descriptionPlaceholder', { defaultValue: '描述' })}
          />
          <input
            className="settings-field-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
          />
          <label className="settings-plugin-market-checkbox">
            <input
              type="checkbox"
              checked={copyrightDeclared}
              onChange={(e) => setCopyrightDeclared(e.target.checked)}
            />
            <span>{t('settings.pluginMarket.wallpaper.upload.copyright', { defaultValue: '我确认拥有该图片版权或已获授权' })}</span>
          </label>
          <button className="settings-hotkey-btn" type="button" onClick={() => { handleUpload().catch(() => {}); }} disabled={uploading}>
            {uploading
              ? t('settings.pluginMarket.wallpaper.actions.uploading', { defaultValue: '上传中…' })
              : t('settings.pluginMarket.wallpaper.actions.upload', { defaultValue: '上传壁纸' })}
          </button>
        </div>
      </div>

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
          {!selected ? (
            <div className="settings-plugin-market-empty">{t('settings.pluginMarket.wallpaper.feedback.selectHint', { defaultValue: '请选择左侧壁纸查看详情' })}</div>
          ) : (
            <>
              {selectedPreviewUrl ? <img src={selectedPreviewUrl} alt={selected.title} className="settings-plugin-market-detail-img" /> : null}
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
                    {t('settings.pluginMarket.wallpaper.actions.rate', { defaultValue: '评分' })}
                  </button>
                </div>
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
                    {t('settings.pluginMarket.wallpaper.actions.report', { defaultValue: '举报' })}
                  </button>
                </div>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
