<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">管理首页</h1>
        <p class="page-subtitle">V1 第一阶段仅展示后台入口和基础统计占位，不接复杂看板。</p>
      </div>
    </div>

    <div class="metric-grid">
      <div v-for="item in metrics" :key="item.label" class="metric-card">
        <div class="metric-card__label">{{ item.label }}</div>
        <div class="metric-card__value">{{ item.value }}</div>
      </div>
    </div>

    <section class="content-card">
      <div class="content-card__body">
        <el-alert
          title="管理端第一阶段只打通用户、角色和静态菜单权限。题库、AI、系统配置页面先保持占位。"
          type="info"
          show-icon
          :closable="false"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const metrics = [
  { label: '用户数', value: 0 },
  { label: '题目数', value: 0 },
  { label: '面试数', value: 0 },
  { label: 'AI 调用数', value: 0 }
]
</script>
