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
    <div class="missing-list">
      <el-tag v-for="field in labels" :key="field" :type="labels.length ? 'warning' : 'success'" effect="plain">
        {{ field }}
      </el-tag>
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
  font-weight: 700;
  text-transform: uppercase;
}

h3 {
  margin: 0;
  font-size: 18px;
}

.missing-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}
</style>
