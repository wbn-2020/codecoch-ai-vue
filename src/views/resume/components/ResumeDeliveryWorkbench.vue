<template>
  <section class="delivery-workbench">
    <header class="workbench-head">
      <div>
        <span class="eyebrow"><ShieldCheck :size="15" /> 投递级简历工作台</span>
        <h2>逐句审阅、事实审计与 ATS 导出</h2>
        <p>所有接受操作都会创建新简历版本；事实审计只提示证据状态，不替你断言经历真伪。</p>
      </div>
      <div class="head-actions">
        <el-tag v-if="currentVersion" effect="plain">
          当前版本 V{{ currentVersion.versionNo || currentVersion.id }}
        </el-tag>
        <el-tag v-if="hasUnsavedChanges" type="warning" effect="plain">表单待保存</el-tag>
        <el-button :loading="loading" @click="loadAll">
          <RefreshCw :size="16" />
          刷新
        </el-button>
      </div>
    </header>

    <div v-if="loading && !currentVersion" class="workbench-state">
      <el-skeleton :rows="5" animated />
    </div>

    <el-alert
      v-else-if="loadError && !currentVersion"
      type="error"
      show-icon
      :closable="false"
      title="投递级简历能力暂不可用"
      :description="loadError"
    >
      <template #default>
        <el-button type="primary" @click="loadAll">重试</el-button>
      </template>
    </el-alert>

    <div v-else-if="!currentVersion" class="workbench-empty">
      <FileClock :size="30" />
      <strong>还没有稳定的简历版本</strong>
      <p>请先保存当前简历。逐句锚点、事实审计和正式导出都必须绑定到不可变版本。</p>
    </div>

    <el-tabs v-else v-model="activeTab" class="delivery-tabs">
      <el-tab-pane name="suggestions">
        <template #label>
          <span class="tab-label"><TextQuote :size="15" />逐句建议</span>
        </template>

        <div class="section-toolbar">
          <div>
            <h3>锚点建议审阅</h3>
            <p>建议绑定原文、偏移和来源版本，避免把旧建议误套到新内容。</p>
          </div>
          <div class="toolbar-actions">
            <el-button
              :loading="batchAccepting"
              :disabled="!selectedBatchSuggestionIds.length"
              @click="acceptSelectedLowRiskSuggestions"
            >
              <CheckCheck :size="16" />
              批量接受低风险（{{ selectedBatchSuggestionIds.length }}）
            </el-button>
            <el-button type="primary" @click="openSuggestionDialog">
              <Plus :size="16" />
              新建锚点建议
            </el-button>
          </div>
        </div>

        <el-alert
          v-if="sectionErrors.suggestions"
          class="section-error"
          type="warning"
          show-icon
          :closable="false"
          :title="sectionErrors.suggestions"
        />

        <div v-if="suggestions.length" class="suggestion-list">
          <article v-for="item in suggestions" :key="item.id" class="suggestion-item">
            <div class="suggestion-head">
              <div>
                <el-checkbox
                  v-if="isBatchCandidate(item)"
                  :model-value="selectedBatchSuggestionIds.includes(item.id)"
                  :disabled="batchAccepting || isSuggestionPending(item.id)"
                  @change="toggleBatchSuggestion(item.id, Boolean($event))"
                >
                  批量选择
                </el-checkbox>
                <span>{{ resumeSectionLabel(item.sectionKey) }} · 版本 #{{ item.sourceResumeVersionId }}</span>
                <strong>建议 #{{ item.id }}</strong>
              </div>
              <div class="item-tags">
                <el-tag :type="suggestionRiskMeta(item.riskLevel).type" effect="plain">
                  {{ suggestionRiskMeta(item.riskLevel).label }}
                </el-tag>
                <el-tag :type="suggestionStatusMeta(item.status).type" effect="plain">
                  {{ suggestionStatusMeta(item.status).label }}
                </el-tag>
                <el-tag v-if="item.stale" type="danger" effect="plain">来源已过期</el-tag>
              </div>
            </div>
            <div v-if="item.sectionId || item.fieldPath" class="suggestion-anchor-meta">
              <span v-if="item.sectionId">区块 {{ item.sectionId }}</span>
              <span v-if="item.fieldPath">字段 {{ item.fieldPath }}</span>
              <span>偏移 {{ item.anchorStart }}-{{ item.anchorEnd }}</span>
            </div>
            <div v-if="item.evidenceReferences.length" class="evidence-ref-list suggestion-evidence">
              <span v-for="(evidence, index) in item.evidenceReferences" :key="index">
                {{ evidenceRefLabel(evidence, index) }}
              </span>
            </div>

            <el-alert
              v-if="item.staleReason"
              type="warning"
              show-icon
              :closable="false"
              title="检测到 stale source"
              :description="item.staleReason"
            />

            <div class="sentence-diff">
              <div>
                <span>原文</span>
                <p>{{ item.originalText }}</p>
              </div>
              <div>
                <span>建议</span>
                <p>{{ item.suggestedText }}</p>
              </div>
            </div>
            <el-input
              v-if="item.status === 'PENDING'"
              class="accepted-text-editor"
              type="textarea"
              :rows="3"
              :model-value="suggestionEditText(item)"
              placeholder="可在接受前编辑最终采用文本"
              @input="setSuggestionEdit(item.id, String($event))"
            />
            <div v-else-if="item.acceptedText && item.acceptedText !== item.suggestedText" class="accepted-text-result">
              <span>实际采用</span>
              <p>{{ item.acceptedText }}</p>
            </div>
            <p class="rationale">{{ item.rationale || '未提供建议理由，请结合事实和岗位要求人工复核。' }}</p>

            <div class="item-actions">
              <el-button
                type="primary"
                :disabled="!canAcceptSuggestion(item) || isSuggestionPending(item.id)"
                :loading="isSuggestionPending(item.id, 'ACCEPT')"
                @click="decideSuggestion(item, 'ACCEPT')"
              >
                <Check :size="15" />
                接受并创建版本
              </el-button>
              <el-button
                :disabled="!item.canReject || isSuggestionPending(item.id)"
                :loading="isSuggestionPending(item.id, 'REJECT')"
                @click="decideSuggestion(item, 'REJECT')"
              >
                <X :size="15" />
                拒绝
              </el-button>
              <el-button
                v-if="item.status === 'ACCEPTED'"
                :disabled="!item.canUndo || isSuggestionPending(item.id)"
                :loading="isSuggestionPending(item.id, 'UNDO')"
                @click="decideSuggestion(item, 'UNDO')"
              >
                <Undo2 :size="15" />
                撤销并创建版本
              </el-button>
            </div>
          </article>
        </div>

        <div v-else class="section-empty">
          <TextQuote :size="28" />
          <strong>暂无逐句锚点建议</strong>
          <p>可从当前稳定版本选中一句原文，创建一条可追踪、可撤销的审阅建议。</p>
        </div>
      </el-tab-pane>

      <el-tab-pane name="audit">
        <template #label>
          <span class="tab-label"><ScanSearch :size="15" />事实审计</span>
        </template>

        <div class="section-toolbar">
          <div>
            <h3>事实与量化表达审计</h3>
            <p>重点检查数字、百分比、金额、时长和事实性表达是否有证据可回溯。</p>
          </div>
          <el-button type="primary" :loading="auditing" @click="runAudit">
            <ScanSearch :size="16" />
            审计当前版本
          </el-button>
        </div>

        <el-alert
          v-if="sectionErrors.audits"
          class="section-error"
          type="warning"
          show-icon
          :closable="false"
          :title="sectionErrors.audits"
        />

        <template v-if="latestAudit">
          <div class="audit-summary">
            <div><span>声明</span><strong>{{ latestAudit.claimCount }}</strong></div>
            <div><span>已有证据</span><strong>{{ latestAudit.verifiedCount }}</strong></div>
            <div><span>部分证据</span><strong>{{ latestAudit.partialCount }}</strong></div>
            <div><span>未找到证据</span><strong>{{ latestAudit.unsupportedCount }}</strong></div>
            <div><span>风险提示</span><strong>{{ latestAudit.riskCount }}</strong></div>
          </div>

          <el-alert
            v-if="latestAudit.status === 'FAILED'"
            type="error"
            show-icon
            :closable="false"
            title="本次事实审计失败"
            :description="latestAudit.errorMessage || '审计服务未返回可用结果。'"
          />

          <div v-if="latestAudit.findings.length" class="finding-list">
            <article v-for="finding in latestAudit.findings" :key="finding.id || `${finding.sectionKey}-${finding.claimIndex}`">
              <div class="finding-head">
                <div>
                  <span>{{ resumeSectionLabel(finding.sectionKey) }} · {{ finding.claimType || '事实表达' }}</span>
                  <strong>{{ finding.claimText || '未返回声明原文' }}</strong>
                </div>
                <el-tag :type="auditEvidenceMeta(finding.evidenceStatus).type" effect="plain">
                  {{ auditEvidenceMeta(finding.evidenceStatus).label }}
                </el-tag>
              </div>
              <div v-if="finding.quantities.length" class="quantity-list">
                <span v-for="quantity in finding.quantities" :key="quantity">{{ quantity }}</span>
              </div>
              <p>{{ finding.reason || auditEvidenceMeta(finding.evidenceStatus).conclusion }}</p>
              <small>{{ auditEvidenceMeta(finding.evidenceStatus).conclusion }}</small>
              <div v-if="finding.evidenceRefs.length" class="evidence-ref-list">
                <span v-for="(evidence, index) in finding.evidenceRefs" :key="index">
                  {{ evidenceRefLabel(evidence, index) }}
                </span>
              </div>
            </article>
          </div>
          <div v-else-if="latestAudit.status !== 'FAILED'" class="section-empty compact">
            <ShieldCheck :size="26" />
            <strong>本次未识别到需要列出的事实声明</strong>
            <p>这不代表简历内容已被完全验证，仍应人工核对经历、指标和时间范围。</p>
          </div>
        </template>

        <div v-else class="section-empty">
          <ScanSearch :size="28" />
          <strong>尚未执行事实审计</strong>
          <p>审计只基于当前稳定版本，不会读取未保存的表单改动。</p>
        </div>
      </el-tab-pane>

      <el-tab-pane name="delivery">
        <template #label>
          <span class="tab-label"><FileDown :size="15" />ATS 与导出</span>
        </template>

        <el-alert
          v-if="hasUnsavedChanges"
          class="section-error"
          type="warning"
          show-icon
          :closable="false"
          title="当前表单存在未保存改动"
          description="正式文件始终绑定不可变的稳定版本。请先保存简历，再导出包含最新内容的 PDF 或 DOCX。"
        />

        <div class="delivery-grid">
          <section class="export-controls">
            <div class="section-toolbar">
              <div>
                <h3>ATS 模板与正式文件</h3>
                <p>当前模板坚持单栏、无表格、无文本框和无页眉页脚。</p>
              </div>
            </div>

            <el-alert
              v-if="sectionErrors.delivery"
              class="section-error"
              type="warning"
              show-icon
              :closable="false"
              :title="sectionErrors.delivery"
            />

            <el-form label-position="top">
              <el-form-item label="ATS 模板">
                <el-select
                  v-model="selectedTemplateKey"
                  placeholder="选择模板"
                  :disabled="!templates.length"
                >
                  <el-option
                    v-for="template in templates"
                    :key="templateKey(template)"
                    :label="`${template.templateName} · v${template.templateVersion}`"
                    :value="templateKey(template)"
                  />
                </el-select>
              </el-form-item>
            </el-form>

            <div class="export-actions">
              <el-button
                type="primary"
                :loading="exportingFormat === 'PDF'"
                :disabled="Boolean(exportingFormat) || hasUnsavedChanges"
                @click="createExport('PDF')"
              >
                <FileType2 :size="16" />
                生成 PDF
              </el-button>
              <el-button
                :loading="exportingFormat === 'DOCX'"
                :disabled="Boolean(exportingFormat) || hasUnsavedChanges"
                @click="createExport('DOCX')"
              >
                <FileText :size="16" />
                生成 DOCX
              </el-button>
            </div>

            <div v-if="artifacts.length" class="artifact-list">
              <article v-for="artifact in artifacts" :key="artifact.id">
                <div>
                  <strong>{{ artifact.fileName }}</strong>
                  <span>{{ artifactLabel(artifact) }} · {{ formatArtifactSize(artifact.fileSize) }}</span>
                  <small v-if="artifact.errorMessage">{{ artifact.errorMessage }}</small>
                </div>
                <div class="artifact-actions">
                  <el-tag :type="artifactStatusMeta(artifact.status).type" effect="plain">
                    {{ artifactStatusMeta(artifact.status).label }}
                  </el-tag>
                  <el-button
                    :disabled="artifact.status !== 'READY'"
                    :loading="downloadingArtifacts.has(artifact.id)"
                    @click="downloadArtifact(artifact)"
                  >
                    <Download :size="15" />
                    下载
                  </el-button>
                </div>
              </article>
            </div>
            <div v-else class="section-empty compact">
              <FileDown :size="26" />
              <strong>还没有正式导出文件</strong>
              <p>选择模板后生成 PDF 或 DOCX，失败记录也会保留原因。</p>
            </div>
          </section>

          <section class="a4-preview">
            <div class="preview-title">
              <div>
                <h3>所选模板预览</h3>
                <p>这里展示当前稳定版本；分页、字体嵌入和换行以正式文件为准。</p>
              </div>
              <el-tag effect="plain">{{ selectedTemplate?.templateName || '模板加载中' }}</el-tag>
            </div>
            <div class="paper-stack">
              <ResumeDocumentPreview
                :draft="stableDraft"
                :template-code="selectedTemplate?.templateCode || preferredTemplateCode"
                :density="selectedTemplate?.templateCode === 'ATS_COMPACT' ? 'compact' : 'comfortable'"
              />
            </div>
          </section>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="suggestionDialogVisible" title="新建逐句锚点建议" width="640px">
      <el-form label-position="top">
        <el-form-item label="来源区块">
          <el-select v-model="suggestionDraft.sectionKey" filterable @change="resetAnchorSelection">
            <el-option
              v-for="option in sectionOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="当前版本原文">
          <el-input :model-value="selectedSectionText" type="textarea" :rows="4" readonly />
        </el-form-item>
        <el-form-item label="需要替换的原句">
          <el-input v-model="suggestionDraft.originalText" type="textarea" :rows="3" @input="resetOccurrence" />
        </el-form-item>
        <el-form-item v-if="anchorOccurrences.length > 1" label="原句出现位置">
          <el-select v-model="suggestionDraft.anchorStart">
            <el-option
              v-for="(index, occurrenceIndex) in anchorOccurrences"
              :key="index"
              :label="`第 ${occurrenceIndex + 1} 处 · 偏移 ${index}`"
              :value="index"
            />
          </el-select>
        </el-form-item>
        <el-alert
          v-if="suggestionDraft.originalText && !anchorOccurrences.length"
          type="warning"
          show-icon
          :closable="false"
          title="原句与当前版本不完全一致"
          description="请从上方原文中复制完整句子，系统必须校验精确偏移和原文。"
        />
        <el-form-item label="建议文本">
          <el-input v-model="suggestionDraft.suggestedText" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="建议理由">
          <el-input v-model="suggestionDraft.rationale" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="suggestionDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="creatingSuggestion"
          :disabled="!canCreateSuggestion"
          @click="createSuggestion"
        >
          保存锚点建议
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import {
  Check,
  CheckCheck,
  Download,
  FileClock,
  FileDown,
  FileText,
  FileType2,
  Plus,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  TextQuote,
  Undo2,
  X
} from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

