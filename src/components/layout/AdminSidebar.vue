<template>
  <el-menu class="layout-menu" :default-active="activePath" :collapse="collapsed" router>
    <el-menu-item v-for="item in menuItems" :key="item.path" :index="item.path">
      <el-icon>
        <component :is="item.icon" />
      </el-icon>
      <template #title>{{ item.label }}</template>
    </el-menu-item>
  </el-menu>
</template>

<script setup lang="ts">
import {
  Bell,
  ChatDotRound,
  Collection,
  Connection,
  DataAnalysis,
  DataBoard,
  Document,
  Files,
  Folder,
  Key,
  List,
  Lock,
  Operation,
  PriceTag,
  Setting,
  Share,
  Timer,
  UserFilled
} from '@element-plus/icons-vue'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

defineProps<{
  collapsed?: boolean
}>()

const route = useRoute()
const authStore = useAuthStore()

interface AdminMenuItem {
  label: string
  path: string
  icon: unknown
  permissions: string[]
}

const allMenuItems = [
  { label: '文件治理', path: '/admin/files', icon: Folder, permissions: ['admin:file:list'] },
  { label: '管理首页', path: '/admin', icon: DataBoard, permissions: ['admin:v3'] },
  { label: '用户管理', path: '/admin/users', icon: UserFilled, permissions: ['admin:user:list'] },
  { label: '角色管理', path: '/admin/roles', icon: Connection, permissions: ['admin:role:list'] },
  { label: '题目管理', path: '/admin/questions', icon: Collection, permissions: ['admin:question:list'] },
  { label: 'AI 题目生成', path: '/admin/ai/questions/generate', icon: Operation, permissions: ['admin:question:generate'] },
  { label: '题目审核', path: '/admin/question-reviews', icon: DataAnalysis, permissions: ['admin:question:review'] },
  { label: '题目去重审核', path: '/admin/question-duplicate-reviews', icon: Connection, permissions: ['admin:question:dedupe'] },
  { label: '题目关系管理', path: '/admin/question-relations', icon: Share, permissions: ['admin:question:relation'] },
  { label: '分类管理', path: '/admin/question-categories', icon: Files, permissions: ['admin:question:category'] },
  { label: '标签管理', path: '/admin/question-tags', icon: PriceTag, permissions: ['admin:question:tag'] },
  { label: '问题组管理', path: '/admin/question-groups', icon: List, permissions: ['admin:question:group'] },
  { label: '行业模板', path: '/admin/industry-templates', icon: List, permissions: ['admin:industry-template:list'] },
  { label: 'Prompt 模板', path: '/admin/ai/prompts', icon: Operation, permissions: ['admin:ai:prompt:list'] },
  { label: 'AI 调用日志', path: '/admin/ai/logs', icon: DataAnalysis, permissions: ['admin:ai:log:list'] },
  { label: 'AI 模型配置', path: '/admin/ai/models', icon: Operation, permissions: ['admin:ai:model:list'] },
  { label: '菜单权限', path: '/admin/menus', icon: Lock, permissions: ['admin:menu:list'] },
  { label: '通知管理', path: '/admin/notices', icon: Bell, permissions: ['admin:notice:list'] },
  { label: '操作日志', path: '/admin/operation-logs', icon: Document, permissions: ['admin:audit:operation-log'] },
  { label: '登录日志', path: '/admin/login-logs', icon: Key, permissions: ['admin:audit:login-log'] },
  { label: '面试记录', path: '/admin/interviews', icon: ChatDotRound, permissions: ['admin:interview:list'] },
  { label: '面试报告', path: '/admin/interview-reports', icon: Document, permissions: ['admin:interview:report'] },
  { label: '任务中心', path: '/admin/async-tasks', icon: Timer, permissions: ['admin:task:list'] },
  { label: '系统配置', path: '/admin/system/configs', icon: Setting, permissions: ['admin:system:config:list'] }
] satisfies AdminMenuItem[]

const menuItems = computed(() => allMenuItems.filter((item) => authStore.hasAnyPermission(item.permissions)))

const activePath = computed(() => {
  const matched = [...menuItems.value]
    .sort((a, b) => b.path.length - a.path.length)
    .find((item) => route.path === item.path || route.path.startsWith(`${item.path}/`))
  return matched?.path || route.path
})
</script>
