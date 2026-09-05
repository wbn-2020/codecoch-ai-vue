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
        <div v-if="responsibilityItems.length" class="item-list">
          <p v-for="item in previewItems(responsibilityItems)" :key="item">{{ item }}</p>
          <details v-if="remainingItems(responsibilityItems).length" class="analysis-more">
            <summary>展开其余 {{ remainingItems(responsibilityItems).length }} 项</summary>
            <p v-for="item in remainingItems(responsibilityItems)" :key="item">{{ item }}</p>
          </details>
        </div>
        <span v-else class="empty-text">--</span>
      </article>

      <article class="analysis-block">
        <h3>技能要求</h3>
        <div v-if="requiredSkillItems.length" class="tag-list">
          <span v-for="item in previewItems(requiredSkillItems)" :key="item">{{ item }}</span>
          <details v-if="remainingItems(requiredSkillItems).length" class="analysis-more analysis-more--tags">
            <summary>展开其余 {{ remainingItems(requiredSkillItems).length }} 项</summary>
            <div>
              <span v-for="item in remainingItems(requiredSkillItems)" :key="item">{{ item }}</span>
            </div>
          </details>
        </div>
        <span v-else class="empty-text">--</span>
      </article>

      <article class="analysis-block">
        <h3>加分项</h3>
        <div v-if="bonusSkillItems.length" class="tag-list">
          <span v-for="item in previewItems(bonusSkillItems)" :key="item">{{ item }}</span>
          <details v-if="remainingItems(bonusSkillItems).length" class="analysis-more analysis-more--tags">
            <summary>展开其余 {{ remainingItems(bonusSkillItems).length }} 项</summary>
            <div>
              <span v-for="item in remainingItems(bonusSkillItems)" :key="item">{{ item }}</span>
            </div>
          </details>
        </div>
        <span v-else class="empty-text">--</span>
      </article>

      <article class="analysis-block">
        <h3>面试重点</h3>
        <div v-if="interviewFocusItems.length" class="interview-focus-list">
          <article
            v-for="item in previewItems(interviewFocusItems)"
            :key="item.id"
            class="interview-focus-item"
          >
            <dl class="interview-focus-sections">
              <div
                v-for="section in item.sections"
                :key="section.label"
                class="interview-focus-section"
              >
                <dt>{{ section.label }}</dt>
                <dd class="interview-focus-value" :class="{ 'is-empty': !section.content }">
                  {{ section.content || '--' }}
                </dd>
              </div>
            </dl>
          </article>
          <details v-if="remainingItems(interviewFocusItems).length" class="analysis-more">
            <summary>展开其余 {{ remainingItems(interviewFocusItems).length }} 项</summary>
            <article
              v-for="item in remainingItems(interviewFocusItems)"
              :key="item.id"
              class="interview-focus-item"
            >
              <dl class="interview-focus-sections">
                <div
                  v-for="section in item.sections"
                  :key="section.label"
                  class="interview-focus-section"
                >
                  <dt>{{ section.label }}</dt>
                  <dd class="interview-focus-value" :class="{ 'is-empty': !section.content }">
                    {{ section.content || '--' }}
                  </dd>
                </div>
              </dl>
            </article>
          </details>
        </div>
        <span v-else class="empty-text">--</span>
      </article>
    </div>

    <div class="analysis-grid compact">
      <article class="analysis-block">
        <h3>技术栈关键词</h3>
        <div v-if="techStackItems.length" class="tag-list">
          <span v-for="item in previewItems(techStackItems)" :key="item">{{ item }}</span>
          <details v-if="remainingItems(techStackItems).length" class="analysis-more analysis-more--tags">
            <summary>展开其余 {{ remainingItems(techStackItems).length }} 项</summary>
            <div>
              <span v-for="item in remainingItems(techStackItems)" :key="item">{{ item }}</span>
            </div>
          </details>
        </div>
        <span v-else class="empty-text">--</span>
      </article>
      <article class="analysis-block">
        <h3>业务关键词</h3>
        <div v-if="businessKeywordItems.length" class="tag-list">
          <span v-for="item in previewItems(businessKeywordItems)" :key="item">{{ item }}</span>
          <details v-if="remainingItems(businessKeywordItems).length" class="analysis-more analysis-more--tags">
            <summary>展开其余 {{ remainingItems(businessKeywordItems).length }} 项</summary>
            <div>
              <span v-for="item in remainingItems(businessKeywordItems)" :key="item">{{ item }}</span>
            </div>
          </details>
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
        <div v-for="item in previewItems(weightItems)" :key="item.label" class="weight-item">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </div>
        <details v-if="remainingItems(weightItems).length" class="analysis-more weight-more">
          <summary>展开其余 {{ remainingItems(weightItems).length }} 项</summary>
          <div class="weight-list">
            <div v-for="item in remainingItems(weightItems)" :key="item.label" class="weight-item">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
        </details>
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

