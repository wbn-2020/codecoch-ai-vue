<template>
  <section class="scenario-selector">
    <div class="scenario-selector__head">
      <div>
        <span>版本化面试剧本</span>
        <strong>选择已发布的阶段与评分量表</strong>
        <p>创建面试后会调用独立绑定接口；没有发布版本时仍可按原流程创建普通面试。</p>
      </div>
      <el-button :loading="loading" @click="loadScenarios">
        <RefreshCw :size="16" />
        刷新
      </el-button>
    </div>

    <el-skeleton v-if="loading && !scenarios.length" :rows="3" animated />

    <el-alert
      v-else-if="loadMessage"
      type="info"
      :closable="false"
      show-icon
      :title="loadMessage"
    />

    <div v-if="scenarios.length" class="scenario-list">
      <button
        v-for="scenario in scenarios"
        :key="scenario.scenarioVersionId"
        type="button"
        class="scenario-option"
        :class="{ active: modelValue?.scenarioVersionId === scenario.scenarioVersionId }"
        @click="selectScenario(scenario)"
      >
        <span class="scenario-option__radio">
          <Check v-if="modelValue?.scenarioVersionId === scenario.scenarioVersionId" :size="14" />
        </span>
        <span class="scenario-option__body">
          <span class="scenario-option__title">
            <strong>{{ scenario.scenarioName }}</strong>
            <el-tag size="small" effect="plain">v{{ scenario.versionNo }}</el-tag>
          </span>
          <span class="scenario-option__desc">
            {{ scenario.description || '已发布剧本，阶段和量表版本将在创建后锁定。' }}
          </span>
          <span class="scenario-option__meta">
            <span>{{ scenario.stages.length || '-' }} 个阶段</span>
            <span>{{ scenario.questionCount ?? '-' }} 题</span>
            <span>{{ scenario.estimatedMinutes ? `约 ${scenario.estimatedMinutes} 分钟` : '时间预算未配置' }}</span>
          </span>
        </span>
      </button>
    </div>

    <article v-if="modelValue" class="scenario-preview">
      <div class="scenario-preview__summary">
        <div>
          <span>阶段安排</span>
          <strong>{{ modelValue.stages.length ? `${modelValue.stages.length} 个阶段` : '剧本未提供阶段摘要' }}</strong>
        </div>
        <div>
          <span>题量 / 时间</span>
          <strong>{{ modelValue.questionCount ?? '-' }} 题 / {{ modelValue.estimatedMinutes ? `${modelValue.estimatedMinutes} 分钟` : '-' }}</strong>
        </div>
        <div>
          <span>评分量表</span>
          <strong>版本 #{{ modelValue.rubricVersionId }}</strong>
        </div>
      </div>

      <div v-if="modelValue.stages.length" class="scenario-stage-list">
        <article v-for="(stage, index) in modelValue.stages" :key="`${stage.code}-${index}`">
          <span>{{ index + 1 }}</span>
          <div>
            <strong>{{ stage.name }}</strong>
            <p>{{ stage.description || '按剧本配置推进问题。' }}</p>
            <small>
              {{ stage.questionCount === undefined ? '题量未配置' : `${stage.questionCount} 题` }}
              ·
              {{ stage.estimatedMinutes === undefined ? '时间未配置' : `${stage.estimatedMinutes} 分钟` }}
            </small>
          </div>
        </article>
      </div>

      <div class="scenario-rubric">
        <span>Rubric 摘要</span>
        <p>{{ modelValue.rubricSummary }}</p>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { Check, RefreshCw } from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'

import { getCurrentInterviewScenarioApi } from '@/api/interviewVoiceProduct'
import {
  interviewScenarioCandidateCodes,
  normalizeInterviewScenario
} from '@/features/interview-voice-product'
import type { InterviewScenarioSummary } from '@/types/interviewVoiceProduct'

const props = defineProps<{
  modelValue?: InterviewScenarioSummary | null
  modeKey?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: InterviewScenarioSummary | null]
}>()