import {
  batchAcceptResumeSuggestionsApi,
  createResumeClaimAuditApi,
  createResumeExportApi,
  createResumeSuggestionApi,
  decideResumeSuggestionApi,
  downloadResumeArtifactApi,
  getResumeArtifactApi,
  getResumeArtifactsApi,
  getResumeAtsTemplatesApi,
  getResumeClaimAuditsApi,
  getResumeSuggestionsApi
} from '@/api/resumeDelivery'
import { getResumeVersionsApi, type ResumeVersionVO } from '@/api/v4'
import {
  artifactStatusMeta,
  auditEvidenceMeta,
  findAnchorOccurrences,
  formatArtifactSize,
  isLowRiskBatchCandidate,
  normalizeResumeArtifact,
  normalizeResumeAudit,
  normalizeResumeSuggestion,
  normalizeResumeTemplate,
  resumeSectionLabel,
  suggestionStatusMeta
} from '@/features/resume-delivery'
import {
  normalizeResumeTemplateCode,
  type ResumeTemplateCode
} from '@/features/resume-document'
import type {
  ResumeArtifactVO,
  ResumeAtsTemplateVO,
  ResumeDeliveryDraft,
  ResumeExportFormat,
  ResumeSuggestionDecisionType,
  ResumeSuggestionView
} from '@/types/resumeDelivery'
import { getErrorMessage } from '@/utils/error'
import { createOperationIdempotencyKey } from '@/utils/idempotency'
import ResumeDocumentPreview from '@/views/resume/components/ResumeDocumentPreview.vue'

