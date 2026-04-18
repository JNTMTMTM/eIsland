import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
  applyUserWallpaper,
  getUserWallpaperDetail,
  listUserWallpapers,
  rateUserWallpaper,
  reportUserWallpaper,
  type WallpaperMarketItem,
} from '../../../../../../../api/userAccountApi';
import { readLocalToken } from '../../../../../../../utils/userAccount';
import { SvgIcon } from '../../../../../../../utils/SvgIcon';

interface WallpaperMarketSectionProps {
  onApplyBackground: (imageUrl: string) => void;
  onGoContribution: () => void;
}

export function WallpaperMarketSection({ onApplyBackground, onGoContribution }: WallpaperMarketSectionProps) {
  const { t } = useTranslation();
  const ratingDescriptions = [
    t('settings.pluginMarket.wallpaper.ratingLevels.1', { defaultValue: '很差' }),
    t('settings.pluginMarket.wallpaper.ratingLevels.2', { defaultValue: '较差' }),
    t('settings.pluginMarket.wallpaper.ratingLevels.3', { defaultValue: '一般' }),
    t('settings.pluginMarket.wallpaper.ratingLevels.4', { defaultValue: '不错' }),
    t('settings.pluginMarket.wallpaper.ratingLevels.5', { defaultValue: '超赞' }),
  ];
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
  const [applying, setApplying] = useState(false);
  const [submittingRate, setSubmittingRate] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);

  const selectedPreviewUrl = useMemo(() => (
    selected?.thumb1280Url || selected?.thumb720Url || selected?.thumb320Url || selected?.originalUrl || ''
  ), [selected]);

  const renderStars = (avg: number): ReactElement => {
    const filled = Math.max(0, Math.min(5, Math.round(Number(avg) || 0)));
    return (
      <span className="settings-plugin-market-star-display">
        {[1, 2, 3, 4, 5].map((i) => (
          <img
            key={i}
            src={SvgIcon.STAR}
            alt=""
            className={`settings-plugin-market-star-inline ${i <= filled ? 'active' : ''}`}
          />
        ))}
      </span>
    );
  };

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
    if (!token || !selected || applying) return;
    setApplying(true);
    setMessage(t('settings.pluginMarket.wallpaper.feedback.applying', { defaultValue: '应用中…' }));
    try {
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
    } finally {
      setApplying(false);
    }
  };

  const handleRate = async (): Promise<void> => {
    const token = readLocalToken();
    if (!token || !selected || submittingRate) return;
    setSubmittingRate(true);
    setMessage(t('settings.pluginMarket.wallpaper.feedback.rating', { defaultValue: '评分提交中…' }));
    try {
      const result = await rateUserWallpaper(token, selected.id, ratingScore);
      if (!result.ok) {
        setMessage(result.message || t('settings.pluginMarket.wallpaper.feedback.rateFailed', { defaultValue: '评分失败' }));
        return;
      }
      setMessage(t('settings.pluginMarket.wallpaper.feedback.rateSuccess', { defaultValue: '评分成功' }));
      await loadDetail(selected.id);
    } finally {
      setSubmittingRate(false);
    }
  };

  const handleReport = async (): Promise<void> => {
    const token = readLocalToken();
    if (!token || !selected || submittingReport) return;
    setSubmittingReport(true);
    setMessage(t('settings.pluginMarket.wallpaper.feedback.reporting', { defaultValue: '举报提交中…' }));
    try {
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
    } finally {
      setSubmittingReport(false);
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
                    <div className="settings-plugin-market-card-meta settings-plugin-market-owner-row">
                      {item.ownerAvatar
                        ? <img src={item.ownerAvatar} alt="" className="settings-plugin-market-owner-avatar" />
                        : <img src={SvgIcon.USER} alt="" className="settings-plugin-market-owner-avatar placeholder" />}
                      <span>@{item.ownerUsername}</span>
                    </div>
                    <div className="settings-plugin-market-card-meta settings-plugin-market-card-rating">
                      {renderStars(Number(item.ratingAvg ?? 0))}
                      <span>{Number(item.ratingAvg ?? 0).toFixed(1)}</span>
                      <span className="settings-plugin-market-card-apply">
                        <img src={SvgIcon.DOWNLOAD} alt="" className="settings-plugin-market-apply-icon" />
                        <span>{item.applyCount ?? 0}</span>
                      </span>
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
                <div className="settings-plugin-market-detail-meta settings-plugin-market-owner-row">
                  {selected.ownerAvatar
                    ? <img src={selected.ownerAvatar} alt="" className="settings-plugin-market-owner-avatar large" />
                    : <img src={SvgIcon.USER} alt="" className="settings-plugin-market-owner-avatar large placeholder" />}
                  <span>@{selected.ownerUsername}</span>
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
                <div className="settings-plugin-market-detail-meta settings-plugin-market-detail-rating">
                  <span>{t('settings.pluginMarket.wallpaper.meta.rating', { defaultValue: '评分' })}:</span>
                  {renderStars(Number(selected.ratingAvg ?? 0))}
                  <span>{Number(selected.ratingAvg ?? 0).toFixed(1)}</span>
                  <span>({selected.ratingCount ?? 0})</span>
                  <span className="settings-plugin-market-detail-apply">
                    <img src={SvgIcon.DOWNLOAD} alt="" className="settings-plugin-market-apply-icon" />
                    <span>{selected.applyCount ?? 0}</span>
                  </span>
                </div>

                <div className="settings-plugin-market-actions">
                  <button
                    className="settings-hotkey-btn"
                    type="button"
                    onClick={() => { handleApply().catch(() => {}); }}
                    disabled={applying}
                  >
                    {applying
                      ? t('settings.pluginMarket.wallpaper.actions.applying', { defaultValue: '应用中…' })
                      : t('settings.pluginMarket.wallpaper.actions.apply', { defaultValue: '应用为背景' })}
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
                      <div className="settings-plugin-market-rating-picker-group">
                        <div
                          className="settings-plugin-market-star-picker"
                          role="radiogroup"
                          aria-label={t('settings.pluginMarket.wallpaper.actions.expandRate', { defaultValue: '评分' })}
                        >
                          {[1, 2, 3, 4, 5].map((score) => (
                            <button
                              key={score}
                              type="button"
                              className={`settings-plugin-market-star-btn ${score <= ratingScore ? 'active' : ''}`}
                              onClick={() => setRatingScore(score)}
                              aria-label={`${score} ${ratingDescriptions[score - 1]}`}
                              aria-checked={score === ratingScore}
                              role="radio"
                            >
                              <img src={SvgIcon.STAR} alt="" className="settings-plugin-market-star-icon" />
                            </button>
                          ))}
                        </div>
                        <div className="settings-plugin-market-rating-hint">
                          <span className="settings-plugin-market-rating-current">
                            {t('settings.pluginMarket.wallpaper.rating.current', { defaultValue: '当前评分' })}: {ratingScore} · {ratingDescriptions[ratingScore - 1]}
                          </span>
                          <span className="settings-plugin-market-rating-help">
                            {t('settings.pluginMarket.wallpaper.rating.help', { defaultValue: '点击星星选择分数，5 分表示最喜欢' })}
                          </span>
                        </div>
                      </div>
                      <button
                        className="settings-hotkey-btn"
                        type="button"
                        onClick={() => { handleRate().catch(() => {}); }}
                        disabled={submittingRate}
                      >
                        {submittingRate
                          ? t('settings.pluginMarket.wallpaper.actions.rating', { defaultValue: '提交中…' })
                          : t('settings.pluginMarket.wallpaper.actions.rate', { defaultValue: '提交评分' })}
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
                      <button
                        className="settings-hotkey-btn"
                        type="button"
                        onClick={() => { handleReport().catch(() => {}); }}
                        disabled={submittingReport}
                      >
                        {submittingReport
                          ? t('settings.pluginMarket.wallpaper.actions.reporting', { defaultValue: '提交中…' })
                          : t('settings.pluginMarket.wallpaper.actions.submitReport', { defaultValue: '提交举报' })}
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
