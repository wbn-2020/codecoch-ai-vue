<template>
  <section class="artifact-panel">
    <div class="panel-head">
      <div>
        <span class="eyebrow"><PackageOpen :size="15" /> 投递文件</span>
        <h2>Artifact 清单与 ZIP 投递包</h2>
        <p>ZIP 包含同一简历版本的 PDF、DOCX、manifest，并在有正式投递包时附带快照。</p>
      </div>
      <div class="head-actions">
        <el-button :loading="loading" :disabled="!resumeVersionId" @click="loadArtifacts">
          <RefreshCw :size="16" />
          刷新状态
        </el-button>
        <el-button
          type="primary"
          :loading="creatingZip"
          :disabled="!resumeVersionId"
          @click="createZip"
        >
          <Archive :size="16" />
          生成 ZIP
        </el-button>
      </div>
    </div>

    <div v-if="resumeVersionId" class="artifact-template-picker" role="radiogroup" aria-label="ZIP 简历模板">
      <button
        v-for="template in resumeTemplateOptions"
        :key="template.code"
        type="button"
        role="radio"
        :aria-checked="selectedTemplateCode === template.code"
        :class="{ active: selectedTemplateCode === template.code }"
        @click="selectedTemplateCode = template.code"
      >
        <strong>{{ template.name }}</strong>
        <span>{{ template.description }}</span>
      </button>
    </div>

    <el-alert
      v-if="!resumeVersionId"
      type="warning"
      show-icon
      :closable="false"
      title="缺少推荐简历版本"
      description="请先在投递包中绑定可用简历版本，再生成正式 artifact。"
    />

    <div v-else-if="loading && !artifacts.length" class="panel-state">
      <el-skeleton :rows="3" animated />
    </div>

    <el-alert
      v-else-if="loadError && !artifacts.length"
      type="error"
      show-icon
      :closable="false"
      title="Artifact 清单加载失败"
      :description="loadError"
    />

    <template v-else>
      <el-alert
        v-if="loadError"
        type="warning"
        show-icon
        :closable="false"
        title="刷新失败，已保留当前清单"
        :description="loadError"
      />

      <div v-if="artifacts.length" class="artifact-table">
        <article v-for="artifact in artifacts" :key="artifact.id">
          <div class="artifact-icon">
            <Archive v-if="artifact.artifactType === 'APPLICATION_ZIP'" :size="19" />
            <FileText v-else :size="19" />
          </div>
          <div class="artifact-main">
            <strong>{{ artifact.fileName }}</strong>
            <span>
              {{ artifactTypeLabel(artifact) }}
              · {{ formatArtifactSize(artifact.fileSize) }}
              · 版本 #{{ artifact.sourceResumeVersionId || resumeVersionId }}
            </span>
            <small v-if="artifact.sourceApplicationPackageId">
              投递包 #{{ artifact.sourceApplicationPackageId }}
            </small>
            <small v-if="artifact.errorMessage" class="artifact-error">{{ artifact.errorMessage }}</small>
          </div>
          <div class="artifact-actions">
            <el-tag :type="artifactStatusMeta(artifact.status).type" effect="plain">
              {{ artifactStatusMeta(artifact.status).label }}
            </el-tag>
            <el-button
              :disabled="artifact.status !== 'READY'"
              :loading="downloadingIds.has(artifact.id)"
              @click="downloadArtifact(artifact)"
            >
              <Download :size="15" />
              下载
            </el-button>
          </div>
        </article>
      </div>

      <div v-else class="empty-state">
        <PackageOpen :size="30" />
        <strong>暂无投递文件</strong>
        <p>点击“生成 ZIP”会同时生成 PDF、DOCX 和投递包 ZIP；失败状态会保留错误原因。</p>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { Archive, Download, FileText, PackageOpen, RefreshCw } from 'lucide-vue-next'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

import {
  createApplicationPackageArtifactApi,
  downloadResumeArtifactApi,
  getResumeArtifactApi,
  getResumeArtifactsApi
} from '@/api/resumeDelivery'
import {
  artifactStatusMeta,
  formatArtifactSize,
  normalizeResumeArtifact
} from '@/features/resume-delivery'
import {
  normalizeResumeTemplateCode,
  resumeTemplateOptions,
  type ResumeTemplateCode
} from '@/features/resume-document'
import type { ResumeArtifactVO } from '@/types/resumeDelivery'
import { getErrorMessage } from '@/utils/error'

