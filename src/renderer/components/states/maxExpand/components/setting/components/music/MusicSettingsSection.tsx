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
 * @file MusicSettingsSection.tsx
 * @description 设置页面 - 音乐设置区块
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { MusicSettingsPageKey } from '../../utils/settingsConfig';

interface MusicSourceOption {
  value: string;
  label: string;
}

interface MusicConfigMessage {
  type: 'error' | 'success';
  text: string;
}

interface MusicSettingsSectionProps {
  currentMusicSettingsPageLabel: string;
  musicSettingsPage: MusicSettingsPageKey;
  whitelist: string[];
  setWhitelist: (list: string[]) => void;
  whitelistInputError: string;
  setWhitelistInputError: (value: string) => void;
  whitelistDraft: string;
  setWhitelistDraft: (value: string) => void;
  handleAddWhitelist: () => void;
  handleDetectSourceAppId: () => Promise<void>;
  detectingSourceAppId: boolean;
  detectedSources: Array<{ sourceAppId: string; isPlaying: boolean; hasTitle: boolean; thumbnail: string | null }>;
  lyricsSourceOptions: MusicSourceOption[];
  lyricsSource: string;
  setLyricsSource: (value: string) => void;
  lyricsKaraoke: boolean;
  setLyricsKaraoke: (value: boolean) => void;
  lyricsClock: boolean;
  setLyricsClock: (value: boolean) => void;
  musicSmtcUnsubscribeInput: string;
  setMusicSmtcUnsubscribeInput: (value: string) => void;
  musicSmtcNeverUnsubscribe: boolean;
  setMusicSmtcNeverUnsubscribe: (value: boolean) => void;
  saveMusicSmtcUnsubscribeConfig: () => Promise<void>;
  setMusicSmtcConfigMessage: (message: MusicConfigMessage | null) => void;
  musicSmtcConfigMessage: MusicConfigMessage | null;
  musicSettingsPages: MusicSettingsPageKey[];
  musicSettingsPageLabels: Record<MusicSettingsPageKey, string>;
  setMusicSettingsPage: (page: MusicSettingsPageKey) => void;
}

/**
 * 渲染音乐设置区块
 * @param props - 音乐设置区域所需参数
 * @returns 音乐设置区域
 */
