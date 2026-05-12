<template>
  <section class="content-card">
    <div class="placeholder-panel">
      <el-icon class="placeholder-panel__icon" :size="36">
        <component :is="icon" />
      </el-icon>
      <h1 class="placeholder-panel__title">{{ title }}</h1>
      <p class="placeholder-panel__desc">{{ description }}</p>
      <el-tag v-if="tag" class="placeholder-panel__tag" type="info" effect="plain">
        {{ tag }}
      </el-tag>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Document } from '@element-plus/icons-vue'
import type { Component } from 'vue'

withDefaults(
  defineProps<{
    title: string
    description: string
    tag?: string
    icon?: Component
  }>(),
  {
    tag: 'V1 后续阶段',
    icon: Document
  }
)
</script>

<style scoped lang="scss">
.placeholder-panel__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  color: var(--app-primary);
  border-radius: 8px;
  background: var(--app-primary-soft);
}

.placeholder-panel__tag {
  margin-top: 18px;
}
</style>
