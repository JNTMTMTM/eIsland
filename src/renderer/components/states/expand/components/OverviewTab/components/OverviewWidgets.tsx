import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../../../../../i18n';
import useIslandStore from '../../../../../../store/slices';
import { SvgIcon } from '../../../../../../utils/SvgIcon';
import { getWebsiteFaviconUrl } from '../../../../../../api/site/siteMetaApi';
import {
  CD_TYPE_LABELS,
  MOKUGYO_AUDIO_SRC,
  MOKUGYO_FLOAT_DURATION_MS,
  MOKUGYO_HIT_ANIMATION_MS,
  OVERVIEW_ALBUM_CONFIG_STORE_KEY,
  OVERVIEW_ALBUM_MEDIA_LOAD_DELAY_MS,
  PHOTO_ALBUM_STORE_KEY,
  POMODORO_DURATIONS,
  POMODORO_LABELS,
  POMODORO_STORE_KEY,
  PRIORITIES,
  SIZES,
  URL_FAVORITES_STORE_KEY,
  advancePomodoroPhase,
  cdDiffDays,
  fmtPomodoroTime,
  getOverviewVideoMimeByExt,
  getPomodoroTimeline,
  normalizeOverviewAlbumCardConfig,
  normalizeOverviewAlbumItems,
  type AppShortcut,
  type CountdownDateItem,
  type OverviewAlbumCardConfig,
  type OverviewAlbumItem,
  type PomodoroData,
  type PomodoroPhase,
  type TodoItem,
  type UrlFavoriteItem,
} from '../utils/overviewUtils';

interface MokugyoFloatingMerit {
  id: number;
  driftX: number;
}

export function MokugyoWidget(): React.ReactElement {
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hitResetTimerRef = useRef<number | null>(null);
  const floatingTimerRef = useRef<Record<number, number>>({});
  const [hitting, setHitting] = useState(false);
  const [meritCount, setMeritCount] = useState(0);
  const [floatingMerits, setFloatingMerits] = useState<MokugyoFloatingMerit[]>([]);

  useEffect(() => {
    const audio = new Audio(MOKUGYO_AUDIO_SRC);
    audio.preload = 'auto';
    audioRef.current = audio;

    return () => {
      if (hitResetTimerRef.current !== null) {
        window.clearTimeout(hitResetTimerRef.current);
      }
      Object.values(floatingTimerRef.current).forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      floatingTimerRef.current = {};
      const current = audioRef.current;
      if (current) {
        current.pause();
        current.src = '';
      }
      audioRef.current = null;
    };
  }, []);

  const handleStrike = useCallback((): void => {
    setMeritCount((prev) => prev + 1);
    setHitting(false);
    window.requestAnimationFrame(() => {
      setHitting(true);
    });

    const floatingId = Date.now() + Math.floor(Math.random() * 1000);
    const driftX = Math.floor(Math.random() * 22) - 11;
    setFloatingMerits((prev) => [...prev, { id: floatingId, driftX }]);
    const timer = window.setTimeout(() => {
      setFloatingMerits((prev) => prev.filter((item) => item.id !== floatingId));
      delete floatingTimerRef.current[floatingId];
    }, MOKUGYO_FLOAT_DURATION_MS);
    floatingTimerRef.current[floatingId] = timer;

    if (hitResetTimerRef.current !== null) {
      window.clearTimeout(hitResetTimerRef.current);
    }
    hitResetTimerRef.current = window.setTimeout(() => {
      setHitting(false);
      hitResetTimerRef.current = null;
    }, MOKUGYO_HIT_ANIMATION_MS);

    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.currentTime = 0;
    } catch {
      // noop
    }
    audio.play().catch(() => {});
  }, []);

  return (
    <div className="ov-dash-widget ov-dash-mokugyo-widget">
      <div className="ov-dash-widget-header">
        <span className="ov-dash-widget-title">{t('overview.mokugyo.title', { defaultValue: '电子木鱼' })}</span>
        <span className="ov-dash-mokugyo-count">
          {t('overview.mokugyo.total', { defaultValue: '累计功德' })} {meritCount}
        </span>
      </div>
      <div className="ov-dash-mokugyo-body">
        <div className="ov-dash-mokugyo-float-layer" aria-hidden="true">
          {floatingMerits.map((item) => (
            <span
              key={item.id}
              className="ov-dash-mokugyo-float"
              style={{ '--mokugyo-float-dx': `${item.driftX}px` } as React.CSSProperties}
            >
              {t('overview.mokugyo.plusOne', { defaultValue: '功德+1' })}
            </span>
          ))}
        </div>
        <button
          className="ov-dash-mokugyo-hit-btn"
          type="button"
          onClick={handleStrike}
          title={t('overview.mokugyo.strike', { defaultValue: '敲一下' })}
          aria-label={t('overview.mokugyo.strike', { defaultValue: '敲一下' })}
        >
          <img
            src={SvgIcon.MOKUGYO}
            alt=""
            aria-hidden="true"
            className={`ov-dash-mokugyo-icon${hitting ? ' ov-dash-mokugyo-icon--hit' : ''}`}
          />
        </button>
      </div>
    </div>
  );
}

