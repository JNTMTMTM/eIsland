/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM / pyisland.com
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
/**
 * @file smoke.cjs
 * @description 仅读取真实系统媒体状态，不发送播放命令或创建测试媒体会话。
 * @author 鸡哥
 */
// eslint-disable-next-line import-x/extensions -- CommonJS 使用无扩展名路径，同名 .d.ts 使解析器误判扩展名。
const { MediaClient } = require('../index');

/**
 * 输出当前歌曲元数据与播放状态；无播放源不证明权限可用。
 * @returns 查询和输出完成后释放客户端。
 */
async function main() {
  const client = new MediaClient();
  try {
    const status = await client.refresh();
    console.log(JSON.stringify({
      platform: process.platform,
      arch: process.arch,
      napi: process.versions.napi,
      isAvailable: status.isAvailable,
      sourceAppId: status.sourceAppUserModelId,
      title: status.title,
      artist: status.artist,
      albumTitle: status.albumTitle,
      albumArtist: status.albumArtist,
      trackNumber: status.trackNumber,
      genres: status.genres,
      hasArtwork: Boolean(status.thumbnail),
      thumbnailPreview: status.thumbnail
        ? `${status.thumbnail.slice(0, 120)}${status.thumbnail.length > 120 ? '...' : ''}`
        : null,
      thumbnailLength: status.thumbnail?.length ?? 0,
      playbackStatus: status.playbackStatus,
      playbackRate: status.playbackRate,
      isShuffleActive: status.isShuffleActive,
      repeatMode: status.repeatMode,
      durationSeconds: status.timeline?.endTime ?? null,
      positionSeconds: status.timeline?.position ?? null,
    }, null, 2));
    if (!status.isAvailable) console.log('No observable media. Play media manually and rerun to verify access.');
  } finally {
    client.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
