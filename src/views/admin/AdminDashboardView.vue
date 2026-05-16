<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">
          <ShieldCheck :size="16" />
          <span>AI 内容治理中心</span>
        </div>
        <h1 class="admin-hero__title">管理后台 / 系统运营总览</h1>
        <p class="admin-hero__desc">
          管理题库、Prompt、AI 调用日志、系统配置和运营数据。当前页仅展示后端已返回的真实统计，
          未接入的趋势和治理事项保持空状态。
        </p>
      </div>
      <div class="admin-hero__actions">
        <el-button
          v-for="item in primaryLinks"
          :key="item.path"
          type="primary"
          plain
          @click="router.push(item.path)"
        >
          <component :is="item.icon" :size="15" />
          {{ item.label }}
        </el-button>
      </div>
    </section>

    <div class="admin-metric-grid" v-loading="loading">
      <article v-for="item in metrics" :key="item.label" class="admin-metric-card">
        <div class="admin-metric-card__icon">
          <component :is="item.icon" :size="18" />
        </div>
        <div>
          <p class="admin-metric-card__label">{{ item.label }}</p>
          <strong class="admin-metric-card__value">{{ formatMetric(item.value) }}</strong>
          <span class="admin-metric-card__hint">{{ item.hint }}</span>
        </div>
      </article>
    </div>

    <div class="admin-dashboard-grid">
      <section class="admin-panel admin-panel--wide">
        <div class="admin-panel__header">
          <div>
            <h2>趋势观察</h2>
            <p>近 7 日面试趋势、AI 调用趋势和题目分类分布需要聚合接口支持。</p>
          </div>
          <el-tag type="info" effect="plain">待接入</el-tag>
        </div>
        <div class="admin-empty-state">
          <LineChart :size="40" />
          <strong>暂无趋势数据</strong>
          <span>当前不写死趋势图，待后端提供聚合序列后再渲染真实图表。</span>
        </div>
      </section>

      <section class="admin-panel">
        <div class="admin-panel__header">
          <div>
            <h2>待处理事项</h2>
            <p>仅展示已有真实字段，其余标记为待接入。</p>
          </div>
        </div>
        <div class="admin-work-list">
          <div v-for="item in pendingItems" :key="item.label" class="admin-work-item">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
      </section>
    </div>

    <section class="admin-panel">
      <div class="admin-panel__header">
        <div>
          <h2>快捷入口</h2>
          <p>全部入口均指向当前已存在的管理端路由。</p>
        </div>
      </div>
      <div class="admin-link-grid">
        <button v-for="item in quickLinks" :key="item.path" class="admin-link-card" type="button" @click="router.push(item.path)">
          <component :is="item.icon" :size="20" />
          <span>{{ item.label }}</span>
          <small>{{ item.desc }}</small>
        </button>
      </div>
    </section>

    <el-alert
      v-if="overviewError"
      title="系统运营概览接口暂不可用，指标区已保留为空状态。"
      type="warning"
      show-icon
      :closable="false"
    />
  </div>
</template>

<script setup lang="ts">
import {
  Bot,
  FileText,
  FolderTree,
  LineChart,
  ListTree,
  MessageSquareCode,
  ScrollText,
  Settings,
  ShieldCheck,
  Tags,
  Users
} from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { getAdminSystemOverviewApi } from '@/api/system'
import type { AdminOverviewVO } from '@/types/system'

const router = useRouter()
const loading = ref(false)
const overviewReady = ref(false)
const overviewError = ref(false)
const overview = ref<AdminOverviewVO>({
  userCount: 0,
  questionCount: 0,
  resumeCount: 0,
  interviewCount: 0,
  completedInterviewCount: 0,
  aiCallCount: 0,
  aiCallFailedCount: 0,
  promptCount: 0,
  todayInterviewCount: 0,
  todayAiCallCount: 0
})

const primaryLinks = [
  { label: '题目管理', path: '/admin/questions', icon: ListTree },
  { label: 'Prompt 管理', path: '/admin/ai/prompts', icon: MessageSquareCode },
  { label: 'AI 日志', path: '/admin/ai/logs', icon: ScrollText },
  { label: '系统配置', path: '/admin/system/configs', icon: Settings }
]

const quickLinks = [
  { label: '题目管理', path: '/admin/questions', icon: ListTree, desc: '维护 Java 面试题库' },
  { label: '分类管理', path: '/admin/question-categories', icon: FolderTree, desc: '治理知识域结构' },
  { label: '标签管理', path: '/admin/question-tags', icon: Tags, desc: '维护检索标签' },
  { label: '题组管理', path: '/admin/question-groups', icon: FileText, desc: '组织关联题组' },
  { label: 'Prompt 管理', path: '/admin/ai/prompts', icon: MessageSquareCode, desc: '治理 AI 提示词' },
  { label: 'AI 调用日志', path: '/admin/ai/logs', icon: Bot, desc: '排查调用链路' },
  { label: '系统配置', path: '/admin/system/configs', icon: Settings, desc: '维护运行参数' }
]

const metrics = computed(() => [
  { label: '用户数', value: overview.value.userCount, hint: '来自系统概览接口', icon: Users },
  { label: '题目数', value: overview.value.questionCount, hint: '来自系统概览接口', icon: ListTree },
  { label: '简历数', value: overview.value.resumeCount, hint: '来自系统概览接口', icon: FileText },
  { label: '面试数', value: overview.value.interviewCount, hint: '来自系统概览接口', icon: ShieldCheck },
  { label: 'AI 调用数', value: overview.value.aiCallCount, hint: '来自系统概览接口', icon: Bot },
  { label: 'Prompt 数', value: overview.value.promptCount, hint: '来自系统概览接口', icon: MessageSquareCode },
  { label: 'AI 调用失败数', value: overview.value.aiCallFailedCount, hint: '来自系统概览接口', icon: ScrollText }
])

const pendingItems = computed(() => [
  { label: '待审核题目', value: '待接入' },
  { label: '疑似重复题', value: '待接入' },
  { label: '解析失败简历', value: '待接入' },
  { label: 'AI 调用失败', value: overviewReady.value ? String(overview.value.aiCallFailedCount) : '--' },
  { label: 'Prompt 待发布', value: '待接入' }
])

const formatMetric = (value: number) => (overviewReady.value ? value : '--')

const fetchOverview = async () => {
  loading.value = true
  overviewError.value = false
  try {
    overview.value = await getAdminSystemOverviewApi()
    overviewReady.value = true
  } catch {
    overviewReady.value = false
    overviewError.value = true
  } finally {
    loading.value = false
  }
}

onMounted(fetchOverview)
</script>