const loading = ref(false)
const scenarios = ref<InterviewScenarioSummary[]>([])
const failedCodes = ref<string[]>([])
let loadVersion = 0

const preferredCodes = computed(() => interviewScenarioCandidateCodes(props.modeKey))
const loadMessage = computed(() => {
  if (loading.value) return ''
  if (scenarios.value.length) {
    return failedCodes.value.length
      ? `已加载 ${scenarios.value.length} 个发布版本；其余候选代码当前没有发布剧本。`
      : ''
  }
  return '当前候选剧本代码下没有可读取的已发布版本。可继续使用普通面试配置，系统不会伪造剧本绑定。'
})

const selectScenario = (scenario: InterviewScenarioSummary) => {
  emit(
    'update:modelValue',
    props.modelValue?.scenarioVersionId === scenario.scenarioVersionId ? null : scenario
  )
}

const loadScenarios = async () => {
  const version = ++loadVersion
  loading.value = true
  const codes = preferredCodes.value
  const results = await Promise.allSettled(
    codes.map((scenarioCode) =>
      getCurrentInterviewScenarioApi(scenarioCode, { silentError: true })
    )
  )
  if (version !== loadVersion) return

  const loaded: InterviewScenarioSummary[] = []
  const failed: string[] = []
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      loaded.push(normalizeInterviewScenario(result.value))
    } else {
      failed.push(codes[index])
    }
  })
  scenarios.value = Array.from(
    new Map(loaded.map((item) => [item.scenarioVersionId, item])).values()
  )
  failedCodes.value = failed

  const selectedStillExists = scenarios.value.some(
    (item) => item.scenarioVersionId === props.modelValue?.scenarioVersionId
  )
  if (!selectedStillExists) {
    const preferred = new Set(interviewScenarioCandidateCodes(props.modeKey).slice(0, 2))
    emit(
      'update:modelValue',
      scenarios.value.find((item) => preferred.has(item.scenarioCode))
        || scenarios.value[0]
        || null
    )
  }
  loading.value = false
}

watch(() => props.modeKey, () => {
  void loadScenarios()
})

onMounted(loadScenarios)
</script>

<style scoped lang="scss">
.scenario-selector {
  display: grid;
  gap: 14px;
}

.scenario-selector__head,
.scenario-option__title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.scenario-selector__head {
  span,
  strong,
  p {
    display: block;
  }

  span {
    color: var(--user-primary);
    font-size: 12px;
    font-weight: 800;
  }

  strong {
    margin-top: 5px;
    color: var(--user-text);
  }

  p {
    margin: 6px 0 0;
    color: var(--user-text-muted);
    font-size: 13px;
    line-height: 1.55;
  }
}

.scenario-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.scenario-option {
  display: flex;
  min-width: 0;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface);
  color: var(--user-text);
  text-align: left;
  cursor: pointer;

  &.active {
    border-color: var(--user-primary);
    background: var(--user-primary-soft);
  }
}

.scenario-option__radio {
  display: inline-flex;
  flex: 0 0 22px;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--user-primary-border);
  border-radius: 50%;
  color: var(--user-surface);
  background: var(--user-surface);

  .active & {
    border-color: var(--user-primary);
    background: var(--user-primary);
  }
}

.scenario-option__body {
  min-width: 0;
}

.scenario-option__title strong {
  overflow-wrap: anywhere;
}

.scenario-option__desc,
.scenario-option__meta {
  display: flex;
  color: var(--user-text-muted);
  font-size: 12px;
}

.scenario-option__desc {
  margin-top: 6px;
  line-height: 1.55;
}

.scenario-option__meta {
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.scenario-preview {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--user-primary-border);
  border-radius: 8px;
  background: var(--user-surface-muted);
}

.scenario-preview__summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;

  div {
    min-width: 0;
    padding: 10px;
    border: 1px solid var(--user-primary-border);
    border-radius: 8px;
    background: var(--user-surface);
  }

  span,
  strong {
    display: block;
  }

  span {
    color: var(--user-text-muted);
    font-size: 12px;
  }

  strong {
    margin-top: 5px;
    overflow-wrap: anywhere;
  }
}

