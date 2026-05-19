<template>
  <PendingIntegrationPanel
    title="菜单权限管理"
    eyebrow="RBAC Permission"
    description="菜单树和按钮权限会影响管理端可见性与接口授权。当前不开放编辑，待后端 RBAC 菜单接口和权限标识确认后再接入。"
    :api-items="[
      'GET /admin/menus',
      'POST /admin/menus',
      'PUT /admin/menus/{id}',
      'DELETE /admin/menus/{id}',
      'POST /admin/roles/{id}/menus'
    ]"
    :safe-links="[
      { label: '角色管理', to: '/admin/roles', type: 'primary' },
      { label: '用户管理', to: '/admin/users' }
    ]"
  />
</template>

<script setup lang="ts">
import PendingIntegrationPanel from '@/components/common/PendingIntegrationPanel.vue'
</script>