export function MusicSettingsSection(props: MusicSettingsSectionProps): ReactElement {
  const { t } = useTranslation();
  const lyricsSourceOptionKeyMap: Record<string, string> = {
    auto: 'settings.music.lyrics.sourceOptions.auto',
    'netease-only': 'settings.music.lyrics.sourceOptions.neteaseOnly',
    'qqmusic-only': 'settings.music.lyrics.sourceOptions.qqmusicOnly',
    'kugou-only': 'settings.music.lyrics.sourceOptions.kugouOnly',
    'sodamusic-only': 'settings.music.lyrics.sourceOptions.sodamusicOnly',
    'lrclib-only': 'settings.music.lyrics.sourceOptions.lrclibOnly',
  };
  const {
    currentMusicSettingsPageLabel,
    musicSettingsPage,
    whitelist,
    setWhitelist,
    whitelistInputError,
    setWhitelistInputError,
    whitelistDraft,
    setWhitelistDraft,
    handleAddWhitelist,
    handleDetectSourceAppId,
    detectingSourceAppId,
    detectedSources,
    lyricsSourceOptions,
    lyricsSource,
    setLyricsSource,
    lyricsKaraoke,
    setLyricsKaraoke,
    lyricsClock,
    setLyricsClock,
    musicSmtcUnsubscribeInput,
    setMusicSmtcUnsubscribeInput,
    musicSmtcNeverUnsubscribe,
    setMusicSmtcNeverUnsubscribe,
    saveMusicSmtcUnsubscribeConfig,
    setMusicSmtcConfigMessage,
    musicSmtcConfigMessage,
    musicSettingsPages,
    musicSettingsPageLabels,
    setMusicSettingsPage,
  } = props;

  return (
    <div className="max-expand-settings-section">
      <div className="max-expand-settings-title settings-app-title-line">
        <span>{t('settings.labels.music', { defaultValue: '歌曲设置' })}</span>
        <span className="settings-app-title-sub">- {currentMusicSettingsPageLabel}</span>
      </div>

      <div className="settings-app-pages-layout settings-music-pages-layout">
        <div className="settings-app-page-main">
          {musicSettingsPage === 'whitelist' && (
            <div className="settings-cards">

              <div className="settings-card">
                <div className="settings-card-header">
                  <div className="settings-card-title">{t('settings.music.whitelist.title', { defaultValue: '播放器白名单' })}</div>
                  <div className="settings-card-subtitle">{t('settings.music.whitelist.hint', { defaultValue: '只有白名单内的播放器才会触发歌曲信息获取' })}</div>
                </div>
                <div className="settings-whitelist-list">
                  {whitelist.length === 0 ? (
                    <span className="settings-hide-selected-empty">{t('settings.music.whitelist.empty', { defaultValue: '暂无已加入的播放器' })}</span>
                  ) : whitelist.map((item: string, idx: number) => (
                    <div className="settings-whitelist-item" key={idx}>
                      <span className="settings-whitelist-name">{item}</span>
                      <button
                        className="settings-whitelist-remove"
                        type="button"
                        title={t('settings.common.remove', { defaultValue: '移除' })}
                        onClick={() => {
                          const next = whitelist.filter((_, i) => i !== idx);
                          setWhitelist(next);
                          window.api.musicWhitelistSet(next).catch(() => {});
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="settings-card">
                <div className="settings-card-header">
                  <div className="settings-card-title">{t('settings.music.whitelist.addTitle', { defaultValue: '添加播放器' })}</div>
                  <div className="settings-card-subtitle">{t('settings.music.whitelist.addHint', { defaultValue: '手动输入播放器进程名，或自动从当前 SMTC 会话中检测' })}</div>
                </div>
                <div className="settings-whitelist-add-row">
                  <input
                    className={`settings-whitelist-input${whitelistInputError ? ' error' : ''}`}
                    type="text"
                    placeholder={whitelistInputError || t('settings.music.whitelist.placeholder', { defaultValue: '输入播放器进程名（如 Spotify.exe）' })}
                    value={whitelistDraft}
                    onFocus={() => { if (whitelistInputError) setWhitelistInputError(''); }}
                    onChange={(e) => {
                      setWhitelistDraft(e.target.value);
                      if (whitelistInputError) setWhitelistInputError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddWhitelist();
                    }}
                  />
                  <button className="settings-whitelist-add-btn" type="button" onClick={() => { handleAddWhitelist(); }}>{t('settings.common.add', { defaultValue: '添加' })}</button>
                </div>
                <div className="settings-whitelist-add-row" style={{ display: 'flex', alignItems: 'center' }}>
                  <button
                    className="settings-whitelist-add-btn"
                    type="button"
                    onClick={() => {
                      if (whitelistInputError) setWhitelistInputError('');
                      handleDetectSourceAppId().catch(() => {});
                    }}
                    disabled={detectingSourceAppId}
                  >
                    {detectingSourceAppId
                      ? t('settings.music.whitelist.fetching', { defaultValue: '获取中…' })
                      : t('settings.music.whitelist.fetchSourceProcess', { defaultValue: '获取播放进程' })}
                  </button>
                </div>
                {detectedSources.length > 0 && (
                  <div className="settings-card-subgroup">
                    <div className="settings-card-subgroup-title">{t('settings.music.whitelist.detectedTitle', { defaultValue: '当前检测到' })}</div>
                    <div className="settings-whitelist-detected-list">
                      {detectedSources.map((source) => {
                        const alreadyAdded = whitelist.some((w) => w.toLowerCase() === source.sourceAppId.toLowerCase());
                        return (
                          <div className="settings-whitelist-detected-item" key={source.sourceAppId}>
                            {source.thumbnail && (
                              <img
                                className="settings-whitelist-detected-thumb"
                                src={source.thumbnail}
                                alt=""
                              />
                            )}
                            <span className="settings-whitelist-detected-name">{source.sourceAppId}</span>
                            {alreadyAdded ? (
                              <span className="settings-whitelist-detected-badge">{t('settings.music.whitelist.added', { defaultValue: '已添加' })}</span>
                            ) : (
                              <button
                                className="settings-whitelist-add-btn"
                                type="button"
                                onClick={() => {
                                  const next = [...whitelist, source.sourceAppId];
                                  setWhitelist(next);
                                  window.api.musicWhitelistSet(next).catch(() => {});
                                }}
                              >
                                {t('settings.common.add', { defaultValue: '添加' })}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {musicSettingsPage === 'lyrics' && (
            <div className="settings-cards">

              <div className="settings-card">
                <div className="settings-card-header">
                  <div className="settings-card-title">{t('settings.music.lyrics.title', { defaultValue: '歌词源' })}</div>
                  <div className="settings-card-subtitle">{t('settings.music.lyrics.hint', { defaultValue: '自动模式根据 SMTC 检测到的播放器进程选择对应源，失败后依次尝试其他源，最后使用 LRCLIB 兜底' })}</div>
                </div>
                <div className="settings-lyrics-source-options">
                  {lyricsSourceOptions.map((opt) => (
                    <button
                      key={opt.value}
                      className={`settings-lyrics-source-btn ${lyricsSource === opt.value ? 'active' : ''}`}
                      type="button"
                      onClick={() => {
                        setLyricsSource(opt.value);
                        window.api.musicLyricsSourceSet(opt.value).catch(() => {});
                      }}
                    >
                      {t(lyricsSourceOptionKeyMap[opt.value] || '', { defaultValue: opt.label })}
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-card">
                <div className="settings-card-header">
                  <div className="settings-card-title">{t('settings.music.lyrics.displayTitle', { defaultValue: '歌词显示' })}</div>
                  <div className="settings-card-subtitle">{t('settings.music.lyrics.displayHint', { defaultValue: '控制歌词界面的展示效果' })}</div>
                </div>

                <div className="settings-card-subgroup">
                  <div className="settings-card-subgroup-title">{t('settings.music.lyrics.karaokeTitle', { defaultValue: '逐字扫光' })}</div>
                  <div className="settings-music-hint">{t('settings.music.lyrics.karaokeHint', { defaultValue: '启用后歌词将以逐字高亮方式显示' })}</div>
                  <div className="settings-card-inline-row">
                    <label className="settings-card-check">
                      <input
                        type="checkbox"
                        checked={lyricsKaraoke}
                        onChange={(e) => {
                          setLyricsKaraoke(e.target.checked);
                          window.api.musicLyricsKaraokeSet(e.target.checked).catch(() => {});
                        }}
                      />
                      {t('settings.music.lyrics.karaokeToggle', { defaultValue: '启用逐字扫光效果' })}
                    </label>
                  </div>
                </div>

                <div className="settings-card-subgroup">
                  <div className="settings-card-subgroup-title">{t('settings.music.lyrics.clockTitle', { defaultValue: '歌词时钟' })}</div>
                  <div className="settings-music-hint">{t('settings.music.lyrics.clockHint', { defaultValue: '在歌词界面封面与歌词之间显示当前北京时间' })}</div>
                  <div className="settings-card-inline-row">
                    <label className="settings-card-check">
                      <input
                        type="checkbox"
                        checked={lyricsClock}
                        onChange={(e) => {
                          setLyricsClock(e.target.checked);
                          window.api.musicLyricsClockSet(e.target.checked).catch(() => {});
                        }}
                      />
                      {t('settings.music.lyrics.clockToggle', { defaultValue: '显示当前时间' })}
                    </label>
                  </div>
                </div>
              </div>

            </div>
          )}

          {musicSettingsPage === 'smtc' && (
            <div className="settings-cards">

              <div className="settings-card">
                <div className="settings-card-header">
                  <div className="settings-card-title">{t('settings.music.smtc.title', { defaultValue: 'SMTC 自动取消订阅' })}</div>
                  <div className="settings-card-subtitle">{t('settings.music.smtc.hint', { defaultValue: '用于清理长时间无更新的播放会话，默认永不取消订阅' })}</div>
                </div>
                <div className="settings-hotkey-row" style={{ alignItems: 'center' }}>
                  <label className="settings-field" style={{ flex: 1 }}>
                    <span className="settings-field-label">{t('settings.music.smtc.unsubscribeMs', { defaultValue: '取消订阅时间（毫秒）' })}</span>
                    <input
                      className="settings-field-input"
                      type="number"
                      min={1000}
                      step={1000}
                      value={musicSmtcUnsubscribeInput}
                      disabled={musicSmtcNeverUnsubscribe}
                      onChange={(e) => {
                        setMusicSmtcUnsubscribeInput(e.target.value);
                        if (musicSmtcConfigMessage) setMusicSmtcConfigMessage(null);
                      }}
                    />
                  </label>
                </div>
                <div className="settings-hotkey-row" style={{ alignItems: 'center' }}>
                  <label className="settings-card-check">
                    <input
                      type="checkbox"
                      checked={musicSmtcNeverUnsubscribe}
                      onChange={(e) => {
                        setMusicSmtcNeverUnsubscribe(e.target.checked);
                        if (musicSmtcConfigMessage) setMusicSmtcConfigMessage(null);
                      }}
                    />
                    {t('settings.music.smtc.neverUnsubscribe', { defaultValue: '永不取消订阅' })}
                  </label>
                  <button
                    className="settings-hotkey-btn"
                    type="button"
                    onClick={() => {
                      saveMusicSmtcUnsubscribeConfig().catch((error: unknown) => {
                        setMusicSmtcConfigMessage({
                          type: 'error',
                          text: t('settings.common.saveFailed', {
                            defaultValue: '保存失败：{{error}}',
                            error: error instanceof Error ? error.message : t('settings.common.unknownError', { defaultValue: '未知错误' }),
                          }),
                        });
                      });
                    }}
                  >
                    {t('settings.common.save', { defaultValue: '保存' })}
                  </button>
                </div>
                {musicSmtcConfigMessage && (
                  <div className="settings-music-hint" style={{ color: musicSmtcConfigMessage.type === 'error' ? '#ff8b8b' : '#7df2a0' }}>
                    {musicSmtcConfigMessage.text}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        <div className="settings-app-page-dots" aria-label={t('settings.music.pagination', { defaultValue: '歌曲设置分页' })}>
          {musicSettingsPages.map((page) => (
            <button
              key={page}
              className={`settings-app-page-dot ${musicSettingsPage === page ? 'active' : ''}`}
              data-label={musicSettingsPageLabels[page]}
              type="button"
              onClick={() => setMusicSettingsPage(page)}
              title={musicSettingsPageLabels[page]}
              aria-label={musicSettingsPageLabels[page]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
