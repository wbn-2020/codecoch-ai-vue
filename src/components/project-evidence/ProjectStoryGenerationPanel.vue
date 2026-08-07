<template>
  <section class="content-card story-panel">
    <div class="panel-head">
      <div>
        <p class="panel-kicker">面试准备</p>
        <h3>生成讲述</h3>
      </div>
      <el-segmented v-model="generationType" :options="typeOptions" />
    </div>

    <div class="toolbar">
      <el-button type="primary" :loading="generating" @click="handleGenerate">
        <Wand2 :size="16" />
        生成
      </el-button>
      <el-button :loading="loading" @click="fetchGenerations">
        <RefreshCw :size="16" />
        刷新
      </el-button>
    </div>

    <div class="generation-list">
      <article v-for="item in filteredItems" :key="item.id || `${item.generationType}-${item.createdAt}`" class="generation-item">
        <div class="item-head">
          <div>
            <strong>{{ getTypeLabel(item.generationType) }}</strong>
            <span>{{ getResultSourceLabel(item.resultSource) }}</span>
          </div>
          <el-tag :type="item.accepted ? 'success' : 'info'" effect="plain">
            {{ item.accepted ? '已采纳' : getStatusLabel(item.status) }}
          </el-tag>
        </div>
        <pre>{{ item.resultText || '暂无生成内容。' }}</pre>
        <div class="item-actions">
          <el-button size="small" @click="copyText(item.resultText)">
            <Copy :size="14" />
            复制
          </el-button>
          <el-button
            size="small"
            type="success"
            plain
            :disabled="!item.id || item.accepted"
            @click="handleAccept(item)"
          >
            <CheckCircle2 :size="14" />
            采纳
          </el-button>
        </div>
      </article>
      <AppState
        v-if="!loading && filteredItems.length === 0"
        type="empty"
        title="暂无生成讲述"
        description="可基于当前项目事实与能力证据生成简历要点、STAR 法则讲述或面试问题。"
      />
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
  { label: '简历要点', value: 'RESUME_BULLET' },
  { label: 'STAR 法则', value: 'STAR_STORY' },
  { label: '面试问题', value: 'INTERVIEW_QUESTIONS' }
]

const filteredItems = computed(() => items.value.filter((item) => item.generationType === generationType.value))

const getTypeLabel = (type?: string) =>
  typeOptions.find((item) => item.value === type)?.label || '面试素材'

const getResultSourceLabel = (source?: string) => ({
  LOCAL_GENERATOR: '本地生成',
  AI_GENERATOR: 'AI 生成',
  MODEL: '模型生成',
  MANUAL: '手动录入'
}[String(source || 'LOCAL_GENERATOR').toUpperCase()] || '生成来源待确认')

const getStatusLabel = (status?: string) => ({
  DRAFT: '草稿',
  PENDING: '生成中',
  PROCESSING: '生成中',
  SUCCESS: '已生成',
  COMPLETED: '已完成',
  FAILED: '生成失败'
}[String(status || 'DRAFT').toUpperCase()] || '草稿')

const fetchGenerations = async () => {
  loading.value = true
  try {
    items.value = await getProjectStoryGenerationsApi(props.projectId)
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '生成讲述加载失败，请稍后重试。'))
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
    ElMessage.success('生成讲述已保存。')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '生成失败。你仍可继续手动编辑项目事实和能力证据。'))
  } finally {
    generating.value = false
  }
}

const copyText = async (text?: string) => {
  if (!text) return
  await navigator.clipboard.writeText(text)
  ElMessage.success('已复制。')
}

const handleAccept = async (item: ProjectStoryGenerationVO) => {
  if (!item.id) return
  const accepted = await acceptProjectStoryGenerationApi(props.projectId, item.id)
  items.value = items.value.map((current) => ({
    ...current,
    accepted: current.generationType === accepted.generationType ? current.id === accepted.id : current.accepted
  }))
  ElMessage.success('已采纳该讲述。')
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
  color: var(--arena-grn-d);
  font-size: 12px;
  font-weight: 700;
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
  min-width: 0;
  border: 1px solid var(--arena-line);
  border-radius: 8px;
  background: var(--arena-card);

  span {
    display: block;
    margin-top: 4px;
    color: var(--arena-sub);
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  pre {
    overflow: auto;
    max-width: 100%;
    margin: 12px 0 0;
    padding: 12px;
    border-radius: 8px;
    background: var(--arena-bg);
    color: var(--arena-ink);
    font-family: inherit;
    line-height: 1.7;
    overflow-wrap: anywhere;
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

  .panel-head :deep(.el-segmented) {
    max-width: 100%;
    overflow-x: auto;
  }

  .item-actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style>
