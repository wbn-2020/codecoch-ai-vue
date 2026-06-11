<template>
  <div class="feature-unavailable-page">
    <AppState
      type="disabled"
      title="该能力暂未开放"
      :description="description"
    >
      <div class="feature-contract">
        <strong>开通条件</strong>
        <span>{{ availabilityText }}</span>
      </div>
      <div class="feature-actions">
        <el-button
          v-for="action in actions"
          :key="action.to"
          :type="action.type || 'default'"
          @click="router.push(action.to)"
        >
          {{ action.label }}
        </el-button>
      </div>
    </AppState>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppState from '@/components/common/AppState.vue'

const route = useRoute()
const router = useRouter()

type FeatureAction = {
  label: string
  to: string
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
}

const featureTitle = computed(() => typeof route.query.title === 'string' ? route.query.title : '')

const capabilityMap: Record<string, { availability: string; actions: FeatureAction[] }> = {
  每日复盘: {
    availability: '需要先完成或跳过今日任务，并由管理员开放复盘入口后再使用。',
    actions: [
      { label: '去今日任务', to: '/agent/today', type: 'primary' },
      { label: '查看任务中心', to: '/agent/tasks' }
    ]
  },
  成长画像: {
    availability: '需要连续训练、任务完成和画像聚合数据达到可解释范围后再开放。',
    actions: [
      { label: '查看训练分析', to: '/analytics/personal', type: 'primary' },
      { label: '去今日任务', to: '/agent/today' }
    ]
  },
  技能趋势: {
    availability: '需要多天题库、面试或今日任务记录沉淀出技能标签后再开放。',
    actions: [
      { label: '进入题库训练', to: '/questions/recommendations', type: 'primary' },
      { label: '查看训练分析', to: '/analytics/personal' }
    ]
  },
  就绪度趋势: {
    availability: '需要今日任务完成率、计划生成结果和复盘信号稳定后再开放。',
    actions: [
      { label: '生成今日计划', to: '/agent/today', type: 'primary' },
      { label: '查看训练分析', to: '/analytics/personal' }
    ]
  },
  长期记忆: {
    availability: '需要管理员开放长期记忆入口，并确认记忆保存、停用和删除都有清晰记录后再使用。',
    actions: [
      { label: '去今日任务', to: '/agent/today', type: 'primary' },
      { label: '查看面试历史', to: '/interviews/history' }
    ]
  },
  个人知识库: {
    availability: '需要管理员开放个人知识库入口，并确认资料整理、检索和删除恢复流程稳定后再使用。',
    actions: [
      { label: '整理项目经历', to: '/projects', type: 'primary' },
      { label: '管理简历资料', to: '/resumes/manage' }
    ]
  },
  简历版本: {
    availability: '需要先有可用简历，并由管理员开放版本保存、恢复和操作记录能力后再使用。',
    actions: [
      { label: '管理简历', to: '/resumes/manage', type: 'primary' },
      { label: '简历与岗位', to: '/resumes' }
    ]
  },
  投递管理: {
    availability: '需要岗位目标、简历匹配和投递状态记录都准备好后再开放。',
    actions: [
      { label: '维护岗位目标', to: '/job-targets', type: 'primary' },
      { label: '查看简历匹配', to: '/resume-match' }
    ]
  }
}

const currentCapability = computed(() => capabilityMap[featureTitle.value])

const description = computed(() => {
  return featureTitle.value
    ? `${featureTitle.value} 仍在准备中，正式开放后会出现在导航中。`
    : '该功能仍在准备中，正式开放后会出现在导航中。'
})

const availabilityText = computed(() =>
  currentCapability.value?.availability || '需要管理员开放对应入口，并完成开通范围、权限和数据准备后再使用。'
)

const actions = computed<FeatureAction[]>(() =>
  currentCapability.value?.actions || [
    { label: '回到今日任务', to: '/agent/today', type: 'primary' },
    { label: '回到今日计划', to: '/dashboard' }
  ]
)
</script>

<style scoped lang="scss">
.feature-unavailable-page {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 24px;
  background: var(--app-bg);
}

.feature-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
}

.feature-contract {
  display: grid;
  gap: 6px;
  width: min(100%, 560px);
  margin: 14px auto 16px;
  padding: 12px 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.08);
  text-align: left;

  strong {
    color: var(--app-text);
    font-size: 13px;
  }

  span {
    color: var(--app-text-muted);
    line-height: 1.7;
  }
}
</style>
