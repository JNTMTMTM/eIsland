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
 * @file instrumental.ts
 * @description 纯音乐提示行：常规与逐字歌词源共用的文本、标记与识别。
 * @author 鸡哥
 */

import i18n from 'i18next';

/**
 * 获取当前界面语言的纯音乐提示文本
 * @returns 本地化提示文本
 */
export function instrumentalLyricText(): string {
  return i18n.t('songTab.lyrics.instrumental', { defaultValue: '纯音乐，请欣赏' });
}

/**
 * 判断歌词是否为纯音乐提示行；该行不是真实歌词，不参与校准，切换语言时需重新翻译
 * @param lines - 歌词行
 * @returns 仅包含一条纯音乐提示行时返回 true
 */
export function isInstrumentalLyrics(lines: ReadonlyArray<{ instrumental?: boolean }> | null | undefined): boolean {
  return lines?.length === 1 && lines[0].instrumental === true;
}
