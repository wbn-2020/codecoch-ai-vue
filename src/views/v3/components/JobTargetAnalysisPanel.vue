<template>
  <section class="analysis-panel">
    <div class="analysis-summary">
      <div>
        <span>AI 解析摘要</span>
        <p>{{ analysis.summary || '暂无解析摘要。' }}</p>
      </div>
      <JobTargetStatusTag :status="analysis.parseStatus" />
    </div>

    <div v-if="analysis.parseErrorMessage" class="analysis-error">
      {{ friendlyJobParseError(analysis.parseErrorMessage) }}
    </div>

    <div class="analysis-grid">
      <article class="analysis-block">
        <h3>核心职责</h3>
        <div v-if="toDisplayItems(analysis.responsibilities).length" class="item-list">
          <p v-for="item in toDisplayItems(analysis.responsibilities)" :key="item">{{ item }}</p>
        </div>
        <span v-else class="empty-text">--</span>
      </article>

      <article class="analysis-block">
        <h3>技能要求</h3>
        <div v-if="toDisplayItems(analysis.requiredSkills).length" class="tag-list">
          <span v-for="item in toDisplayItems(analysis.requiredSkills)" :key="item">{{ item }}</span>
        </div>
        <span v-else class="empty-text">--</span>
      </article>

      <article class="analysis-block">
        <h3>加分项</h3>
        <div v-if="toDisplayItems(analysis.bonusSkills).length" class="tag-list">
          <span v-for="item in toDisplayItems(analysis.bonusSkills)" :key="item">{{ item }}</span>
        </div>
        <span v-else class="empty-text">--</span>
      </article>

      <article class="analysis-block">
        <h3>面试重点</h3>
        <div v-if="toDisplayItems(analysis.interviewFocusPoints).length" class="item-list">
          <p v-for="item in toDisplayItems(analysis.interviewFocusPoints)" :key="item">{{ item }}</p>
        </div>
        <span v-else class="empty-text">--</span>
      </article>
    </div>

    <div class="analysis-grid compact">
      <article class="analysis-block">
        <h3>技术栈关键词</h3>
        <div v-if="toDisplayItems(analysis.techStackKeywords).length" class="tag-list">
          <span v-for="item in toDisplayItems(analysis.techStackKeywords)" :key="item">{{ item }}</span>
        </div>
        <span v-else class="empty-text">--</span>
      </article>
      <article class="analysis-block">
        <h3>业务关键词</h3>
        <div v-if="toDisplayItems(analysis.businessKeywords).length" class="tag-list">
          <span v-for="item in toDisplayItems(analysis.businessKeywords)" :key="item">{{ item }}</span>
        </div>
        <span v-else class="empty-text">--</span>
      </article>
      <article class="analysis-block">
        <h3>经验要求</h3>
        <p class="plain-text">{{ analysis.experienceRequirement || '--' }}</p>
      </article>
      <article class="analysis-block">
        <h3>项目经验要求</h3>
        <p class="plain-text">{{ analysis.projectExperienceRequirement || '--' }}</p>
      </article>
    </div>

    <article class="analysis-block weights">
      <h3>技能权重</h3>
      <div v-if="weightItems.length" class="weight-list">
        <div v-for="item in weightItems" :key="item.label" class="weight-item">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </div>
      </div>
      <span v-else class="empty-text">--</span>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { JobDescriptionAnalysisVO } from '@/types/jobTarget'
import { toFriendlyMessage } from '@/utils/error'

import JobTargetStatusTag from './JobTargetStatusTag.vue'

const props = defineProps<{
  analysis: JobDescriptionAnalysisVO
}>()

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const friendlyJobParseError = (message?: string) =>
  toFriendlyMessage(message, '岗位描述解析没有成功，请补充岗位描述内容或稍后重试。')

const stringifyItem = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (isRecord(value)) {
    const preferred = ['name', 'skill', 'label', 'title', 'description', 'requirement', 'point']
    const hit = preferred.map((key) => value[key]).find((item) => typeof item === 'string')
    if (typeof hit === 'string') return hit
    return Object.entries(value)
      .map(([key, item]) => `${key}: ${stringifyItem(item)}`)
      .join(' / ')
  }
  return ''
}

const toDisplayItems = (value: unknown): string[] => {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.map(stringifyItem).filter(Boolean)
  }
  if (isRecord(value)) {
    return Object.entries(value).map(([key, item]) => `${key}: ${stringifyItem(item)}`)
  }
  const text = stringifyItem(value)
  return text ? [text] : []
}

const weightItems = computed(() => {
  if (!isRecord(props.analysis.skillWeights)) return []
  return Object.entries(props.analysis.skillWeights).map(([label, value]) => ({
    label,
    value: stringifyItem(value) || '--'
  }))
})
</script>

<style scoped lang="scss">
.analysis-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.analysis-summary,
.analysis-block {
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.58);
}

.analysis-summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;

  span {
    color: var(--app-text-muted);
    font-size: 12px;
  }

  p {
    margin: 8px 0 0;
    color: #dbeafe;
    line-height: 1.7;
  }
}

.analysis-error {
  padding: 12px 14px;
  border: 1px solid rgba(248, 113, 113, 0.32);
  border-radius: 10px;
  background: rgba(127, 29, 29, 0.22);
  color: #fecaca;
  line-height: 1.7;
}

.analysis-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.analysis-grid.compact {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.analysis-block {
  min-width: 0;
  padding: 16px;

  h3 {
    margin: 0 0 12px;
    font-size: 15px;
  }
}

.item-list {
  display: flex;
  flex-direction: column;
  gap: 8px;

  p {
    margin: 0;
    color: #cbd5e1;
    line-height: 1.7;
  }
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  span {
    max-width: 100%;
    padding: 6px 9px;
    overflow-wrap: anywhere;
    border: 1px solid rgba(34, 211, 238, 0.2);
    border-radius: 999px;
    background: rgba(8, 47, 73, 0.26);
    color: #bae6fd;
    font-size: 12px;
  }
}

.plain-text,
.empty-text {
  color: var(--app-text-muted);
  line-height: 1.7;
}

.plain-text {
  margin: 0;
}

.weight-list {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.weight-item {
  padding: 10px 12px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 10px;
  background: rgba(2, 6, 23, 0.28);

  span,
  strong {
    display: block;
  }

  span {
    color: var(--app-text-muted);
    font-size: 12px;
  }

  strong {
    margin-top: 6px;
    color: #f8fafc;
    font-size: 15px;
  }
}

@media (max-width: 980px) {
  .analysis-grid,
  .analysis-grid.compact,
  .weight-list {
    grid-template-columns: 1fr;
  }

  .analysis-summary {
    flex-direction: column;
  }
}
</style>
