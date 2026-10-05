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
 * @file public-assets.test.ts
 * @description 验证嵌套 HTML 入口在开发与 file 协议下均能定位公共图标资源。
 * @author 鸡哥
 */

import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { AgentIcon } from '../agent-icon';
import { CalculatorIcon } from '../calculator-icon';
import { CountryIcon } from '../country-icon';
import { DevIcon } from '../dev-icon';
import { SvgIcon } from '../eisland-icon';
import { PlayerIcon } from '../player-icon';
import { ServiceIcon } from '../service-icon';
import { GifIcon } from '../../GifIcon/gif-icon';
import { getWeatherIconPath, getWeatherSmallIconPath } from '../../../components/states/hover/pages/weather/utils/weatherUtils';

const rendererRoot = fileURLToPath(new URL('../../../', import.meta.url));
const publicRoot = resolve(rendererRoot, 'public');
const pages = readdirSync(resolve(rendererRoot, 'html')).filter((name) => name.endsWith('.html'));
const iconPaths = [
  ...Object.values(AgentIcon),
  ...Object.values(CalculatorIcon),
  ...Object.values(CountryIcon),
  ...Object.values(DevIcon),
  ...Object.values(SvgIcon),
  ...Object.values(PlayerIcon),
  ...Object.values(ServiceIcon),
  ...Object.values(GifIcon),
  getWeatherIconPath(0, true),
  getWeatherIconPath(0, false),
  getWeatherSmallIconPath(0, true),
  getWeatherSmallIconPath(0, false),
];

describe.each(pages)('public icons from html/%s', (page) => {
  it('resolves development URLs to existing public files', () => {
    iconPaths.forEach((iconPath) => {
      const url = new URL(iconPath, `http://localhost:5173/html/${page}`);
      const assetPath = resolve(publicRoot, `.${url.pathname}`);
      expect(existsSync(assetPath), `${iconPath} resolves to ${url.pathname}`).toBe(true);
    });
  });

  it('resolves packaged file URLs beside the html directory', () => {
    iconPaths.forEach((iconPath) => {
      const pageUrl = pathToFileURL(resolve(rendererRoot, 'html', page));
      const url = new URL(iconPath, pageUrl);
      // public 的内容在打包时复制到 renderer 根目录，不能落入 html 或磁盘根目录。
      const assetUrl = pathToFileURL(resolve(rendererRoot, iconPath.replace(/^(?:\.\.\/|\.\/|\/)/, '')));
      expect(url.href, iconPath).toBe(assetUrl.href);
      expect(existsSync(resolve(publicRoot, iconPath.replace(/^(?:\.\.\/|\.\/|\/)/, ''))), iconPath).toBe(true);
    });
  });
});
