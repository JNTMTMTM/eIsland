import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'eIsland Guide',
  description: 'eIsland 使用教程',
  lang: 'zh-CN',

  head: [
    ['link', { rel: 'icon', href: '/favicon.svg' }],
  ],
  appearance: 'force-dark',
  themeConfig: {
    logo: '/favicon.svg',

    nav: [
      { text: '首页', link: '/' },
    ],

    sidebar: {
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/JNTMTMTM/eIsland' },
    ],

    search: {
      provider: 'local',
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
})
