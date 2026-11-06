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
 * @file i18n.test.ts
 * @description 验证语言检测、脚本说明查询，并约束根 package.json 每条脚本在四种语言中都有说明
 * @author 鸡哥
 */

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { devCli as enUS } from '../../../../i18n/en-US.json';
import { devCli as jaJP } from '../../../../i18n/ja-JP.json';
import { devCli as zhCN } from '../../../../i18n/zh-CN.json';
import { devCli as zhTW } from '../../../../i18n/zh-TW.json';
import { describeScript, detectLocale, initI18n, t } from '../i18n';

const locales = { 'en-US': enUS, 'ja-JP': jaJP, 'zh-CN': zhCN, 'zh-TW': zhTW };
const rootPackage = JSON.parse(readFileSync(new URL('../../../../package.json', import.meta.url), 'utf8')) as {
  scripts: Record<string, string>;
};

describe('detectLocale', () => {
  it('按 --lang、环境变量、系统语言的优先级选择', () => {
    expect(detectLocale('ja', 'zh-CN', 'en-US')).toBe('ja-JP');
    expect(detectLocale(undefined, 'zh_TW.UTF-8', 'en-US')).toBe('zh-TW');
    expect(detectLocale(undefined, undefined, 'zh-Hans-CN')).toBe('zh-CN');
  });

  it('繁体地区与书写系统映射为 zh-TW', () => {
    expect(detectLocale('zh-HK')).toBe('zh-TW');
    expect(detectLocale('zh-Hant')).toBe('zh-TW');
  });

  it('无法识别的语言依次回退，最终使用 en-US', () => {
    expect(detectLocale('fr-FR', 'ja-JP', 'en-US')).toBe('ja-JP');
    expect(detectLocale('fr-FR', 'de-DE', 'ko-KR')).toBe('en-US');
  });
});

describe('翻译资源', () => {
  it.each(Object.entries(locales))('%s 为根 package.json 的每条脚本提供说明', (locale, data) => {
    const described = Object.keys(data.scripts);
    expect(Object.keys(rootPackage.scripts).filter((name) => !described.includes(name))).toEqual([]);
  });

  it.each(Object.entries(locales))('%s 区分完整原生发布、已有产物上传和 MinIO 上传', (locale, data) => {
    expect(data.scripts.package).toContain('Tauri');
    (['release', 'release:upload', 'release:upload-only'] as const).forEach((name) => {
      expect(data.scripts[name]).toContain('Tauri');
      expect(data.scripts[name]).toContain('AWS');
      expect(data.scripts[name]).toContain('ESA');
      expect(data.scripts[name]).not.toMatch(/弃用|棄用|Deprecated|非推奨/);
    });
    expect(data.scripts['release:upload-minio']).toContain('MinIO');
    expect(data.scripts['release:upload-minio']).toContain('ESA');
    expect(data.scripts['release:upload-minio']).not.toContain('AWS');
    expect(data.scripts['release:upload-minio']).not.toMatch(/弃用|棄用|Deprecated|非推奨/);
  });

  it('按语言返回脚本说明与插值文案', async () => {
    await initI18n('zh-CN');
    expect(describeScript('test:main')).toBe(zhCN.scripts['test:main']);
    expect(t('devCli.errors.unknownScript', { name: 'x' })).toBe('未知脚本 "x"。');
    await initI18n('en-US');
    expect(describeScript('test:main')).toBe(enUS.scripts['test:main']);
  });

  it('未翻译的脚本返回空字符串', async () => {
    await initI18n('en-US');
    expect(describeScript('not:a:script')).toBe('');
  });
});
