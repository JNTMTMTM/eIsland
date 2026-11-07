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
 * @file moeKoe.ts
 * @description MoeKoe Music 逐字歌词拉取 — WebSocket 连接本地 MoeKoe 客户端 → 接收 KRC → 解密+逐字解析
 * @author 鸡哥
 * @docs https://github.com/cXp1r/lyricify-lyrics-provider-rs
 */

import { logger } from '../../../../../utils/logger';
import { decryptKRC } from '../decrypt/krc';
import { parseSyncedLines } from '../parsers';
import type { KaraokeLine } from '../types';

const LOG_TAG = '[KaraokeMoeKoe]';
const WS_URL = 'ws://127.0.0.1:6520';
const RECEIVE_TIMEOUT_MS = 2000;

interface WsEnvelope {
  type: string;
  data?: {
    lyricsData?: string;
  };
}

/**
 * 通过 WebSocket 从 MoeKoe Music 获取歌词数据
 */
function fetchLyricsViaWebSocket(): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        ws.close();
        resolve(null);
      }
    }, RECEIVE_TIMEOUT_MS);

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      logger.info(`${LOG_TAG} WebSocket 已连接`);
    };

    ws.onmessage = (event) => {
      if (settled) return;
      try {
        const text = typeof event.data === 'string' ? event.data : '';
        if (!text) return;

        const envelope: WsEnvelope = JSON.parse(text);
        if (envelope.type !== 'lyrics') return;

        const lyricsData = envelope.data?.lyricsData;
        if (!lyricsData) return;

        settled = true;
        clearTimeout(timeout);
        ws.close();
        resolve(lyricsData);
      } catch {
        // 非 JSON 消息忽略
      }
    };

    ws.onerror = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve(null);
      }
    };

    ws.onclose = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve(null);
      }
    };
  });
}

/**
 * MoeKoe Music 逐字歌词对外入口
 * MoeKoe 返回的歌词为酷狗 KRC 加密格式，需先解密再解析
 */
export async function fetchKaraokeFromMoeKoe(_title: string, _artist: string): Promise<KaraokeLine[] | null> {
  logger.info(`${LOG_TAG} 尝试通过 WebSocket 获取逐字歌词`);
  try {
    const krcContent = await fetchLyricsViaWebSocket();
    if (!krcContent) {
      logger.warn(`${LOG_TAG} 未收到歌词数据（MoeKoe 未运行或无歌词）`);
      return null;
    }

    // MoeKoe 返回的是酷狗 KRC 加密格式
    const plaintext = await decryptKRC(krcContent);
    // 酷狗 KRC 可能是 prefix 或 suffix 模式，用 auto 自动检测
    const lines = parseSyncedLines(plaintext, 'auto', 'relative');
    // 只用音节判断来源是否可用，混合内容中的普通行与纯符号行仍需显示。
    if (!lines.some((line) => line.syllables.length > 0)) {
      logger.warn(`${LOG_TAG} 解密成功但解析出 0 行逐字`);
      return null;
    }

    logger.info(`${LOG_TAG} 获取成功, 行数=${lines.length}`);
    return lines;
  } catch (err) {
    logger.error(`${LOG_TAG} 未预期异常:`, err);
    return null;
  }
}