const props = defineProps<{
  resumeId?: number
  preferredTemplateCode?: ResumeTemplateCode | string
  refreshKey?: number
  hasUnsavedChanges?: boolean
}>()

const emit = defineEmits<{
  (event: 'resume-version-applied'): void
  (event: 'template-change', templateCode: ResumeTemplateCode): void
}>()

const activeTab = ref('suggestions')
const loading = ref(false)
const loadError = ref('')
const currentVersion = ref<ResumeVersionVO | null>(null)
const suggestions = ref<ResumeSuggestionView[]>([])
const audits = ref<ReturnType<typeof normalizeResumeAudit>[]>([])
const templates = ref<ResumeAtsTemplateVO[]>([])
const artifacts = ref<ResumeArtifactVO[]>([])
const selectedTemplateKey = ref('')
const auditing = ref(false)
const exportingFormat = ref<ResumeExportFormat | ''>('')
const creatingSuggestion = ref(false)
const batchAccepting = ref(false)
const suggestionDialogVisible = ref(false)
const suggestionPending = ref(new Map<number, ResumeSuggestionDecisionType>())
const suggestionEdits = ref(new Map<number, string>())
const selectedBatchSuggestionIds = ref<number[]>([])
const downloadingArtifacts = ref(new Set<number>())
const sectionErrors = reactive({
  suggestions: '',
  audits: '',
  delivery: ''
})
const artifactTimers = new Map<number, number>()
const artifactPollAttempts = new Map<number, number>()

