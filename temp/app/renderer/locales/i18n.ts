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
 * @description 仅在独立适配器 profile 中选择语言，不修改原客户端设置；词条来自仓库根 i18n 的 migrationAdapter 命名空间。
 * @author 鸡哥
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
// 具名导入只打包 migrationAdapter 命名空间，不把主程序词条带入适配器。
import { migrationAdapter as zhCN } from '../../../../i18n/zh-CN.json';
import { migrationAdapter as zhTW } from '../../../../i18n/zh-TW.json';
import { migrationAdapter as enUS } from '../../../../i18n/en-US.json';
import { migrationAdapter as jaJP } from '../../../../i18n/ja-JP.json';

let language = 'en-US';
if (navigator.language.startsWith('zh')) language = ['zh-TW', 'zh-HK'].includes(navigator.language) ? 'zh-TW' : 'zh-CN';
else if (navigator.language.startsWith('ja')) language = 'ja-JP';
i18n.use(initReactI18next).init({
  resources: { 'zh-CN': { translation: zhCN }, 'zh-TW': { translation: zhTW }, 'en-US': { translation: enUS }, 'ja-JP': { translation: jaJP } },
  lng: language, fallbackLng: 'en-US', initAsync: false, interpolation: { escapeValue: false },
}).catch(() => { document.documentElement.lang = 'en-US'; });
document.documentElement.lang = language;
export default i18n;
