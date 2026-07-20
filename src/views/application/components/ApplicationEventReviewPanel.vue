<template>
  <section
    v-if="review"
    class="application-event-review"
    data-testid="application-event-structured-review"
  >
    <header class="review-header">
      <div>
        <h4>事件复盘</h4>
        <p v-if="review.analysis.summary">{{ review.analysis.summary }}</p>
      </div>
      <div class="review-badges">
        <el-tag size="small" effect="plain">
          {{ getApplicationReviewOwnerLabel(review.analysis.owner) }}
        </el-tag>
        <el-tag
          v-if="review.generation.fallback"
          size="small"
          type="warning"
          effect="plain"
          data-testid="application-review-fallback"
        >
          规则降级
        </el-tag>
        <el-tag
          v-if="review.generation.confidenceLevel"
          size="small"
          :type="confidenceTagType(review.generation.confidenceLevel)"
          effect="plain"
          data-testid="application-review-confidence"
        >
          {{ getApplicationReviewConfidenceLabel(review.generation.confidenceLevel) }}
        </el-tag>
        <el-tag v-if="review.eventScope" size="small" type="info" effect="plain">
          {{ eventScopeLabel(review.eventScope) }}
        </el-tag>
      </div>
    </header>

    <div v-if="facts.length" class="review-section">
      <h5>原始事实</h5>
      <ul class="review-list facts-list">
        <li v-for="fact in facts" :key="factKey(fact)">
          <el-tag size="small" :type="ownerTagType(fact.owner)" effect="plain">
            {{ getApplicationReviewOwnerLabel(fact.owner) }}
          </el-tag>
          <span>{{ fact.content }}</span>
        </li>
      </ul>
    </div>

    <div v-if="review.userInput.selfReflection" class="review-section">
      <h5>我的反思</h5>
      <p class="reflection-text">{{ review.userInput.selfReflection }}</p>
    </div>

    <div v-if="review.analysis.limits.length" class="review-section">
      <h5>结论限制</h5>
      <ul class="review-list">
        <li v-for="item in review.analysis.limits" :key="item">{{ item }}</li>
      </ul>
    </div>

    <div v-if="review.analysis.signals.length" class="review-section">
      <h5>弱信号</h5>
      <div class="signal-list">
        <details
          v-for="(signal, index) in review.analysis.signals"
          :key="`${signal.content}-${index}`"
          class="signal-item"
        >
          <summary>
            <span>{{ signal.content }}</span>
            <el-tag
              v-if="signal.confidenceLevel"
              size="small"
              :type="confidenceTagType(signal.confidenceLevel)"
              effect="plain"
            >
              {{ getApplicationReviewConfidenceLabel(signal.confidenceLevel) }}
            </el-tag>
          </summary>
          <div class="signal-evidence">
            <strong>依据</strong>
            <ul v-if="referencedFacts(signal.factRefs).length" class="review-list">
              <li v-for="fact in referencedFacts(signal.factRefs)" :key="factKey(fact)">
                {{ fact.id }} · {{ fact.content }}
              </li>
            </ul>
            <p v-else>当前响应未返回可展示的事实引用。</p>
          </div>
        </details>
      </div>
    </div>

    <div v-if="review.analysis.adjustments.length" class="review-section">
      <h5>下一轮调整</h5>
      <ol class="review-list ordered-list">
        <li v-for="item in review.analysis.adjustments" :key="item">{{ item }}</li>
      </ol>
    </div>

    <div v-if="review.analysis.nextActions.length" class="review-section">
      <h5>下一步动作</h5>
      <ol class="review-list ordered-list">
        <li v-for="item in review.analysis.nextActions" :key="item">{{ item }}</li>
      </ol>
    </div>

    <footer class="generation-info">
      <span>{{ generationOwnerLabel }}</span>
      <span v-if="review.generation.generatedAt">
        {{ formatDateTime(review.generation.generatedAt) }}
      </span>
      <span v-if="review.generation.confidenceBasis.length">
        {{ review.generation.confidenceBasis.join('；') }}
      </span>
    </footer>
  </section>

  <section
    v-else-if="legacyText"
    class="application-event-review legacy-review"
    data-testid="application-event-legacy-review"
  >
    <header class="review-header">
      <h4>历史复盘</h4>
      <el-tag size="small" type="info" effect="plain">历史数据</el-tag>
    </header>
    <p>{{ legacyText }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import {
  getApplicationEventReviewFactMap,
  getApplicationReviewConfidenceLabel,
  getApplicationReviewOwnerLabel,
  type ApplicationEventReviewFact,
  type ApplicationEventStructuredReview
} from '@/features/applications'
import { formatDateTime } from '@/utils/format'

const props = defineProps<{
  review?: ApplicationEventStructuredReview | null
  legacyText?: string
}>()

const factMap = computed(() => getApplicationEventReviewFactMap(props.review))
const facts = computed(() => [
  ...(props.review?.userInput.observedFacts || []),
  ...(props.review?.userInput.externalFeedback ? [props.review.userInput.externalFeedback] : []),
  ...(props.review?.systemFacts || [])
])
const generationOwnerLabel = computed(() => {
  if (!props.review) return ''
  return props.review.generation.fallback
    ? getApplicationReviewOwnerLabel('RULE')
    : getApplicationReviewOwnerLabel(props.review.analysis.owner)
})

const referencedFacts = (factRefs: string[]) =>
  factRefs
    .map((factRef) => factMap.value.get(factRef))
    .filter((fact): fact is ApplicationEventReviewFact => Boolean(fact))

const factKey = (fact: ApplicationEventReviewFact) =>
  fact.id || `${fact.owner}-${fact.sourceType || 'fact'}-${fact.content}`

const ownerTagType = (owner?: string) => {
  if (owner === 'USER') return 'success'
  if (owner === 'SYSTEM') return 'info'
  if (owner === 'RULE') return 'warning'
  return ''
}

const confidenceTagType = (confidence?: string) => {
  const normalized = String(confidence || '').toUpperCase()
  if (normalized === 'HIGH') return 'success'
  if (normalized === 'LOW') return 'warning'
  return 'info'
}

const eventScopeLabel = (scope?: string) => {
  const normalized = String(scope || '').toUpperCase()
  if (normalized === 'REAL_JOB') return '真实求职事件'
  if (normalized === 'SIMULATION') return '模拟面试'
  return '范围待确认'
}
</script>

<style scoped lang="scss">
.application-event-review {
  display: grid;
  gap: 14px;
  margin-top: 10px;
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface);
}