const suggestionDraft = reactive({
  sectionKey: '',
  originalText: '',
  suggestedText: '',
  rationale: '',
  anchorStart: 0
})

const versionSnapshot = computed<Record<string, unknown>>(() => currentVersion.value?.snapshot || {})
const stableDraft = computed<ResumeDeliveryDraft>(() => {
  const snapshot = versionSnapshot.value
  const text = (...keys: string[]) =>
    keys.map((key) => snapshot[key]).find((value) => typeof value === 'string') as string | undefined

  return {
    title: text('title', 'resumeName'),
    realName: text('realName'),
    email: text('email'),
    phone: text('phone'),
    targetPosition: text('targetPosition'),
    summary: text('summary'),
    skillStack: text('skillStack', 'skills'),
    workExperience: text('workExperience', 'workSummary'),
    educationExperience: text('educationExperience', 'education'),
    projects: Array.isArray(snapshot.projects)
      ? snapshot.projects.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      : []
  }
})

const latestAudit = computed(() =>
  audits.value.slice().sort((a, b) => {
    const byCreated = String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
    return byCreated || b.id - a.id
  })[0]
)

const templateKey = (template: ResumeAtsTemplateVO) =>
  `${template.templateCode}::${template.templateVersion}`

const selectedTemplate = computed(() =>
  templates.value.find((template) => templateKey(template) === selectedTemplateKey.value)
)

const emitSelectedTemplate = () => {
  if (!selectedTemplate.value) return
  emit('template-change', normalizeResumeTemplateCode(selectedTemplate.value.templateCode))
}

const chooseCurrentVersion = (versions: ResumeVersionVO[]) =>
  versions.slice().sort((a, b) =>
    (Number(b.currentFlag || 0) - Number(a.currentFlag || 0))
    || (Number(b.versionNo || 0) - Number(a.versionNo || 0))
    || (Number(b.id || 0) - Number(a.id || 0))
  )[0] || null

const loadVersions = async () => {
  if (!props.resumeId) {
    currentVersion.value = null
    return
  }
  currentVersion.value = chooseCurrentVersion(await getResumeVersionsApi(props.resumeId))
}

const loadSuggestions = async () => {
  if (!props.resumeId) return
  try {
    sectionErrors.suggestions = ''
    const rows = await getResumeSuggestionsApi({ resumeId: props.resumeId })
    suggestions.value = rows
      .map((item) => normalizeResumeSuggestion(item, currentVersion.value?.id, rows))
    const selectableIds = new Set(suggestions.value.filter((item) => isBatchCandidate(item)).map((item) => item.id))
    selectedBatchSuggestionIds.value = selectedBatchSuggestionIds.value.filter((id) => selectableIds.has(id))
  } catch (error) {
    sectionErrors.suggestions = getErrorMessage(error, '逐句建议加载失败，请稍后刷新。')
    suggestions.value = []
  }
}

const loadAudits = async () => {
  if (!props.resumeId) return
  try {
    sectionErrors.audits = ''
    audits.value = (await getResumeClaimAuditsApi(props.resumeId)).map(normalizeResumeAudit)
  } catch (error) {
    sectionErrors.audits = getErrorMessage(error, '事实审计记录加载失败，请稍后刷新。')
    audits.value = []
  }
}

