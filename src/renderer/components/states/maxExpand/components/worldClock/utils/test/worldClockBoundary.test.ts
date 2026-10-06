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
 * @file worldClockBoundary.test.ts
 * @description 世界时钟真实工具的损坏元信息、原生枚举和日期格式失败边界测试。
 * @author 鸡哥
 */

import { afterEach, expect, it, vi } from 'vitest';
import { buildTick, filterTimezoneOptions, getAllTimezoneOptions, getCityLabel, normalizeCities } from '../worldClockUtils';
import type { TFunction } from 'i18next';
const native = vi.hoisted(() => ({ supported: ['Etc/GMT+7'] }));
vi.mock('@multisystemsuite/timezone-engine-core', async (original) => ({
  ...await original<typeof import('@multisystemsuite/timezone-engine-core')>(),
  listSupportedTimezones: () => native.supported,
}));
afterEach(() => {
  native.supported = ['Etc/GMT+7'];
  vi.unstubAllGlobals();
});
it('非数组数据回退，旧字段不是字符串时采用 UTC 并重建排序', () => {
  expect(normalizeCities(null)).toEqual([]);
  expect(normalizeCities([{ timezone: 1, label: false }, { timezone: 'UTC', label: 1 }])).toEqual([
    { timezone: 'UTC', label: 'UTC', labelKey: undefined, order: 0 },
    { timezone: 'UTC', label: 'UTC', labelKey: undefined, order: 1 },
  ]);
});
it('原生支持但尚无翻译键的时区保留目录项，搜索没有键的城市采用原名称', () => {
  expect(getAllTimezoneOptions()).toContainEqual({ timezone: 'Etc/GMT+7', label: 'GMT+7', labelKey: '', countryCode: undefined });
  const options = [{ timezone: 'UTC', label: 'Custom', labelKey: '' }];
  const translate = ((key: string) => key) as TFunction;
  expect(filterTimezoneOptions(options, 'custom', translate)).toEqual(options);
  expect(getCityLabel({ timezone: 'Etc/GMT+7', label: 'Custom' }, translate)).toBe('Custom');
});
it('原生枚举缺失时过滤该运行时不支持的目录时区', () => {
  native.supported = [];
  const Original = Intl.DateTimeFormat;
  class LegacyFormatter extends Original {
    /** 模拟旧原生 ICU 尚未支持的目录时区。
     * @param args - 真实日期格式器参数。
     */
    constructor(...args: ConstructorParameters<typeof Intl.DateTimeFormat>) {
      if (args[1]?.timeZone === 'Africa/Abidjan') throw new RangeError('unsupported timezone');
      super(...args);
    }
  }
  vi.stubGlobal('Intl', { ...Intl, DateTimeFormat: LegacyFormatter });
  const options = getAllTimezoneOptions();
  expect(options.some((option) => option.timezone === 'Africa/Abidjan')).toBe(false);
  expect(options.some((option) => option.timezone === 'Asia/Shanghai')).toBe(true);
});
it('损坏的运行时语言不会中断实际时钟构建，日期格式回退为空', () => {
  const tick = buildTick({ timezone: 'UTC', label: 'UTC', order: 0 }, new Date('2026-01-02T03:04:05Z'), 'UTC', 'bad_locale');
  expect(tick.formattedDate).toBe('');
  expect(tick.formattedTime).toBeTruthy();
});
