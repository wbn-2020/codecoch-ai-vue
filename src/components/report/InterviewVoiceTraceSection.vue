<template>
  <section v-if="rows.length" class="voice-trace-section">
    <div class="section-head">
      <h2>语音来源追踪</h2>
      <p>{{ summaryText }}</p>
    </div>
    <div class="voice-trace-grid">
      <article v-for="(item, index) in rows" :key="traceItemKey(item, index)" class="voice-trace-card">
        <header>
          <strong>{{ sourceLabel(item.answerSource) }}</strong>
          <el-tag size="small" :type="tagType(item)" effect="plain">{{ statusLabel(item) }}</el-tag>
        </header>
        <div class="voice-trace-meta">
          <span>问题 {{ item.questionMessageId || item.questionId || '-' }}</span>
          <span>置信度 {{ confidenceText(item.confidence) }}</span>
          <span v-if="item.lowConfidence">低置信已确认</span>
          <span v-if="item.fallback">ASR fallback</span>
          <span v-if="item.traceId">Trace {{ shortTraceId(item.traceId) }}</span>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { InterviewVoiceTraceVO } from '@/types/interview'

const props = defineProps<{
  voiceTraces?: InterviewVoiceTraceVO[] | null
}>()

const rows = computed(() =>
  Array.isArray(props.voiceTraces)
    ? props.voiceTraces.filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    : []
)

const summaryText = computed(() => {
  const total = rows.value.length
  const lowConfidenceCount = rows.value.filter((item) => item.lowConfidence).length
  const fallbackCount = rows.value.filter((item) => item.fallback).length
  return `已记录 ${total} 条语音确认来源；${lowConfidenceCount} 条低置信，${fallbackCount} 条 ASR fallback。`
})

const traceItemKey = (item: InterviewVoiceTraceVO, index: number) =>
  item.transcriptId || item.voiceSubmissionId || item.answerMessageId || item.traceId || item.questionMessageId || `voice-trace-${index}`

const sourceLabel = (source?: string) => {
  const value = String(source || '').toUpperCase()
  if (value === 'VOICE_TRANSCRIPT') return '语音转写确认'
  if (value === 'MANUAL_TRANSCRIPT') return '手动转写确认'
  return '文本回答'
}

const statusLabel = (item: InterviewVoiceTraceVO) => {
  if (item.fallback) return 'Fallback'
  if (item.lowConfidence) return '低置信'
  return item.transcriptStatus || '已确认'
}

const tagType = (item: InterviewVoiceTraceVO) => {
  if (item.fallback || item.lowConfidence) return 'warning'
  return 'success'
}

const confidenceText = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '-'
  return `${Math.round(Number(value) * 100)}%`
}

const shortTraceId = (value?: string) => {
  if (!value) return ''
  return value.length <= 18 ? value : `${value.slice(0, 10)}...${value.slice(-6)}`
}
</script>

<style scoped lang="scss">
.voice-trace-section {
  margin-top: 16px;
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--user-surface-muted);
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;

  h2 {
    margin: 0;
    color: var(--app-text);
    font-size: 18px;
    line-height: 1.35;
  }

  p {
    margin: 4px 0 0;
    color: var(--app-text-muted);
    font-size: 13px;
    line-height: 1.5;
  }
}

.voice-trace-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.voice-trace-card {
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--user-surface);

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  strong {
    min-width: 0;
    color: var(--app-text);
    font-size: 15px;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }
}

.voice-trace-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;

  span {
    padding: 4px 8px;
    border-radius: 999px;
    background: var(--user-primary-soft);
    color: var(--user-primary);
    font-size: 12px;
    font-weight: 700;
  }
}

@media (max-width: 1080px) {
  .voice-trace-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 760px) {
  .section-head {
    flex-direction: column;
  }

  .voice-trace-grid {
    grid-template-columns: 1fr;
  }
}
</style>
