import { useEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { BUILTIN_WALLPAPERS } from '../../../../../../../../assets/wallpaper/builtinWallpapers';
import type { AppSettingsSectionProps } from './types';

type ThemeSettingsPageProps = Pick<
  AppSettingsSectionProps,
  | 'themeMode'
  | 'setThemeModeState'
  | 'applyThemeMode'
  | 'bgMediaType'
  | 'bgMediaPreviewUrl'
  | 'bgVideoFit'
  | 'setBgVideoFit'
  | 'bgVideoMuted'
  | 'setBgVideoMuted'
  | 'bgVideoLoop'
  | 'setBgVideoLoop'
  | 'bgVideoVolume'
  | 'setBgVideoVolume'
  | 'bgVideoRate'
  | 'setBgVideoRate'
  | 'bgVideoHwDecode'
  | 'setBgVideoHwDecode'
  | 'bgImageOpacity'
  | 'bgImageBlur'
  | 'setBgImageOpacity'
  | 'setBgImageBlur'
  | 'applyBgOpacity'
  | 'applyBgBlur'
  | 'applyBgVideoFit'
  | 'applyBgVideoMuted'
  | 'applyBgVideoLoop'
  | 'applyBgVideoVolume'
  | 'applyBgVideoRate'
  | 'applyBgVideoHwDecode'
  | 'persistBgOpacity'
  | 'persistBgBlur'
  | 'persistBgVideoFit'
  | 'persistBgVideoMuted'
  | 'persistBgVideoLoop'
  | 'persistBgVideoVolume'
  | 'persistBgVideoRate'
  | 'persistBgVideoHwDecode'
  | 'bgOpacitySaveTimerRef'
  | 'bgBlurSaveTimerRef'
  | 'handleSelectBgImage'
  | 'handleSelectBgVideo'
  | 'handleClearBgImage'
  | 'handleSelectBuiltinBgImage'
  | 'islandOpacity'
  | 'setIslandOpacity'
  | 'applyIslandOpacity'
  | 'persistIslandOpacity'
  | 'opacitySaveTimerRef'
>;

export function ThemeSettingsPage(props: ThemeSettingsPageProps): ReactElement {
  const { t } = useTranslation();
  const {
    themeMode,
    setThemeModeState,
    applyThemeMode,
    bgMediaType,
    bgMediaPreviewUrl,
    bgVideoFit,
    setBgVideoFit,
    bgVideoMuted,
    setBgVideoMuted,
    bgVideoLoop,
    setBgVideoLoop,
    bgVideoVolume,
    setBgVideoVolume,
    bgVideoRate,
    setBgVideoRate,
    bgVideoHwDecode,
    setBgVideoHwDecode,
    bgImageOpacity,
    bgImageBlur,
    setBgImageOpacity,
    setBgImageBlur,
    applyBgOpacity,
    applyBgBlur,
    applyBgVideoFit,
    applyBgVideoMuted,
    applyBgVideoLoop,
    applyBgVideoVolume,
    applyBgVideoRate,
    applyBgVideoHwDecode,
    persistBgOpacity,
    persistBgBlur,
    persistBgVideoFit,
    persistBgVideoMuted,
    persistBgVideoLoop,
    persistBgVideoVolume,
    persistBgVideoRate,
    persistBgVideoHwDecode,
    bgOpacitySaveTimerRef,
    bgBlurSaveTimerRef,
    handleSelectBgImage,
    handleSelectBgVideo,
    handleClearBgImage,
    handleSelectBuiltinBgImage,
    islandOpacity,
    setIslandOpacity,
    applyIslandOpacity,
    persistIslandOpacity,
    opacitySaveTimerRef,
  } = props;

  const bgPreviewVideoRef = useRef<HTMLVideoElement | null>(null);
  const bgPreviewVideoLoopRef = useRef<boolean>(bgVideoLoop);

  useEffect(() => {
    bgPreviewVideoLoopRef.current = bgVideoLoop;
  }, [bgVideoLoop]);

  useEffect(() => {
    const el = bgPreviewVideoRef.current;
    if (!el) return;
    el.volume = Math.max(0, Math.min(1, bgVideoVolume));
    el.playbackRate = Math.max(0.25, Math.min(3, bgVideoRate));
  }, [bgVideoVolume, bgVideoRate]);

  useEffect(() => {
    if (bgMediaType !== 'video' || !bgMediaPreviewUrl) return;
    const el = bgPreviewVideoRef.current;
    if (!el) return;
    el.loop = false;

    const restart = (): void => {
      if (!bgPreviewVideoLoopRef.current) return;
      try {
        el.currentTime = 0;
      } catch {
        // noop
      }
      el.play().catch(() => {});
    };

    const onEnded = (): void => {
      restart();
    };

    const onTimeUpdate = (): void => {
      if (!bgPreviewVideoLoopRef.current) return;
      const duration = el.duration;
      if (!Number.isFinite(duration) || duration <= 0) return;
      if (duration - el.currentTime <= 0.12) {
        restart();
      }
    };

    el.addEventListener('ended', onEnded);
    el.addEventListener('timeupdate', onTimeUpdate);
    return () => {
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [bgMediaType, bgMediaPreviewUrl]);

  useEffect(() => {
    if (!bgVideoLoop) return;
    const el = bgPreviewVideoRef.current;
    if (!el) return;
    if (el.ended) {
      try {
        el.currentTime = 0;
      } catch {
        // noop
      }
      el.play().catch(() => {});
    }
  }, [bgVideoLoop]);

  return (
    <div className="max-expand-settings-section">
      <div className="settings-cards">
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.theme.title', { defaultValue: '主题模式' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.theme.hint', { defaultValue: '选择深色、浅色或跟随系统主题，切换后立即生效' })}</div>
          </div>
          <div className="settings-lyrics-source-options">
            {([
              { value: 'dark', label: t('settings.app.theme.dark', { defaultValue: '深色模式' }) },
              { value: 'light', label: t('settings.app.theme.light', { defaultValue: '浅色模式' }) },
              { value: 'system', label: t('settings.app.theme.system', { defaultValue: '跟随系统' }) },
            ] as Array<{ value: 'dark' | 'light' | 'system'; label: string }>).map((opt) => (
              <button
                key={opt.value}
                className={`settings-lyrics-source-btn ${themeMode === opt.value ? 'active' : ''}`}
                type="button"
                onClick={() => {
                  setThemeModeState(opt.value);
                  applyThemeMode(opt.value).catch(() => {});
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.theme.bgCardTitle', { defaultValue: '壁纸背景' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.theme.bgCardSubtitle', { defaultValue: '选择内置壁纸，或从本地导入图片 / 视频作为灵动岛背景' })}</div>
          </div>

          <div className="settings-card-subgroup">
            <div className="settings-card-subgroup-title">{t('settings.app.theme.builtinWallpaper', { defaultValue: '内置壁纸' })}</div>
            <div className="settings-music-hint">{t('settings.app.theme.builtinWallpaperHint', { defaultValue: '选择一张内置壁纸作为灵动岛背景' })}</div>
            <div className="settings-bg-gallery">
              {BUILTIN_WALLPAPERS.map((wp) => (
                <button
                  key={wp.id}
                  className={`settings-bg-gallery-item ${bgMediaType === 'image' && bgMediaPreviewUrl === wp.src ? 'active' : ''}`}
                  type="button"
                  onClick={() => handleSelectBuiltinBgImage(wp.src, wp.defaultOpacity)}
                  title={`${wp.name}（默认透明度 ${wp.defaultOpacity}%）`}
                >
                  <img src={wp.src} alt={wp.name} className="settings-bg-gallery-img" />
                  <span className="settings-bg-gallery-name">{wp.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="settings-card-subgroup">
            <div className="settings-card-subgroup-title">{t('settings.app.theme.customImage', { defaultValue: '自定义图片' })}</div>
            <div className="settings-music-hint">{t('settings.app.theme.customImageHint', { defaultValue: '从本地选择图片，支持 jpg / png / gif / webp' })}</div>
            <div className="settings-hotkey-row" style={{ gap: 8, alignItems: 'center' }}>
              <button className="settings-hotkey-btn" type="button" onClick={() => { handleSelectBgImage().catch(() => {}); }}>
                {bgMediaType === 'image' && bgMediaPreviewUrl
                  ? t('settings.app.theme.changeImage', { defaultValue: '更换图片' })
                  : t('settings.app.theme.selectImage', { defaultValue: '选择图片' })}
              </button>
              {(bgMediaType === 'image' || bgMediaType === 'video') && (
                <button className="settings-hotkey-btn" type="button" onClick={handleClearBgImage}>
                  {t('settings.app.theme.clearBackground', { defaultValue: '清除背景' })}
                </button>
              )}
            </div>
          </div>

          <div className="settings-card-subgroup">
            <div className="settings-card-subgroup-title">{t('settings.app.theme.customVideo', { defaultValue: '自定义视频' })}</div>
            <div className="settings-music-hint">{t('settings.app.theme.customVideoHint', { defaultValue: '从本地选择视频，支持 mp4 / webm / mov / m4v / avi / mkv' })}</div>
            <div className="settings-hotkey-row" style={{ gap: 8, alignItems: 'center' }}>
              <button className="settings-hotkey-btn" type="button" onClick={() => { handleSelectBgVideo().catch(() => {}); }}>
                {bgMediaType === 'video' && bgMediaPreviewUrl
                  ? t('settings.app.theme.changeVideo', { defaultValue: '更换视频' })
                  : t('settings.app.theme.selectVideo', { defaultValue: '选择视频' })}
              </button>
              {(bgMediaType === 'image' || bgMediaType === 'video') && (
                <button className="settings-hotkey-btn" type="button" onClick={handleClearBgImage}>
                  {t('settings.app.theme.clearBackground', { defaultValue: '清除背景' })}
                </button>
              )}
            </div>
          </div>

          {bgMediaType && bgMediaPreviewUrl && (
            <div className="settings-card-subgroup">
              <div className="settings-card-subgroup-title">{t('settings.app.theme.previewLabel', { defaultValue: '实时预览' })}</div>
              <div className="settings-bg-preview">
                {bgMediaType === 'video' ? (
                  <video
                    key={bgMediaPreviewUrl}
                    ref={bgPreviewVideoRef}
                    src={bgMediaPreviewUrl}
                    className="settings-bg-preview-img"
                    autoPlay
                    muted={bgVideoMuted || bgVideoVolume <= 0}
                    playsInline
                    preload="auto"
                    style={{ objectFit: bgVideoFit }}
                    onLoadedMetadata={(event) => {
                      event.currentTarget.loop = false;
                      event.currentTarget.volume = Math.max(0, Math.min(1, bgVideoVolume));
                      event.currentTarget.playbackRate = Math.max(0.25, Math.min(3, bgVideoRate));
                    }}
                    onCanPlay={(event) => {
                      event.currentTarget.loop = false;
                      event.currentTarget.volume = Math.max(0, Math.min(1, bgVideoVolume));
                      event.currentTarget.playbackRate = Math.max(0.25, Math.min(3, bgVideoRate));
                      event.currentTarget.play().catch(() => {});
                    }}
                  />
                ) : (
                  <img src={bgMediaPreviewUrl} alt={t('settings.app.theme.previewAlt', { defaultValue: '背景预览' })} className="settings-bg-preview-img" />
                )}
              </div>
            </div>
          )}
        </div>

        {bgMediaType && bgMediaPreviewUrl && (
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-title">{t('settings.app.theme.effectCardTitle', { defaultValue: '背景显示效果' })}</div>
              <div className="settings-card-subtitle">{t('settings.app.theme.effectCardSubtitle', { defaultValue: '调整背景的透明度与模糊度' })}</div>
            </div>

            <div className="settings-card-subgroup">
              <div className="settings-card-subgroup-title">{t('settings.app.theme.opacityTitle', { defaultValue: '背景透明度' })}</div>
              <div className="settings-music-hint">{t('settings.app.theme.imageOpacityHint', { defaultValue: '背景图片透明度（0% - 100%），数值越高图片越明显' })}</div>
              <div className="settings-opacity-slider-row">
                <input
                  className="settings-opacity-slider"
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={bgImageOpacity}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    const safe = Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : 30;
                    setBgImageOpacity(safe);
                    applyBgOpacity(safe);
                    window.api.settingsPreview('store:island-bg-opacity', safe).catch(() => {});
                    if (bgOpacitySaveTimerRef.current) {
                      clearTimeout(bgOpacitySaveTimerRef.current);
                    }
                    bgOpacitySaveTimerRef.current = setTimeout(() => {
                      persistBgOpacity(safe);
                      bgOpacitySaveTimerRef.current = null;
                    }, 220);
                  }}
                  onBlur={() => {
                    if (bgOpacitySaveTimerRef.current) {
                      clearTimeout(bgOpacitySaveTimerRef.current);
                      bgOpacitySaveTimerRef.current = null;
                    }
                    persistBgOpacity(bgImageOpacity);
                  }}
                />
                <span className="settings-opacity-slider-value">{bgImageOpacity}%</span>
              </div>
            </div>

            <div className="settings-card-subgroup">
              <div className="settings-card-subgroup-title">{t('settings.app.theme.blurTitle', { defaultValue: '背景模糊度' })}</div>
              <div className="settings-music-hint">{t('settings.app.theme.imageBlurHint', { defaultValue: '背景图片模糊度（0px - 20px），数值越高越模糊' })}</div>
              <div className="settings-opacity-slider-row">
                <input
                  className="settings-opacity-slider"
                  type="range"
                  min={0}
                  max={20}
                  step={1}
                  value={bgImageBlur}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    const safe = Number.isFinite(v) ? Math.max(0, Math.min(20, Math.round(v))) : 0;
                    setBgImageBlur(safe);
                    applyBgBlur(safe);
                    window.api.settingsPreview('store:island-bg-blur', safe).catch(() => {});
                    if (bgBlurSaveTimerRef.current) {
                      clearTimeout(bgBlurSaveTimerRef.current);
                    }
                    bgBlurSaveTimerRef.current = setTimeout(() => {
                      persistBgBlur(safe);
                      bgBlurSaveTimerRef.current = null;
                    }, 220);
                  }}
                  onBlur={() => {
                    if (bgBlurSaveTimerRef.current) {
                      clearTimeout(bgBlurSaveTimerRef.current);
                      bgBlurSaveTimerRef.current = null;
                    }
                    persistBgBlur(bgImageBlur);
                  }}
                />
                <span className="settings-opacity-slider-value">{bgImageBlur}px</span>
              </div>
            </div>
          </div>
        )}

        {bgMediaType === 'video' && bgMediaPreviewUrl && (
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-title">{t('settings.app.theme.videoCardTitle', { defaultValue: '视频播放' })}</div>
              <div className="settings-card-subtitle">{t('settings.app.theme.videoCardSubtitle', { defaultValue: '背景视频的填充、声音与播放控制' })}</div>
            </div>

            <div className="settings-card-subgroup">
              <div className="settings-card-subgroup-title">{t('settings.app.theme.videoFitHint', { defaultValue: '视频填充模式' })}</div>
              <div className="settings-lyrics-source-options">
                {([
                  { value: 'cover', label: t('settings.app.theme.videoFitCover', { defaultValue: '覆盖（裁切）' }) },
                  { value: 'contain', label: t('settings.app.theme.videoFitContain', { defaultValue: '完整（留边）' }) },
                ] as Array<{ value: 'cover' | 'contain'; label: string }>).map((opt) => (
                  <button
                    key={opt.value}
                    className={`settings-lyrics-source-btn ${bgVideoFit === opt.value ? 'active' : ''}`}
                    type="button"
                    onClick={() => {
                      setBgVideoFit(opt.value);
                      applyBgVideoFit(opt.value);
                      persistBgVideoFit(opt.value);
                      window.api.settingsPreview('store:island-bg-video-fit', opt.value).catch(() => {});
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-card-subgroup">
              <div className="settings-card-subgroup-title">{t('settings.app.theme.videoAudioTitle', { defaultValue: '声音与循环' })}</div>
              <div className="settings-card-inline-row">
                <label className="settings-card-check">
                  <input
                    type="checkbox"
                    checked={bgVideoMuted}
                    onChange={(event) => {
                      const next = event.target.checked;
                      setBgVideoMuted(next);
                      applyBgVideoMuted(next);
                      persistBgVideoMuted(next);
                      window.api.settingsPreview('store:island-bg-video-muted', next).catch(() => {});
                    }}
                  />
                  {t('settings.app.theme.videoMutedToggle', { defaultValue: '静音播放视频' })}
                </label>
                <label className="settings-card-check">
                  <input
                    type="checkbox"
                    checked={bgVideoLoop}
                    onChange={(event) => {
                      const next = event.target.checked;
                      setBgVideoLoop(next);
                      applyBgVideoLoop(next);
                      persistBgVideoLoop(next);
                      window.api.settingsPreview('store:island-bg-video-loop', next).catch(() => {});
                    }}
                  />
                  {t('settings.app.theme.videoLoopToggle', { defaultValue: '循环播放视频' })}
                </label>
              </div>
              <div className="settings-music-hint" style={{ marginTop: 4 }}>
                {t('settings.app.theme.videoVolumeHint', { defaultValue: '背景视频音量（0 - 100%），取消静音后生效' })}
              </div>
              <div className="settings-opacity-slider-row">
                <input
                  className="settings-opacity-slider"
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(bgVideoVolume * 100)}
                  onChange={(event) => {
                    const raw = Number(event.target.value);
                    const safe = Number.isFinite(raw) ? Math.max(0, Math.min(1, raw / 100)) : 0.6;
                    setBgVideoVolume(safe);
                    applyBgVideoVolume(safe);
                    persistBgVideoVolume(safe);
                    window.api.settingsPreview('store:island-bg-video-volume', safe).catch(() => {});
                  }}
                />
                <span className="settings-opacity-slider-value">{Math.round(bgVideoVolume * 100)}%</span>
              </div>
            </div>

            <div className="settings-card-subgroup">
              <div className="settings-card-subgroup-title">{t('settings.app.theme.videoRateHint', { defaultValue: '播放速度' })}</div>
              <div className="settings-lyrics-source-options">
                {([
                  { value: 0.5, label: '0.5x' },
                  { value: 0.75, label: '0.75x' },
                  { value: 1, label: '1.0x' },
                  { value: 1.25, label: '1.25x' },
                  { value: 1.5, label: '1.5x' },
                  { value: 2, label: '2.0x' },
                ] as Array<{ value: number; label: string }>).map((opt) => (
                  <button
                    key={opt.value}
                    className={`settings-lyrics-source-btn ${Math.abs(bgVideoRate - opt.value) < 1e-3 ? 'active' : ''}`}
                    type="button"
                    onClick={() => {
                      const safe = Math.max(0.25, Math.min(3, opt.value));
                      setBgVideoRate(safe);
                      applyBgVideoRate(safe);
                      persistBgVideoRate(safe);
                      window.api.settingsPreview('store:island-bg-video-rate', safe).catch(() => {});
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-card-subgroup">
              <div className="settings-card-subgroup-title">{t('settings.app.theme.videoPerfTitle', { defaultValue: '性能' })}</div>
              <div className="settings-card-inline-row">
                <label className="settings-card-check">
                  <input
                    type="checkbox"
                    checked={bgVideoHwDecode}
                    onChange={(event) => {
                      const next = event.target.checked;
                      setBgVideoHwDecode(next);
                      applyBgVideoHwDecode(next);
                      persistBgVideoHwDecode(next);
                      window.api.settingsPreview('store:island-bg-video-hw-decode', next).catch(() => {});
                    }}
                  />
                  {t('settings.app.theme.videoHwDecodeToggle', { defaultValue: '启用硬件解码（重启后生效）' })}
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.theme.islandOpacityTitle', { defaultValue: '灵动岛透明度' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.theme.islandOpacityHint', { defaultValue: '数值越低越透明（10% - 100%），调整后立即生效' })}</div>
          </div>
          <div className="settings-opacity-slider-row">
            <input
              className="settings-opacity-slider"
              type="range"
              min={10}
              max={100}
              step={1}
              value={islandOpacity}
              onChange={(e) => {
                const v = Number(e.target.value);
                const safe = Number.isFinite(v) ? Math.max(10, Math.min(100, Math.round(v))) : 100;
                setIslandOpacity(safe);
                applyIslandOpacity(safe);
                window.api.settingsPreview('island:opacity', safe).catch(() => {});
                if (opacitySaveTimerRef.current) {
                  clearTimeout(opacitySaveTimerRef.current);
                }
                opacitySaveTimerRef.current = setTimeout(() => {
                  persistIslandOpacity(safe);
                  opacitySaveTimerRef.current = null;
                }, 220);
              }}
              onBlur={() => {
                if (opacitySaveTimerRef.current) {
                  clearTimeout(opacitySaveTimerRef.current);
                  opacitySaveTimerRef.current = null;
                }
                persistIslandOpacity(islandOpacity);
              }}
            />
            <span className="settings-opacity-slider-value">{islandOpacity}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