.review-header,
.review-badges,
.facts-list li,
.signal-item summary,
.generation-info {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.review-header {
  justify-content: space-between;
}

.review-header h4,
.review-header p,
.review-section h5,
.reflection-text,
.legacy-review p {
  margin: 0;
}

.review-header h4 {
  font-size: 15px;
}

.review-header p,
.reflection-text,
.legacy-review p,
.signal-evidence p {
  margin-top: 5px;
  color: var(--app-text-secondary);
  line-height: 1.65;
  white-space: pre-wrap;
}

.review-badges {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.review-section {
  display: grid;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--app-border);
}

.review-section h5 {
  font-size: 13px;
}

.review-list {
  display: grid;
  gap: 7px;
  margin: 0;
  padding-left: 20px;
  color: var(--app-text-secondary);
  line-height: 1.6;
}

.facts-list {
  padding-left: 0;
  list-style: none;
}

.facts-list li {
  align-items: center;
}

.facts-list span:last-child {
  min-width: 0;
}

.ordered-list {
  list-style-position: outside;
}

.signal-list {
  display: grid;
  gap: 8px;
}

.signal-item {
  border-bottom: 1px solid var(--app-border);
}

.signal-item:last-child {
  border-bottom: 0;
}

.signal-item summary {
  justify-content: space-between;
  padding: 7px 0;
  color: var(--app-text);
  cursor: pointer;
  line-height: 1.55;
}

.signal-item summary span {
  min-width: 0;
}

.signal-evidence {
  padding: 4px 0 10px 18px;
}

.signal-evidence strong {
  font-size: 12px;
}

.generation-info {
  flex-wrap: wrap;
  padding-top: 12px;
  border-top: 1px solid var(--app-border);
  color: var(--app-text-secondary);
  font-size: 12px;
  line-height: 1.55;
}

.legacy-review p {
  word-break: break-word;
}

@media (max-width: 640px) {
  .review-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .review-badges {
    justify-content: flex-start;
  }
}
</style>
