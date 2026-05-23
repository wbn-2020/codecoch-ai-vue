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
  Calendar,
  Collection,
  Compass,
  DataBoard,
  DocumentChecked,
  Files,
  Key,
  MagicStick,
  Medal,
  Reading,
  Star,
  TrendCharts,
  User
} from '@element-plus/icons-vue'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

defineProps<{
  collapsed?: boolean
}>()

const route = useRoute()

const menuItems = [
  { label: '工作台', path: '/dashboard', icon: DataBoard },
  { label: 'V3 驾驶舱', path: '/dashboard/v3', icon: DataBoard },
  { label: 'JobCoachAgent', path: '/agent/today', icon: MagicStick },
  { label: 'Agent 任务', path: '/agent/tasks', icon: Calendar },
  { label: '个人分析', path: '/analytics/personal', icon: TrendCharts },
  { label: '复盘中心', path: '/agent/reviews', icon: DocumentChecked },
  { label: '成长档案', path: '/growth/profile', icon: Medal },
  { label: '长期记忆', path: '/agent/memory', icon: MagicStick },
  { label: '个人知识库', path: '/knowledge', icon: Reading },
  { label: '简历版本', path: '/resume-versions', icon: Files },
  { label: '求职进度', path: '/applications', icon: Compass },
  { label: '岗位目标', path: '/job-targets', icon: Compass },
  { label: '简历匹配', path: '/resume-match', icon: Files },
  { label: '能力画像', path: '/skill-profile', icon: Medal },
  { label: '差距学习计划', path: '/study-plans/from-gap', icon: Reading },
  { label: '推荐题目', path: '/questions/recommendations', icon: Collection },
  { label: '题库', path: '/questions', icon: Collection },
  { label: '错题本', path: '/questions/wrong-records', icon: DocumentChecked },
  { label: '收藏题目', path: '/questions/favorites', icon: Star },
  { label: '简历', path: '/resumes', icon: Files },
  { label: '项目经历', path: '/projects', icon: Files },
  { label: '创建面试', path: '/interviews/create', icon: Compass },
  { label: '面试历史', path: '/interviews/history', icon: Medal },
  { label: '学习计划', path: '/study-plans', icon: Reading },
  { label: '每日任务', path: '/daily-tasks', icon: Calendar },
  { label: '薄弱点分析', path: '/weakness-analysis', icon: TrendCharts },
  { label: '通知中心', path: '/notifications', icon: Bell },
  { label: '修改密码', path: '/password', icon: Key },
  { label: '个人资料', path: '/profile', icon: User }
]

const activePath = computed(() => {
  if (route.path.startsWith('/dashboard/v3')) return '/dashboard/v3'
  if (route.path.startsWith('/agent/today') || route.path.startsWith('/agent/runs')) return '/agent/today'
  if (route.path.startsWith('/agent/tasks')) return '/agent/tasks'
  if (route.path.startsWith('/analytics/personal')) return '/analytics/personal'
  if (route.path.startsWith('/agent/reviews')) return '/agent/reviews'
  if (route.path.startsWith('/growth/profile') || route.path.startsWith('/growth/skills') || route.path.startsWith('/growth/readiness')) return '/growth/profile'
  if (route.path.startsWith('/agent/memory')) return '/agent/memory'
  if (route.path.startsWith('/knowledge')) return '/knowledge'
  if (route.path.startsWith('/resume-versions')) return '/resume-versions'
  if (route.path.startsWith('/applications')) return '/applications'
  if (route.path.startsWith('/job-targets')) return '/job-targets'
  if (route.path.startsWith('/resume-match')) return '/resume-match'
  if (route.path.startsWith('/skill-profile')) return '/skill-profile'
  if (route.path.startsWith('/study-plans/from-gap')) return '/study-plans/from-gap'
  if (route.path.startsWith('/questions/recommendations')) return '/questions/recommendations'
  if (route.path.startsWith('/questions/wrong-records')) return '/questions/wrong-records'
  if (route.path.startsWith('/questions/favorites')) return '/questions/favorites'
  if (route.path.startsWith('/questions')) return '/questions'
  if (route.path.startsWith('/resumes')) return '/resumes'
  if (route.path.startsWith('/projects')) return '/projects'
  if (route.path.startsWith('/study-plans')) return '/study-plans'
  if (route.path.startsWith('/daily-tasks')) return '/daily-tasks'
  if (route.path.startsWith('/weakness-analysis')) return '/weakness-analysis'
  if (route.path.startsWith('/notifications')) return '/notifications'
  if (route.path.startsWith('/password')) return '/password'
  if (route.path.startsWith('/interviews/history')) return '/interviews/history'
  if (route.path.startsWith('/interviews')) return '/interviews/create'
  return route.path
})
</script>