const loadDelivery = async () => {
  clearArtifactPolling()
  try {
    sectionErrors.delivery = ''
    const [templateRows, artifactRows] = await Promise.all([
      getResumeAtsTemplatesApi(),
      currentVersion.value ? getResumeArtifactsApi(currentVersion.value.id) : Promise.resolve([])
    ])
    templates.value = templateRows.map(normalizeResumeTemplate)
    artifacts.value = artifactRows.map(normalizeResumeArtifact)
    artifacts.value
      .filter((artifact) => artifact.status === 'GENERATING')
      .forEach((artifact) => scheduleArtifactPoll(artifact.id, currentVersion.value?.id))
    if (!selectedTemplateKey.value || !templates.value.some((item) => templateKey(item) === selectedTemplateKey.value)) {
      const preferredCode = normalizeResumeTemplateCode(props.preferredTemplateCode)
      const preferred = templates.value.find((item) => item.templateCode === preferredCode)
      selectedTemplateKey.value = preferred
        ? templateKey(preferred)
        : templates.value[0]
          ? templateKey(templates.value[0])
          : ''
    }
    emitSelectedTemplate()
  } catch (error) {
    sectionErrors.delivery = getErrorMessage(error, 'ATS 模板或导出文件加载失败，请稍后刷新。')
  }
}

const loadAll = async () => {
  if (!props.resumeId) {
    currentVersion.value = null
    return
  }
  loading.value = true
  loadError.value = ''
  try {
    await loadVersions()
    await Promise.all([loadSuggestions(), loadAudits(), loadDelivery()])
  } catch (error) {
    loadError.value = getErrorMessage(error, '简历版本加载失败，请先确认简历已经保存。')
    currentVersion.value = null
  } finally {
    loading.value = false
  }
}

const isSuggestionPending = (id: number, type?: ResumeSuggestionDecisionType) => {
  const pendingType = suggestionPending.value.get(id)
  return type ? pendingType === type : Boolean(pendingType)
}

const suggestionEditText = (item: ResumeSuggestionView) =>
  suggestionEdits.value.get(item.id) ?? item.suggestedText

const setSuggestionEdit = (id: number, value: string) => {
  const next = new Map(suggestionEdits.value)
  next.set(id, value)
  suggestionEdits.value = next
}

const canAcceptSuggestion = (item: ResumeSuggestionView) =>
  item.canAccept && Boolean(suggestionEditText(item).trim())

const isBatchCandidate = (item: ResumeSuggestionView) =>
  isLowRiskBatchCandidate(item, suggestionEditText(item))

const toggleBatchSuggestion = (id: number, selected: boolean) => {
  const next = new Set(selectedBatchSuggestionIds.value)
  if (selected) next.add(id)
  else next.delete(id)
  selectedBatchSuggestionIds.value = [...next]
}

const suggestionRiskMeta = (riskLevel?: string) => ({
  LOW: { label: '低风险', type: 'success' as const },
  MEDIUM: { label: '中风险', type: 'warning' as const },
  HIGH: { label: '高风险', type: 'danger' as const },
  UNKNOWN: { label: '风险待确认', type: 'info' as const }
}[String(riskLevel || 'UNKNOWN').toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN'])

const acceptSelectedLowRiskSuggestions = async () => {
  if (batchAccepting.value) return
  const selected = suggestions.value.filter((item) =>
    selectedBatchSuggestionIds.value.includes(item.id) && isBatchCandidate(item)
  )
  if (!selected.length) return
  batchAccepting.value = true
  try {
    await batchAcceptResumeSuggestionsApi({
      suggestionIds: selected.map((item) => item.id),
      idempotencyKey: createOperationIdempotencyKey('resume-suggestion-batch-accept'),
      note: `Batch accept from resume delivery workbench, source version ${selected[0].sourceResumeVersionId}`
    })
    selectedBatchSuggestionIds.value = []
    await loadVersions()
    emit('resume-version-applied')
    await Promise.all([loadSuggestions(), loadAudits(), loadDelivery()])
    ElMessage.success(`已批量接受 ${selected.length} 条低风险建议，并创建一个新简历版本。`)
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '批量接受失败，建议状态未改变。'))
  } finally {
    batchAccepting.value = false
  }
}

const decideSuggestion = async (item: ResumeSuggestionView, decisionType: ResumeSuggestionDecisionType) => {
  if (isSuggestionPending(item.id)) return
  if ((decisionType === 'ACCEPT' || decisionType === 'UNDO') && item.stale) {
    ElMessage.warning(item.staleReason || '该建议来源版本已过期，请刷新后重新审阅。')
    return
  }
  const next = new Map(suggestionPending.value)
  next.set(item.id, decisionType)
  suggestionPending.value = next
  try {
    await decideResumeSuggestionApi(item.id, {
      decisionType,
      idempotencyKey: createOperationIdempotencyKey(`resume-suggestion-${item.id}-${decisionType.toLowerCase()}`),
      note: `Decision from resume delivery workbench, source version ${item.sourceResumeVersionId}`,
      ...(decisionType === 'ACCEPT' ? { editedText: suggestionEditText(item).trim() } : {})
    })
    if (decisionType === 'ACCEPT' || decisionType === 'UNDO') {
      await loadVersions()
      emit('resume-version-applied')
    }
    await Promise.all([loadSuggestions(), loadAudits(), loadDelivery()])
    ElMessage.success(decisionType === 'ACCEPT' ? '建议已接受，并创建了新简历版本。' : decisionType === 'UNDO' ? '建议已撤销，并创建了新简历版本。' : '建议已拒绝。')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '建议决策失败，状态未改变。'))
  } finally {
    const remaining = new Map(suggestionPending.value)
    remaining.delete(item.id)
    suggestionPending.value = remaining
  }
}

