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
 * @file qishuiBusiness.types.test.ts
 * @description qishuiBusiness 的跨进程类型契约、合法配置与非法字段约束测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { QishuiBusinessRequestOptions, QishuiSong, QishuiBusinessStatus, QishuiSongsResult, QishuiLyricsResult, QishuiSongUrlResult, QishuiBusinessApi } from '../qishuiBusiness';
describe('qishuiBusiness contracts', () => {
  it('fixes QishuiBusinessRequestOptions fields and accepts its explicit legal fixture', () => {
    expectTypeOf<QishuiBusinessRequestOptions>().toEqualTypeOf<{
      limit?: number;
      offset?: number;
      cursor?: string;
      quality?: string;
    }>();
    const fixture: QishuiBusinessRequestOptions = { limit: 0, offset: 0, cursor: 'sample', quality: 'sample' };
    expect(fixture).toBeDefined();
    // @ts-expect-error QishuiBusinessRequestOptions.limit 禁止使用契约外字段值。
    const invalid: QishuiBusinessRequestOptions['limit'] = 'invalid';
    expect(invalid).toBeDefined();
  });
  it('fixes QishuiSong fields and accepts its explicit legal fixture', () => {
    expectTypeOf<QishuiSong>().toEqualTypeOf<{
      provider: 'qishui';
      id: string;
      providerSongId: string;
      name: string;
      artist: string;
      artists?: Array<{
        name: string;
      }>;
      album: string;
      cover: string;
      duration: number;
      lyric?: string;
    }>();
    const fixture: QishuiSong = { provider: 'qishui', id: 'sample', providerSongId: 'sample', name: 'sample', artist: 'sample', artists: [], album: 'sample', cover: 'sample', duration: 0, lyric: 'sample' };
    expect(fixture).toBeDefined();
    // @ts-expect-error QishuiSong.id 禁止使用契约外字段值。
    const invalid: QishuiSong['id'] = 123;
    expect(invalid).toBeDefined();
  });
  it('fixes QishuiBusinessStatus fields and accepts its explicit legal fixture', () => {
    expectTypeOf<QishuiBusinessStatus>().toEqualTypeOf<{
      provider: 'qishui';
      configured: boolean;
      loggedIn: boolean;
      webSession: boolean;
      publicCatalog: boolean;
      capabilities: Record<string, boolean>;
      message: string;
    }>();
    const fixture: QishuiBusinessStatus = { provider: 'qishui', configured: false, loggedIn: false, webSession: false, publicCatalog: false, capabilities: {}, message: 'sample' };
    expect(fixture).toBeDefined();
    // @ts-expect-error QishuiBusinessStatus.configured 禁止使用契约外字段值。
    const invalid: QishuiBusinessStatus['configured'] = 'invalid';
    expect(invalid).toBeDefined();
  });
  it('fixes QishuiSongsResult fields and accepts its explicit legal fixture', () => {
    expectTypeOf<QishuiSongsResult>().toEqualTypeOf<{
      provider: 'qishui';
      songs: QishuiSong[];
      configured?: boolean;
      loggedIn?: boolean;
      publicCatalog?: boolean;
      offset?: number;
      limit?: number;
      nextOffset?: number;
      hasMore?: boolean;
      error?: string;
    }>();
    const fixture: QishuiSongsResult = { provider: 'qishui', songs: [], configured: false, loggedIn: false, publicCatalog: false, offset: 0, limit: 0, nextOffset: 0, hasMore: false, error: 'sample' };
    expect(fixture).toBeDefined();
    // @ts-expect-error QishuiSongsResult.configured 禁止使用契约外字段值。
    const invalid: QishuiSongsResult['configured'] = 'invalid';
    expect(invalid).toBeDefined();
  });
  it('fixes QishuiLyricsResult fields and accepts its explicit legal fixture', () => {
    expectTypeOf<QishuiLyricsResult>().toEqualTypeOf<{
      provider: 'qishui';
      id: string;
      auth: string;
      lyric: string;
      tlyric: string;
    }>();
    const fixture: QishuiLyricsResult = { provider: 'qishui', id: 'sample', auth: 'sample', lyric: 'sample', tlyric: 'sample' };
    expect(fixture).toBeDefined();
    // @ts-expect-error QishuiLyricsResult.id 禁止使用契约外字段值。
    const invalid: QishuiLyricsResult['id'] = 123;
    expect(invalid).toBeDefined();
  });
  it('fixes QishuiSongUrlResult fields and accepts its explicit legal fixture', () => {
    expectTypeOf<QishuiSongUrlResult>().toEqualTypeOf<{
      provider: 'qishui';
      playable: boolean;
      playbackMode: 'direct-url' | 'recommend-match';
      url: string;
      reason?: string;
      loggedIn?: boolean;
      encrypted?: boolean;
      membershipKnown?: boolean;
      vipLevel?: 'unknown' | 'free' | 'vip' | 'svip';
      requiredTier?: 'free' | 'vip' | 'svip';
      quality?: string;
      br?: number;
      duration?: number;
    }>();
    const fixture: QishuiSongUrlResult = { provider: 'qishui', playable: false, playbackMode: 'direct-url', url: 'sample', reason: 'sample', loggedIn: false, encrypted: false, membershipKnown: false, vipLevel: 'unknown', requiredTier: 'free', quality: 'sample', br: 0, duration: 0 };
    expect(fixture).toBeDefined();
    // @ts-expect-error QishuiSongUrlResult.playable 禁止使用契约外字段值。
    const invalid: QishuiSongUrlResult['playable'] = 'invalid';
    expect(invalid).toBeDefined();
  });
  it('fixes QishuiBusinessApi fields and accepts its explicit legal fixture', () => {
    expectTypeOf<QishuiBusinessApi>().toEqualTypeOf<{
      status(): Promise<QishuiBusinessStatus>;
      search(keyword: string, options?: QishuiBusinessRequestOptions): Promise<QishuiSongsResult>;
      feed(limit?: number): Promise<QishuiSongsResult>;
      playlists(): Promise<Record<string, unknown>>;
      playlistTracks(id: string, options?: QishuiBusinessRequestOptions): Promise<Record<string, unknown>>;
      lyrics(id: string): Promise<QishuiLyricsResult>;
      songUrl(id: string, quality?: string): Promise<QishuiSongUrlResult>;
      comments(id: string, options?: QishuiBusinessRequestOptions): Promise<Record<string, unknown>>;
      createComment(id: string, content: string): Promise<Record<string, unknown>>;
      checkLiked(ids: string[]): Promise<Record<string, unknown>>;
      like(id: string, liked: boolean): Promise<Record<string, unknown>>;
      collectPlaylist(id: string, collected: boolean): Promise<Record<string, unknown>>;
      collectAlbum(id: string, collected: boolean): Promise<Record<string, unknown>>;
      addSong(playlistId: string, trackId: string): Promise<Record<string, unknown>>;
      recentPlay(id: string): Promise<Record<string, unknown>>;
    }>();
    const fixture: QishuiBusinessApi = { status: () => Promise.resolve({ provider: 'qishui', configured: false, loggedIn: false, webSession: false, publicCatalog: false, capabilities: {}, message: 'sample' }), search: () => Promise.resolve({ provider: 'qishui', songs: [], configured: false, loggedIn: false, publicCatalog: false, offset: 0, limit: 0, nextOffset: 0, hasMore: false, error: 'sample' }), feed: () => Promise.resolve({ provider: 'qishui', songs: [], configured: false, loggedIn: false, publicCatalog: false, offset: 0, limit: 0, nextOffset: 0, hasMore: false, error: 'sample' }), playlists: () => Promise.resolve({}), playlistTracks: () => Promise.resolve({}), lyrics: () => Promise.resolve({ provider: 'qishui', id: 'sample', auth: 'sample', lyric: 'sample', tlyric: 'sample' }), songUrl: () => Promise.resolve({ provider: 'qishui', playable: false, playbackMode: 'direct-url', url: 'sample', reason: 'sample', loggedIn: false, encrypted: false, membershipKnown: false, vipLevel: 'unknown', requiredTier: 'free', quality: 'sample', br: 0, duration: 0 }), comments: () => Promise.resolve({}), createComment: () => Promise.resolve({}), checkLiked: () => Promise.resolve({}), like: () => Promise.resolve({}), collectPlaylist: () => Promise.resolve({}), collectAlbum: () => Promise.resolve({}), addSong: () => Promise.resolve({}), recentPlay: () => Promise.resolve({}) };
    expect(fixture).toBeDefined();
  });
});
