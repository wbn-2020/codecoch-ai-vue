<template>
  <el-dialog
    :model-value="visible"
    title="AI 教练建议"
    width="520px"
    class="agent-coach-dialog"
    @update:model-value="$emit('update:visible', $event)"
  >
    <div v-if="task" class="coach-task-context">
      <span>{{ actionLabel }}</span>
      <strong>{{ task.title || `任务 ${task.id}` }}</strong>
      <small v-if="task.relatedSkillName">{{ task.relatedSkillName }}</small>
    </div>

    <div v-if="loading" class="coach-state">
      <el-skeleton :rows="4" animated />
      <p>AI 正在基于当前任务上下文生成建议，不会展示原始 prompt 或隐私字段。</p>
    </div>

    <el-alert
      v-else-if="canceled"
      type="warning"
      title="本次 AI 请求已取消"
      description="你可以稍后重新点击任务中的 AI 教练入口。"
      show-icon
      :closable="false"
    />

    <el-alert
      v-else-if="errorMessage"
      type="error"
      title="AI 教练暂时不可用"
      :description="errorMessage"
      show-icon
      :closable="false"
    />

    <el-empty v-else-if="!result" description="暂无 AI 教练结果" />

    <div v-else class="coach-result">
      <p class="coach-summary">{{ result.summary || 'AI 已给出任务建议。' }}</p>
      <ol v-if="result.reasons?.length" class="coach-reasons">
        <li v-for="reason in result.reasons" :key="reason">{{ reason }}</li>
      </ol>
      <p v-else class="coach-empty">当前资料较少，先按任务入口完成一个可验证动作。</p>
      <div class="coach-meta">
        <el-tag size="small" effect="plain">{{ result.resultSource || 'FALLBACK' }}</el-tag>
        <span v-if="result.latencyMs != null">{{ result.latencyMs }}ms</span>
        <span v-if="result.estimatedCost != null">cost {{ result.estimatedCost }}</span>
        <span v-if="result.traceId">trace {{ result.traceId }}</span>
      </div>
    </div>

    <template #footer>
      <el-button v-if="loading" @click="$emit('cancel')">取消请求</el-button>
      <el-button v-else @click="$emit('update:visible', false)">关闭</el-button>
      <el-button
        v-if="result"
        type="primary"
        @click="$emit('next-action')"
      >
        {{ result.nextAction || '继续下一步' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { AgentCoachActionVO, AgentTaskVO } from '@/types/agent'

const props = defineProps<{
  visible: boolean
  loading: boolean
  canceled: boolean
  errorMessage: string
  task?: AgentTaskVO
  result?: AgentCoachActionVO
}>()

defineEmits<{
  'update:visible': [value: boolean]
  cancel: []
  'next-action': []
}>()

const actionLabel = computed(() =>
  props.result?.actionType === 'REVIEW_COMPLETED_TASK' ? '复盘已完成任务' : '解释推荐理由'
)
</script>

<style scoped>
.coach-task-context {
  display: grid;
  gap: 4px;
  padding: 14px 16px;
  margin-bottom: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #eef6ff 100%);
}

.coach-task-context span,
.coach-task-context small,
.coach-state p,
.coach-empty,
.coach-meta {
  color: #64748b;
  font-size: 13px;
}

.coach-task-context strong {
  color: #0f172a;
  font-size: 16px;
}

.coach-state {
  display: grid;
  gap: 12px;
}

.coach-result {
  display: grid;
  gap: 14px;
}

.coach-summary {
  margin: 0;
  color: #0f172a;
  line-height: 1.7;
}

.coach-reasons {
  display: grid;
  gap: 8px;
  padding-left: 22px;
  margin: 0;
  color: #334155;
  line-height: 1.6;
}

.coach-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
</style>