const PREVIEW_LIMIT = 3

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const friendlyJobParseError = (message?: string) =>
  toFriendlyMessage(message, '岗位描述解析没有成功，请补充岗位描述内容或稍后重试。')

const structuredFieldLabels: Record<string, string> = {
  topic: '主题',
  reason: '关注原因',
  requiredLevel: '要求程度',
  level: '要求程度',
  proficiency: '要求程度',
  proficiencyLevel: '要求程度',
  evidence: '依据',
  evidenceText: '依据',
  confidence: '可信度',
  confidenceLevel: '可信度',
  description: '说明',
  requirement: '要求',
  weight: '权重'
}

const primaryFieldKeys = ['name', 'skill', 'label', 'title', 'topic', 'description', 'requirement', 'point']
const splitText = (value: string) =>
  value
    .split(/\r?\n|[；;]/)
    .map((item) => item.trim())
    .filter(Boolean)

interface InterviewFocusSection {
  label: '主题' | '原因' | '证据' | '建议'
  content: string
}

interface InterviewFocusItem {
  id: string
  sections: InterviewFocusSection[]
}

const interviewFocusFields = [
  {
    label: '主题',
    keys: ['topic', 'title', 'focus', 'focusPoint', 'point', 'name']
  },
  {
    label: '原因',
    keys: ['reason', 'rationale', 'why', 'focusReason', 'importance']
  },
  {
    label: '证据',
    keys: ['evidence', 'evidenceText', 'basis', 'source', 'jobEvidence']
  },
  {
    label: '建议',
    keys: [
      'suggestion',
      'advice',
      'recommendation',
      'preparation',
      'preparationAdvice',
      'preparationSuggestion',
      'action',
      'nextStep'
    ]
  }
] as const

const interviewFocusContainerKeys = ['items', 'points', 'focusPoints', 'interviewFocusPoints']

const toSectionText = (value: unknown): string => {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    return value
      .map(toSectionText)
      .filter(Boolean)
      .join('\n')
  }
  if (isRecord(value)) {
    return Object.values(value)
      .map(toSectionText)
      .filter(Boolean)
      .join('\n')
  }
  return ''
}

const readInterviewFocusField = (
  value: Record<string, unknown>,
  keys: readonly string[]
) => {
  for (const key of keys) {
    const content = toSectionText(value[key])
    if (content) return content
  }
  return ''
}

const createInterviewFocusItem = (
  sections: InterviewFocusSection[],
  index: number
): InterviewFocusItem => ({
  id: `${index}-${sections.map((section) => section.content).join('|')}`,
  sections
})

const normalizeInterviewFocusItems = (value: unknown): InterviewFocusItem[] => {
  const normalized: InterviewFocusSection[][] = []

  const append = (item: unknown) => {
    if (Array.isArray(item)) {
      item.forEach(append)
      return
    }
    if (typeof item === 'string') {
      splitText(item).forEach((topic) => {
        normalized.push(interviewFocusFields.map(({ label }) => ({
          label,
          content: label === '主题' ? topic : ''
        })))
      })
      return
    }
    if (typeof item === 'number' || typeof item === 'boolean') {
      normalized.push(interviewFocusFields.map(({ label }) => ({
        label,
        content: label === '主题' ? String(item) : ''
      })))
      return
    }
    if (!isRecord(item)) return

    const sections = interviewFocusFields.map(({ label, keys }) => ({
      label,
      content: readInterviewFocusField(item, keys)
    }))
    if (sections.some((section) => section.content)) {
      normalized.push(sections)
      return
    }

    for (const key of interviewFocusContainerKeys) {
      if (key in item) append(item[key])
    }
  }

  append(value)
  return normalized.map(createInterviewFocusItem)
}

const stringifyItem = (value: unknown): string => {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (isRecord(value)) {
    const primaryKey = primaryFieldKeys.find((key) => typeof value[key] === 'string' && String(value[key]).trim())
    const primary = primaryKey ? stringifyItem(value[primaryKey]) : ''
    const details = Object.entries(value)
      .filter(([key]) => key !== primaryKey && structuredFieldLabels[key])
      .map(([key, item]) => {
        const text = stringifyItem(item)
        return text ? `${structuredFieldLabels[key]}：${text}` : ''
      })
      .filter(Boolean)
    return [primary, ...details].filter(Boolean).join(' · ')
  }
  return ''
}

