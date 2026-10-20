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
 * @file glassNavbar.tsx
 * @description 顶部毛玻璃导航栏组件
 * @author 鸡哥
 */

import '../styles/GlassNavbar.css'

/**
 * 渲染品牌导航栏。
 * @returns 品牌导航栏。
 */
function GlassNavbar() {
  return (
    <header className="glass-navbar">
      <img className="glass-navbar__brand" src="/eisland-logo-white-script-black.png" alt="eIsland" height="24" />
    </header>
  )
}

export default GlassNavbar
