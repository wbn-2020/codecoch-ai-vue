<template>
  <section class="content-card completeness-panel">
    <div class="panel-head">
      <div>
        <p class="panel-kicker">Completeness</p>
        <h3>素材完整度</h3>
      </div>
      <el-tag :type="getCompletenessTone(status)" effect="dark">{{ score }}%</el-tag>
    </div>
    <el-progress :percentage="score" :stroke-width="10" :show-text="false" />
    <div v-if="firstPriorityGap" class="priority-gap" data-testid="first-priority-gap">
      <span>第一优先缺口</span>
      <strong>{{ firstPriorityGap }}</strong>
      <p>先补这一项，再继续完善其他证据。</p>
    </div>
    <div class="missing-list">
      <template v-if="remainingGaps.length">
        <span>其他待补</span>
        <el-tag v-for="field in remainingGaps" :key="field" type="warning" effect="plain">
          {{ field }}
        </el-tag>
      </template>
      <el-tag v-if="labels.length === 0" type="success" effect="plain">核心素材已齐备</el-tag>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { getCompletenessTone, normalizeMissingFields } from '@/features/project-evidence'

const props = defineProps<{
  score?: number
  status?: string
  missingFields?: string[] | string
}>()

const score = computed(() => Math.max(0, Math.min(100, props.score ?? 0)))
const labels = computed(() => normalizeMissingFields(props.missingFields))
const firstPriorityGap = computed(() => labels.value[0] || '')
const remainingGaps = computed(() => labels.value.slice(1))
</script>

<style scoped lang="scss">
.completeness-panel {
  padding: 18px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.panel-kicker {
  margin: 0 0 4px;
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

h3 {
  margin: 0;
  font-size: 18px;
}

.missing-list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;

  > span {
    color: var(--app-text-muted);
    font-size: 12px;
    font-weight: 600;
  }
}

.priority-gap {
  display: grid;
  gap: 4px;
  margin-top: 14px;
  padding: 12px;
  border: 1px solid var(--el-color-warning-light-5);
  border-radius: 8px;
  background: var(--el-color-warning-light-9);

  span {
    color: var(--el-color-warning-dark-2);
    font-size: 12px;
    font-weight: 600;
  }

  strong {
    color: var(--app-text);
    font-size: 16px;
  }

  p {
    margin: 0;
    color: var(--app-text-muted);
    font-size: 12px;
  }
}
</style>
