<template>
  <div class="page-shell v4-application-page">
    <section class="v4-page-header">
      <div>
        <div class="v4-eyebrow">求职进度管理</div>
        <h1>求职进度</h1>
        <p>跟踪收藏岗位、投递记录、面试阶段、跟进事项和结构化求职事件。</p>
      </div>
      <div class="v4-actions">
        <el-select v-model="status" clearable placeholder="全部状态" style="width: 180px" @change="load">
          <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-button type="primary" @click="openCreate">新增进度</el-button>
        <el-button :loading="loading" @click="load">刷新</el-button>
      </div>
    </section>

    <AppState v-if="errorMessage" type="error" title="求职进度加载失败" :description="errorMessage">
      <el-button type="primary" @click="load">重试</el-button>
    </AppState>

    <section v-else class="content-card">
      <div class="content-card__body v4-list" v-loading="loading">
        <article v-for="item in applications" :key="item.id" class="v4-row">
          <div class="v4-row-head">
            <div>
              <strong>{{ item.companyName || '--' }} · {{ item.jobTitle || '--' }}</strong>
              <p class="muted">
                {{ sourceLabel(item.source) }} · 投递 {{ item.appliedAt || '--' }} · 下次跟进 {{ item.nextFollowUpAt || '--' }}
              </p>
              <p class="muted">{{ item.note || '--' }}</p>
            </div>
            <div class="v4-actions">
              <el-tag>{{ statusLabel(item.status) }}</el-tag>
              <el-button link type="primary" @click="openEvents(item)">事件</el-button>
              <el-button link type="primary" @click="openEdit(item)">编辑</el-button>
            </div>
          </div>
        </article>
        <AppState
          v-if="!applications.length && !loading"
          type="empty"
          :title="applicationEmptyTitle"
          :description="applicationEmptyDescription"
        >
          <div class="empty-actions">
            <el-button v-if="status" @click="clearStatusFilter">清空状态筛选</el-button>
            <el-button type="primary" @click="openCreate">新增第一条进度</el-button>
          </div>
        </AppState>
      </div>
    </section>

    <el-dialog v-model="dialogVisible" title="求职进度" width="620px">
      <el-form label-position="top">
        <el-form-item label="公司">
          <el-input v-model.trim="form.companyName" />
        </el-form-item>
        <el-form-item label="岗位名称">
          <el-input v-model.trim="form.jobTitle" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width: 100%">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="来源">
          <el-select v-model="form.source" allow-create clearable filterable placeholder="选择或输入来源" style="width: 100%">
            <el-option v-for="item in sourceOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="关联简历版本">
          <el-input-number v-model="form.resumeVersionId" :min="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="下次跟进时间">
          <el-date-picker v-model="form.nextFollowUpAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.note" type="textarea" :rows="3" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="eventsVisible" title="求职事件" size="560px">
      <div class="drawer-actions">
        <el-button type="primary" @click="openEventCreate">新增事件</el-button>
        <el-button :loading="eventsLoading" @click="loadEvents">刷新</el-button>
      </div>
      <div class="event-list" v-loading="eventsLoading">
        <article v-for="item in events" :key="item.id" class="event-row">
          <div class="event-row__head">
            <strong>{{ eventTypeLabel(item.eventType) }}</strong>
            <span>{{ item.eventTime || '--' }}</span>
          </div>
          <p>{{ item.summary || '--' }}</p>
          <div v-if="formatApplicationReview(item)" class="event-row__review">
            {{ formatApplicationReview(item) }}
          </div>
        </article>
        <AppState
          v-if="eventsError && !eventsLoading"
          type="error"
          title="求职事件加载失败"
          :description="eventsError"
        >
          <div class="empty-actions">
            <el-button type="primary" :loading="eventsLoading" @click="loadEvents">重新加载</el-button>
          </div>
        </AppState>
        <AppState
          v-else-if="!events.length && !eventsLoading"
          type="empty"
          title="当前进度还没有事件"
          description="可以记录一次跟进、面试安排、复盘或录用通知/拒信，后续回看会更清楚。"
        >
          <div class="empty-actions">
            <el-button type="primary" @click="openEventCreate">新增事件</el-button>
          </div>
        </AppState>
      </div>
    </el-drawer>

    <el-dialog v-model="eventDialogVisible" title="新增求职事件" width="560px">
      <el-form label-position="top">
        <el-form-item label="事件类型">
          <el-select v-model="eventForm.eventType" allow-create filterable placeholder="选择或输入事件类型" style="width: 100%">
            <el-option v-for="item in eventTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="事件时间">
          <el-date-picker v-model="eventForm.eventTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="摘要">
          <el-input v-model="eventForm.summary" type="textarea" :rows="3" maxlength="500" show-word-limit />
        </el-form-item>
        <el-form-item label="复盘要点">
          <el-input
            v-model="eventForm.reviewJson"
            type="textarea"
            :rows="4"
            placeholder="例如：二面反馈偏重项目复盘，下一步补充缓存和消息队列案例。"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="eventDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="createEvent">保存事件</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'

