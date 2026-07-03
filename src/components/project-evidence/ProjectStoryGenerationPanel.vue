<template>
  <section class="content-card story-panel">
    <div class="panel-head">
      <div>
        <p class="panel-kicker">Interview Material</p>
        <h3>Generated stories</h3>
      </div>
      <el-segmented v-model="generationType" :options="typeOptions" />
    </div>

    <div class="toolbar">
      <el-button type="primary" :loading="generating" @click="handleGenerate">
        <Wand2 :size="16" />
        Generate
      </el-button>
      <el-button :loading="loading" @click="fetchGenerations">
        <RefreshCw :size="16" />
        Refresh
      </el-button>
    </div>

    <div class="generation-list">
      <article v-for="item in filteredItems" :key="item.id || `${item.generationType}-${item.createdAt}`" class="generation-item">
        <div class="item-head">
          <div>
            <strong>{{ getTypeLabel(item.generationType) }}</strong>
            <span>{{ item.resultSource || 'LOCAL_GENERATOR' }}</span>
          </div>
          <el-tag :type="item.accepted ? 'success' : 'info'" effect="plain">
            {{ item.accepted ? 'Accepted' : item.status || 'Draft' }}
          </el-tag>
        </div>
        <pre>{{ item.resultText || 'No generated result.' }}</pre>
        <div class="item-actions">
          <el-button size="small" @click="copyText(item.resultText)">
            <Copy :size="14" />
            Copy
          </el-button>
          <el-button
            size="small"
            type="success"
            plain
            :disabled="!item.id || item.accepted"
            @click="handleAccept(item)"
          >
            <CheckCircle2 :size="14" />
            Accept
          </el-button>
        </div>
      </article>
      <AppState v-if="!loading && filteredItems.length === 0" type="empty" title="No generated material yet" description="Generate a bullet, STAR answer, or interview questions from the current project evidence." />
    </div>
  </section>
</template>

<script setup lang="ts">
import { CheckCircle2, Copy, RefreshCw, Wand2 } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'

import {
  acceptProjectStoryGenerationApi,
  generateProjectStoryApi,
  getProjectStoryGenerationsApi
} from '@/api/projectEvidence'
import AppState from '@/components/common/AppState.vue'
import type { ProjectStoryGenerationType, ProjectStoryGenerationVO } from '@/types/projectEvidence'
import { getErrorMessage } from '@/utils/error'

const props = defineProps<{
  projectId: number
  targetJobId?: number
}>()

const generationType = ref<ProjectStoryGenerationType>('RESUME_BULLET')
const loading = ref(false)
const generating = ref(false)
const items = ref<ProjectStoryGenerationVO[]>([])

const typeOptions = [
  { label: 'Bullet', value: 'RESUME_BULLET' },
  { label: 'STAR', value: 'STAR_STORY' },
  { label: 'Questions', value: 'INTERVIEW_QUESTIONS' }
]

const filteredItems = computed(() => items.value.filter((item) => item.generationType === generationType.value))

const getTypeLabel = (type?: string) =>
  typeOptions.find((item) => item.value === type)?.label || type || 'Material'

const fetchGenerations = async () => {
  loading.value = true
  try {
    items.value = await getProjectStoryGenerationsApi(props.projectId)
  } catch (error) {
    ElMessage.error(getErrorMessage(error, 'Generated material failed to load.'))
  } finally {
    loading.value = false
  }
}

const handleGenerate = async () => {
  generating.value = true
  try {
    const created = await generateProjectStoryApi(props.projectId, {
      generationType: generationType.value,
      targetJobId: props.targetJobId
    })
    items.value = [created, ...items.value]
    ElMessage.success('Generated material saved.')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, 'Generation failed. Project evidence can still be edited manually.'))
  } finally {
    generating.value = false
  }
}

const copyText = async (text?: string) => {
  if (!text) return
  await navigator.clipboard.writeText(text)
  ElMessage.success('Copied.')
}

const handleAccept = async (item: ProjectStoryGenerationVO) => {
  if (!item.id) return
  const accepted = await acceptProjectStoryGenerationApi(props.projectId, item.id)
  items.value = items.value.map((current) => ({
    ...current,
    accepted: current.generationType === accepted.generationType ? current.id === accepted.id : current.accepted
  }))
  ElMessage.success('Marked as accepted.')
}

onMounted(fetchGenerations)
</script>

<style scoped lang="scss">
.story-panel {
  padding: 18px;
}

.panel-head,
.toolbar,
.item-head,
.item-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.panel-head,
.item-head {
  justify-content: space-between;
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
}

.toolbar {
  flex-wrap: wrap;
  margin: 14px 0;
}

.generation-list {
  display: grid;
  gap: 12px;
}

.generation-item {
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.45);

  span {
    display: block;
    margin-top: 4px;
    color: var(--app-text-muted);
    font-size: 12px;
  }

  pre {
    overflow: auto;
    margin: 12px 0 0;
    padding: 12px;
    border-radius: 8px;
    background: rgba(2, 6, 23, 0.34);
    color: #dbeafe;
    font-family: inherit;
    line-height: 1.7;
    white-space: pre-wrap;
  }
}

.item-actions {
  justify-content: flex-end;
  margin-top: 10px;
}

@media (max-width: 760px) {
  .panel-head,
  .item-head {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
