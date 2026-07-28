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
