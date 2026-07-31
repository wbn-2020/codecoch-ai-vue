<template>
  <div class="application-event-review-fields">
    <el-form-item label="我确认发生的事实">
      <el-input
        :model-value="observedFactsText"
        type="textarea"
        :rows="4"
        maxlength="3000"
        show-word-limit
        :placeholder="factsPlaceholder"
        @update:model-value="emit('update:observedFactsText', String($event || ''))"
      />
    </el-form-item>
    <el-form-item label="招聘方或面试官明确反馈（用户转述）">
      <el-input
        :model-value="externalFeedback"
        type="textarea"
        :rows="3"
        maxlength="2000"
        show-word-limit
        placeholder="仅填写对方明确说过的内容，可留空。"
        @update:model-value="emit('update:externalFeedback', String($event || ''))"
      />
    </el-form-item>
    <el-form-item label="我的反思（不是事实）">
      <el-input
        :model-value="selfReflection"
        type="textarea"
        :rows="3"
        maxlength="2000"
        show-word-limit
        placeholder="记录你的感受、判断或想改进的地方，可留空。"
        @update:model-value="emit('update:selfReflection', String($event || ''))"
      />
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { ApplicationEventReviewSeed } from '@/features/applications'

const props = defineProps<{
  observedFactsText: string
  externalFeedback: string
  selfReflection: string
  seed?: ApplicationEventReviewSeed
}>()

const emit = defineEmits<{
  (event: 'update:observedFactsText', value: string): void
  (event: 'update:externalFeedback', value: string): void
  (event: 'update:selfReflection', value: string): void
}>()

const factsPlaceholder = computed(() =>
  props.seed?.observedFacts.length
    ? `${props.seed.observedFacts.join('\n')}\n每行一条，最多 10 条。`
    : '每行记录一条亲自确认的事实，最多 10 条。'
)
</script>

<style scoped lang="scss">
.application-event-review-fields {
  padding-top: 4px;
  border-top: 1px solid var(--app-border);
}
</style>