export function SongWidget(): React.ReactElement {
  const { t } = useTranslation();
  const { mediaInfo, coverImage, isPlaying, isMusicPlaying, dominantColor, setExpandTab } = useIslandStore();
  const [r, g, b] = dominantColor;

  return (
    <div className="ov-dash-widget ov-dash-song-widget">
      <div className="ov-dash-widget-header">
        <span className="ov-dash-widget-title ov-dash-widget-title--link" onClick={() => setExpandTab('song')}>{t('overview.song.nowPlaying', { defaultValue: '正在播放' })}</span>
      </div>
      {isMusicPlaying ? (
        <div
          className="ov-dash-song-content"
          style={{ '--song-glow': `rgba(${r}, ${g}, ${b}, 0.35)` } as React.CSSProperties}
        >
          {coverImage && (
            <div
              className="ov-dash-song-bg"
              style={{ backgroundImage: `url(${coverImage})` }}
            />
          )}
          <div className="ov-dash-song-body">
            <div
              className="ov-dash-song-cover"
              style={coverImage ? { backgroundImage: `url(${coverImage})` } : undefined}
            />
            <div className="ov-dash-song-info">
              <div className="ov-dash-song-title">{mediaInfo.title || t('overview.song.unknownTitle', { defaultValue: '未知歌曲' })}</div>
              <div className="ov-dash-song-artist">{mediaInfo.artist || t('overview.song.unknownArtist', { defaultValue: '未知艺术家' })}</div>
              {mediaInfo.album && <div className="ov-dash-song-album">{mediaInfo.album}</div>}
            </div>
          </div>
          <div className="ov-dash-song-controls">
            <button className="ov-dash-song-btn" onClick={() => window.api.mediaPrev()} type="button" title={t('overview.song.prev', { defaultValue: '上一首' })}>
              <img src={SvgIcon.PREVIOUS_SONG} alt={t('overview.song.prev', { defaultValue: '上一首' })} className="ov-dash-song-btn-icon ov-dash-song-btn-icon--sm" />
            </button>
            <button className="ov-dash-song-btn ov-dash-song-btn-play" onClick={() => window.api.mediaPlayPause()} type="button" title={isPlaying ? t('overview.song.pause', { defaultValue: '暂停' }) : t('overview.song.play', { defaultValue: '播放' })}>
              {isPlaying ? (
                <img src={SvgIcon.PAUSE} alt={t('overview.song.pause', { defaultValue: '暂停' })} className="ov-dash-song-btn-icon" />
              ) : (
                <img src={SvgIcon.CONTINUE} alt={t('overview.song.play', { defaultValue: '播放' })} className="ov-dash-song-btn-icon" />
              )}
            </button>
            <button className="ov-dash-song-btn" onClick={() => window.api.mediaNext()} type="button" title={t('overview.song.next', { defaultValue: '下一首' })}>
              <img src={SvgIcon.NEXT_SONG} alt={t('overview.song.next', { defaultValue: '下一首' })} className="ov-dash-song-btn-icon ov-dash-song-btn-icon--sm" />
            </button>
          </div>
        </div>
      ) : (
        <div className="ov-dash-song-empty">{t('overview.song.empty', { defaultValue: '暂无播放中的歌曲' })}</div>
      )}
    </div>
  );
}