const sectionOptions = computed(() => {
  const snapshot = versionSnapshot.value
  const topLevelKeys = ['title', 'realName', 'email', 'phone', 'targetPosition', 'summary', 'skillStack', 'workExperience', 'educationExperience']
  const options = topLevelKeys
    .filter((key) => typeof snapshot[key] === 'string' && String(snapshot[key]).trim())
    .map((key) => ({ value: key, label: resumeSectionLabel(key) }))
  const projects = Array.isArray(snapshot.projects) ? snapshot.projects : []
  projects.forEach((project, projectIndex) => {
    if (!project || typeof project !== 'object') return
    Object.entries(project as Record<string, unknown>).forEach(([field, value]) => {
      if (typeof value !== 'string' || !value.trim()) return
      options.push({
        value: `projects[${projectIndex}].${field}`,
        label: `项目 ${projectIndex + 1} · ${field}`
      })
    })
  })
  return options
})

const selectedSectionText = computed(() => {
  const key = suggestionDraft.sectionKey
  const projectMatch = key.match(/^projects\[(\d+)]\.([A-Za-z][A-Za-z0-9]*)$/)
  if (projectMatch) {
    const projects = Array.isArray(versionSnapshot.value.projects) ? versionSnapshot.value.projects : []
    const project = projects[Number(projectMatch[1])] as Record<string, unknown> | undefined
    return typeof project?.[projectMatch[2]] === 'string' ? String(project[projectMatch[2]]) : ''
  }
  return typeof versionSnapshot.value[key] === 'string' ? String(versionSnapshot.value[key]) : ''
})

const anchorOccurrences = computed(() =>
  findAnchorOccurrences(selectedSectionText.value, suggestionDraft.originalText)
)

const resetOccurrence = () => {
  suggestionDraft.anchorStart = anchorOccurrences.value[0] || 0
}

const resetAnchorSelection = () => {
  suggestionDraft.originalText = ''
  suggestionDraft.suggestedText = ''
  suggestionDraft.rationale = ''
  suggestionDraft.anchorStart = 0
}

const openSuggestionDialog = () => {
  suggestionDraft.sectionKey = sectionOptions.value[0]?.value || ''
  resetAnchorSelection()
  suggestionDialogVisible.value = true
}

watch(anchorOccurrences, (indexes) => {
  if (!indexes.includes(suggestionDraft.anchorStart)) {
    suggestionDraft.anchorStart = indexes[0] || 0
  }
})

const canCreateSuggestion = computed(() =>
  Boolean(
    currentVersion.value
    && suggestionDraft.sectionKey
    && suggestionDraft.originalText.trim()
    && suggestionDraft.suggestedText.trim()
    && anchorOccurrences.value.includes(suggestionDraft.anchorStart)
  )
)

const createSuggestion = async () => {
  if (!currentVersion.value || !canCreateSuggestion.value || creatingSuggestion.value) return
  creatingSuggestion.value = true
  try {
    await createResumeSuggestionApi({
      sourceResumeVersionId: currentVersion.value.id,
      sourceType: 'MANUAL_REVIEW',
      sourceVersion: `V${currentVersion.value.versionNo || currentVersion.value.id}`,
      sectionKey: suggestionDraft.sectionKey,
      anchorStart: suggestionDraft.anchorStart,
      anchorEnd: suggestionDraft.anchorStart + suggestionDraft.originalText.length,
      originalText: suggestionDraft.originalText,
      suggestedText: suggestionDraft.suggestedText,
      rationale: suggestionDraft.rationale || undefined
    })
    suggestionDialogVisible.value = false
    await loadSuggestions()
    ElMessage.success('锚点建议已保存。')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '锚点建议保存失败，请确认原文仍与当前版本一致。'))
  } finally {
    creatingSuggestion.value = false
  }
}

const runAudit = async () => {
  if (!currentVersion.value || auditing.value) return
  auditing.value = true
  try {
    const result = normalizeResumeAudit(await createResumeClaimAuditApi(currentVersion.value.id))
    audits.value = [result, ...audits.value.filter((item) => item.id !== result.id)]
    ElMessage.success(result.status === 'FAILED' ? '审计已结束，请查看失败原因。' : '事实审计已完成。')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '事实审计失败，请稍后重试。'))
  } finally {
    auditing.value = false
  }
}

const evidenceRefLabel = (evidence: Record<string, unknown>, index: number) => {
  const label = evidence.title || evidence.name || evidence.sourceType || evidence.type || evidence.evidenceText || evidence.id
  return label ? String(label) : `证据引用 ${index + 1}`
}

const upsertArtifact = (artifact: ResumeArtifactVO) => {
  artifacts.value = [
    artifact,
    ...artifacts.value.filter((item) => item.id !== artifact.id)
  ]
}

const clearArtifactPolling = () => {
  artifactTimers.forEach((timer) => window.clearTimeout(timer))
  artifactTimers.clear()
  artifactPollAttempts.clear()
}

const clearArtifactTimer = (id: number) => {
  const timer = artifactTimers.get(id)
  if (timer) window.clearTimeout(timer)
  artifactTimers.delete(id)
}

const scheduleArtifactPoll = (id: number, resumeVersionId = currentVersion.value?.id) => {
  clearArtifactTimer(id)
  const attempts = artifactPollAttempts.get(id) || 0
  if (attempts >= 10) return
  artifactPollAttempts.set(id, attempts + 1)
  artifactTimers.set(id, window.setTimeout(async () => {
    try {
      const artifact = normalizeResumeArtifact(await getResumeArtifactApi(id))
      if (resumeVersionId !== currentVersion.value?.id) return
      upsertArtifact(artifact)
      if (artifact.status === 'GENERATING') scheduleArtifactPoll(id, resumeVersionId)
    } catch {
      if (resumeVersionId === currentVersion.value?.id) scheduleArtifactPoll(id, resumeVersionId)
    }
  }, 1500))
}