const toDisplayItems = (value: unknown): string[] => {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const text = stringifyItem(item)
      return text ? splitText(text) : []
    })
  }
  if (isRecord(value)) {
    const structured = stringifyItem(value)
    if (structured) return splitText(structured)
    return Object.values(value).flatMap((item) => {
      const text = stringifyItem(item)
      return text ? splitText(text) : []
    })
  }
  const text = stringifyItem(value)
  return text ? splitText(text) : []
}

const previewItems = <T>(items: T[]) => items.slice(0, PREVIEW_LIMIT)
const remainingItems = <T>(items: T[]) => items.slice(PREVIEW_LIMIT)
const responsibilityItems = computed(() => toDisplayItems(props.analysis.responsibilities))
const requiredSkillItems = computed(() => toDisplayItems(props.analysis.requiredSkills))
const bonusSkillItems = computed(() => toDisplayItems(props.analysis.bonusSkills))
const interviewFocusItems = computed(() => normalizeInterviewFocusItems(props.analysis.interviewFocusPoints))
const techStackItems = computed(() => toDisplayItems(props.analysis.techStackKeywords))
const businessKeywordItems = computed(() => toDisplayItems(props.analysis.businessKeywords))

const weightItems = computed(() => {
  if (!isRecord(props.analysis.skillWeights)) return []
  return Object.entries(props.analysis.skillWeights)
    .map(([label, value]) => ({
      label: label.trim(),
      value: stringifyItem(value) || '--'
    }))
    .filter((item) => item.label)
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
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--arena-card, var(--app-surface));
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
    color: var(--app-text);
    line-height: 1.7;
  }
}

.analysis-error {
  padding: 12px 14px;
  border: 1px solid var(--user-danger-border, var(--app-border));
  border-radius: 10px;
  background: var(--user-danger-soft, var(--arena-red-soft));
  color: var(--user-danger, var(--arena-red));
  line-height: 1.7;
}

.analysis-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.analysis-grid.compact {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.analysis-block {
  min-width: 0;
  padding: 14px;

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
    color: var(--app-text);
    line-height: 1.7;
  }
}

.interview-focus-list {
  min-width: 0;
}

.interview-focus-item {
  min-width: 0;
  padding: 10px 0;

  &:first-child {
    padding-top: 0;
  }

  & + & {
    border-top: 1px solid var(--app-border);
  }
}

.interview-focus-sections {
  display: grid;
  min-width: 0;
  margin: 0;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.interview-focus-section {
  min-width: 0;
  padding: 8px 10px;
  background: var(--user-surface-muted, var(--app-surface-raised));

  &:first-child {
    grid-column: 1 / -1;
    border-bottom: 1px solid var(--app-border);
  }

  &:nth-child(2) {
    border-right: 1px solid var(--app-border);
  }

  &:last-child {
    grid-column: 1 / -1;
    border-top: 1px solid var(--app-border);
  }

  dt {
    color: var(--app-text-muted);
    font-size: 12px;
    font-weight: 700;
  }

  dd {
    margin: 5px 0 0;
  }
}

.interview-focus-value {
  min-width: 0;
  color: var(--app-text);
  line-height: 1.65;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  word-break: break-word;

  &.is-empty {
    color: var(--app-text-muted);
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
    border: 1px solid var(--app-border);
    border-radius: 999px;
    background: var(--app-primary-soft, var(--user-surface-muted));
    color: var(--app-primary);
    font-size: 12px;
  }
}

.analysis-more {
  width: 100%;

  summary {
    color: var(--app-primary);
    cursor: pointer;
    font-size: 12px;
    font-weight: 700;
  }

  > p:first-of-type {
    margin-top: 8px;
  }
}

.analysis-more--tags > div {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.weight-more {
  grid-column: 1 / -1;

  > .weight-list {
    margin-top: 10px;
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
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--user-surface-muted, var(--app-surface-raised));

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
    color: var(--app-text);
    font-size: 15px;
  }
}

@media (max-width: 980px) {
  .analysis-grid,
  .analysis-grid.compact,
  .weight-list {
    grid-template-columns: 1fr;
  }

  .interview-focus-sections {
    grid-template-columns: 1fr;
  }

  .interview-focus-section:first-child {
    grid-column: auto;
  }

  .interview-focus-section:nth-child(2) {
    border-right: 0;
  }

  .interview-focus-section:last-child {
    grid-column: auto;
  }

  .analysis-summary {
    flex-direction: column;
  }
}
</style>
