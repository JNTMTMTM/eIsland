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
 * @file ThemeSettingsPage.tsx
 * @description 设置页面 - 软件设置主题与背景子界面
 * @author 鸡哥
 */

import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { BUILTIN_WALLPAPERS } from '../../../../../../../../assets/wallpaper/builtinWallpapers';
import useIslandStore from '../../../../../../../../store/slices';
import { SvgIcon } from '../../../../../../../../utils/SvgIcon';
import { injectFontFace } from '../../../../../../../../utils/font';
import type { AppSettingsSectionProps } from './types';

type ThemeSettingsPageProps = Pick<
  AppSettingsSectionProps,
  | 'themeMode'
  | 'setThemeModeState'
  | 'applyThemeMode'
  | 'standaloneMacControls'
  | 'setStandaloneMacControls'
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
  | 'syncDesktopWallpaperOnBackgroundChange'
  | 'setSyncDesktopWallpaperOnBackgroundChange'
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
  | 'autoDimEnabled'
  | 'handleAutoDimEnabledChange'
  | 'autoDimDelaySec'
  | 'handleAutoDimDelayChange'
>;

const MUSIC_OUTER_GLOW_EFFECT_STORE_KEY = 'music-outer-glow-effect-enabled';
const UI_FONT_STORE_KEY = 'ui-font-family';
const LYRICS_FONT_STORE_KEY = 'lyrics-font-family';
const UI_CUSTOM_FONTS_STORE_KEY = 'ui-custom-fonts';
const LYRICS_CUSTOM_FONTS_STORE_KEY = 'lyrics-custom-fonts';

/** 字体预设列表（label 为 i18n key） */
const FONT_PRESETS = [
  { value: 'default', i18nKey: 'settings.app.theme.fontDefault', css: "'Microsoft YaHei', 'PingFang SC', -apple-system, sans-serif" },
  { value: 'microsoft-yahei', i18nKey: 'settings.app.theme.fontMicrosoftYahei', css: "'Microsoft YaHei', sans-serif" },
  { value: 'simhei', i18nKey: 'settings.app.theme.fontSimhei', css: "'SimHei', sans-serif" },
  { value: 'simsun', i18nKey: 'settings.app.theme.fontSimsun', css: "'SimSun', serif" },
  { value: 'kaiti', i18nKey: 'settings.app.theme.fontKaiti', css: "'KaiTi', serif" },
  { value: 'fangsong', i18nKey: 'settings.app.theme.fontFangsong', css: "'FangSong', serif" },
  { value: 'cascadia-code', i18nKey: 'settings.app.theme.fontCascadiaCode', css: "'Cascadia Code', 'JetBrains Mono', Consolas, monospace" },
  { value: 'jetbrains-mono', i18nKey: 'settings.app.theme.fontJetbrainsMono', css: "'JetBrains Mono', 'Cascadia Code', Consolas, monospace" },
  { value: 'consolas', i18nKey: 'settings.app.theme.fontConsolas', css: "Consolas, 'Courier New', monospace" },
] as const;

/** 自定义字体条目 */
interface CustomFont {
  name: string;
  path: string;
}


/**
 * 渲染软件主题与背景设置页面
 * @param props - 主题与背景设置所需状态与操作集合
 * @returns 主题与背景设置页面
 */