import {
  createApplicationApi,
  createApplicationEventApi,
  getApplicationEventsApi,
  getApplicationsApi,
  updateApplicationApi,
  type JobApplicationEventVO,
  type JobApplicationVO
} from '@/api/v4'
import AppState from '@/components/common/AppState.vue'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { toFriendlyMessage } from '@/utils/error'
import { formatLocalDateTime } from '@/utils/format'

const statusOptions = [
  { label: '已收藏', value: 'SAVED' },
  { label: '准备中', value: 'PREPARING' },
  { label: '已投递', value: 'APPLIED' },
  { label: '面试中', value: 'INTERVIEWING' },
  { label: '已收到录用通知', value: 'OFFER' },
  { label: '已拒信', value: 'REJECTED' },
  { label: '已关闭', value: 'CLOSED' }
]

const sourceOptions = [
  { label: 'BOSS 直聘', value: 'BOSS' },
  { label: 'LinkedIn', value: 'LinkedIn' },
  { label: '内推', value: 'Referral' },
  { label: '官网投递', value: 'OFFICIAL_SITE' },
  { label: '自定义来源', value: 'CUSTOM' }
]

const eventTypeOptions = [
  { label: '跟进事项', value: 'FOLLOW_UP' },
  { label: '面试安排', value: 'INTERVIEW' },
  { label: '录用通知', value: 'OFFER' },
  { label: '普通记录', value: 'NOTE' },
  { label: '拒信记录', value: 'REJECTION' }
]

const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const status = ref('')
const dialogVisible = ref(false)
const editingId = ref<number>()
const applications = ref<JobApplicationVO[]>([])
const eventsVisible = ref(false)
const eventsLoading = ref(false)
const eventDialogVisible = ref(false)
const selectedApplication = ref<JobApplicationVO>()
const events = ref<JobApplicationEventVO[]>([])
const eventsError = ref('')

const form = reactive<Partial<JobApplicationVO>>({
  status: 'SAVED',
  jobTitle: '',
  companyName: '',
  source: 'CUSTOM',
  note: ''
})

const eventForm = reactive<Partial<JobApplicationEventVO>>({
  eventType: 'NOTE',
  eventTime: '',
  summary: '',
  reviewJson: ''
})

const applicationEmptyTitle = computed(() => status.value ? '当前状态没有进度' : '还没有求职进度')
const applicationEmptyDescription = computed(() =>
  status.value
    ? '当前筛选状态下没有记录，清空筛选后可以查看全部进度。'
    : '先记录一条公司、岗位、来源和下次跟进时间，例如 BOSS、LinkedIn、内推或官网投递。'
)

const statusLabel = (value?: string) => statusOptions.find((item) => item.value === value)?.label || (value ? '状态待确认' : '--')
const sourceLabel = (value?: string) => sourceOptions.find((item) => item.value === value)?.label || (value ? '自定义来源' : '来源待填写')
const eventTypeLabel = (value?: string) => eventTypeOptions.find((item) => item.value === value)?.label || (value ? '记录事项' : '--')

const reviewFieldLabels: Record<string, string> = {
  score: '评分',
  nextStep: '下一步',
  nextSteps: '下一步',
  action: '行动',
  actionItems: '行动项',
  summary: '复盘',
  strengths: '亮点',
  weakness: '短板',
  risks: '风险提醒',
  improvement: '改进点',
  note: '备注',
  result: '结果'
}

