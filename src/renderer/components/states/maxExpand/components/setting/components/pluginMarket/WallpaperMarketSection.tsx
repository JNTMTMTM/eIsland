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
 * @file WallpaperMarketSection.tsx
 * @description 插件市场壁纸浏览组件
 * @author 鸡哥
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
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
  onApplyBackground: (imageUrl: string, options?: { type?: 'image' | 'video' }) => void;
  onGoContribution: () => void;
}

const MARKET_PAGE_SIZE = 6;

function formatDuration(durationMs: number | undefined): string {
  if (!durationMs || !Number.isFinite(durationMs) || durationMs <= 0) return '--:--';
  const totalSec = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * 壁纸市场内容区
 */
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
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
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
  const [hoverVideoId, setHoverVideoId] = useState<number | null>(null);
  const [detailVideoMuted, setDetailVideoMuted] = useState<boolean>(true);
  const [detailVideoPlaybackRate, setDetailVideoPlaybackRate] = useState<number>(1);
  const [detailVideoVolume, setDetailVideoVolume] = useState<number>(0.6);
  const [detailVideoPlaying, setDetailVideoPlaying] = useState<boolean>(true);
  const detailVideoRef = useRef<HTMLVideoElement | null>(null);

  const selectedPreviewUrl = useMemo(() => (
    selected?.thumb1280Url || selected?.thumb720Url || selected?.thumb320Url || selected?.originalUrl || ''
  ), [selected]);
  const selectedCoverUrl = useMemo(() => (
    selected?.thumb1280Url || selected?.thumb720Url || selected?.thumb320Url || ''
  ), [selected]);
  const selectedOriginalUrl = selected?.originalUrl || '';
  const selectedIsVideo = selected?.type === 'video';

  const handleHoverCard = useCallback((item: WallpaperMarketItem): void => {
    if (item.type === 'video' && item.originalUrl) {
      setHoverVideoId(item.id);
    } else {
      setHoverVideoId(null);
    }
  }, []);

  const handleLeaveCard = useCallback((): void => {
    setHoverVideoId(null);
  }, []);

  useEffect(() => {
    // 切换选中项时，重置详情视频状态
    setDetailVideoPlaying(true);
    setDetailVideoPlaybackRate(1);
  }, [selected?.id]);

  useEffect(() => {
    const video = detailVideoRef.current;
    if (!video) return;
    video.muted = detailVideoMuted;
    video.volume = Math.max(0, Math.min(1, detailVideoVolume));
    video.playbackRate = detailVideoPlaybackRate;
  }, [detailVideoMuted, detailVideoVolume, detailVideoPlaybackRate]);

  useEffect(() => {
    const video = detailVideoRef.current;
    if (!video) return;
    if (detailVideoPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [detailVideoPlaying, selectedOriginalUrl]);

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

  const loadList = async (targetPage: number = page): Promise<void> => {
    const token = readLocalToken();
    if (!token) {
      setList([]);
      setSelected(null);
      setHasNextPage(false);
      return;
    }
    setLoading(true);
    try {
      const result = await listUserWallpapers(token, {
        keyword: keyword.trim() || undefined,
        sort: sortBy,
        page: targetPage,
        pageSize: MARKET_PAGE_SIZE,
      });
      if (result.ok && Array.isArray(result.data)) {
        setPage(targetPage);
        setList(result.data);
        setHasNextPage(result.data.length >= MARKET_PAGE_SIZE);
        if (result.data.length === 0) {
          setSelected(null);
        } else if (!selected || !result.data.some((item) => item.id === selected.id)) {
          const next = result.data[0];
          setSelected(next);
          // 列表项若是视频，拉一次详情补齐 originalUrl / 封面等字段，保证视频预览能正常进入
          if (next.type === 'video') {
            loadDetail(next.id).catch(() => {});
          }
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
      return;
    }
    setMessage(result.message || t('settings.pluginMarket.wallpaper.feedback.detailFailed', { defaultValue: '加载详情失败' }));
  };

  useEffect(() => {
    loadList(1).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);

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
      const applyUrl = selectedIsVideo
        ? (selectedOriginalUrl || selectedPreviewUrl)
        : selectedPreviewUrl;
      if (applyUrl) {
        onApplyBackground(applyUrl, { type: selectedIsVideo ? 'video' : 'image' });
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
        <div className="settings-plugin-market-list-panel">
          <div className="settings-plugin-market-list">
            {loading ? (
              <div className="settings-plugin-market-empty">{t('settings.pluginMarket.wallpaper.feedback.loading', { defaultValue: '加载中…' })}</div>
            ) : list.length === 0 ? (
              <div className="settings-plugin-market-empty">{t('settings.pluginMarket.wallpaper.feedback.empty', { defaultValue: '暂无壁纸' })}</div>
            ) : (
              list.map((item) => {
                const preview = item.thumb320Url || item.thumb720Url || item.thumb1280Url || item.originalUrl || '';
                const isVideoCard = item.type === 'video';
                const showHoverVideo = isVideoCard && hoverVideoId === item.id && !!item.originalUrl;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`settings-plugin-market-card ${selected?.id === item.id ? 'active' : ''}`}
                    onClick={() => { loadDetail(item.id).catch(() => {}); }}
                    onMouseEnter={() => handleHoverCard(item)}
                    onMouseLeave={handleLeaveCard}
                    onFocus={() => handleHoverCard(item)}
                    onBlur={handleLeaveCard}
                  >
                    <div className="settings-plugin-market-card-media">
                      {preview ? <img src={preview} alt={item.title} className="settings-plugin-market-card-img" /> : null}
                      {showHoverVideo && item.originalUrl && (
                        <video
                          key={`hover-${item.id}`}
                          className="settings-plugin-market-card-video"
                          src={item.originalUrl}
                          autoPlay
                          muted
                          loop
                          playsInline
                          preload="metadata"
                          onCanPlay={(event) => { event.currentTarget.play().catch(() => {}); }}
                        />
                      )}
                      {isVideoCard && (
                        <span className="settings-plugin-market-card-badge">
                          {t('settings.pluginMarket.wallpaper.badges.video', { defaultValue: '视频' })}
                          {item.durationMs ? ` · ${formatDuration(item.durationMs)}` : ''}
                        </span>
                      )}
                    </div>
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
              {t('settings.pluginMarket.wallpaper.pagination.page', { defaultValue: '第 {{page}} 页', page })}
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
                {selectedIsVideo && selectedOriginalUrl ? (
                  <>
                    <video
                      ref={detailVideoRef}
                      key={selectedOriginalUrl}
                      className="settings-plugin-market-detail-video"
                      src={selectedOriginalUrl}
                      poster={selectedCoverUrl || undefined}
                      autoPlay
                      loop
                      playsInline
                      controls={false}
                      onEnded={() => setDetailVideoPlaying(true)}
                      onPlay={() => setDetailVideoPlaying(true)}
                      onPause={() => setDetailVideoPlaying(false)}
                    />
                    <div className="settings-plugin-market-detail-video-controls">
                      <button
                        className="settings-hotkey-btn"
                        type="button"
                        onClick={() => setDetailVideoPlaying((prev) => !prev)}
                      >
                        {detailVideoPlaying
                          ? t('settings.pluginMarket.wallpaper.videoControls.pause', { defaultValue: '暂停' })
                          : t('settings.pluginMarket.wallpaper.videoControls.play', { defaultValue: '播放' })}
                      </button>
                      <button
                        className="settings-hotkey-btn"
                        type="button"
                        onClick={() => setDetailVideoMuted((prev) => !prev)}
                      >
                        {detailVideoMuted
                          ? t('settings.pluginMarket.wallpaper.videoControls.unmute', { defaultValue: '取消静音' })
                          : t('settings.pluginMarket.wallpaper.videoControls.mute', { defaultValue: '静音' })}
                      </button>
                      <label className="settings-plugin-market-detail-video-slider">
                        <span>{t('settings.pluginMarket.wallpaper.videoControls.volume', { defaultValue: '音量' })}</span>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={detailVideoVolume}
                          onChange={(event) => {
                            const value = parseFloat(event.target.value);
                            if (Number.isFinite(value)) {
                              setDetailVideoVolume(Math.max(0, Math.min(1, value)));
                              if (value > 0) setDetailVideoMuted(false);
                            }
                          }}
                        />
                      </label>
                      <label className="settings-plugin-market-detail-video-slider">
                        <span>{t('settings.pluginMarket.wallpaper.videoControls.rate', { defaultValue: '速度' })}</span>
                        <select
                          className="settings-field-input"
                          value={detailVideoPlaybackRate}
                          onChange={(event) => {
                            const value = parseFloat(event.target.value);
                            if (Number.isFinite(value) && value > 0) setDetailVideoPlaybackRate(value);
                          }}
                        >
                          <option value={0.5}>0.5x</option>
                          <option value={0.75}>0.75x</option>
                          <option value={1}>1.0x</option>
                          <option value={1.25}>1.25x</option>
                          <option value={1.5}>1.5x</option>
                          <option value={2}>2.0x</option>
                        </select>
                      </label>
                    </div>
                  </>
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
