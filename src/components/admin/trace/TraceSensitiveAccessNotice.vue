<template>
  <el-alert
    class="trace-sensitive-notice"
    type="warning"
    :closable="false"
    show-icon
  >
    <template #title>Sensitive access boundary</template>
    <template #default>
      <div class="trace-sensitive-notice__body">
        <span>TraceCockpit only shows preview, hash, length, availability, and permission hints.</span>
        <span>Full sensitive content stays behind the existing POST flow with reason, confirmSensitiveAccess, permission checks, and audit logging.</span>
        <span v-if="permission">Required permission: {{ permission }}</span>
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
