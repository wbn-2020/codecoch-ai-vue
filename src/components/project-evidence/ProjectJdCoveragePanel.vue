<template>
  <section class="content-card coverage-panel">
    <div class="panel-head">
      <div>
        <p class="panel-kicker">JD Coverage</p>
        <h3>Coverage analysis</h3>
      </div>
      <el-tag effect="dark">{{ coverage?.coverageScore ?? 0 }}%</el-tag>
    </div>

    <div class="coverage-form">
      <el-input-number v-model="targetJobId" :min="1" :controls="false" placeholder="Target job id" />
      <el-button type="primary" :loading="analyzing" @click="handleAnalyze">
        <Search :size="16" />
        Analyze
      </el-button>
    </div>
    <el-input
      v-model="jdText"
      type="textarea"
      :rows="3"
      placeholder="Optional JD text. If empty, the linked target job analysis is used."
    />

    <div v-if="coverage" class="coverage-grid">
      <div class="coverage-block">
        <h4>Covered</h4>
        <el-tag v-for="skill in coverage.coveredSkills || []" :key="skill" type="success" effect="plain">{{ skill }}</el-tag>
      </div>
      <div class="coverage-block">
        <h4>Weak</h4>
        <el-tag v-for="skill in coverage.weakCoveredSkills || []" :key="skill" type="warning" effect="plain">{{ skill }}</el-tag>
      </div>
      <div class="coverage-block">
        <h4>Missing</h4>
        <el-tag v-for="skill in coverage.missingSkills || []" :key="skill" type="danger" effect="plain">{{ skill }}</el-tag>
      </div>
    </div>

    <div v-if="coverage?.expressionSuggestions?.length" class="suggestions">
      <h4>Suggestions</h4>
      <ul>
        <li v-for="item in coverage.expressionSuggestions" :key="item">{{ item }}</li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Search } from 'lucide-vue-next'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

import { analyzeProjectJdCoverageApi } from '@/api/projectEvidence'
import type { ProjectJdCoverageVO } from '@/types/projectEvidence'
import { getErrorMessage } from '@/utils/error'

const props = defineProps<{
  projectId: number
  defaultTargetJobId?: number
}>()

const targetJobId = ref<number | undefined>(props.defaultTargetJobId)
const jdText = ref('')
const analyzing = ref(false)
const coverage = ref<ProjectJdCoverageVO | null>(null)

const handleAnalyze = async () => {
  analyzing.value = true
  try {
    coverage.value = await analyzeProjectJdCoverageApi(props.projectId, {
      targetJobId: targetJobId.value,
      jdText: jdText.value.trim() || undefined
    })
  } catch (error) {
    ElMessage.error(getErrorMessage(error, 'JD coverage analysis failed.'))
  } finally {
    analyzing.value = false
  }
}
</script>

<style scoped lang="scss">
.coverage-panel {
  padding: 18px;
}

.panel-head,
.coverage-form {
  display: flex;
  align-items: center;
  gap: 10px;
}

.panel-head {
  justify-content: space-between;
  margin-bottom: 14px;
}

.panel-kicker {
  margin: 0 0 4px;
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

h3,
h4 {
  margin: 0;
}

.coverage-form {
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.coverage-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.coverage-block {
  display: flex;
  align-content: flex-start;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 96px;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.24);

  h4 {
    width: 100%;
    color: var(--app-text-muted);
    font-size: 13px;
  }
}

.suggestions {
  margin-top: 14px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(14, 165, 233, 0.08);

  ul {
    margin: 8px 0 0;
    padding-left: 18px;
    color: var(--app-text-muted);
    line-height: 1.7;
  }
}

@media (max-width: 760px) {
  .panel-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .coverage-grid {
    grid-template-columns: 1fr;
  }
}
</style>
