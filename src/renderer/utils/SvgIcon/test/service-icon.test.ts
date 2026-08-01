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
 * @file service-icon.test.ts
 * @description unit test
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { ServiceIcon } from '../service-icon';

describe('ServiceIcon', () => {
  it('should contain expected keys', () => {
    expect(ServiceIcon).toHaveProperty('CLOUDFLARE');
    expect(ServiceIcon).toHaveProperty('ALIBABACLOUD');
    expect(ServiceIcon).toHaveProperty('TENCENTCLOUD');
  });

  it('all values should be strings starting with ./svg/services/ and ending with .svg', () => {
    Object.entries(ServiceIcon).forEach(([, value]) => {
      expect(typeof value).toBe('string');
      expect(value).toMatch(/^\.\/svg\/services\/.+\.svg$/);
    });
  });

  it('should contain exactly 3 keys', () => {
    expect(Object.keys(ServiceIcon)).toHaveLength(3);
  });
});
