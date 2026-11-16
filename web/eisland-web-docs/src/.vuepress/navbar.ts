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
 * @file navbar.ts
 * @description VuePress 导航栏配置
 * @author 鸡哥
 */

import { navbar } from "vuepress-theme-hope";

export default navbar([
  { text: "HOME", link: "/", icon: "house" },
  { text: "OVERALL", link: "/introduction/", icon: "book-open" },
  { text: "DEVELOPER", link: "/developer/", icon: "code" },
  { text: "[API] NATIVE", link: "/api-plugins/", icon: "plug" },
  { text: "[API] BACKEND", link: "/api-backend/", icon: "server" },
  { text: "[API] FRONTEND", link: "/api-frontend/", icon: "display" },
  { text: "GitHub", link: "https://github.com/JNTMTMTM/eIsland", icon: "fa6-brands:github" },
]);