const props = defineProps<{
  resumeVersionId?: number
  applicationPackageId?: string | number
}>()

const loading = ref(false)
const creatingZip = ref(false)
const loadError = ref('')
const artifacts = ref<ResumeArtifactVO[]>([])
const downloadingIds = ref(new Set<number>())
const selectedTemplateCode = ref<ResumeTemplateCode>('ATS_SINGLE_COLUMN')
const artifactTimers = new Map<number, number>()
const artifactPollAttempts = new Map<number, number>()
const templatePreferenceKey = 'codecoachai.resume.artifact-template'

const numericApplicationPackageId = () => {
  const value = Number(props.applicationPackageId)
  return Number.isFinite(value) && value > 0 ? value : undefined
}

const clearArtifactPolling = () => {
  artifactTimers.forEach((timer) => window.clearTimeout(timer))
  artifactTimers.clear()
  artifactPollAttempts.clear()
}

const loadArtifacts = async () => {
  clearArtifactPolling()
  if (!props.resumeVersionId) {
    artifacts.value = []
    return
  }
  loading.value = true
  loadError.value = ''
  try {
    artifacts.value = (await getResumeArtifactsApi(props.resumeVersionId)).map(normalizeResumeArtifact)
    artifacts.value
      .filter((artifact) => artifact.status === 'GENERATING')
      .forEach((artifact) => schedulePoll(artifact.id))
  } catch (error) {
    loadError.value = getErrorMessage(error, 'Artifact 清单暂时无法读取，请稍后刷新。')
  } finally {
    loading.value = false
  }
}

const upsertArtifact = (artifact: ResumeArtifactVO) => {
  artifacts.value = [artifact, ...artifacts.value.filter((item) => item.id !== artifact.id)]
}

const clearTimer = (id: number) => {
  const timer = artifactTimers.get(id)
  if (timer) window.clearTimeout(timer)
  artifactTimers.delete(id)
}

const schedulePoll = (id: number, resumeVersionId = props.resumeVersionId) => {
  clearTimer(id)
  const attempts = artifactPollAttempts.get(id) || 0
  if (attempts >= 10) return
  artifactPollAttempts.set(id, attempts + 1)
  artifactTimers.set(id, window.setTimeout(async () => {
    try {
      const artifact = normalizeResumeArtifact(await getResumeArtifactApi(id))
      if (resumeVersionId !== props.resumeVersionId) return
      upsertArtifact(artifact)
      if (artifact.status === 'GENERATING') schedulePoll(id, resumeVersionId)
    } catch {
      if (resumeVersionId === props.resumeVersionId) schedulePoll(id, resumeVersionId)
    }
  }, 1500))
}

const createZip = async () => {
  if (!props.resumeVersionId || creatingZip.value) return
  creatingZip.value = true
  try {
    const artifact = normalizeResumeArtifact(await createApplicationPackageArtifactApi({
      resumeVersionId: props.resumeVersionId,
      applicationPackageId: numericApplicationPackageId(),
      templateCode: selectedTemplateCode.value
    }))
    upsertArtifact(artifact)
    if (artifact.status === 'GENERATING') schedulePoll(artifact.id)
    await loadArtifacts()
    ElMessage.success('投递 ZIP 已生成。')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '投递 ZIP 生成失败，请检查简历版本、文件服务和导出字体配置。'))
    await loadArtifacts()
  } finally {
    creatingZip.value = false
  }
}

const downloadArtifact = async (artifact: ResumeArtifactVO) => {
  if (artifact.status !== 'READY' || downloadingIds.value.has(artifact.id)) return
  downloadingIds.value = new Set(downloadingIds.value).add(artifact.id)
  try {
    const blob = await downloadResumeArtifactApi(artifact.id)
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = artifact.fileName
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  } catch (error) {
    ElMessage.error(getErrorMessage(error, 'Artifact 下载失败，请确认文件状态为可下载。'))
  } finally {
    const next = new Set(downloadingIds.value)
    next.delete(artifact.id)
    downloadingIds.value = next
  }
}

