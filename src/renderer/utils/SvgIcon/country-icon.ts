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
 * @file country-icon.ts
 * @description 国旗图标映射与解析工具
 * @author 鸡哥
 */

const chinaIcon = './svg/countries/CHN.svg';
const usaIcon = './svg/countries/USA.svg';
const japanIcon = './svg/countries/JP.svg';
const koreaIcon = './svg/countries/KR.svg';
const franceIcon = './svg/countries/FR.svg';
const germanyIcon = './svg/countries/DE.svg';
const spainIcon = './svg/countries/ES.svg';
const russiaIcon = './svg/countries/RU.svg';

export const COUNTRY_ALIASES: Record<string, string> = {
  cn: 'CHN',
  china: 'CHN',
  zh: 'CHN',
  'zh-cn': 'CHN',
  'zh-tw': 'CHN',
  us: 'USA',
  usa: 'USA',
  en: 'USA',
  'en-us': 'USA',
  jp: 'JP',
  japan: 'JP',
  ja: 'JP',
  'ja-jp': 'JP',
  kr: 'KR',
  korea: 'KR',
  ko: 'KR',
  fr: 'FR',
  france: 'FR',
  de: 'DE',
  germany: 'DE',
  es: 'ES',
  spain: 'ES',
  ru: 'RU',
  russia: 'RU',
};

export const CountryIcon = {
  CHN: chinaIcon,
  USA: usaIcon,
  JP: japanIcon,
  KR: koreaIcon,
  FR: franceIcon,
  DE: germanyIcon,
  ES: spainIcon,
  RU: russiaIcon,
} as const;

export type CountryIconKey = keyof typeof CountryIcon;

/** 将原始国家/语言代码解析为标准化的 CountryIcon 标识。 */
export function resolveCountryCode(rawCode: string): string {
  const raw = (rawCode ?? '').toLowerCase();
  if (!raw) return '';
  return COUNTRY_ALIASES[raw] ?? raw.toUpperCase();
}

/** 根据国家/语言代码解析对应的国旗 SVG 资源路径。 */
export function resolveCountryIcon(rawCode: string): string | undefined {
  const code = resolveCountryCode(rawCode);
  return CountryIcon[code as CountryIconKey];
}
