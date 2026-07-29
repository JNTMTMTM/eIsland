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

const { frontmatter } = useData()
const isHome = frontmatter.value.layout === 'home'
</script>

<template>
  <WaveBackground v-if="isHome" />
  <DefaultTheme.Layout>
    <template #home-features-before>
      <div v-if="isHome" class="video-home">
        <video
          class="video-home__player"
          src="/video/sign.webm"
          autoplay
          muted
          playsinline
        />
      </div>
    </template>
  </DefaultTheme.Layout>
</template>

<style scoped>
.video-home {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(87vh - var(--vp-nav-height) - var(--vp-footer-height, 0px));
}

.video-home__player {
  max-width: 480px;
  width: 100%;
  border-radius: 12px;
}
</style>
