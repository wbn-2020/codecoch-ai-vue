<template>
  <el-menu
    ref="menuRef"
    class="layout-menu admin-sidebar-menu"
    :default-active="activePath"
    :collapse="collapsed"
    :unique-opened="true"
    router
    @select="handleSelect"
  >
    <template v-for="section in visibleSections" :key="section.key">
      <el-menu-item
        v-if="section.children.length === 1 && !section.forceGroup"
        :index="section.children[0].path"
      >
        <el-icon>
          <component :is="section.icon" />
        </el-icon>
        <template #title>{{ section.children[0].label }}</template>
      </el-menu-item>
      <el-sub-menu v-else :index="section.key">
        <template #title>
          <el-icon>
            <component :is="section.icon" />
          </el-icon>
          <span>{{ section.label }}</span>
        </template>
        <el-menu-item v-for="item in section.children" :key="item.path" :index="item.path">
          <el-icon>
            <component :is="item.icon" />
          </el-icon>
          <template #title>{{ item.label }}</template>
        </el-menu-item>
      </el-sub-menu>
    </template>
  </el-menu>
</template>

<script setup lang="ts">
import {
  Bell,
  ChatDotRound,
  Collection,
  Connection,
  Cpu,
  DataAnalysis,
  DataBoard,
  Document,
  Files,
  Folder,
  Key,
  List,
  Lock,
  Monitor,
  Operation,
  PriceTag,
  Setting,
  Share,
  Timer,
  UserFilled
} from '@element-plus/icons-vue'
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  collapsed?: boolean
}>()

const route = useRoute()
const authStore = useAuthStore()
const menuRef = ref<{ close: (index: string) => void }>()

interface AdminMenuItem {
  label: string
  path: string
  icon: unknown
  permissions: string[]
}

interface AdminMenuSection {
  key: string
  label: string
  icon: unknown
  forceGroup?: boolean
  children: AdminMenuItem[]
}

