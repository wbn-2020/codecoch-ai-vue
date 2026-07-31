<template>
  <el-alert
    class="trace-sensitive-notice"
    type="warning"
    :closable="false"
    show-icon
  >
    <template #title>敏感访问边界</template>
    <template #default>
      <div class="trace-sensitive-notice__body">
        <span>TraceCockpit 只展示预览、哈希、长度、可用性和权限提示。</span>
        <span>完整敏感内容仍需通过现有 POST 流程提交原因、确认敏感访问，并经过权限校验和审计记录。</span>
        <span v-if="permission">所需权限：{{ permission }}</span>
      </div>
    </template>
  </el-alert>
</template>

<script setup lang="ts">
defineProps<{
  permission?: string
}>()
</script>

<style scoped lang="scss">
.trace-sensitive-notice {
  margin-bottom: 16px;
}

.trace-sensitive-notice__body {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  line-height: 1.6;
}
</style>
