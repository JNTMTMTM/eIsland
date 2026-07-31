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
 * @file config.mts
 * @description VitePress 站点配置
 * @author 鸡哥
 */

import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'eIsland Guide',
  description: 'eIsland 使用教程',
  lang: 'zh-CN',

  head: [
    ['link', { rel: 'icon', href: '/favicon.svg' }],
  ],
  appearance: 'force-dark',

  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      themeConfig: {
        nav: [
          { text: '首页', link: '/' },
          { text: '使用指南', link: '/guide/getting-started' },
        ],
        sidebar: {
          '/guide/': [
            {
              text: '使用指南',
              items: [
                { text: '快速开始', link: '/guide/getting-started' },
                { text: '搜索技能', link: '/guide/search' },
                { text: '音乐歌词显示', link: '/guide/lyrics' },
                { text: '语音助手', link: '/guide/voice' },
                { text: '快捷键设置', link: '/guide/keys' },
                { text: '透明度设置', link: '/guide/transparency' },
              ],
            },
          ],
        },
        outline: {
          level: [2, 3],
          label: '页面导航',
        },
        docFooter: {
          prev: '上一页',
          next: '下一页',
        },
        lastUpdated: {
          text: '最后更新于',
        },
        returnToTopLabel: '回到顶部',
        sidebarMenuLabel: '菜单',
        darkModeSwitchLabel: '主题',
      },
    },
    en: {
      label: 'English',
      lang: 'en-US',
      title: 'eIsland Guide',
      description: 'eIsland User Guide',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/en/' },
          { text: 'Guide', link: '/en/guide/getting-started' },
        ],
        sidebar: {
          '/en/guide/': [
            {
              text: 'User Guide',
              items: [
                { text: 'Getting Started', link: '/en/guide/getting-started' },
                { text: 'Search', link: '/en/guide/search' },
                { text: 'Synced Lyrics', link: '/en/guide/lyrics' },
                { text: 'Voice Assistant', link: '/en/guide/voice' },
                { text: 'Keyboard Shortcuts', link: '/en/guide/keys' },
                { text: 'Transparency', link: '/en/guide/transparency' },
              ],
            },
          ],
        },
        outline: {
          level: [2, 3],
          label: 'On this page',
        },
        docFooter: {
          prev: 'Previous',
          next: 'Next',
        },
        lastUpdated: {
          text: 'Last updated at',
        },
        returnToTopLabel: 'Return to top',
        sidebarMenuLabel: 'Menu',
        darkModeSwitchLabel: 'Theme',
      },
    },
  },

  themeConfig: {
    logo: '/favicon.svg',
    socialLinks: [
      { icon: 'github', link: 'https://github.com/JNTMTMTM/eIsland' },
    ],
    search: {
      provider: 'local',
    },
  },
})
