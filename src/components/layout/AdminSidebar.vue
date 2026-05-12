<template>
  <el-menu class="layout-menu" :default-active="activePath" router>
    <el-menu-item v-for="item in menuItems" :key="item.path" :index="item.path">
      <el-icon>
        <component :is="item.icon" />
      </el-icon>
      <span>{{ item.label }}</span>
    </el-menu-item>
  </el-menu>
</template>

<script setup lang="ts">
import {
  Collection,
  Connection,
  DataAnalysis,
  DataBoard,
  Files,
  List,
  Operation,
  PriceTag,
  Setting,
  UserFilled
} from '@element-plus/icons-vue'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const menuItems = [
  { label: '管理首页', path: '/admin', icon: DataBoard },
  { label: '用户管理', path: '/admin/users', icon: UserFilled },
  { label: '角色管理', path: '/admin/roles', icon: Connection },
  { label: '题目管理', path: '/admin/questions', icon: Collection },
  { label: '分类管理', path: '/admin/question-categories', icon: Files },
  { label: '标签管理', path: '/admin/question-tags', icon: PriceTag },
  { label: '问题组管理', path: '/admin/question-groups', icon: List },
  { label: 'Prompt 模板', path: '/admin/ai/prompts', icon: Operation },
  { label: 'AI 调用日志', path: '/admin/ai/logs', icon: DataAnalysis },
  { label: '系统配置', path: '/admin/system/configs', icon: Setting }
]

const activePath = computed(() => {
  const matched = [...menuItems]
    .sort((a, b) => b.path.length - a.path.length)
    .find((item) => route.path === item.path || route.path.startsWith(`${item.path}/`))
  return matched?.path || route.path
})
</script>