const artifactTypeLabel = (artifact: ResumeArtifactVO) => {
  if (artifact.artifactType === 'APPLICATION_ZIP') return '投递 ZIP'
  if (artifact.fileName.toLowerCase().endsWith('.pdf')) return 'PDF'
  if (artifact.fileName.toLowerCase().endsWith('.docx')) return 'DOCX'
  return artifact.artifactType
}

watch(() => props.resumeVersionId, () => void loadArtifacts())
watch(selectedTemplateCode, (templateCode) => {
  window.localStorage.setItem(templatePreferenceKey, templateCode)
})
onMounted(() => {
  selectedTemplateCode.value = normalizeResumeTemplateCode(
    window.localStorage.getItem(templatePreferenceKey) || undefined
  )
  void loadArtifacts()
})
onBeforeUnmount(clearArtifactPolling)
</script>

<style scoped lang="scss">
.artifact-panel {
  min-width: 0;
  padding: var(--user-space-4);
  border: 1px solid var(--user-border);
  border-radius: var(--user-radius-md);
  background: var(--user-surface);
  color: var(--user-text);
  box-shadow: none;
}

.panel-head,
.head-actions,
.artifact-table article,
.artifact-actions,
.eyebrow {
  display: flex;
  align-items: center;
}

.artifact-template-picker {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 14px;

  button {
    min-width: 0;
    padding: 10px 11px;
    border: 1px solid var(--user-border);
    border-radius: 8px;
    background: var(--user-control-bg);
    color: var(--user-text-secondary);
    text-align: left;
    cursor: pointer;

    &:hover,
    &.active {
      border-color: var(--user-primary-border);
      background: var(--user-primary-soft);
      color: var(--user-text);
    }

    &:focus-visible {
      outline: 2px solid var(--user-primary);
      outline-offset: 2px;
    }
  }

  strong,
  span {
    display: block;
  }

  strong {
    font-size: 13px;
  }

  span {
    margin-top: 4px;
    color: var(--user-text-muted);
    font-size: 11px;
    line-height: 1.45;
  }
}

.panel-head,
.artifact-table article {
  justify-content: space-between;
  gap: var(--user-space-4);
}

.panel-head {
  align-items: flex-start;
  margin-bottom: 12px;

  h2,
  p {
    margin: 0;
  }

  h2 {
    margin-top: 6px;
    color: var(--user-text);
    font-size: 18px;
  }

  p {
    margin-top: 6px;
    color: var(--user-text-muted);
    font-size: 13px;
    line-height: 1.65;
  }
}

.eyebrow,
.head-actions,
.artifact-actions {
  gap: 8px;
}

.eyebrow {
  color: var(--user-primary);
  font-size: 12px;
  font-weight: 800;
}

.artifact-table {
  display: grid;
  gap: 10px;
}

.artifact-table article {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  padding: 12px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface-muted);
}

.artifact-icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border: 1px solid var(--user-primary-border);
  border-radius: 8px;
  color: var(--user-primary);
  background: var(--user-primary-soft);
}

.artifact-main {
  min-width: 0;

  strong,
  span,
  small {
    display: block;
    overflow-wrap: anywhere;
  }

  span,
  small {
    margin-top: 5px;
    color: var(--user-text-muted);
    font-size: 12px;
  }

  .artifact-error {
    color: var(--user-danger);
  }
}

.empty-state,
.panel-state {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 30px 18px;
  border: 1px dashed var(--user-border);
  border-radius: 8px;
  background: var(--user-control-bg);
  color: var(--user-text-muted);
  text-align: center;

  strong {
    color: var(--user-text);
  }

  p {
    max-width: 560px;
    margin: 0;
    line-height: 1.65;
  }
}

.panel-state {
  display: block;
}

@media (max-width: 760px) {
  .artifact-template-picker {
    grid-template-columns: 1fr;
  }

  .panel-head,
  .artifact-table article {
    grid-template-columns: 1fr;
    align-items: stretch;
    flex-direction: column;
  }

  .head-actions,
  .artifact-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .head-actions :deep(.el-button),
  .artifact-actions :deep(.el-button) {
    width: 100%;
    margin-left: 0;
  }
}
</style>