const stringifyReviewValue = (value: unknown): string => {
  if (value == null || value === '') return ''
  if (Array.isArray(value)) {
    return value.map((item) => stringifyReviewValue(item)).filter(Boolean).join('；')
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => {
        const text = stringifyReviewValue(item)
        return text ? `${reviewFieldLabels[key] || key}：${text}` : ''
      })
      .filter(Boolean)
      .join('；')
  }
  return String(value)
}

const parseReviewValue = (item: JobApplicationEventVO): Record<string, unknown> | string | null => {
  if (item.review && Object.keys(item.review).length) return item.review
  const raw = item.reviewJson?.trim()
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
    return stringifyReviewValue(parsed)
  } catch {
    return raw
  }
}

const formatApplicationReview = (item: JobApplicationEventVO) => {
  const review = parseReviewValue(item)
  if (!review) return ''
  if (typeof review === 'string') return review

  return Object.entries(review)
    .map(([key, value]) => {
      const text = stringifyReviewValue(value)
      return text ? `${reviewFieldLabels[key] || key}：${text}` : ''
    })
    .filter(Boolean)
    .join('；')
}

const applicationTargetText = () => {
  const company = form.companyName?.trim() || '未填写公司'
  const job = form.jobTitle?.trim() || '未填写岗位'
  const nextFollowUp = form.nextFollowUpAt ? `；下次跟进：${form.nextFollowUpAt}` : ''
  return `${company} · ${job}；状态：${statusLabel(form.status)}；来源：${sourceLabel(form.source)}${nextFollowUp}`
}

const selectedApplicationText = () => {
  const item = selectedApplication.value
  if (!item) return '未选择求职进度'
  return `${item.companyName || '未填写公司'} · ${item.jobTitle || '未填写岗位'}；当前状态：${statusLabel(item.status)}`
}

const previewApplicationSave = () =>
  confirmDangerActionPreview({
    title: editingId.value ? '更新求职进度预览' : '新增求职进度预览',
    action: editingId.value ? '更新一条求职进度' : '新增一条求职进度',
    target: applicationTargetText(),
    impact:
      '会写入求职进度列表，并可能被后续今日行动、求职复盘、成长画像和训练建议引用；状态、来源和跟进时间会影响下一步提醒。',
    rollback: '保存后不会自动恢复旧状态；如公司、岗位、状态或跟进时间填错，需要再次编辑该进度修正。',
    audit: '可按求职进度记录、更新时间和关联事件追踪本次变更。',
    tips: [
      '确认公司、岗位和状态不是临时占位。',
      '确认下次跟进时间会作为后续行动建议参考。',
      form.resumeVersionId ? '已关联简历版本。' : '未关联简历版本时，后续复盘可能缺少投递简历快照。'
    ],
    confirmButtonText: '确认保存'
  })

const previewApplicationEventSave = () =>
  confirmDangerActionPreview({
    title: '新增求职事件预览',
    action: '新增一条求职事件',
    target: `${selectedApplicationText()}；事件：${eventTypeLabel(eventForm.eventType)}；时间：${eventForm.eventTime || '未填写'}`,
    impact:
      '会写入当前求职进度的事件时间线，并可能被后续面试复盘、跟进提醒、今日行动和求职状态判断引用。',
    rollback: '当前页面不会自动撤回已保存事件；如记录不准确，需要新增修正事件或在后续治理入口处理。',
    audit: '可按求职进度、事件时间和事件类型追踪本次记录。',
    tips: [
      '确认事件类型与真实进展一致，例如面试、跟进、录用通知或拒信。',
      eventForm.summary?.trim() ? '摘要会作为后续复盘参考，请避免填写敏感联系方式或无关私密内容。' : '建议补充一句摘要，方便后续回看。',
      eventForm.reviewJson?.trim() ? '复盘要点会影响后续行动建议，请确认内容准确。' : '未填写复盘要点时，后续建议主要依赖事件类型和摘要。'
    ],
    confirmButtonText: '确认保存事件'
  })

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return toFriendlyMessage((error as { message?: unknown }).message, '\u63a5\u53e3\u8bf7\u6c42\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002')
  }
  return '\u63a5\u53e3\u8bf7\u6c42\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002'
}

