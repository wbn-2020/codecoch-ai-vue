<template>
  <div class="agent-task-evidence">
    <button class="agent-task-evidence__toggle" type="button" @click="toggle">
      <span>
        <ShieldCheck :size="15" />
        为什么推荐
      </span>
      <span class="agent-task-evidence__toggle-meta">
        <span v-if="feedbackRecorded" class="agent-task-evidence__feedback-tag">已记录反馈</span>
        <ChevronDown class="agent-task-evidence__chevron" :class="{ 'is-open': isOpen }" :size="16" />
      </span>
    </button>

    <div v-if="isOpen" class="agent-task-evidence__body">
      <dl>
        <div>
          <dt>来源</dt>
          <dd>{{ evidence.sourceLabel }}</dd>
        </div>
        <div>
          <dt>技能</dt>
          <dd>{{ evidence.skillLabel }}</dd>
        </div>
        <div>
          <dt>对象</dt>
          <dd>{{ evidence.bizLabel }}</dd>
        </div>
      </dl>

      <p>{{ evidence.reason }}</p>

      <el-alert
        v-if="evidence.unavailableReason"
        type="warning"
        :closable="false"
        show-icon
        :title="evidence.unavailableReason"
      />

      <div class="agent-task-evidence__actions">
        <el-button size="small" @click="$emit('open', evidence.safePath)">
          <span>{{ evidence.actionLabel }}</span>
          <ExternalLink :size="14" />
        </el-button>
      </div>

      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronDown, ExternalLink, ShieldCheck } from 'lucide-vue-next'
import { computed, ref } from 'vue'

import type { AgentTaskEvidence as AgentTaskEvidenceInfo } from '@/features/job-readiness/types'

const props = withDefaults(defineProps<{
  evidence: AgentTaskEvidenceInfo
  open?: boolean
  feedbackRecorded?: boolean
}>(), {
  open: undefined,
  feedbackRecorded: false
})

const emit = defineEmits<{
  open: [path: string]
  'update:open': [value: boolean]
}>()

const innerOpen = ref(false)
const isOpen = computed({
  get: () => props.open ?? innerOpen.value,
  set: (value: boolean) => {
    if (props.open === undefined) {
      innerOpen.value = value
    }
    emit('update:open', value)
  }
})

const toggle = () => {
  isOpen.value = !isOpen.value
}
</script>

<style scoped lang="scss">
.agent-task-evidence {
  margin-top: 12px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.24);
}

.agent-task-evidence__toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: 0;
  background: transparent;
  color: var(--app-text-muted);
  cursor: pointer;
}

.agent-task-evidence__toggle > span {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
  overflow-wrap: anywhere;
}

.agent-task-evidence__toggle-meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.agent-task-evidence__feedback-tag {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.14);
  color: #86efac;
  font-size: 12px;
  line-height: 1.5;
}

.agent-task-evidence__chevron {
  transition: transform 0.18s ease;
}

.agent-task-evidence__chevron.is-open {
  transform: rotate(180deg);
}

.agent-task-evidence__body {
  display: grid;
  gap: 12px;
  padding: 0 12px 12px;
}

.agent-task-evidence dl {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
}

.agent-task-evidence dt {
  color: var(--app-text-muted);
  font-size: 12px;
}

.agent-task-evidence dd {
  margin: 4px 0 0;
  color: var(--app-text);
  font-size: 13px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.agent-task-evidence p {
  margin: 0;
  color: var(--app-text-muted);
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.agent-task-evidence__actions {
  display: flex;
  justify-content: flex-start;
  min-width: 0;

  :deep(.el-button) {
    max-width: 100%;
    height: auto;
    min-height: 28px;
    white-space: normal;
  }

  :deep(.el-button > span) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    min-width: 0;
    overflow-wrap: anywhere;
  }
}

@media (max-width: 720px) {
  .agent-task-evidence dl {
    grid-template-columns: 1fr;
  }
}
</style>