.scenario-stage-list {
  display: grid;
  gap: 8px;

  article {
    display: flex;
    gap: 10px;
    padding: 10px;
    border-bottom: 1px solid var(--user-primary-border);
  }

  article > span {
    display: inline-flex;
    flex: 0 0 24px;
    width: 24px;
    height: 24px;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: var(--user-primary-border);
    color: var(--user-primary);
    font-size: 12px;
    font-weight: 800;
  }

  p,
  small {
    display: block;
    margin: 4px 0 0;
    color: var(--user-text-muted);
    line-height: 1.5;
  }
}

.scenario-rubric {
  padding: 10px;
  border-radius: 8px;
  background: var(--user-surface);

  span {
    color: var(--user-primary);
    font-size: 12px;
    font-weight: 800;
  }

  p {
    margin: 6px 0 0;
    color: var(--user-text-secondary);
    line-height: 1.55;
  }
}

@media (max-width: 760px) {
  .scenario-list,
  .scenario-preview__summary {
    grid-template-columns: 1fr;
  }

  .scenario-selector__head {
    align-items: stretch;
    flex-direction: column;
  }
}

.scenario-selector {
  gap: 10px;
  min-width: 0;
}

.scenario-selector__head {
  align-items: center;

  span {
    color: var(--user-primary);
  }

  strong {
    color: var(--user-text);
  }

  p {
    max-width: 68ch;
    color: var(--user-text-muted);
    line-height: 1.5;
  }
}

.scenario-list {
  grid-template-columns: 1fr;
  gap: 0;
  border: 1px solid var(--user-border);
  border-radius: var(--user-radius-sm);
  overflow: hidden;
}

.scenario-option {
  gap: 10px;
  padding: 10px 12px;
  border: 0;
  border-bottom: 1px solid var(--user-border);
  border-radius: 0;
  background: var(--user-surface-muted);
  color: var(--user-text);
  transition:
    background 0.18s ease,
    color 0.18s ease;

  &:last-child {
    border-bottom: 0;
  }

  &:hover,
  &.active {
    border-color: var(--user-border);
    background: var(--user-surface-tint);
  }
}

.scenario-option__radio {
  border-color: var(--user-primary-border);
  background: var(--user-control-bg);
  color: var(--user-primary-contrast);

  .active & {
    border-color: var(--user-primary);
    background: var(--user-primary);
  }
}

.scenario-option__desc,
.scenario-option__meta {
  color: var(--user-text-muted);
}

.scenario-preview {
  gap: 10px;
  padding: 12px;
  border-color: var(--user-border);
  background: var(--user-surface-muted);
}

.scenario-preview__summary {
  gap: 0;
  border-top: 1px solid var(--user-border);
  border-bottom: 1px solid var(--user-border);

  div {
    padding: 9px 10px;
    border: 0;
    border-right: 1px solid var(--user-border);
    border-radius: 0;
    background: transparent;

    &:last-child {
      border-right: 0;
    }
  }

  span {
    color: var(--user-text-muted);
  }

  strong {
    color: var(--user-text);
  }
}

.scenario-stage-list {
  gap: 0;

  article {
    padding: 9px 0;
    border-bottom-color: var(--user-border);
  }

  article > span {
    background: var(--user-primary-soft);
    color: var(--user-primary);
  }

  p,
  small {
    color: var(--user-text-muted);
  }
}

.scenario-rubric {
  padding: 10px 0 0;
  border-top: 1px solid var(--user-border);
  border-radius: 0;
  background: transparent;

  span {
    color: var(--user-primary);
  }

  p {
    color: var(--user-text-secondary);
  }
}

@media (max-width: 760px) {
  .scenario-selector__head {
    align-items: stretch;
  }

  .scenario-preview__summary {
    border: 1px solid var(--user-border);
  }

  .scenario-preview__summary div {
    border-right: 0;
    border-bottom: 1px solid var(--user-border);
  }

  .scenario-preview__summary div:last-child {
    border-bottom: 0;
  }
}
</style>