export function ThemeSettingsPage({
  themeMode,
  setThemeModeState,
  applyThemeMode,
  standaloneMacControls,
  setStandaloneMacControls,
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
  syncDesktopWallpaperOnBackgroundChange,
  setSyncDesktopWallpaperOnBackgroundChange,
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
  autoDimEnabled,
  handleAutoDimEnabledChange,
  autoDimDelaySec,
  handleAutoDimDelayChange,
}: ThemeSettingsPageProps): ReactElement {
  const { t } = useTranslation();
  const setNotification = useIslandStore((s) => s.setNotification);
  const [musicOuterGlowEffectEnabled, setMusicOuterGlowEffectEnabled] = useState<boolean>(true);
  const [uiFont, setUIFont] = useState<string>('default');
  const [lyricsFont, setLyricsFont] = useState<string>('default');
  const [uiCustomFonts, setUiCustomFonts] = useState<CustomFont[]>([]);
  const [lyricsCustomFonts, setLyricsCustomFonts] = useState<CustomFont[]>([]);

  const bgPreviewVideoRef = useRef<HTMLVideoElement | null>(null);
  const bgPreviewVideoLoopRef = useRef<boolean>(bgVideoLoop);

  useEffect(() => {
    bgPreviewVideoLoopRef.current = bgVideoLoop;
  }, [bgVideoLoop]);

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(MUSIC_OUTER_GLOW_EFFECT_STORE_KEY).then((value) => {
      if (cancelled) return;
      if (typeof value === 'boolean') {
        setMusicOuterGlowEffectEnabled(value);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  /** 同步字体设置到 UI 状态（CSS 变量已在启动时由 initFonts 应用） */
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      window.api.storeRead(UI_FONT_STORE_KEY),
      window.api.storeRead(LYRICS_FONT_STORE_KEY),
      window.api.storeRead(UI_CUSTOM_FONTS_STORE_KEY),
      window.api.storeRead(LYRICS_CUSTOM_FONTS_STORE_KEY),
    ]).then(([uiVal, lyricsVal, uiCustom, lyricsCustom]) => {
      if (cancelled) return;
      if (typeof uiVal === 'string') setUIFont(uiVal);
      if (typeof lyricsVal === 'string') setLyricsFont(lyricsVal);
      if (Array.isArray(uiCustom)) setUiCustomFonts(uiCustom as CustomFont[]);
      if (Array.isArray(lyricsCustom)) setLyricsCustomFonts(lyricsCustom as CustomFont[]);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

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
            <div className="settings-card-subtitle">{t('settings.app.theme.hint', { defaultValue: '选择深色、浅色或跟随系统主题' })}</div>
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

          <div className="settings-card-subgroup" style={{ marginTop: 10 }}>
            <div className="settings-card-subgroup-title">{t('settings.app.theme.musicOuterGlowTitle', { defaultValue: '音乐外光圈特效' })}</div>
            <div className="settings-music-hint">{t('settings.app.theme.musicOuterGlowHint', { defaultValue: '控制歌曲播放时专辑封面外圈的跑马灯/光晕动态效果。' })}</div>
            <div className="settings-card-inline-row">
              <label className="settings-card-check">
                <input
                  type="checkbox"
                  checked={musicOuterGlowEffectEnabled}
                  onChange={(event) => {
                    const next = event.target.checked;
                    setMusicOuterGlowEffectEnabled(next);
                    window.api.storeWrite(MUSIC_OUTER_GLOW_EFFECT_STORE_KEY, next).catch(() => {});
                    window.api.settingsPreview(`store:${MUSIC_OUTER_GLOW_EFFECT_STORE_KEY}`, next).catch(() => {});
                    window.dispatchEvent(new CustomEvent('music-outer-glow-effect-changed', { detail: next }));
                  }}
                />
                {t('settings.app.theme.musicOuterGlowToggle', { defaultValue: '启用歌曲播放外光圈跑马灯特效' })}
              </label>
            </div>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.theme.uiFontTitle', { defaultValue: '界面字体' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.theme.uiFontHint', { defaultValue: '选择灵动岛界面使用的字体' })}</div>
          </div>
          <div className="settings-lyrics-source-options">
            {FONT_PRESETS.map((font) => (
              <button
                key={font.value}
                className={`settings-lyrics-source-btn ${uiFont === font.value ? 'active' : ''}`}
                type="button"
                onClick={() => {
                  setUIFont(font.value);
                  document.documentElement.style.setProperty('--island-ui-font', font.css);
                  window.api.storeWrite(UI_FONT_STORE_KEY, font.value).catch(() => {});
                }}
              >
                {t(font.i18nKey)}
              </button>
            ))}
            {uiCustomFonts.map((font) => (
              <button
                key={font.path}
                className={`settings-lyrics-source-btn ${uiFont === `custom:${font.path}` ? 'active' : ''}`}
                type="button"
                onClick={() => {
                  const key = `custom:${font.path}`;
                  setUIFont(key);
                  window.api.readFontFile(font.path).then((result) => {
                    if (!result) return;
                    const css = injectFontFace(`eIsland-UI-${font.name}`, result.data, result.ext);
                    document.documentElement.style.setProperty('--island-ui-font', css);
                  }).catch(() => {});
                  window.api.storeWrite(UI_FONT_STORE_KEY, key).catch(() => {});
                }}
              >
                {font.name}
                <button
                  className="settings-font-delete"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = uiCustomFonts.filter((f) => f.path !== font.path);
                    setUiCustomFonts(next);
                    window.api.storeWrite(UI_CUSTOM_FONTS_STORE_KEY, next).catch(() => {});
                    if (uiFont === `custom:${font.path}`) {
                      const fallback = FONT_PRESETS[0];
                      setUIFont(fallback.value);
                      document.documentElement.style.setProperty('--island-ui-font', fallback.css);
                      window.api.storeWrite(UI_FONT_STORE_KEY, fallback.value).catch(() => {});
                    }
                  }}
                >
                  <img className="settings-font-delete-icon" src={SvgIcon.CANCEL} alt="" draggable={false} />
                </button>
              </button>
            ))}
            <button
              className="settings-lyrics-source-btn"
              type="button"
              onClick={() => {
                window.api.openFontDialog().then((result) => {
                  if (!result) return;
                  const entry: CustomFont = { name: result.name, path: result.path };
                  const exists = uiCustomFonts.some((f) => f.path === result.path);
                  if (exists) return;
                  const next = [...uiCustomFonts, entry];
                  setUiCustomFonts(next);
                  window.api.storeWrite(UI_CUSTOM_FONTS_STORE_KEY, next).catch(() => {});
                  injectFontFace(`eIsland-UI-${result.name}`, result.data, result.ext);
                  const key = `custom:${result.path}`;
                  setUIFont(key);
                  document.documentElement.style.setProperty('--island-ui-font', `'eIsland-UI-${result.name}', sans-serif`);
                  window.api.storeWrite(UI_FONT_STORE_KEY, key).catch(() => {});
                }).catch(() => {});
              }}
            >
              + {t('settings.app.theme.addCustomFont', { defaultValue: '添加字体' })}
            </button>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.theme.lyricsFontTitle', { defaultValue: '歌词字体' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.theme.lyricsFontHint', { defaultValue: '选择歌词显示使用的字体' })}</div>
          </div>
          <div className="settings-lyrics-source-options">
            {FONT_PRESETS.map((font) => (
              <button
                key={font.value}
                className={`settings-lyrics-source-btn ${lyricsFont === font.value ? 'active' : ''}`}
                type="button"
                onClick={() => {
                  setLyricsFont(font.value);
                  document.documentElement.style.setProperty('--island-lyrics-font', font.css);
                  window.api.storeWrite(LYRICS_FONT_STORE_KEY, font.value).catch(() => {});
                }}
              >
                {t(font.i18nKey)}
              </button>
            ))}
            {lyricsCustomFonts.map((font) => (
              <button
                key={font.path}
                className={`settings-lyrics-source-btn ${lyricsFont === `custom:${font.path}` ? 'active' : ''}`}
                type="button"
                onClick={() => {
                  const key = `custom:${font.path}`;
                  setLyricsFont(key);
                  window.api.readFontFile(font.path).then((result) => {
                    if (!result) return;
                    const css = injectFontFace(`eIsland-Lyrics-${font.name}`, result.data, result.ext);
                    document.documentElement.style.setProperty('--island-lyrics-font', css);
                  }).catch(() => {});
                  window.api.storeWrite(LYRICS_FONT_STORE_KEY, key).catch(() => {});
                }}
              >
                {font.name}
                <button
                  className="settings-font-delete"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = lyricsCustomFonts.filter((f) => f.path !== font.path);
                    setLyricsCustomFonts(next);
                    window.api.storeWrite(LYRICS_CUSTOM_FONTS_STORE_KEY, next).catch(() => {});
                    if (lyricsFont === `custom:${font.path}`) {
                      const fallback = FONT_PRESETS[0];
                      setLyricsFont(fallback.value);
                      document.documentElement.style.setProperty('--island-lyrics-font', fallback.css);
                      window.api.storeWrite(LYRICS_FONT_STORE_KEY, fallback.value).catch(() => {});
                    }
                  }}
                >
                  <img className="settings-font-delete-icon" src={SvgIcon.CANCEL} alt="" draggable={false} />
                </button>
              </button>
            ))}
            <button
              className="settings-lyrics-source-btn"
              type="button"
              onClick={() => {
                window.api.openFontDialog().then((result) => {
                  if (!result) return;
                  const entry: CustomFont = { name: result.name, path: result.path };
                  const exists = lyricsCustomFonts.some((f) => f.path === result.path);
                  if (exists) return;
                  const next = [...lyricsCustomFonts, entry];
                  setLyricsCustomFonts(next);
                  window.api.storeWrite(LYRICS_CUSTOM_FONTS_STORE_KEY, next).catch(() => {});
                  injectFontFace(`eIsland-Lyrics-${result.name}`, result.data, result.ext);
                  const key = `custom:${result.path}`;
                  setLyricsFont(key);
                  document.documentElement.style.setProperty('--island-lyrics-font', `'eIsland-Lyrics-${result.name}', sans-serif`);
                  window.api.storeWrite(LYRICS_FONT_STORE_KEY, key).catch(() => {});
                }).catch(() => {});
              }}
            >
              + {t('settings.app.theme.addCustomFont', { defaultValue: '添加字体' })}
            </button>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.theme.windowControlsTitle', { defaultValue: '独立窗口控制按钮样式' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.theme.windowControlsHint', { defaultValue: '启用后，独立窗口右上角将显示 macOS 风格三色圆点控制按钮' })}</div>
          </div>
          <div className="settings-card-inline-row">
            <label className="settings-card-check">
              <input
                type="checkbox"
                checked={standaloneMacControls}
                onChange={(event) => {
                  const next = event.target.checked;
                  if (next === standaloneMacControls) return;
                  setStandaloneMacControls(next);
                  window.api.storeWrite('standalone-window-mac-controls', next).catch(() => {});

                  const restartRequiredNotification = {
                    title: t('settings.app.notifications.configChanged.title', { defaultValue: '配置变更' }),
                    body: t('settings.app.notifications.windowControlsChanged.body', { defaultValue: '独立窗口控制按钮样式已变更。' }),
                    icon: SvgIcon.SETTING,
                    type: 'restart-required',
                  } as const;

                  setNotification(restartRequiredNotification);
                  window.api.settingsPreview('notification:show', restartRequiredNotification).catch(() => {});
                }}
              />
              {t('settings.app.theme.windowControlsMacToggle', { defaultValue: '使用 Mac 风格窗口控制按钮' })}
            </label>
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
                  title={`${wp.name}${t('settings.app.theme.defaultOpacitySuffix', { defaultValue: '（默认透明度 {{opacity}}%）', opacity: wp.defaultOpacity })}`}
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

          <div className="settings-card-subgroup">
            <div className="settings-card-subgroup-title">{t('settings.app.theme.syncDesktopWallpaperTitle', { defaultValue: '同步系统桌面壁纸' })}</div>
            <div className="settings-music-hint">{t('settings.app.theme.syncDesktopWallpaperHint', { defaultValue: '背景图片/视频变化时，同步更新 Windows 系统桌面壁纸（视频将使用封面图）' })}</div>
            <div className="settings-card-inline-row">
              <label className="settings-card-check">
                <input
                  type="checkbox"
                  checked={syncDesktopWallpaperOnBackgroundChange}
                  onChange={(event) => {
                    const next = event.target.checked;
                    setSyncDesktopWallpaperOnBackgroundChange(next);
                    window.api.storeWrite('island-bg-sync-system-wallpaper', next).catch(() => {});
                  }}
                />
                {t('settings.app.theme.syncDesktopWallpaperToggle', { defaultValue: '背景变化时同步到系统桌面' })}
              </label>
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
                  {t('settings.app.theme.videoHwDecodeToggle', { defaultValue: '启用硬件解码' })}
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.theme.islandOpacityTitle', { defaultValue: '灵动岛透明度' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.theme.islandOpacityHint', { defaultValue: '数值越低越透明（10% - 100%）' })}</div>
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

          <div className="settings-card-subgroup" style={{ marginTop: 10 }}>
            <div className="settings-card-subgroup-title">{t('settings.app.theme.autoDimTitle', { defaultValue: '闲置自动降低不透明度' })}</div>
            <div className="settings-music-hint">{t('settings.app.theme.autoDimHint', { defaultValue: '开启后，灵动岛在指定时间内无鼠标操作时将自动降低不透明度，鼠标移入后恢复' })}</div>
            <div className="settings-card-inline-row">
              <label className="settings-card-check">
                <input
                  type="checkbox"
                  checked={autoDimEnabled}
                  onChange={(event) => {
                    handleAutoDimEnabledChange(event.target.checked);
                  }}
                />
                {t('settings.app.theme.autoDimToggle', { defaultValue: '启用闲置自动降低不透明度' })}
              </label>
            </div>
            {autoDimEnabled && (
              <>
                <div className="settings-music-hint" style={{ marginTop: 6 }}>
                  {t('settings.app.theme.autoDimDelayHint', { defaultValue: '无操作多少秒后自动降低（1 - 120 秒）' })}
                </div>
                <div className="settings-opacity-slider-row">
                  <input
                    className="settings-opacity-slider"
                    type="range"
                    min={1}
                    max={120}
                    step={1}
                    value={autoDimDelaySec}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      const safe = Number.isFinite(v) ? Math.max(1, Math.min(120, Math.round(v))) : 10;
                      handleAutoDimDelayChange(safe);
                    }}
                  />
                  <span className="settings-opacity-slider-value">{autoDimDelaySec}s</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