const createExport = async (format: ResumeExportFormat) => {
  if (!currentVersion.value || exportingFormat.value) return
  if (props.hasUnsavedChanges) {
    ElMessage.warning('请先保存当前简历，再导出最新稳定版本。')
    return
  }
  exportingFormat.value = format
  try {
    const template = selectedTemplate.value
    const result = await createResumeExportApi({
      resumeVersionId: currentVersion.value.id,
      templateCode: template?.templateCode,
      templateVersion: template?.templateVersion,
      format
    })
    if (result.artifact) {
      const artifact = normalizeResumeArtifact(result.artifact)
      upsertArtifact(artifact)
      if (artifact.status === 'GENERATING') scheduleArtifactPoll(artifact.id)
    }
    ElMessage.success(`${format} 导出已创建。`)
  } catch (error) {
    ElMessage.error(getErrorMessage(error, `${format} 导出失败，请查看服务端字体或文件服务配置。`))
    await loadDelivery()
  } finally {
    exportingFormat.value = ''
  }
}

const downloadArtifact = async (artifact: ResumeArtifactVO) => {
  if (artifact.status !== 'READY' || downloadingArtifacts.value.has(artifact.id)) return
  downloadingArtifacts.value = new Set(downloadingArtifacts.value).add(artifact.id)
  try {
    const blob = await downloadResumeArtifactApi(artifact.id)
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = artifact.fileName
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '文件下载失败，请刷新 artifact 状态后重试。'))
  } finally {
    const next = new Set(downloadingArtifacts.value)
    next.delete(artifact.id)
    downloadingArtifacts.value = next
  }
}

const artifactLabel = (artifact: ResumeArtifactVO) => {
  if (artifact.artifactType === 'APPLICATION_ZIP') return '投递 ZIP'
  if (artifact.mimeType?.includes('pdf') || artifact.fileName.toLowerCase().endsWith('.pdf')) return 'PDF'
  if (artifact.fileName.toLowerCase().endsWith('.docx')) return 'DOCX'
  return artifact.artifactType
}

watch(
  () => [props.resumeId, props.refreshKey],
  () => {
    clearArtifactPolling()
    void loadAll()
  }
)
watch(() => props.preferredTemplateCode, (templateCode) => {
  const normalized = normalizeResumeTemplateCode(templateCode)
  const preferred = templates.value.find((item) => item.templateCode === normalized)
  if (!preferred) return
  const key = templateKey(preferred)
  if (selectedTemplateKey.value !== key) {
    selectedTemplateKey.value = key
  }
})
watch(selectedTemplateKey, emitSelectedTemplate)
onMounted(loadAll)
onBeforeUnmount(clearArtifactPolling)
</script>

<style scoped lang="scss">
.delivery-workbench {
  min-width: 0;
  padding: var(--user-space-4);
  border: 1px solid var(--user-border);
  border-radius: var(--user-radius-md);
  background: var(--user-surface);
  color: var(--user-text);
  box-shadow: none;
}

.workbench-head,
.section-toolbar,
.suggestion-head,
.finding-head,
.preview-title,
.artifact-list article,
.artifact-actions,
.head-actions,
.item-tags,
.item-actions,
.tab-label,
.eyebrow {
  display: flex;
  align-items: center;
}

.workbench-head,
.section-toolbar,
.suggestion-head,
.finding-head,
.preview-title,
.artifact-list article {
  justify-content: space-between;
  gap: var(--user-space-4);
}

.workbench-head {
  align-items: flex-start;
  margin-bottom: 12px;

  h2 {
    margin: 6px 0 0;
    color: var(--user-text);
    font-size: 20px;
  }

  p {
    max-width: 76ch;
    margin: 6px 0 0;
    color: var(--user-text-muted);
    font-size: 13px;
    line-height: 1.6;
  }
}

.eyebrow,
.tab-label,
.head-actions,
.toolbar-actions,
.item-tags,
.item-actions,
.artifact-actions {
  gap: 8px;
}

.toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.eyebrow {
  color: var(--user-primary);
  font-size: 12px;
  font-weight: 800;
}

.delivery-tabs {
  :deep(.el-tabs__nav-wrap::after) {
    background: var(--user-border);
  }

  :deep(.el-tabs__content) {
    overflow: visible;
  }

  :deep(.el-tabs__item) {
    color: var(--user-text-muted);
  }

  :deep(.el-tabs__item.is-active),
  :deep(.el-tabs__item:hover) {
    color: var(--user-primary);
  }
}

.section-toolbar {
  align-items: flex-start;
  margin-bottom: 12px;

  h3,
  p {
    margin: 0;
  }

  h3 {
    color: var(--user-text);
    font-size: 17px;
  }

  p {
    margin-top: 6px;
    color: var(--user-text-muted);
    font-size: 13px;
    line-height: 1.6;
  }
}

.section-error {
  margin: 12px 0;
}

.suggestion-list,
.finding-list,
.artifact-list,
.paper-stack {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.suggestion-item,
.finding-list article,
.artifact-list article {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface-muted);
}

.suggestion-head,
.finding-head {
  align-items: flex-start;

  span,
  strong {
    display: block;
  }

  span {
    color: var(--user-text-muted);
    font-size: 12px;
  }

  strong {
    margin-top: 5px;
    color: var(--user-text);
  }
}

