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
  detectedSources: Array<{ sourceAppId: string; isPlaying: boolean; hasTitle: boolean }>;
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
        <span>歌曲设置</span>
        <span className="settings-app-title-sub">- {currentMusicSettingsPageLabel}</span>
      </div>

      <div className="settings-app-pages-layout settings-music-pages-layout">
        <div className="settings-app-page-main">
          {musicSettingsPage === 'whitelist' && (
            <div className="settings-music-section">
              <div className="settings-music-label">播放器白名单</div>
              <div className="settings-music-hint">只有白名单内的播放器才会触发歌曲信息获取</div>
              <div className="settings-whitelist-list">
                {whitelist.map((item: string, idx: number) => (
                  <div className="settings-whitelist-item" key={idx}>
                    <span className="settings-whitelist-name">{item}</span>
                    <button
                      className="settings-whitelist-remove"
                      type="button"
                      title="移除"
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
              <div className="settings-whitelist-add-row">
                <input
                  className={`settings-whitelist-input${whitelistInputError ? ' error' : ''}`}
                  type="text"
                  placeholder={whitelistInputError || '输入播放器进程名（如 Spotify.exe）'}
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
                <button className="settings-whitelist-add-btn" type="button" onClick={() => { handleAddWhitelist(); }}>添加</button>
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
                  {detectingSourceAppId ? '获取中…' : '获取播放进程'}
                </button>
              </div>
              {detectedSources.length > 0 && (
                <div className="settings-whitelist-detected-list">
                  {detectedSources.map((source) => {
                    const alreadyAdded = whitelist.some((w) => w.toLowerCase() === source.sourceAppId.toLowerCase());
                    return (
                      <div className="settings-whitelist-detected-item" key={source.sourceAppId}>
                        <span className="settings-whitelist-detected-status" title={source.isPlaying ? '播放中' : '已暂停'}>
                          {source.isPlaying ? '▶' : '⏸'}
                        </span>
                        <span className="settings-whitelist-detected-name">{source.sourceAppId}</span>
                        {alreadyAdded ? (
                          <span className="settings-whitelist-detected-badge">已添加</span>
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
                            添加
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {musicSettingsPage === 'lyrics' && (
            <div className="settings-music-section">
              <div className="settings-music-label">歌词源</div>
              <div className="settings-music-hint">自动模式根据 SMTC 检测到的播放器进程选择对应源，失败后依次尝试其他源，最后使用 LRCLIB 兜底</div>
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
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="settings-music-label" style={{ marginTop: 12 }}>逐字扫光</div>
              <div className="settings-music-hint">启用后歌词将以逐字高亮方式显示</div>
              <div className="settings-hotkey-row" style={{ alignItems: 'center' }}>
                <label className="settings-music-hint" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={lyricsKaraoke}
                    onChange={(e) => {
                      setLyricsKaraoke(e.target.checked);
                      window.api.musicLyricsKaraokeSet(e.target.checked).catch(() => {});
                    }}
                  />
                  启用逐字扫光效果
                </label>
              </div>
              <div className="settings-music-label" style={{ marginTop: 12 }}>歌词时钟</div>
              <div className="settings-music-hint">在歌词界面封面与歌词之间显示当前北京时间</div>
              <div className="settings-hotkey-row" style={{ alignItems: 'center' }}>
                <label className="settings-music-hint" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={lyricsClock}
                    onChange={(e) => {
                      setLyricsClock(e.target.checked);
                      window.api.musicLyricsClockSet(e.target.checked).catch(() => {});
                    }}
                  />
                  显示当前时间
                </label>
              </div>
            </div>
          )}

          {musicSettingsPage === 'smtc' && (
            <div className="settings-music-section">
              <div className="settings-music-label">SMTC 自动取消订阅</div>
              <div className="settings-music-hint">用于清理长时间无更新的播放会话，默认永不取消订阅</div>
              <div className="settings-hotkey-row" style={{ alignItems: 'center' }}>
                <label className="settings-field" style={{ flex: 1 }}>
                  <span className="settings-field-label">取消订阅时间（毫秒）</span>
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
                <label className="settings-music-hint" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={musicSmtcNeverUnsubscribe}
                    onChange={(e) => {
                      setMusicSmtcNeverUnsubscribe(e.target.checked);
                      if (musicSmtcConfigMessage) setMusicSmtcConfigMessage(null);
                    }}
                  />
                  永不取消订阅
                </label>
                <button
                  className="settings-hotkey-btn"
                  type="button"
                  onClick={() => {
                    saveMusicSmtcUnsubscribeConfig().catch((error: unknown) => {
                      setMusicSmtcConfigMessage({
                        type: 'error',
                        text: `保存失败：${error instanceof Error ? error.message : '未知错误'}`,
                      });
                    });
                  }}
                >
                  保存
                </button>
              </div>
              {musicSmtcConfigMessage && (
                <div className="settings-music-hint" style={{ color: musicSmtcConfigMessage.type === 'error' ? '#ff8b8b' : '#7df2a0' }}>
                  {musicSmtcConfigMessage.text}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="settings-app-page-dots" aria-label="歌曲设置分页">
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
