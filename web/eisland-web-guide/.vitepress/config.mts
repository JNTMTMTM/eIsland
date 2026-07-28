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
        ],
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
        ],
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
    sidebar: {},
    socialLinks: [
      { icon: 'github', link: 'https://github.com/JNTMTMTM/eIsland' },
    ],
    search: {
      provider: 'local',
    },
  },
})
