<!--
  eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
  https://github.com/JNTMTMTM/eIsland

  Copyright (C) 2026 JNTMTMTM
  Copyright (C) 2026 pyisland.com

  Original author: JNTMTMTM[](https://github.com/JNTMTMTM)

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.
-->

<script setup>
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'
import WaveBackground from './components/WaveBackground.vue'

const { frontmatter, lang } = useData()
const isHome = frontmatter.value.layout === 'home'

const isEn = lang.value === 'en-US'

const actions = () => {
  if (isEn.value) {
    return [
      { text: 'Getting Started', link: '/en/guide/getting-started', theme: 'brand' },
      { text: 'Troubleshooting', link: '/en/guide/troubleshooting', theme: 'alt' },
    ]
  }
  return [
    { text: '快速开始', link: '/guide/getting-started', theme: 'alt' },
    { text: '进入官网', link: 'https://www.pyisland.com', theme: 'brand' },
  ]
}
</script>

<template>
  <WaveBackground v-if="isHome" />
  <DefaultTheme.Layout>
    <template #home-features-before>
      <div v-if="isHome" class="home-section">
        <div class="video-home">
          <video
            class="video-home__player"
            src="/video/sign.webm"
            autoplay
            muted
            playsinline
          />
        </div>
        <div class="home-actions">
          <a
            v-for="action in actions()"
            :key="action.link"
            :href="action.link"
            :class="['home-action-btn', `is-${action.theme}`]"
          >
            {{ action.text }}
          </a>
        </div>
      </div>
    </template>
  </DefaultTheme.Layout>
</template>

<style scoped>
.home-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  padding: 48px 0;
  min-height: calc(87vh - var(--vp-nav-height) - var(--vp-footer-height, 0px));
  justify-content: center;
}

.video-home__player {
  max-width: 480px;
  width: 100%;
  border-radius: 12px;
}

.home-actions {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
}

.home-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 32px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.home-action-btn.is-brand {
  background-color: var(--vp-brand-color);
  color: var(--vp-brand-color-text);
}

.home-action-btn.is-brand:hover {
  opacity: 0.9;
}

.home-action-btn.is-alt {
  background-color: transparent;
  color: var(--vp-text-1);
  border-color: var(--vp-divider);
}

.home-action-btn.is-alt:hover {
  border-color: var(--vp-text-1);
}
</style>
