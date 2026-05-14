<template>
  <el-breadcrumb class="app-breadcrumb" separator="/">
    <el-breadcrumb-item :to="{ path: '/admin' }">首页</el-breadcrumb-item>
    <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.path" :to="item.current ? undefined : { path: item.path }">
      <span :class="{ 'is-current': item.current }">{{ item.title }}</span>
    </el-breadcrumb-item>
  </el-breadcrumb>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const breadcrumbs = computed(() => {
  return route.matched
    .filter((item) => item.path && item.path !== '/admin' && item.meta?.title)
    .map((item, index, list) => ({
      path: item.path.startsWith('/') ? item.path : `/${item.path}`,
      title: String(item.meta.title || item.name || item.path),
      current: index === list.length - 1
    }))
})
</script>

<style scoped lang="scss">
.app-breadcrumb {
  min-width: 0;
  font-size: 13px;
}

.is-current {
  color: var(--app-text);
  font-weight: 600;
}
</style>