const load = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    applications.value = await getApplicationsApi({ status: status.value || undefined })
  } catch (error) {
    applications.value = []
    errorMessage.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
}

const clearStatusFilter = async () => {
  status.value = ''
  await load()
}

const openCreate = () => {
  editingId.value = undefined
  Object.assign(form, {
    status: 'SAVED',
    jobTitle: '',
    companyName: '',
    source: 'CUSTOM',
    note: '',
    resumeVersionId: undefined,
    nextFollowUpAt: ''
  })
  dialogVisible.value = true
}

const openEdit = (item: JobApplicationVO) => {
  editingId.value = item.id
  Object.assign(form, item)
  dialogVisible.value = true
}

const save = async () => {
  if (saving.value) return
  const confirmed = await previewApplicationSave()
  if (!confirmed) return
  saving.value = true
  try {
    if (editingId.value) {
      await updateApplicationApi(editingId.value, form)
    } else {
      await createApplicationApi(form)
    }
    dialogVisible.value = false
    ElMessage.success('已保存')
    await load()
  } catch (error) {
    ElMessage.error(getErrorMessage(error))
  } finally {
    saving.value = false
  }
}

const openEvents = async (item: JobApplicationVO) => {
  selectedApplication.value = item
  events.value = []
  eventsError.value = ''
  eventsVisible.value = true
  await loadEvents()
}

const loadEvents = async () => {
  if (!selectedApplication.value) return
  eventsLoading.value = true
  eventsError.value = ''
  try {
    events.value = await getApplicationEventsApi(selectedApplication.value.id)
  } catch (error) {
    events.value = []
    eventsError.value = getErrorMessage(error)
  } finally {
    eventsLoading.value = false
  }
}

const openEventCreate = () => {
  Object.assign(eventForm, {
    eventType: 'NOTE',
    eventTime: formatLocalDateTime(),
    summary: '',
    reviewJson: ''
  })
  eventDialogVisible.value = true
}

const createEvent = async () => {
  if (!selectedApplication.value) return
  if (saving.value) return
  const confirmed = await previewApplicationEventSave()
  if (!confirmed) return
  saving.value = true
  try {
    await createApplicationEventApi(selectedApplication.value.id, {
      eventType: eventForm.eventType,
      eventTime: eventForm.eventTime,
      summary: eventForm.summary,
      reviewJson: eventForm.reviewJson || undefined
    })
    eventDialogVisible.value = false
    ElMessage.success('事件已保存')
    await loadEvents()
  } catch (error) {
    ElMessage.error(getErrorMessage(error))
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
.v4-page-header,
.v4-row-head,
.v4-actions,
.drawer-actions,
.event-row__head {
  display: flex;
  gap: 16px;
}

.v4-page-header {
  align-items: flex-end;
  justify-content: space-between;
  padding: 24px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.14), rgba(34, 197, 94, 0.08)), var(--app-surface);
  box-shadow: var(--app-shadow);
}

.v4-page-header h1 {
  margin: 8px 0 0;
  font-size: 28px;
}

.v4-page-header p,
.muted,
.event-row p,
.event-row span {
  color: var(--app-text-muted);
  line-height: 1.7;
}

.v4-eyebrow {
  color: #93c5fd;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
}

.v4-actions,
.drawer-actions {
  flex-wrap: wrap;
  align-items: center;
}

.empty-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.v4-list,
.event-list {
  display: grid;
  gap: 12px;
}

.v4-row,
.event-row {
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.58);
}

.v4-row-head,
.event-row__head {
  align-items: flex-start;
  justify-content: space-between;
}

.drawer-actions {
  margin-bottom: 16px;
}

.event-row p {
  margin: 8px 0 0;
}

.event-row__review {
  margin: 10px 0 0;
  padding: 10px;
  border-radius: 8px;
  background: #020617;
  color: #dbeafe;
  line-height: 1.7;
}

@media (max-width: 900px) {
  .v4-page-header,
  .v4-row-head,
  .event-row__head {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