export function CountdownWidget({
  openTargetPage,
}: {
  openTargetPage: (target: 'todo' | 'countdown' | 'settings') => void;
}): React.ReactElement {
  const { t } = useTranslation();
  const [cdItems, setCdItems] = useState<CountdownDateItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    const applyCountdownData = (data: unknown): void => {
      if (!Array.isArray(data)) return;
      setCdItems(data as CountdownDateItem[]);
    };

    window.api.storeRead('countdown-dates').then((data) => {
      if (cancelled) return;
      applyCountdownData(data);
    }).catch(() => {});

    const unsub = window.api.onSettingsChanged((channel: string, value: unknown) => {
      if (cancelled) return;
      if (channel === 'store:countdown-dates') {
        applyCountdownData(value);
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const sorted = [...cdItems].sort((a, b) => {
    const da = Math.abs(cdDiffDays(a.date));
    const db = Math.abs(cdDiffDays(b.date));
    return da - db;
  }).slice(0, 2);

  const goToCountdown = (): void => {
    openTargetPage('countdown');
  };

  return (
    <div className="ov-dash-widget ov-dash-countdown-widget">
      <div className="ov-dash-widget-header">
        <span className="ov-dash-widget-title ov-dash-widget-title--link" onClick={goToCountdown}>{t('overview.countdown.title', { defaultValue: '倒数日' })}</span>
      </div>
      {sorted.length === 0 ? (
        <div className="ov-dash-countdown-empty">{t('overview.countdown.empty', { defaultValue: '暂无倒数日' })}</div>
      ) : (
        <div className={`ov-dash-countdown-cards ${sorted.length === 1 ? 'single' : ''}`}>
          {sorted.map((item) => {
            const days = cdDiffDays(item.date);
            const typeLabel = t(`countdown.types.${item.type}`, { defaultValue: CD_TYPE_LABELS[item.type] || item.type });
            return (
              <div
                key={item.id}
                className={`cd-card cd-card-${item.type} ov-cd-card`}
                style={{ borderColor: item.color }}
              >
                {item.backgroundImage && (
                  <div className="cd-card-bg" style={{ backgroundImage: `url(${item.backgroundImage})`, opacity: item.backgroundOpacity ?? 0.5 }} />
                )}
                <div className="cd-card-overlay" style={{ background: `linear-gradient(135deg, ${item.color}30, ${item.color}10)` }} />
                <div className="cd-card-content">
                  <div className="cd-card-top-row">
                    <span className="cd-card-type-badge" style={{ background: `${item.color}50`, color: '#fff' }}>{typeLabel}</span>
                  </div>
                  <div className="cd-card-name">{item.name}</div>
                  {item.description && <div className="cd-card-desc">{item.description}</div>}
                  <div className="cd-card-bottom">
                    <span className="cd-card-date">{item.date}</span>
                    <span className="cd-card-days" style={{ color: item.color }}>
                      {days > 0
                        ? t('countdown.days.after', { defaultValue: '{{days}} 天后', days })
                        : days === 0
                          ? t('countdown.days.today', { defaultValue: '就是今天' })
                          : t('countdown.days.before', { defaultValue: '{{days}} 天前', days: Math.abs(days) })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

let _pomodoroInitialized = false;
let _pomodoroIntervalId: ReturnType<typeof setInterval> | null = null;
let _prevPomodoroRunning = false;

function persistPomodoro(phase: PomodoroPhase, remaining: number, count: number): void {
  const payload: PomodoroData = { phase, remaining, running: false, completedCount: count };
  window.api.storeWrite(POMODORO_STORE_KEY, payload).catch(() => {});
}

function startPomodoroInterval(): void {
  if (_pomodoroIntervalId !== null) return;
  _pomodoroIntervalId = setInterval(() => {
    const store = useIslandStore.getState();
    const current = store.pomodoroRemaining;
    if (current <= 1) {
      clearInterval(_pomodoroIntervalId!);
      _pomodoroIntervalId = null;
      const finishedPhase = store.pomodoroPhase;
      const { nextPhase, nextCount } = advancePomodoroPhase(store.pomodoroPhase, store.pomodoroCompletedCount);
      const nextRemaining = POMODORO_DURATIONS[nextPhase];
      store.setPomodoroRunning(false);
      store.setPomodoroPhase(nextPhase);
      store.setPomodoroRemaining(nextRemaining);
      store.setPomodoroCompletedCount(nextCount);
      store.setNotification({
        title: i18n.t('notification.pomodoro.title', { defaultValue: '番茄钟' }),
        body: finishedPhase === 'work'
          ? i18n.t('notification.pomodoro.workFinished', { defaultValue: '专注时间结束，开始休息吧' })
          : i18n.t('notification.pomodoro.breakFinished', { defaultValue: '休息时间结束，开始专注吧' }),
        icon: SvgIcon.POMODORO,
      });
      persistPomodoro(nextPhase, nextRemaining, nextCount);
    } else {
      store.setPomodoroRemaining(current - 1);
    }
  }, 1000);
}

function stopPomodoroInterval(): void {
  if (_pomodoroIntervalId !== null) {
    clearInterval(_pomodoroIntervalId);
    _pomodoroIntervalId = null;
  }
}

useIslandStore.subscribe((state) => {
  const running = state.pomodoroRunning;
  if (running === _prevPomodoroRunning) return;
  _prevPomodoroRunning = running;
  if (running) {
    startPomodoroInterval();
  } else {
    stopPomodoroInterval();
  }
});

export function PomodoroWidget(): React.ReactElement {
  const { t } = useTranslation();
  const {
    pomodoroPhase: phase,
    pomodoroRemaining: remaining,
    pomodoroRunning: running,
    pomodoroCompletedCount: completedCount,
    setPomodoroPhase: setPhase,
    setPomodoroRemaining: setRemaining,
    setPomodoroRunning: setRunning,
    setPomodoroCompletedCount: setCompletedCount,
  } = useIslandStore();

  useEffect(() => {
    if (_pomodoroInitialized) return;
    _pomodoroInitialized = true;
    window.api.storeRead(POMODORO_STORE_KEY).then((data) => {
      if (!data) return;
      const d = data as PomodoroData;
      if (d.phase) setPhase(d.phase);
      if (typeof d.remaining === 'number') setRemaining(d.remaining);
      if (typeof d.completedCount === 'number') setCompletedCount(d.completedCount);
    }).catch(() => {});
  }, [setPhase, setRemaining, setCompletedCount]);

  const totalDuration = POMODORO_DURATIONS[phase];
  const progress = 1 - remaining / totalDuration;
  const circumference = 2 * Math.PI * 38;
  const dashOffset = circumference * (1 - progress);

  const handleStartPause = (): void => {
    setRunning(!running);
  };

  const handleReset = (): void => {
    const resetPhase: PomodoroPhase = 'work';
    const resetRemaining = POMODORO_DURATIONS[resetPhase];
    setRunning(false);
    setPhase(resetPhase);
    setRemaining(resetRemaining);
    persistPomodoro(resetPhase, resetRemaining, completedCount);
  };

  const handleResetCount = (): void => {
    const resetPhase: PomodoroPhase = 'work';
    const resetRemaining = POMODORO_DURATIONS[resetPhase];
    setRunning(false);
    setPhase(resetPhase);
    setRemaining(resetRemaining);
    setCompletedCount(0);
    persistPomodoro(resetPhase, resetRemaining, 0);
  };

  const handleSkip = (): void => {
    setRunning(false);
    const { nextPhase, nextCount } = advancePomodoroPhase(phase, completedCount);
    setPhase(nextPhase);
    setCompletedCount(nextCount);
    const nextRemaining = POMODORO_DURATIONS[nextPhase];
    setRemaining(nextRemaining);
    persistPomodoro(nextPhase, nextRemaining, nextCount);
  };

  const phaseColor = phase === 'work' ? '#ff6b6b' : phase === 'shortBreak' ? '#51cf66' : '#339af0';
  const { prev: prevPhase, next: nextPhase } = getPomodoroTimeline(phase, completedCount);

  return (
    <div className="ov-dash-widget ov-dash-pomodoro-widget">
      <div className="ov-dash-widget-header">
        <span className="ov-dash-widget-title">{t('overview.pomodoro.title', { defaultValue: '番茄钟' })}</span>
        <span className="ov-dash-pomodoro-count" title={t('overview.pomodoro.completedTitle', { defaultValue: '已完成番茄数' })}>
          <img src={SvgIcon.POMODORO} alt={t('overview.pomodoro.tomato', { defaultValue: '番茄' })} className="ov-dash-pomodoro-icon" />
          {completedCount}
          {completedCount > 0 && (
            <button className="ov-dash-pomodoro-count-reset" onClick={handleResetCount} type="button" title={t('overview.pomodoro.resetCount', { defaultValue: '重置计数' })}>
              <img src={SvgIcon.REVERT} alt={t('overview.pomodoro.reset', { defaultValue: '重置' })} className="ov-dash-pomodoro-count-reset-icon" />
            </button>
          )}
        </span>
      </div>
      <div className="ov-dash-pomodoro-body">
        <div className="ov-dash-pomodoro-ring-wrap">
          <svg className="ov-dash-pomodoro-ring" viewBox="0 0 84 84">
            <circle className="ov-dash-pomodoro-ring-bg" cx="42" cy="42" r="38" />
            <circle
              className="ov-dash-pomodoro-ring-progress"
              cx="42"
              cy="42"
              r="38"
              style={{ stroke: phaseColor, strokeDasharray: circumference, strokeDashoffset: dashOffset }}
            />
          </svg>
          <div className="ov-dash-pomodoro-ring-inner">
            <div className="ov-dash-pomodoro-time">{fmtPomodoroTime(remaining)}</div>
            <div className="ov-dash-pomodoro-phase" style={{ color: phaseColor }}>{t(`overview.pomodoro.phases.${phase}`, { defaultValue: POMODORO_LABELS[phase] })}</div>
          </div>
        </div>

        <div className="ov-dash-pomodoro-timeline" key={`${phase}-${completedCount}`}>
          <div className={`ov-dash-pomodoro-tl-item${!prevPhase ? ' ov-dash-pomodoro-tl-item--empty' : ''}`}>
            {prevPhase && (
              <>
                <div className="ov-dash-pomodoro-tl-dot" />
                <div className="ov-dash-pomodoro-tl-info">
                  <span className="ov-dash-pomodoro-tl-name">{t(`overview.pomodoro.phases.${prevPhase}`, { defaultValue: POMODORO_LABELS[prevPhase] })}</span>
                  <span className="ov-dash-pomodoro-tl-dur">{POMODORO_DURATIONS[prevPhase] / 60}m</span>
                </div>
              </>
            )}
          </div>
          <div className="ov-dash-pomodoro-tl-item ov-dash-pomodoro-tl-item--current">
            <div className="ov-dash-pomodoro-tl-dot ov-dash-pomodoro-tl-dot--current" style={{ background: phaseColor, boxShadow: `0 0 5px ${phaseColor}99` }} />
            <div className="ov-dash-pomodoro-tl-info">
              <span className="ov-dash-pomodoro-tl-name ov-dash-pomodoro-tl-name--current">{t(`overview.pomodoro.phases.${phase}`, { defaultValue: POMODORO_LABELS[phase] })}</span>
              <span className="ov-dash-pomodoro-tl-dur ov-dash-pomodoro-tl-dur--current" style={{ color: phaseColor }}>{fmtPomodoroTime(remaining)}</span>
            </div>
          </div>
          <div className="ov-dash-pomodoro-tl-item">
            <div className="ov-dash-pomodoro-tl-dot" />
            <div className="ov-dash-pomodoro-tl-info">
              <span className="ov-dash-pomodoro-tl-name">{t(`overview.pomodoro.phases.${nextPhase}`, { defaultValue: POMODORO_LABELS[nextPhase] })}</span>
              <span className="ov-dash-pomodoro-tl-dur">{POMODORO_DURATIONS[nextPhase] / 60}m</span>
            </div>
          </div>
        </div>

        <div className="ov-dash-pomodoro-controls">
          <button className="ov-dash-pomodoro-btn" onClick={handleStartPause} type="button" title={running ? t('overview.pomodoro.pause', { defaultValue: '暂停' }) : t('overview.pomodoro.start', { defaultValue: '开始' })}>
            <img src={running ? SvgIcon.PAUSE : SvgIcon.CONTINUE} alt={running ? t('overview.pomodoro.pause', { defaultValue: '暂停' }) : t('overview.pomodoro.start', { defaultValue: '开始' })} className="ov-dash-pomodoro-btn-icon" />
          </button>
          <button className="ov-dash-pomodoro-btn" onClick={handleReset} type="button" title={t('overview.pomodoro.reset', { defaultValue: '重置' })}>
            <img src={SvgIcon.REVERT} alt={t('overview.pomodoro.reset', { defaultValue: '重置' })} className="ov-dash-pomodoro-btn-icon" />
          </button>
          <button className="ov-dash-pomodoro-btn" onClick={handleSkip} type="button" title={t('overview.pomodoro.skip', { defaultValue: '跳过' })}>
            <img src={SvgIcon.NEXT_SONG} alt={t('overview.pomodoro.skip', { defaultValue: '跳过' })} className="ov-dash-pomodoro-btn-icon" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function UrlFavoritesWidget(): React.ReactElement {
  const { t } = useTranslation();
  const { setMaxExpand, setMaxExpandTab } = useIslandStore();
  const [favorites, setFavorites] = useState<UrlFavoriteItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(URL_FAVORITES_STORE_KEY).then((data) => {
      if (cancelled) return;
      if (Array.isArray(data)) setFavorites(data as UrlFavoriteItem[]);
    }).catch(() => {
      try {
        const raw = localStorage.getItem('eIsland_url_favorites');
        if (raw && !cancelled) setFavorites(JSON.parse(raw) as UrlFavoriteItem[]);
      } catch {
        // noop
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const goToUrlFavorites = (): void => {
    setMaxExpandTab('urlFavorites');
    setMaxExpand();
  };

  const handleOpen = (url: string): void => {
    window.api.clipboardOpenUrl(url).catch(() => {});
  };

  const shown = favorites.slice(0, 5);

  return (
    <div className="ov-dash-widget ov-dash-url-favorites-widget">
      <div className="ov-dash-widget-header">
        <span className="ov-dash-widget-title ov-dash-widget-title--link" onClick={goToUrlFavorites}>{t('overview.urlFavorites.title', { defaultValue: 'URL 收藏' })}</span>
        <span className="ov-dash-url-favorites-count">{t('overview.urlFavorites.count', { defaultValue: '{{count}} 条', count: favorites.length })}</span>
      </div>
      {shown.length === 0 ? (
        <div className="ov-dash-url-favorites-empty">{t('overview.urlFavorites.empty', { defaultValue: '暂无收藏' })}</div>
      ) : (
        <div className="ov-dash-url-favorites-list">
          {shown.map((item) => (
            <div
              key={item.id}
              className="ov-dash-url-favorites-item"
              onClick={() => handleOpen(item.url)}
              title={item.url}
            >
              <img className="ov-dash-url-favorites-favicon" src={getWebsiteFaviconUrl(item.url)} alt="" onError={(e) => { (e.target as HTMLImageElement).src = SvgIcon.LINK; }} />
              <span className="ov-dash-url-favorites-name">
                {item.title && item.title !== item.url ? item.title : item.url}
              </span>
              {item.note && <span className="ov-dash-url-favorites-note">{item.note}</span>}
            </div>
          ))}
          {favorites.length > 5 && (
            <div className="ov-dash-url-favorites-more" onClick={goToUrlFavorites}>
              {t('overview.urlFavorites.viewAll', { defaultValue: '查看全部 {{count}} 条收藏', count: favorites.length })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AlbumCarouselWidget({ openAlbumPage }: { openAlbumPage: () => void }): React.ReactElement {
  const { t } = useTranslation();
  const [items, setItems] = useState<OverviewAlbumItem[]>([]);
  const [albumConfig, setAlbumConfig] = useState<OverviewAlbumCardConfig>(() => normalizeOverviewAlbumCardConfig(null));
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [slideDir, setSlideDir] = useState<'prev' | 'next'>('next');
  const [mediaLoadReady, setMediaLoadReady] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoPosterUrl, setVideoPosterUrl] = useState<string | null>(null);
  const videoPosterCacheRef = useRef<Record<number, string>>({});

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMediaLoadReady(true);
    }, OVERVIEW_ALBUM_MEDIA_LOAD_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const applyItems = (value: unknown): void => {
      const next = normalizeOverviewAlbumItems(value);
      setItems(next);
      setActiveIndex((prev) => {
        if (next.length === 0) return 0;
        return Math.min(prev, next.length - 1);
      });
    };

    window.api.storeRead(PHOTO_ALBUM_STORE_KEY).then((value) => {
      if (cancelled) return;
      applyItems(value);
    }).catch(() => {});

    const unsub = window.api.onSettingsChanged((channel, value) => {
      if (cancelled) return;
      if (channel === `store:${PHOTO_ALBUM_STORE_KEY}`) {
        applyItems(value);
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(OVERVIEW_ALBUM_CONFIG_STORE_KEY).then((value) => {
      if (cancelled) return;
      setAlbumConfig(normalizeOverviewAlbumCardConfig(value));
    }).catch(() => {
      if (cancelled) return;
      setAlbumConfig(normalizeOverviewAlbumCardConfig(null));
    });

    const unsub = window.api.onSettingsChanged((channel, value) => {
      if (cancelled) return;
      if (channel !== `store:${OVERVIEW_ALBUM_CONFIG_STORE_KEY}`) return;
      setAlbumConfig(normalizeOverviewAlbumCardConfig(value));
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const displayItems = items.filter((item) => {
    if (albumConfig.mediaFilter === 'all') return true;
    if (albumConfig.mediaFilter === 'image') return item.mediaType === 'image';
    return item.mediaType === 'video';
  });

  useEffect(() => {
    setActiveIndex((prev) => {
      if (displayItems.length === 0) return 0;
      return Math.min(prev, displayItems.length - 1);
    });
  }, [displayItems.length]);

  const activeItem = displayItems.length > 0 ? displayItems[activeIndex] : null;

  useEffect(() => {
    if (!activeItem || activeItem.mediaType !== 'video') {
      setVideoPosterUrl(null);
      return;
    }
    setVideoPosterUrl(videoPosterCacheRef.current[activeItem.id] || null);
  }, [activeItem?.id, activeItem?.mediaType]);

  useEffect(() => {
    let cancelled = false;
    if (!activeItem) {
      setImagePreviewUrl(null);
      setVideoPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return () => {
        cancelled = true;
      };
    }

    if (activeItem.mediaType === 'image') {
      setVideoPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setVideoPosterUrl(null);
      window.api.loadWallpaperFile(activeItem.path).then((dataUrl) => {
        if (cancelled) return;
        setImagePreviewUrl(dataUrl || null);
      }).catch(() => {
        if (cancelled) return;
        setImagePreviewUrl(null);
      });
      return () => {
        cancelled = true;
      };
    }

    setImagePreviewUrl(null);

    if (!mediaLoadReady) {
      setVideoPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return () => {
        cancelled = true;
      };
    }

    window.api.readLocalFileAsBuffer(activeItem.path).then((buf) => {
      if (cancelled || !buf) return;
      const mime = getOverviewVideoMimeByExt(activeItem.ext);
      const arrayBuffer = new ArrayBuffer(buf.byteLength);
      new Uint8Array(arrayBuffer).set(buf);
      const blob = new Blob([arrayBuffer], { type: mime });
      const nextUrl = URL.createObjectURL(blob);

      if (!videoPosterCacheRef.current[activeItem.id]) {
        const probe = document.createElement('video');
        probe.preload = 'metadata';
        probe.muted = true;
        probe.playsInline = true;
        const cleanupProbe = (): void => {
          probe.src = '';
          probe.load();
        };
        probe.onloadeddata = () => {
          if (cancelled) {
            cleanupProbe();
            return;
          }
          const width = probe.videoWidth;
          const height = probe.videoHeight;
          if (width > 0 && height > 0) {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(probe, 0, 0, width, height);
              const poster = canvas.toDataURL('image/jpeg', 0.86);
              videoPosterCacheRef.current[activeItem.id] = poster;
              setVideoPosterUrl(poster);
            }
          }
          cleanupProbe();
        };
        probe.onerror = () => {
          cleanupProbe();
        };
        probe.src = nextUrl;
      }

      setVideoPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return nextUrl;
      });
    }).catch(() => {
      if (cancelled) return;
      setVideoPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [mediaLoadReady, activeItem?.id, activeItem?.mediaType, activeItem?.path, activeItem?.ext]);

  useEffect(() => {
    return () => {
      setVideoPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, []);

  const hasImagePreview = activeItem?.mediaType === 'image' && Boolean(imagePreviewUrl);
  const hasVideoPreview = activeItem?.mediaType === 'video' && Boolean(videoPreviewUrl);
  const hasVideoPoster = activeItem?.mediaType === 'video' && Boolean(videoPosterUrl);

  const goNext = useCallback(() => {
    setSlideDir('next');
    setActiveIndex((prev) => {
      if (displayItems.length <= 1) return prev;
      if (albumConfig.orderMode === 'random') {
        let next = prev;
        while (next === prev) {
          next = Math.floor(Math.random() * displayItems.length);
        }
        return next;
      }
      return (prev + 1) % displayItems.length;
    });
  }, [displayItems.length, albumConfig.orderMode]);

  const goPrev = useCallback(() => {
    setSlideDir('prev');
    setActiveIndex((prev) => {
      if (displayItems.length <= 1) return prev;
      if (albumConfig.orderMode === 'random') {
        let next = prev;
        while (next === prev) {
          next = Math.floor(Math.random() * displayItems.length);
        }
        return next;
      }
      return (prev - 1 + displayItems.length) % displayItems.length;
    });
  }, [displayItems.length, albumConfig.orderMode]);

  useEffect(() => {
    if (paused || !albumConfig.autoRotate || displayItems.length <= 1) return;
    const timer = setInterval(() => {
      setSlideDir('next');
      setActiveIndex((prev) => {
        if (albumConfig.orderMode === 'random') {
          let next = prev;
          while (next === prev) {
            next = Math.floor(Math.random() * displayItems.length);
          }
          return next;
        }
        return (prev + 1) % displayItems.length;
      });
    }, albumConfig.intervalMs);
    return () => clearInterval(timer);
  }, [paused, albumConfig.autoRotate, albumConfig.orderMode, albumConfig.intervalMs, displayItems.length]);

  const canOpenAlbum = albumConfig.clickBehavior === 'open-album';

  return (
    <div className="ov-dash-widget ov-dash-album-widget">
      <div className="ov-dash-widget-header">
        <span className="ov-dash-widget-title ov-dash-widget-title--link" onClick={openAlbumPage}>{t('overview.album.title', { defaultValue: '相册轮播' })}</span>
      </div>
      {!activeItem ? (
        <div className="ov-dash-album-empty">{t('overview.album.empty', { defaultValue: '相册暂无媒体' })}</div>
      ) : (
        <div
          className="ov-dash-album-card"
          onClick={canOpenAlbum ? openAlbumPage : undefined}
          title={canOpenAlbum ? t('overview.album.open', { defaultValue: '点击进入相册' }) : ''}
        >
          <div className="ov-dash-album-count">{t('overview.album.position', { defaultValue: '{{index}} / {{total}}', index: activeIndex + 1, total: displayItems.length })}</div>
          <div className={`ov-dash-album-media ov-dash-album-media--${slideDir}`} key={`${activeItem.id}-${activeItem.mediaType}`}>
            {hasImagePreview ? (
              <img className="ov-dash-album-preview" src={imagePreviewUrl ?? undefined} alt={activeItem.name} />
            ) : hasVideoPreview ? (
              <video
                className="ov-dash-album-preview ov-dash-album-video"
                src={videoPreviewUrl || undefined}
                poster={videoPosterUrl || undefined}
                muted={albumConfig.videoMuted}
                autoPlay={albumConfig.videoAutoPlay}
                loop
                playsInline
                preload="metadata"
              />
            ) : hasVideoPoster ? (
              <img className="ov-dash-album-preview" src={videoPosterUrl || undefined} alt={activeItem.name} />
            ) : (
              <div className="ov-dash-album-fallback">
                <img src={SvgIcon.PHOTO_ALBUM} alt="" className="ov-dash-album-fallback-icon" />
              </div>
            )}
          </div>
          <div className="ov-dash-album-mask" />
          <div className="ov-dash-album-meta">
            <div className="ov-dash-album-name" title={activeItem.name}>{activeItem.name}</div>
          </div>
          <div className="ov-dash-album-controls" onClick={(e) => e.stopPropagation()}>
            <button className="ov-dash-album-btn" type="button" onClick={goPrev} title={t('overview.album.prev', { defaultValue: '上一张' })}>
              <img src={SvgIcon.PREVIOUS} alt={t('overview.album.prev', { defaultValue: '上一张' })} className="ov-dash-album-btn-icon" />
            </button>
            <button
              className="ov-dash-album-btn ov-dash-album-btn-play"
              type="button"
              onClick={() => {
                if (!albumConfig.autoRotate) return;
                setPaused((v) => !v);
              }}
              disabled={!albumConfig.autoRotate}
              title={paused ? t('overview.album.play', { defaultValue: '继续轮播' }) : t('overview.album.pause', { defaultValue: '暂停轮播' })}
            >
              <img
                src={paused ? SvgIcon.CONTINUE : SvgIcon.PAUSE}
                alt={paused ? t('overview.album.play', { defaultValue: '继续轮播' }) : t('overview.album.pause', { defaultValue: '暂停轮播' })}
                className="ov-dash-album-btn-icon"
              />
            </button>
            <button className="ov-dash-album-btn" type="button" onClick={goNext} title={t('overview.album.next', { defaultValue: '下一张' })}>
              <img src={SvgIcon.NEXT} alt={t('overview.album.next', { defaultValue: '下一张' })} className="ov-dash-album-btn-icon" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ShortcutsWidget({
  apps,
  dragIndex,
  dragOverIndex,
  onOpenApp,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  apps: AppShortcut[];
  dragIndex: number | null;
  dragOverIndex: number | null;
  onOpenApp: (path: string) => void;
  onDragStart: (event: React.DragEvent, index: number) => void;
  onDragOver: (event: React.DragEvent, index: number) => void;
  onDrop: (event: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
}): React.ReactElement {
  const { t } = useTranslation();
  const { setExpandTab } = useIslandStore();

  return (
    <div className="ov-dash-apps-wrap">
      <div className="ov-dash-apps-header">
        <span className="ov-dash-apps-title clickable" onClick={() => setExpandTab('tools')} title={t('overview.shortcuts.editTitle', { defaultValue: '编辑快捷启动' })}>{t('overview.shortcuts.title', { defaultValue: '快捷启动' })}</span>
        <span className="ov-dash-apps-count">{t('overview.shortcuts.count', { defaultValue: '{{count}} 项', count: apps.length })}</span>
      </div>
      <div className="ov-dash-apps">
        {apps.length === 0 && (
          <div className="ov-dash-apps-empty">{t('overview.shortcuts.emptyHint', { defaultValue: '在系统工具中添加' })}</div>
        )}
        {apps.map((app, index) => (
          <div
            key={app.id}
            className={`ov-dash-app-item ${dragOverIndex === index ? 'drag-over' : ''} ${dragIndex === index ? 'dragging' : ''}`}
            onClick={() => onOpenApp(app.path)}
            title={app.name}
            draggable
            onDragStart={(event) => onDragStart(event, index)}
            onDragOver={(event) => onDragOver(event, index)}
            onDrop={(event) => onDrop(event, index)}
            onDragEnd={onDragEnd}
          >
            {app.iconBase64 ? (
              <img className="ov-dash-app-icon" src={`data:image/png;base64,${app.iconBase64}`} alt={app.name} />
            ) : (
              <div className="ov-dash-app-icon-placeholder">📂</div>
            )}
            <span className="ov-dash-app-name">{app.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TodoWidget({
  todos,
  expandedId,
  onOpenTodoPage,
  onToggleExpand,
  onToggleDone,
  onToggleSubDone,
  onRemoveTodo,
}: {
  todos: TodoItem[];
  expandedId: number | null;
  onOpenTodoPage: () => void;
  onToggleExpand: (id: number) => void;
  onToggleDone: (id: number) => void;
  onToggleSubDone: (todoId: number, subId: number) => void;
  onRemoveTodo: (id: number) => void;
}): React.ReactElement {
  const { t } = useTranslation();
  const undoneTodos = todos.filter((todo) => !todo.done);
  const doneTodos = todos.filter((todo) => todo.done);
  const p0Count = todos.filter((todo) => !todo.done && todo.priority === 'P0').length;
  const p1Count = todos.filter((todo) => !todo.done && todo.priority === 'P1').length;
  const p2Count = todos.filter((todo) => !todo.done && todo.priority === 'P2').length;

  return (
    <div className="ov-dash-todo">
      <div className="ov-dash-todo-header">
        <span className="ov-dash-todo-title clickable" onClick={onOpenTodoPage} title={t('overview.todo.goToPage', { defaultValue: '前往待办事项页面' })}>{t('overview.todo.title', { defaultValue: '待办事项' })}</span>
        <div className="ov-dash-todo-stats">
          <span className="ov-dash-todo-stat done">✓ {doneTodos.length}</span>
          <span className="ov-dash-todo-stat undone">○ {undoneTodos.length}</span>
          {p0Count > 0 && <span className="ov-dash-todo-stat p0">P0 {p0Count}</span>}
          {p1Count > 0 && <span className="ov-dash-todo-stat p1">P1 {p1Count}</span>}
          {p2Count > 0 && <span className="ov-dash-todo-stat p2">P2 {p2Count}</span>}
        </div>
      </div>
      <div className="ov-dash-todo-list">
        {todos.length === 0 ? (
          <div className="ov-dash-todo-empty">{t('overview.todo.empty', { defaultValue: '暂无待办' })}</div>
        ) : (
          <>
            {undoneTodos.map((todo) => {
              const isExpanded = expandedId === todo.id;
              const pColor = PRIORITIES.find((p) => p.value === todo.priority)?.color;
              const sColor = SIZES.find((s) => s.value === todo.size)?.color;
              return (
                <div
                  key={todo.id}
                  className={`ov-dash-todo-item ${isExpanded ? 'expanded' : ''}`}
                >
                  <div className="ov-dash-todo-row" onClick={() => onToggleExpand(todo.id)}>
                    <button
                      className="ov-dash-todo-check"
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleDone(todo.id);
                      }}
                    >
                      ○
                    </button>
                    {todo.priority && (
                      <span className="ov-dash-todo-priority" style={{ background: pColor }}>
                        {todo.priority}
                      </span>
                    )}
                    {todo.size && (
                      <span className="ov-dash-todo-size" style={{ background: sColor }}>
                        {todo.size}
                      </span>
                    )}
                    <span className="ov-dash-todo-text">{todo.text}</span>
                    {(todo.description || (todo.subTodos && todo.subTodos.length > 0)) && (
                      <span className={`ov-dash-todo-arrow ${isExpanded ? 'open' : ''}`}>›</span>
                    )}
                    <button
                      className="ov-dash-todo-delete"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRemoveTodo(todo.id);
                      }}
                      aria-label={t('overview.todo.delete', { defaultValue: '删除' })}
                    >
                      ×
                    </button>
                  </div>
                  {isExpanded && todo.description && (
                    <div className="ov-dash-todo-desc">{todo.description}</div>
                  )}
                  {isExpanded && todo.subTodos && todo.subTodos.length > 0 && (
                    <div className="ov-dash-todo-subs">
                      {todo.subTodos.map((sub) => (
                        <div key={sub.id} className={`ov-dash-todo-sub ${sub.done ? 'done' : ''}`}>
                          <button
                            className="ov-dash-todo-sub-check"
                            onClick={() => onToggleSubDone(todo.id, sub.id)}
                          >
                            {sub.done ? '✓' : '○'}
                          </button>
                          {sub.priority && (
                            <span className="ov-dash-todo-priority" style={{ background: PRIORITIES.find((p) => p.value === sub.priority)?.color }}>
                              {sub.priority}
                            </span>
                          )}
                          {sub.size && (
                            <span className="ov-dash-todo-size" style={{ background: SIZES.find((s) => s.value === sub.size)?.color }}>
                              {sub.size}
                            </span>
                          )}
                          <span className="ov-dash-todo-sub-text">{sub.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {doneTodos.length > 0 && (
              <>
                <div className="ov-dash-todo-divider">{t('overview.todo.completed', { defaultValue: '已完成 {{count}}', count: doneTodos.length })}</div>
                {doneTodos.map((todo) => (
                  <div key={todo.id} className="ov-dash-todo-item done">
                    <div className="ov-dash-todo-row">
                      <button
                        className="ov-dash-todo-check"
                        onClick={() => onToggleDone(todo.id)}
                      >
                        ✓
                      </button>
                      <span className="ov-dash-todo-text">{todo.text}</span>
                      <button
                        className="ov-dash-todo-delete"
                        onClick={(event) => {
                          event.stopPropagation();
                          onRemoveTodo(todo.id);
                        }}
                        aria-label={t('overview.todo.delete', { defaultValue: '删除' })}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
