<template>
  <div class="ai-result-feedback" :class="{ 'ai-result-feedback--compact': compact }">
    <el-button :type="submitted ? 'success' : 'default'" :plain="!submitted" :loading="submitting" @click="visible = true">
      <MessageSquareWarning :size="16" />
      {{ submitted ? '已反馈' : label }}
    </el-button>

    <el-dialog v-model="visible" title="AI 结果反馈" width="480px">
      <el-form label-position="top">
        <el-form-item label="问题类型">
          <el-radio-group v-model="feedbackType" class="feedback-type-grid">
            <el-radio-button v-for="item in feedbackTypes" :key="item.value" :label="item.value">
              {{ item.label }}
            </el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="结果评分">
          <el-rate v-model="rating" :max="5" />
        </el-form-item>
        <el-form-item label="补充说明">
          <el-input
            v-model="comment"
            type="textarea"
            :rows="4"
            maxlength="300"
            show-word-limit
            placeholder="可说明哪一段不准确、资料不完整或与你的经历不符"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitFeedback">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { MessageSquareWarning } from 'lucide-vue-next'
import { ref } from 'vue'
import { useRoute } from 'vue-router'

import { submitAiResultFeedbackApi } from '@/api/aiFeedback'
import type { AiResultFeedbackType } from '@/types/aiFeedback'
import { getErrorMessage } from '@/utils/error'

const props = withDefaults(defineProps<{
  scene: string
  bizType?: string
  bizId?: number
  aiCallLogId?: number
  pagePath?: string
  label?: string
  compact?: boolean
}>(), {
  label: '反馈',
  compact: false
})

const emit = defineEmits<{
  submitted: []
}>()

const route = useRoute()
const visible = ref(false)
const submitting = ref(false)
const submitted = ref(false)
const feedbackType = ref<AiResultFeedbackType>('INACCURATE')
const rating = ref(3)
const comment = ref('')

const feedbackTypes: Array<{ label: string; value: AiResultFeedbackType }> = [
  { label: '内容不准', value: 'INACCURATE' },
  { label: '不是我的经历', value: 'NOT_MY_EXPERIENCE' },
  { label: '内容不符合实际', value: 'HALLUCINATION' },
  { label: '不相关', value: 'IRRELEVANT' },
  { label: '有帮助', value: 'HELPFUL' },
  { label: '其他', value: 'OTHER' }
]

const submitFeedback = async () => {
  submitting.value = true
  try {
    await submitAiResultFeedbackApi({
      scene: props.scene,
      bizType: props.bizType,
      bizId: props.bizId,
      aiCallLogId: props.aiCallLogId,
      feedbackType: feedbackType.value,
      rating: rating.value,
      comment: comment.value || undefined,
      pagePath: props.pagePath || route.fullPath
    })
    submitted.value = true
    visible.value = false
    comment.value = ''
    ElMessage.success('反馈已提交')
    emit('submitted')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '反馈提交失败，请稍后重试'))
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.ai-result-feedback {
  display: inline-flex;
}

.ai-result-feedback :deep(.el-button) {
  gap: 6px;
}

.ai-result-feedback--compact :deep(.el-button) {
  padding-inline: 10px;
}

.feedback-type-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
}

.feedback-type-grid :deep(.el-radio-button__inner) {
  width: 100%;
}

@media (max-width: 560px) {
  .feedback-type-grid {
    grid-template-columns: 1fr;
  }
}
</style>
