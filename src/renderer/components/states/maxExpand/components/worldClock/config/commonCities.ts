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
 * @file commonCities.ts
 * @description 常用城市目录；城市名称与 IANA 时区独立，避免虚构城市时区 ID
 * @author 鸡哥
 */

import type { TimezoneOption } from '../types/worldClockTypes';

/** 使用现有 IANA 时区的常用城市（同一时区仍只添加一个时钟）。 */
export const COMMON_CITY_OPTIONS: TimezoneOption[] = [
  { timezone: 'Asia/Shanghai', label: 'Beijing', labelKey: 'maxExpand.worldClock.cityLabels.Beijing' },
  { timezone: 'Asia/Shanghai', label: 'Guangzhou', labelKey: 'maxExpand.worldClock.cityLabels.Guangzhou' },
  { timezone: 'Asia/Shanghai', label: 'Shenzhen', labelKey: 'maxExpand.worldClock.cityLabels.Shenzhen' },
  { timezone: 'Asia/Shanghai', label: 'Chengdu', labelKey: 'maxExpand.worldClock.cityLabels.Chengdu' },
  { timezone: 'Asia/Shanghai', label: 'Chongqing', labelKey: 'maxExpand.worldClock.cityLabels.Chongqing' },
  { timezone: 'Asia/Shanghai', label: 'Harbin', labelKey: 'maxExpand.worldClock.cityLabels.Harbin' },
  { timezone: 'Asia/Shanghai', label: 'Hangzhou', labelKey: 'maxExpand.worldClock.cityLabels.Hangzhou' },
  { timezone: 'Asia/Shanghai', label: 'Nanjing', labelKey: 'maxExpand.worldClock.cityLabels.Nanjing' },
  { timezone: 'Asia/Shanghai', label: 'Wuhan', labelKey: 'maxExpand.worldClock.cityLabels.Wuhan' },
  { timezone: 'Asia/Shanghai', label: 'Xi\'an', labelKey: 'maxExpand.worldClock.cityLabels.Xian' },
  { timezone: 'Asia/Shanghai', label: 'Tianjin', labelKey: 'maxExpand.worldClock.cityLabels.Tianjin' },
  { timezone: 'Asia/Shanghai', label: 'Suzhou', labelKey: 'maxExpand.worldClock.cityLabels.Suzhou' },
  { timezone: 'Asia/Kolkata', label: 'New Delhi', labelKey: 'maxExpand.worldClock.cityLabels.New_Delhi' },
  { timezone: 'Asia/Kolkata', label: 'Mumbai', labelKey: 'maxExpand.worldClock.cityLabels.Mumbai' },
  { timezone: 'Asia/Kolkata', label: 'Bengaluru', labelKey: 'maxExpand.worldClock.cityLabels.Bengaluru' },
  { timezone: 'Asia/Kolkata', label: 'Chennai', labelKey: 'maxExpand.worldClock.cityLabels.Chennai' },
  { timezone: 'Asia/Dubai', label: 'Abu Dhabi', labelKey: 'maxExpand.worldClock.cityLabels.Abu_Dhabi' },
  { timezone: 'America/Los_Angeles', label: 'San Francisco', labelKey: 'maxExpand.worldClock.cityLabels.San_Francisco' },
  { timezone: 'America/Los_Angeles', label: 'Seattle', labelKey: 'maxExpand.worldClock.cityLabels.Seattle' },
  { timezone: 'America/Los_Angeles', label: 'Las Vegas', labelKey: 'maxExpand.worldClock.cityLabels.Las_Vegas' },
  { timezone: 'America/New_York', label: 'Washington, D.C.', labelKey: 'maxExpand.worldClock.cityLabels.Washington' },
  { timezone: 'America/New_York', label: 'Boston', labelKey: 'maxExpand.worldClock.cityLabels.Boston' },
  { timezone: 'America/New_York', label: 'Miami', labelKey: 'maxExpand.worldClock.cityLabels.Miami' },
  { timezone: 'America/New_York', label: 'Atlanta', labelKey: 'maxExpand.worldClock.cityLabels.Atlanta' },
  { timezone: 'America/Chicago', label: 'Houston', labelKey: 'maxExpand.worldClock.cityLabels.Houston' },
  { timezone: 'America/Chicago', label: 'Dallas', labelKey: 'maxExpand.worldClock.cityLabels.Dallas' },
  { timezone: 'America/Toronto', label: 'Ottawa', labelKey: 'maxExpand.worldClock.cityLabels.Ottawa' },
  { timezone: 'America/Toronto', label: 'Montreal', labelKey: 'maxExpand.worldClock.cityLabels.Montreal' },
  { timezone: 'America/Edmonton', label: 'Calgary', labelKey: 'maxExpand.worldClock.cityLabels.Calgary' },
  { timezone: 'America/Toronto', label: 'Quebec City', labelKey: 'maxExpand.worldClock.cityLabels.Quebec_City' },
  { timezone: 'America/Sao_Paulo', label: 'Rio de Janeiro', labelKey: 'maxExpand.worldClock.cityLabels.Rio_de_Janeiro' },
  { timezone: 'America/Sao_Paulo', label: 'Brasilia', labelKey: 'maxExpand.worldClock.cityLabels.Brasilia' },
  { timezone: 'Pacific/Auckland', label: 'Wellington', labelKey: 'maxExpand.worldClock.cityLabels.Wellington' },
  { timezone: 'Australia/Sydney', label: 'Canberra', labelKey: 'maxExpand.worldClock.cityLabels.Canberra' },
  { timezone: 'Europe/Berlin', label: 'Frankfurt', labelKey: 'maxExpand.worldClock.cityLabels.Frankfurt' },
  { timezone: 'Europe/Berlin', label: 'Munich', labelKey: 'maxExpand.worldClock.cityLabels.Munich' },
  { timezone: 'Europe/Rome', label: 'Milan', labelKey: 'maxExpand.worldClock.cityLabels.Milan' },
  { timezone: 'Europe/Madrid', label: 'Barcelona', labelKey: 'maxExpand.worldClock.cityLabels.Barcelona' },
  { timezone: 'Europe/London', label: 'Manchester', labelKey: 'maxExpand.worldClock.cityLabels.Manchester' },
  { timezone: 'Europe/Zurich', label: 'Geneva', labelKey: 'maxExpand.worldClock.cityLabels.Geneva' },
  { timezone: 'Africa/Johannesburg', label: 'Cape Town', labelKey: 'maxExpand.worldClock.cityLabels.Cape_Town' },
];
