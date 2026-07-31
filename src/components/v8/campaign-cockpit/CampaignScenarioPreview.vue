<template>
  <section class="cockpit-section scenario-preview" aria-labelledby="campaign-scenario-title">
    <header class="cockpit-section__header">
      <div>
        <span class="section-kicker">机会组合</span>
        <h2 id="campaign-scenario-title">在本周容量内安排行动</h2>
        <p>这里只重排当前行动队列，不生成新的业务事实，也不会静默删除超出容量的行动。</p>
      </div>
      <el-button type="primary" :loading="loading" :disabled="disabled" @click="submit">
        预览安排
      </el-button>
    </header>

    <el-alert
      v-if="error"
      type="warning"
      show-icon
      :closable="false"
      title="情景预览暂时不可用"
      :description="error"
    />

    <div class="scenario-controls">
      <label>
        <span>可用时间（分钟）</span>
        <el-input-number v-model="input.availableMinutes" :min="0" :max="10080" controls-position="right" />
      </label>
      <label>
        <span>最多覆盖机会数</span>
        <el-input-number v-model="input.maxApplications" :min="1" :max="100" controls-position="right" />
      </label>
      <label class="scenario-controls__wide">
        <span>安排策略</span>
        <el-radio-group v-model="input.focusMode">
          <el-radio-button value="DEADLINE_FIRST">截止优先</el-radio-button>
          <el-radio-button value="HIGH_PRIORITY_FIRST">高优先级优先</el-radio-button>
          <el-radio-button value="BALANCED">均衡安排</el-radio-button>
        </el-radio-group>
      </label>
      <label class="scenario-checkbox">
        <el-checkbox v-model="input.includeLowConfidence">包含低置信行动</el-checkbox>
      </label>
    </div>

    <el-alert
      v-if="validationError"
      type="warning"
      show-icon
      :closable="false"
      title="请检查情景输入"
      :description="validationError"
    />

    <template v-if="preview">
      <div class="scenario-result__summary">
        <strong>{{ preview.totalEstimatedMinutes || 0 }} 分钟</strong>
        <span>预计剩余 {{ preview.capacityRemainingMinutes || 0 }} 分钟 · {{ preview.selectedActions?.length || 0 }} 项纳入</span>
      </div>
      <div class="scenario-result">
        <div>
          <h3>纳入行动</h3>
          <ul><li v-for="item in preview.selectedActions || []" :key="`selected-${item.semanticKey}`">{{ item.title }}</li></ul>
        </div>
        <div>
          <h3>延后行动</h3>
          <ul><li v-for="item in preview.deferredActions || []" :key="`deferred-${item.semanticKey}`">{{ item.title }}</li></ul>
        </div>
      </div>
      <div v-if="preview.tradeoffs?.length || preview.limits?.length" class="scenario-notes">
        <p v-for="(item, index) in [...(preview.tradeoffs || []), ...(preview.limits || [])]" :key="`tradeoff-${index}-${item}`">{{ item }}</p>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'

import {
  normalizeCampaignScenarioInput,
  validateCampaignScenarioInput
} from '@/features/campaign-cockpit/scenario'
import type {
  CampaignScenarioPreviewDTO,
  CampaignScenarioPreviewVO
} from '@/types/v8/campaign'

const props = withDefaults(defineProps<{
  preview?: CampaignScenarioPreviewVO | null
  loading?: boolean
  disabled?: boolean
  error?: string
}>(), {
  preview: null,
  loading: false,
  disabled: false,
  error: ''
})

const emit = defineEmits<{
  preview: [value: CampaignScenarioPreviewDTO]
}>()

const input = reactive(normalizeCampaignScenarioInput({}))
const validationError = ref('')

const submit = () => {
  const value = normalizeCampaignScenarioInput(input)
  const errors = validateCampaignScenarioInput(value)
  validationError.value = errors[0] || ''
  if (!errors.length) emit('preview', value)
}
</script>

<style scoped lang="scss">
.cockpit-section {
  display: grid;
  gap: 16px;
  padding: 18px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface, #151c27);
}

.cockpit-section__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.cockpit-section__header h2 {
  margin: 4px 0 0;
  color: var(--app-text);
  font-size: 18px;
}

.cockpit-section__header p {
  margin: 6px 0 0;
  color: var(--app-text-muted);
}

.section-kicker {
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 700;
}

.scenario-controls {
  display: grid;
  grid-template-columns: 170px 170px minmax(0, 1fr);
  align-items: end;
  gap: 14px;
}

.scenario-controls label {
  display: grid;
  gap: 6px;
  color: var(--app-text-muted);
  font-size: 13px;
}

.scenario-controls label :deep(.el-input-number) {
  width: 100%;
}

.scenario-controls__wide {
  min-width: 0;
}

.scenario-checkbox {
  grid-column: 1 / -1;
}

.scenario-result__summary {
  display: flex;
  align-items: baseline;
  gap: 10px;
  border-top: 1px solid var(--app-border);
  padding-top: 14px;
}

.scenario-result__summary strong {
  color: var(--app-text);
  font-size: 20px;
}

.scenario-result__summary span,
.scenario-notes p {
  color: var(--app-text-muted);
  font-size: 13px;
}

.scenario-result {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.scenario-result h3 {
  margin: 0;
  color: var(--app-text);
  font-size: 14px;
}

.scenario-result ul {
  margin: 8px 0 0;
  padding-left: 18px;
  color: var(--app-text);
  line-height: 1.6;
}

.scenario-notes {
  border-top: 1px solid var(--app-border);
  padding-top: 10px;
}

.scenario-notes p {
  margin: 4px 0;
}

@media (max-width: 820px) {
  .cockpit-section__header,
  .scenario-result__summary {
    flex-direction: column;
    align-items: flex-start;
  }

  .scenario-controls,
  .scenario-result {
    grid-template-columns: 1fr;
  }
}
</style>
