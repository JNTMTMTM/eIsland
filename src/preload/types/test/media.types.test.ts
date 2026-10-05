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
 * @file media.types.test.ts
 * @description media 的跨进程类型契约、合法配置与非法字段约束测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { NowPlayingInfo, SmtcSourceInfo, DetectSourceAppIdResult, SmtcTimeline, SmtcTimestampResult, SourceSwitchRequestData, MusicProviderAuthState, MusicProviderAuthStatus, MusicProviderId, MusicProviderQrCodeResult, QishuiBusinessApi, QishuiBusinessRequestOptions, QishuiBusinessStatus, QishuiLyricsResult, QishuiSong, QishuiSongsResult, QishuiSongUrlResult } from '../media';
import type { MusicProviderAuthState as OriginalMusicProviderAuthState, MusicProviderAuthStatus as OriginalMusicProviderAuthStatus , MusicProviderId as OriginalMusicProviderId , MusicProviderQrCodeResult as OriginalMusicProviderQrCodeResult  } from '../../../shared/musicProviderAuth';
import type { QishuiBusinessApi as OriginalQishuiBusinessApi, QishuiBusinessRequestOptions as OriginalQishuiBusinessRequestOptions , QishuiBusinessStatus as OriginalQishuiBusinessStatus , QishuiLyricsResult as OriginalQishuiLyricsResult , QishuiSong as OriginalQishuiSong , QishuiSongsResult as OriginalQishuiSongsResult , QishuiSongUrlResult as OriginalQishuiSongUrlResult  } from '../../../shared/qishuiBusiness';
describe('media contracts', () => {
  it('fixes NowPlayingInfo fields and accepts its explicit legal fixture', () => {
    expectTypeOf<NowPlayingInfo>().toEqualTypeOf<{
      title: string;
      artist: string;
      album: string;
      duration_ms: number;
      position_ms: number;
      isPlaying: boolean;
      thumbnail?: string | null;
      canFastForward: boolean;
      canSkip: boolean;
      canLike: boolean;
      canChangeVolume: boolean;
      canSetOutput: boolean;
    }>();
    const fixture: NowPlayingInfo = { title: 'sample', artist: 'sample', album: 'sample', duration_ms: 0, position_ms: 0, isPlaying: false, thumbnail: null, canFastForward: false, canSkip: false, canLike: false, canChangeVolume: false, canSetOutput: false };
    expect(fixture).toBeDefined();
    // @ts-expect-error NowPlayingInfo.title 禁止使用契约外字段值。
    const invalid: NowPlayingInfo['title'] = 123;
    expect(invalid).toBeDefined();
  });
  it('fixes SmtcSourceInfo fields and accepts its explicit legal fixture', () => {
    expectTypeOf<SmtcSourceInfo>().toEqualTypeOf<{
      sourceAppId: string;
      isPlaying: boolean;
      hasTitle: boolean;
      thumbnail: string | null;
    }>();
    const fixture: SmtcSourceInfo = { sourceAppId: 'sample', isPlaying: false, hasTitle: false, thumbnail: null };
    expect(fixture).toBeDefined();
    // @ts-expect-error SmtcSourceInfo.sourceAppId 禁止使用契约外字段值。
    const invalid: SmtcSourceInfo['sourceAppId'] = 123;
    expect(invalid).toBeDefined();
  });
  it('fixes DetectSourceAppIdResult fields and accepts its explicit legal fixture', () => {
    expectTypeOf<DetectSourceAppIdResult>().toEqualTypeOf<{
      ok: boolean;
      sources: SmtcSourceInfo[];
      message: string;
    }>();
    const fixture: DetectSourceAppIdResult = { ok: false, sources: [], message: 'sample' };
    expect(fixture).toBeDefined();
    // @ts-expect-error DetectSourceAppIdResult.ok 禁止使用契约外字段值。
    const invalid: DetectSourceAppIdResult['ok'] = 'invalid';
    expect(invalid).toBeDefined();
  });
  it('fixes SmtcTimeline fields and accepts its explicit legal fixture', () => {
    expectTypeOf<SmtcTimeline>().toEqualTypeOf<{
      startTime: number;
      endTime: number;
      position: number;
      minSeekTime: number;
      maxSeekTime: number;
    }>();
    const fixture: SmtcTimeline = { startTime: 0, endTime: 0, position: 0, minSeekTime: 0, maxSeekTime: 0 };
    expect(fixture).toBeDefined();
    // @ts-expect-error SmtcTimeline.startTime 禁止使用契约外字段值。
    const invalid: SmtcTimeline['startTime'] = 'invalid';
    expect(invalid).toBeDefined();
  });
  it('fixes SmtcTimestampResult fields and accepts its explicit legal fixture', () => {
    expectTypeOf<SmtcTimestampResult>().toEqualTypeOf<{
      isAvailable: boolean;
      playbackStatus: string;
      timeline: SmtcTimeline | null;
    }>();
    const fixture: SmtcTimestampResult = { isAvailable: false, playbackStatus: 'sample', timeline: null };
    expect(fixture).toBeDefined();
    // @ts-expect-error SmtcTimestampResult.isAvailable 禁止使用契约外字段值。
    const invalid: SmtcTimestampResult['isAvailable'] = 'invalid';
    expect(invalid).toBeDefined();
  });
  it('fixes SourceSwitchRequestData fields and accepts its explicit legal fixture', () => {
    expectTypeOf<SourceSwitchRequestData>().toEqualTypeOf<{
      sourceAppId: string;
      title: string;
      artist: string;
    }>();
    const fixture: SourceSwitchRequestData = { sourceAppId: 'sample', title: 'sample', artist: 'sample' };
    expect(fixture).toBeDefined();
    // @ts-expect-error SourceSwitchRequestData.sourceAppId 禁止使用契约外字段值。
    const invalid: SourceSwitchRequestData['sourceAppId'] = 123;
    expect(invalid).toBeDefined();
  });
  it('retains MusicProviderAuthState re-export contract', () => {
    expectTypeOf<MusicProviderAuthState>().toEqualTypeOf<OriginalMusicProviderAuthState>();
    const fixture: MusicProviderAuthState = 'idle';
    expect(fixture).toBeDefined();
  });
  it('retains MusicProviderAuthStatus re-export contract', () => {
    expectTypeOf<MusicProviderAuthStatus>().toEqualTypeOf<OriginalMusicProviderAuthStatus>();
    const fixture: MusicProviderAuthStatus = { provider: 'qishui', loggedIn: false, state: 'idle', retryAfterMs: 0, errorCode: 'sample', message: 'sample' };
    expect(fixture).toBeDefined();
  });
  it('retains MusicProviderId re-export contract', () => {
    expectTypeOf<MusicProviderId>().toEqualTypeOf<OriginalMusicProviderId>();
    const fixture: MusicProviderId = 'qishui';
    expect(fixture).toBeDefined();
  });
  it('retains MusicProviderQrCodeResult re-export contract', () => {
    expectTypeOf<MusicProviderQrCodeResult>().toEqualTypeOf<OriginalMusicProviderQrCodeResult>();
    const fixture: MusicProviderQrCodeResult = { provider: 'qishui', loggedIn: false, state: 'idle', retryAfterMs: 0, errorCode: 'sample', message: 'sample', token: 'sample', qrContent: 'sample', expiresAt: null };
    expect(fixture).toBeDefined();
  });
  it('retains QishuiBusinessApi re-export contract', () => {
    expectTypeOf<QishuiBusinessApi>().toEqualTypeOf<OriginalQishuiBusinessApi>();
    const fixture: QishuiBusinessApi = { status: () => Promise.resolve({ provider: 'qishui', configured: false, loggedIn: false, webSession: false, publicCatalog: false, capabilities: {}, message: 'sample' }), search: () => Promise.resolve({ provider: 'qishui', songs: [], configured: false, loggedIn: false, publicCatalog: false, offset: 0, limit: 0, nextOffset: 0, hasMore: false, error: 'sample' }), feed: () => Promise.resolve({ provider: 'qishui', songs: [], configured: false, loggedIn: false, publicCatalog: false, offset: 0, limit: 0, nextOffset: 0, hasMore: false, error: 'sample' }), playlists: () => Promise.resolve({}), playlistTracks: () => Promise.resolve({}), lyrics: () => Promise.resolve({ provider: 'qishui', id: 'sample', auth: 'sample', lyric: 'sample', tlyric: 'sample' }), songUrl: () => Promise.resolve({ provider: 'qishui', playable: false, playbackMode: 'direct-url', url: 'sample', reason: 'sample', loggedIn: false, encrypted: false, membershipKnown: false, vipLevel: 'unknown', requiredTier: 'free', quality: 'sample', br: 0, duration: 0 }), comments: () => Promise.resolve({}), createComment: () => Promise.resolve({}), checkLiked: () => Promise.resolve({}), like: () => Promise.resolve({}), collectPlaylist: () => Promise.resolve({}), collectAlbum: () => Promise.resolve({}), addSong: () => Promise.resolve({}), recentPlay: () => Promise.resolve({}) };
    expect(fixture).toBeDefined();
  });
  it('retains QishuiBusinessRequestOptions re-export contract', () => {
    expectTypeOf<QishuiBusinessRequestOptions>().toEqualTypeOf<OriginalQishuiBusinessRequestOptions>();
    const fixture: QishuiBusinessRequestOptions = { limit: 0, offset: 0, cursor: 'sample', quality: 'sample' };
    expect(fixture).toBeDefined();
  });
  it('retains QishuiBusinessStatus re-export contract', () => {
    expectTypeOf<QishuiBusinessStatus>().toEqualTypeOf<OriginalQishuiBusinessStatus>();
    const fixture: QishuiBusinessStatus = { provider: 'qishui', configured: false, loggedIn: false, webSession: false, publicCatalog: false, capabilities: {}, message: 'sample' };
    expect(fixture).toBeDefined();
  });
  it('retains QishuiLyricsResult re-export contract', () => {
    expectTypeOf<QishuiLyricsResult>().toEqualTypeOf<OriginalQishuiLyricsResult>();
    const fixture: QishuiLyricsResult = { provider: 'qishui', id: 'sample', auth: 'sample', lyric: 'sample', tlyric: 'sample' };
    expect(fixture).toBeDefined();
  });
  it('retains QishuiSong re-export contract', () => {
    expectTypeOf<QishuiSong>().toEqualTypeOf<OriginalQishuiSong>();
    const fixture: QishuiSong = { provider: 'qishui', id: 'sample', providerSongId: 'sample', name: 'sample', artist: 'sample', artists: [], album: 'sample', cover: 'sample', duration: 0, lyric: 'sample' };
    expect(fixture).toBeDefined();
  });
  it('retains QishuiSongsResult re-export contract', () => {
    expectTypeOf<QishuiSongsResult>().toEqualTypeOf<OriginalQishuiSongsResult>();
    const fixture: QishuiSongsResult = { provider: 'qishui', songs: [], configured: false, loggedIn: false, publicCatalog: false, offset: 0, limit: 0, nextOffset: 0, hasMore: false, error: 'sample' };
    expect(fixture).toBeDefined();
  });
  it('retains QishuiSongUrlResult re-export contract', () => {
    expectTypeOf<QishuiSongUrlResult>().toEqualTypeOf<OriginalQishuiSongUrlResult>();
    const fixture: QishuiSongUrlResult = { provider: 'qishui', playable: false, playbackMode: 'direct-url', url: 'sample', reason: 'sample', loggedIn: false, encrypted: false, membershipKnown: false, vipLevel: 'unknown', requiredTier: 'free', quality: 'sample', br: 0, duration: 0 };
    expect(fixture).toBeDefined();
  });
});
