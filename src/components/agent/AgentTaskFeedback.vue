<template>
  <section
    class="agent-task-feedback"
    :class="{
      'is-disabled': !canSubmit,
      'is-submitted': submitted,
      'is-failed': submitFailed
    }"
  >
    <header class="agent-task-feedback__header">
      <div class="agent-task-feedback__title">
        <span class="agent-task-feedback__eyebrow">
          <MessageSquareQuote :size="14" />
          Agent Feedback
        </span>
        <h3>{{ submitted ? successTitle : title }}</h3>
        <p>{{ statusText }}</p>
      </div>

      <div class="agent-task-feedback__state">
        <el-tag v-if="submitted" type="success" effect="plain" round>已提交</el-tag>
        <el-tag v-else-if="submitting" type="warning" effect="plain" round>提交中</el-tag>
        <el-tag v-else-if="submitFailed" type="danger" effect="plain" round>提交失败</el-tag>
        <el-tag v-else-if="!canSubmit" type="info" effect="plain" round>不可提交</el-tag>
      </div>
    </header>

    <div class="agent-task-feedback__options">
      <button
        v-for="item in feedbackOptions"
        :key="item.value"
        class="agent-task-feedback__option"
        :class="{
          'is-active': form.feedbackType === item.value,
          'is-disabled': !canInteract
        }"
        type="button"
        :disabled="!canInteract"
        @click="selectFeedbackType(item.value)"
      >
        <component :is="item.icon" :size="16" />
        <span>{{ item.label }}</span>
      </button>
    </div>

    <div class="agent-task-feedback__comment">
      <div class="agent-task-feedback__comment-head">
        <label for="agent-task-feedback-comment">补充说明</label>
        <span>可选</span>
      </div>
      <el-input
        id="agent-task-feedback-comment"
        v-model="form.comment"
        type="textarea"
        :rows="4"
        maxlength="300"
        show-word-limit
        resize="none"
        :disabled="!canInteract"
        placeholder="可以补充说明这条任务为什么有帮助、太难、太简单，或者为什么不相关。"
      />
    </div>

    <el-alert
      v-if="statusAlert"
      class="agent-task-feedback__alert"
      :type="statusAlert.type"
      :closable="false"
      show-icon
      :title="statusAlert.title"
      :description="statusAlert.description"
    />

    <div class="agent-task-feedback__actions">
      <el-button
        v-if="submitFailed && !submitted"
        text
        type="info"
        :disabled="submitting || !canSubmit"
        @click="resetAfterFailure"
      >
        重新编辑
      </el-button>
      <el-button
        type="primary"
        :loading="submitting"
        :disabled="submitButtonDisabled"
        @click="submitFeedback"
      >
        {{ submitButtonText }}
      </el-button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import {
  CircleHelp,
  Frown,
  MessageSquareQuote,
  Scale,
  Sparkles,
  Zap
} from 'lucide-vue-next'
import { computed, reactive, watch } from 'vue'

import { submitAgentFeedbackApi } from '@/api/agent'
import type { AgentFeedbackType, AgentFeedbackVO } from '@/types/agent'
import { getErrorMessage } from '@/utils/error'

