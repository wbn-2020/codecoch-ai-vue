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
  Collection,
  Compass,
  DataBoard,
  DocumentChecked,
  Files,
  Medal,
  Reading,
  Star,
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
  { label: '题库', path: '/questions', icon: Collection },
  { label: '错题本', path: '/questions/wrong-records', icon: DocumentChecked },
  { label: '收藏题目', path: '/questions/favorites', icon: Star },
  { label: '简历', path: '/resumes', icon: Files },
  { label: '创建面试', path: '/interviews/create', icon: Compass },
  { label: '面试历史', path: '/interviews/history', icon: Medal },
  { label: '学习计划', path: '/study-plans', icon: Reading },
  { label: '个人资料', path: '/profile', icon: User }
]

const activePath = computed(() => {
  if (route.path.startsWith('/questions/wrong-records')) return '/questions/wrong-records'
  if (route.path.startsWith('/questions/favorites')) return '/questions/favorites'
  if (route.path.startsWith('/questions')) return '/questions'
  if (route.path.startsWith('/resumes')) return '/resumes'
  if (route.path.startsWith('/study-plans')) return '/study-plans'
  if (route.path.startsWith('/interviews/history')) return '/interviews/history'
  if (route.path.startsWith('/interviews')) return '/interviews/create'
  return route.path
})
</script>
