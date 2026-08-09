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
 * @file musicBeatSource.ts
 * @description 将 SMTC 播放源标识解析为对应的活动音频进程。
 * @author 鸡哥
 */

export interface MusicAudioProcess {
  processId: number;
  processName: string | null;
  displayName: string | null;
}

const MUSIC_SOURCE_ALIAS_GROUPS: readonly (readonly string[])[] = [
  ['spotify', 'spotifymusic'],
  ['汽水音乐', 'sodamusic', 'qishui', 'qishuimusic', 'douyinmusic'],
  ['qqmusic', 'tencentqqmusic', 'QQMusic'],
  ['cloudmusic', 'neteasecloudmusic', 'orpheus'],
  ['kugou', 'kugoumusic'],
  ['kuwo', 'kuwomusic'],
  ['applemusic', 'applemusicwin'],
  ['zunemusic', 'groovemusic', 'musicui'],
  ['chrome', 'googlechrome'],
  ['msedge', 'microsoftedge'],
  ['firefox', 'mozillafirefox'],
];

/**
 * 标准化播放器标识。
 * @param value - SMTC 源、进程名或音频会话显示名。
 * @returns 仅包含小写字母和数字的标识。
 */
export function normalizeMusicSourceId(value: string): string {
  return value.toLowerCase().replace(/\.exe\b/g, '').replace(/[^a-z0-9]/g, '');
}

function matchesAliasGroup(sourceId: string, candidateId: string): boolean {
  return MUSIC_SOURCE_ALIAS_GROUPS.some((aliases) => {
    const sourceMatched = aliases.some((alias) => sourceId.includes(alias));
    const candidateMatched = aliases.some((alias) => candidateId.includes(alias));
    return sourceMatched && candidateMatched;
  });
}

/**
 * 解析与 SMTC 当前源对应的活动音频进程。
 * @description 名称无法关联时，仅在候选唯一的情况下回退，避免监听到其他同时发声的程序。
 * @param sourceAppId - SMTC 当前锁定的 Source App ID 或 AUMID。
 * @param processes - 当前活动音频进程列表。
 * @returns 匹配到的音频进程；无法安全确定时返回 undefined。
 */
export function resolveMusicAudioProcess(
  sourceAppId: string,
  processes: readonly MusicAudioProcess[],
): MusicAudioProcess | undefined {
  const normalizedSourceId = normalizeMusicSourceId(sourceAppId);
  const directMatch = processes.find((process) => {
    const processName = normalizeMusicSourceId(process.processName ?? '');
    const displayName = normalizeMusicSourceId(process.displayName ?? '');
    return Boolean(
      (processName && (normalizedSourceId.includes(processName) || processName.includes(normalizedSourceId)))
      || (displayName && (normalizedSourceId.includes(displayName) || displayName.includes(normalizedSourceId))),
    );
  });
  if (directMatch) return directMatch;

  const aliasMatch = processes.find((process) => {
    const processName = normalizeMusicSourceId(process.processName ?? '');
    const displayName = normalizeMusicSourceId(process.displayName ?? '');
    return matchesAliasGroup(normalizedSourceId, processName)
      || matchesAliasGroup(normalizedSourceId, displayName);
  });
  if (aliasMatch) return aliasMatch;

  return processes.length === 1 ? processes[0] : undefined;
}