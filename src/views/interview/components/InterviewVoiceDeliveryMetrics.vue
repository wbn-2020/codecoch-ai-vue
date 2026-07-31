<template>
  <section v-if="facts.length || pending || failedMessage" class="delivery-metrics">
    <div class="delivery-metrics__head">
      <div>
        <span>最近一次语音表达事实</span>
        <strong>{{ pending ? '正在分析表达数据' : '只展示可验证指标' }}</strong>
      </div>
      <el-tag :type="pending ? 'info' : failedMessage ? 'warning' : 'success'" effect="plain">
        {{ pending ? '分析中' : failedMessage ? '不可用' : '已完成' }}
      </el-tag>
    </div>

    <el-alert
      v-if="failedMessage"
      type="warning"
      :closable="false"
      show-icon
      :title="failedMessage"
    />

    <div v-if="facts.length" class="delivery-metrics__grid">
      <article v-for="fact in facts" :key="fact.key" :class="{ unavailable: !fact.available }">
        <span>{{ fact.label }}</span>
        <strong>{{ fact.value }}</strong>
        <p v-if="fact.hint">{{ fact.hint }}</p>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { buildVoiceDeliveryFacts } from '@/features/interview-voice-product'
import type { InterviewVoiceDeliveryAnalysisVO } from '@/types/interviewVoiceProduct'

const props = defineProps<{
  analysis?: InterviewVoiceDeliveryAnalysisVO | null
}>()

const pending = computed(() =>
  ['QUEUED', 'RUNNING'].includes(String(props.analysis?.taskStatus || '').toUpperCase())
)
const facts = computed(() => buildVoiceDeliveryFacts(props.analysis))
const failedMessage = computed(() => {
  const analysis = props.analysis
  if (!analysis || pending.value || analysis.taskStatus === 'SUCCEEDED') return ''
  return analysis.errorMessage || '本次表达分析没有成功完成，不展示推测指标。'
})
</script>

<style scoped lang="scss">
.delivery-metrics {
  display: grid;
  gap: 10px;
  margin-top: 12px;
  padding: 14px;
  border: 1px solid var(--user-success-border);
  border-radius: 12px;
  background: var(--user-success-soft);
}

.delivery-metrics__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  span,
  strong {
    display: block;
  }

  span {
    color: var(--user-success);
    font-size: 12px;
    font-weight: 700;
  }

  strong {
    margin-top: 4px;
    color: var(--user-surface-muted);
    font-size: 14px;
  }
}

.delivery-metrics__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;

  article {
    min-width: 0;
    padding: 10px;
    border: 1px solid var(--user-border);
    border-radius: 10px;
    background: var(--user-surface);

    &.unavailable {
      border-style: dashed;
    }
  }

  span,
  strong,
  p {
    display: block;
  }

  span {
    color: var(--user-text-muted);
    font-size: 11px;
  }

  strong {
    margin-top: 5px;
    color: var(--user-border);
  }

  p {
    margin: 5px 0 0;
    color: var(--user-text-muted);
    font-size: 11px;
    line-height: 1.5;
  }
}

@media (max-width: 520px) {
  .delivery-metrics__grid {
    grid-template-columns: 1fr;
  }
}

.delivery-metrics {
  gap: 8px;
  margin-top: 10px;
  padding: 10px 12px;
  border-color: var(--user-success-border);
  border-radius: var(--user-radius-sm);
  background: var(--user-surface-muted);
}

.delivery-metrics__head {
  align-items: center;

  span {
    color: var(--user-success);
  }

  strong {
    color: var(--user-text);
  }
}

.delivery-metrics__grid {
  gap: 0;
  border-top: 1px solid var(--user-border);
  border-bottom: 1px solid var(--user-border);

  article {
    padding: 9px 10px;
    border: 0;
    border-right: 1px solid var(--user-border);
    border-radius: 0;
    background: transparent;

    &:last-child {
      border-right: 0;
    }

    &.unavailable {
      background: var(--user-warning-soft);
    }
  }

  span,
  p {
    color: var(--user-text-muted);
  }

  strong {
    color: var(--user-text);
  }
}

@media (max-width: 520px) {
  .delivery-metrics__head {
    align-items: flex-start;
  }

  .delivery-metrics__grid {
    border: 1px solid var(--user-border);
  }

  .delivery-metrics__grid article {
    border-right: 0;
    border-bottom: 1px solid var(--user-border);
  }

  .delivery-metrics__grid article:last-child {
    border-bottom: 0;
  }
}
</style>
