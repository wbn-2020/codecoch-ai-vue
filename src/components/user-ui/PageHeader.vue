<template>
  <HeroBand class="cc-page-header" :tone="tone" :dot="dot">
    <template v-if="eyebrow || $slots.eyebrow" #eyebrow>
      <slot name="eyebrow">
        <component :is="icon" v-if="icon" :size="13" aria-hidden="true" />
        {{ eyebrow }}
      </slot>
    </template>
    <template #title>
      <slot name="title">{{ title }}</slot>
    </template>
    <template v-if="description || $slots.meta" #sub>
      <slot name="meta">{{ description }}</slot>
    </template>
    <slot />
    <template v-if="$slots.actions" #actions>
      <slot name="actions" />
    </template>
  </HeroBand>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

import HeroBand from '@/components/user-ui/HeroBand.vue'

withDefaults(defineProps<{
  title: string
  description?: string
  eyebrow?: string
  icon?: Component
  tone?: 'accent' | 'ai'
  dot?: boolean
}>(), { tone: 'accent' })
</script>

<style scoped lang="scss">
// 页头几何与排版统一由 HeroBand 承担，这里只保留调用方惯用的间距钩子
.cc-page-header {
  margin-bottom: 24px;
}
</style>