.suggestion-anchor-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;

  span {
    max-width: 100%;
    padding: 4px 7px;
    border: 1px solid var(--user-border);
    border-radius: 6px;
    background: var(--user-control-bg);
    color: var(--user-text-secondary);
    font-size: 12px;
    overflow-wrap: anywhere;
  }
}

.suggestion-evidence span {
  max-width: 100%;
  overflow-wrap: anywhere;
}

.sentence-diff {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;

  div {
    min-width: 0;
    padding: 10px;
    border: 1px solid var(--user-border);
    border-radius: 8px;
    background: var(--user-control-bg);

    &:first-child {
      border-color: var(--user-danger-border);
      background: var(--user-danger-soft);
    }

    &:last-child {
      border-color: var(--user-success-border);
      background: var(--user-success-soft);
    }
  }

  span {
    color: var(--user-primary);
    font-size: 12px;
    font-weight: 800;
  }

  p {
    margin: 6px 0 0;
    color: var(--user-text-secondary);
    line-height: 1.6;
    white-space: pre-wrap;
  }
}

.accepted-text-editor {
  margin-top: 10px;
}

.accepted-text-result {
  margin-top: 10px;
  padding: 12px;
  border: 1px solid var(--user-success-border);
  border-radius: 8px;
  background: var(--user-success-soft);

  span {
    color: var(--user-success);
    font-size: 12px;
    font-weight: 700;
  }

  p {
    margin: 7px 0 0;
    color: var(--user-text-secondary);
    line-height: 1.7;
    white-space: pre-wrap;
  }
}

.rationale {
  margin: 10px 0 0;
  color: var(--user-text-muted);
  font-size: 13px;
  line-height: 1.65;
}

.item-actions {
  flex-wrap: wrap;
  margin-top: 12px;
}

.audit-summary {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0;
  margin: 12px 0;
  overflow: hidden;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-control-bg);

  div {
    min-width: 0;
    padding: 10px 12px;

    & + div {
      border-left: 1px solid var(--user-border);
    }
  }

  span,
  strong {
    display: block;
  }

  span {
    color: var(--user-text-muted);
    font-size: 12px;
  }

  strong {
    margin-top: 4px;
    color: var(--user-text);
    font-size: 20px;
  }
}

.finding-list article {
  p,
  small {
    display: block;
    margin: 9px 0 0;
    color: var(--user-text-secondary);
    line-height: 1.6;
  }

  small {
    color: var(--user-text-muted);
  }
}

.quantity-list,
.evidence-ref-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 10px;

  span {
    padding: 5px 8px;
    border-radius: 6px;
    border: 1px solid var(--user-primary-border);
    background: var(--user-primary-soft);
    color: var(--user-primary);
    font-size: 12px;
  }
}

.evidence-ref-list span {
  border-color: var(--user-success-border);
  background: var(--user-success-soft);
  color: var(--user-success);
}

.delivery-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.72fr) minmax(520px, 1.28fr);
  gap: var(--user-space-4);
  align-items: start;
}

.export-controls {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface-muted);
}

.export-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  :deep(.el-button) {
    width: 100%;
    margin-left: 0;
  }
}

.artifact-list article {
  align-items: flex-start;

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

  small {
    color: var(--user-danger);
  }
}

.a4-preview {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-bg-panel);
}

.preview-title {
  align-items: flex-start;
  margin-bottom: 12px;

  h3,
  p {
    margin: 0;
  }

  h3 {
    color: var(--user-text);
  }

  p {
    margin-top: 5px;
    color: var(--user-text-muted);
    font-size: 12px;
  }
}

.paper-stack {
  display: grid;
  justify-items: center;
  max-height: 760px;
  overflow: auto;
  padding: 12px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-bg);
}

.section-empty,
.workbench-empty {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 26px 16px;
  color: var(--user-text-muted);
  text-align: center;

  strong {
    color: var(--user-text);
  }

  p {
    max-width: 520px;
    margin: 0;
    line-height: 1.65;
  }
}

.section-empty {
  margin-top: 12px;
  border: 1px dashed var(--user-primary-border);
  border-radius: 8px;
  background: var(--user-primary-faint);

  &.compact {
    padding: 24px 16px;
  }
}

@media (max-width: 980px) {
  .delivery-grid,
  .sentence-diff {
    grid-template-columns: 1fr;
  }

  .audit-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));

    div:nth-child(odd) {
      border-left: 0;
    }

    div:nth-child(n + 3) {
      border-top: 1px solid var(--user-border);
    }
  }
}

@media (max-width: 680px) {
  .delivery-workbench {
    padding: 14px;
  }

  .workbench-head,
  .section-toolbar,
  .suggestion-head,
  .finding-head,
  .artifact-list article {
    align-items: stretch;
    flex-direction: column;
  }

  .head-actions,
  .item-actions,
  .artifact-actions {
    flex-wrap: wrap;
  }

  .export-actions,
  .audit-summary {
    grid-template-columns: 1fr;
  }

  .audit-summary div + div,
  .audit-summary div:nth-child(n + 3) {
    border-top: 1px solid var(--user-border);
    border-left: 0;
  }

  .head-actions,
  .item-actions,
  .artifact-actions {
    width: 100%;
  }

  .toolbar-actions :deep(.el-button),
  .head-actions :deep(.el-button),
  .item-actions :deep(.el-button),
  .artifact-actions :deep(.el-button) {
    margin-left: 0;
  }

  .paper-stack {
    padding: 8px;
  }
}
</style>
