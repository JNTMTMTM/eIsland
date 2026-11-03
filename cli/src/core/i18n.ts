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
 * @file i18n.ts
 * @description CLI 国际化：语言检测、i18next 初始化与脚本说明查询
 * @description 语言优先级：--lang > EISLAND_LANG > 系统语言 > en-US
 * @description 文案位于根 i18n 文件的 devCli 命名空间，与应用共用一套翻译与完整性检查
 * @author 鸡哥
 */

import i18next from 'i18next';

// 仅具名导入 devCli，打包时摇树移除应用其余文案，避免 CLI 产物携带整份翻译。
import { devCli as enUS } from '../../../i18n/en-US.json';
import { devCli as jaJP } from '../../../i18n/ja-JP.json';
import { devCli as zhCN } from '../../../i18n/zh-CN.json';
import { devCli as zhTW } from '../../../i18n/zh-TW.json';

/** 支持的语言 */
export type Locale = 'zh-CN' | 'zh-TW' | 'en-US' | 'ja-JP';

const FALLBACK_LOCALE: Locale = 'en-US';
const instance = i18next.createInstance();

/**
 * 将任意语言标签归一化为支持的语言
 * @param tag - BCP 47 语言标签，如 `zh-Hant-HK`、`ja`、`en_GB.UTF-8`
 * @returns 支持的语言，无法识别时返回 null
 */
function normalizeLocale(tag: string | undefined): Locale | null {
  const value = tag?.trim().replace(/_/g, '-').split('.')[0].toLowerCase();
  if (!value) return null;
  // 繁体中文按书写系统或地区识别，其余中文统一使用简体。
  if (/^zh-(?:tw|hk|mo|hant)/.test(value)) return 'zh-TW';
  if (value.startsWith('zh')) return 'zh-CN';
  if (value.startsWith('ja')) return 'ja-JP';
  if (value.startsWith('en')) return 'en-US';
  return null;
}

/**
 * 按优先级检测输出语言
 * @param explicit - `--lang` 参数值
 * @param envLocale - `EISLAND_LANG` 环境变量值，默认读取 process.env.EISLAND_LANG
 * @param systemLocale - 系统语言标签，默认取 Intl.DateTimeFormat 解析出的系统语言
 * @returns 最终使用的语言
 */
export function detectLocale(
  explicit: string | undefined,
  envLocale: string | undefined = process.env.EISLAND_LANG,
  systemLocale: string = Intl.DateTimeFormat().resolvedOptions().locale,
): Locale {
  return normalizeLocale(explicit) ?? normalizeLocale(envLocale) ?? normalizeLocale(systemLocale) ?? FALLBACK_LOCALE;
}

/**
 * 初始化 i18next 实例
 * @param locale - 输出语言
 * @returns 初始化完成的 Promise
 */
export async function initI18n(locale: Locale): Promise<void> {
  await instance.init({
    lng: locale,
    fallbackLng: FALLBACK_LOCALE,
    // 脚本名包含 `:`，关闭命名空间分隔符以免 `devCli.scripts.test:main` 被拆分。
    nsSeparator: false,
    interpolation: { escapeValue: false },
    resources: {
      'zh-CN': { translation: { devCli: zhCN } },
      'zh-TW': { translation: { devCli: zhTW } },
      'en-US': { translation: { devCli: enUS } },
      'ja-JP': { translation: { devCli: jaJP } },
    },
  });
}

/**
 * 翻译文案
 * @param key - 翻译键
 * @param options - 插值变量
 * @returns 翻译后的文案
 */
export function t(key: string, options?: Record<string, unknown>): string {
  return instance.t(key, options);
}

/**
 * 获取脚本说明
 * @description 未翻译的脚本返回空字符串，由调用方回退展示原始命令，保证新增脚本立即可用
 * @param name - 脚本名
 * @returns 本地化说明
 */
export function describeScript(name: string): string {
  const key = `devCli.scripts.${name}`;
  return instance.exists(key) ? instance.t(key) : '';
}