const sections: AdminMenuSection[] = [
  {
    key: 'dashboard',
    label: '概览',
    icon: DataBoard,
    children: [
      {
        label: '后台入口',
        path: '/admin',
        icon: DataBoard,
        permissions: ['admin:analytics:ai', 'admin:user:list', 'admin:question:list', 'admin:ai:log:list']
      }
    ]
  },
  {
    key: 'question-governance',
    label: '题库治理',
    icon: Collection,
    forceGroup: true,
    children: [
      { label: '题目管理', path: '/admin/questions', icon: Collection, permissions: ['admin:question:list'] },
      { label: '题目关系', path: '/admin/question-relations', icon: Share, permissions: ['admin:question:relation'] },
      { label: '分类管理', path: '/admin/question-categories', icon: Files, permissions: ['admin:question:category'] },
      { label: '标签管理', path: '/admin/question-tags', icon: PriceTag, permissions: ['admin:question:tag'] },
      { label: '问题组管理', path: '/admin/question-groups', icon: List, permissions: ['admin:question:group'] },
      { label: '行业模板', path: '/admin/industry-templates', icon: List, permissions: ['admin:industry-template:list'] }
    ]
  },
  {
    key: 'question-review',
    label: '题目审核',
    icon: DataAnalysis,
    forceGroup: true,
    children: [
      { label: 'AI 题目生成', path: '/admin/ai/questions/generate', icon: Operation, permissions: ['admin:question:generate'] },
      { label: '题目审核', path: '/admin/question-reviews', icon: DataAnalysis, permissions: ['admin:question:review'] },
      { label: '重复题审核', path: '/admin/question-duplicate-reviews', icon: Connection, permissions: ['admin:question:dedupe'] }
    ]
  },
  {
    key: 'ai-governance',
    label: 'AI 治理',
    icon: Operation,
    forceGroup: true,
    children: [
      { label: 'Prompt 模板', path: '/admin/ai/prompts', icon: Operation, permissions: ['admin:ai:prompt:list'] },
      { label: 'AI 调用日志', path: '/admin/ai/logs', icon: DataAnalysis, permissions: ['admin:ai:log:list'] },
      { label: 'AI 模型配置', path: '/admin/ai/models', icon: Cpu, permissions: ['admin:ai:model:list'] },
      { label: 'Prompt 回归', path: '/admin/ai/prompt-regression', icon: Operation, permissions: ['admin:agent:prompt-regression:list'] }
    ]
  },
  {
    key: 'operations',
    label: '运维观测',
    icon: Monitor,
    forceGroup: true,
    children: [
      { label: 'AI Ops 看板', path: '/admin/analytics/ai', icon: DataAnalysis, permissions: ['admin:analytics:ai'] },
      { label: 'Agent 效果分析', path: '/admin/analytics/agent', icon: DataAnalysis, permissions: ['admin:analytics:agent'] },
      { label: '指标字典', path: '/admin/analytics/metrics', icon: DataAnalysis, permissions: ['admin:analytics:agent'] },
      { label: '聚合任务', path: '/admin/analytics/jobs', icon: Timer, permissions: ['admin:analytics:agent'] },
      { label: '任务中心', path: '/admin/async-tasks', icon: Timer, permissions: ['admin:task:list'] },
      { label: 'Agent 运行', path: '/admin/agent/runs', icon: DataAnalysis, permissions: ['admin:agent:run:list'] },
      { label: 'Agent 任务', path: '/admin/agent/tasks', icon: Timer, permissions: ['admin:agent:task:list'] }
    ]
  },
  {
    key: 'content-assets',
    label: '内容资产',
    icon: Folder,
    forceGroup: true,
    children: [
      { label: '文件治理', path: '/admin/files', icon: Folder, permissions: ['admin:file:list'] },
      { label: '面试记录', path: '/admin/interviews', icon: ChatDotRound, permissions: ['admin:interview:list'] },
      { label: '面试报告', path: '/admin/interview-reports', icon: Document, permissions: ['admin:interview:report'] }
    ]
  },
  {
    key: 'identity',
    label: '用户与权限',
    icon: UserFilled,
    forceGroup: true,
    children: [
      { label: '用户管理', path: '/admin/users', icon: UserFilled, permissions: ['admin:user:list'] },
      { label: '角色管理', path: '/admin/roles', icon: Connection, permissions: ['admin:role:list'] },
      { label: '菜单权限', path: '/admin/menus', icon: Lock, permissions: ['admin:menu:list'] }
    ]
  },
  {
    key: 'system',
    label: '系统管理',
    icon: Setting,
    forceGroup: true,
    children: [
      { label: '通知管理', path: '/admin/notices', icon: Bell, permissions: ['admin:notice:list'] },
      { label: '操作日志', path: '/admin/operation-logs', icon: Document, permissions: ['admin:audit:operation-log'] },
      { label: '登录日志', path: '/admin/login-logs', icon: Key, permissions: ['admin:audit:login-log'] },
      { label: '慢 SQL 查询', path: '/admin/slow-sql-logs', icon: DataAnalysis, permissions: ['admin:audit:slow-sql-log'] },
      { label: '系统配置', path: '/admin/system/configs', icon: Setting, permissions: ['admin:system:config:list'] }
    ]
  }
]

const closeAllMenus = () => {
  if (!props.collapsed) return
  nextTick(() => {
    sections.forEach((section) => menuRef.value?.close(section.key))
  })
}

const handleSelect = () => {
  closeAllMenus()
}

const canSee = (item: AdminMenuItem) => authStore.hasAnyPermission(item.permissions)

const visibleSections = computed(() =>
  sections
    .map((section) => ({
      ...section,
      children: section.children.filter(canSee)
    }))
    .filter((section) => section.children.length)
)

const flatItems = computed(() => visibleSections.value.flatMap((section) => section.children))

const activePath = computed(() => {
  const matched = [...flatItems.value]
    .sort((a, b) => b.path.length - a.path.length)
    .find((item) => route.path === item.path || route.path.startsWith(`${item.path}/`))
  return matched?.path || route.path
})

watch(() => route.fullPath, closeAllMenus)
</script>

<style scoped lang="scss">
.admin-sidebar-menu {
  :deep(.el-sub-menu__title),
  :deep(.el-menu-item) {
    gap: 4px;
  }

  :deep(.el-sub-menu .el-menu-item) {
    min-width: 0;
    padding-left: 48px !important;
    font-size: 14px;
  }
}
</style>