type FeedbackOption = {
  label: string
  value: AgentFeedbackType
  icon: typeof Sparkles
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'error'

const props = withDefaults(defineProps<{
  agentTaskId?: number | null
  agentRunId?: number | null
  initialFeedbackType?: AgentFeedbackType
  initialComment?: string
  disabled?: boolean
  submitted?: boolean
  title?: string
  successTitle?: string
}>(), {
  initialFeedbackType: 'HELPFUL',
  initialComment: '',
  disabled: false,
  submitted: false,
  title: '这条 Agent 任务对你有帮助吗？',
  successTitle: '反馈已记录'
})

const emit = defineEmits<{
  submitted: [payload: AgentFeedbackVO]
  failed: [message: string]
}>()

const feedbackOptions: FeedbackOption[] = [
  { label: '有帮助', value: 'HELPFUL', icon: Sparkles },
  { label: '不相关', value: 'IRRELEVANT', icon: CircleHelp },
  { label: '太难', value: 'TOO_HARD', icon: Zap },
  { label: '太简单', value: 'TOO_EASY', icon: Scale },
  { label: '没有帮助', value: 'NOT_HELPFUL', icon: Frown }
]

const form = reactive({
  feedbackType: props.initialFeedbackType,
  comment: props.initialComment
})

const state = reactive<{
  submitState: SubmitState
  errorMessage: string
  response: AgentFeedbackVO | null
}>({
  submitState: props.submitted ? 'success' : 'idle',
  errorMessage: '',
  response: null
})

const hasTarget = computed(() => {
  return Number.isFinite(props.agentTaskId) || Number.isFinite(props.agentRunId)
})

const canSubmit = computed(() => !props.disabled && hasTarget.value)
const submitting = computed(() => state.submitState === 'submitting')
const submitted = computed(() => props.submitted || state.submitState === 'success')
const submitFailed = computed(() => state.submitState === 'error')
const canInteract = computed(() => canSubmit.value && !submitting.value && !submitted.value)
const submitButtonDisabled = computed(() => !canSubmit.value || submitting.value || submitted.value)

const missingTargetMessage = '缺少 agentTaskId 或 agentRunId，当前反馈无法提交。'

const statusText = computed(() => {
  if (submitted.value) {
    return '谢谢，系统会用这条反馈优化后续任务推荐。'
  }
  if (!hasTarget.value) {
    return missingTargetMessage
  }
  if (props.disabled) {
    return '当前状态下反馈入口已禁用。'
  }
  if (submitFailed.value) {
    return state.errorMessage || '反馈提交失败，请稍后重试。'
  }
  if (submitting.value) {
    return '正在提交你的反馈，请稍候。'
  }
  return '选择最贴近感受的一项，也可以补充一点上下文。'
})

const statusAlert = computed(() => {
  if (!hasTarget.value) {
    return {
      type: 'info' as const,
      title: '当前任务缺少反馈目标',
      description: missingTargetMessage
    }
  }

  if (props.disabled) {
    return {
      type: 'info' as const,
      title: '反馈暂不可用',
      description: '请等待当前任务状态恢复后再提交反馈。'
    }
  }

  if (submitFailed.value) {
    return {
      type: 'error' as const,
      title: '反馈提交失败',
      description: state.errorMessage || '请稍后重试。'
    }
  }

  if (submitted.value) {
    return {
      type: 'success' as const,
      title: '反馈已提交',
      description: '你的意见已经记录，后续任务会尽量更贴近你的真实需求。'
    }
  }

  return null
})

const submitButtonText = computed(() => {
  if (submitted.value) return '已提交'
  if (submitFailed.value) return '重试提交'
  return '提交反馈'
})

const resetAfterFailure = () => {
  state.submitState = 'idle'
  state.errorMessage = ''
}

const selectFeedbackType = (value: AgentFeedbackType) => {
  if (!canInteract.value) return
  form.feedbackType = value
}

const submitFeedback = async () => {
  if (submitButtonDisabled.value) return

  state.submitState = 'submitting'
  state.errorMessage = ''

  try {
    const response = await submitAgentFeedbackApi({
      agentTaskId: props.agentTaskId ?? undefined,
      agentRunId: props.agentRunId ?? undefined,
      feedbackType: form.feedbackType,
      comment: form.comment.trim() || undefined
    })

    state.response = response
    state.submitState = 'success'
    ElMessage.success('反馈已提交')
    emit('submitted', response)
  } catch (error) {
    const message = getErrorMessage(error, '反馈提交失败，请稍后重试')
    state.submitState = 'error'
    state.errorMessage = message
    ElMessage.error(message)
    emit('failed', message)
  }
}

watch(
  () => props.initialFeedbackType,
  (value) => {
    if (!submitted.value) {
      form.feedbackType = value
    }
  }
)

watch(
  () => props.initialComment,
  (value) => {
    if (!submitted.value) {
      form.comment = value
    }
  }
)

watch(
  () => props.submitted,
  (value) => {
    state.submitState = value ? 'success' : 'idle'
    if (!value) {
      state.response = null
      state.errorMessage = ''
    }
  }
)

watch(
  () => [props.agentTaskId, props.agentRunId, props.disabled] as const,
  () => {
    if (state.submitState === 'error') {
      state.submitState = 'idle'
      state.errorMessage = ''
    }
  }
)
</script>

<style scoped lang="scss">
.agent-task-feedback {
  display: grid;
  gap: 16px;
  padding: 16px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(15, 23, 42, 0.72));
  box-shadow: var(--app-shadow);
}

.agent-task-feedback.is-submitted {
  border-color: rgba(34, 197, 94, 0.32);
}

.agent-task-feedback.is-failed {
  border-color: rgba(248, 113, 113, 0.32);
}

.agent-task-feedback.is-disabled {
  opacity: 0.86;
}

.agent-task-feedback__header,
.agent-task-feedback__comment-head,
.agent-task-feedback__actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.agent-task-feedback__title {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.agent-task-feedback__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #93c5fd;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.agent-task-feedback__title h3,
.agent-task-feedback__title p {
  margin: 0;
}

.agent-task-feedback__title h3 {
  color: var(--app-text);
  font-size: 16px;
  line-height: 1.45;
}

.agent-task-feedback__title p,
.agent-task-feedback__comment-head span {
  color: var(--app-text-muted);
  font-size: 13px;
  line-height: 1.65;
}

.agent-task-feedback__state {
  flex: 0 0 auto;
}

.agent-task-feedback__options {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.agent-task-feedback__option {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  padding: 10px 12px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.36);
  color: var(--app-text-muted);
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease;
}

.agent-task-feedback__option:hover:not(.is-disabled),
.agent-task-feedback__option.is-active {
  border-color: rgba(59, 130, 246, 0.46);
  background: var(--app-primary-soft);
  color: var(--app-text);
}

.agent-task-feedback__option:hover:not(.is-disabled) {
  transform: translateY(-1px);
}

.agent-task-feedback__option.is-active {
  box-shadow: inset 0 0 0 1px rgba(96, 165, 250, 0.18);
}

.agent-task-feedback__option.is-disabled {
  cursor: not-allowed;
}

.agent-task-feedback__option span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.agent-task-feedback__comment {
  display: grid;
  gap: 8px;
}

.agent-task-feedback__comment-head label {
  color: var(--app-text);
  font-size: 13px;
  font-weight: 600;
}

.agent-task-feedback__alert {
  margin: 0;
}

.agent-task-feedback__actions {
  align-items: center;
  justify-content: flex-end;
}

.agent-task-feedback :deep(.el-textarea__inner) {
  border-color: rgba(148, 163, 184, 0.18);
  background: rgba(2, 6, 23, 0.34);
}

@media (max-width: 1100px) {
  .agent-task-feedback__options {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .agent-task-feedback {
    padding: 14px;
  }

  .agent-task-feedback__header,
  .agent-task-feedback__comment-head,
  .agent-task-feedback__actions {
    display: grid;
    justify-content: stretch;
  }

  .agent-task-feedback__options {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .agent-task-feedback__actions {
    justify-content: stretch;
  }

  .agent-task-feedback__actions :deep(.el-button) {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .agent-task-feedback__options {
    grid-template-columns: 1fr;
  }
}
</style>
