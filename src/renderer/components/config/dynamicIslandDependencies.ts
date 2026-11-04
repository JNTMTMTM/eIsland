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
 * @file dependencies.ts
 * @description 开源框架、依赖 & 项目配置
 * @author 鸡哥
 */

/** 依赖项接口 */
export interface DependencyItem {
  /** 显示名称 */
  name: string
  /** 链接地址（可选） */
  url?: string
}

/** 全部开源框架、依赖 & 项目 */
export const ALL_DEPENDENCIES: DependencyItem[] = [
  { name: 'Tauri' },
  { name: 'Rust' },
  { name: 'WebView2' },
  { name: 'React' },
  { name: 'React DOM' },
  { name: 'TypeScript' },
  { name: 'Vite' },
  { name: 'Zustand' },
  { name: 'i18next' },
  { name: 'react-i18next' },
  { name: 'Tailwind CSS' },
  { name: '@tailwindcss/vite' },
  { name: 'react-markdown' },
  { name: 'remark-gfm' },
  { name: 'react-datepicker' },
  { name: 'imapflow' },
  { name: 'mailparser' },
  { name: 'openmeteo' },
  { name: 'lunar-javascript' },
  { name: 'lyric-resolver' },
  { name: 'colorthief' },
  { name: 'fetch-installed-software' },
  { name: 'get-windows' },
  { name: 'uapi-sdk-typescript' },
  { name: 'lucide-react' },
  { name: '@vitejs/plugin-react' },
  { name: 'PostCSS' },
  { name: 'Autoprefixer' },
  { name: 'Mineradio', url: 'https://github.com/XxHuberrr/Mineradio' },
  { name: 'Lyrix', url: 'https://github.com/cXp1r/Lyrix' },
  { name: 'open-vibe-island', url: 'https://github.com/Octane0411/open-vibe-island' },
]
