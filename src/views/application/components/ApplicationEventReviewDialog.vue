<template>
  <el-dialog
    :model-value="visible"
    :title="force ? '重新生成 AI 复盘' : '生成 AI 复盘'"
    width="620px"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-alert
      v-if="force"
      class="regenerate-alert"
      type="warning"
      show-icon
      :closable="false"
      title="重新生成仅替换分析与生成信息，已记录的事实、外部反馈和反思将原样保留且不可修改。"
    />
    <el-form label-position="top">
      <div
        v-if="force"
        class="readonly-review-input"
        data-testid="application-review-readonly-user-input"
      >
        <el-form-item label="我确认发生的事实">
          <el-input
            :model-value="observedFactsText"
            type="textarea"
            :rows="4"
            readonly
            placeholder="未记录"
            data-testid="application-review-readonly-observed-facts"
          />
        </el-form-item>
        <el-form-item label="招聘方或面试官明确反馈（用户转述）">
          <el-input
            :model-value="externalFeedback"
            type="textarea"
            :rows="3"
            readonly
            placeholder="未记录"
            data-testid="application-review-readonly-external-feedback"
          />
        </el-form-item>
        <el-form-item label="我的反思（不是事实）">
          <el-input
            :model-value="selfReflection"
            type="textarea"
            :rows="3"
            readonly
            placeholder="未记录"
            data-testid="application-review-readonly-self-reflection"
          />
        </el-form-item>
      </div>
      <ApplicationEventReviewFields
        v-else
        :observed-facts-text="observedFactsText"
        :external-feedback="externalFeedback"
        :self-reflection="selfReflection"
        :seed="seed"
        @update:observed-facts-text="emit('update:observedFactsText', $event)"
        @update:external-feedback="emit('update:externalFeedback', $event)"
        @update:self-reflection="emit('update:selfReflection', $event)"
      />
    </el-form>
    <template #footer>
      <el-button @click="emit('update:visible', false)">取消</el-button>
      <el-button
        type="primary"
        :loading="saving"
        data-testid="confirm-application-event-review"
        @click="emit('generate')"
      >
        {{ force ? '确认重新生成' : '生成 AI 复盘' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { ApplicationEventReviewSeed } from '@/features/applications'
import ApplicationEventReviewFields from './ApplicationEventReviewFields.vue'

defineProps<{
  visible: boolean
  force: boolean
  saving: boolean
  observedFactsText: string
  externalFeedback: string
  selfReflection: string
  seed?: ApplicationEventReviewSeed
}>()

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void
  (event: 'update:observedFactsText', value: string): void
  (event: 'update:externalFeedback', value: string): void
  (event: 'update:selfReflection', value: string): void
  (event: 'generate'): void
}>()
</script>

<style scoped lang="scss">
.regenerate-alert {
  margin-bottom: 14px;
}

.readonly-review-input {
  padding-top: 4px;
  border-top: 1px solid var(--app-border);
}
</style>
